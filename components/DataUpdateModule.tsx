import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, Edit3, CheckCircle, PackageSearch, Users, Truck, ShoppingCart, X } from 'lucide-react';
import { BackendService } from '../services/backendService';
import { DataService } from '../services/dataService';
import { Product, PurchaseEntry, Supplier, Intermediary, Employee } from '../types';

export const DataUpdateModule: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'ruc10' | 'ruc20' | 'entities'>('products');
    
    // Modal states
    const [selectedItem, setSelectedItem] = useState<{ type: string, id: string, name: string, missing: string[] } | null>(null);

    // Data states
    const [products, setProducts] = useState<Product[]>([]);
    const [purchases10, setPurchases10] = useState<PurchaseEntry[]>([]);
    const [purchases20, setPurchases20] = useState<PurchaseEntry[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [prods, p10, p20, supps, inters, emps] = await Promise.all([
                BackendService.getProducts(),
                BackendService.getPurchases({ type: 'RUC10', limit: 1000 }),
                BackendService.getPurchases({ type: 'RUC20', limit: 1000 }),
                BackendService.getSuppliers(),
                BackendService.getIntermediaries(),
                BackendService.getEmployees()
            ]);
            setProducts(prods);
            
            // Map RUC 10 purchases
            const mapped10: PurchaseEntry[] = p10.map((p: any) => ({
                id: String(p.id), date: p.date, providerName: p.provider_name || 'Desconocido', 
                productBrand: p.product_brand || '-', productModel: p.product_model || '-', 
                productSerial: p.product_serial || '-', priceAgreed: p.base_amount || 0, 
                costNotary: (p.total_amount || 0) - (p.base_amount || 0), status: p.status, 
                bankOrigin: p.bank_name || '-', bankAccount: p.bank_account || '', 
                operationDate: p.date, intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined, 
                pdfUrl: p.pdf_url, voucherUrl: p.voucher_url, contractUrl: p.contract_url, 
                djUrl: p.dj_url, blockNumber: p.block_number, 
                sellerDocNumber: p.seller_doc_number, sellerPhone: p.seller_phone
            }));
            setPurchases10(mapped10);

            // Map RUC 20 purchases
            const mapped20: PurchaseEntry[] = p20.map((p: any) => ({
                id: String(p.id), date: p.date, providerName: p.supplier?.name || 'Proveedor RUC 20',
                status: p.status, pdfUrl: p.pdf_url, documentNumber: p.document_number
            }));
            setPurchases20(mapped20);

            setSuppliers(supps);
            setIntermediaries(inters);
            setEmployees(emps);

        } catch (error) {
            console.error("Error loading data for audit", error);
            // Fallback
            setProducts(DataService.getProducts());
            setSuppliers(DataService.getSuppliers());
            setIntermediaries(DataService.getIntermediaries());
            setEmployees(DataService.getEmployees());
        } finally {
            setIsLoading(false);
        }
    };

    // ----------------------------------------------------
    // AUDIT LOGIC (Check for missing data)
    // ----------------------------------------------------

    const getIncompleteProducts = () => {
        return products.filter(p => 
            !p.category || p.category === '' ||
            !p.brand || p.brand === '' ||
            !p.model || p.model === '' ||
            !p.serialNumber || p.serialNumber === '' ||
            (p.purchasePrice === undefined || p.purchasePrice <= 0)
        );
    };

    const getIncompleteRuc10 = () => {
        return purchases10.filter(p => 
            !p.providerName || p.providerName === 'Desconocido' || p.providerName === '' ||
            !p.sellerDocNumber || p.sellerDocNumber === '' ||
            !p.productSerial || p.productSerial === '-' || p.productSerial === '' ||
            !p.bankOrigin || p.bankOrigin === '-' || p.bankOrigin === ''
        );
    };

    const getIncompleteRuc20 = () => {
        return purchases20.filter(p => 
            !p.documentNumber || p.documentNumber === '' ||
            !p.pdfUrl || p.pdfUrl === ''
        );
    };

    const getIncompleteEntities = () => {
        const incSuppliers = suppliers.filter(s => !s.ruc || s.ruc === '' || !s.razonSocial || s.razonSocial === '' || !s.address || s.address === '').map(s => ({ type: 'Proveedor', name: s.razonSocial || 'Sin Nombre', id: s.id, missing: (!s.ruc || s.ruc === '' ? 'RUC, ' : '') + (!s.address || s.address === '' ? 'Dirección' : '') }));
        const incInters = intermediaries.filter(i => !i.docNumber || i.docNumber === '' || !i.fullName || i.fullName === '' || !i.phone || i.phone === '').map(i => ({ type: 'Intermediario', name: i.fullName || 'Sin Nombre', id: i.id, missing: (!i.docNumber || i.docNumber === '' ? 'DNI, ' : '') + (!i.phone || i.phone === '' ? 'Teléfono' : '') }));
        const incEmps = employees.filter(e => !e.docNumber || e.docNumber === '' || !e.fullName || e.fullName === '' || !e.phone || e.phone === '').map(e => ({ type: 'Colaborador', name: e.fullName || 'Sin Nombre', id: e.id, missing: (!e.docNumber || e.docNumber === '' ? 'DNI, ' : '') + (!e.phone || e.phone === '' ? 'Teléfono' : '') }));
        
        return [...incSuppliers, ...incInters, ...incEmps].filter(e => e.missing !== '');
    };

    const incompleteProducts = getIncompleteProducts();
    const incompleteRuc10 = getIncompleteRuc10();
    const incompleteRuc20 = getIncompleteRuc20();
    const incompleteEntities = getIncompleteEntities();

    const totalIssues = incompleteProducts.length + incompleteRuc10.length + incompleteRuc20.length + incompleteEntities.length;

    // ----------------------------------------------------
    // RENDER HELPERS
    // ----------------------------------------------------

    const renderEmptyState = (message: string) => (
        <div className="p-12 text-center bg-emerald-50/50 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-8 h-8" /></div>
            <h4 className="text-emerald-800 font-black uppercase tracking-widest text-sm mb-1">Todo en Orden</h4>
            <p className="text-emerald-600 text-xs font-medium">{message}</p>
        </div>
    );

    const CellWarning = ({ val, fallback = 'FALTA DATO' }: { val: any, fallback?: string }) => {
        const isMissing = !val || val === '-' || val === 'Desconocido' || val === 0;
        return isMissing ? (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {fallback}
            </span>
        ) : (
            <span className="text-slate-700 font-medium">{val}</span>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <Database className="w-8 h-8 text-emerald-400" /> Auditoría de Datos
                        </h2>
                        <p className="text-slate-400 text-sm font-medium max-w-xl">
                            Revisa y actualiza los registros que tienen información incompleta o nula en la base de datos para mantener la integridad del sistema.
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shrink-0">
                        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Alertas Detectadas</p>
                            <p className="text-2xl font-black text-white">{isLoading ? '...' : totalIssues}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                    <PackageSearch className="w-4 h-4" /> Inventario {incompleteProducts.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">{incompleteProducts.length}</span>}
                </button>
                <button onClick={() => setActiveTab('ruc10')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all whitespace-nowrap ${activeTab === 'ruc10' ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                    <ShoppingCart className="w-4 h-4" /> Compras RUC 10 {incompleteRuc10.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">{incompleteRuc10.length}</span>}
                </button>
                <button onClick={() => setActiveTab('ruc20')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all whitespace-nowrap ${activeTab === 'ruc20' ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                    <Truck className="w-4 h-4" /> Compras RUC 20 {incompleteRuc20.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">{incompleteRuc20.length}</span>}
                </button>
                <button onClick={() => setActiveTab('entities')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all whitespace-nowrap ${activeTab === 'entities' ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                    <Users className="w-4 h-4" /> Entidades {incompleteEntities.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">{incompleteEntities.length}</span>}
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Escaneando base de datos...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                {activeTab === 'products' && <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Categoría</th><th className="px-6 py-4">Marca / Modelo</th><th className="px-6 py-4">N/S o IMEI</th><th className="px-6 py-4">Costo Base</th><th className="px-6 py-4 text-center">Acción</th></tr>}
                                {activeTab === 'ruc10' && <tr><th className="px-6 py-4">ID / Fecha</th><th className="px-6 py-4">Cliente / Vendedor</th><th className="px-6 py-4">DNI Vendedor</th><th className="px-6 py-4">Equipo Adquirido</th><th className="px-6 py-4">Banco</th><th className="px-6 py-4 text-center">Acción</th></tr>}
                                {activeTab === 'ruc20' && <tr><th className="px-6 py-4">ID / Fecha</th><th className="px-6 py-4">Proveedor</th><th className="px-6 py-4">Documento / Factura</th><th className="px-6 py-4">Sustento (PDF)</th><th className="px-6 py-4 text-center">Acción</th></tr>}
                                {activeTab === 'entities' && <tr><th className="px-6 py-4">Tipo</th><th className="px-6 py-4">Nombre / Razón Social</th><th className="px-6 py-4">Datos Faltantes (Resumen)</th><th className="px-6 py-4 text-center">Acción</th></tr>}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === 'products' && (
                                    incompleteProducts.length === 0 ? <tr><td colSpan={6}>{renderEmptyState('Todos los productos tienen sus datos completos.')}</td></tr> : 
                                    incompleteProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#{p.id}</td>
                                            <td className="px-6 py-4"><CellWarning val={p.category} fallback="SIN CATEGORÍA" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <CellWarning val={p.brand} fallback="SIN MARCA" />
                                                    <CellWarning val={p.model} fallback="SIN MODELO" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><CellWarning val={p.serialNumber} fallback="SIN SERIE" /></td>
                                            <td className="px-6 py-4"><CellWarning val={p.purchasePrice} fallback="SIN PRECIO" /></td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-colors" 
                                                    onClick={() => setSelectedItem({ 
                                                        type: 'Producto', 
                                                        id: p.id, 
                                                        name: `${p.brand || 'Sin Marca'} ${p.model || ''}`,
                                                        missing: [
                                                            !p.category && 'Categoría',
                                                            !p.brand && 'Marca',
                                                            !p.model && 'Modelo',
                                                            !p.serialNumber && 'Número de Serie',
                                                            (!p.purchasePrice || p.purchasePrice <= 0) && 'Costo Base'
                                                        ].filter(Boolean) as string[]
                                                    })}
                                                >
                                                    <Edit3 className="w-3 h-3" /> Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {activeTab === 'ruc10' && (
                                    incompleteRuc10.length === 0 ? <tr><td colSpan={6}>{renderEmptyState('Todos los registros RUC 10 están completos.')}</td></tr> : 
                                    incompleteRuc10.map(p => (
                                        <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-slate-400">#{p.id}</div>
                                                <div className="text-[10px] font-bold text-slate-500 mt-1">{p.date ? new Date(p.date).toLocaleDateString() : '-'}</div>
                                            </td>
                                            <td className="px-6 py-4"><CellWarning val={p.providerName} fallback="SIN CLIENTE" /></td>
                                            <td className="px-6 py-4"><CellWarning val={p.sellerDocNumber} fallback="SIN DNI" /></td>
                                            <td className="px-6 py-4"><CellWarning val={p.productSerial} fallback="SIN EQUIPO/SERIE" /></td>
                                            <td className="px-6 py-4"><CellWarning val={p.bankOrigin} fallback="SIN BANCO" /></td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-colors" 
                                                    onClick={() => setSelectedItem({
                                                        type: 'Compra RUC 10',
                                                        id: p.id,
                                                        name: `Operación: ${p.id}`,
                                                        missing: [
                                                            (!p.providerName || p.providerName === 'Desconocido') && 'Nombre de Cliente/Vendedor',
                                                            !p.sellerDocNumber && 'DNI del Vendedor',
                                                            (!p.productSerial || p.productSerial === '-') && 'Número de Serie del Equipo',
                                                            (!p.bankOrigin || p.bankOrigin === '-') && 'Entidad Bancaria / Banco'
                                                        ].filter(Boolean) as string[]
                                                    })}
                                                >
                                                    <Edit3 className="w-3 h-3" /> Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {activeTab === 'ruc20' && (
                                    incompleteRuc20.length === 0 ? <tr><td colSpan={5}>{renderEmptyState('Todos los registros RUC 20 están sustentados y completos.')}</td></tr> : 
                                    incompleteRuc20.map(p => (
                                        <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-slate-400">#{p.id}</div>
                                                <div className="text-[10px] font-bold text-slate-500 mt-1">{p.date ? new Date(p.date).toLocaleDateString() : '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{p.providerName}</td>
                                            <td className="px-6 py-4"><CellWarning val={p.documentNumber} fallback="SIN NRO FACTURA" /></td>
                                            <td className="px-6 py-4"><CellWarning val={p.pdfUrl ? 'Cargado' : null} fallback="SIN SUSTENTO PDF" /></td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-colors" 
                                                    onClick={() => setSelectedItem({
                                                        type: 'Compra RUC 20',
                                                        id: p.id,
                                                        name: `Operación: ${p.id}`,
                                                        missing: [
                                                            !p.documentNumber && 'Número de Documento / Factura',
                                                            !p.pdfUrl && 'Sustento PDF (Archivo)'
                                                        ].filter(Boolean) as string[]
                                                    })}
                                                >
                                                    <Edit3 className="w-3 h-3" /> Regularizar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {activeTab === 'entities' && (
                                    incompleteEntities.length === 0 ? <tr><td colSpan={4}>{renderEmptyState('Todas las entidades, proveedores y colaboradores están en orden.')}</td></tr> : 
                                    incompleteEntities.map((ent, idx) => (
                                        <tr key={`ent-${idx}`} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{ent.type}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{ent.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                    <AlertTriangle className="w-3 h-3" /> Faltan: {ent.missing.replace(/,\s*$/, "")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-colors" 
                                                    onClick={() => setSelectedItem({
                                                        type: ent.type,
                                                        id: ent.id,
                                                        name: ent.name,
                                                        missing: ent.missing.split(',').map(m => m.trim()).filter(Boolean)
                                                    })}
                                                >
                                                    <Edit3 className="w-3 h-3" /> Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE EDICIÓN RÁPIDA */}
            {selectedItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <div>
                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">{selectedItem.type}</p>
                                <h3 className="font-bold text-lg leading-tight truncate pr-4">{selectedItem.name}</h3>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Campos Requeridos:</p>
                            <ul className="space-y-3">
                                {selectedItem.missing.map((m, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                        {m}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-6">
                            <p className="text-xs text-slate-500 mb-6 text-center">Para corregir estos datos, por favor dirígete al módulo correspondiente y actualiza la información.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedItem(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200 transition-colors">
                                    Cerrar
                                </button>
                                <button onClick={() => {
                                    // Helper para redirigir (en una versión futura se podría usar react-router)
                                    setSelectedItem(null);
                                }} className="flex-1 py-4 bg-emerald-500 text-slate-900 rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-emerald-400 transition-colors">
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};