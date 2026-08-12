import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Building2, 
  UserCheck, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Filter,
  X,
  FileMinus,
  Printer,
  FileCode
} from 'lucide-react';
import { BackendService } from '../services/backendService';
import { FacturacionService } from '../services/facturacionService';
import { Transaction } from '../types';
import { useAlert } from './ui/Alert';

const numberToWords = (amount: number): string => {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);

  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const twenties = ['VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let result = '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const t = Math.floor(r / 10);
    const u = r % 10;

    if (h > 0) result += hundreds[h] + ' ';

    if (r >= 10 && r <= 19) {
      result += teens[r - 10];
    } else if (r >= 20 && r <= 29) {
      result += twenties[r - 20];
    } else {
      if (t > 0) {
        result += tens[t];
        if (u > 0) result += ' Y ' + units[u];
      } else if (u > 0) {
        result += units[u];
      }
    }
    return result.trim();
  };

  if (whole === 0) {
    return `SON: CERO CON ${cents.toString().padStart(2, '0')}/100 SOLES`;
  }

  let words = '';
  const millions = Math.floor(whole / 1000000);
  const thousands = Math.floor((whole % 1000000) / 1000);
  const remainder = whole % 1000;

  if (millions > 0) {
    words += (millions === 1 ? 'UN MILLON ' : convertGroup(millions) + ' MILLONES ');
  }
  if (thousands > 0) {
    words += (thousands === 1 ? 'MIL ' : convertGroup(thousands) + ' MIL ');
  }
  if (remainder > 0) {
    words += convertGroup(remainder);
  }

  return `SON: ${words.trim()} CON ${cents.toString().padStart(2, '0')}/100 SOLES`;
};

export const formatDocumentType = (docType?: string, docNumber?: string, trxType?: string): string => {
    const dt = (docType || '').toUpperCase().trim();
    const dn = (docNumber || '').toUpperCase().trim();
    const tt = (trxType || '').toUpperCase().trim();

    if (dt.includes('CREDITO') || dt.includes('CRÉDITO') || dn.startsWith('NC') || tt.includes('CREDIT_NOTE')) {
        return 'NOTA DE CRÉDITO ELECTRÓNICA';
    }
    if (dt.includes('BOLETA') || dn.startsWith('B') || dn.startsWith('FB') || dn.startsWith('BC')) {
        return 'BOLETA ELECTRÓNICA';
    }
    if (dt.includes('FACTURA') || dn.startsWith('F') || dn.startsWith('FF') || dn.startsWith('FC')) {
        return 'FACTURA ELECTRÓNICA';
    }
    if (dt) return `${dt} ELECTRÓNICA`;
    return 'FACTURA ELECTRÓNICA';
};

