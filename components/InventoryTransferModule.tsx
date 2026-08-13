import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductStatus, Intermediary, Transaction, ReceiptType } from '../types';
import { BackendService } from '../services/backendService';
import { FacturacionService } from '../services/facturacionService';
import { fetchRuc } from '../services/rucService';
import { ArrowRight, Calculator, RefreshCw, Upload, FileText, CheckCircle, Package, Building2, Search, Calendar, History, Camera, X, Printer, ShieldCheck, UserCheck, FileCheck, Trash2, Eye, Download, Send, FileCode, Clock, AlertCircle } from 'lucide-react';
import { useAlert } from './ui/Alert';
import { ConfirmModal } from './ui/ConfirmModal';

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
    words += (thousands === 1 ? 'UN MIL ' : convertGroup(thousands) + ' MIL ');
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

export const InventoryTransferModule: React.FC = () => {
    const toast = useAlert();
    const [activeTab, setActiveTab] = useState<'ruc10' | 'sunat_ruc10' | 'ruc20' | 'history'>('ruc10');
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [transferCalc, setTransferCalc] = useState({ base: 0, igv: 0, total: 0 });
    const [config, setConfig] = useState<any>(null);
    const [viewingTrx, setViewingTrx] = useState<Transaction | null>(null);
    const [previewingTrx, setPreviewingTrx] = useState<Transaction | null>(null);
    const [sustainingTrx, setSustainingTrx] = useState<Transaction | null>(null);
    const [creditNoteTrx, setCreditNoteTrx] = useState<Transaction | null>(null);
    const [ncReasonCode, setNcReasonCode] = useState('01');
    const [ncReasonDesc, setNcReasonDesc] = useState('ANULACION DE LA OPERACION');
    const [emittingTrxId, setEmittingTrxId] = useState<string | null>(null);
    
    const [docSeries, setDocSeries] = useState('FF01');
    const [docCorrelative, setDocCorrelative] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today
    const [selectedIntermediaryId, setSelectedIntermediaryId] = useState('');
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emitterRucInfo, setEmitterRucInfo] = useState<{ ruc: string; razonSocial: string; direccion: string } | null>(null);
    const [receiverRucInfo, setReceiverRucInfo] = useState<{ ruc: string; razonSocial: string; direccion: string } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

    const OFFICIAL_COMPANY_ADDRESS = 'JR. IQUITOS NRO. 258 MZ. 12 LOTE. 02 RAYMONDI - ATALAYA - UCAYALI';

    useEffect(() => {
        if (previewingTrx) {
            // 1. Emisor RUC 10 (Intermediario configurado)
            const inter = intermediaries.find(i => 
                i.id === previewingTrx.entityDocNumber || 
                i.docNumber === previewingTrx.entityDocNumber || 
                i.rucNumber === previewingTrx.entityDocNumber
            );

            const rawDoc = (inter?.rucNumber || inter?.docNumber || previewingTrx.entityDocNumber || '10710425162').trim();
            const targetRuc = rawDoc.length === 11 ? rawDoc : '10710425162';
            const fallbackName = inter?.fullName || previewingTrx.entityName || 'DIAZ ORELLANA KATHERIN QUELYN';
            const fallbackAddr = inter?.address || previewingTrx.entityAddress || OFFICIAL_COMPANY_ADDRESS;

            // Establecer Emisor síncronamente de inmediato
            setEmitterRucInfo({
                ruc: targetRuc,
                razonSocial: fallbackName,
                direccion: fallbackAddr
            });

            // Establecer Receptor síncronamente de inmediato (Sin re-renders asíncronos posteriores)
            setReceiverRucInfo({
                ruc: '20615233731',
                razonSocial: 'COMERCIAL URBANTECH - ATALAYA E.I.R.L.',
                direccion: OFFICIAL_COMPANY_ADDRESS
            });

            // Solo si el emisor no tiene dirección previa, refinar en segundo plano
            if (!inter?.address && !previewingTrx.entityAddress) {
                fetchRuc(targetRuc)
                    .then(info => {
                        const dirParts = [info.direccion, info.distrito, info.provincia, info.departamento].filter(Boolean).join(' - ');
                        if (dirParts) {
                            setEmitterRucInfo(prev => prev ? { ...prev, direccion: dirParts } : null);
                        }
                    })
                    .catch(() => {});
            }
        } else {
            setEmitterRucInfo(null);
            setReceiverRucInfo(null);
        }
    }, [previewingTrx, intermediaries]);

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
            const [prods, inters, trxs, cfg] = await Promise.all([
                BackendService.getProducts(forceRefresh),
                BackendService.getIntermediaries(forceRefresh),
                BackendService.getTransactions('transfer', forceRefresh),
                BackendService.getConfig(forceRefresh)
            ]);
            setProducts(prods);
            setIntermediaries(inters);
            setTransactions(trxs);
            setConfig(cfg);
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        loadData(false);

        const handleRealtime = () => {
            loadData(true);
        };

        window.addEventListener('wasitech_product_change', handleRealtime);
        window.addEventListener('wasitech_purchase_change', handleRealtime);

        return () => {
            window.removeEventListener('wasitech_product_change', handleRealtime);
            window.removeEventListener('wasitech_purchase_change', handleRealtime);
        };
    }, []);

    useEffect(() => {
        if (transactions.length > 0) {
            setDocCorrelative(getNextCorrelative(transactions, docSeries));
        }
    }, [docSeries, transactions]);

    const ruc10Products = useMemo(() => products.filter(p => 
        p.status === ProductStatus.IN_STOCK_RUC10 && 
        (p.brand?.toUpperCase().includes(searchTerm) || 
         p.model?.toUpperCase().includes(searchTerm) || 
         p.serialNumber?.toUpperCase().includes(searchTerm))
    ), [products, searchTerm]);
    const ruc20Products = useMemo(() => products.filter(p => 
        p.status === ProductStatus.TRANSFERRED_RUC20 && 
        (p.brand?.toUpperCase().includes(searchTerm) || 
         p.model?.toUpperCase().includes(searchTerm) || 
         p.serialNumber?.toUpperCase().includes(searchTerm))
    ), [products, searchTerm]);

    const selectedTransferProducts = useMemo(() => products.filter(
        p => selectedProductIds.includes(p.id) && p.status === ProductStatus.IN_STOCK_RUC10
    ), [products, selectedProductIds]);

    const sunatRuc10Transactions = useMemo(() => {
        return transactions.filter(t => t.trxType === 'transfer');
    }, [transactions]);

    const pendingVoucherTransactions = useMemo(() => {
        return transactions.filter(t => t.trxType === 'transfer' && (t.sunatStatus === 'ACCEPTED' || t.sunatStatus === 'ACEPTADO') && !t.voucherUrl);
    }, [transactions]);

    const calcForProduct = (product: Product) => {
        const totalCost = product.totalCost || 0;
        const marginType = config?.ruc10MarginType;
        const margin = config?.ruc10Margin || 0;
        const rentaRate = config?.rentaRate || 0;
        const profit = marginType === 'PERCENT' ? (totalCost * margin) : margin;
        const divisor = 1 - rentaRate;
        const base = divisor > 0 ? (totalCost + profit) / divisor : (totalCost + profit);
        const igv = base * effectiveIgvRate;
        const total = base + igv;
        return { base, igv, total };
    };

    useEffect(() => {
        if (!config) return;
        if (selectedTransferProducts.length === 0) {
            setTransferCalc({ base: 0, igv: 0, total: 0 });
            setSelectedIntermediaryId('');
            setVoucherFile(null);
            setVoucherPreview(null);
            setInvoiceFile(null);
            return;
        }
        const totals = selectedTransferProducts.reduce(
            (acc, p) => {
                const c = calcForProduct(p);
                return {
                    base: acc.base + c.base,
                    igv: acc.igv + c.igv,
                    total: acc.total + c.total,
                };
            },
            { base: 0, igv: 0, total: 0 }
        );
        setTransferCalc(totals);
        if (!selectedIntermediaryId) {
            setSelectedIntermediaryId(selectedTransferProducts[0].intermediaryId || '');
        }
    }, [config, effectiveIgvRate, selectedIntermediaryId, selectedTransferProducts]);

    const handleSelectProduct = (product: Product) => {
        if (activeTab !== 'ruc10') return;

        const already = selectedProductIds.includes(product.id);
        if (already) {
            setSelectedProductIds(prev => prev.filter(id => id !== product.id));
            return;
        }

        const incomingIntermediary = product.intermediaryId || '';
        if (selectedProductIds.length > 0 && selectedIntermediaryId && incomingIntermediary && incomingIntermediary !== selectedIntermediaryId) {
            toast.warning('Solo puede transferir productos del mismo propietario (Emisor RUC 10) en una sola factura.');
            return;
        }

        setSelectedProductIds(prev => [...prev, product.id]);
        if (!selectedIntermediaryId) {
            setSelectedIntermediaryId(incomingIntermediary);
        }
        setTransferDate(new Date().toISOString().slice(0, 10));
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
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Producto',
            message: `¿Estás seguro de eliminar el producto ${product.brand} ${product.model}? Esta acción no se puede deshacer.`,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    await BackendService.deleteProduct(product.id);
                    await loadData(true);
                    window.dispatchEvent(new CustomEvent('wasitech_product_change'));
                    window.dispatchEvent(new CustomEvent('wasitech_purchase_change'));
                } catch (error) {
                    console.error("Error deleting product", error);
                    toast.error("Error al eliminar el producto");
                }
            }
        });
    };

    const handleGenerarPedidoTransferencia = async () => {
        if (selectedTransferProducts.length === 0) { toast.warning("Seleccione al menos un producto para generar el pedido."); return; }
        if (!selectedIntermediaryId) { toast.warning("Seleccione el Emisor RUC 10."); return; }

        setIsSubmitting(true);
        const docNumber = `${docSeries} - ${docCorrelative}`;
        
        try {
            const trxItems = selectedTransferProducts.map(p => {
                const c = calcForProduct(p);
                return {
                    productId: p.id,
                    productName: `${p.category || ''} ${p.brand || ''} ${p.model || ''} - ${p.idType === 'IMEI' ? 'IMEI' : 'S/N'}: ${p.serialNumber || ''}`.trim(),
                    quantity: 1,
                    unitPriceBase: c.base,
                    totalBase: c.base
                };
            });

            const inter = intermediaries.find(i => i.id === selectedIntermediaryId || i.docNumber === selectedIntermediaryId || i.rucNumber === selectedIntermediaryId);
            const emitterName = inter?.fullName || getIntermediaryName(selectedIntermediaryId);
            const emitterDoc = inter?.rucNumber || inter?.docNumber || selectedIntermediaryId;
            let emitterAddr = inter?.address || '';

            if (!emitterAddr && emitterDoc && emitterDoc.length === 11) {
                try {
                    const rucData = await fetchRuc(emitterDoc);
                    if (rucData?.direccion) {
                        emitterAddr = [rucData.direccion, rucData.distrito, rucData.provincia, rucData.departamento].filter(Boolean).join(' - ');
                    }
                } catch (e) {
                    console.error("Error fetching emitter RUC address", e);
                }
            }

            // 1. Crear transacción de transferencia en estado PENDIENTE de envío a SUNAT
            const trx = await BackendService.createTransaction({
                trxType: 'transfer',
                documentType: ReceiptType.FACTURA,
                documentNumber: docNumber,
                entityName: emitterName,
                entityDocNumber: emitterDoc,
                entityAddress: emitterAddr,
                baseAmount: transferCalc.base,
                igvAmount: transferCalc.igv,
                totalAmount: transferCalc.total,
                items: trxItems
            });

            // 2. Actualizar productos a estado temporal IN_TRANSFER_PENDING_VOUCHER
            await Promise.all(
                selectedTransferProducts.map(async p => {
                    const c = calcForProduct(p);
                    await BackendService.updateProduct(p.id, {
                        status: ProductStatus.IN_TRANSFER_PENDING_VOUCHER,
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

            toast.success(`Pedido de transferencia ${docNumber} generado exitosamente.\n\nProceda a la pestaña 'Estado SUNAT RUC 10' para autorizar y emitir a SUNAT.`);
            setSelectedProductIds([]);
            await loadData(true);
            setActiveTab('sunat_ruc10');
            
        } catch (error: any) {
            console.error(error);
            toast.error("Error al generar pedido de transferencia: " + (error?.message || 'Error de conexión'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmitirSunatDesdeSubdashboard = async (trx: Transaction) => {
        setEmittingTrxId(String(trx.id));
        try {
            const sunatRes = await FacturacionService.emitirComprobanteSunat(Number(trx.id));
            if (sunatRes.success || (sunatRes.sunat_status as string) === 'ACEPTADO' || sunatRes.sunat_status === 'ACCEPTED') {
                toast.success(`Comprobante ${trx.documentNumber} EMITIDO Y ACEPTADO por SUNAT.\n\nAhora puede previsualizar la factura o ir a 'Pendientes de Sustento' para adjuntar el Voucher.`);
            } else {
                toast.info(`Respuesta de SUNAT: ${sunatRes.description || (sunatRes as any).message || 'Procesado'}`);
            }
            await loadData(true);
        } catch (error: any) {
            console.error("Error al emitir a SUNAT:", error);
            toast.error("Error al emitir a SUNAT: " + (error?.message || 'Error de comunicación'));
        } finally {
            setEmittingTrxId(null);
        }
    };

    const handleConfirmSustentoVoucher = async () => {
        if (!sustainingTrx) return;
        if (!voucherFile) { toast.warning("Seleccione el archivo del Voucher Bancario de pago."); return; }

        setIsSubmitting(true);
        try {
            // 1. Subir Voucher Bancario al backend
            await BackendService.uploadTransactionFile(String(sustainingTrx.id), voucherFile, 'voucher');

            // 2. Buscar productos pertenecientes a esta transacción y transferirlos a RUC 20
            const trxItemProductIds = (sustainingTrx.items || []).map(i => i.productId).filter(Boolean);
            
            await Promise.all(
                trxItemProductIds.map(async pid => {
                    await BackendService.updateProduct(pid, {
                        status: ProductStatus.TRANSFERRED_RUC20
                    });
                })
            );

            toast.success(`Transferencia ${sustainingTrx.documentNumber} sustentada con éxito.\n\nLos equipos han sido transferidos a Almacén RUC 20 y están disponibles para la venta.`);
            
            setSustainingTrx(null);
            setVoucherFile(null);
            setVoucherPreview(null);
            
            await loadData(true);
            setActiveTab('ruc20');
        } catch (error: any) {
            console.error(error);
            toast.error("Error al procesar sustento por voucher: " + (error?.message || 'Error de conexión'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmitirNotaCredito = async () => {
        if (!creditNoteTrx) return;
        setIsSubmitting(true);
        try {
            const res = await FacturacionService.emitirNotaCredito(Number(creditNoteTrx.id), ncReasonCode, ncReasonDesc);
            if (res.success) {
                toast.success(`Nota de Crédito ${res.nc_document_number || ''} emitida con éxito.\n\nLa transacción fue ANULADA y los equipos retornaron al Almacén RUC 10.`);
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

    const handleDeleteTransaction = async (trxOrId: Transaction | string) => {
        let trx: Transaction | undefined;
        let trxId: string;
        if (typeof trxOrId === 'string') {
            trxId = trxOrId;
            trx = transactions.find(t => String(t.id) === trxId);
        } else {
            trx = trxOrId;
            trxId = String(trx.id);
        }

        const isAccepted = trx?.sunatStatus === 'ACCEPTED' || trx?.sunatStatus === 'ACEPTADO';
        if (isAccepted && trx) {
            toast.warning('No se puede eliminar directamente una factura aceptada por la SUNAT.\n\nPara anular legalmente este comprobante y restaurar el stock a RUC 10, debe emitir una Nota de Crédito.');
            setCreditNoteTrx(trx);
            return;
        }

        const docNum = trx?.documentNumber || trxId;
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Pedido de Transferencia',
            message: `¿Seguro que desea eliminar el pedido ${docNum}? Los equipos volverán al stock de Almacén RUC 10.`,
            variant: 'warning',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    await BackendService.deleteTransaction(trxId);
                    toast.success('Pedido de transferencia eliminado. Los productos retornaron a Almacén RUC 10.');
                    await loadData(true);
                } catch (error: any) {
                    console.error(error);
                    toast.error(error?.response?.data?.detail || 'Error al eliminar');
                }
            }
        });
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
                <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('ruc10'); setSelectedProductIds([]); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'ruc10' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Package className="w-4 h-4" /> Almacén RUC 10
                    </button>
                    <button
                        onClick={() => { setActiveTab('sunat_ruc10'); setSelectedProductIds([]); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'sunat_ruc10' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Estado SUNAT RUC 10</span>
                        {sunatRuc10Transactions.filter(t => t.sunatStatus !== 'ACCEPTED' && t.sunatStatus !== 'ACEPTADO').length > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                {sunatRuc10Transactions.filter(t => t.sunatStatus !== 'ACCEPTED' && t.sunatStatus !== 'ACEPTADO').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab('ruc20'); setSelectedProductIds([]); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'ruc20' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" /> Almacén RUC 20
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setSelectedProductIds([]); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <History className="w-4 h-4" /> Historial
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`space-y-4 ${activeTab === 'ruc10' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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
                                                            <div className="text-[10px] text-slate-500">{formatDocumentType(t.documentType, t.documentNumber, t.trxType)} {t.documentNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.entityName}</td>
                                                        <td className="px-6 py-4 text-xs">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setViewingTrx(t)}
                                                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl transition-all border border-blue-200 cursor-pointer shadow-xs"
                                                                 title="Ver Lista Completa de Productos"
                                                             >
                                                                 <Eye className="w-4 h-4 text-blue-600" />
                                                                 <span>Ver Productos ({t.items?.length || 0})</span>
                                                             </button>
                                                         </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">S/ {t.totalAmount.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex justify-center gap-2 items-center">
                                                                {t.voucherUrl && (
                                                                    <a href={t.voucherUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200" title="Ver Voucher Bancario">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </a>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewingTrx(t)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-xs rounded-xl transition-all border border-purple-300 cursor-pointer"
                                                                    title="Ver Vista Previa del Comprobante Generado"
                                                                >
                                                                    <Eye className="w-4 h-4 text-purple-700" />
                                                                    <span>Vista Previa</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={() => handleDeleteTransaction(t)}
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
                        ) : activeTab === 'sunat_ruc10' ? (
                            <div className="p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-slate-500 uppercase bg-blue-50 font-black tracking-widest border-b border-blue-200">
                                            <tr>
                                                <th className="px-6 py-3">Fecha / Pedido N°</th>
                                                <th className="px-6 py-3">Emisor RUC 10</th>
                                                <th className="px-6 py-3">Equipos</th>
                                                <th className="px-6 py-3 text-right">Monto Total</th>
                                                <th className="px-6 py-3 text-center">Estado SUNAT</th>
                                                <th className="px-6 py-3 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {isLoadingData ? (
                                                Array.from({ length: 3 }).map((_, i) => (
                                                    <tr key={`skeleton-sunat-${i}`} className="animate-pulse">
                                                        <td className="px-6 py-4 space-y-2"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                                                        <td className="px-6 py-4"><div className="h-8 w-32 bg-slate-200 rounded-xl"></div></td>
                                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                                                        <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                                                        <td className="px-6 py-4"><div className="h-9 w-32 bg-slate-200 rounded-xl mx-auto"></div></td>
                                                    </tr>
                                                ))
                                            ) : sunatRuc10Transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase italic tracking-widest">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <FileText className="w-10 h-10 text-blue-300" />
                                                            <span>No hay pedidos de transferencia RUC 10 registrados.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                sunatRuc10Transactions.map(t => {
                                                    const isAccepted = t.sunatStatus === 'ACCEPTED' || t.sunatStatus === 'ACEPTADO';
                                                    const isVoided = t.sunatStatus === 'VOIDED' || t.sunatStatus === 'ANULADO';
                                                    const isRejected = (t.sunatStatus as string) === 'REJECTED' || t.sunatStatus === 'RECHAZADO';
                                                    const isPending = !isAccepted && !isRejected && !isVoided;

                                                    return (
                                                        <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-black text-slate-900">{new Date(t.date).toLocaleDateString()}</div>
                                                                <div className="text-[10px] font-mono font-bold text-slate-600">{formatDocumentType(t.documentType, t.documentNumber, t.trxType)} {t.documentNumber}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                                                                {t.entityName}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingTrx(t)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl transition-all border border-blue-200 cursor-pointer shadow-xs"
                                                                    title="Ver Lista Completa de Productos"
                                                                >
                                                                    <Eye className="w-4 h-4 text-blue-600" />
                                                                    <span>Ver Productos ({t.items?.length || 0})</span>
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-900 font-mono text-base">
                                                                S/ {t.totalAmount.toFixed(2)}
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
                                                                ) : isRejected ? (
                                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-red-300">
                                                                        <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Rechazado
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-300">
                                                                        <Clock className="w-3.5 h-3.5 text-amber-600" /> P. Enviar
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isPending ? (
                                                                    <div className="flex justify-center items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEmitirSunatDesdeSubdashboard(t)}
                                                                            disabled={emittingTrxId === String(t.id)}
                                                                            className={`flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer ${emittingTrxId === String(t.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                        >
                                                                            <Send className={`w-3.5 h-3.5 ${emittingTrxId === String(t.id) ? 'animate-spin' : ''}`} />
                                                                            <span>{emittingTrxId === String(t.id) ? 'Emitiendo...' : 'Emitir a SUNAT'}</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteTransaction(t)}
                                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                                            title="Eliminar Pedido (Retornar a Almacén RUC 10)"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : isAccepted ? (
                                                                    <div className="flex justify-center gap-2 items-center flex-wrap">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewingTrx(t)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-xs rounded-xl transition-all border border-purple-300 cursor-pointer"
                                                                            title="Ver Vista Previa del Comprobante Generado"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-purple-700" />
                                                                         
                                                                        </button>
                                                                        {!t.voucherUrl && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSustainingTrx(t);
                                                                                    setVoucherFile(null);
                                                                                    setVoucherPreview(null);
                                                                                }}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                                                                                title="Adjuntar Voucher y Sustentar Transferencia"
                                                                            >
                                                                                <Upload className="w-3.5 h-3.5" />
                                                                                <span>Sustentar</span>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setCreditNoteTrx(t)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-xs rounded-xl transition-all border border-rose-300 cursor-pointer"
                                                                            title="Anular Factura con Nota de Crédito y Retornar Equipos a RUC 10"
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                                                                            <span>Nota de Crédito</span>
                                                                        </button>
                                                                    </div>
                                                                ) : isVoided ? (
                                                                    <div className="flex justify-center gap-2 items-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewingTrx(t)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-xs rounded-xl transition-all border border-purple-300 cursor-pointer"
                                                                            title="Ver Vista Previa del Comprobante Anulado"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-purple-700" />
                                                                            <span>Vista Previa</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-center items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEmitirSunatDesdeSubdashboard(t)}
                                                                            disabled={emittingTrxId === String(t.id)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                                                                        >
                                                                            <RefreshCw className={`w-3.5 h-3.5 ${emittingTrxId === String(t.id) ? 'animate-spin' : ''}`} />
                                                                            <span>Reintentar</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteTransaction(t)}
                                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                                            title="Eliminar Pedido (Retornar a Almacén RUC 10)"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Barra de selección masiva RUC10 */}
                                {activeTab === 'ruc10' && ruc10Products.length > 0 && (
                                    <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.length === ruc10Products.length && ruc10Products.length > 0}
                                                onChange={() => {
                                                    if (selectedProductIds.length === ruc10Products.length) {
                                                        setSelectedProductIds([]);
                                                    } else {
                                                        setSelectedProductIds(ruc10Products.map(p => p.id));
                                                    }
                                                }}
                                                className="h-4 w-4 accent-blue-600"
                                            />
                                            <span className="text-[11px] font-black text-blue-800 uppercase tracking-wide">Seleccionar todo</span>
                                        </label>
                                        {selectedProductIds.length > 0 && (
                                            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                                                {selectedProductIds.length} equipo{selectedProductIds.length > 1 ? 's' : ''} seleccionado{selectedProductIds.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 font-black tracking-widest border-b">
                                            <tr>
                                                {activeTab === 'ruc10' && <th className="px-4 py-3 w-10"></th>}
                                                <th className="px-5 py-3">Propietario / Serie</th>
                                                <th className="px-5 py-3">Equipo</th>
                                                <th className="px-5 py-3 text-right">Costo</th>
                                                <th className="px-5 py-3 text-center">Estado</th>
                                                {activeTab === 'ruc10' && <th className="px-5 py-3 text-center w-12"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {isLoadingData ? (
                                                Array.from({ length: 4 }).map((_, i) => (
                                                    <tr key={`skeleton-inv-${i}`} className="animate-pulse">
                                                        {activeTab === 'ruc10' && <td className="px-4 py-4"><div className="h-5 w-5 bg-slate-200 rounded mx-auto"></div></td>}
                                                        <td className="px-5 py-4 space-y-2"><div className="h-4 w-32 bg-slate-200 rounded"></div><div className="h-3 w-20 bg-slate-200 rounded"></div></td>
                                                        <td className="px-5 py-4 space-y-2"><div className="h-4 w-40 bg-slate-200 rounded"></div><div className="h-3 w-24 bg-slate-200 rounded"></div></td>
                                                        <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-slate-200 rounded ml-auto"></div></td>
                                                        <td className="px-5 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto"></div></td>
                                                        {activeTab === 'ruc10' && <td className="px-4 py-4"><div className="h-7 w-7 bg-slate-200 rounded-lg mx-auto"></div></td>}
                                                    </tr>
                                                ))
                                            ) : (activeTab === 'ruc10' ? ruc10Products : ruc20Products).length === 0 ? (
                                                <tr>
                                                    <td colSpan={activeTab === 'ruc10' ? 6 : 4} className="py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Package className="w-12 h-12 text-slate-200" />
                                                            <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Sin equipos en almacén.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                (activeTab === 'ruc10' ? ruc10Products : ruc20Products).map(product => {
                                                    const isSelected = selectedProductIds.includes(product.id);
                                                    return (
                                                        <tr
                                                            key={product.id}
                                                            className={`transition-colors cursor-pointer group ${
                                                                activeTab === 'ruc10' && isSelected
                                                                    ? 'bg-blue-50/80'
                                                                    : 'hover:bg-slate-50/70'
                                                            }`}
                                                            onClick={() => handleSelectProduct(product)}
                                                        >
                                                            {activeTab === 'ruc10' && (
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                                                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                                                                    }`}>
                                                                        {isSelected && (
                                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <UserCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                                                    <span className="font-extrabold text-slate-800 uppercase text-[11px] leading-none">{getIntermediaryName(product.intermediaryId)}</span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-slate-400 font-mono uppercase">{product.idType === 'IMEI' ? 'IMEI' : 'S/N'}: {product.serialNumber}</div>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <div className="font-extrabold text-slate-900 uppercase text-xs leading-tight">{product.category} {product.brand} {product.model}</div>
                                                                {product.specs && <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">{product.specs}</div>}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right">
                                                                <span className="font-black text-slate-900 text-sm">S/ {(activeTab === 'ruc10' ? (product.totalCost || 0) : (product.transferTotal || 0)).toFixed(2)}</span>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-center">
                                                                <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${
                                                                    activeTab === 'ruc10'
                                                                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                                                        : activeTab === 'ruc20'
                                                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                }`}>
                                                                    {activeTab === 'ruc10' ? 'RUC 10' : activeTab === 'ruc20' ? 'RUC 20' : 'Transf.'}
                                                                </span>
                                                            </td>
                                                            {activeTab === 'ruc10' && (
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <button
                                                                        onClick={(e) => handleDeleteProduct(product, e)}
                                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Eliminar producto"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky top-24 h-fit">
                    {activeTab === 'ruc10' && (
                        <div className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-500 ${
                            selectedTransferProducts.length > 0
                                ? 'border-blue-500 shadow-blue-100'
                                : 'border-gray-100'
                        }`}>
                            {/* Panel Header */}
                            <div className={`p-5 rounded-t-3xl border-b flex items-center gap-3 transition-colors duration-300 ${
                                selectedTransferProducts.length > 0 ? 'bg-blue-700 border-blue-600' : 'bg-slate-100 border-slate-200'
                            }`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    selectedTransferProducts.length > 0 ? 'bg-blue-600' : 'bg-slate-200'
                                }`}>
                                    <Calculator className={`w-5 h-5 ${selectedTransferProducts.length > 0 ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <div>
                                    <h3 className={`font-black uppercase text-sm leading-none ${
                                        selectedTransferProducts.length > 0 ? 'text-white' : 'text-slate-500'
                                    }`}>Venta Interna</h3>
                                    <p className={`text-[10px] font-bold uppercase mt-0.5 ${
                                        selectedTransferProducts.length > 0 ? 'text-blue-200' : 'text-slate-400'
                                    }`}>RUC 10 → RUC 20</p>
                                </div>
                                {selectedTransferProducts.length > 0 && (
                                    <span className="ml-auto bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full">
                                        {selectedTransferProducts.length} equipo{selectedTransferProducts.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="p-5">
                                {selectedTransferProducts.length > 0 ? (
                                    <div className="space-y-5">

                                        {/* 1. Resumen de Equipos */}
                                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                                <Package className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Resumen de Costo</span>
                                            </div>
                                            <div className="px-4 py-3 space-y-2.5">
                                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                                    <span>Subtotal ({selectedTransferProducts.length} prod.)</span>
                                                    <span className="font-black text-slate-700">S/ {selectedTransferProducts.reduce((acc, p) => acc + (p.totalCost || 0), 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                                    <span>Base Imponible</span>
                                                    <span className="font-black text-slate-700">S/ {transferCalc.base.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold uppercase">
                                                    <span className="text-emerald-700">IGV ({effectiveIgvRate * 100}%)</span>
                                                    <span className={`font-black ${config?.isIgvExempt ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                        {config?.isIgvExempt ? 'EXONERADO' : 'S/ ' + transferCalc.igv.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 pt-2 border-t border-slate-200 flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Total Factura</span>
                                                    <span className="text-xl font-black text-blue-700 tracking-tight">S/ {transferCalc.total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Emisor */}
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                                <UserCheck className="w-3 h-3 text-blue-600" />
                                                Emisor (Persona Natural RUC 10)
                                            </label>
                                            <select
                                                value={selectedIntermediaryId}
                                                onChange={e => setSelectedIntermediaryId(e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-900 font-black uppercase focus:border-blue-500 outline-none transition-colors"
                                            >
                                                {intermediaries.map(i => (
                                                    <option key={i.id} value={i.id}>{i.fullName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Datos del Comprobante */}
                                        <div className="space-y-3">
                                            <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                                <FileText className="w-3 h-3 text-blue-600" />
                                                Datos del Comprobante
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-0.5">Fecha de Emisión</label>
                                                    <input
                                                        type="date"
                                                        value={transferDate}
                                                        onChange={e => setTransferDate(e.target.value)}
                                                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-900 font-black focus:border-blue-500 outline-none transition-colors"
                                                    />
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <div className="w-2/5">
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-0.5">Serie</label>
                                                        <input
                                                            value={docSeries}
                                                            onChange={e => setDocSeries(e.target.value.toUpperCase())}
                                                            maxLength={4}
                                                            className="w-full border-2 border-slate-200 rounded-xl px-2 py-2.5 text-xs text-center bg-white text-slate-900 font-black font-mono uppercase focus:border-blue-500 outline-none transition-colors"
                                                            placeholder="FF01"
                                                        />
                                                    </div>
                                                    <div className="w-3/5">
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-0.5">Correlativo</label>
                                                        <input
                                                            value={docCorrelative}
                                                            onChange={e => setDocCorrelative(e.target.value)}
                                                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-900 font-black font-mono focus:border-blue-500 outline-none transition-colors"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Nota informativa */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                                            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                                                Se generará un pedido de transferencia. Desde <span className="font-black">Estado SUNAT RUC 10</span> podrás enviarlo a SUNAT.
                                            </p>
                                        </div>

                                        {/* 5. Botón de acción */}
                                        <button
                                            type="button"
                                            onClick={handleGenerarPedidoTransferencia}
                                            disabled={isSubmitting || selectedTransferProducts.length === 0}
                                            className={`w-full bg-blue-700 hover:bg-blue-800 active:scale-95 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${
                                                isSubmitting || selectedTransferProducts.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                            }`}
                                        >
                                            <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                                            {isSubmitting ? 'Generando...' : 'Generar Pedido de Transferencia'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-14 text-center flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                                            <Package className="w-7 h-7 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed px-4">
                                            Selecciona equipos de la tabla para generar una factura de transferencia.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            {/* MODAL DETALLE DE PRODUCTOS DE TRANSFERENCIA */}
            {viewingTrx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setViewingTrx(null)}
                >
                    <div
                        className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-slate-950 p-5 flex justify-between items-center text-white border-b border-slate-800">
                            <div>
                                <h3 className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-400" />
                                    Detalle de Transferencia: {viewingTrx.documentNumber || viewingTrx.id}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Fecha: {new Date(viewingTrx.date).toLocaleDateString()} | Entidad: {viewingTrx.entityName}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingTrx(null)}
                                className="bg-slate-800 hover:bg-red-600 p-2 rounded-xl text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body / Tabla de productos */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider border-b">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Producto / Descripción</th>
                                            <th className="px-4 py-3">Serie / IMEI</th>
                                            <th className="px-4 py-3 text-right">Precio Unit.</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(viewingTrx.items || []).map((item, idx) => {
                                            const p = products.find(prod => prod.id === item.productId);
                                            const category = p?.category || 'EQUIPO';
                                            const brand = p?.brand || '';
                                            const model = p?.model || '';
                                            const serial = p?.serialNumber || item.productId || 'S/N';
                                            const idType = p?.idType || 'S/N';
                                            const specs = p?.specs || '';
                                            const name = item.productName || `${category} ${brand} ${model}`;
                                            const itemPrice = item.unitPriceBase || item.price || 0;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-black text-slate-900 uppercase">{name}</div>
                                                        {specs && <div className="text-[10px] text-slate-500 font-medium italic">{specs}</div>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] uppercase">
                                                            {idType}: {serial}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                                                        S/ {itemPrice.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                                                        S/ {(itemPrice * (item.quantity || 1)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Resumen de totales */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-xs text-slate-600 space-y-1">
                                    <div><span className="font-bold">Total Equipos:</span> {viewingTrx.items?.length || 0} unidades</div>
                                    <div><span className="font-bold">Comprobante:</span> {formatDocumentType(viewingTrx.documentType, viewingTrx.documentNumber, viewingTrx.trxType)} {viewingTrx.documentNumber}</div>
                                </div>
                                <div className="w-full md:w-64 space-y-1.5 text-xs">
                                    <div className="flex justify-between font-bold text-slate-600 uppercase">
                                        <span>Base Imponible:</span>
                                        <span className="font-mono text-slate-900">S/ {(viewingTrx.baseAmount || viewingTrx.totalAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-600 uppercase">
                                        <span>IGV:</span>
                                        <span className="font-mono text-slate-900">S/ {(viewingTrx.igvAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-900 pt-2 border-t border-slate-200">
                                        <span className="font-black text-xs uppercase">Total Transferencia:</span>
                                        <span className="font-mono font-black text-lg text-blue-700">S/ {viewingTrx.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-100 p-4 flex justify-between items-center border-t border-slate-200">
                            <div className="flex gap-2">
                                {viewingTrx.voucherUrl && (
                                    <a
                                        href={viewingTrx.voucherUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Ver Voucher
                                    </a>
                                )}
                                {viewingTrx.pdfUrl && (
                                    <a
                                        href={viewingTrx.pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" /> Ver Factura PDF
                                    </a>
                                )}
                            </div>
                            <button
                                onClick={() => setViewingTrx(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUSTENTAR TRANSFERENCIA CON VOUCHER */}
            {sustainingTrx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSustainingTrx(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-slate-950 p-5 flex justify-between items-center text-white border-b border-slate-800">
                            <div>
                                <h3 className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-amber-400" />
                                    Sustentar Transferencia: {sustainingTrx.documentNumber}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Emisor: {sustainingTrx.entityName} | Total: S/ {sustainingTrx.totalAmount.toFixed(2)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSustainingTrx(null)}
                                className="bg-slate-800 hover:bg-red-600 p-2 rounded-xl text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-medium">
                                ℹ️ Suba la constancia / voucher bancario de la transferencia para autorizar la liberación de los equipos a <strong>Almacén RUC 20</strong>.
                            </div>

                            <label className={`w-full block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${voucherFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-amber-500 bg-slate-50 shadow-sm'}`}>
                                {voucherFile ? (
                                    <div className="flex flex-col items-center text-emerald-900 font-black uppercase text-xs">
                                        <CheckCircle className="w-10 h-10 mb-2 text-emerald-600" />
                                        <span className="truncate max-w-xs">{voucherFile.name}</span>
                                        <span className="text-[10px] text-emerald-600 font-normal mt-1">Archivo de voucher listo</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500 font-black uppercase text-xs tracking-widest">
                                        <Upload className="w-10 h-10 mb-2 text-amber-600" />
                                        <span>Seleccionar Voucher Bancario</span>
                                        <span className="text-[10px] text-slate-400 font-normal mt-1 uppercase">Formatos: Imagen (JPG, PNG) o PDF</span>
                                    </div>
                                )}
                                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                            </label>
                        </div>

                        <div className="bg-slate-100 p-4 flex justify-between items-center border-t border-slate-200">
                            <button
                                onClick={() => setSustainingTrx(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmSustentoVoucher}
                                disabled={isSubmitting || !voucherFile}
                                className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${isSubmitting || !voucherFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                                {isSubmitting ? 'Procesando...' : 'Confirmar y Liberar a RUC 20'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VISTA PREVIA COMPROBANTE DE TRANSFERENCIA (SUNAT FORMAT) */}
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
                                        {previewingTrx.cdrUrl && (
                                            <a
                                                href={previewingTrx.cdrUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" /> CDR SUNAT (ZIP)
                                            </a>
                                        )}
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
                                                {emitterRucInfo?.razonSocial || previewingTrx.entityName || 'DIAZ ORELLANA KATHERIN QUELYN'}
                                            </h2>
                                            <p className="text-xs text-slate-600 font-bold uppercase mt-0.5">
                                                R.U.C. N° {emitterRucInfo?.ruc || previewingTrx.entityDocNumber || '10710425162'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                                                {emitterRucInfo?.direccion || 'JR IQUITOS 258 MZ.12 - RAYMONDI - ATALAYA - UCAYALI'}
                                            </p>
                                            <span className="inline-block mt-2 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                                Ley Amazonía N° 27037 - Exonerado del IGV
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-2 border-slate-900 rounded-2xl p-4 text-center min-w-[220px] bg-slate-50">
                                        <div className="font-mono font-black text-slate-900 text-sm">
                                            R.U.C. {emitterRucInfo?.ruc || previewingTrx.entityDocNumber || '10710425162'}
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
                                            {receiverRucInfo?.razonSocial || 'COMERCIAL URBANTECH - ATALAYA E.I.R.L.'}
                                        </div>
                                        <div className="text-slate-600 font-mono mt-0.5">
                                            R.U.C. {receiverRucInfo?.ruc || '20615233731'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                                            {receiverRucInfo?.direccion || 'JR IQUITOS 258 MZ.12 - RAYMONDI - ATALAYA - UCAYALI'}
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
                                                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
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
                                            {(previewingTrx.items || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono font-bold">{item.quantity || 1}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800 uppercase">{item.productName}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold">S/ {(item.unitPriceBase || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">S/ {(item.totalBase || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom Summary & Amount in Words */}
                                <div className="grid grid-cols-3 gap-6 items-end pt-4 border-t border-slate-200">
                                    <div className="col-span-2 space-y-3">
                                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 font-extrabold text-xs text-slate-800 uppercase font-mono tracking-tight">
                                            {numberToWords(previewingTrx.totalAmount)}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                                    `${emitterRucInfo?.ruc || '10710425162'}|01|${previewingTrx.documentNumber}|0|${previewingTrx.totalAmount}|${previewingTrx.date}|6|20615233731|`
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
                                            <span className="font-mono font-black">S/ {previewingTrx.totalAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>I.G.V. (0%):</span>
                                            <span className="font-mono font-black">S/ 0.00</span>
                                        </div>
                                        <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-300 pt-2">
                                            <span>TOTAL:</span>
                                            <span className="font-mono text-blue-700">S/ {previewingTrx.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        {/* Header */}
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

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-900 space-y-1">
                                <div className="font-black uppercase text-sm">Comprobante Afectado: {formatDocumentType(creditNoteTrx.documentType, creditNoteTrx.documentNumber, creditNoteTrx.trxType)} {creditNoteTrx.documentNumber}</div>
                                <div>Monto Total: <span className="font-mono font-black text-rose-950">S/ {creditNoteTrx.totalAmount.toFixed(2)}</span></div>
                                <div className="text-[10px] text-rose-700 font-bold mt-2">
                                    ⚠️ Al emitir la Nota de Crédito, la factura quedará ANULADA en SUNAT y los equipos asociados volverán automáticamente al Almacén RUC 10.
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
            </div>

            {/* CONFIRM MODAL */}
            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
};
