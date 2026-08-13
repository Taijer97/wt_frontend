import React, { useState, useEffect } from 'react';
import { CivilStatus, HardwareOrigin, PurchaseEntry, PurchaseStatus, Intermediary } from '../types';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { User, Clock, History, ShieldCheck, Download, Printer, Camera, FileText, FileDigit, Tag, Package, Eye, RefreshCw, Upload } from 'lucide-react';

import { EditPurchaseModal } from './purchases/EditPurchaseModal';
import { PurchaseRegisterForm } from './purchases/PurchaseRegisterForm';
import { PendingPurchasesTable } from './purchases/PendingPurchasesTable';
import { HistoryPurchasesTable } from './purchases/HistoryPurchasesTable';
import { useAlert, Tabs, Modal, Button } from './ui';

export const PurchaseModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'pending' | 'history'>('register');
  const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseEntry | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string } | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null);

  const [pendingTotal, setPendingTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const alert = useAlert();

  const canCreate = DataService.checkPermission('purchases_ruc10', 'create');
  const canUpdate = DataService.checkPermission('purchases_ruc10', 'update');
  const canDelete = DataService.checkPermission('purchases_ruc10', 'delete');
  const canRead = DataService.checkPermission('purchases_ruc10', 'read');

  useEffect(() => {
    loadIntermediaries();
    refreshCounts();
  }, []);

  const loadIntermediaries = async () => {
    try {
      const inters = await BackendService.getIntermediaries();
      setIntermediaries(inters);
    } catch {
      setIntermediaries(DataService.getIntermediaries());
    }
  };

  const refreshCounts = async (force = false) => {
    try {
      const [pPending, pHistory] = await Promise.all([
        BackendService.getPurchasesPaged({ type: 'RUC10', status: 'PENDING_DOCS', limit: 1, offset: 0 }, force),
        BackendService.getPurchasesPaged({ type: 'RUC10', status: 'COMPLETED', limit: 1, offset: 0 }, force),
      ]);
      setPendingTotal(Number(pPending?.total || 0));
      setHistoryTotal(Number(pHistory?.total || 0));
    } catch {
      setPendingTotal(0);
      setHistoryTotal(0);
    }
  };

  const mapPurchasesFromBackend = (list: any[]): PurchaseEntry[] => {
    return list.map((p: any) => ({
      id: String(p.id),
      date: p.date,
      status: p.status === 'COMPLETED' ? PurchaseStatus.COMPLETED : PurchaseStatus.PENDING_DOCS,
      intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined,
      intermediaryName: p.intermediary_name || '',
      intermediaryDocNumber: p.intermediary_doc_number || '',
      intermediaryRucNumber: p.intermediary_ruc_number || '',
      intermediaryAddress: p.intermediary_address || '',
      intermediaryPhone: p.intermediary_phone || '',
      supplierId: p.supplier_id ? String(p.supplier_id) : undefined,
      supplierName: p.supplier_name,
      supplierShortName: p.supplier_short_name,
      providerDni: p.seller_doc_number || '',
      providerName: p.provider_name || p.seller_full_name || '',
      providerAddress: p.seller_address || '',
      providerCivilStatus: (p.seller_civil_status as CivilStatus) || CivilStatus.SOLTERO,
      providerPhone: p.seller_phone || '',
      providerOccupation: 'Persona Natural',
      productType: p.items && p.items.length > 0 ? p.items[0].category || '' : '',
      productBrand: p.items && p.items.length > 0 ? p.items[0].brand || '' : p.product_brand || '',
      productModel: p.items && p.items.length > 0 ? p.items[0].model || '' : p.product_model || '',
      productSerial: p.items && p.items.length > 0 ? p.items[0].serial || '' : p.product_serial || p.document_number,
      productIdType: p.items && p.items.length > 0 ? p.items[0].id_type || 'SERIE' : p.product_id_type || 'SERIE',
      productColor: '',
      productCondition: p.product_condition || 'USADO',
      originType: HardwareOrigin.DECLARACION_JURADA,
      priceAgreed: p.base_amount || 0,
      costNotary: (p.total_amount || 0) - (p.base_amount || 0),
      bankOrigin: p.bank_name || '',
      bankDestination: p.bank_name || '',
      bankAccount: p.bank_account || '',
      blockNumber: (p as any).block_number || 1,
      operationNumber: undefined,
      operationDate: p.date,
      contractUrl: BackendService.resolveUrl(p.contract_url || undefined),
      voucherUrl: BackendService.resolveUrl(p.voucher_url || undefined),
      originProofUrl: BackendService.resolveUrl(p.dj_url || undefined),
      items: (p.items || []).map((it: any) => ({
        id: String(it.id),
        category: it.category || '',
        brand: it.brand || '',
        model: it.model || '',
        serial: it.serial || '',
        idType: it.id_type || 'SERIE',
        cost: Number(it.cost || 0),
        specs: it.specs || '',
      })),
    }));
  };

  const fetchPurchasePage = async (args: {
    status: 'PENDING_DOCS' | 'COMPLETED';
    q?: string;
    blockNumber?: number;
    opDate?: string;
    limit: number;
    offset: number;
    force?: boolean;
  }) => {
    const res = await BackendService.getPurchasesPaged(
      {
        type: 'RUC10',
        status: args.status,
        q: args.q,
        block_number: args.blockNumber,
        op_date: args.opDate,
        limit: args.limit,
        offset: args.offset,
      },
      Boolean(args.force)
    );
    const mapped = mapPurchasesFromBackend(res?.items || []);
    mapped.sort((a, b) => {
      const blockA = Number(a.blockNumber ?? 1) || 1;
      const blockB = Number(b.blockNumber ?? 1) || 1;
      if (blockA !== blockB) return blockB - blockA;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });
    return {
      items: mapped,
      total: Number(res?.total || 0),
    };
  };

  const getPendingBlocks = async (opDate?: string, force = false) => {
    return BackendService.getPurchaseBlocks({ type: 'RUC10', status: 'PENDING_DOCS', op_date: opDate }, force);
  };

  const handleDelete = (id: string) => {
    BackendService.deletePurchase(id)
      .then(async (result) => {
        setPendingRefreshKey((k) => k + 1);
        setHistoryRefreshKey((k) => k + 1);
        await refreshCounts(true);
        if (result?.reverted_to_pending) {
          alert.success('La compra salió del historial y volvió a Pendientes');
        } else {
          alert.success('Compra eliminada');
        }
      })
      .catch(async () => {
        DataService.deletePurchaseRuc10(id);
        setPendingRefreshKey((k) => k + 1);
        setHistoryRefreshKey((k) => k + 1);
        await refreshCounts(true);
        alert.success('Compra eliminada');
      });
  };

  const tabItems = [
    { id: 'register', label: 'Registro', icon: <User className="w-4 h-4" /> },
    { id: 'pending', label: 'Pendientes', icon: <Clock className="w-4 h-4" />, badge: pendingTotal },
    { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" />, badge: historyTotal },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          variant="pills"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'register' && (
          <PurchaseRegisterForm
            onSuccess={async () => {
              alert.success('Equipo Registrado');
              setPendingRefreshKey((k) => k + 1);
              setHistoryRefreshKey((k) => k + 1);
              await refreshCounts(true);
              setActiveTab('pending');
            }}
            intermediaries={intermediaries}
            showAlert={(m, t) => (t === 'success' ? alert.success(m) : alert.error(m))}
          />
        )}

        {activeTab === 'pending' && (
          <PendingPurchasesTable
            fetchPage={(args) => fetchPurchasePage({ ...args, status: 'PENDING_DOCS' })}
            getBlocks={getPendingBlocks}
            refreshKey={pendingRefreshKey}
            onUpdate={async () => {
              setPendingRefreshKey((k) => k + 1);
              setHistoryRefreshKey((k) => k + 1);
              await refreshCounts(true);
            }}
            onPreview={setPreviewDoc}
            showAlert={(m, t) => (t === 'success' ? alert.success(m) : alert.error(m))}
            onEdit={setEditingPurchase}
            onDelete={handleDelete}
            canDelete={canDelete}
            canUpdate={canUpdate}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPurchasesTable
            fetchPage={(args) => fetchPurchasePage({ ...args, status: 'COMPLETED' })}
            getBlocks={getPendingBlocks}
            refreshKey={historyRefreshKey}
            onViewSupport={setViewingPurchase}
            onEdit={setEditingPurchase}
            onDelete={handleDelete}
            canRead={canRead}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        )}
      </div>

      {/* Modal de Edición */}
      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          intermediaries={intermediaries}
          onClose={() => setEditingPurchase(null)}
          onSave={async (updatedData) => {
            try {
              await BackendService.updatePurchase(editingPurchase.id, updatedData);
              alert.success('Información actualizada correctamente');
              setEditingPurchase(null);
              setPendingRefreshKey((k) => k + 1);
              setHistoryRefreshKey((k) => k + 1);
              await refreshCounts(true);
            } catch {
              alert.error('Error al actualizar información');
            }
          }}
        />
      )}

      {/* Visor de Sustentación */}
      <Modal
        open={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={viewingPurchase ? `${viewingPurchase.productBrand} ${viewingPurchase.productModel}` : ''}
        subtitle="Sustento Auditoría RUC 10"
        icon={<ShieldCheck className="w-6 h-6 text-blue-500" />}
        size="xl"
      >
        {viewingPurchase && (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SupportFileCard
                title="Voucher Bancario"
                fileName={viewingPurchase.voucherUrl}
                icon={<Camera className="w-5 h-5 text-blue-500" />}
                purchaseId={viewingPurchase.id}
                docKind="voucher"
                onReplaceSuccess={(newUrl) => {
                  alert.success('Voucher bancario reemplazado correctamente');
                  setViewingPurchase(prev => prev ? { ...prev, voucherUrl: newUrl } : null);
                  setHistoryRefreshKey(k => k + 1);
                  setPendingRefreshKey(k => k + 1);
                }}
              />
              <SupportFileCard
                title="Contrato Legalizado"
                fileName={viewingPurchase.contractUrl}
                icon={<FileText className="w-5 h-5 text-emerald-500" />}
                purchaseId={viewingPurchase.id}
                docKind="contract"
                onReplaceSuccess={(newUrl) => {
                  alert.success('Contrato legalizado reemplazado correctamente');
                  setViewingPurchase(prev => prev ? { ...prev, contractUrl: newUrl } : null);
                  setHistoryRefreshKey(k => k + 1);
                  setPendingRefreshKey(k => k + 1);
                }}
              />
              <SupportFileCard
                title="Declaración de Origen"
                fileName={viewingPurchase.originProofUrl || viewingPurchase.djUrl}
                icon={<FileDigit className="w-5 h-5 text-purple-500" />}
                purchaseId={viewingPurchase.id}
                docKind="dj"
                onReplaceSuccess={(newUrl) => {
                  alert.success('Declaración de origen reemplazada correctamente');
                  setViewingPurchase(prev => prev ? { ...prev, originProofUrl: newUrl, djUrl: newUrl } : null);
                  setHistoryRefreshKey(k => k + 1);
                  setPendingRefreshKey(k => k + 1);
                }}
              />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-extrabold uppercase text-xs text-slate-600 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Detalles del Expediente
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Nombre</p>
                  <p className="font-black text-slate-900 uppercase">{viewingPurchase.providerName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">DNI</p>
                  <p className="font-black text-slate-900">{viewingPurchase.providerDni}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Teléfono</p>
                  <p className="font-black text-slate-900 uppercase">{viewingPurchase.providerPhone || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Banco</p>
                  <p className="font-black text-slate-900 uppercase">{viewingPurchase.bankOrigin || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Inversión Total</p>
                  <p className="font-black text-emerald-600">
                    S/ {((viewingPurchase.priceAgreed || 0) + (viewingPurchase.costNotary || 0)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Fecha</p>
                  <p className="font-black text-slate-900">
                    {new Date(viewingPurchase.operationDate || viewingPurchase.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <a
                href={BackendService.resolveUrl(`/purchases/${viewingPurchase.id}/download`)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs inline-flex items-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar Sustento Completo
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Visor de Vista Previa de Documentos HTML/PDF */}
      <Modal
        open={!!previewDoc}
        onClose={() => {
          const u = previewDoc?.url;
          setPreviewDoc(null);
          if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
        }}
        title={previewDoc?.title || ''}
        size="xl"
      >
        {previewDoc && (
          <div className="space-y-4 py-2">
            <div className="h-[500px] w-full rounded-xl border border-slate-200 overflow-hidden">
              <iframe src={previewDoc.url} className="w-full h-full bg-white" title="Vista previa" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <a
                href={previewDoc.url}
                download={previewDoc.kind === 'contract' ? 'contrato_compra_venta.html' : 'declaracion_jurada.html'}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 hover:bg-slate-800"
              >
                <Download className="w-4 h-4" /> Descargar HTML
              </a>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = previewDoc.url;
                  document.body.appendChild(iframe);
                  iframe.onload = () => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
                  };
                }}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Imprimir / PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SupportFileCard = ({
  title,
  fileName,
  icon,
  purchaseId,
  docKind,
  onReplaceSuccess,
}: {
  title: string;
  fileName?: string;
  icon: React.ReactNode;
  purchaseId: string;
  docKind: 'voucher' | 'contract' | 'dj';
  onReplaceSuccess?: (newUrl: string) => void;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fileUrl = fileName ? BackendService.resolveUrl(`/purchases/${purchaseId}/download/${docKind}`) : '#';
  const apiBaseUrl = String((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8001').replace(/\/$/, '');

  const getSessionToken = () => {
    try {
      const raw = localStorage.getItem('mype_session');
      if (!raw) return '';
      const session = JSON.parse(raw);
      return session?.token || '';
    } catch {
      return '';
    }
  };

  const handleView = async () => {
    try {
      if (!fileUrl || fileUrl === '#') return;
      let finalUrl = fileUrl;
      if (fileUrl.startsWith('/')) {
        finalUrl = `${apiBaseUrl}${fileUrl}`;
      }
      const token = getSessionToken();
      if (token && !finalUrl.includes('token=')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}token=${token}`;
      }
      const res = await fetch(`${finalUrl}${finalUrl.includes('?') ? '&' : '?'}view=true`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${token}`,
        },
      });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        alert('Por favor, permita las ventanas emergentes para este sitio.');
      }
    } catch {
      alert('Error al cargar el archivo para visualizar.');
    }
  };

  const handleDownload = async () => {
    try {
      if (!fileUrl || fileUrl === '#') return;
      let finalUrl = fileUrl;
      if (fileUrl.startsWith('/')) {
        finalUrl = `${apiBaseUrl}${fileUrl}`;
      }
      const token = getSessionToken();
      if (token && !finalUrl.includes('token=')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}token=${token}`;
      }
      const res = await fetch(finalUrl, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${token}`,
        },
      });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = (fileName || '').split('.').pop()?.toLowerCase() || 'pdf';
      a.download = `${docKind.toUpperCase()}_RUC10_${purchaseId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Error al descargar el archivo.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await BackendService.uploadPurchaseFile(purchaseId, file, docKind);
      if (onReplaceSuccess) {
        onReplaceSuccess(res.url || res.filename);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Error al reemplazar el archivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 group hover:border-blue-500 transition-colors shadow-xs relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shadow-xs">{icon}</div>
      <div>
        <h5 className="font-extrabold uppercase text-xs text-slate-800">{title}</h5>
        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] mt-0.5">{fileName || 'Sin archivo'}</p>
      </div>

      <div className="w-full flex flex-col gap-2 pt-1">
        {fileName ? (
          <div className="flex gap-1.5 w-full">
            <Button
              variant="outline"
              size="xs"
              onClick={handleView}
              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
              className="flex-1 text-[11px] px-2"
              title="Ver Documento"
            >
              Ver
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleDownload}
              leftIcon={<Download className="w-3.5 h-3.5 text-white" />}
              className="flex-1 text-[11px] px-2"
              title="Descargar Documento"
            >
              Descargar
            </Button>
          </div>
        ) : null}

        <Button
          variant={fileName ? "ghost" : "primary"}
          size="xs"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          leftIcon={
            isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
            ) : fileName ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-white" />
            )
          }
          className={`w-full text-[11px] font-extrabold border ${
            fileName
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Reemplazando...' : fileName ? 'Reemplazar' : 'Subir Documento'}
        </Button>
      </div>
    </div>
  );
};