export const InvoicingDashboardModule: React.FC = () => {
    const toast = useAlert();
    const [activeSection, setActiveSection] = useState<'ruc10' | 'ruc20'>('ruc10');
    const [subTab, setSubTab] = useState<'invoices' | 'credit_notes'>('invoices');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [previewingTrx, setPreviewingTrx] = useState<Transaction | null>(null);
    const [creditNoteTrx, setCreditNoteTrx] = useState<Transaction | null>(null);
    const [ncReasonCode, setNcReasonCode] = useState('01');
    const [ncReasonDesc, setNcReasonDesc] = useState('ANULACION DE LA OPERACION');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        try {
            const trxs = await BackendService.getTransactions(undefined, forceRefresh);
            setTransactions(trxs);
        } catch (error) {
            console.error("Error loading transactions for dashboard", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData(false);
    }, []);

    // Filter transactions for RUC 10 vs RUC 20
    const ruc10Trxs = useMemo(() => {
        return transactions.filter(t => {
            const isNC10 = t.trxType === 'credit_note_ruc10' || (t.trxType === 'credit_note' && (t.entityDocNumber === '10710425162' || t.entityDocNumber === '20615233731'));
            return t.trxType === 'transfer' || isNC10;
        });
    }, [transactions]);

    const ruc20Trxs = useMemo(() => {
        return transactions.filter(t => {
            const isNC20 = t.trxType === 'credit_note_ruc20' || (t.trxType === 'credit_note' && t.entityDocNumber !== '10710425162' && t.entityDocNumber !== '20615233731');
            return t.trxType === 'sale' || isNC20;
        });
    }, [transactions]);

    const previewingItems = useMemo(() => {
        if (!previewingTrx) return [];
        if (previewingTrx.items && previewingTrx.items.length > 0) return previewingTrx.items;

        const desc = previewingTrx.sunat_description || previewingTrx.sunatDescription;
        if (desc && desc.includes('para ')) {
            const affectedDoc = desc.split('para ')[1]?.trim();
            if (affectedDoc) {
                const affectedTrx = transactions.find(t => t.documentNumber === affectedDoc);
                if (affectedTrx && affectedTrx.items && affectedTrx.items.length > 0) {
                    return affectedTrx.items;
                }
            }
        }
        return [];
    }, [previewingTrx, transactions]);

    const currentSectionTrxs = activeSection === 'ruc10' ? ruc10Trxs : ruc20Trxs;

    const filteredInvoices = useMemo(() => {
        return currentSectionTrxs.filter(t => {
            const isNC = t.trxType === 'credit_note' || 
                         t.trxType === 'credit_note_ruc10' ||
                         t.trxType === 'credit_note_ruc20' ||
                         (t.documentType && t.documentType.toUpperCase().includes('CREDITO')) ||
                         (t.documentNumber && (t.documentNumber.toUpperCase().includes('NC') || t.documentNumber.toUpperCase().startsWith('NOTA')));

            const isAccepted = t.sunatStatus === 'ACCEPTED' || t.sunatStatus === 'ACEPTADO';
            const isVoided = t.sunatStatus === 'VOIDED' || t.sunatStatus === 'ANULADO';

            if (subTab === 'invoices') {
                // Comprobantes Emitidos: Muestra TODAS las Facturas/Boletas emitidas (preserva la correlación)
                // Excluye ÚNICAMENTE los comprobantes de Nota de Crédito
                if (isNC) return false;
            }

            if (subTab === 'credit_notes') {
                // Notas de Crédito: Muestra ÚNICAMENTE las Notas de Crédito emitidas
                if (!isNC) return false;
            }

            if (statusFilter !== 'ALL') {
                if (statusFilter === 'ACCEPTED' && !isAccepted) return false;
                if (statusFilter === 'VOIDED' && !isVoided) return false;
                if (statusFilter === 'PENDING' && (isAccepted || isVoided)) return false;
            }

            if (searchTerm) {
                const term = searchTerm.toUpperCase();
                const num = (t.documentNumber || '').toUpperCase();
                const name = (t.entityName || '').toUpperCase();
                const doc = (t.entityDocNumber || '').toUpperCase();
                return num.includes(term) || name.includes(term) || doc.includes(term);
            }
            return true;
        });
    }, [currentSectionTrxs, subTab, statusFilter, searchTerm]);

    // Metrics calculations
    const metrics = useMemo(() => {
        const trxs = currentSectionTrxs;
        const totalFacturas = trxs.filter(t => t.trxType !== 'credit_note' && (t.sunatStatus === 'ACCEPTED' || t.sunatStatus === 'ACEPTADO')).reduce((acc, t) => acc + (t.totalAmount || 0), 0);
        const totalNC = trxs.filter(t => t.trxType === 'credit_note' || t.sunatStatus === 'VOIDED' || t.sunatStatus === 'ANULADO').reduce((acc, t) => acc + (t.totalAmount || 0), 0);
        const countFacturas = trxs.filter(t => t.trxType !== 'credit_note').length;
        const countNC = trxs.filter(t => t.trxType === 'credit_note' || t.sunatStatus === 'VOIDED' || t.sunatStatus === 'ANULADO').length;
        const neto = totalFacturas - totalNC;

        return { totalFacturas, totalNC, countFacturas, countNC, neto };
    }, [currentSectionTrxs]);

    const handleEmitirNotaCredito = async () => {
        if (!creditNoteTrx) return;
        setIsSubmitting(true);
        try {
            const res = await FacturacionService.emitirNotaCredito(Number(creditNoteTrx.id), ncReasonCode, ncReasonDesc);
            if (res.success) {
                toast.success(`Nota de Crédito ${res.nc_document_number || ''} emitida con éxito.\n\nLa transacción fue ANULADA y el stock ha sido restaurado.`);
                setCreditNoteTrx(null);
                await loadData(true);
            } else {
                toast.error(`Error al emitir Nota de Crédito: ${res.message || 'Procesado'}`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error de comunicación al emitir Nota de Crédito: ' + (error?.response?.data?.detail || error?.message || 'Error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Main */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                        <FileText className="w-7 h-7 text-blue-700" />
                        Control General de Facturación SUNAT
                    </h2>
                    <p className="text-sm text-slate-600 font-bold">Auditoría centralizada de facturas, boletas y notas de crédito de RUC 10 y RUC 20.</p>
                </div>

                {/* Section Switcher */}
                <div className="flex bg-slate-200 p-1.5 rounded-2xl gap-1">
                    <button
                        onClick={() => { setActiveSection('ruc10'); setSubTab('invoices'); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all ${activeSection === 'ruc10' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>RUC 10 (Persona / Intermediario)</span>
                    </button>
                    <button
                        onClick={() => { setActiveSection('ruc20'); setSubTab('invoices'); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-lg transition-all ${activeSection === 'ruc20' ? 'bg-white text-purple-900 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span>RUC 20 (COMERCIAL URBANTECH)</span>
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-500 font-extrabold text-[11px] uppercase">
                        <span>Total Facturado</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900">S/ {metrics.totalFacturas.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{metrics.countFacturas} comprobantes emitidos</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center text-rose-600 font-extrabold text-[11px] uppercase">
                        <span>Notas de Crédito / Anulado</span>
                        <FileMinus className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-black font-mono text-rose-700">S/ {metrics.totalNC.toFixed(2)}</div>
                    <div className="text-[10px] text-rose-500 font-bold">{metrics.countNC} notas de crédito registradas</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center text-blue-600 font-extrabold text-[11px] uppercase">
                        <span>Neto Cobrado</span>
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black font-mono text-blue-900">S/ {metrics.neto.toFixed(2)}</div>
                    <div className="text-[10px] text-blue-600 font-bold">Monto real efectivo en caja</div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-2">
                    <div className="flex justify-between items-center text-slate-400 font-extrabold text-[11px] uppercase">
                        <span>Empresa Activa</span>
                        <Building2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-base font-black truncate">{activeSection === 'ruc10' ? 'DIAZ ORELLANA KATHERIN QUELYN' : 'COMERCIAL URBANTECH - ATALAYA E.I.R.L.'}</div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold">RUC: {activeSection === 'ruc10' ? '10710425162' : '20615233731'}</div>
                </div>
            </div>

            {/* Subtabs Bar & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                {/* Subtabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setSubTab('invoices')}
                        className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${subTab === 'invoices' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Comprobantes Emitidos ({currentSectionTrxs.filter(t => !t.trxType?.includes('credit_note') && !t.documentType?.toUpperCase().includes('CREDITO') && !t.documentNumber?.toUpperCase().startsWith('NC')).length})
                    </button>
                    <button
                        onClick={() => setSubTab('credit_notes')}
                        className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${subTab === 'credit_notes' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Notas de Crédito ({currentSectionTrxs.filter(t => t.trxType?.includes('credit_note') || t.documentType?.toUpperCase().includes('CREDITO') || t.documentNumber?.toUpperCase().startsWith('NC')).length})
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar serie, ruc o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-500 bg-white"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="py-2 px-3 text-xs border-2 border-slate-200 rounded-xl font-bold text-slate-800 bg-white"
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="ACCEPTED">Aceptados SUNAT</option>
                        <option value="VOIDED">Anulados / N. Crédito</option>
                        <option value="PENDING">Pendientes</option>
                    </select>

                    <button
                        onClick={() => loadData(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Actualizar Datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 font-black tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Fecha / Comprobante</th>
                                <th className="px-6 py-4 text-center">Etiqueta</th>
                                <th className="px-6 py-4">Cliente / Receptor</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4 text-right">Monto Total</th>
                                <th className="px-6 py-4 text-center">Estado SUNAT</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={`skel-${i}`} className="animate-pulse">
                                        <td className="px-6 py-4 space-y-2"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded mx-auto"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-200 rounded-xl mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase italic tracking-widest">
                                        No hay comprobantes registrados en este apartado.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((t) => {
                                    const isAccepted = t.sunatStatus === 'ACCEPTED' || t.sunatStatus === 'ACEPTADO';
                                    const isVoided = t.sunatStatus === 'VOIDED' || t.sunatStatus === 'ANULADO';
                                    const docTypeUpper = (t.documentType || '').toUpperCase();
                                    const docNumUpper = (t.documentNumber || '').toUpperCase();
                                    const isBoleta = docTypeUpper.includes('BOLETA') || docNumUpper.startsWith('B') || docNumUpper.startsWith('FB') || docNumUpper.startsWith('BC');
                                    const isNC = t.trxType === 'credit_note' || docTypeUpper.includes('CREDITO') || docNumUpper.startsWith('NC');

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-900">{new Date(t.date).toLocaleDateString()}</div>
                                                <div className="font-mono font-bold text-slate-600 text-[11px] mt-0.5">
                                                    {formatDocumentType(t.documentType, t.documentNumber, t.trxType)} {t.documentNumber}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isNC ? (
                                                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-rose-300">
                                                        Nota de Crédito
                                                    </span>
                                                ) : isBoleta ? (
                                                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-purple-300">
                                                        Boleta
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-300">
                                                        Factura
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {activeSection === 'ruc10' ? (
                                                    <div>
                                                        <div className="font-black text-slate-800 uppercase">COMERCIAL URBANTECH - ATALAYA E.I.R.L.</div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">RUC: 20615233731</div>
                                                        <div className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">Emisor RUC 10: {t.entityName || 'N/A'}</div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="font-black text-slate-800 uppercase">{t.entityName || 'CLIENTE'}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">Doc: {t.entityDocNumber || 'SIN DOC'}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-600">
                                                {t.items?.length || 1} pzs
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 font-mono text-sm">
                                                S/ {(t.totalAmount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isAccepted ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-emerald-300">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Aceptado
                                                    </span>
                                                ) : isVoided ? (
                                                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-rose-300">
                                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Anulado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-300">
                                                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center gap-1.5 flex-wrap">
                                                    {/* Botón 1: Visualizar / Vista Previa */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewingTrx(t)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-[11px] rounded-xl border border-purple-300 cursor-pointer shadow-xs transition-all hover:scale-105"
                                                        title="Visualizar Comprobante (Descargar PDF / XML)"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-purple-700" />
                                                        <span>Ver</span>
                                                    </button>

                                                    {/* Botón 2: Emitir Nota de Crédito (Solo en Comprobantes Emitidos Aceptados) */}
                                                    {isAccepted && !isNC && subTab === 'invoices' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCreditNoteTrx(t)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-[11px] rounded-xl border border-rose-300 cursor-pointer shadow-xs transition-all hover:scale-105"
                                                            title="Emitir Nota de Crédito"
                                                        >
                                                            <FileMinus className="w-3.5 h-3.5 text-rose-600" />
                                                            <span>Nota Crédito</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL NOTA DE CRÉDITO */}
            {creditNoteTrx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setCreditNoteTrx(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-rose-900 p-5 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <FileText className="w-6 h-6 text-rose-300" />
                                <div>
                                    <h3 className="font-extrabold uppercase tracking-wider text-sm">Emitir Nota de Crédito</h3>
                                    <p className="text-xs text-rose-200 mt-0.5">Anulación legal de comprobante SUNAT</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCreditNoteTrx(null)}
                                className="bg-rose-950 hover:bg-rose-800 p-2 rounded-xl text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-900 space-y-1">
                                <div className="font-black uppercase text-sm">Comprobante Afectado: {formatDocumentType(creditNoteTrx.documentType, creditNoteTrx.documentNumber, creditNoteTrx.trxType)} {creditNoteTrx.documentNumber}</div>
                                <div>Monto Total: <span className="font-mono font-black text-rose-950">S/ {creditNoteTrx.totalAmount.toFixed(2)}</span></div>
                                <div className="text-[10px] text-rose-700 font-bold mt-2">
                                    ⚠️ Al emitir la Nota de Crédito, el comprobante quedará ANULADO en SUNAT y el stock volverá al almacén correspondiente.
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 uppercase">Motivo de Anulación SUNAT</label>
                                <select
                                    value={ncReasonCode}
                                    onChange={(e) => {
                                        setNcReasonCode(e.target.value);
                                        if (e.target.value === '01') setNcReasonDesc('ANULACION DE LA OPERACION');
                                        else if (e.target.value === '02') setNcReasonDesc('ANULACION POR ERROR EN EL RUC');
                                        else if (e.target.value === '06') setNcReasonDesc('DEVOLUCION TOTAL');
                                    }}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-xs bg-white font-bold text-slate-800"
                                >
                                    <option value="01">01 - Anulación de la operación</option>
                                    <option value="02">02 - Anulación por error en el RUC</option>
                                    <option value="06">06 - Devolución total de bienes</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 uppercase">Sustento / Descripción del Motivo</label>
                                <input
                                    type="text"
                                    value={ncReasonDesc}
                                    onChange={(e) => setNcReasonDesc(e.target.value.toUpperCase())}
                                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-xs bg-white font-bold text-slate-800 uppercase"
                                    placeholder="Ingrese sustento..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreditNoteTrx(null)}
                                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEmitirNotaCredito}
                                    disabled={isSubmitting}
                                    className={`w-1/2 py-3 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-xs uppercase shadow-lg cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <FileText className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                                    <span>{isSubmitting ? 'Procesando...' : 'Confirmar y Emitir'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VISTA PREVIA COMPROBANTE (SUNAT FORMAT) */}
            {previewingTrx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setPreviewingTrx(null)}
                >
                    <div
                        className="bg-white w-full max-w-4xl h-[95vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-slate-950 p-5 flex justify-between items-center text-white print:hidden border-b border-slate-800">
                            <h3 className="font-extrabold uppercase tracking-wider text-xs flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-400" /> {formatDocumentType(previewingTrx.documentType, previewingTrx.documentNumber, previewingTrx.trxType)}: {previewingTrx.documentNumber}
                            </h3>
                            <div className="flex items-center gap-2">
                                {(previewingTrx.sunatStatus === 'ACCEPTED' || previewingTrx.sunatStatus === 'ACEPTADO') && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => FacturacionService.descargarPdfBlob(Number(previewingTrx.id))}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5" /> PDF SUNAT
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => FacturacionService.descargarXmlBlob(Number(previewingTrx.id))}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <FileCode className="w-3.5 h-3.5" /> XML Firmado
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Imprimir
                                </button>
                                <button
                                    onClick={() => setPreviewingTrx(null)}
                                    className="bg-slate-800 hover:bg-red-600 p-2 rounded-xl text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body / Receipt Layout */}
                        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6 relative">
                            {/* Watermark Logo Background */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.05] z-0 overflow-hidden">
                                <img src="/WT_logo2.png" alt="Watermark Logo" className="w-[450px] object-contain" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                {/* Top Header: Logo + Emisor & Comprobante Box */}
                                <div className="flex justify-between items-start gap-4 border-b border-slate-200 pb-6">
                                    <div className="flex items-center gap-4">
                                        <img src="/WT_logo2.png" alt="Logo" className="h-16 w-auto object-contain" />
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                                {activeSection === 'ruc10'
                                                    ? (previewingTrx.entityName || 'DIAZ ORELLANA KATHERIN QUELYN')
                                                    : 'COMERCIAL URBANTECH - ATALAYA E.I.R.L.'}
                                            </h2>
                                            <p className="text-xs text-slate-600 font-bold uppercase mt-0.5">
                                                R.U.C. N° {activeSection === 'ruc10'
                                                    ? (previewingTrx.entityDocNumber || '10710425162')
                                                    : '20615233731'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                                                {activeSection === 'ruc10'
                                                    ? (previewingTrx.entityAddress || 'JR IQUITOS 258 MZ.12 - RAYMONDI - ATALAYA - UCAYALI')
                                                    : 'JR IQUITOS 258 MZ.12 - RAYMONDI - ATALAYA - UCAYALI'}
                                            </p>
                                            <span className="inline-block mt-2 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                                Ley Amazonía N° 27037 - Exonerado del IGV
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-2 border-slate-900 rounded-2xl p-4 text-center min-w-[220px] bg-slate-50">
                                        <div className="font-mono font-black text-slate-900 text-sm">
                                            R.U.C. {activeSection === 'ruc10'
                                                ? (previewingTrx.entityDocNumber || '10710425162')
                                                : '20615233731'}
                                        </div>
                                        <div className="bg-slate-900 text-white font-black text-xs py-1 my-2 uppercase rounded-lg">
                                                    {formatDocumentType(previewingTrx.documentType, previewingTrx.documentNumber, previewingTrx.trxType)}
                                        </div>
                                        <div className="font-mono font-black text-slate-900 text-sm tracking-wider">
                                            {previewingTrx.documentNumber}
                                        </div>
                                    </div>
                                </div>

                                {/* Customer / Buyer Info */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-bold">
                                    <div>
                                        <span className="text-slate-500 uppercase text-[10px]">Cliente / Receptor:</span>
                                        <div className="text-slate-900 font-black uppercase text-sm mt-0.5">
                                            {activeSection === 'ruc10'
                                                ? 'COMERCIAL URBANTECH - ATALAYA E.I.R.L.'
                                                : (previewingTrx.entityName || 'CLIENTE')}
                                        </div>
                                        <div className="text-slate-600 font-mono mt-0.5">
                                            R.U.C. / D.N.I. {activeSection === 'ruc10'
                                                ? '20615233731'
                                                : (previewingTrx.entityDocNumber || '—')}
                                        </div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase mt-1 flex items-center gap-1">
                                            <span className="text-slate-400 font-medium">DIRECCIÓN:</span> {activeSection === 'ruc10'
                                                ? 'JR IQUITOS 258 MZ.12 - RAYMONDI - ATALAYA - UCAYALI'
                                                : (previewingTrx.entityAddress || '—')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500 uppercase text-[10px]">Fecha de Emisión:</span>
                                        <div className="text-slate-900 font-black text-sm mt-0.5">
                                            {previewingTrx.date ? new Date(previewingTrx.date).toLocaleDateString() : '—'}
                                        </div>
                                        <div className="text-slate-600 uppercase mt-0.5">MONEDA: SOLES (PEN)</div>
                                    </div>
                                </div>

                                {/* Sección Nota de Crédito: Comprobante Afectado & Motivo/Sustento */}
                                {(() => {
                                    const isNCModal = previewingTrx.trxType?.includes('credit_note') ||
                                                      (previewingTrx.documentType && previewingTrx.documentType.toUpperCase().includes('CREDITO')) ||
                                                      (previewingTrx.documentNumber && previewingTrx.documentNumber.startsWith('NC'));
                                    if (!isNCModal) return null;

                                    const desc = previewingTrx.sunat_description || previewingTrx.sunatDescription || '';
                                    let affectedDoc = '—';
                                    if (desc.includes('para ')) {
                                        const raw = desc.split('para ')[1] || '';
                                        affectedDoc = raw.split('|')[0].trim();
                                    }

                                    let ncReason = '01 - ANULACIÓN DE LA OPERACIÓN';
                                    if (desc.includes('Motivo: ')) {
                                        ncReason = desc.split('Motivo: ')[1].trim();
                                    } else if (previewingTrx.exemptionReason) {
                                        ncReason = previewingTrx.exemptionReason;
                                    }

                                    return (
                                        <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl text-xs space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-rose-200 pb-2">
                                                <div className="flex items-center gap-2 text-rose-900 font-extrabold uppercase">
                                                    <FileMinus className="w-4 h-4 text-rose-600 shrink-0" />
                                                    <span>Comprobante Afectado / Modificado:</span>
                                                    <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-rose-300 font-black text-rose-950 text-xs">
                                                        {affectedDoc}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-black text-rose-800 uppercase bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                                                    {formatDocumentType(undefined, affectedDoc, undefined)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-rose-900 font-bold">
                                                <span className="text-rose-700 uppercase text-[10px] shrink-0 font-extrabold">Sustento / Descripción del Motivo:</span>
                                                <div className="font-mono font-extrabold uppercase bg-white px-3 py-1.5 rounded-xl border border-rose-200 flex-1 text-slate-900 text-xs tracking-tight">
                                                    {ncReason}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Items Table */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Cant.</th>
                                                <th className="px-4 py-3">Descripción</th>
                                                <th className="px-4 py-3 text-right">Precio Unit.</th>
                                                <th className="px-4 py-3 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {previewingItems.length > 0 ? (
                                                previewingItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-mono font-bold">{item.quantity || 1}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 uppercase">{item.productName || 'PRODUCTO'}</td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold">S/ {(item.unitPriceBase || 0).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900">S/ {(item.totalBase || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono font-bold">1</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800 uppercase">{formatDocumentType(previewingTrx.documentType, previewingTrx.documentNumber, previewingTrx.trxType)} {previewingTrx.documentNumber}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold">S/ {(previewingTrx.totalAmount || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">S/ {(previewingTrx.totalAmount || 0).toFixed(2)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom Summary & Amount in Words */}
                                <div className="grid grid-cols-3 gap-6 items-end pt-4 border-t border-slate-200">
                                    <div className="col-span-2 space-y-3">
                                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 font-extrabold text-xs text-slate-800 uppercase font-mono tracking-tight">
                                            {numberToWords(previewingTrx.totalAmount || 0)}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                                    `${activeSection === 'ruc10' ? '10710425162' : '20615233731'}|01|${previewingTrx.documentNumber}|0|${previewingTrx.totalAmount}|${previewingTrx.date}|6|${previewingTrx.entityDocNumber || '20615233731'}|`
                                                )}`}
                                                alt="QR Code"
                                                className="w-20 h-20 border border-slate-200 rounded-xl p-1 bg-white"
                                            />
                                            <div className="text-[10px] text-slate-500 space-y-1">
                                                <p className="font-bold uppercase text-slate-700">Comprobante emitido mediante el Sistema de Facturación Electrónica de SUNAT</p>
                                                <p>Representación impresa de la Factura Electrónica.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex justify-between">
                                            <span>Op. Gravadas:</span>
                                            <span className="font-mono font-black">S/ 0.00</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-800">
                                            <span>Op. Exoneradas:</span>
                                            <span className="font-mono font-black">S/ {(previewingTrx.totalAmount || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>IGV (0%):</span>
                                            <span className="font-mono font-black">S/ 0.00</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-900 pt-2 border-t border-slate-300 font-black">
                                            <span>Importe Total:</span>
                                            <span className="font-mono font-black text-emerald-950">S/ {(previewingTrx.totalAmount || 0).toFixed(2)}</span>
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
