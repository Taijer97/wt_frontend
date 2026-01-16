
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { Supplier, WholesalePurchaseEntry, PurchaseStatus, ReceiptType, HardwareOrigin } from '../types';
import { 
  Plus, Trash2, ShoppingCart, Barcode, Save, Truck, History, Search, FileText, Calendar,
  CheckCircle, Package, ArrowRight, Clock, Upload, X, FileSearch, AlertCircle, Info, Tag, Pencil, Download
} from 'lucide-react';

export const DirectPurchaseModule: React.FC = () => {
    const config = DataService.getConfig();
    const [activeTab, setActiveTab] = useState<'register' | 'pending' | 'history'>('register');
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [docSeries, setDocSeries] = useState('F001');
    const [docNumber, setDocNumber] = useState('');
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [wholesalePurchases, setWholesalePurchases] = useState<WholesalePurchaseEntry[]>([]);
    const [historySearch, setHistorySearch] = useState('');
    const [items, setItems] = useState<{ id: string, category: string, brand: string, model: string, serial: string, idType: string, cost: number, specs: string }[]>([]);
    const [newItem, setNewItem] = useState({ category: config.productCategories[0] || 'Laptop', brand: '', model: '', serial: '', cost: '', specs: '' });
    const [regularizingItem, setRegularizingItem] = useState<WholesalePurchaseEntry | null>(null);
    const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
    const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
    const [viewingSupport, setViewingSupport] = useState<WholesalePurchaseEntry | null>(null);
    const [idType, setIdType] = useState<'SERIE' | 'IMEI'>('SERIE');

    const canDelete = DataService.checkPermission('purchases_ruc20', 'delete');
    const effectiveIgvRate = config.isIgvExempt ? 0 : 0.18;

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        try {
            const sups = await BackendService.getSuppliers();
            setSuppliers(sups.map((s: any) => ({
                id: String(s.id),
                ruc: s.ruc,
                razonSocial: s.name,
                contactName: s.contact || '',
                phone: '',
                email: '',
                address: '',
                department: '',
                province: '',
                district: '',
                category: 'MAYORISTA'
            })));
        } catch {
            setSuppliers(DataService.getSuppliers());
        }
        try {
            const list = await BackendService.getPurchases({ type: 'RUC20', limit: 500 });
            const mapped: WholesalePurchaseEntry[] = list.map((p: any) => ({
                id: String(p.id),
                date: p.date,
                supplierId: String(p.supplier_id || ''),
                supplierName: p.provider_name || '',
                supplierRuc: '',
                documentNumber: p.document_number,
                status: p.status === 'COMPLETED' ? PurchaseStatus.COMPLETED : PurchaseStatus.PENDING_DOCS,
                items: (p.items || []).map((it: any) => ({
                    id: String(it.id),
                    category: it.category || '',
                    brand: (it.brand || '').toUpperCase(),
                    model: (it.model || '').toUpperCase(),
                    serial: it.serial || '',
                    idType: it.id_type || 'SERIE',
                    cost: Number(it.cost || 0),
                    specs: it.specs || ''
                })),
                baseAmount: p.base_amount,
                igvAmount: p.igv_amount,
                totalAmount: p.total_amount,
                pdfUrl: BackendService.resolveUrl(p.pdf_url || undefined),
            }));
            setWholesalePurchases(mapped);
        } catch {
            setWholesalePurchases(DataService.getWholesalePurchases());
        }
    };

    const handleAddItem = () => {
        if(!newItem.category || !newItem.brand || !newItem.model || !newItem.serial || !newItem.cost) return alert('Complete todos los campos del producto.');
        if (items.some(i => i.serial === newItem.serial.toUpperCase().trim())) return alert('Serie duplicada en lista.');
        
        setItems([...items, { 
            id: `ITEM-${Date.now()}`, category: newItem.category,
            brand: newItem.brand.toUpperCase().trim(), model: newItem.model.toUpperCase().trim(), 
            serial: newItem.serial.toUpperCase().trim(), idType: idType, cost: Number(newItem.cost), specs: newItem.specs.toUpperCase().trim()
        }]);
        
        // OPTIMIZACIÓN: Mantener valores de equipo para carga rápida, solo limpiar SERIE
        setNewItem({ ...newItem, serial: '' });
    };

    const handleDeletePurchase = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Anular esta compra mayorista? El sistema verificará que ningún equipo haya sido vendido.')) {
            await BackendService.deletePurchase(id);
            await loadData();
        }
    };

    const handleRegisterPending = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplierId || !docNumber || items.length === 0) return alert('Datos incompletos.');
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        if (!supplier) return;
        const fullDocNumber = `${docSeries.toUpperCase().trim()}-${docNumber.trim().padStart(8, '0')}`;
        const totalBase = items.reduce((acc, i) => acc + i.cost, 0);
        await BackendService.createPurchase({
            type: 'RUC20',
            documentNumber: fullDocNumber,
            supplierId: Number(supplier.id),
            baseAmount: totalBase,
            igvAmount: totalBase * effectiveIgvRate,
            totalAmount: totalBase * (1 + effectiveIgvRate),
            providerName: supplier.razonSocial,
            productBrand: items[0]?.brand || null,
            productModel: items[0]?.model || null,
            productSerial: items[0]?.serial || null,
            productIdType: items[0]?.idType || 'SERIE',
            items: items.map(i => ({ 
                category: i.category, 
                brand: i.brand, 
                model: i.model, 
                serial: i.serial, 
                id_type: i.idType,
                specs: i.specs, 
                cost: i.cost 
            })),
          });
        alert('Compra registrada como PENDIENTE. Cargue la factura PDF para ingresar el stock.');
        setItems([]); setDocNumber(''); setSelectedSupplierId(''); setActiveTab('pending');
    };

    const handleRegularize = async () => {
        if (!regularizingItem || !uploadingPdf) return;
        try {
            let pdfUrl = regularizingItem.pdfUrl || undefined;
            if (uploadFileObj) {
                const res = await BackendService.uploadPurchaseFile(regularizingItem.id, uploadFileObj);
                pdfUrl = res.url;
            }
            await BackendService.updatePurchase(regularizingItem.id, { status: 'COMPLETED', pdfUrl: pdfUrl });
            for (const it of (regularizingItem.items || [])) {
                await BackendService.createProduct({
                    category: it.category,
                    brand: it.brand,
                    model: it.model,
                    serialNumber: it.serial,
                    condition: 'NUEVO' as any,
                    status: 'TRANSFERIDO_EMPRESA' as any,
                    origin: HardwareOrigin.COMPRA_MAYORISTA_LOCAL as any,
                    stock: 1,
                    purchasePrice: it.cost,
                    notaryCost: 0,
                    totalCost: it.cost,
                });
            }
            const supplier = suppliers.find(s => s.id === regularizingItem.supplierId);
            await BackendService.createTransaction({
                trxType: 'purchase',
                documentType: 'FACTURA',
                documentNumber: regularizingItem.documentNumber,
                entityName: regularizingItem.supplierName,
                entityDocNumber: supplier?.ruc || '',
                baseAmount: regularizingItem.baseAmount,
                igvAmount: regularizingItem.igvAmount,
                totalAmount: regularizingItem.totalAmount,
                items: (regularizingItem.items || []).map(it => ({
                    productId: undefined,
                        productName: `${it.category} - ${it.brand} ${it.model} (${it.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${it.serial})`,
                    quantity: 1,
                    unitPriceBase: it.cost,
                    totalBase: it.cost,
                })),
            });
        } catch {
            await BackendService.updatePurchase(regularizingItem.id, { status: 'COMPLETED', pdfUrl: uploadingPdf });
            for (const it of (regularizingItem.items || [])) {
                await BackendService.createProduct({
                    category: it.category,
                    brand: it.brand,
                    model: it.model,
                    serialNumber: it.serial,
                    condition: 'NUEVO' as any,
                    status: 'TRANSFERIDO_EMPRESA' as any,
                    origin: HardwareOrigin.COMPRA_MAYORISTA_LOCAL as any,
                    stock: 1,
                    purchasePrice: it.cost,
                    notaryCost: 0,
                    totalCost: it.cost,
                });
            }
            const supplier = suppliers.find(s => s.id === regularizingItem.supplierId);
            DataService.addTransaction('purchase', {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                documentType: 'FACTURA' as any,
                documentNumber: regularizingItem.documentNumber,
                entityName: regularizingItem.supplierName,
                entityDocNumber: supplier?.ruc || '',
                items: (regularizingItem.items || []).map(it => ({
                    productId: '',
                    productName: `${it.category} - ${it.brand} ${it.model} (${it.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${it.serial})`,
                    quantity: 1,
                    unitPriceBase: it.cost,
                    totalBase: it.cost,
                })),
                baseAmount: regularizingItem.baseAmount,
                igvAmount: regularizingItem.igvAmount,
                totalAmount: regularizingItem.totalAmount,
                sunatStatus: 'ACEPTADO',
                isIgvExempt: false,
            });
        }
        alert('Stock ingresado y compra sustentada correctamente.');
        setRegularizingItem(null); setUploadingPdf(null); setUploadFileObj(null); await loadData();
        setActiveTab('history');
    };

    const pendingPurchases = wholesalePurchases.filter(p => p.status === PurchaseStatus.PENDING_DOCS);
    const filteredHistory = wholesalePurchases.filter(h => h.status === PurchaseStatus.COMPLETED && 
        ((h.supplierName || '').toLowerCase().includes(historySearch.toLowerCase()) || h.documentNumber.toLowerCase().includes(historySearch.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit shadow-inner">
                <button onClick={() => setActiveTab('register')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'register' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Registro</button>
                <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Pendientes ({pendingPurchases.length})</button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Historial</button>
            </div>

            {activeTab === 'register' && (
                <form onSubmit={handleRegisterPending} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Truck className="w-5 h-5 text-blue-600" /> Datos del Comprobante</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">Proveedor Mayorista</label>
                                    <select required value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 text-slate-900 font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all">
                                        <option value="">Seleccione...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.razonSocial} (RUC: {s.ruc})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">Fecha Emisión</label>
                                    <input type="date" required value={docDate} onChange={e => setDocDate(e.target.value)} className="w-full border-2 border-slate-50 rounded-xl p-3 bg-slate-50 font-black outline-none focus:bg-white" />
                                </div>
                                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase">Serie Factura</label><input value={docSeries} onChange={e => setDocSeries(e.target.value.toUpperCase())} className="w-full border-2 border-slate-50 rounded-xl p-3 font-mono font-black" placeholder="F001" maxLength={4} /></div>
                                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase">Número Factura</label><input required value={docNumber} onChange={e => setDocNumber(e.target.value.replace(/\D/g, ''))} className="w-full border-2 border-slate-50 rounded-xl p-3 font-mono font-black" placeholder="Ej: 852" /></div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Barcode className="w-5 h-5 text-purple-600" /> Detalle de Equipos</h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl mb-8">
                                 <div><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Categoría</label><select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-2.5 rounded-lg border-2 border-white bg-white font-black uppercase text-[10px]">{config.productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                 <div><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Marca</label><input value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value.toUpperCase()})} className="w-full p-2.5 rounded-lg border-2 border-white bg-white font-black text-[10px] uppercase" placeholder="DELL" /></div>
                                 <div><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Modelo</label><input value={newItem.model} onChange={e => setNewItem({...newItem, model: e.target.value.toUpperCase()})} className="w-full p-2.5 rounded-lg border-2 border-white bg-white font-black text-[10px] uppercase" placeholder="VOSTRO" /></div>
                                 <div className="relative">
                                     <div className="flex justify-between items-center mb-1">
                                         <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{idType === 'IMEI' ? 'IMEI' : 'N° Serie'}</label>
                                         <div className="flex bg-white rounded-md border border-slate-200 p-0.5 scale-90 origin-right">
                                             <button type="button" onClick={() => setIdType('SERIE')} className={`px-2 py-0.5 text-[7px] font-black rounded ${idType === 'SERIE' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>S/N</button>
                                             <button type="button" onClick={() => setIdType('IMEI')} className={`px-2 py-0.5 text-[7px] font-black rounded ${idType === 'IMEI' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>IMEI</button>
                                         </div>
                                     </div>
                                     <input value={newItem.serial} onChange={e => setNewItem({...newItem, serial: e.target.value.toUpperCase()})} className="w-full p-2.5 rounded-lg border-2 border-white bg-white font-black text-[10px] uppercase font-mono" placeholder={idType === 'IMEI' ? 'INGRESE IMEI...' : 'SN-123...'} />
                                 </div>
                                 <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Costo Neto Unitario (S/)</label><input type="number" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: e.target.value})} className="w-full p-2.5 rounded-lg border-2 border-white bg-white font-black text-[10px]" placeholder="0.00" /></div>
                                 <div className="md:col-span-2 flex items-end"><button type="button" onClick={handleAddItem} className="w-full bg-slate-900 text-white p-3 rounded-lg font-black uppercase text-[10px] hover:bg-purple-600 transition-all shadow-lg active:scale-95">Agregar Item</button></div>
                             </div>
                             <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-900 text-white uppercase text-[9px] font-black"><tr><th className="px-6 py-3">Cat.</th><th className="px-6 py-3">Producto</th><th className="px-6 py-3">Serie / IMEI</th><th className="px-6 py-3 text-right">Costo</th><th className="px-6 py-3 text-center">Acc.</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{items.map(i => (<tr key={i.id} className="hover:bg-slate-50"><td className="px-6 py-3 font-bold text-blue-600 uppercase text-[9px]">{i.category}</td><td className="px-6 py-3 font-black uppercase">{i.brand} {i.model}</td><td className="px-6 py-3 font-mono font-black"><span className="text-[8px] text-slate-400 mr-1">{i.idType}:</span>{i.serial}</td><td className="px-6 py-3 text-right font-black">S/ {i.cost.toFixed(2)}</td><td className="px-6 py-3 text-center"><button type="button" onClick={() => setItems(items.filter(x => x.id !== i.id))} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl sticky top-24 border border-slate-800">
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-800 pb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-emerald-400" /> Resumen Compra</h3>
                             <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-500">Subtotal</span><span className="font-black">S/ {items.reduce((a,b)=>a+b.cost,0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs font-bold uppercase"><span className="text-emerald-500">IGV ({effectiveIgvRate*100}%)</span><span className="font-black text-emerald-400">+ S/ {(items.reduce((a,b)=>a+b.cost,0)*effectiveIgvRate).toFixed(2)}</span></div>
                                <div className="pt-4 border-t border-slate-800 flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Total Documento</span><span className="text-2xl font-black">S/ {(items.reduce((a,b)=>a+b.cost,0)*(1+effectiveIgvRate)).toFixed(2)}</span></div>
                             </div>
                             <button type="submit" disabled={items.length===0} className="w-full py-5 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all">Registrar como Pendiente</button>
                        </div>
                    </div>
                </form>
            )}

            {activeTab === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPurchases.length === 0 ? (
                        <div className="col-span-full p-20 text-center text-slate-300 font-black uppercase tracking-widest border-4 border-dashed rounded-[3rem] bg-white italic">No hay compras por sustentar.</div>
                    ) : (
                        pendingPurchases.map(p => (
                            <div key={p.id} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-orange-100 hover:border-orange-500 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm"><Clock className="w-6 h-6"/></div>
                                    <span className="text-[10px] font-black text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 uppercase">Pendiente Sustento</span>
                                </div>
                                <h4 className="font-black text-slate-900 uppercase text-sm mb-1">{p.supplierName}</h4>
                                <p className="text-[10px] font-mono font-black text-slate-400 mb-6 uppercase">Factura: {p.documentNumber}</p>
                                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center mb-8 border border-slate-100 shadow-inner">
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Monto Total</span>
                                    <span className="text-lg font-black text-slate-900">S/ {p.totalAmount.toFixed(2)}</span>
                                </div>
                                <button onClick={() => setRegularizingItem(p)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-95"><Upload className="w-4 h-4"/> Cargar Sustento</button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="relative w-96"><Search className="absolute left-3 top-3 text-slate-400 w-4 h-4"/><input type="text" placeholder="Filtrar proveedor o factura..." value={historySearch} onChange={e => setHistorySearch(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-black focus:border-emerald-500 outline-none uppercase shadow-sm" /></div>
                        <div className="bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-100 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Compras Sustentadas: {filteredHistory.length}</div>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest"><tr><th className="px-8 py-5">Emisión</th><th className="px-8 py-5">N° Factura</th><th className="px-8 py-5">Proveedor</th><th className="px-8 py-5">Equipo / Serie</th><th className="px-8 py-5 text-right">Monto Total</th><th className="px-8 py-5 text-center">Auditoría</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredHistory.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">No se encontraron registros.</td></tr>
                                ) : (
                                    filteredHistory.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 text_slate-900 font-black text-xs">{new Date(p.date).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 font-mono font-black text-blue-700 uppercase text-xs">{p.documentNumber}</td>
                                            <td className="px-8 py-5 font-black text-slate-900 uppercase text-xs">{p.supplierName}</td>
                                            <td className="px-8 py-5 text-xs font-black text-slate-700">
                                                {p.items.length === 0 ? '-' : `${p.items[0].brand} ${p.items[0].model} — ${p.items[0].idType}: ${p.items[0].serial}${p.items.length > 1 ? ` (+${p.items.length - 1})` : ''}`}
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">S/ {p.totalAmount.toFixed(2)}</td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => setViewingSupport(p)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm" title="Ver Sustento PDF"><FileSearch className="w-4 h-4" /></button>
                                                    {canDelete && (
                                                        <button onClick={(e) => handleDeletePurchase(p.id, e)} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm" title="Anular Compra"><Trash2 className="w-4 h-4"/></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL SUSTENTO PDF PARA AUDITORÍA */}
            {viewingSupport && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md" onClick={() => setViewingSupport(null)}>
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg"><FileText className="w-6 h-6"/></div>
                                <div><p className="text-[10px] font-black uppercase text-emerald-400">Expediente Digital de Compra</p><h3 className="font-black uppercase text-sm">{viewingSupport.documentNumber}</h3></div>
                            </div>
                            <button onClick={() => setViewingSupport(null)} className="hover:bg-red-600 p-3 rounded-2xl transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 bg-slate-100 flex items-center justify-center p-8">
                            <div className="bg-white w-full h-full rounded-2xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 space-y-6">
                                <div className="text-center">
                                    <FileText className="w-20 h-20 opacity-30 mx-auto mb-4" />
                                    <p className="font-black uppercase text-sm tracking-[0.2em] text-slate-900">Documento: {viewingSupport.pdfUrl || 'factura_proveedor.pdf'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sustento de Crédito Fiscal y Valorización de Inventario</p>
                                </div>
                                {viewingSupport.pdfUrl ? (
                                    <a href={BackendService.resolveUrl(`/purchases/${viewingSupport.id}/download`)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl active:scale-95"><Download className="w-5 h-5"/> Descargar Original para SUNAT</a>
                                ) : (
                                    <button disabled className="bg-slate-300 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 shadow-inner"><Download className="w-5 h-5"/> Archivo no disponible</button>
                                )}
                                <div className="w-full max-w-4xl bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Equipos de la Factura</h4>
                                    {viewingSupport.items && viewingSupport.items.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-900 text-white uppercase text-[9px] font-black"><tr><th className="px-6 py-3">Producto</th><th className="px-6 py-3">Serie</th><th className="px-6 py-3 text-right">Costo</th></tr></thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {viewingSupport.items.map(it => (
                                                        <tr key={it.id} className="hover:bg-white">
                                                            <td className="px-6 py-3 font-black uppercase text-slate-900">{(it.brand || '').toUpperCase()} {(it.model || '').toUpperCase()}</td>
                                                            <td className="px-6 py-3 font-mono font-black text-blue-700">{it.serial}</td>
                                                            <td className="px-6 py-3 text-right font-black text-slate-900">S/ {(it.cost || 0).toFixed(2)}</td>
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
                 </div>
            )}

            {/* MODAL CARGA DE DOCUMENTO (PENDIENTES) */}
            {regularizingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                            <h3 className="font-black uppercase tracking-widest text-[10px]">Carga de Sustento: {regularizingItem.documentNumber}</h3>
                            <button onClick={() => setRegularizingItem(null)} className="hover:bg-red-600 p-3 rounded-2xl transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-10 space-y-8">
                             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center shadow-inner"><p className="text-4xl font-black text-slate-900 tracking-tighter">S/ {regularizingItem.totalAmount.toFixed(2)}</p><p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{regularizingItem.supplierName}</p></div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase ml-2">Seleccione Factura PDF del Proveedor</label>
                                <label className={`flex flex-col items-center justify-center p-12 border-4 border-dashed rounded-[2rem] cursor-pointer transition-all ${uploadingPdf ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-blue-400 shadow-sm'}`}>
                                    {uploadingPdf ? <span className="text-sm font-black text-emerald-900 uppercase font-mono">{uploadingPdf}</span> : <Upload className="w-12 h-12 text-slate-300" />}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] || null;
                                            setUploadingPdf(f ? f.name : null);
                                            setUploadFileObj(f);
                                        }}
                                    />
                                </label>
                            </div>
                             <button onClick={handleRegularize} disabled={!uploadingPdf} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-2xl hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"><CheckCircle className="w-6 h-6 text-emerald-400"/> Finalizar Ingreso Stock</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
