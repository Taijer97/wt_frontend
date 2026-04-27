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
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [transferCalc, setTransferCalc] = useState({ base: 0, igv: 0, total: 0 });
    const [config, setConfig] = useState<any>(null);
    
    const [docSeries, setDocSeries] = useState('F001');
    const [docCorrelative, setDocCorrelative] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today
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

    const [isLoadingData, setIsLoadingData] = useState(true);

    const loadData = async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoadingData(true);
        try {
            // @ts-ignore - BackendService supports forceRefresh
            const [prods, inters, trxs, purchs, cfg] = await Promise.all([
                BackendService.getProducts(forceRefresh),
                BackendService.getIntermediaries(forceRefresh),
                BackendService.getTransactions(undefined, forceRefresh),
                BackendService.getPurchases(undefined, forceRefresh),
                BackendService.getConfig(forceRefresh)
            ]);
            setProducts(prods);
            setIntermediaries(inters);
            setTransactions(trxs);
            setPurchases(purchs);
            setConfig(cfg);
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            if (!forceRefresh) setIsLoadingData(false);
        }
    };

    useEffect(() => {
        loadData(false);
        // Background update for better UX
        const bgUpdate = async () => {
            await loadData(true);
        };
        setTimeout(bgUpdate, 100);
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

    const selectedTransferProducts = products.filter(
        p => selectedProductIds.includes(p.id) && p.status === ProductStatus.IN_STOCK_RUC10
    );

    const calcForProduct = (product: Product) => {
        if (!config) return { base: 0, igv: 0, total: 0 };
        const totalCost = product.totalCost || 0;
        const profit = config.ruc10MarginType === 'PERCENT' ? (totalCost * config.ruc10Margin) : config.ruc10Margin;
        const divisor = 1 - (config.rentaRate || 0);
        const base = (totalCost + profit) / divisor;
        const igv = base * effectiveIgvRate;
        const total = base + igv;
        return { base, igv, total };
    };

    useEffect(() => {
        if (!config || selectedTransferProducts.length === 0) {
            setTransferCalc({ base: 0, igv: 0, total: 0 });
            return;
        }
        const totals = selectedTransferProducts.reduce(
            (acc, p) => {
                const c = calcForProduct(p);
                return { base: acc.base + c.base, igv: acc.igv + c.igv, total: acc.total + c.total };
            },
            { base: 0, igv: 0, total: 0 }
        );
        setTransferCalc(totals);
    }, [selectedProductIds, products, config, effectiveIgvRate]);

    const handleSelectProduct = (product: Product) => {
        if (product.status !== ProductStatus.IN_STOCK_RUC10 || activeTab !== 'ruc10') {
            setSelectedProduct(product);
            return;
        }
        setSelectedProductIds(prev => {
            const exists = prev.includes(product.id);
            const next = exists ? prev.filter(id => id !== product.id) : [...prev, product.id];
            if (next.length === 0) {
                setSelectedProduct(null);
                setSelectedIntermediaryId('');
            } else if (!exists) {
                setSelectedProduct(product);
                if (!selectedIntermediaryId) setSelectedIntermediaryId(product.intermediaryId || '');
            } else if (selectedProduct?.id === product.id) {
                const nextFocus = products.find(p => p.id === next[0]) || null;
                setSelectedProduct(nextFocus);
            }
            return next;
        });
        setTransferDate(new Date().toISOString().slice(0, 10));
        setDocCorrelative(getNextCorrelative(transactions, docSeries));
        setVoucherFile(null);
        setInvoiceFile(null);
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
        if (selectedTransferProducts.length === 0) return alert("Seleccione al menos un producto para transferir.");
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
                pdfUrl: undefined, // Will be set by invoice upload
                items: selectedTransferProducts.map(p => {
                    const c = calcForProduct(p);
                    return {
                        productId: p.id,
                        productName: `${p.category || ''} ${p.brand || ''} ${p.model || ''} - ${p.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${p.serialNumber || ''}`.trim(),
                        quantity: 1,
                        unitPriceBase: c.base,
                        totalBase: c.base
                    };
                })
            });
            
            // If we want to support backdating transactions, we need to update the transaction date
            // For now, let's assume the user mainly cares about the Transfer Date recorded on the product/history.
            
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
            
            await Promise.all(
                selectedTransferProducts.map(async p => {
                    const c = calcForProduct(p);
                    await BackendService.updateProduct(p.id, {
                        status: ProductStatus.TRANSFERRED_RUC20,
                        intermediaryId: selectedIntermediaryId,
                        transferBase: c.base,
                        transferIgv: c.igv,
                        transferTotal: c.total,
                        transferDocType: ReceiptType.FACTURA,
                        transferDocNumber: docNumber,
                        transferDate: new Date(transferDate).toISOString()
                    });
                })
            );

            alert(`Transferencia exitosa: ${selectedTransferProducts.length} producto(s) en una sola factura.`);
            setSelectedProduct(null);
            setSelectedProductIds([]);
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
                        onClick={() => { setActiveTab('ruc10'); setSelectedProduct(null); setSelectedProductIds([]); }}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'ruc10' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Package className="w-4 h-4" /> Almacén RUC 10
                    </button>
                    <button
                        onClick={() => { setActiveTab('ruc20'); setSelectedProduct(null); setSelectedProductIds([]); }}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'ruc20' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" /> Almacén RUC 20
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setSelectedProduct(null); setSelectedProductIds([]); }}
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
                                            {isLoadingData ? (
                                                Array.from({ length: 3 }).map((_, i) => (
                                                    <tr key={`skeleton-trx-${i}`} className="animate-pulse">
                                                        <td className="px-6 py-4 space-y-2"><div className="h-4 w-20 bg-slate-200 rounded"></div><div className="h-3 w-16 bg-slate-200 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded"></div></td>
                                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                                                        <td className="px-6 py-4"><div className="flex justify-center gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg"></div><div className="h-8 w-8 bg-slate-200 rounded-lg"></div></div></td>
                                                        <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-lg mx-auto"></div></td>
                                                    </tr>
                                                ))
                                            ) : transactions.filter(t => t.trxType === 'transfer').length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold uppercase italic">Sin transferencias registradas.</td></tr>
                                            ) : (
                                                transactions.filter(t => t.trxType === 'transfer').map(t => (
                                                    <tr key={t.id} className="hover:bg-slate-50">
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-slate-800">{new Date(t.date).toLocaleDateString()}</div>
                                                            <div className="text-[10px] text-slate-500">{t.documentType} {t.documentNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.entityName}</td>
                                                        <td className="px-6 py-4 text-[10px] uppercase text-slate-500">
                                                            {(() => {
                                                                const item = t.items?.[0];
                                                                if (!item) return 'Item';
                                                                // Intenta recuperar el producto completo para mostrar detalles históricos si faltan
                                                                const p = products.find(prod => prod.id === item.productId);
                                                                if (p) return `${p.category || ''} ${p.brand || ''} ${p.model || ''} - ${p.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${p.serialNumber || ''}`;
                                                                return item.productName || 'Item';
                                                            })()}
                                                        </td>
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
                                        {isLoadingData ? (
                                            Array.from({ length: 4 }).map((_, i) => (
                                                <tr key={`skeleton-inv-${i}`} className="animate-pulse">
                                                    <td className="px-6 py-4 space-y-2"><div className="h-4 w-32 bg-slate-200 rounded"></div><div className="h-3 w-20 bg-slate-200 rounded"></div></td>
                                                    <td className="px-6 py-4 space-y-2"><div className="h-4 w-40 bg-slate-200 rounded"></div><div className="h-3 w-24 bg-slate-200 rounded"></div></td>
                                                    <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                                                    <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                                                    {activeTab === 'ruc10' && <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-lg mx-auto"></div></td>}
                                                </tr>
                                            ))
                                        ) : (activeTab === 'ruc10' ? ruc10Products : ruc20Products).length === 0 ? (
                                            <tr><td colSpan={activeTab === 'ruc10' ? 5 : 4} className="p-16 text-center text-slate-400 font-bold uppercase italic tracking-widest">Sin registros disponibles.</td></tr>
                                        ) : (
                                            (activeTab === 'ruc10' ? ruc10Products : ruc20Products).map(product => (
                                                <tr 
                                                    key={product.id} 
                                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedProductIds.includes(product.id) ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`} 
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
                                                        <div className="font-black text-slate-800 uppercase">{product.category} {product.brand} {product.model}</div>
                                                        <div className="text-[10px] text-slate-600 font-bold italic">{product.specs}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                                        S/ {(activeTab === 'ruc10' ? (product.totalCost || 0) : (product.transferTotal || 0)).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border-2 whitespace-nowrap ${activeTab === 'ruc10' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : activeTab === 'ruc20' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                                            {activeTab === 'ruc10' ? 'Almacén RUC 10' : activeTab === 'ruc20' ? 'Almacén RUC 20' : 'Transferido'}
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
                                                <span>Costo RUC 10 ({selectedTransferProducts.length} prod.)</span>
                                                <span className="font-black">S/ {selectedTransferProducts.reduce((acc, p) => acc + (p.totalCost || 0), 0).toFixed(2)}</span>
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
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-black text-slate-700 uppercase">Fecha de Emisión</label>
                                                <input 
                                                    type="date" 
                                                    value={transferDate} 
                                                    onChange={e => setTransferDate(e.target.value)} 
                                                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-slate-900 font-black uppercase" 
                                                />
                                            </div>
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
                                            disabled={isSubmitting || selectedTransferProducts.length === 0}
                                            className={`w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-xs ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <RefreshCw className={`w-5 h-5 inline mr-2 ${isSubmitting ? 'animate-spin' : ''}`} /> 
                                            {isSubmitting ? 'Procesando...' : 'Procesar Transferencia'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <Package className="w-16 h-16 text-slate-200" />
                                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-6">Seleccione uno o varios equipos para generar una sola factura de transferencia.</p>
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
