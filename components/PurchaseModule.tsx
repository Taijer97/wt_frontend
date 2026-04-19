
import React, { useState, useEffect } from 'react';
import { Save, Upload, FileText, AlertTriangle, User, Monitor, DollarSign, Clock, CheckCircle, Search, Paperclip, Printer, ScrollText, X, ShieldCheck, Camera, FileDigit, FileType, History, Tag, Package, Trash2, Pencil, Download, Eye, ArrowRight, RefreshCw, Edit3, ChevronLeft, ChevronRight, IdCard, Phone } from 'lucide-react';
import { CivilStatus, HardwareOrigin, PurchaseEntry, PurchaseStatus, AppConfig, Employee, Intermediary, Supplier } from '../types';
import { DataService } from '../services/dataService';
import { fetchDni } from '../services/dniService';
import { BackendService } from '../services/backendService';

// --- CUSTOM ALERT COMPONENT ---
const CustomAlert = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-right-8 fade-in duration-300">
            <div className={`bg-[#202020] rounded-xl shadow-2xl flex items-center gap-3 p-4 pr-12 min-w-[280px] border border-white/10 relative overflow-hidden`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-[#4ade80]' : 'bg-red-500'}`}>
                    {type === 'success' ? <CheckCircle className="w-4 h-4 text-[#202020]" /> : <X className="w-4 h-4 text-[#202020]" />}
                </div>
                <p className="text-white font-medium text-sm">{message}</p>
                <button onClick={onClose} className="absolute right-4 text-slate-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
// ------------------------------

const EditPurchaseModal: React.FC<{ purchase: PurchaseEntry, intermediaries: Intermediary[], onClose: () => void, onSave: (data: any) => Promise<void> }> = ({ purchase, intermediaries, onClose, onSave }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const toDateInputValue = (value?: string) => {
        if (!value) return new Date().toISOString().split('T')[0];
        const raw = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0];
        return parsed.toISOString().split('T')[0];
    };

    useEffect(() => {
        BackendService.getSuppliers().then(sups => {
            console.log("PROVEEDORES DESDE EL BACKEND:", sups);
            setSuppliers(sups);
        }).catch((err) => {
            console.error("ERROR CARGANDO PROVEEDORES:", err);
            setSuppliers(DataService.getSuppliers());
        });
    }, []);

    const [formData, setFormData] = useState({
        providerName: purchase.providerName || '',
        sellerDocNumber: purchase.providerDni || '',
        sellerPhone: purchase.providerPhone || '',
        sellerAddress: purchase.providerAddress || '',
        bankName: purchase.bankOrigin || '',
        bankAccount: purchase.bankAccount || '',
        baseAmount: purchase.priceAgreed || 0,
        intermediaryId: purchase.intermediaryId || '',
        supplierId: purchase.supplierId || '',
        date: toDateInputValue(purchase.date),
        blockNumber: purchase.blockNumber || 1
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-blue-500" /> Editar Registro #{purchase.id}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Datos del Vendedor</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre / Razón Social</label>
                                <input value={formData.providerName} onChange={e => setFormData({...formData, providerName: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" required />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">DNI</label>
                                <input value={formData.sellerDocNumber} onChange={e => setFormData({...formData, sellerDocNumber: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" required />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Teléfono</label>
                                <input value={formData.sellerPhone} onChange={e => setFormData({...formData, sellerPhone: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dirección</label>
                                <input value={formData.sellerAddress} onChange={e => setFormData({...formData, sellerAddress: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Acuerdo Comercial</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fecha</label>
                                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" required />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Bloque / Lote</label>
                                <input type="number" value={formData.blockNumber} onChange={e => setFormData({...formData, blockNumber: Number(e.target.value)})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" min="1" required />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Intermediario</label>
                                <select value={formData.intermediaryId} onChange={e => setFormData({...formData, intermediaryId: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs">
                                    <option value="">Seleccionar...</option>
                                    {intermediaries.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Costo Base (S/)</label>
                                <input type="number" value={formData.baseAmount} onChange={e => setFormData({...formData, baseAmount: Number(e.target.value)})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" required />
                            </div>
                            
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                                    Banco
                                </label>

                                <select
                                    value={formData.bankName}
                                    onChange={e => setFormData({
                                        ...formData,
                                        bankName: e.target.value
                                    })}
                                    className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase"
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="YAPE">YAPE</option>
                                    <option value="PLIN">PLIN</option>
                                    <option value="BANCO DE LA NACION">BANCO DE LA NACIÓN</option>
                                    <option value="CAJA HUANCAYO">CAJA HUANCAYO</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Número de Cuenta</label>
                                <input value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-colors disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const PurchaseModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'pending' | 'history'>('register');
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseEntry | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string } | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null);
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);

  const canCreate = DataService.checkPermission('purchases_ruc10', 'create');
  const canUpdate = DataService.checkPermission('purchases_ruc10', 'update');
  const canDelete = DataService.checkPermission('purchases_ruc10', 'delete');
  const canRead = DataService.checkPermission('purchases_ruc10', 'read');
  
  useEffect(() => {
    loadPurchases();
    loadIntermediaries();
  }, []);

  const loadIntermediaries = async () => {
    try {
      const inters = await BackendService.getIntermediaries();
      setIntermediaries(inters);
    } catch {
      setIntermediaries(DataService.getIntermediaries());
    }
  };
  const loadPurchases = async (force = false) => { 
    // Evitamos mostrar el "skeleton" de carga si ya tenemos datos
    if (purchases.length === 0 || force) {
        setIsLoadingData(true);
    } else {
        // Si no forzamos y ya hay datos, hacemos un refresh silencioso
        BackendService.getPurchases({ type: 'RUC10', limit: 500 }).then(list => {
            const mapped = mapPurchasesFromBackend(list);
            // Solo actualizamos el estado si hubo cambios para evitar re-renders
            if (JSON.stringify(mapped) !== JSON.stringify(purchases)) {
                setPurchases(mapped);
            }
        }).catch(() => {});
        return;
    }
    
    try {
      const list = await BackendService.getPurchases({ type: 'RUC10', limit: 500 });
      const mapped = mapPurchasesFromBackend(list);
      setPurchases(mapped);
    } catch {
      setPurchases(DataService.getPurchases());
    } finally {
      setIsLoadingData(false);
    }
  };

  const normalizePurchaseList = (list: any): any[] => {
    if (Array.isArray(list)) return list;
    if (Array.isArray(list?.items)) return list.items;
    if (Array.isArray(list?.data)) return list.data;
    return [];
  };

  const mapPurchasesFromBackend = (list: any): PurchaseEntry[] => {
      return normalizePurchaseList(list).map((p: any) => ({
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
        productType: (p.items && p.items.length > 0) ? (p.items[0].category || '') : '',
        productBrand: (p.items && p.items.length > 0) ? (p.items[0].brand || '') : (p.product_brand || ''),
        productModel: (p.items && p.items.length > 0) ? (p.items[0].model || '') : (p.product_model || ''),
        productSerial: (p.items && p.items.length > 0) ? (p.items[0].serial || '') : (p.product_serial || p.document_number),
        productIdType: (p.items && p.items.length > 0) ? (p.items[0].id_type || 'SERIE') : (p.product_id_type || 'SERIE'),
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
          specs: it.specs || ''
        })),
      }));
  };

  const fetchPendingPurchasesPage = async (limit: number, offset: number, force = false, opts?: { q?: string; blockNumber?: number; opDate?: string }) => {
    const candidates: Array<{ status?: string }> = [
      { status: 'PENDING_DOCS' },
      { status: 'PENDING' },
      {},
    ];

    const tried = new Set<string>();
    const tryFetch = async (status?: string) => {
      const key = status ?? '__none__';
      if (tried.has(key)) return null;
      tried.add(key);
      const list = await BackendService.getPurchases({
        type: 'RUC10',
        ...(status ? { status } : {}),
        ...(opts?.q ? { q: opts.q } : {}),
        ...(opts?.blockNumber !== undefined ? { block_number: opts.blockNumber } : {}),
        ...(opts?.opDate ? { op_date: opts.opDate } : {}),
        limit,
        offset
      } as any, force);
      const mapped = mapPurchasesFromBackend(list);
      return mapped.filter(p => p.status === PurchaseStatus.PENDING_DOCS);
    };

    for (const c of candidates) {
      const res = await tryFetch(c.status);
      if (res && res.length > 0) return res;
    }

    if (offset > 0) {
      const fallback = await tryFetch(undefined);
      return fallback || [];
    }
    return [];
  };



  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta compra RUC 10? El equipo se retirará del stock (si no ha sido vendido o transferido).')) {
        BackendService.deletePurchase(id).then(() => {
            loadPurchases(true);
        }).catch(() => {
            DataService.deletePurchaseRuc10(id);
            loadPurchases(true);
        });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {alertInfo && <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />}
      
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl w-full md:w-fit shadow-inner overflow-x-auto print:hidden">
        <button onClick={() => setActiveTab('register')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'register' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><User className="w-4 h-4 mr-2 inline" /> Registro</button>
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><Clock className="w-4 h-4 mr-2 inline" /> Pendientes ({purchases.filter(p => p.status === PurchaseStatus.PENDING_DOCS).length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><History className="w-4 h-4 mr-2 inline" /> Historial</button>
      </div>

      {activeTab === 'register' && <RegisterForm onSuccess={() => { setAlertInfo({ message: 'Equipo Registrado', type: 'success' }); loadPurchases(true); setActiveTab('pending'); }} intermediaries={intermediaries} showAlert={(m, t) => setAlertInfo({ message: m, type: t })} purchases={purchases} />}
      {activeTab === 'pending' && <PendingList purchases={purchases} onUpdate={() => { setPendingRefreshKey(k => k + 1); loadPurchases(true); }} onPreview={setPreviewDoc} showAlert={(m, t) => setAlertInfo({ message: m, type: t })} isLoading={isLoadingData} onEdit={setEditingPurchase} onDelete={handleDelete} canDelete={canDelete} canUpdate={canUpdate} fetchPage={fetchPendingPurchasesPage} refreshKey={pendingRefreshKey} />}
      {activeTab === 'history' && <PurchaseHistory purchases={purchases} onUpdate={() => loadPurchases(true)} canDelete={canDelete} canUpdate={canUpdate} canRead={canRead} onDelete={handleDelete} onViewSupport={setViewingPurchase} isLoading={isLoadingData} onEdit={setEditingPurchase} />}

      {/* MODAL DE EDICIÓN (RUC 10) */}
      {editingPurchase && (
        <EditPurchaseModal 
            purchase={editingPurchase} 
            intermediaries={intermediaries}
            onClose={() => setEditingPurchase(null)}
            onSave={async (updatedData) => {
                try {
                    await BackendService.updatePurchase(editingPurchase.id, updatedData);
                    setAlertInfo({ message: 'Información actualizada correctamente', type: 'success' });
                    setEditingPurchase(null);
                    loadPurchases(true);
                } catch (error) {
                    setAlertInfo({ message: 'Error al actualizar información', type: 'error' });
                }
            }}
        />
      )}

      {/* VISOR DE SUSTENTACIÓN RUC 10 */}
      {viewingPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md" onClick={() => setViewingPurchase(null)}>
              <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 rounded-2xl"><ShieldCheck className="w-6 h-6"/></div>
                          <div><p className="text-[10px] font-black uppercase text-blue-400">Sustento Auditoría RUC 10</p><h3 className="font-black text-lg uppercase tracking-tight">{viewingPurchase.productBrand} {viewingPurchase.productModel}</h3></div>
                      </div>
                      <button onClick={() => setViewingPurchase(null)} className="hover:bg-red-600 p-3 rounded-2xl transition-all"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="flex-1 p-10 grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 overflow-y-auto custom-scrollbar">
                      <SupportFileCard title="Voucher Bancario" fileName={viewingPurchase.voucherUrl} icon={<Camera className="text-blue-500" />} purchaseId={viewingPurchase.id} docKind="voucher" />
                      <SupportFileCard title="Contrato Legalizado" fileName={viewingPurchase.contractUrl} icon={<FileText className="text-emerald-500" />} purchaseId={viewingPurchase.id} docKind="contract" />
                      <SupportFileCard title="Declaración de Origen" fileName={viewingPurchase.originProofUrl} icon={<FileDigit className="text-purple-500" />} purchaseId={viewingPurchase.id} docKind="dj" />
                      <div className="md:col-span-3 bg-white p-8 rounded-3xl border-2 border-slate-200 space-y-4">
                          <h4 className="font-black uppercase text-xs text-slate-500 flex items-center gap-2"><Tag className="w-4 h-4"/> Detalles del Expediente</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Nombre</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.providerName}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">DNI</p><p className="font-black text-slate-900 text-xs">{viewingPurchase.providerDni}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Teléfono</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.providerPhone || '-'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Dirección</p><p className="font-black text-slate-900 uppercase text-xs truncate" title={viewingPurchase.providerAddress}>{viewingPurchase.providerAddress || '-'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Banco</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.bankOrigin || '-'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">N° Cuenta</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.bankAccount || '-'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Serie Equipo / Doc</p><p className="font-black text-blue-600 uppercase text-xs font-mono">{viewingPurchase.productSerial}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">N° Bloque</p><p className="font-black text-slate-900 uppercase text-xs font-mono">Bloque {viewingPurchase.blockNumber || 1}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Intermediario</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.intermediaryName || '-'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Proveedor Rel.</p><p className="font-black text-purple-600 uppercase text-xs">{viewingPurchase.supplierShortName || viewingPurchase.supplierName || 'NINGUNO'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Inversión (Base + Notaría)</p><p className="font-black text-emerald-600 uppercase text-xs">S/ {((viewingPurchase.priceAgreed || 0) + (viewingPurchase.costNotary || 0)).toFixed(2)}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Fecha de Operación</p><p className="font-black text-slate-900 uppercase text-xs">{new Date(viewingPurchase.operationDate || viewingPurchase.date).toLocaleDateString()}</p></div>
                            </div>
                      </div>
                      <div className="md:col-span-3 bg-white p-8 rounded-3xl border-2 border-slate-200 space-y-4">
                          <h4 className="font-black uppercase text-xs text-slate-500 flex items-center gap-2"><Package className="w-4 h-4"/> Equipos del Documento</h4>
                          <div className="flex justify-end">
                              <a href={BackendService.resolveUrl(`/purchases/${viewingPurchase.id}/download`)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-blue-600 transition-colors"><Download className="w-3 h-3"/> Descargar Sustento</a>
                          </div>
                          {viewingPurchase.items && viewingPurchase.items.length > 0 ? (
                              <div className="overflow-x-auto border rounded-xl">
                                  <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-900 text-white uppercase text-[9px] font-black"><tr><th className="px-6 py-3">Producto</th><th className="px-6 py-3">Serie</th><th className="px-6 py-3 text-right">Costo</th></tr></thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {viewingPurchase.items.map(it => (
                                              <tr key={it.id} className="hover:bg-slate-50">
                                                  <td className="px-6 py-3 font-black uppercase">{it.brand} {it.model}</td>
                                                  <td className="px-6 py-3 font-mono font-black">{it.serial}</td>
                                                  <td className="px-6 py-3 text-right font-black">S/ {it.cost.toFixed(2)}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          ) : (
                              <div className="p-6 text-center text-slate-400 font-black uppercase italic border-2 border-dashed rounded-xl">Sin ítems registrados</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h3 className="font-black uppercase text-sm tracking-widest">{previewDoc.title}</h3>
              <button onClick={() => { const u = previewDoc?.url; setPreviewDoc(null); if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); }} className="hover:bg-red-600 p-2 rounded-xl transition-all"><X className="w-6 h-6"/></button>
            </div>
            <div className="flex-1 bg-slate-50 p-6">
              <iframe src={previewDoc.url} className="w-full h-full bg-white rounded-xl border-2 border-slate-200"></iframe>
            </div>
            <div className="p-6 flex justify-end gap-3 border-t">
              <a href={previewDoc.url} download={previewDoc.kind === 'contract' ? 'contrato_compra_venta.html' : 'declaracion_jurada.html'} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-blue-600 transition-colors"><Download className="w-3 h-3"/> Descargar</a>
              <button onClick={async () => {
                try {
                  const mod: any = await import('html2pdf.js');
                  const html2pdf = mod?.default || (window as any).html2pdf;
                  const resp = await fetch(previewDoc.url);
                  const html = await resp.text();
                  const temp = document.createElement('div');
                  temp.style.position = 'fixed';
                  temp.style.left = '-99999px';
                  temp.innerHTML = html;
                  document.body.appendChild(temp);
                  const filename = previewDoc.kind === 'contract' ? 'contrato_compra_venta.pdf' : 'declaracion_jurada.pdf';
                  await html2pdf().set({ margin: 10, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' } }).from(temp).save();
                  document.body.removeChild(temp);
                } catch {
                  alert('No se pudo generar PDF automáticamente. Use “Guardar como PDF”.');
                }
              }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-indigo-700 transition-colors"><Download className="w-3 h-3"/> Descargar PDF</button>
              <button onClick={() => {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = previewDoc.url;
                document.body.appendChild(iframe);
                iframe.onload = () => {
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();
                  setTimeout(() => { document.body.removeChild(iframe); }, 1000);
                };
              }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 transition-colors"><Printer className="w-3 h-3"/> Guardar como PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SupportFileCard = ({ title, fileName, icon, purchaseId, docKind }: { title: string, fileName?: string, icon: React.ReactNode, purchaseId: string, docKind: 'voucher' | 'contract' | 'dj' }) => {
    const fileUrl = fileName ? BackendService.resolveUrl(`/purchases/${purchaseId}/download/${docKind}`) : '#';

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-4 group hover:border-blue-500 transition-all">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">{icon}</div>
            <div><h5 className="font-black uppercase text-[10px] text-slate-900 mb-1">{title}</h5><p className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]">{fileName || 'Sin archivo'}</p></div>
            {fileName ? (
                <div className="w-full flex gap-2">
                    <button onClick={async () => {
                        try {
                            if (!fileUrl || fileUrl === '#') return;
                            
                            // Construir la URL completa
                            let finalUrl = fileUrl;
                            if (fileUrl.startsWith('/')) {
                                const baseUrl = localStorage.getItem('apiUrl') || 'http://127.0.0.1:8000';
                                finalUrl = `${baseUrl}${fileUrl}`;
                            }
                            
                            const token = localStorage.getItem('token') || '';
                            if (token && !finalUrl.includes('token=')) {
                                const separator = finalUrl.includes('?') ? '&' : '?';
                                finalUrl = `${finalUrl}${separator}token=${token}`;
                            }
                            
                            const res = await fetch(`${finalUrl}${finalUrl.includes('?') ? '&' : '?'}view=true`, {
                                headers: {
                                    'ngrok-skip-browser-warning': 'true',
                                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                                }
                            });
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const win = window.open(blobUrl, '_blank');
                            if (!win) {
                                alert("Por favor, permita las ventanas emergentes para este sitio.");
                            }
                        } catch (err) {
                            alert("Error al cargar el archivo.");
                        }
                    }} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center hover:bg-slate-200 transition-colors">
                        Ver
                    </button>
                    <button onClick={async () => {
                        try {
                            if (!fileUrl || fileUrl === '#') return;
                            // Construir la URL completa
                            let finalUrl = fileUrl;
                            if (fileUrl.startsWith('/')) {
                                const baseUrl = localStorage.getItem('apiUrl') || 'http://127.0.0.1:8000';
                                finalUrl = `${baseUrl}${fileUrl}`;
                            }
                            
                            const token = localStorage.getItem('token') || '';
                            if (token && !finalUrl.includes('token=')) {
                                const separator = finalUrl.includes('?') ? '&' : '?';
                                finalUrl = `${finalUrl}${separator}token=${token}`;
                            }
                            
                            const res = await fetch(finalUrl, {
                                headers: {
                                    'ngrok-skip-browser-warning': 'true',
                                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                                }
                            });
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            
                            // Extraer la extensión y simplificar el nombre del archivo
                            const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
                            const cleanName = `${docKind.toUpperCase()}_RUC10_${purchaseId}.${ext}`;
                            a.download = cleanName;
                            
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                            alert("Error al descargar el archivo.");
                        }
                    }} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                        <Download className="w-3 h-3"/> Descargar
                    </button>
                </div>
            ) : (
                <button disabled className="w-full bg-slate-300 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2"><Download className="w-3 h-3"/> No disponible</button>
            )}
        </div>
    );
};

const RegisterForm: React.FC<{ onSuccess: () => void, intermediaries: Intermediary[], showAlert: (m: string, t: 'success' | 'error') => void, purchases: PurchaseEntry[] }> = ({ onSuccess, intermediaries, showAlert, purchases }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    useEffect(() => {
        BackendService.getSuppliers().then(sups => {
            console.log("PROVEEDORES DESDE EL BACKEND EN REGISTER FORM:", sups);
            setSuppliers(sups);
        }).catch((err) => {
            console.error("ERROR CARGANDO PROVEEDORES:", err);
            setSuppliers(DataService.getSuppliers());
        });
    }, []);
  const config = DataService.getConfig();
  const catalog = config.productCatalog || [];
  
  const categories = Array.from(new Set(catalog.map(c => c.category))).sort();
  const initialCat = categories[0] || config.productCategories[0] || 'Laptop';
  
  // Calcular el bloque sugerido (el mayor bloque existente + 1, o 1 si no hay compras)
  const [maxBlock, setMaxBlock] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    intermediarioId: '', dni: '', nombre: '', direccion: '', telefono: '',
    tipoBien: initialCat, marca: '', modelo: '', capacidad: '', serie: '', tipoId: 'SERIE', color: '',
    condicion: 'USADO' as any, origen: HardwareOrigin.DECLARACION_JURADA, precioPactado: '', supplierId: '', banco: 'BCP', cuentaBancaria: '', blockNumber: '1',
    opDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (purchases.length > 0) {
        const currentMax = Math.max(...purchases.map(p => Number(p.blockNumber || 1)));
        setMaxBlock(currentMax);
        if (formData.blockNumber === '1' && currentMax > 0) {
            setFormData(f => ({ ...f, blockNumber: String(currentMax) }));
        }
    }
  }, [purchases]);

  const brandsForCat = Array.from(new Set(catalog.filter(c => c.category === formData.tipoBien).map(c => c.brand))).sort();
  const modelsForBrand = catalog.filter(c => c.category === formData.tipoBien && c.brand === formData.marca).map(c => c.model).sort();
  const capacitiesForModel = catalog.filter(c => c.category === formData.tipoBien && c.brand === formData.marca && c.model === formData.modelo && c.capacity).map(c => c.capacity as string).sort();

  // Auto-select logic when dependencies change
  useEffect(() => {
      if (brandsForCat.length > 0 && !brandsForCat.includes(formData.marca)) {
          setFormData(f => ({ ...f, marca: brandsForCat[0] }));
      }
  }, [formData.tipoBien, catalog]);

  useEffect(() => {
      if (modelsForBrand.length > 0 && !modelsForBrand.includes(formData.modelo)) {
          setFormData(f => ({ ...f, modelo: modelsForBrand[0] }));
      }
  }, [formData.marca, formData.tipoBien, catalog]);

  useEffect(() => {
      if (capacitiesForModel.length > 0 && !capacitiesForModel.includes(formData.capacidad)) {
          setFormData(f => ({ ...f, capacidad: capacitiesForModel[0] }));
      } else if (capacitiesForModel.length === 0 && formData.capacidad) {
          setFormData(f => ({ ...f, capacidad: '' }));
      }
  }, [formData.modelo, formData.marca, formData.tipoBien, catalog]);

  const handleChange = (e: any) => {
    const t = e.target;
    const isSelect = String(t.tagName).toUpperCase() === 'SELECT';
    const passthrough = t.type === 'email' || t.type === 'number' || t.type === 'date' || isSelect;
    const v = passthrough ? t.value : String(t.value || '').toUpperCase();
    setFormData({...formData, [t.name]: v});
  };
  const handleDniBlur = async () => {
    const dni = (formData.dni || '').trim();
    if (!dni || dni.length < 8) return;
    try {
      // Primero buscar en base de datos interna
      const seller = await BackendService.getSeller(dni);
      if (seller) {
          setFormData(prev => ({
              ...prev,
              nombre: seller.full_name || prev.nombre,
              direccion: seller.address || prev.direccion,
              telefono: seller.phone || prev.telefono,
              banco: seller.bank_name || prev.banco,
              cuentaBancaria: seller.bank_account || prev.cuentaBancaria
          }));
          showAlert("Datos cargados del historial", "success");
          return;
      }
    } catch (err) {
      // Ignorar error y continuar con la API
    }

    try {
      const info = await fetchDni(dni);
      setFormData(prev => ({
        ...prev,
        direccion: info.direccion || prev.direccion,
        nombre: info.fullName || prev.nombre
      }));
    } catch {}
  };

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processSubmit = async () => {
      if (!formData.intermediarioId) return showAlert("Seleccione el Propietario RUC 10", "error");
      const totalBase = Number(formData.precioPactado);
      
      setIsProcessing(true);
      try {
        const modelWithCap = formData.capacidad ? `${formData.modelo} ${formData.capacidad}` : formData.modelo;
        await BackendService.createPurchase({
            type: 'RUC10',
            documentNumber: formData.serie,
            supplierId: formData.supplierId ? Number(formData.supplierId) : null,
            intermediaryId: Number(formData.intermediarioId) || null,
            date: formData.opDate,
            baseAmount: totalBase,
            igvAmount: 0,
            totalAmount: totalBase,
            pdfUrl: null,
            providerName: formData.nombre,
            productBrand: formData.marca,
            productModel: modelWithCap,
            productSerial: formData.serie,
            productIdType: formData.tipoId as any,
            productCondition: formData.condicion,
            sellerDocNumber: formData.dni,
            sellerFullName: formData.nombre,
            sellerAddress: formData.direccion,
            sellerCivilStatus: 'SOLTERO', // Default value sent to backend
            sellerPhone: formData.telefono,
            bankName: formData.banco,
            bankAccount: formData.cuentaBancaria,
            blockNumber: Number(formData.blockNumber) || 1,
            items: [{ category: formData.tipoBien, brand: formData.marca, model: modelWithCap, serial: formData.serie, idType: formData.tipoId, cost: totalBase }] as any,
        } as any);
        setShowDuplicateWarning(false);
        onSuccess();
      } catch (e) {
        showAlert("Error al guardar en servidor", "error");
      } finally {
        setIsProcessing(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const currentSerial = formData.serie.trim().toUpperCase();
      if(currentSerial) {
          const matches = purchases.filter(p => p.productSerial?.trim().toUpperCase() === currentSerial);
          if(matches.length > 0) {
              const newSupplierId = String(formData.supplierId || '').trim();
              const sameOriginStore = matches.some(p => String(p.supplierId || '').trim() === newSupplierId);
              if (sameOriginStore) {
                  showAlert("Serie repetida en la misma tienda de origen. Cambie la tienda de origen o comuníquese con el administrador.", "error");
                  return;
              }
              setShowDuplicateWarning(true);
              return; // Detiene el flujo normal y muestra la alerta
          }
      }

      await processSubmit();
  };

  const [activeSection, setActiveSection] = useState<'vendedor' | 'equipo' | 'acuerdo'>('vendedor');

  return (
    <div className="space-y-6">
        {/* PROGRESS INDICATOR */}
        <div className="flex justify-end mb-4">
            <div className="bg-slate-900 p-2 rounded-2xl flex gap-2 shadow-xl">
                <button 
                    type="button"
                    onClick={() => setActiveSection('vendedor')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'vendedor' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    1. Vendedor
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveSection('equipo')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'equipo' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    2. Equipo
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveSection('acuerdo')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'acuerdo' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    3. Acuerdo
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`bg-white p-8 rounded-[2.5rem] border ${activeSection === 'vendedor' ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-gray-100 opacity-50'} shadow-sm space-y-6 transition-all duration-300`} onClick={() => setActiveSection('vendedor')}>
                <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest flex items-center gap-3">Vendedor (DNI)</h3>
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Bloque N°</label>
                        <input name="blockNumber" type="number" min="1" value={formData.blockNumber} onChange={handleChange} className="w-16 border-2 border-slate-100 rounded-xl p-2 bg-slate-50 font-black text-slate-900 text-center outline-none focus:border-emerald-500" disabled={activeSection !== 'vendedor'} />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1.5">
                                <IdCard className="w-3.5 h-3.5 text-emerald-500" />
                                Número DNI
                            </label>
                            <input name="dni" value={formData.dni} onChange={handleChange} onBlur={handleDniBlur} required className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-emerald-500" maxLength={8} disabled={activeSection !== 'vendedor'} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                Número de Celular
                            </label>
                            <input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-emerald-500" disabled={activeSection !== 'vendedor'} />
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre Completo</label><input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-emerald-500" disabled={activeSection !== 'vendedor'} /></div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Domicilio Actual</label><input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-emerald-500" disabled={activeSection !== 'vendedor'} /></div>
                    </div>
                    {activeSection === 'vendedor' && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveSection('equipo'); }} className="w-full mt-4 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-emerald-200 transition-all flex items-center justify-center gap-2">Siguiente <ArrowRight className="w-4 h-4"/></button>
                    )}
                </div>
            </div>
            
            <div className={`bg-white p-8 rounded-[2.5rem] border ${activeSection === 'equipo' ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-100 opacity-50'} shadow-sm space-y-6 transition-all duration-300`} onClick={() => setActiveSection('equipo')}>
                <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest border-b pb-4 flex items-center gap-3">Detalle del Equipo</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Producto</label>
                        {categories.length > 0 ? (
                            <select name="tipoBien" value={formData.tipoBien} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        ) : (
                            <select name="tipoBien" value={formData.tipoBien} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                {config.productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Marca</label>
                        {brandsForCat.length > 0 ? (
                            <select name="marca" value={formData.marca} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                {brandsForCat.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        ) : (
                            <select name="marca" value={formData.marca} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                <option value="">Sin marcas disponibles</option>
                            </select>
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Modelo</label>
                        {modelsForBrand.length > 0 ? (
                            <select name="modelo" value={formData.modelo} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                {modelsForBrand.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <select name="modelo" value={formData.modelo} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                <option value="">Sin modelos disponibles</option>
                            </select>
                        )}
                    </div>
                    {capacitiesForModel.length > 0 && (
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Capacidad</label>
                            <select name="capacidad" value={formData.capacidad} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                {capacitiesForModel.map(cap => <option key={cap} value={cap}>{cap}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="col-span-2 bg-slate-900 p-5 rounded-2xl border-2 border-slate-700 shadow-inner">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[9px] font-black text-purple-400 uppercase tracking-widest">{formData.tipoId === 'IMEI' ? 'Código IMEI' : 'Número de Serie (S/N)'}</label>
                            <select name="tipoId" value={formData.tipoId} onChange={handleChange} className="bg-slate-800 text-purple-400 text-[9px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:border-purple-500 cursor-pointer disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                                <option value="SERIE">Serie</option>
                                <option value="IMEI">IMEI</option>
                            </select>
                        </div>
                        <input name="serie" value={formData.serie} onChange={handleChange} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 font-mono font-black text-white outline-none focus:border-purple-500 uppercase disabled:opacity-50" placeholder={formData.tipoId === 'IMEI' ? 'Ingrese los 15 dígitos...' : 'Ingrese el S/N del equipo...'} disabled={activeSection !== 'equipo'} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Condición</label>
                        <select name="condicion" value={formData.condicion} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs focus:border-blue-500 outline-none disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                            <option value="USADO">USADO</option>
                            <option value="REACONDICIONADO">REACONDICIONADO</option>
                            <option value="NUEVO">NUEVO</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tienda de Origen</label>
                        <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm outline-none focus:border-blue-500 uppercase disabled:opacity-50" disabled={activeSection !== 'equipo'}>
                            <option value="">-- NINGUNO --</option>
                            {suppliers && suppliers.length > 0 ? suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.shortName || s.razonSocial}</option>
                            )) : (
                                <option value="" disabled>Cargando proveedores...</option>
                            )}
                        </select>
                    </div>
                    {activeSection === 'equipo' && (
                        <div className="col-span-2 mt-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveSection('acuerdo'); }} className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-blue-200 transition-all flex items-center justify-center gap-2">Siguiente <ArrowRight className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`bg-white p-8 rounded-[2.5rem] border ${activeSection === 'acuerdo' ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-gray-100 opacity-50'} shadow-sm space-y-6 transition-all duration-300`} onClick={() => setActiveSection('acuerdo')}>
                <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest border-b pb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600"/> Acuerdo Comercial</h3>
                <div className="space-y-5">
                    <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-100 shadow-sm"><label className="block text-[10px] font-black text-amber-800 uppercase mb-2 tracking-tighter">Intermediario / Propietario RUC 10</label><select name="intermediarioId" value={formData.intermediarioId} onChange={handleChange} className="w-full border-2 border-amber-200 rounded-xl p-3 font-black bg-white uppercase text-[10px] outline-none focus:border-purple-500 disabled:opacity-50" disabled={activeSection !== 'acuerdo'}>{<option value="">Seleccionar...</option>}{intermediaries.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Banco</label>
                            <select 
                                name="banco" 
                                value={formData.banco} 
                                onChange={handleChange} 
                                className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm uppercase outline-none focus:border-purple-500 disabled:opacity-50" 
                                disabled={activeSection !== 'acuerdo'}
                            >
                                <option value="">SELECCIONAR</option>
                                <option value="YAPE">YAPE</option>
                                <option value="PLIN">PLIN</option>
                                <option value="BANCO DE LA NACION">BANCO DE LA NACIÓN</option>
                                <option value="CAJA HUANCAYO">CAJA HUANCAYO</option>
                            </select>
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Número de Cuenta</label><input name="cuentaBancaria" value={formData.cuentaBancaria} onChange={handleChange} placeholder="Número de cuenta o CCI" className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm outline-none focus:border-purple-500 disabled:opacity-50" disabled={activeSection !== 'acuerdo'} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Precio S/</label><input name="precioPactado" value={formData.precioPactado} onChange={handleChange} required type="number" className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-xl text-slate-900 shadow-sm outline-none focus:border-purple-500 disabled:opacity-50" disabled={activeSection !== 'acuerdo'} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fecha de Operación</label><input type="date" name="opDate" value={formData.opDate} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm outline-none focus:border-purple-500 disabled:opacity-50" disabled={activeSection !== 'acuerdo'} /></div>
                    </div>
                    {activeSection === 'acuerdo' && (
                        <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full mt-4 bg-purple-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <CheckCircle className="w-5 h-5"/>
                            )}
                            {isProcessing ? 'Procesando...' : 'Registrar Compra'}
                        </button>
                    )}
                </div>
            </div>
        </form>

        {showDuplicateWarning && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-b-8 border-b-amber-500 relative overflow-hidden">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <AlertTriangle className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-black text-center text-slate-900 uppercase tracking-tighter mb-2">¡Equipo Duplicado!</h3>
                    <p className="text-center text-slate-600 text-sm mb-8 font-medium">El Número de Serie/IMEI <strong className="font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">{formData.serie.toUpperCase()}</strong> ya se encuentra registrado en el sistema previamente.</p>
                    
                    <div className="flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setShowDuplicateWarning(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={() => processSubmit()}
                            disabled={isProcessing}
                            className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            {isProcessing ? 'Registrando...' : 'Permitir Registro'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const PurchaseHistory: React.FC<{ purchases: PurchaseEntry[], onUpdate: () => void, canDelete: boolean, canUpdate: boolean, canRead: boolean, onDelete: (id: string) => void, onViewSupport: (p: PurchaseEntry) => void, isLoading?: boolean, onEdit: (p: PurchaseEntry) => void }> = ({ purchases, onUpdate, canDelete, canUpdate, canRead, onDelete, onViewSupport, isLoading, onEdit }) => {
    const history = purchases.filter(p => p.status === PurchaseStatus.COMPLETED);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHistory = history.filter(p => {
        if (!searchQuery) return true;
        const s = searchQuery.toLowerCase();
        return (
            p.providerName?.toLowerCase().includes(s) || 
            p.providerDni?.includes(s) ||
            p.productBrand?.toLowerCase().includes(s) ||
            p.productModel?.toLowerCase().includes(s) ||
            p.productSerial?.toLowerCase().includes(s)
        );
    });

    const sortedHistory = filteredHistory.slice().sort((a, b) => {
        const blockA = Number(a.blockNumber ?? 1) || 1;
        const blockB = Number(b.blockNumber ?? 1) || 1;
        if (blockA !== blockB) return blockB - blockA;
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeB - timeA;
    });

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center bg-slate-50 border-2 border-slate-100 px-4 py-2 focus-within:border-emerald-400 transition-colors">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar en el historial por DNI, Vendedor, Marca, Modelo o Serie..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full ml-3 text-sm font-bold text-slate-700 placeholder-slate-400"
                />
            </div>
            
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                        <tr><th className="px-8 py-5">Bloque</th><th className="px-8 py-5">Fecha</th><th className="px-8 py-5">Proveedor Rel.</th><th className="px-8 py-5">Equipo / Serie</th><th className="px-8 py-5">Vendedor</th><th className="px-8 py-5 text-right">Inversión</th><th className="px-8 py-5 text-center">Acciones Auditoría</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={`skeleton-h-${i}`} className="animate-pulse">
                                    <td className="px-8 py-5"><div className="h-6 w-12 bg-slate-200 rounded-full"></div></td>
                                    <td className="px-8 py-5"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                                    <td className="px-8 py-5"><div className="h-6 w-20 bg-slate-200 rounded-full"></div></td>
                                    <td className="px-8 py-5 space-y-2">
                                        <div className="h-4 w-40 bg-slate-200 rounded"></div>
                                        <div className="h-3 w-32 bg-slate-200 rounded"></div>
                                    </td>
                                    <td className="px-8 py-5 space-y-2">
                                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                    </td>
                                    <td className="px-8 py-5 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center gap-2">
                                            <div className="h-9 w-9 bg-slate-200 rounded-xl"></div>
                                            <div className="h-9 w-9 bg-slate-200 rounded-xl"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : sortedHistory.length === 0 ? (<tr><td colSpan={7} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Bandeja de historial vacía.</td></tr>) : sortedHistory.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5">
                                    <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">B{item.blockNumber || 1}</span>
                                </td>
                                <td className="px-8 py-5 font-bold text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="px-8 py-5">
                                    {item.supplierShortName || item.supplierName ? (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-purple-200 shadow-sm whitespace-nowrap">
                                            {item.supplierShortName || item.supplierName}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold text-slate-300 uppercase">NINGUNO</span>
                                    )}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="font-black text-slate-900 uppercase text-xs">
                                        {item.items && item.items.length > 0
                                            ? `${item.items[0].category || ''} ${item.items[0].brand} ${item.items[0].model}${item.items.length > 1 ? ` (+${item.items.length - 1})` : ''}`
                                            : `${item.productType ? item.productType + ' ' : ''}${item.productBrand} ${item.productModel}`}
                                    </div>
                                    <div className="font-mono text-[9px] font-black text-slate-400 uppercase">S/N: {item.items && item.items.length > 0 ? item.items[0].serial : item.productSerial}</div>
                                </td>
                                <td className="px-8 py-5"><div className="font-black text-slate-700 uppercase text-xs">{item.providerName}</div><div className="text-[10px] font-bold text-slate-400">{item.providerDni}</div></td>
                                <td className="px-8 py-5 text-right font-black text-slate-900">S/ {((item.priceAgreed || 0) + (item.costNotary || 0)).toFixed(2)}</td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-center gap-2">
                                        {canRead && <button onClick={() => onViewSupport(item)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm transition-all" title="Ver Expediente Auditoría"><Eye className="w-4 h-4"/></button>}
                                        {canUpdate && <button onClick={() => onEdit(item)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white rounded-xl shadow-sm transition-all" title="Editar Información"><Edit3 className="w-4 h-4"/></button>}
                                        {canDelete && <button onClick={() => onDelete(item.id)} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl shadow-sm transition-all" title="Eliminar Registro"><Trash2 className="w-4 h-4"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PendingList: React.FC<{ purchases: PurchaseEntry[], onUpdate: () => void, onPreview: (p: { url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string }) => void, showAlert: (m: string, t: 'success' | 'error') => void, isLoading?: boolean, onEdit: (p: PurchaseEntry) => void, onDelete: (id: string) => void, canDelete: boolean, canUpdate: boolean, fetchPage?: (limit: number, offset: number, force?: boolean, opts?: { q?: string; blockNumber?: number; opDate?: string }) => Promise<PurchaseEntry[]>, refreshKey?: number }> = ({ purchases, onUpdate, onPreview, showAlert, isLoading, onEdit, onDelete, canDelete, canUpdate, fetchPage, refreshKey }) => {
    const [pageSize, setPageSize] = useState<10 | 50 | 100>(10);
    const [page, setPage] = useState(1);
    const [pagePurchases, setPagePurchases] = useState<PurchaseEntry[]>([]);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [pageError, setPageError] = useState(false);
    const [allBlocks, setAllBlocks] = useState<string[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBlock, setFilterBlock] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        if (!fetchPage) return;
        BackendService.getPurchaseBlocks({ type: 'RUC10', status: 'PENDING' }).then(list => {
            setAllBlocks((list || []).map(n => String(n)).sort((a, b) => Number(a) - Number(b)));
        }).catch(() => {
            setAllBlocks([]);
        });
    }, [fetchPage, refreshKey]);

    useEffect(() => {
        if (!fetchPage) return;
        let cancelled = false;
        setIsPageLoading(true);
        fetchPage(pageSize + 1, (page - 1) * pageSize, false, { q: searchQuery || undefined, blockNumber: filterBlock ? Number(filterBlock) : undefined, opDate: filterDate || undefined }).then(list => {
            if (cancelled) return;
            if (list.length === 0 && page > 1) {
                showAlert('No hay más registros para mostrar.', 'success');
                setPage(p => Math.max(1, p - 1));
                return;
            }
            setPagePurchases(list.slice(0, pageSize));
            setHasMore(list.length > pageSize);
            setPageError(false);
        }).catch(() => {
            if (cancelled) return;
            setPagePurchases([]);
            setHasMore(false);
            setPageError(true);
            showAlert('No se pudieron cargar los pendientes desde el servidor. Mostrando datos en modo local.', 'error');
        }).finally(() => {
            if (cancelled) return;
            setIsPageLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [fetchPage, pageSize, page, refreshKey, searchQuery, filterBlock, filterDate]);

    const pending = fetchPage && !pageError ? pagePurchases : purchases.filter(p => p.status === PurchaseStatus.PENDING_DOCS);
    const [selected, setSelected] = useState<PurchaseEntry | null>(null);
    const [files, setFiles] = useState({ v: null as string | null, c: null as string | null, d: null as string | null });
    const [rawFiles, setRawFiles] = useState<{ v: File | null, c: File | null, d: File | null }>({ v: null, c: null, d: null });
    const [loading, setLoading] = useState(false);

    const showLoading = Boolean(isLoading) || isPageLoading;

    const filteredPending = pending.filter(p => {
        const matchesSearch = 
            (p.providerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (p.providerDni || '').includes(searchQuery) ||
            (p.productBrand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.productModel || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.productSerial || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBlock = filterBlock ? String(p.blockNumber || 1) === filterBlock : true;
        const matchesDate = filterDate ? new Date(p.date).toISOString().split('T')[0] === filterDate : true;
        return matchesSearch && matchesBlock && matchesDate;
    });

    const sortedPending = filteredPending.slice().sort((a, b) => {
        const blockA = Number(a.blockNumber ?? 1) || 1;
        const blockB = Number(b.blockNumber ?? 1) || 1;
        if (blockA !== blockB) return blockB - blockA;
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeB - timeA;
    });

    const uniqueBlocks = (fetchPage && !pageError && allBlocks.length > 0)
        ? allBlocks
        : Array.from(new Set(pending.map(p => String(p.blockNumber || 1)))).sort((a, b) => Number(a) - Number(b));

    const fmtDateEs = (iso?: string) => {
        const dt = iso ? new Date(iso) : new Date();
        const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
        return `${dt.getDate()} de ${meses[dt.getMonth()]} del año ${dt.getFullYear()}`;
    };
    const curr = (v?: number) => {
        const num = v || 0;
        return `S/ ${num.toFixed(2)}`.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };
    const buildContractHtml = (p: PurchaseEntry) => {
        const fecha = fmtDateEs(p.date);
        const base = curr(p.priceAgreed || 0);
        const notary = curr(p.costNotary || 0);
        const total = curr((p.priceAgreed || 0));
        const vendedorNombre = p.providerName || '';
        const vendedorDni = p.providerDni || '';
        const vendedorDir = p.providerAddress || '';
        const vendedorTelefono = p.providerPhone || '';
        const compradorNombre = p.intermediaryName || '';
        const compradorDoc = p.intermediaryDocNumber || '';
        const compradorRuc = p.intermediaryRucNumber || '';
        const compradorDir = p.intermediaryAddress || '';
        const cat = p.productType || '';
        const brand = p.productBrand || '';
        const model = p.productModel || '';
        const serial = p.productSerial || '';
        const cond = p.productCondition || '';
        const banco = p.bankOrigin || '';
        const cuenta = p.bankAccount || '';
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Contrato de Compra-Venta</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.45;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:10px}p{margin:5px 0;text-align:justify}.firmas{margin-top:28px;display:flex;justify-content:space-between;text-align:center;width:100%}.firma{width:48%}.linea{border-top:1px solid #000;margin:40px 0 5px 0;width:100%}.huella{font-size:12px;margin-top:4px}.footer{margin-top:15px;font-size:10.5px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Contrato de Compra-Venta</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Conste por el presente documento el <strong>Contrato de Compra-Venta</strong> que celebran, de una parte el <strong>PROPIETARIO (VENDEDOR)</strong> y, de la otra, el <strong>COMPRADOR (INTERMEDIARIO)</strong>, conforme a las cláusulas siguientes:</p><p><strong>PRIMERA: DATOS DEL VENDEDOR</strong></p><p>Nombre: ${vendedorNombre}.<br>DNI: ${vendedorDni}.<br>Dirección: ${vendedorDir}.<br>Teléfono: ${vendedorTelefono}.</p><p><strong>SEGUNDA: DATOS DEL COMPRADOR (INTERMEDIARIO)</strong></p><p>Nombre: ${compradorNombre}.<br>Documento / RUC: ${compradorDoc} / ${compradorRuc}.<br>Dirección: ${compradorDir}.</p><p><strong>TERCERA: DESCRIPCIÓN DEL EQUIPO</strong></p><p>Categoría: ${cat}. Marca: ${brand}. Modelo: ${model}.<br>Número de serie: ${serial}. Condición: ${cond}.</p><p><strong>CUARTA: PRECIO Y ACUERDO COMERCIAL</strong></p><p>El precio de venta asciende a la suma de <strong>${base}</strong>, monto que el COMPRADOR declara haber cancelado en su totalidad.${banco ? ` Dicho pago se realizó a través del banco <strong>${banco}</strong>` : ''}${cuenta ? ` a la cuenta <strong>${cuenta}</strong>` : ''}.</p><p><strong>QUINTA: DECLARACIONES</strong></p><p>El VENDEDOR declara ser legítimo propietario del bien descrito, libre de cargas o gravámenes. El COMPRADOR declara haber revisado y aceptado el equipo conforme.</p><p><strong>SEXTA: CONFORMIDAD</strong></p><p>Leído que fue el presente contrato, ambas partes lo firman en señal de conformidad en la fecha indicada.</p><div class="space"></div><div class="firmas"><div class="firma"><div class="linea"></div><strong>VENDEDOR</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}<div class="huella">Huella Digital</div></div><div class="firma"><div class="linea"></div><strong>COMPRADOR / INTERMEDIARIO</strong><br>Nombre: ${compradorNombre}<br>DNI / RUC: ${compradorDoc} / ${compradorRuc}<div class="huella">Huella Digital</div></div></div></body></html>`;
    };
    const buildDjHtml = (p: PurchaseEntry) => {
        const fecha = fmtDateEs(p.date);
        const vendedorNombre = p.providerName || '';
        const vendedorDni = p.providerDni || '';
        const vendedorDir = p.providerAddress || '';
        const cat = p.productType || '';
        const brand = p.productBrand || '';
        const model = p.productModel || '';
        const serial = p.productSerial || '';
        const cond = p.productCondition || '';
        const base = curr(p.priceAgreed || 0);
        const notary = curr(p.costNotary || 0);
        const total = curr((p.priceAgreed || 0));
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Declaración Jurada de Origen</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.45;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:10px}p{margin:5px 0;text-align:justify}.firma{margin-top:35px;text-align:center}.linea{border-top:1px solid #000;margin:45px auto 6px auto;width:70%}.huella{font-size:12px;margin-top:4px}.footer{margin-top:18px;font-size:10.5px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Declaración Jurada de Origen</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Yo, <strong>${vendedorNombre}</strong>, identificado con Documento Nacional de Identidad (DNI) N.º <strong>${vendedorDni}</strong>, con domicilio en <strong>${vendedorDir}</strong>, declaro bajo juramento lo siguiente:</p><p><strong>PRIMERA: DECLARACIÓN DE PROPIEDAD</strong></p><p>Declaro ser único y legítimo propietario del bien descrito en la presente declaración, el cual ha sido obtenido de manera lícita, sin vulnerar derechos de terceros y conforme a la normativa vigente.</p><p><strong>SEGUNDA: DESCRIPCIÓN DEL BIEN</strong></p><p>Categoría: ${cat}. Marca: ${brand}. Modelo: ${model}. Número de serie: ${serial}. Condición: ${cond}.</p><p><strong>TERCERA: RESPONSABILIDAD</strong></p><p>Declaro que el bien no se encuentra reportado como robado, extraviado, ni vinculado a actividades ilícitas. Asumo plena responsabilidad civil, administrativa y penal en caso de que la presente declaración resulte falsa.</p><p><strong>CUARTA: FINALIDAD</strong></p><p>La presente Declaración Jurada se emite para los fines legales que correspondan, sirviendo como constancia del origen y propiedad del bien descrito.</p><p><strong>QUINTA: CONFORMIDAD</strong></p><p>Firmo la presente declaración en señal de conformidad, en la fecha indicada.</p><div class="space"></div><div class="firma"><div class="linea"></div><strong>DECLARANTE</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}<div class="huella">Huella Digital</div></div></body></html>`;
    };
    const handleComplete = async (e: any) => {
        e.preventDefault();
        if(!selected) return;
        if(!rawFiles.v || !rawFiles.c || !rawFiles.d) return showAlert("Faltan Documentos (Voucher, Contrato, DJ)", "error");
        
        setLoading(true);
        try {
            // Upload files first
            const resV = await BackendService.uploadPurchaseFile(selected.id, rawFiles.v, 'voucher');
            const resC = await BackendService.uploadPurchaseFile(selected.id, rawFiles.c, 'contract');
            const resD = await BackendService.uploadPurchaseFile(selected.id, rawFiles.d, 'dj');

            const totalCost = (selected.priceAgreed || 0);
            await BackendService.createProduct({
                category: selected.productType || '',
                brand: selected.productBrand || '',
                model: selected.productModel || '',
                serialNumber: selected.productSerial || '',
                idType: selected.productIdType as any || 'SERIE',
                condition: selected.productCondition as any || 'USADO',
                status: 'IN_STOCK_RUC10' as any,
                origin: selected.originType as any || 'PERSONA',
                purchasePrice: selected.priceAgreed || 0,
                notaryCost: selected.costNotary || 0,
                totalCost: totalCost,
                intermediaryId: selected.intermediaryId,
                stock: 1,
            });
            await BackendService.updatePurchase(selected.id, { status: 'COMPLETED' });
            
            DataService.updatePurchase({ 
                ...selected, 
                status: PurchaseStatus.COMPLETED, 
                voucherUrl: resV.filename, 
                contractUrl: resC.filename, 
                originProofUrl: resD.filename, 
                operationDate: new Date().toISOString() 
            });
            
            setSelected(null); 
            setFiles({v:null, c:null, d:null}); 
            setRawFiles({v:null, c:null, d:null});
            onUpdate();
            showAlert("Expediente Sustentado", "success");
        } catch (error) {
            console.error(error);
            showAlert("Error al guardar en el servidor", "error");
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = Boolean(searchQuery || filterBlock || filterDate);
    if(!showLoading && pending.length === 0 && !hasActiveFilters) return <div className="p-24 text-center text-slate-300 font-black uppercase border-4 border-dashed rounded-[3rem] bg-white flex flex-col items-center gap-4"><Package className="w-12 h-12 opacity-30"/><p className="tracking-[0.2em]">Sin expedientes RUC 10 pendientes de sustentar.</p></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 focus-within:border-orange-400 transition-colors">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por DNI, Vendedor, Marca, Modelo o Serie..." 
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                        className="bg-transparent border-none outline-none w-full ml-3 text-sm font-bold text-slate-700 placeholder-slate-400"
                    />
                </div>
                <div className="flex gap-4">
                    
                    <div className="flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1">Filtrar Bloque</label>
                        <select 
                            value={filterBlock} 
                            onChange={e => { setFilterBlock(e.target.value); setPage(1); }}
                            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-orange-400 font-black text-slate-700 text-sm"
                        >
                            <option value="">Todos los Bloques</option>
                            {uniqueBlocks.map(b => <option key={b} value={b}>Bloque {b}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1">Filtrar Fecha</label>
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
                            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-orange-400 font-black text-slate-700 text-sm"
                        />
                    </div>
                    {fetchPage && !pageError && (
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1">Mostrar</label>
                            <select
                                value={pageSize}
                                onChange={e => { setPage(1); setPageSize(Number(e.target.value) as any); }}
                                className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-orange-400 font-black text-slate-700 text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    )}
                    {fetchPage && !pageError && (
                        <div className="flex items-end">
                            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl p-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1 || showLoading}
                                    aria-label="Página anterior"
                                    title="Página anterior"
                                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="h-9 px-3 inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest">
                                    {page}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!hasMore || showLoading}
                                    aria-label="Página siguiente"
                                    title="Página siguiente"
                                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[800px]">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-6 py-4">Bloque</th>
                                <th className="px-6 py-4">Vendedor (DNI)</th>
                                <th className="px-6 py-4">Proveedor Rel.</th>
                                <th className="px-6 py-4">Detalle del Equipo</th>
                                <th className="px-6 py-4">Acuerdo Comercial</th>
                                <th className="px-6 py-4 text-center">Documentos</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {showLoading ? (
                                // SKELETON LOADER
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-6 w-10 bg-slate-200 rounded-full"></div></td>
                                        <td className="px-6 py-4 space-y-2">
                                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                            <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full"></div></td>
                                        <td className="px-6 py-4 space-y-2">
                                            <div className="flex gap-2"><div className="h-4 w-16 bg-slate-200 rounded-full"></div><div className="h-4 w-16 bg-slate-200 rounded-full"></div></div>
                                            <div className="h-4 w-40 bg-slate-200 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4 space-y-2">
                                            <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                            <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-12 w-full bg-slate-200 rounded-lg"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-200 rounded-xl mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : sortedPending.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">No se encontraron expedientes con los filtros actuales.</td>
                                </tr>
                            ) : sortedPending.map(p => {
                                const hasSupplier = Boolean(p.supplierShortName || p.supplierName);
                                const supplierKey = String(p.supplierId || p.supplierShortName || p.supplierName || '');
                                const supplierTagStyles = [
                                    'bg-purple-100 text-purple-700 border-purple-200',
                                    'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    'bg-amber-100 text-amber-700 border-amber-200',
                                    'bg-sky-100 text-sky-700 border-sky-200',
                                ];
                                let idx = 0;
                                if (hasSupplier && supplierKey) {
                                    let h = 0;
                                    for (let i = 0; i < supplierKey.length; i++) h = (h * 31 + supplierKey.charCodeAt(i)) | 0;
                                    idx = Math.abs(h) % supplierTagStyles.length;
                                }
                                const tagCls = hasSupplier ? supplierTagStyles[idx] : '';
                                return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-sm">B{p.blockNumber || 1}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                                            <User className="w-3 h-3 text-slate-400" />
                                            <span>{p.providerName}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                                            <IdCard className="w-3 h-3 text-slate-400" />
                                            <span>{p.providerDni}</span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1.5">
                                            <Phone className="w-3 h-3 text-slate-300" />
                                            <span>{p.providerPhone || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {p.supplierShortName || p.supplierName ? (
                                            <span className={`${tagCls} text-[10px] font-black px-3 py-1 rounded-full uppercase border shadow-sm whitespace-nowrap`}>
                                                {p.supplierShortName || p.supplierName}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">NINGUNO</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase border border-blue-200">{p.productType || 'SIN CATEGORÍA'}</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase border border-indigo-200">{p.productBrand || 'SIN MARCA'}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                                p.productCondition === 'NUEVO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                p.productCondition === 'REACONDICIONADO' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>{p.productCondition}</span>
                                        </div>
                                        <div className="font-black text-slate-900 uppercase text-xs">{p.productModel}</div>
                                        <div className="font-mono text-[9px] font-black text-slate-400 uppercase mt-1">S/N: {p.productSerial}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-900">S/ {((p.priceAgreed || 0) + (p.costNotary || 0)).toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-bold">{p.bankOrigin} {p.bankAccount ? `- ${p.bankAccount}` : ''}</div>
                                        <div className="text-[9px] text-slate-400 mt-1">{p.operationDate ? new Date(p.operationDate).toLocaleDateString() : ''}</div>
                                        {p.intermediaryPhone ? (
                                            <a 
                                                href={`https://wa.me/51${p.intermediaryPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`*TRANSFERENCIA*\n*CLIENTE:* ${p.providerName}\n*MONTO:* S/ ${((p.priceAgreed || 0) + (p.costNotary || 0)).toFixed(2)}\n*BANCO:* ${p.bankOrigin || '-'}\n*CUENTA:* ${p.bankAccount || '-'}`)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.473-1.46-1.646-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                Intermediario
                                            </a>
                                        ) : (
                                            <span className="mt-2 inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                                Sin WhatsApp
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button type="button" onClick={() => {
                                                const html = buildContractHtml(p);
                                                const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                                                onPreview({ url, kind: 'contract', title: 'Contrato de Compra-Venta', purchaseId: p.id });
                                            }} className="bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg font-black uppercase text-[9px] hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"><FileText className="w-3 h-3"/> Contrato</button>
                                            <button type="button" onClick={() => {
                                                const html = buildDjHtml(p);
                                                const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                                                onPreview({ url, kind: 'dj', title: 'Declaración Jurada de Origen', purchaseId: p.id });
                                            }} className="bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg font-black uppercase text-[9px] hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"><FileDigit className="w-3 h-3"/> DJ Origen</button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => setSelected(p)} className="bg-orange-100 text-orange-600 py-2 px-4 rounded-xl font-black uppercase text-[10px] shadow-sm hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto whitespace-nowrap w-full">
                                                Sustentar <ArrowRight className="w-3 h-3"/>
                                            </button>
                                            <div className="flex gap-2">
                                                {canUpdate && (
                                                    <button onClick={() => onEdit(p)} className="flex-1 bg-slate-100 text-slate-600 p-2 rounded-xl shadow-sm hover:bg-slate-200 transition-all flex items-center justify-center" title="Editar Info">
                                                        <Edit3 className="w-4 h-4"/>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => {
                                                        if (confirm('¿Está seguro de eliminar esta compra pendiente?')) {
                                                            onDelete(p.id);
                                                        }
                                                    }} className="flex-1 bg-red-50 text-red-600 p-2 rounded-xl shadow-sm hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Eliminar">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md" onClick={() => setSelected(null)}>
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl"><ShieldCheck className="w-6 h-6"/></div>
                                <div>
                                    <h3 className="font-black uppercase text-lg tracking-tighter">Sustentar Expediente</h3>
                                    <p className="text-[10px] font-bold text-orange-100 uppercase">{selected.productBrand} {selected.productModel} - B{selected.blockNumber || 1}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} className="hover:bg-orange-600 p-2 rounded-xl transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="p-8 bg-slate-50">
                            <form onSubmit={handleComplete} className="space-y-4">
                                <DocumentUpload label="Voucher de Transferencia" file={files.v} onChange={name => setFiles({...files, v: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, v: f }))} icon={<Camera className="w-5 h-5"/>} />
                                <DocumentUpload label="Contrato de Compra-Venta" file={files.c} onChange={name => setFiles({...files, c: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, c: f }))} icon={<FileText className="w-5 h-5"/>} />
                                <DocumentUpload label="DJ Origen de Fondos" file={files.d} onChange={name => setFiles({...files, d: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, d: f }))} icon={<FileDigit className="w-5 h-5"/>} />
                                
                                <div className="pt-4">
                                    <button type="submit" disabled={loading} className={`w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                                        {loading ? 'Subiendo y Guardando...' : 'Consolidar y Guardar Stock'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DocumentUpload = ({ label, file, onChange, onChangeFile, icon }: { label: string, file: string | null, onChange: (s: string) => void, onChangeFile?: (f: File) => void, icon: React.ReactNode }) => (
    <label className={`block p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'bg-emerald-50 border-emerald-500 shadow-inner' : 'bg-slate-50 border-slate-200 hover:border-orange-500'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${file ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}>{file ? <CheckCircle className="w-5 h-5"/> : icon}</div>
            <div className="flex-1 overflow-hidden"><span className={`block text-[10px] font-black uppercase ${file ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</span>{file && <span className="text-[9px] font-mono text-emerald-600 font-bold block truncate">{file}</span>}</div>
            {!file && <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Adjuntar</span>}
        </div>
        <input
            type="file"
            className="hidden"
            onChange={e => {
                const f = e.target.files![0];
                onChange(f.name);
                onChangeFile && onChangeFile(f);
            }}
            accept=".pdf,image/*"
        />
    </label>
);
