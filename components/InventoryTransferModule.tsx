
import React, { useState, useEffect } from 'react';
import { Product, ProductStatus, Intermediary, Transaction, ReceiptType } from '../types';
import { BackendService } from '../services/backendService';
import { ArrowRight, Calculator, RefreshCw, Upload, FileText, CheckCircle, Package, Building2, Search, Calendar, History, Camera, X, Printer, ShieldCheck, UserCheck, FileCheck, Trash2 } from 'lucide-react';

export const InventoryTransferModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ruc10' | 'ruc20' | 'history'>('ruc10');
    const [historySubTab, setHistorySubTab] = useState<'transactions' | 'purchases'>('transactions');
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [transferCalc, setTransferCalc] = useState({ base: 0, igv: 0, total: 0 });
    const [config, setConfig] = useState<any>(null);
    
    const [docSeries, setDocSeries] = useState('F001');
    const [docCorrelative, setDocCorrelative] = useState('');
    const [selectedIntermediaryId, setSelectedIntermediaryId] = useState('');
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // IGV efectivo basado en exoneración
    const effectiveIgvRate = config?.isIgvExempt ? 0 : (config?.igvRate || 0.18);

    const getNextCorrelative = (trxs: Transaction[], series: string) => {
        const transferTrxs = trxs.filter(t => t.trxType === 'transfer' && t.documentNumber?.startsWith(series));
        if (transferTrxs.length === 0) return '1';

        const numbers = transferTrxs.map(t => {
            const parts = t.documentNumber.split('-');
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart.replace(/\s/g, ''));
            return isNaN(num) ? 0 : num;
        });

        const max = Math.max(...numbers, 0);
        return (max + 1).toString();
    };

    const loadData = async () => {
        try {
            const [prods, inters, trxs, purchs, cfg] = await Promise.all([
                BackendService.getProducts(),
                BackendService.getIntermediaries(),
                BackendService.getTransactions(),
                BackendService.getPurchases(),
                BackendService.getConfig()
            ]);
            setProducts(prods);
            setIntermediaries(inters);
            setTransactions(trxs);
            setPurchases(purchs);
            setConfig(cfg);
        } catch (error) {
            console.error("Error loading data", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (transactions.length > 0) {
            setDocCorrelative(getNextCorrelative(transactions, docSeries));
        }
    }, [docSeries, transactions]);

    const ruc10Products = products.filter(p => 
        p.status === ProductStatus.IN_STOCK_RUC10 && 
        (p.brand?.toUpperCase().includes(searchTerm) || 
         p.model?.toUpperCase().includes(searchTerm) || 
         p.serialNumber?.toUpperCase().includes(searchTerm))
    );
    const ruc20Products = products.filter(p => 
        p.status === ProductStatus.TRANSFERRED_RUC20 && 
        (p.brand?.toUpperCase().includes(searchTerm) || 
         p.model?.toUpperCase().includes(searchTerm) || 
         p.serialNumber?.toUpperCase().includes(searchTerm))
    );

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSelectedIntermediaryId(product.intermediaryId || '');
        
        if(product.status === ProductStatus.IN_STOCK_RUC10 && config) {
            const totalCost = product.totalCost || 0;
            let profit = config.ruc10MarginType === 'PERCENT' ? (totalCost * config.ruc10Margin) : config.ruc10Margin;
            const divisor = 1 - (config.rentaRate || 0);
            
            // Base imponible de la transferencia
            const base = (totalCost + profit) / divisor;
            // IGV respetando exoneración
            const igv = base * effectiveIgvRate;
            const total = base + igv;
            
            setTransferCalc({ base, igv, total });
            setDocCorrelative(getNextCorrelative(transactions, docSeries));
            setVoucherFile(null);
            setInvoiceFile(null); // Reset invoice
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVoucherFile(file);
            setVoucherPreview(URL.createObjectURL(file));
        }
    };

    const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setInvoiceFile(file);
        }
    };

    const handleDeleteProduct = async (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Estás seguro de eliminar el producto ${product.brand} ${product.model}?`)) {
            try {
                await BackendService.deleteProduct(product.id);
                loadData();
            } catch (error) {
                console.error("Error deleting product", error);
                alert("Error al eliminar el producto");
            }
        }
    };

    const handleTransfer = async () => {
        if (!selectedProduct) return;
        if (!selectedIntermediaryId) return alert("Seleccione el Emisor RUC 10.");
        if (!voucherFile) return alert("Suba el Voucher de Pago.");
        if (!invoiceFile) return alert("Suba la Factura de Venta.");

        setIsSubmitting(true);
        const docNumber = `${docSeries} - ${docCorrelative}`;
        
        try {
            const trx = await BackendService.createTransaction({
                trxType: 'transfer',
                documentType: ReceiptType.FACTURA,
                documentNumber: docNumber,
                entityName: getIntermediaryName(selectedIntermediaryId),
                entityDocNumber: selectedIntermediaryId,
                baseAmount: transferCalc.base,
                igvAmount: transferCalc.igv,
                totalAmount: transferCalc.total,
                items: [{
                    productId: selectedProduct.id,
                    productName: selectedProduct.model || 'Producto',
                    quantity: 1,
                    unitPriceBase: transferCalc.base,
                    totalBase: transferCalc.base
                }]
            });
            
            const uploadPromises = [];
            if (voucherFile && trx.id) {
                console.log("Queueing voucher upload...");
                uploadPromises.push(BackendService.uploadTransactionFile(String(trx.id), voucherFile, 'voucher'));
            }
            if (invoiceFile && trx.id) {
                console.log("Queueing invoice upload...");
                uploadPromises.push(BackendService.uploadTransactionFile(String(trx.id), invoiceFile, 'invoice'));
            }
            
            if (uploadPromises.length > 0) {
                await Promise.all(uploadPromises);
                console.log("All uploads completed.");
            }
            
            await BackendService.updateProduct(selectedProduct.id, {
                status: ProductStatus.TRANSFERRED_RUC20,
                intermediaryId: selectedIntermediaryId,
                transferBase: transferCalc.base,
                transferIgv: transferCalc.igv,
                transferTotal: transferCalc.total,
                transferDocType: ReceiptType.FACTURA,
                transferDocNumber: docNumber,
                transferDate: new Date().toISOString()
            });

            alert(`Transferencia Exitosa.`);
            setSelectedProduct(null);
            setVoucherFile(null);
            setVoucherPreview(null);
            setInvoiceFile(null);
            loadData();
            setActiveTab('history');
            
        } catch (error) {
            console.error(error);
            alert("Error al procesar transferencia.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('¿Seguro que desea eliminar esta transferencia?')) return;
        try {
            await BackendService.deleteTransaction(id);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar');
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
                        <input 
                            type="text" 
                            placeholder="Buscar por serie, modelo o marca..." 
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-500 bg-white text-slate-900" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {activeTab === 'history' ? (
                            <div className="p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 font-black tracking-widest border-b">
                                            <tr>
                                                <th className="px-6 py-3">Fecha / Documento</th>
                                                <th className="px-6 py-3">Entidad / Proveedor</th>
                                                <th className="px-6 py-3">Detalle</th>
                                                <th className="px-6 py-3 text-right">Monto</th>
                                                <th className="px-6 py-3 text-center">Documentos</th>
                                                <th className="px-6 py-3 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {transactions.filter(t => t.trxType === 'transfer').length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold uppercase italic">Sin transferencias registradas.</td></tr>
                                            ) : (
                                                transactions.filter(t => t.trxType === 'transfer').map(t => (
                                                    <tr key={t.id} className="hover:bg-slate-50">
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-slate-800">{new Date(t.date).toLocaleDateString()}</div>
                                                            <div className="text-[10px] text-slate-500">{t.documentType} {t.documentNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.entityName}</td>
                                                        <td className="px-6 py-4 text-[10px] uppercase text-slate-500">{t.items?.[0]?.productName || 'Item'}</td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">S/ {t.totalAmount.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                {t.voucherUrl ? (
                                                                    <a href={t.voucherUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Ver Voucher">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </a>
                                                                ) : <span className="p-2 text-slate-300"><CheckCircle className="w-4 h-4"/></span>}
                                                                {t.pdfUrl ? (
                                                                    <a href={t.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Ver Factura">
                                                                        <FileText className="w-4 h-4" />
                                                                    </a>
                                                                ) : <span className="p-2 text-slate-300"><FileText className="w-4 h-4"/></span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={() => handleDeleteTransaction(t.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar Transacción"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[11px] text-slate-700 uppercase bg-slate-50 font-black tracking-widest border-b">
                                        <tr>
                                            <th className="px-6 py-4">Propietario / Serie</th>
                                            <th className="px-6 py-4">Descripción Equipo</th>
                                            <th className="px-6 py-4 text-right">Valorización</th>
                                            <th className="px-6 py-4 text-center">Estado</th>
                                            {activeTab === 'ruc10' && <th className="px-6 py-4 text-center">Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(activeTab === 'ruc10' ? ruc10Products : ruc20Products).length === 0 ? (
                                            <tr><td colSpan={activeTab === 'ruc10' ? 5 : 4} className="p-16 text-center text-slate-400 font-bold uppercase italic tracking-widest">Sin registros disponibles.</td></tr>
                                        ) : (
                                            (activeTab === 'ruc10' ? ruc10Products : ruc20Products).map(product => (
                                                <tr 
                                                    key={product.id} 
                                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedProduct?.id === product.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`} 
                                                    onClick={() => handleSelectProduct(product)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <UserCheck className="w-3 h-3 text-blue-600" />
                                                            <span className="font-black text-slate-900 uppercase text-xs">{getIntermediaryName(product.intermediaryId)}</span>
                                                        </div>
                                                        <div className="text-[10px] font-black text-slate-500 font-mono mt-1 uppercase">{product.idType === 'IMEI' ? 'IMEI' : 'S/N'}: {product.serialNumber}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-slate-800 uppercase">{product.brand} {product.model}</div>
                                                        <div className="text-[10px] text-slate-600 font-bold italic">{product.specs}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                                        S/ {(activeTab === 'ruc10' ? (product.totalCost || 0) : (product.transferTotal || 0)).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border-2 ${activeTab === 'ruc10' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : activeTab === 'ruc20' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                                            {activeTab === 'ruc10' ? 'Stock Persona' : activeTab === 'ruc20' ? 'Stock Empresa' : 'Transferido'}
                                                        </span>
                                                    </td>
                                                    {activeTab === 'ruc10' && (
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={(e) => handleDeleteProduct(product, e)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar producto"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
                                                <input value={docCorrelative} onChange={e => setDocCorrelative(e.target.value.toUpperCase())} className="w-2/3 border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-slate-900 font-black" placeholder="Correlativo" />
                                            </div>
                                            
                                            <div className="flex flex-col gap-4">
                                                <label className={`w-full block border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${voucherFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 bg-white shadow-sm'}`}>
                                                    {voucherFile ? (
                                                        <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-[10px]">
                                                            <CheckCircle className="w-8 h-8 mb-2 text-emerald-600" />
                                                            <span className="truncate w-full">{voucherFile.name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                            <Upload className="w-8 h-8 mb-2 text-blue-600" />
                                                            <span>Subir Voucher</span>
                                                        </div>
                                                    )}
                                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                                                </label>

                                                <label className={`w-full block border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${invoiceFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 bg-white shadow-sm'}`}>
                                                    {invoiceFile ? (
                                                        <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-[10px]">
                                                            <FileCheck className="w-8 h-8 mb-2 text-emerald-600" />
                                                            <span className="truncate w-full">{invoiceFile.name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                            <FileText className="w-8 h-8 mb-2 text-purple-600" />
                                                            <span>Subir Factura</span>
                                                        </div>
                                                    )}
                                                    <input type="file" className="hidden" onChange={handleInvoiceUpload} accept=".pdf,image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleTransfer} 
                                            disabled={isSubmitting}
                                            className={`w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-xs ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <RefreshCw className={`w-5 h-5 inline mr-2 ${isSubmitting ? 'animate-spin' : ''}`} /> 
                                            {isSubmitting ? 'Procesando...' : 'Procesar Transferencia'}
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
