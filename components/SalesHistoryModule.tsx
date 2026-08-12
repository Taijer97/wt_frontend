import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { FacturacionService } from '../services/facturacionService';
import { Transaction, ReceiptType } from '../types';
import {
  Search,
  FileText,
  Eye,
  Printer,
  X,
  Box,
  ShieldCheck,
  Trash2,
  Send,
  Download,
  FileCode,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { Button, Badge, DataTable, Column, useAlert, ConfirmDialog } from './ui';

const numberToWords = (num: number): string => {
  const whole = Math.floor(num);
  const cents = Math.round((num - whole) * 100);

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

    if (h > 0) {
      result += hundreds[h] + ' ';
    }

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

  const centsFormatted = cents.toString().padStart(2, '0');
  return `SON: ${words.trim()} CON ${centsFormatted}/100 SOLES`;
};

export const SalesHistoryModule: React.FC = () => {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Transaction | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emittingId, setEmittingId] = useState<number | null>(null);

  const alert = useAlert();
  const config = DataService.getConfig();
  const canDelete = DataService.checkPermission('sales', 'delete');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async (force = false) => {
    if (sales.length === 0 || force) {
      setIsLoadingData(true);
    }
    try {
      const backendSales = await BackendService.getTransactions('sale');
      setSales(backendSales);
    } catch {
      setSales(DataService.getTransactions('sale'));
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartDelete = (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaleToDelete(trx);
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);

    try {
      if (saleToDelete.sunatStatus === 'ACCEPTED' || saleToDelete.sunatStatus === 'ACEPTADO') {
        const res = await FacturacionService.anularComprobanteSunat(
          Number(saleToDelete.id),
          'ANULACIÓN DE LA OPERACIÓN POR EL USUARIO'
        );
        if (!res.success) {
          alert.error(`Error al anular en SUNAT: ${res.description || 'Rechazado'}`);
        } else {
          alert.success('Comunicación de baja aceptada por SUNAT');
        }
      }

      await BackendService.deleteTransaction(saleToDelete.id);
      DataService.deleteTransaction('sale', saleToDelete.id);
      alert.success(`Venta ${saleToDelete.documentNumber} anulada con éxito.`);
      await refresh(true);
    } catch (err: any) {
      console.error('Error anulando venta:', err);
      alert.error(err?.message || 'Error al anular la venta');
    } finally {
      setIsDeleting(false);
      setSaleToDelete(null);
    }
  };

  const handleEmitirSunat = async (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const trxId = Number(trx.id);
    if (!trxId) return alert.error('ID de transacción no válido');

    console.group(`🚀 [SUNAT EMISIÓN] Venta ID: ${trxId} - Comprobante: ${trx.documentNumber}`);
    console.log('📄 Datos de la Venta:', trx);
    console.log('⏳ Enviando solicitud al servidor backend...');

    setEmittingId(trxId);
    try {
      const res = await FacturacionService.emitirComprobanteSunat(trxId);
      console.log('📥 [RESPUESTA COMPLETA DE SUNAT / APISPERU]:', res);

      const newStatus = res.success ? 'ACCEPTED' : 'REJECTED';
      setSales((prev) =>
        prev.map((item) =>
          item.id === String(trxId)
            ? {
                ...item,
                sunatStatus: newStatus,
                sunat_description: res.description,
                pdfUrl: res.pdf_url || item.pdfUrl,
                xmlUrl: res.xml_url || item.xmlUrl,
                cdrUrl: res.cdr_url || item.cdrUrl,
              }
            : item
        )
      );

      if (res.success) {
        console.log(`✅ [SUNAT ACEPTADO] Código: ${res.code || '0'} - ${res.description}`);
        if (res.pdf_url) console.log('📄 Enlace PDF:', res.pdf_url);
        if (res.xml_url) console.log('📦 Enlace XML:', res.xml_url);
        if (res.cdr_url) console.log('✉️ Enlace CDR:', res.cdr_url);
        alert.success(`Comprobante emitido con éxito a SUNAT: ${res.description || 'Aceptado'}`);
      } else {
        console.warn(`❌ [SUNAT RECHAZADO O ERROR] Código: ${res.code || 'ERROR'} - ${res.description}`);
        if (res.raw_response) console.warn('Detalle devuelto por SUNAT:', res.raw_response);
        alert.error(`SUNAT rechazó o reportó error: ${res.description || 'Error de envío'}`);
      }
      await refresh(true);
    } catch (err: any) {
      console.error('❌ [ERROR DE CONEXIÓN EN EMISIÓN SUNAT]:', err);
      alert.error(err?.message || 'Error al conectar con la API de APIsPERU/SUNAT');
    } finally {
      console.groupEnd();
      setEmittingId(null);
    }
  };

  const handleDownloadPdf = async (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const trxId = Number(trx.id);
    if (!trxId) return alert.error('ID de transacción no válido');
    try {
      await FacturacionService.descargarPdfBlob(trxId);
    } catch (err: any) {
      console.error('Error al descargar PDF:', err);
      alert.error('Error al descargar PDF: ' + (err?.message || 'Error de conexión'));
    }
  };

  const handleDownloadXml = async (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const trxId = Number(trx.id);
    if (!trxId) return alert.error('ID de transacción no válido');
    try {
      await FacturacionService.descargarXmlBlob(trxId);
    } catch (err: any) {
      console.error('Error al descargar XML:', err);
      alert.error('Error al descargar XML: ' + (err?.message || 'Error de conexión'));
    }
  };

  const getSunatStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'ACEPTADO':
        return (
          <Badge variant="success" size="sm" icon>
            SUNAT Aceptado
          </Badge>
        );
      case 'REJECTED':
      case 'RECHAZADO':
        return (
          <Badge variant="error" size="sm" icon>
            Rechazado
          </Badge>
        );
      case 'VOIDED':
      case 'ANULADO':
        return (
          <Badge variant="danger" size="sm" icon>
            Anulado
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" size="sm" icon>
            Enviar
          </Badge>
        );
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'emision',
      header: 'Emisión',
      render: (_, s) => (
        <div>
          <div className="text-slate-900 font-extrabold text-xs">
            {s.date ? new Date(s.date).toLocaleDateString() : '—'}
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            {s.date ? new Date(s.date).toLocaleTimeString() : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'comprobante',
      header: 'Comprobante',
      render: (_, s) => (
        <div>
          <Badge
            variant={s.documentType === 'FACTURA' ? 'info' : 'neutral'}
            size="sm"
          >
            {s.documentType}
          </Badge>
          <div className="font-mono font-black text-slate-800 text-xs mt-1">
            {s.documentNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (_, s) => (
        <div>
          <div className="font-extrabold text-slate-900 uppercase text-xs truncate max-w-[200px]">
            {s.entityName}
          </div>
          <div className="text-[10px] text-slate-400 font-bold font-mono">
            {s.entityDocNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (_, s) => (
        <span className="font-black text-slate-900 text-sm">
          S/ {(s.totalAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'sunat',
      header: 'Estado SUNAT',
      align: 'center',
      render: (_, s) => (
        <div className="flex flex-col items-center gap-1">
          {getSunatStatusBadge(s.sunatStatus)}
          {(s as any).sunat_description && (
            <span
              className="text-[9px] text-slate-400 truncate max-w-[150px] italic"
              title={(s as any).sunat_description}
            >
              {(s as any).sunat_description}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Historial de Ventas</h2>
          <p className="text-xs text-slate-500 font-medium">
            Registro de comprobantes emitidos y facturación electrónica SUNAT (APIsPERU)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh(true)}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Actualizar
        </Button>
      </div>

      <div className="print:hidden">
        <DataTable
          columns={columns}
          data={sales}
          loading={isLoadingData}
          searchable
          searchPlaceholder="Buscar por Cliente, DNI/RUC o Comprobante..."
          searchKeys={['documentNumber', 'entityName', 'entityDocNumber']}
          rowActions={(sale) => {
            const isAccepted = sale.sunatStatus === 'ACCEPTED' || sale.sunatStatus === 'ACEPTADO';
            const xmlUrl = sale.xmlUrl || (sale as any).xml_url;
            const cdrUrl = sale.cdrUrl || (sale as any).cdr_url;

            return (
              <div className="flex justify-end items-center gap-1.5">
                {!isAccepted && sale.sunatStatus !== 'VOIDED' && sale.sunatStatus !== 'ANULADO' && (
                  <Button
                    variant="primary"
                    size="xs"
                    isLoading={emittingId === Number(sale.id)}
                    onClick={(e) => handleEmitirSunat(sale, e)}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Emitir a SUNAT
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedSale(sale)}
                  title="Visualizar Comprobante (Ver / PDF / XML)"
                >
                  <Eye className="w-4 h-4 text-purple-600" />
                </Button>

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => handleStartDelete(sale, e)}
                    title="Anular Venta"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* DIÁLOGO DE CONFIRMACIÓN DE ANULACIÓN */}
      <ConfirmDialog
        open={!!saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title="¿Anular Venta?"
        message={`¿Está seguro de ANULAR el comprobante ${saleToDelete?.documentNumber}? ${
          saleToDelete?.sunatStatus === 'ACCEPTED' || saleToDelete?.sunatStatus === 'ACEPTADO'
            ? 'Esta acción enviará la Comunicación de Baja a SUNAT.'
            : 'Los productos retornarán al inventario disponible.'
        }`}
        confirmText="Sí, Anular Venta"
        cancelText="Cancelar"
      />

      {/* MODAL VISTA PREVIA & ENLACES SUNAT */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white w-full max-w-4xl h-[95vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 p-5 flex justify-between items-center text-white print:hidden border-b border-slate-800">
              <h3 className="font-extrabold uppercase tracking-wider text-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Comprobante: {selectedSale.documentNumber}
              </h3>
              <div className="flex items-center gap-2">
                {(selectedSale.sunatStatus === 'ACCEPTED' || selectedSale.sunatStatus === 'ACEPTADO') && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(selectedSale, e)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF SUNAT
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadXml(selectedSale, e)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" /> XML Firmado
                    </button>
                    {(selectedSale.cdrUrl || (selectedSale as any).cdr_url) && (
                      <a
                        href={selectedSale.cdrUrl || (selectedSale as any).cdr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> CDR SUNAT (ZIP)
                      </a>
                    )}
                  </>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrint}
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Imprimir
                </Button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="bg-slate-800 hover:bg-red-600 p-2 rounded-xl text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
              <div className="max-w-[21cm] mx-auto bg-white p-10 shadow-xl print:shadow-none print:w-full rounded-2xl border border-slate-200 print:border-none relative overflow-hidden">
                {/* MARCA DE AGUA (WATERMARK - SOLO LOGO) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                  <img
                    src={config.companyLogoUrl || '/WT_logo2.png'}
                    alt="Watermark Logo"
                    className="w-80 h-80 object-contain opacity-[0.06] filter grayscale"
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-2/3 pr-8">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={config.companyLogoUrl || '/WT_logo2.png'}
                          alt="Company Logo"
                          className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-0.5 bg-white shadow-xs"
                        />
                        <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
                          {config.companyName}
                        </h1>
                      </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{config.companyAddress}</p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      TELÉFONO: {config.companyPhone} | EMAIL: {config.companyEmail}
                    </p>
                    {selectedSale.isIgvExempt && (
                      <div className="mt-3 flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl w-fit border border-emerald-200">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wider">Op. Exonerada de IGV (Ley Amazonía)</span>
                      </div>
                    )}
                  </div>
                  <div className="w-1/3 border-2 border-slate-900 rounded-2xl p-4 text-center bg-slate-50">
                    <p className="font-black text-xs uppercase">R.U.C. {config.companyRuc}</p>
                    <div className="bg-slate-900 text-white font-black py-1.5 my-2 text-[10px] rounded tracking-wider">
                      {selectedSale.documentType === ReceiptType.FACTURA ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}
                    </div>
                    <p className="font-mono font-black text-lg text-slate-900">{selectedSale.documentNumber}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 mb-6 text-xs bg-slate-50 grid grid-cols-2 gap-y-2">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-400 uppercase w-20">Señor(es):</span>
                    <span className="font-extrabold text-slate-900 uppercase">{selectedSale.entityName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-400 uppercase w-20">Fecha:</span>
                    <span className="font-bold text-slate-900">{new Date(selectedSale.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-400 uppercase w-20">
                      {selectedSale.documentType === 'FACTURA' ? 'RUC:' : 'DNI:'}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{selectedSale.entityDocNumber}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-400 uppercase w-20">Moneda:</span>
                    <span className="font-bold text-slate-900">SOLES (S/)</span>
                  </div>
                  <div className="flex gap-2 col-span-2">
                    <span className="font-bold text-slate-400 uppercase w-20">Dirección:</span>
                    <span className="font-bold text-slate-900 uppercase">{(selectedSale as any).entityAddress || '—'}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-y-2 border-slate-900 text-slate-900 font-extrabold uppercase text-[10px]">
                        <th className="py-3 text-center w-14">Cant.</th>
                        <th className="py-3 text-left px-3">Descripción</th>
                        <th className="py-3 text-right w-24">P. Unitario</th>
                        <th className="py-3 text-right w-24">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold uppercase text-slate-700">
                      {selectedSale.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 text-center font-black">{item.quantity}</td>
                          <td className="py-3 px-3">{item.productName}</td>
                          <td className="py-3 text-right font-mono">S/ {item.unitPriceBase.toFixed(2)}</td>
                          <td className="py-3 text-right font-black text-slate-900 font-mono">
                            S/ {item.totalBase.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end border-t-2 border-slate-900 pt-4">
                  <div className="w-2/3 pr-6">
                    <p className="text-[10px] font-bold text-slate-900 mb-2">{numberToWords(selectedSale.totalAmount)}</p>
                    <div className="mt-4 flex gap-4 items-center">
                      {(() => {
                        const docNum = selectedSale.documentNumber || '';
                        let serie = 'F001', num = String(selectedSale.id);
                        if (docNum.includes('-')) {
                          const parts = docNum.split('-');
                          serie = parts[0];
                          num = parts[1].replace(/\s+/g, '');
                          if (/^\d+$/.test(num)) num = String(parseInt(num, 10));
                        }
                        const tipo = selectedSale.documentType === 'FACTURA' ? '01' : '03';
                        const clientDoc = selectedSale.entityDocNumber || '00000000';
                        const clientTipo = clientDoc.length === 11 ? '6' : (clientDoc.length === 8 ? '1' : '0');
                        const qrString = `${config.companyRuc || '20100000001'}|${tipo}|${serie}|${num}|${selectedSale.igvAmount || 0}|${selectedSale.totalAmount || 0}|${new Date(selectedSale.date).toISOString().split('T')[0]}|${clientTipo}|${clientDoc}`;
                        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}`;

                        return (
                          <img
                            src={qrImgUrl}
                            alt="QR Code SUNAT"
                            className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-xs"
                            title={`QR SUNAT APIsPERU: ${qrString}`}
                          />
                        );
                      })()}
                      <p className="text-[9px] text-slate-400 font-medium uppercase leading-relaxed">
                        Representación impresa del comprobante electrónico.<br />
                        Generado según especificaciones de la SUNAT.<br />
                        Estado SUNAT: {selectedSale.sunatStatus || 'PENDIENTE'}
                      </p>
                    </div>
                  </div>
                  <div className="w-1/3 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-slate-500 uppercase">
                      <span>Op. Gravada:</span>
                      <span className="font-mono text-slate-900 font-black">S/ {selectedSale.baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-500 uppercase">
                      <span>IGV (18%):</span>
                      <span className="font-mono text-slate-900 font-black">S/ {selectedSale.igvAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-900 pt-2 border-t border-slate-200">
                      <span className="font-black text-xs uppercase">Total Pagar:</span>
                      <span className="font-mono font-black text-xl">S/ {selectedSale.totalAmount.toFixed(2)}</span>
                    </div>
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
