
import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Printer, User, Building, PackageX, Tag, ShieldCheck } from 'lucide-react';
import { Product, ProductStatus, TransactionItem } from '../types';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { fetchDni } from '../services/dniService';
import { fetchRuc } from '../services/rucService';

export const SalesModule: React.FC = () => {
    const [docType, setDocType] = useState<'FACTURA' | 'BOLETA'>('FACTURA');
    const [clientDoc, setClientDoc] = useState('');
    const [clientName, setClientName] = useState('');
    const [docSeries, setDocSeries] = useState('F001');
    const [docCorrelative, setDocCorrelative] = useState('');
    const [cart, setCart] = useState<Product[]>([]);
    const [loadingRuc, setLoadingRuc] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stockRuc20, setStockRuc20] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    const config = DataService.getConfig();

    useEffect(() => {
        loadStock();
        loadTransactions();
    }, []);

    const loadStock = async () => {
        try {
            const allProducts = await BackendService.getProducts();
            const available = allProducts.filter(p => p.status === ProductStatus.TRANSFERRED_RUC20);
            setStockRuc20(available);
        } catch {
            const allProducts = DataService.getProducts();
            const available = allProducts.filter(p => p.status === ProductStatus.TRANSFERRED_RUC20);
            setStockRuc20(available);
        }
    };

    const loadTransactions = async () => {
        try {
            const trxs = await BackendService.getTransactions();
            setTransactions(trxs);
        } catch {
            setTransactions([]);
        }
    };

    const getNextCorrelative = (trxs: any[], type: string, series: string) => {
        // Buscamos transacciones que coincidan con el tipo (FACTURA/BOLETA) y que empiecen con la serie (ej: F001)
        const filtered = trxs.filter(t => 
            t.trxType === 'sale' && 
            t.documentType === type && 
            t.documentNumber?.split('-')[0].trim() === series.trim()
        );
        
        if (filtered.length === 0) return '1';

        const numbers = filtered.map(t => {
            const parts = t.documentNumber.split('-');
            const lastPart = parts[parts.length - 1];
            // Limpiamos cualquier espacio y convertimos a número
            const num = parseInt(lastPart.trim());
            return isNaN(num) ? 0 : num;
        });

        const max = Math.max(...numbers, 0);
        return (max + 1).toString();
    };

    useEffect(() => {
        setDocSeries(docType === 'FACTURA' ? 'F001' : 'B001');
    }, [docType]);

    useEffect(() => {
        if (transactions.length >= 0) {
            setDocCorrelative(getNextCorrelative(transactions, docType, docSeries));
        }
    }, [docSeries, docType, transactions]);

    const handleConsultRuc = async () => {
        if(!clientDoc) return;
        setLoadingRuc(true);
        try {
            if (docType === 'BOLETA' && clientDoc.length === 8) {
                const info = await fetchDni(clientDoc);
                setClientName((info.fullName || '').toUpperCase());
            } else if (docType === 'FACTURA' && clientDoc.length === 11) {
                const info = await fetchRuc(clientDoc);
                setClientName((info.razonSocial || info.nombreComercial || '').toUpperCase());
            } else {
                alert('Documento inválido');
            }
        } catch {
            alert('No se pudo consultar los datos del documento');
        } finally {
            setLoadingRuc(false);
        }
    };

    const addToCart = (product: Product) => {
        if (!cart.find(p => p.id === product.id)) {
            setCart([...cart, product]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(p => p.id !== id));
    };

    const getProductCostBase = (p: Product) => p.transferBase || p.purchasePrice || 0;

    const calculateSalePriceTotal = (netCost: number) => {
        let profit = 0;
        if (config.ruc20SaleMarginType === 'PERCENT') {
            profit = netCost * config.ruc20SaleMargin;
        } else {
            profit = config.ruc20SaleMargin;
        }

        const divisor = 1 - config.rentaRate; 
        const baseImponibleVenta = (netCost + profit) / divisor;

        if (config.isIgvExempt) {
            return baseImponibleVenta;
        }

        return baseImponibleVenta * (1 + config.igvRate);
    };

    const totalCart = cart.reduce((acc, p) => acc + calculateSalePriceTotal(getProductCostBase(p)), 0);
    const subtotal = config.isIgvExempt ? totalCart : (totalCart / (1 + config.igvRate));
    const igv = config.isIgvExempt ? 0 : (totalCart - subtotal);

    const handleProcessSale = async () => {
        if(cart.length === 0) return;
        if(!clientDoc || !clientName) {
            alert('Ingrese datos del cliente');
            return;
        }
        if(!docSeries || !docCorrelative) {
            alert('Ingrese el número de comprobante');
            return;
        }

        const saleInvoiceNumber = `${docSeries} - ${docCorrelative}`;

        const transactionItems: TransactionItem[] = cart.map(p => {
             const netCost = getProductCostBase(p);
             const salePriceTotal = calculateSalePriceTotal(netCost);
             const baseVenta = config.isIgvExempt ? salePriceTotal : (salePriceTotal / (1 + config.igvRate));
             
             const updatedProduct = { ...p, status: ProductStatus.SOLD };
             DataService.saveProduct(updatedProduct);

             // MEJORA: AÑADIR CATEGORÍA al nombre del producto para auditoría en el comprobante
             return {
                productId: p.id,
                productName: `${p.category?.toUpperCase() || 'EQUIPO'} - ${p.brand} ${p.model} (${p.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${p.serialNumber})`,
                quantity: 1,
                unitPriceBase: baseVenta,
                totalBase: baseVenta
             };
        });

        const totalBaseAmount = transactionItems.reduce((acc, item) => acc + item.totalBase, 0);
        const totalIgvAmount = config.isIgvExempt ? 0 : (totalBaseAmount * config.igvRate);
        const totalFinalAmount = totalBaseAmount + totalIgvAmount;

        try {
            await BackendService.createTransaction({
                trxType: 'sale',
                documentType: docType,
                documentNumber: saleInvoiceNumber,
                entityName: clientName,
                entityDocNumber: clientDoc,
                baseAmount: totalBaseAmount,
                igvAmount: totalIgvAmount,
                totalAmount: totalFinalAmount,
                items: transactionItems.map(i => ({
                    productId: i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    unitPriceBase: i.unitPriceBase,
                    totalBase: i.totalBase,
                })),
            });
            for (const p of cart) {
                await BackendService.updateProduct(p.id, { status: ProductStatus.SOLD });
            }
            alert(`Venta procesada con éxito.\nComprobante: ${saleInvoiceNumber}`);
            loadTransactions();
        } catch {
            DataService.addTransaction('sale', {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                documentType: docType as any,
                documentNumber: saleInvoiceNumber,
                entityName: clientName,
                entityDocNumber: clientDoc,
                baseAmount: totalBaseAmount,
                igvAmount: totalIgvAmount,
                totalAmount: totalFinalAmount,
                items: transactionItems,
                sunatStatus: 'ACEPTADO',
                isIgvExempt: config.isIgvExempt,
                exemptionReason: config.isIgvExempt ? config.igvExemptionReason : undefined
            });
            alert(`Venta procesada en modo local.\nComprobante: ${saleInvoiceNumber}`);
            loadTransactions();
        }
        setCart([]);
        setClientDoc('');
        setClientName('');
        loadStock();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Datos del Cliente</h3>
                        <div className="flex bg-gray-200 p-1 rounded-lg">
                            <button 
                                onClick={() => { setDocType('BOLETA'); setClientDoc(''); setClientName(''); }}
                                className={`px-4 py-1 text-sm rounded-md font-black transition-all ${docType === 'BOLETA' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                Boleta
                            </button>
                            <button 
                                onClick={() => { setDocType('FACTURA'); setClientDoc(''); setClientName(''); }}
                                className={`px-4 py-1 text-sm rounded-md font-black transition-all ${docType === 'FACTURA' ? 'bg-purple-700 shadow text-white' : 'text-slate-500'}`}
                            >
                                Factura
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                {docType === 'FACTURA' ? 'RUC (11 Dígitos)' : 'DNI (8 Dígitos)'}
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={clientDoc}
                                    onChange={(e) => setClientDoc(e.target.value.toUpperCase())}
                                    onBlur={() => { 
                                        if ((docType === 'BOLETA' && clientDoc.length === 8) || (docType === 'FACTURA' && clientDoc.length === 11)) handleConsultRuc(); 
                                    }}
                                    maxLength={docType === 'FACTURA' ? 11 : 8}
                                    className="flex-1 border-2 border-gray-200 rounded-lg p-2.5 font-bold focus:border-purple-500 bg-white text-slate-900 shadow-inner"
                                    placeholder="Número..."
                                />
                                <button 
                                    onClick={handleConsultRuc}
                                    disabled={loadingRuc}
                                    className="bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50"
                                >
                                    {loadingRuc ? '...' : <Search className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Razón Social / Nombre</label>
                            <input 
                                type="text" 
                                value={clientName}
                                readOnly
                                className="w-full bg-slate-50 border-2 border-gray-200 rounded-lg p-2.5 text-slate-900 font-black uppercase text-sm"
                                placeholder="Auto-completado..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 shadow-inner">
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Serie del Comprobante</label>
                            <input 
                                type="text" 
                                value={docSeries}
                                onChange={(e) => setDocSeries(e.target.value.toUpperCase())}
                                className="w-full border-2 border-gray-200 rounded-xl p-3 font-black focus:border-purple-500 bg-white text-slate-900 uppercase text-sm"
                                placeholder="F001"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Número Correlativo</label>
                            <input 
                                type="text" 
                                value={docCorrelative}
                                onChange={(e) => setDocCorrelative(e.target.value.toUpperCase())}
                                className="w-full border-2 border-gray-200 rounded-xl p-3 font-black focus:border-purple-500 bg-white text-slate-900 uppercase text-sm"
                                placeholder="1"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Stock Venta (RUC 20)</h3>
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 text-[11px] text-slate-700 font-black bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                                <Tag className="w-3 h-3 text-purple-600"/> Margen: {config.ruc20SaleMarginType === 'PERCENT' ? (config.ruc20SaleMargin * 100).toFixed(0) + '%' : 'S/ ' + config.ruc20SaleMargin.toFixed(0)}
                            </div>
                            {config.isIgvExempt && (
                                <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 uppercase">Empresa Exonerada de IGV</span>
                            )}
                        </div>
                    </div>
                    
                    {stockRuc20.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <PackageX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-bold">No hay stock disponible para facturar.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stockRuc20.map(prod => {
                                const inCart = cart.some(c => c.id === prod.id);
                                const netCost = getProductCostBase(prod);
                                const suggestedPriceTotal = calculateSalePriceTotal(netCost);
                                return (
                                    <div key={prod.id} className={`border-2 rounded-2xl p-5 transition-all flex justify-between items-center group ${inCart ? 'bg-purple-50 border-purple-300 opacity-60' : 'hover:border-purple-400 border-gray-100 bg-white shadow-sm'}`}>
                                        <div className="space-y-1">
                                            <p className="font-black text-slate-900 uppercase text-sm">{prod.category?.toUpperCase()} {prod.brand} {prod.model}</p>
                                            <p className="text-xs text-slate-600 font-bold italic">{prod.specs}</p>
                                            <p className="text-[10px] font-black text-slate-500 font-mono tracking-widest uppercase">{prod.idType === 'IMEI' ? 'IMEI' : 'S/N'}: {prod.serialNumber}</p>
                                            <div className="mt-3">
                                                <span className="text-lg font-black text-purple-900">S/ {suggestedPriceTotal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(prod)}
                                            disabled={inCart}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-md active:scale-95 ${inCart ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-purple-700'}`}
                                        >
                                            {inCart ? 'En Carrito' : 'Agregar'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-purple-100 h-fit sticky top-24">
                <h3 className="font-black text-slate-900 uppercase text-sm mb-6 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-700" />
                    Resumen de Pedido
                </h3>

                {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 font-bold border-2 border-dashed border-gray-100 rounded-xl">
                        Carrito vacío
                    </div>
                ) : (
                    <div className="space-y-6">
                        <ul className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                            {cart.map(item => (
                                <li key={item.id} className="flex justify-between items-start text-sm pb-3 border-b border-gray-100 last:border-0">
                                    <div className="flex-1 pr-2">
                                        <span className="block font-black text-slate-900 uppercase text-xs">{item.category?.toUpperCase()} {item.brand} {item.model}</span>
                                        <span className="text-[10px] text-slate-500 font-black font-mono tracking-tighter">{item.idType === 'IMEI' ? 'IMEI' : 'S/N'}: {item.serialNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-slate-900">S/ {calculateSalePriceTotal(getProductCostBase(item)).toFixed(2)}</span>
                                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="bg-slate-50 p-5 rounded-2xl space-y-3 border border-slate-200">
                            <div className="flex justify-between text-slate-600 font-bold text-xs uppercase">
                                <span>Subtotal</span>
                                <span>S/ {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 font-bold text-xs uppercase">
                                <span>IGV ({config.isIgvExempt ? '0%' : (config.igvRate * 100) + '%'})</span>
                                <span className={config.isIgvExempt ? 'text-emerald-700 font-black' : ''}>
                                    {config.isIgvExempt ? 'EXONERADO' : 'S/ ' + igv.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-3 border-t-2 border-slate-200 uppercase tracking-tighter">
                                <span>Total</span>
                                <span className="text-2xl text-purple-900 font-black">S/ {totalCart.toFixed(2)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleProcessSale}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            <Printer className="w-5 h-5" />
                            Emitir Comprobante
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
