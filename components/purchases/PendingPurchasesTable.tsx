import React, { useState, useEffect } from 'react';
import { PurchaseEntry, PurchaseStatus } from '../../types';
import { DataService } from '../../services/dataService';
import { BackendService } from '../../services/backendService';
import { buildContractHtml, buildDjHtml } from './purchaseDocTemplates';
import { DocumentUpload } from './DocumentUpload';
import {
  Search,
  FileText,
  FileDigit,
  ArrowRight,
  Edit3,
  Trash2,
  ShieldCheck,
  Camera,
  Save,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { Button, Modal, DataTable, Column, Badge } from '../ui';

const WhatsappIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.473-1.46-1.646-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface PendingPurchasesTableProps {
  fetchPage: (args: {
    q?: string;
    blockNumber?: number;
    opDate?: string;
    limit: number;
    offset: number;
    force?: boolean;
  }) => Promise<{ items: PurchaseEntry[]; total: number }>;
  getBlocks: (opDate?: string, force?: boolean) => Promise<number[]>;
  refreshKey: number;
  onUpdate: () => void;
  onPreview: (p: { url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string }) => void;
  showAlert: (m: string, t: 'success' | 'error') => void;
  onEdit: (p: PurchaseEntry) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  canUpdate: boolean;
}

export const PendingPurchasesTable: React.FC<PendingPurchasesTableProps> = ({
  fetchPage,
  getBlocks,
  refreshKey,
  onUpdate,
  onPreview,
  showAlert,
  onEdit,
  onDelete,
  canDelete,
  canUpdate,
}) => {
  const [pending, setPending] = useState<PurchaseEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<10 | 50 | 100>(10);
  const [page, setPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);
  const [selected, setSelected] = useState<PurchaseEntry | null>(null);
  const [files, setFiles] = useState({ v: null as string | null, c: null as string | null, d: null as string | null });
  const [rawFiles, setRawFiles] = useState<{ v: File | null; c: File | null; d: File | null }>({ v: null, c: null, d: null });
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    getBlocks(filterDate || undefined)
      .then((blocks) => {
        if (cancelled) return;
        setAvailableBlocks(blocks.map((b) => String(b)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [getBlocks, refreshKey, filterDate]);

  useEffect(() => {
    let cancelled = false;
    setIsTableLoading(true);
    fetchPage({
      q: searchQuery || undefined,
      blockNumber: filterBlock ? Number(filterBlock) : undefined,
      opDate: filterDate || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then(({ items, total }) => {
        if (cancelled) return;
        setPending(items);
        setTotal(total);
      })
      .finally(() => {
        if (cancelled) return;
        setIsTableLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshKey, searchQuery, filterBlock, filterDate, pageSize, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setLoading(true);
    try {
      let resV: any = null;
      let resC: any = null;
      let resD: any = null;

      if (rawFiles.v) {
        resV = await BackendService.uploadPurchaseFile(selected.id, rawFiles.v, 'voucher');
      }
      if (rawFiles.c) {
        resC = await BackendService.uploadPurchaseFile(selected.id, rawFiles.c, 'contract');
      }
      if (rawFiles.d) {
        resD = await BackendService.uploadPurchaseFile(selected.id, rawFiles.d, 'dj');
      }

      const totalCost = selected.priceAgreed || 0;
      await BackendService.createProduct({
        category: selected.productType || '',
        brand: selected.productBrand || '',
        model: selected.productModel || '',
        serialNumber: selected.productSerial || '',
        idType: (selected.productIdType as any) || 'SERIE',
        condition: (selected.productCondition as any) || 'USADO',
        status: 'IN_STOCK_RUC10' as any,
        origin: (selected.originType as any) || 'PERSONA',
        purchasePrice: selected.priceAgreed || 0,
        notaryCost: selected.costNotary || 0,
        totalCost: totalCost,
        intermediaryId: selected.intermediaryId,
        stock: 1,
      });

      await BackendService.updatePurchase(selected.id, { status: 'COMPLETED' });

      const finalVoucher = resV?.filename || selected.voucherUrl;
      const finalContract = resC?.filename || selected.contractUrl;
      const finalDj = resD?.filename || selected.originProofUrl || selected.djUrl;

      DataService.updatePurchase({
        ...selected,
        status: PurchaseStatus.COMPLETED,
        voucherUrl: finalVoucher,
        contractUrl: finalContract,
        originProofUrl: finalDj,
        djUrl: finalDj,
        operationDate: new Date().toISOString(),
      });

      const isFullySustained = Boolean(finalVoucher && finalContract && finalDj);

      setSelected(null);
      setFiles({ v: null, c: null, d: null });
      setRawFiles({ v: null, c: null, d: null });
      onUpdate();

      if (isFullySustained) {
        showAlert('Expediente Sustentado y transferido a Historial', 'success');
      } else {
        showAlert('Expediente transferido a Historial (Nota Alerta generada para el cliente)', 'info');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error al guardar en el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PurchaseEntry>[] = [
    {
      key: 'bloque',
      header: 'Bloque',
      render: (_, p) => (
        <Badge variant="warning" size="sm">
          B{p.blockNumber || 1}
        </Badge>
      ),
    },
    {
      key: 'vendedor',
      header: 'Vendedor (DNI)',
      render: (_, p) => (
        <div>
          <div className="font-black text-slate-900 uppercase text-xs">{p.providerName}</div>
          <div className="text-[10px] font-bold text-slate-500">{p.providerDni}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{p.providerPhone}</div>
        </div>
      ),
    },
    {
      key: 'proveedor_rel',
      header: 'Proveedor Rel.',
      render: (_, p) =>
        p.supplierShortName || p.supplierName ? (
          <Badge variant="info" size="sm">
            {p.supplierShortName || p.supplierName}
          </Badge>
        ) : (
          <span className="text-[9px] font-bold text-slate-300 uppercase">NINGUNO</span>
        ),
    },
    {
      key: 'equipo',
      header: 'Detalle del Equipo',
      render: (_, p) => (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="neutral" size="sm">
              {p.productType || 'SIN CATEGORÍA'}
            </Badge>
            <Badge
              variant={
                p.productCondition === 'NUEVO'
                  ? 'success'
                  : p.productCondition === 'REACONDICIONADO'
                  ? 'info'
                  : 'neutral'
              }
              size="sm"
            >
              {p.productCondition}
            </Badge>
          </div>
          <div className="font-black text-slate-900 uppercase text-xs">
            {p.productBrand} {p.productModel}
          </div>
          <div className="font-mono text-[9px] font-bold text-slate-400 uppercase mt-0.5">S/N: {p.productSerial}</div>
        </div>
      ),
    },
    {
      key: 'acuerdo',
      header: 'Acuerdo Comercial',
      render: (_, p) => (
        <div>
          <div className="font-black text-slate-900 text-xs">
            S/ {((p.priceAgreed || 0) + (p.costNotary || 0)).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            {p.bankOrigin} {p.bankAccount ? `- ${p.bankAccount}` : ''}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {p.operationDate ? new Date(p.operationDate).toLocaleDateString() : ''}
          </div>
          {p.intermediaryPhone ? (
            <a
              href={`https://wa.me/51${p.intermediaryPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `*TRANSFERENCIA*\n*CLIENTE:* ${p.providerName}\n*MONTO:* S/ ${(
                  (p.priceAgreed || 0) + (p.costNotary || 0)
                ).toFixed(2)}\n*BANCO:* ${p.bankOrigin || '-'}\n*CUENTA:* ${p.bankAccount || '-'}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border border-emerald-200 shadow-xs"
            >
              <WhatsappIcon className="w-3.5 h-3.5 shrink-0 fill-current" />
              WhatsApp
            </a>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1 bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase">
              Sin WhatsApp
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'documentos',
      header: 'Documentos',
      render: (_, p) => (
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              const html = buildContractHtml(p);
              const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
              onPreview({ url, kind: 'contract', title: 'Contrato de Compra-Venta', purchaseId: p.id });
            }}
            leftIcon={<FileText className="w-3 h-3" />}
          >
            Contrato
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              const html = buildDjHtml(p);
              const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
              onPreview({ url, kind: 'dj', title: 'Declaración Jurada de Origen', purchaseId: p.id });
            }}
            leftIcon={<FileDigit className="w-3 h-3" />}
          >
            DJ Origen
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Bar de Filtros y Control de Paginación Servidor */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[220px] flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-orange-400 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar por DNI, Vendedor, Marca, Modelo o Serie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="bg-transparent border-none outline-none w-full text-xs font-bold text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Bloque</label>
            <select
              value={filterBlock}
              onChange={(e) => {
                setFilterBlock(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            >
              <option value="">Todos los Bloques</option>
              {availableBlocks.map((b) => (
                <option key={b} value={b}>
                  Bloque {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Mostrar</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value) as any);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Botones de Paginación Servidor */}
          <div className="flex flex-col justify-end">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 opacity-0">Paginación</label>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isTableLoading}
                className="p-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-black text-slate-700 whitespace-nowrap">
                Pág. {page} de {totalPages} <span className="text-slate-400 font-normal">({total})</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isTableLoading}
                className="p-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pending}
        loading={isTableLoading}
        emptyMessage="Sin expedientes RUC 10 pendientes de sustentar"
        showPagination={false}
        rowActions={(p) => (
          <div className="flex flex-col gap-1 items-end">
            <Button
              variant="warning"
              size="xs"
              onClick={() => setSelected(p)}
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Sustentar
            </Button>
            <div className="flex gap-1">
              {canUpdate && (
                <Button variant="ghost" size="xs" onClick={() => onEdit(p)}>
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    if (confirm('¿Eliminar compra pendiente?')) onDelete(p.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        )}
      />

      {/* Modal Sustentar Expediente */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Sustentar Expediente"
        subtitle={selected ? `${selected.productBrand} ${selected.productModel} - B${selected.blockNumber || 1}` : ''}
        icon={<ShieldCheck className="w-6 h-6 text-orange-500" />}
        size="md"
      >
        {selected && (
          <form onSubmit={handleComplete} className="space-y-4 py-2">
            <DocumentUpload
              label="Voucher de Transferencia"
              file={files.v}
              onChange={(name) => setFiles({ ...files, v: name })}
              onChangeFile={(f) => setRawFiles((prev) => ({ ...prev, v: f }))}
              icon={<Camera className="w-5 h-5" />}
            />
            <DocumentUpload
              label="Contrato de Compra-Venta"
              file={files.c}
              onChange={(name) => setFiles({ ...files, c: name })}
              onChangeFile={(f) => setRawFiles((prev) => ({ ...prev, c: f }))}
              icon={<FileText className="w-5 h-5" />}
            />
            <DocumentUpload
              label="DJ Origen de Fondos"
              file={files.d}
              onChange={(name) => setFiles({ ...files, d: name })}
              onChangeFile={(f) => setRawFiles((prev) => ({ ...prev, d: f }))}
              icon={<FileDigit className="w-5 h-5" />}
            />

            <div className="pt-4 border-t flex justify-end">
              <Button
                variant="primary"
                type="submit"
                isLoading={loading}
                leftIcon={<Save className="w-4 h-4" />}
                fullWidth
              >
                Consolidar y Guardar Stock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
