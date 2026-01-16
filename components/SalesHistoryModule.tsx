
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { Transaction, ReceiptType } from '../types';
import { Search, FileText, CheckCircle, XCircle, Clock, Eye, Download, Printer, X, Box, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';

const numberToWords = (num: number): string => {
    const whole = Math.floor(num);
    const cents = Math.round((num - whole) * 100);
    return `SON: ${whole} CON ${cents.toString().padStart(2, '0')}/100 SOLES`;
};

export const SalesHistoryModule: React.FC = () => {
    const [sales, setSales] = useState<Transaction[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);
    const config = DataService.getConfig();

    const canDelete = DataService.checkPermission('sales', 'delete');

    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        try {
            const backendSales = await BackendService.getTransactions('sale');
            setSales(backendSales.reverse());
        } catch {
            setSales(DataService.getTransactions('sale').reverse());
        }
    };

    // Fix: Added missing handlePrint function
    const handlePrint = () => {
        window.print();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Está seguro de ANULAR esta venta? Los productos volverán al stock disponible.')) {
            try {
                await BackendService.deleteTransaction(id);
                refresh();
                alert('Venta anulada con éxito.');
            } catch (err: any) {
                console.error("Error al eliminar venta:", err);
                DataService.deleteTransaction('sale', id);
                refresh();
                alert('Venta eliminada localmente.');
            }
        }
    };

    const filteredSales = sales.filter(s => 
        s.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.entityName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status?: string) => {
        switch(status) {
            case 'ACEPTADO': return <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase">ACEPTADO</span>;
            case 'ANULADO': return <span className="flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-100 uppercase">ANULADO</span>;
            default: return <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase">PENDIENTE</span>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center print:hidden bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Historial de Ventas</h2>
                    <p className="text-xs text-slate-500 font-bold">Registro centralizado de comprobantes emitidos.</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar cliente o número..." 
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-purple-500 bg-slate-50 text-slate-900"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 font-black tracking-widest border-b">
                        <tr>
                            <th className="px-8 py-5">Emisión</th>
                            <th className="px-8 py-5">Comprobante</th>
                            <th className="px-8 py-5">Cliente</th>
                            <th className="px-8 py-5 text-right">Total</th>
                            <th className="px-8 py-5 text-center">Estado</th>
                            <th className="px-8 py-5 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredSales.length === 0 ? (
                            <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">No hay ventas registradas.</td></tr>
                        ) : (
                            filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="text-slate-900 font-black">{new Date(sale.date).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-400 font-bold">{new Date(sale.date).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`text-[10px] font-black mb-1 ${sale.documentType === 'FACTURA' ? 'text-purple-600' : 'text-blue-600'}`}>{sale.documentType}</div>
                                        <div className="font-mono font-black text-slate-800">{sale.documentNumber}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-black text-slate-900 uppercase text-xs truncate max-w-[180px]">{sale.entityName}</div>
                                        <div className="text-[10px] text-slate-400 font-bold">{sale.entityDocNumber}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 text-base">
                                        S/ {sale.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        {getStatusBadge(sale.sunatStatus || 'PENDIENTE')}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => setSelectedSale(sale)}
                                                className="p-2.5 bg-slate-100 text-slate-600 hover:bg-purple-600 hover:text-white rounded-xl transition-all shadow-sm" 
                                                title="Ver PDF"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {canDelete && (
                                                <button 
                                                    onClick={(e) => handleDelete(sale.id, e)}
                                                    className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Anular Venta"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DE FACTURA / BOLETA --- */}
            {selectedSale && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedSale(null)}>
                    <div 
                        className="bg-white w-full max-w-4xl h-[95vh] flex flex-col rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white print:hidden border-b border-slate-800">
                            <h3 className="font-black uppercase tracking-widest text-[10px] flex items-center gap-3">
                                <FileText className="w-5 h-5 text-emerald-400" /> 
                                Vista de Impresión: {selectedSale.documentNumber}
                            </h3>
                            <div className="flex gap-3">
                                <button onClick={handlePrint} className="bg-white text-slate-900 hover:bg-emerald-400 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                                <button onClick={() => setSelectedSale(null)} className="bg-slate-800 hover:bg-red-600 p-2 rounded-xl">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-50 p-8 print:p-0 print:bg-white print:overflow-visible">
                            <div className="max-w-[21cm] mx-auto bg-white p-12 shadow-2xl print:shadow-none print:w-full rounded-[2rem] border border-gray-100 print:border-none">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-2/3 pr-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Box className="w-10 h-10 text-slate-900" />
                                            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">{config.companyName}</h1>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{config.companyAddress}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">TELÉFONO: {config.companyPhone} | EMAIL: {config.companyEmail}</p>
                                        {selectedSale.isIgvExempt && (
                                            <div className="mt-4 flex items-center gap-2 text-emerald-700 font-black bg-emerald-50 px-4 py-1.5 rounded-xl w-fit border border-emerald-200">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span className="text-[10px] uppercase tracking-widest">Op. Exonerada de IGV</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-1/3 border-4 border-slate-900 rounded-3xl p-6 text-center bg-slate-50">
                                        <p className="font-black text-sm uppercase">R.U.C. {config.companyRuc}</p>
                                        <div className="bg-slate-900 text-white font-black py-2 my-3 text-[10px] rounded-lg tracking-widest">
                                            {selectedSale.documentType === ReceiptType.FACTURA ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}
                                        </div>
                                        <p className="font-mono font-black text-xl text-slate-900">{selectedSale.documentNumber}</p>
                                    </div>
                                </div>

                                <div className="border-2 border-slate-100 rounded-3xl p-6 mb-8 text-[11px] bg-slate-50/50 grid grid-cols-2 gap-y-3">
                                    <div className="flex gap-2"><span className="font-black text-slate-400 uppercase w-20">Señor(es):</span> <span className="font-black text-slate-900 uppercase">{selectedSale.entityName}</span></div>
                                    <div className="flex gap-2"><span className="font-black text-slate-400 uppercase w-20">Fecha:</span> <span className="font-black text-slate-900">{new Date(selectedSale.date).toLocaleDateString()}</span></div>
                                    <div className="flex gap-2"><span className="font-black text-slate-400 uppercase w-20">{selectedSale.documentType === 'FACTURA' ? 'RUC:' : 'DNI:'}</span> <span className="font-black text-slate-900 font-mono">{selectedSale.entityDocNumber}</span></div>
                                    <div className="flex gap-2"><span className="font-black text-slate-400 uppercase w-20">Moneda:</span> <span className="font-black text-slate-900">SOLES (S/)</span></div>
                                </div>

                                <div className="mb-10">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-y-4 border-slate-900 text-slate-900 font-black uppercase text-[10px]">
                                                <th className="py-4 text-center w-16">Cant.</th>
                                                <th className="py-4 text-left px-4">Descripción del Equipo / Servicio</th>
                                                <th className="py-4 text-right w-28">P. Unitario</th>
                                                <th className="py-4 text-right w-28">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold uppercase text-slate-700">
                                            {selectedSale.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-4 text-center font-black">{item.quantity}</td>
                                                    <td className="py-4 px-4">{item.productName}</td>
                                                    <td className="py-4 text-right font-mono">S/ {item.unitPriceBase.toFixed(2)}</td>
                                                    <td className="py-4 text-right font-black text-slate-900 font-mono">S/ {item.totalBase.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {Array.from({ length: Math.max(0, 4 - selectedSale.items.length) }).map((_, i) => (
                                                <tr key={`pad-${i}`} className="border-none"><td colSpan={4} className="py-4">&nbsp;</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-end border-t-4 border-slate-900 pt-6">
                                    <div className="w-2/3 pr-10">
                                        <p className="text-[10px] font-black text-slate-900 mb-2">{numberToWords(selectedSale.totalAmount)}</p>
                                        <div className="mt-6 flex gap-6 items-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-[8px] text-slate-400 font-black border-2 border-slate-100">QR SUNAT</div>
                                            <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase">
                                                Representación impresa del comprobante electrónico.<br/>
                                                Puede consultar la validez en el portal de SUNAT.<br/>
                                                Código Hash: {Math.random().toString(36).substring(2, 15).toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-1/3 space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase"><span>Op. Gravada:</span> <span className="font-mono text-slate-900 font-black">S/ {selectedSale.baseAmount.toFixed(2)}</span></div>
                                        <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase"><span>IGV (18%):</span> <span className="font-mono text-slate-900 font-black">S/ {selectedSale.igvAmount.toFixed(2)}</span></div>
                                        <div className="flex justify-between items-center text-slate-900 pt-3 border-t-2 border-slate-200">
                                            <span className="font-black text-xs uppercase tracking-tighter">Total Pagar:</span>
                                            <span className="font-mono font-black text-2xl tracking-tighter">S/ {selectedSale.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};
