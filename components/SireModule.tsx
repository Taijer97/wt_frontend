
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { Transaction, ReceiptType } from '../types';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Search, 
  Info,
  Table as TableIcon,
  Calculator
} from 'lucide-react';

export const SireModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ventas' | 'compras'>('ventas');
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [data, setData] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState({ base: 0, igv: 0, total: 0, count: 0 });

    useEffect(() => {
        loadPeriodData();
    }, [activeTab, selectedPeriod]);

    const loadPeriodData = async () => {
        const period = selectedPeriod;
        try {
            if (activeTab === 'ventas') {
                const sales = await BackendService.getTransactions('sale');
                const filtered = sales.filter(t => (t.date || '').slice(0, 7) === period);
                const totals = filtered.reduce((acc, curr) => ({
                    base: acc.base + curr.baseAmount,
                    igv: acc.igv + curr.igvAmount,
                    total: acc.total + curr.totalAmount,
                    count: acc.count + 1
                }), { base: 0, igv: 0, total: 0, count: 0 });
                setData(filtered);
                setSummary(totals);
            } else {
                const [purchases, transfers] = await Promise.all([
                    BackendService.getTransactions('purchase'),
                    BackendService.getTransactions('transfer'),
                ]);
                const combined = [...purchases, ...transfers];
                const filtered = combined.filter(t => (t.date || '').slice(0, 7) === period);
                const totals = filtered.reduce((acc, curr) => ({
                    base: acc.base + curr.baseAmount,
                    igv: acc.igv + curr.igvAmount,
                    total: acc.total + curr.totalAmount,
                    count: acc.count + 1
                }), { base: 0, igv: 0, total: 0, count: 0 });
                setData(filtered);
                setSummary(totals);
            }
        } catch {
            const type = activeTab === 'ventas' ? 'sale' : 'purchase';
            const local = DataService.getTransactions(type);
            const filtered = local.filter(t => (t.date || '').slice(0, 7) === period);
            const totals = filtered.reduce((acc, curr) => ({
                base: acc.base + curr.baseAmount,
                igv: acc.igv + curr.igvAmount,
                total: acc.total + curr.totalAmount,
                count: acc.count + 1
            }), { base: 0, igv: 0, total: 0, count: 0 });
            setData(filtered);
            setSummary(totals);
        }
    };

    const handleExportTxt = () => {
        const periodCompact = selectedPeriod.replace('-', '');
        const mapDoc = (dt: ReceiptType) => dt === ReceiptType.FACTURA ? '01' : '03';
        const lines = data.map(t => {
            const [serie, numero] = String(t.documentNumber || '').split('-');
            const tipo = mapDoc(t.documentType as any);
            const fecha = new Date(t.date).toISOString().slice(0, 10);
            const base = Number(t.baseAmount || 0).toFixed(2);
            const igv = Number(t.igvAmount || 0).toFixed(2);
            const total = Number(t.totalAmount || 0).toFixed(2);
            return [
                periodCompact,
                tipo,
                serie || '',
                numero || '',
                fecha,
                t.entityDocNumber || '',
                t.entityName || '',
                base,
                igv,
                total,
                'PEN'
            ].join('|');
        });
        const header = ['PERIODO','TIPO','SERIE','NUMERO','FECHA','DOC_ENTIDAD','RAZON_SOCIAL','BASE','IGV','TOTAL','MONEDA'].join('|');
        const content = [header, ...lines].join('\r\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SIRE_${activeTab === 'ventas' ? 'RVIE' : 'RCE'}_${periodCompact}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header Módulo */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-400">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Módulo SIRE SUNAT</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase">Sistema Integrado de Registros Electrónicos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 px-3 py-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <label className="text-[10px] font-black text-slate-500 uppercase">Periodo:</label>
                    </div>
                    <input 
                        type="month" 
                        value={selectedPeriod} 
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
            </div>

            {/* Tabs de Navegación SIRE */}
            <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl w-full md:w-fit shadow-inner">
                <button 
                    onClick={() => setActiveTab('ventas')}
                    className={`flex-1 md:flex-none px-8 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ventas' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ArrowUpCircle className={`w-4 h-4 ${activeTab === 'ventas' ? 'text-blue-600' : ''}`} />
                    Registro de Ventas (RVIE)
                </button>
                <button 
                    onClick={() => setActiveTab('compras')}
                    className={`flex-1 md:flex-none px-8 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'compras' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ArrowDownCircle className={`w-4 h-4 ${activeTab === 'compras' ? 'text-purple-600' : ''}`} />
                    Registro de Compras (RCE)
                </button>
            </div>

            {/* Resumen de Totales del Periodo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest text-center">Registros</p>
                    <p className="text-2xl font-black text-slate-900 text-center">{summary.count}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest text-center">Base Imponible</p>
                    <p className="text-2xl font-black text-slate-900 text-center">S/ {summary.base.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest text-center">IGV Total</p>
                    <p className="text-2xl font-black text-blue-700 text-center">S/ {summary.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-center">Total Comprobantes</p>
                    <p className="text-2xl font-black text-white text-center">S/ {summary.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Tabla de Previsualización */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-700 uppercase flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-slate-400" />
                        Previsualización de Estructura SIRE
                    </h3>
                    <button 
                        onClick={handleExportTxt}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Exportar TXT para SUNAT
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-tighter border-b border-slate-200">
                                <th className="px-4 py-4">Fecha Emisión</th>
                                <th className="px-4 py-4">Tipo Doc.</th>
                                <th className="px-4 py-4">Serie-Número</th>
                                <th className="px-4 py-4">RUC/DNI Entidad</th>
                                <th className="px-4 py-4">Razón Social</th>
                                <th className="px-4 py-4 text-right">Base Imponible</th>
                                <th className="px-4 py-4 text-right">IGV / IVAP</th>
                                <th className="px-4 py-4 text-right">Importe Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center text-slate-400 font-bold uppercase italic tracking-widest">
                                        No existen registros cargados para el periodo {selectedPeriod}.
                                    </td>
                                </tr>
                            ) : (
                                data.map(trans => (
                                    <tr key={trans.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-slate-800 font-bold">{new Date(trans.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${trans.documentType === ReceiptType.FACTURA ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {trans.documentType === ReceiptType.FACTURA ? '01' : '03'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-slate-900 font-bold uppercase">{trans.documentNumber}</td>
                                        <td className="px-4 py-4 font-mono text-slate-600 font-bold">{trans.entityDocNumber}</td>
                                        <td className="px-4 py-4 text-slate-900 font-black uppercase text-[11px] max-w-[200px] truncate">{trans.entityName}</td>
                                        <td className="px-4 py-4 text-right text-slate-800 font-bold">S/ {trans.baseAmount.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right text-blue-600 font-black">S/ {trans.igvAmount.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right text-slate-900 font-black">S/ {trans.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr className="text-slate-900 font-black">
                                    <td colSpan={5} className="px-4 py-4 text-right uppercase text-[10px] tracking-widest">Totales Periodo {selectedPeriod}:</td>
                                    <td className="px-4 py-4 text-right">S/ {summary.base.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-right text-blue-700">S/ {summary.igv.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-right bg-slate-900 text-white rounded-br-2xl">S/ {summary.total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Nota Informativa */}
            <div className="bg-blue-50 border-2 border-blue-100 p-5 rounded-2xl flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                    <h4 className="text-sm font-black text-blue-900 uppercase">Cumplimiento Tributario</h4>
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        La información mostrada en este módulo es un reflejo de las transacciones procesadas en el software. 
                        Asegúrese de que todos los comprobantes estén en estado <strong>ACEPTADO</strong> antes de proponer el archivo al SIRE de SUNAT.
                        Los códigos de documentos utilizados (01 para Facturas y 03 para Boletas) cumplen con la Tabla 10 de SUNAT.
                    </p>
                </div>
            </div>
        </div>
    );
};
