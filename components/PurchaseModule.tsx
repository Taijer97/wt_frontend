
import React, { useState, useEffect } from 'react';
import { Save, Upload, FileText, AlertTriangle, User, Monitor, DollarSign, Clock, CheckCircle, Search, Paperclip, Printer, ScrollText, X, ShieldCheck, Camera, FileDigit, FileType, History, Tag, Package, Trash2, Pencil, Download, Eye, ArrowRight, RefreshCw } from 'lucide-react';
import { CivilStatus, HardwareOrigin, PurchaseEntry, PurchaseStatus, AppConfig, Employee, Intermediary } from '../types';
import { DataService } from '../services/dataService';
import { fetchDni } from '../services/dniService';
import { BackendService } from '../services/backendService';

export const PurchaseModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'pending' | 'history'>('register');
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseEntry | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string } | null>(null);

  const canDelete = DataService.checkPermission('purchases_ruc10', 'delete');
  
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
  const loadPurchases = async () => { 
    try {
      const list = await BackendService.getPurchases({ type: 'RUC10', limit: 500 });
      const mapped: PurchaseEntry[] = list.map((p: any) => ({
        id: String(p.id),
        date: p.date,
        status: p.status === 'COMPLETED' ? PurchaseStatus.COMPLETED : PurchaseStatus.PENDING_DOCS,
        intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined,
        intermediaryName: p.intermediary_name || '',
        intermediaryDocNumber: p.intermediary_doc_number || '',
        intermediaryRucNumber: p.intermediary_ruc_number || '',
        intermediaryAddress: p.intermediary_address || '',
        providerDni: p.seller_doc_number || '',
        providerName: p.provider_name || p.seller_full_name || '',
        providerAddress: p.seller_address || '',
        providerCivilStatus: (p.seller_civil_status as CivilStatus) || CivilStatus.SOLTERO,
        providerOccupation: 'Persona Natural',
        productType: (p.items && p.items.length > 0) ? (p.items[0].category || '') : '',
        productBrand: (p.items && p.items.length > 0) ? (p.items[0].brand || '') : (p.product_brand || ''),
        productModel: (p.items && p.items.length > 0) ? (p.items[0].model || '') : (p.product_model || ''),
        productSerial: (p.items && p.items.length > 0) ? (p.items[0].serial || '') : (p.product_serial || p.document_number),
        productIdType: p.product_id_type as any,
        productColor: '',
        productCondition: p.product_condition || 'USADO',
        originType: HardwareOrigin.DECLARACION_JURADA,
        priceAgreed: p.base_amount || 0,
        costNotary: (p.total_amount || 0) - (p.base_amount || 0),
        bankOrigin: '',
        bankDestination: '',
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
          cost: Number(it.cost || 0),
          specs: it.specs || ''
        })),
      }));
      setPurchases(mapped);
    } catch {
      setPurchases(DataService.getPurchases());
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta compra RUC 10? El equipo se retirará del stock (si no ha sido vendido o transferido).')) {
        BackendService.deletePurchase(id).then(() => {
            loadPurchases();
        }).catch(() => {
            DataService.deletePurchaseRuc10(id);
            loadPurchases();
        });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl w-full md:w-fit shadow-inner overflow-x-auto print:hidden">
        <button onClick={() => setActiveTab('register')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'register' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><User className="w-4 h-4 mr-2 inline" /> Registro</button>
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><Clock className="w-4 h-4 mr-2 inline" /> Pendientes ({purchases.filter(p => p.status === PurchaseStatus.PENDING_DOCS).length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><History className="w-4 h-4 mr-2 inline" /> Historial</button>
      </div>

      {activeTab === 'register' && <RegisterForm onSuccess={() => { loadPurchases(); setActiveTab('pending'); }} intermediaries={intermediaries} />}
      {activeTab === 'pending' && <PendingList purchases={purchases} onUpdate={loadPurchases} onPreview={setPreviewDoc} onDelete={handleDelete} canDelete={canDelete} />}
      {activeTab === 'history' && <PurchaseHistory purchases={purchases} onUpdate={loadPurchases} canDelete={canDelete} onDelete={handleDelete} onViewSupport={setViewingPurchase} />}

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
                          <h4 className="font-black uppercase text-xs text-slate-500 flex items-center gap-2"><Tag className="w-4 h-4"/> Detalles del Propietario</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">Nombre</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.providerName}</p></div>
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">DNI</p><p className="font-black text-slate-900 text-xs">{viewingPurchase.providerDni}</p></div>
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">Estado Civil</p><p className="font-black text-slate-900 uppercase text-xs">{viewingPurchase.providerCivilStatus}</p></div>
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">{viewingPurchase.productIdType === 'IMEI' ? 'IMEI' : 'Serie Equipo'}</p><p className="font-black text-blue-600 uppercase text-xs font-mono">{viewingPurchase.productSerial}</p></div>
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
                                      <thead className="bg-slate-900 text-white uppercase text-[9px] font-black"><tr><th className="px-6 py-3">Producto</th><th className="px-6 py-3">{viewingPurchase.productIdType === 'IMEI' ? 'IMEI' : 'Serie'}</th><th className="px-6 py-3 text-right">Costo</th></tr></thead>
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

const SupportFileCard = ({ title, fileName, icon, purchaseId, docKind }: { title: string, fileName?: string, icon: React.ReactNode, purchaseId: string, docKind: 'voucher' | 'contract' | 'dj' }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-4 group hover:border-blue-500 transition-all">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">{icon}</div>
        <div><h5 className="font-black uppercase text-[10px] text-slate-900 mb-1">{title}</h5><p className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]">{fileName || 'Sin archivo'}</p></div>
        {fileName ? (
            <a href={BackendService.resolveUrl(`/purchases/${purchaseId}/download/${docKind}`)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"><Download className="w-3 h-3"/> Descargar</a>
        ) : (
            <button disabled className="w-full bg-slate-300 text-white py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2"><Download className="w-3 h-3"/> No disponible</button>
        )}
    </div>
);

const RegisterForm: React.FC<{ onSuccess: () => void, intermediaries: Intermediary[] }> = ({ onSuccess, intermediaries }) => {
  const config = DataService.getConfig();
  const [idType, setIdType] = useState<'SERIE' | 'IMEI'>('SERIE');
  const [formData, setFormData] = useState({
    intermediarioId: '', dni: '', nombre: '', direccion: '', estadoCivil: CivilStatus.SOLTERO,
    tipoBien: config.productCategories[0] || 'Laptop', marca: '', modelo: '', serie: '', color: '',
    condicion: 'USADO' as any, origen: HardwareOrigin.DECLARACION_JURADA, precioPactado: '', gastoNotarial: config.defaultNotaryCost.toString(), bancoOrigen: 'BCP', bancoDestino: 'BCP',
    opDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: any) => {
    const value = e.target.value && typeof e.target.value === 'string' ? e.target.value.toUpperCase() : e.target.value;
    setFormData({...formData, [e.target.name]: value});
  };
  const handleDniBlur = async () => {
    const dni = (formData.dni || '').trim();
    if (!dni || dni.length < 8) return;
    try {
      const info = await fetchDni(dni);
      setFormData({
        ...formData,
        nombre: info.fullName || formData.nombre,
        direccion: info.direccion || formData.direccion,
        estadoCivil: (info.estadoCivil || formData.estadoCivil)
      });
    } catch {}
  };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.intermediarioId) return alert("Seleccione el Propietario RUC 10 responsable.");
      const totalBase = Number(formData.precioPactado);
      await BackendService.createPurchase({
          type: 'RUC10',
          documentNumber: formData.serie,
          supplierId: null,
          intermediaryId: Number(formData.intermediarioId) || null,
          date: formData.opDate,
          baseAmount: totalBase,
          igvAmount: 0,
          totalAmount: totalBase + Number(formData.gastoNotarial),
          pdfUrl: null,
          providerName: formData.nombre,
          productBrand: formData.marca,
          productModel: formData.modelo,
          productSerial: formData.serie,
          productIdType: idType,
          productCondition: formData.condicion,
          sellerDocNumber: formData.dni,
          sellerFullName: formData.nombre,
          sellerAddress: formData.direccion,
          sellerCivilStatus: formData.estadoCivil,
          items: [{ category: formData.tipoBien, brand: formData.marca, model: formData.modelo, serial: formData.serie, cost: totalBase }],
      });
      onSuccess();
    };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest border-b pb-4 flex items-center gap-3">Vendedor (DNI)</h3>
            <div className="space-y-4">
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Número DNI</label><div className="relative"><input name="dni" value={formData.dni} onChange={handleChange} onBlur={handleDniBlur} required className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-blue-500 pr-10" maxLength={8} /><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre Completo</label><input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Domicilio Actual</label><input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" /></div>
            </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest border-b pb-4 flex items-center gap-3">Detalle del Equipo</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Categoría</label><select name="tipoBien" value={formData.tipoBien} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs">{config.productCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Marca</label><input name="marca" value={formData.marca} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Modelo</label><input name="modelo" value={formData.modelo} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase" /></div>
                <div className="col-span-2 bg-slate-900 p-5 rounded-2xl border-2 border-slate-700 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[9px] font-black text-purple-400 uppercase tracking-widest">
                            {idType === 'SERIE' ? 'Número de Serie (S/N)' : 'Número de IMEI'}
                        </label>
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button 
                                type="button"
                                onClick={() => setIdType('SERIE')}
                                className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${idType === 'SERIE' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >SERIE</button>
                            <button 
                                type="button"
                                onClick={() => setIdType('IMEI')}
                                className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${idType === 'IMEI' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >IMEI</button>
                        </div>
                    </div>
                    <input name="serie" value={formData.serie} onChange={handleChange} placeholder={idType === 'SERIE' ? 'INGRESE SERIE...' : 'INGRESE IMEI...'} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 font-mono font-black text-white outline-none focus:border-purple-500 uppercase" />
                </div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Condición</label>
                    <select name="condicion" value={formData.condicion} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs">
                        <option value="USADO">USADO</option>
                        <option value="REACONDICIONADO">REACONDICIONADO</option>
                        <option value="NUEVO">NUEVO</option>
                    </select>
                </div>
            </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest border-b pb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600"/> Acuerdo Comercial</h3>
            <div className="space-y-5">
                <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-100 shadow-sm"><label className="block text-[10px] font-black text-amber-800 uppercase mb-2 tracking-tighter">Intermediario / Propietario RUC 10</label><select name="intermediarioId" value={formData.intermediarioId} onChange={handleChange} className="w-full border-2 border-amber-200 rounded-xl p-3 font-black bg-white uppercase text-[10px]">{<option value="">Seleccionar...</option>}{intermediaries.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Precio S/</label><input name="precioPactado" value={formData.precioPactado} onChange={handleChange} required type="number" className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-xl text-slate-900 shadow-sm" /></div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Notaría S/</label><input name="gastoNotarial" value={formData.gastoNotarial} onChange={handleChange} required type="number" className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fecha de Operación</label><input type="date" name="opDate" value={formData.opDate} onChange={handleChange} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-white font-black text-slate-900 shadow-sm" /></div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> Registrar Compra</button>
            </div>
        </div>
    </form>
  );
};

const PurchaseHistory: React.FC<{ purchases: PurchaseEntry[], onUpdate: () => void, canDelete: boolean, onDelete: (id: string) => void, onViewSupport: (p: PurchaseEntry) => void }> = ({ purchases, onUpdate, canDelete, onDelete, onViewSupport }) => {
    const history = purchases.filter(p => p.status === PurchaseStatus.COMPLETED).reverse();
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                    <tr><th className="px-8 py-5">Fecha</th><th className="px-8 py-5">Equipo / Serie</th><th className="px-8 py-5">Vendedor</th><th className="px-8 py-5 text-right">Inversión</th><th className="px-8 py-5 text-center">Acciones Auditoría</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {history.length === 0 ? (<tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Bandeja de historial vacía.</td></tr>) : history.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-5 font-bold text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="px-8 py-5">
                                <div className="font-black text-slate-900 uppercase text-xs">
                                    {item.items && item.items.length > 0
                                        ? `${item.items[0].category || ''} ${item.items[0].brand} ${item.items[0].model}${item.items.length > 1 ? ` (+${item.items.length - 1})` : ''}`
                                        : `${item.productType ? item.productType + ' ' : ''}${item.productBrand} ${item.productModel}`}
                                </div>
                                <div className="font-mono text-[9px] font-black text-slate-400 uppercase">{item.productIdType === 'IMEI' ? 'IMEI' : 'S/N'}: {item.items && item.items.length > 0 ? item.items[0].serial : item.productSerial}</div>
                            </td>
                            <td className="px-8 py-5"><div className="font-black text-slate-700 uppercase text-xs">{item.providerName}</div><div className="text-[10px] font-bold text-slate-400">{item.providerDni}</div></td>
                            <td className="px-8 py-5 text-right font-black text-slate-900">S/ {(item.priceAgreed + item.costNotary).toFixed(2)}</td>
                            <td className="px-8 py-5">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => onViewSupport(item)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm transition-all" title="Ver Expediente Auditoría"><Eye className="w-4 h-4"/></button>
                                    {canDelete && <button onClick={() => onDelete(item.id)} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl shadow-sm transition-all" title="Eliminar Registro"><Trash2 className="w-4 h-4"/></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PendingList: React.FC<{ purchases: PurchaseEntry[], onUpdate: () => void, onPreview: (p: { url: string; kind: 'contract' | 'dj'; title: string; purchaseId: string }) => void, onDelete: (id: string) => void, canDelete: boolean }> = ({ purchases, onUpdate, onPreview, onDelete, canDelete }) => {
    const pending = purchases.filter(p => p.status === PurchaseStatus.PENDING_DOCS);
    const [selected, setSelected] = useState<PurchaseEntry | null>(null);
    const [files, setFiles] = useState({ v: null as string | null, c: null as string | null, d: null as string | null });
    const [rawFiles, setRawFiles] = useState<{ v: File | null, c: File | null, d: File | null }>({ v: null, c: null, d: null });
    const [loading, setLoading] = useState(false);

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
        const base = curr(p.priceAgreed);
        const notary = curr(p.costNotary);
        const total = curr(p.priceAgreed + p.costNotary);
        const vendedorNombre = p.providerName;
        const vendedorDni = p.providerDni;
        const vendedorDir = p.providerAddress;
        const vendedorCivil = p.providerCivilStatus;
        const compradorNombre = p.intermediaryName || '';
        const compradorDoc = p.intermediaryDocNumber || '';
        const compradorRuc = p.intermediaryRucNumber || '';
        const compradorDir = p.intermediaryAddress || '';
        const cat = p.productType;
        const brand = p.productBrand;
        const model = p.productModel;
        const serialLabel = p.productIdType === 'IMEI' ? 'Número de IMEI' : 'Número de serie';
        const serial = p.productSerial;
        const cond = p.productCondition;
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Contrato de Compra-Venta</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.45;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:10px}p{margin:5px 0;text-align:justify}.firmas{margin-top:28px;display:flex;justify-content:space-between;text-align:center;width:100%}.firma{width:48%}.linea{border-top:1px solid #000;margin:40px 0 5px 0;width:100%}.huella{font-size:12px;margin-top:4px}.footer{margin-top:15px;font-size:10.5px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Contrato de Compra-Venta</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Conste por el presente documento el <strong>Contrato de Compra-Venta</strong> que celebran, de una parte el <strong>PROPIETARIO (VENDEDOR)</strong> y, de la otra, el <strong>COMPRADOR (INTERMEDIARIO)</strong>, conforme a las cláusulas siguientes:</p><p><strong>PRIMERA: DATOS DEL VENDEDOR</strong></p><p>Nombre: ${vendedorNombre}.<br>DNI: ${vendedorDni}.<br>Dirección: ${vendedorDir}.<br>Estado civil: ${vendedorCivil}.</p><p><strong>SEGUNDA: DATOS DEL COMPRADOR (INTERMEDIARIO)</strong></p><p>Nombre: ${compradorNombre}.<br>Documento / RUC: ${compradorDoc} / ${compradorRuc}.<br>Dirección: ${compradorDir}.</p><p><strong>TERCERA: DESCRIPCIÓN DEL EQUIPO</strong></p><p>Categoría: ${cat}. Marca: ${brand}. Modelo: ${model}.<br>${serialLabel}: ${serial}. Condición: ${cond}.</p><p><strong>CUARTA: PRECIO Y ACUERDO COMERCIAL</strong></p><p>El precio de venta asciende a la suma de <strong>${base}</strong>, monto que el COMPRADOR declara haber cancelado en su totalidad. Los gastos notariales ascienden a ${notary}, siendo el total <strong>${total}</strong>.</p><p><strong>QUINTA: DECLARACIONES</strong></p><p>El VENDEDOR declara ser legítimo propietario del bien descrito, libre de cargas o gravámenes. El COMPRADOR declara haber revisado y aceptado el equipo conforme.</p><p><strong>SEXTA: CONFORMIDAD</strong></p><p>Leído que fue el presente contrato, ambas partes lo firman en señal de conformidad en la fecha indicada.</p><div class="space"></div><div class="firmas"><div class="firma"><div class="linea"></div><strong>VENDEDOR</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}<div class="huella">Huella Digital</div></div><div class="firma"><div class="linea"></div><strong>COMPRADOR / INTERMEDIARIO</strong><br>Nombre: ${compradorNombre}<br>DNI / RUC: ${compradorDoc} / ${compradorRuc}<div class="huella">Huella Digital</div></div></div></body></html>`;
    };
    const buildDjHtml = (p: PurchaseEntry) => {
        const fecha = fmtDateEs(p.date);
        const vendedorNombre = p.providerName;
        const vendedorDni = p.providerDni;
        const vendedorDir = p.providerAddress;
        const vendedorCivil = p.providerCivilStatus;
        const cat = p.productType;
        const brand = p.productBrand;
        const model = p.productModel;
        const serialLabel = p.productIdType === 'IMEI' ? 'Número de IMEI' : 'Número de serie';
        const serial = p.productSerial;
        const cond = p.productCondition;
        const base = curr(p.priceAgreed);
        const notary = curr(p.costNotary);
        const total = curr(p.priceAgreed + p.costNotary);
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Declaración Jurada de Origen</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.45;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:10px}p{margin:5px 0;text-align:justify}.firma{margin-top:35px;text-align:center}.linea{border-top:1px solid #000;margin:45px auto 6px auto;width:70%}.huella{font-size:12px;margin-top:4px}.footer{margin-top:18px;font-size:10.5px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Declaración Jurada de Origen</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Yo, <strong>${vendedorNombre}</strong>, identificado con Documento Nacional de Identidad (DNI) N.º <strong>${vendedorDni}</strong>, con domicilio en <strong>${vendedorDir}</strong>, de estado civil <strong>${vendedorCivil}</strong>, declaro bajo juramento lo siguiente:</p><p><strong>PRIMERA: DECLARACIÓN DE PROPIEDAD</strong></p><p>Declaro ser único y legítimo propietario del bien descrito en la presente declaración, el cual ha sido obtenido de manera lícita, sin vulnerar derechos de terceros y conforme a la normativa vigente.</p><p><strong>SEGUNDA: DESCRIPCIÓN DEL BIEN</strong></p><p>Categoría: ${cat}. Marca: ${brand}. Modelo: ${model}. ${serialLabel}: ${serial}. Condición: ${cond}.</p><p><strong>TERCERA: RESPONSABILIDAD</strong></p><p>Declaro que el bien no se encuentra reportado como robado, extraviado, ni vinculado a actividades ilícitas. Asumo plena responsabilidad civil, administrativa y penal en caso de que la presente declaración resulte falsa.</p><p><strong>CUARTA: FINALIDAD</strong></p><p>La presente Declaración Jurada se emite para los fines legales que correspondan, sirviendo como constancia del origen y propiedad del bien descrito.</p><p><strong>QUINTA: CONFORMIDAD</strong></p><p>Firmo la presente declaración en señal de conformidad, en la fecha indicada.</p><div class="space"></div><div class="firma"><div class="linea"></div><strong>DECLARANTE</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}<div class="huella">Huella Digital</div></div></body></html>`;
    };
    const handleComplete = async (e: any) => {
        e.preventDefault();
        if(!selected) return;
        if(!rawFiles.v || !rawFiles.c || !rawFiles.d) return alert("Sustentación incompleta. Se requieren los 3 documentos.");
        
        setLoading(true);
        try {
            // Upload files first
            const resV = await BackendService.uploadPurchaseFile(selected.id, rawFiles.v, 'voucher');
            const resC = await BackendService.uploadPurchaseFile(selected.id, rawFiles.c, 'contract');
            const resD = await BackendService.uploadPurchaseFile(selected.id, rawFiles.d, 'dj');

            const totalCost = selected.priceAgreed + selected.costNotary;
            await BackendService.createProduct({
                category: selected.productType,
                brand: selected.productBrand,
                model: selected.productModel,
                serialNumber: selected.productSerial,
                idType: selected.productIdType,
                condition: selected.productCondition as any,
                status: 'IN_STOCK_RUC10' as any,
                origin: selected.originType as any,
                purchasePrice: selected.priceAgreed,
                notaryCost: selected.costNotary,
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
            alert('Expediente consolidado y movido a historial');
        } catch (error) {
            console.error(error);
            alert('No se pudo consolidar en el backend. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if(pending.length === 0) return <div className="p-24 text-center text-slate-300 font-black uppercase border-4 border-dashed rounded-[3rem] bg-white flex flex-col items-center gap-4"><Package className="w-12 h-12 opacity-30"/><p className="tracking-[0.2em]">Sin expedientes RUC 10 pendientes de sustentar.</p></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
                {pending.map(p => (
                    <div key={p.id} onClick={() => setSelected(p)} className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${selected?.id === p.id ? 'bg-orange-50 border-orange-500 shadow-xl' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700 uppercase border border-blue-200">{p.productType || 'SIN CATEGORÍA'}</span>
                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase border ${
                                    p.productCondition === 'NUEVO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                    p.productCondition === 'REACONDICIONADO' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>{p.productCondition}</span>
                            </div>
                            <h4 className="font-black text-slate-900 uppercase text-xs">{p.productBrand} {p.productModel}</h4>
                            <span className="text-[10px] font-black text-slate-400 font-mono">Serie: {p.productSerial}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {canDelete && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} 
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Eliminar pendiente"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <ArrowRight className={`w-5 h-5 ${selected?.id === p.id ? 'text-orange-500' : 'text-slate-200'}`} />
                        </div>
                    </div>
                ))}
            </div>
            {selected && (
                <div className="bg-white p-10 rounded-[3rem] border-2 border-orange-200 shadow-2xl animate-in slide-in-from-right-4 duration-300">
                    <h3 className="font-black uppercase text-sm mb-8 flex justify-between items-center text-slate-900 tracking-tighter">Sustentar Expediente RUC 10 <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button></h3>
                    <form onSubmit={handleComplete} className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => {
                                if(!selected) return;
                                const html = buildContractHtml(selected);
                                const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                                onPreview({ url, kind: 'contract', title: 'Contrato de Compra-Venta', purchaseId: selected.id });
                            }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"><FileText className="w-4 h-4"/> Generar Contrato</button>
                            <button type="button" onClick={() => {
                                if(!selected) return;
                                const html = buildDjHtml(selected);
                                const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                                onPreview({ url, kind: 'dj', title: 'Declaración Jurada de Origen', purchaseId: selected.id });
                            }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2"><FileDigit className="w-4 h-4"/> Generar Declaración Jurada</button>
                        </div>
                        <DocumentUpload label="Voucher de Transferencia" file={files.v} onChange={name => setFiles({...files, v: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, v: f }))} icon={<Camera className="w-5 h-5"/>} />
                        <DocumentUpload label="Contrato de Compra-Venta" file={files.c} onChange={name => setFiles({...files, c: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, c: f }))} icon={<FileText className="w-5 h-5"/>} />
                        <DocumentUpload label="DJ Origen de Fondos" file={files.d} onChange={name => setFiles({...files, d: name})} onChangeFile={f => setRawFiles(prev => ({ ...prev, d: f }))} icon={<FileDigit className="w-5 h-5"/>} />
                        <button type="submit" disabled={loading} className={`w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 mt-4 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                            {loading ? 'Subiendo y Guardando...' : 'Consolidar y Guardar Stock'}
                        </button>
                    </form>
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
