
import React, { useState, useEffect } from 'react';
import { Product, ProductStatus, Intermediary, Transaction } from '../types';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { ArrowRight, Calculator, RefreshCw, Upload, FileText, CheckCircle, Package, Building2, Search, Calendar, History, Camera, X, Printer, ShieldCheck, UserCheck } from 'lucide-react';

export const InventoryTransferModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ruc10' | 'ruc20' | 'history'>('ruc10');
    const [products, setProducts] = useState<Product[]>(DataService.getProducts());
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [transferCalc, setTransferCalc] = useState({ base: 0, igv: 0, total: 0 });
    const [supplierBySerial, setSupplierBySerial] = useState<Record<string, string>>({});
    const [transfersHistory, setTransfersHistory] = useState<Transaction[]>([]);
    const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([]);
    
    const [docType, setDocType] = useState<'FACTURA' | 'BOLETA'>('FACTURA');
    const [docSeries, setDocSeries] = useState('F001');
    const [docCorrelative, setDocCorrelative] = useState('');
    const [operationCode, setOperationCode] = useState('');
    const [selectedIntermediaryId, setSelectedIntermediaryId] = useState('');
    const [voucherFile, setVoucherFile] = useState<string | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<string | null>(null);
    const [invoiceObj, setInvoiceObj] = useState<File | null>(null);
    const [txImageFile, setTxImageFile] = useState<string | null>(null);
    const [txImageObj, setTxImageObj] = useState<File | null>(null);
    const [showVoucherModal, setShowVoucherModal] = useState<{ isOpen: boolean, product: Product | null }>({
        isOpen: false, product: null
    });

    const config = DataService.getConfig();
    // IGV efectivo basado en exoneración
    const effectiveIgvRate = config.isIgvExempt ? 0 : config.igvRate;

    useEffect(() => {
        setIntermediaries(DataService.getIntermediaries());
        (async () => {
            try {
                const inters = await BackendService.getIntermediaries();
                const mapped: Intermediary[] = inters.map((i: any) => ({
                    id: String(i.id),
                    fullName: i.name,
                    docNumber: i.doc_number,
                    rucNumber: i.ruc_number || '',
                    phone: i.phone || '',
                    email: i.email || '',
                    address: i.address || ''
                }));
                setIntermediaries(mapped);
            } catch {
                setIntermediaries(DataService.getIntermediaries());
            }
            try {
                const items = await BackendService.getProducts();
                setProducts(items);
            } catch {
                setProducts(DataService.getProducts());
            }
            try {
                const [transfers, purchases] = await Promise.all([
                    BackendService.getTransactions('transfer'),
                    BackendService.getTransactions('purchase'),
                ]);
                const all = [...transfers, ...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTransfersHistory(transfers);
                setHistoryTransactions(all);
            } catch {
                setTransfersHistory([]);
                setHistoryTransactions([]);
            }
            try {
                const r20 = await BackendService.getPurchases({ type: 'RUC20', limit: 500 });
                const map: Record<string, string> = {};
                (r20 || []).forEach((p: any) => {
                    const supplierName = p.provider_name || '';
                    (p.items || []).forEach((it: any) => {
                        if (it.serial) map[String(it.serial)] = supplierName;
                    });
                });
                setSupplierBySerial(map);
            } catch {
                setSupplierBySerial({});
            }
        })();
    }, []);

    const ruc10Products = products.filter(p => p.status === ProductStatus.IN_STOCK_RUC10);
    const ruc20Products = products.filter(p => p.status === ProductStatus.TRANSFERRED_RUC20);

    const handleSelectProduct = (product: Product) => {
        try {
            setSelectedProduct(product);
            setSelectedIntermediaryId(product.intermediaryId || '');
            if(product.status === ProductStatus.IN_STOCK_RUC10) {
                const totalCost = Number(product.totalCost || 0);
                const mType = config.ruc10MarginType === 'FIXED' ? 'FIXED' : 'PERCENT';
                const marginVal = Number(config.ruc10Margin || 0);
                const profit = mType === 'PERCENT' ? (totalCost * marginVal) : marginVal;
                const renta = Number(config.rentaRate || 0);
                const divisor = 1 - (isFinite(renta) ? renta : 0);
                const safeDivisor = divisor > 0.0001 ? divisor : 1;
                const rawBase = (totalCost + profit) / safeDivisor;
                const base = Number.isFinite(rawBase) ? rawBase : (totalCost + profit);
                const igv = base * effectiveIgvRate;
                const total = base + igv;
                setTransferCalc({ base, igv, total });
                setDocCorrelative(Math.floor(Math.random() * 1000000).toString().padStart(6, '0'));
                setVoucherFile(null);
            }
        } catch (e) {
            setTransferCalc({ base: 0, igv: 0, total: 0 });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVoucherFile(e.target.files[0].name);
        }
    };
    const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setInvoiceFile(f ? f.name : null);
        setInvoiceObj(f);
    };
    const handleTxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setTxImageFile(f ? f.name : null);
        setTxImageObj(f);
    };

    const handleTransfer = async () => {
        if (!selectedProduct) return;
        if (!selectedIntermediaryId) return alert("Seleccione el Emisor RUC 10.");
        if (!voucherFile) return alert("Suba el Voucher de Pago.");

        const docNumber = `${docSeries}-${docCorrelative}`;
        try {
            await BackendService.updateProduct(selectedProduct.id, {
                status: ProductStatus.TRANSFERRED_RUC20,
                intermediaryId: selectedIntermediaryId,
                totalCost: selectedProduct.totalCost,
            });
            const emitter = intermediaries.find(i => i.id === selectedIntermediaryId);
            const tTransfer = await BackendService.createTransaction({
                trx_type: 'transfer',
                document_type: docType,
                document_number: docNumber,
                entity_name: emitter?.fullName || '',
                entity_doc_number: emitter?.docNumber || '',
                base_amount: transferCalc.base,
                igv_amount: transferCalc.igv,
                total_amount: transferCalc.total,
                items: [{
                    product_id: selectedProduct.id,
                    product_name: `${selectedProduct.category?.toUpperCase() || 'EQUIPO'} - ${selectedProduct.brand} ${selectedProduct.model} (S/N: ${selectedProduct.serialNumber})`,
                    quantity: 1,
                    unit_price_base: transferCalc.base,
                    total_base: transferCalc.base,
                }],
            });
            const tPurchase = await BackendService.createTransaction({
                trx_type: 'purchase',
                document_type: docType,
                document_number: docNumber,
                entity_name: emitter?.fullName || '',
                entity_doc_number: emitter?.docNumber || '',
                base_amount: transferCalc.base,
                igv_amount: transferCalc.igv,
                total_amount: transferCalc.total,
                items: [{
                    product_id: selectedProduct.id,
                    product_name: `${selectedProduct.category?.toUpperCase() || 'EQUIPO'} - ${selectedProduct.brand} ${selectedProduct.model} (S/N: ${selectedProduct.serialNumber})`,
                    quantity: 1,
                    unit_price_base: transferCalc.base,
                    total_base: transferCalc.base,
                }],
            });
            if (invoiceObj) await BackendService.uploadTransactionFile(String(tPurchase.id), invoiceObj, 'invoice');
            if (txImageObj) await BackendService.uploadTransactionFile(String(tTransfer.id), txImageObj, 'voucher');
            alert(`Transferencia Exitosa.`);
            setSelectedProduct(null);
            const [items, transfers] = await Promise.all([
                BackendService.getProducts(),
                BackendService.getTransactions('transfer')
            ]);
            setProducts(items);
            setTransfersHistory(transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setActiveTab('history');
        } catch {
            const success = DataService.transferProductToCompany(selectedProduct.id, {
                docNumber: docNumber,
                voucherUrl: voucherFile,
                base: transferCalc.base,
                igv: transferCalc.igv,
                total: transferCalc.total,
                intermediaryId: selectedIntermediaryId
            });
            if (success) {
                alert(`Transferencia Exitosa (local).`);
                setSelectedProduct(null);
                setProducts(DataService.getProducts());
                setActiveTab('history');
            }
        }
    };

    const getIntermediaryName = (id?: string) => {
        return intermediaries.find(i => i.id === id)?.fullName || 'N/A';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-1 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Gestión de Stock</h2>
                    <p className="text-sm text-slate-600 font-bold">Control de almacenes y transferencias corporativas.</p>
                </div>
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('ruc10'); setSelectedProduct(null); }}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'ruc10' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Package className="w-4 h-4" /> Almacén RUC 10
                    </button>
                    <button
                        onClick={() => { setActiveTab('ruc20'); setSelectedProduct(null); }}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'ruc20' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" /> Almacén RUC 20
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setSelectedProduct(null); }}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <History className="w-4 h-4" /> Historial
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input type="text" placeholder="Buscar por serie, modelo o marca..." className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-500 bg-white text-slate-900" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] text-slate-700 uppercase bg-slate-50 font-black tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">{activeTab === 'ruc20' ? 'Proveedor / Serie' : 'Propietario / Serie'}</th>
                                        <th className="px-6 py-4">Descripción Equipo</th>
                                        <th className="px-6 py-4 text-right">Valorización</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        {activeTab === 'history' && <th className="px-6 py-4 text-center">Sustentos</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(activeTab === 'ruc10' ? ruc10Products : activeTab === 'ruc20' ? ruc20Products : historyTransactions).length === 0 ? (
                                        <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-bold uppercase italic tracking-widest">Sin registros disponibles.</td></tr>
                                    ) : (
                                        (activeTab === 'ruc10' ? ruc10Products : activeTab === 'ruc20' ? ruc20Products : historyTransactions).map(row => {
                                            if (activeTab === 'history') {
                                                return (
                                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-mono text-[10px] font-black text-slate-500 uppercase">{row.documentNumber}</div>
                                                            <div className="text-[10px] font-black text-slate-400">{new Date(row.date).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-slate-800 uppercase">{row.items[0]?.productName || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">S/ {row.totalAmount.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border-2 ${row.trxType==='transfer' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                                                                {row.trxType==='transfer' ? 'Transferido' : 'Compra'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                {row.trxType !== 'transfer' && <a href={BackendService.resolveUrl(`/transactions/${row.id}/download/invoice`)} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black">Ver Factura</a>}
                                                                {row.trxType === 'transfer' && <a href={BackendService.resolveUrl(`/transactions/${row.id}/download/voucher`)} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-[10px] font-black">Ver Transacción</a>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            } else {
                                                const product = row as Product;
                                                return (
                                                    <tr 
                                                        key={product.id} 
                                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedProduct?.id === product.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`} 
                                                        onClick={() => handleSelectProduct(product)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <UserCheck className="w-3 h-3 text-blue-600" />
                                                                <span className="font-black text-slate-900 uppercase text-xs">
                                                                    {activeTab === 'ruc20'
                                                                        ? (supplierBySerial[product.serialNumber || ''] || getIntermediaryName(product.intermediaryId) || 'EMPRESA')
                                                                        : getIntermediaryName(product.intermediaryId)}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] font-black text-slate-500 font-mono mt-1 uppercase">S/N: {product.serialNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-slate-800 uppercase">{product.brand} {product.model}</div>
                                                            <div className="text-[10px] text-slate-600 font-bold italic">{product.specs}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                                            S/ {(activeTab === 'ruc10' ? product.totalCost : product.transferTotal)?.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border-2 ${activeTab === 'ruc10' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : activeTab === 'ruc20' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                                                {activeTab === 'ruc10' ? 'Stock Persona' : activeTab === 'ruc20' ? 'Stock Empresa' : 'Transferido'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="sticky top-24 h-fit">
                    {activeTab === 'ruc10' && (
                        <div className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 ${selectedProduct ? 'border-blue-600 opacity-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 shadow-inner">
                                        <Calculator className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight leading-none">Venta Interna</h3>
                                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Facturar RUC 10 a RUC 20</p>
                                    </div>
                                </div>

                                {selectedProduct ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-black text-slate-700 uppercase flex items-center gap-1">
                                                <UserCheck className="w-3 h-3 text-blue-600"/> Emisor RUC 10
                                            </label>
                                            <select 
                                                value={selectedIntermediaryId}
                                                onChange={e => setSelectedIntermediaryId(e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm bg-white text-slate-900 font-black uppercase focus:border-blue-600 outline-none"
                                            >
                                                {intermediaries.map(i => (
                                                    <option key={i.id} value={i.id}>{i.fullName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-2xl space-y-3 border-2 border-slate-100 shadow-inner">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                                                <span>Costo RUC 10</span>
                                                <span className="font-black">S/ {selectedProduct.totalCost?.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase border-t pt-2">
                                                <span>Base Imponible</span>
                                                <span className="text-slate-900 font-black">S/ {transferCalc.base.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-emerald-800 uppercase">
                                                <span>IGV Crédito ({effectiveIgvRate * 100}%)</span>
                                                <span className={`font-black ${config.isIgvExempt ? 'text-emerald-600' : ''}`}>{config.isIgvExempt ? 'EXONERADO' : 'S/ ' + transferCalc.igv.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-blue-700 p-4 rounded-xl flex justify-between items-center text-white shadow-lg mt-2">
                                                <span className="font-black text-[10px] uppercase">Total Factura</span>
                                                <span className="font-black text-2xl tracking-tighter">S/ {transferCalc.total.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex gap-2">
                                                <input value={docSeries} onChange={e => setDocSeries(e.target.value.toUpperCase())} className="w-1/3 border-2 border-gray-200 rounded-xl p-3 text-sm text-center bg-white text-slate-900 font-black uppercase" placeholder="Serie" />
                                                <input value={docCorrelative} onChange={e => setDocCorrelative(e.target.value)} className="w-2/3 border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-slate-900 font-black" placeholder="Correlativo" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => { setDocType('BOLETA'); setDocSeries('B001'); }} className={`w-1/2 p-3 rounded-xl text-xs font-black uppercase ${docType==='BOLETA'?'bg-white border-2 border-blue-600':'bg-slate-50 border-2 border-slate-200'}`}>Boleta</button>
                                                <button type="button" onClick={() => { setDocType('FACTURA'); setDocSeries('F001'); }} className={`w-1/2 p-3 rounded-xl text-xs font-black uppercase ${docType==='FACTURA'?'bg-white border-2 border-purple-600':'bg-slate-50 border-2 border-slate-200'}`}>Factura</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input value={operationCode} onChange={e => setOperationCode(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-slate-900 font-black" placeholder="Código de Transacción (Operación Bancaria)" />
                                            </div>
                                            
                                            <label className={`block border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${voucherFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 bg-white shadow-sm'}`}>
                                                {voucherFile ? (
                                                    <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-[10px]">
                                                        <CheckCircle className="w-8 h-8 mb-2 text-emerald-600" />
                                                        <span className="truncate w-full">{voucherFile}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                        <Upload className="w-8 h-8 mb-2 text-blue-600" />
                                                        <span>Adjuntar Voucher Bancario</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                                            </label>
                                            <label className={`block border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${invoiceFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-purple-500 bg-white shadow-sm'}`}>
                                                {invoiceFile ? (
                                                    <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-[10px]">
                                                        <CheckCircle className="w-8 h-8 mb-2 text-emerald-600" />
                                                        <span className="truncate w-full">{invoiceFile}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                        <Upload className="w-8 h-8 mb-2 text-purple-600" />
                                                        <span>Adjuntar Factura PDF</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" onChange={handleInvoiceUpload} accept="application/pdf,image/*" />
                                            </label>
                                            <label className={`block border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${txImageFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 bg-white shadow-sm'}`}>
                                                {txImageFile ? (
                                                    <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-[10px]">
                                                        <CheckCircle className="w-8 h-8 mb-2 text-emerald-600" />
                                                        <span className="truncate w-full">{txImageFile}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                        <Upload className="w-8 h-8 mb-2 text-blue-600" />
                                                        <span>Adjuntar Imagen de Transacción</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" onChange={handleTxImageUpload} accept="image/*,application/pdf" />
                                            </label>
                                        </div>

                                        <button onClick={handleTransfer} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-xs">
                                            <RefreshCw className="w-5 h-5 inline mr-2" /> Procesar Transferencia
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <Package className="w-16 h-16 text-slate-200" />
                                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-6">Seleccione un equipo de la lista para calcular la transferencia corporativa.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
