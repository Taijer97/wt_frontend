import api from './api';
import { BackendService } from './backendService';

export interface SunatEmissionResult {
  success: boolean;
  sunat_status: 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'VOIDED';
  code?: string;
  description?: string;
  pdf_url?: string;
  xml_url?: string;
  cdr_url?: string;
  raw_response?: any;
}

export const FacturacionService = {
  async emitirComprobanteSunat(transactionId: number): Promise<SunatEmissionResult> {
    console.group(`🚀 [FRONTEND -> BACKEND] Emisión a SUNAT (Transaction ID: ${transactionId})`);
    console.log(`Endpoint Backend: /facturacion/emitir/${transactionId}`);
    try {
      const res = await api.post(`/facturacion/emitir/${transactionId}`);
      console.log(`📥 [BACKEND -> FRONTEND] Respuesta del servidor:`, res.data);
      BackendService.clearTransactionsCache();
      console.groupEnd();
      return res.data;
    } catch (err: any) {
      console.error(`❌ [FRONTEND ERROR] Fallo al emitir comprobante:`, err?.response?.data || err?.message || err);
      console.groupEnd();
      throw err;
    }
  },

  async anularComprobanteSunat(transactionId: number, motivo = 'ANULACIÓN DE LA OPERACIÓN'): Promise<SunatEmissionResult> {
    console.group(`🚀 [FRONTEND -> BACKEND] Anulación SUNAT (Transaction ID: ${transactionId})`);
    try {
      const res = await api.post(`/facturacion/anular/${transactionId}`, null, {
        params: { motivo },
      });
      console.log(`📥 [BACKEND -> FRONTEND] Respuesta anulación:`, res.data);
      BackendService.clearTransactionsCache();
      console.groupEnd();
      return res.data;
    } catch (err: any) {
      console.error(`❌ [FRONTEND ERROR] Fallo al anular:`, err?.response?.data || err?.message || err);
      console.groupEnd();
      throw err;
    }
  },

  async emitirNotaCredito(transactionId: number, reasonCode = '01', reasonDesc = 'ANULACION DE LA OPERACION'): Promise<{ success: boolean; message?: string; nc_document_number?: string }> {
    console.group(`🚀 [FRONTEND -> BACKEND] Emisión Nota de Crédito (Transaction ID: ${transactionId})`);
    try {
      const res = await api.post(`/facturacion/nota-credito/${transactionId}`, null, {
        params: { reason_code: reasonCode, reason_desc: reasonDesc }
      });
      console.log(`📥 [BACKEND -> FRONTEND] Respuesta Nota de Crédito:`, res.data);
      BackendService.clearTransactionsCache();
      BackendService.clearProductsCache();
      console.groupEnd();
      return res.data;
    } catch (err: any) {
      console.error(`❌ [FRONTEND ERROR] Fallo al emitir Nota de Crédito:`, err?.response?.data || err?.message || err);
      console.groupEnd();
      throw err;
    }
  },

  async consultarEstadoSunat(transactionId: number): Promise<SunatEmissionResult> {
    const res = await api.get(`/facturacion/status/${transactionId}`);
    return res.data;
  },

  async generarQrSunat(transactionId: number): Promise<{ success: boolean; qr_url?: string; qr_base64?: string; qr_text?: string }> {
    const res = await api.get(`/facturacion/qr/${transactionId}`);
    return res.data;
  },

  async descargarPdfBlob(transactionId: number): Promise<void> {
    const res = await api.get(`/facturacion/pdf/${transactionId}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    let filename = `comprobante_${transactionId}.pdf`;
    const disposition = res.headers['content-disposition'] || res.headers['Content-Disposition'];
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
    }
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  },

  async descargarXmlBlob(transactionId: number): Promise<void> {
    const res = await api.get(`/facturacion/xml/${transactionId}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/xml' });
    const blobUrl = URL.createObjectURL(blob);
    let filename = `comprobante_${transactionId}.xml`;
    const disposition = res.headers['content-disposition'] || res.headers['Content-Disposition'];
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
    }
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  },
};
