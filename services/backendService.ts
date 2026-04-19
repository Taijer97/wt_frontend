import api from './api';
import axios from 'axios';
import { Employee, Product, Intermediary, ExpenseStatus, Supplier } from '../types';

const LS_SESSION = 'mype_session';
const CACHE_PREFIX = 'api_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

// Helper para manejo de cache
const getCached = async <T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data as T;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
  }
  const data = await fetcher();
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Quota exceeded or error saving to localStorage');
  }
  return data;
};

const clearCache = (keyPattern: string) => {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(CACHE_PREFIX) && k.includes(keyPattern)) {
      localStorage.removeItem(k);
    }
  });
};

const cacheKeyFromParams = (prefix: string, params: Record<string, any>) => {
  const normalized = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${prefix}${normalized ? `_${normalized}` : ''}`;
};

export const BackendService = {
  _statusFromBackend(s?: string) {
    if (!s) return undefined as any;
    if (s === 'IN_STOCK_RUC10') return 'EN_STOCK_PERSONA' as any;
    if (s === 'TRANSFERRED_RUC20') return 'TRANSFERIDO_EMPRESA' as any;
    if (s === 'SOLD') return 'VENDIDO' as any;
    return s as any;
  },
  _statusToBackend(s?: string) {
    if (!s) return undefined;
    if (s === 'EN_STOCK_PERSONA') return 'IN_STOCK_RUC10';
    if (s === 'TRANSFERIDO_EMPRESA') return 'TRANSFERRED_RUC20';
    if (s === 'VENDIDO') return 'SOLD';
    return s;
  },
  resolveUrl(u?: string) {
    if (!u) return undefined;
    const base: string = (api as any).defaults?.baseURL || '';
    
    let fullUrl = u;
    if (!u.startsWith('http')) {
      fullUrl = `${base}${u}`;
    }

    // Si es una ruta de archivos y no tiene token en la URL, agregarlo si está en la sesión
    if (fullUrl.includes('/files/') || fullUrl.includes('/download')) {
      try {
        const session = localStorage.getItem(LS_SESSION);
        if (session) {
          const user = JSON.parse(session);
          if (user.token && !fullUrl.includes('token=')) {
            const separator = fullUrl.includes('?') ? '&' : '?';
            fullUrl = `${fullUrl}${separator}token=${user.token}`;
          }
        }
      } catch (e) {}
    }
    
    return fullUrl;
  },
  async login(docNumber: string, password: string): Promise<{ success: boolean; user?: Employee; message?: string }> {
    try {
      const res = await api.post('/auth/login', { doc_number: docNumber, password });
      const { success, user_id, role, token } = res.data;
      if (!success || !user_id) return { success: false, message: 'Credenciales inválidas' };
      const empRes = await api.get(`/employees/${user_id}`);
      const e = empRes.data as any;
      const user: Employee & { token?: string } = {
        id: String(e.id),
        fullName: e.full_name,
        docNumber: e.doc_number,
        phone: e.phone || '',
        email: e.email || '',
        address: e.address || '',
        baseSalary: e.base_salary,
        pensionSystem: e.pension_system,
        hasChildren: e.has_children,
        role: role || e.role,
        token: token, // Guardamos el token en la sesión
      };
      localStorage.setItem(LS_SESSION, JSON.stringify(user));
      return { success: true, user };
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Error de autenticación';
      return { success: false, message: msg };
    }
  },

  async getProducts(forceRefresh = false): Promise<Product[]> {
    return getCached('products', async () => {
      const res = await api.get('/products');
      const items = res.data as any[];
      return items.map((p: any) => ({
        id: String(p.id),
        category: p.category,
        serialNumber: p.serial_number,
        brand: p.brand,
        model: p.model,
        specs: p.specs,
        condition: p.condition as any,
        status: BackendService._statusFromBackend(p.status),
        origin: p.origin as any,
        stock: p.stock,
        purchasePrice: p.purchase_price,
        notaryCost: p.notary_cost,
        totalCost: p.total_cost,
        intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined,
        transferBase: p.transfer_base,
        transferIgv: p.transfer_igv,
        transferTotal: p.transfer_total,
        transferDocType: p.transfer_doc_type,
        transferDocNumber: p.transfer_doc_number,
        transferDate: p.transfer_date,
      }));
    }, forceRefresh);
  },

  async createProduct(payload: Partial<Product>): Promise<Product> {
    const res = await api.post('/products', {
      category: payload.category,
      serial_number: payload.serialNumber,
      brand: payload.brand,
      model: payload.model,
      specs: payload.specs,
      condition: payload.condition,
      status: BackendService._statusToBackend(payload.status),
      origin: payload.origin,
      stock: payload.stock ?? 1,
      purchase_price: payload.purchasePrice,
      notary_cost: payload.notaryCost,
      total_cost: payload.totalCost,
      intermediary_id: payload.intermediaryId ? Number(payload.intermediaryId) : null,
      transfer_base: payload.transferBase,
      transfer_igv: payload.transferIgv,
      transfer_total: payload.transferTotal,
      transfer_doc_type: payload.transferDocType,
      transfer_doc_number: payload.transferDocNumber,
      transfer_date: payload.transferDate,
    });
    clearCache('products'); // Invalidate products cache
    const p = res.data;
    return {
      id: String(p.id),
      category: p.category,
      serialNumber: p.serial_number,
      brand: p.brand,
      model: p.model,
      specs: p.specs,
      condition: p.condition,
      status: BackendService._statusFromBackend(p.status),
      origin: p.origin,
      stock: p.stock,
      purchasePrice: p.purchase_price,
      notaryCost: p.notary_cost,
      totalCost: p.total_cost,
      intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined,
      transferBase: p.transfer_base,
      transferIgv: p.transfer_igv,
      transferTotal: p.transfer_total,
      transferDocType: p.transfer_doc_type,
      transferDocNumber: p.transfer_doc_number,
      transferDate: p.transfer_date,
    };
  },

  async getEmployees(forceRefresh = false): Promise<Employee[]> {
    return getCached('employees', async () => {
      const res = await api.get('/employees');
      const items = res.data as any[];
      return items.map((e: any) => ({
        id: String(e.id),
        fullName: e.full_name,
        docNumber: e.doc_number,
        phone: e.phone || '',
        email: e.email || '',
        address: e.address || '',
        baseSalary: e.base_salary,
        pensionSystem: e.pension_system,
        hasChildren: e.has_children,
        role: e.role,
      }));
    }, forceRefresh);
  },

  async createEmployee(payload: Partial<Employee> & { password: string }): Promise<Employee> {
    const body: any = {
      full_name: payload.fullName,
      doc_number: payload.docNumber,
      password: payload.password,
      base_salary: payload.baseSalary,
      pension_system: payload.pensionSystem,
      has_children: payload.hasChildren,
      role: payload.role,
    };
    if (payload.phone) body.phone = payload.phone;
    if (payload.email) body.email = payload.email;
    if (payload.address) body.address = payload.address;
    const res = await api.post('/employees', body);
    clearCache('employees');
    const e = res.data;
    return {
      id: String(e.id),
      fullName: e.full_name,
      docNumber: e.doc_number,
      phone: e.phone || '',
      email: e.email || '',
      address: e.address || '',
      baseSalary: e.base_salary,
      pensionSystem: e.pension_system,
      hasChildren: e.has_children,
      role: e.role,
    };
  },
  async updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
    const body: any = {
      full_name: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      base_salary: payload.baseSalary,
      pension_system: payload.pensionSystem,
      has_children: payload.hasChildren,
      role: payload.role,
    };
    const res = await api.put(`/employees/${id}`, body);
    clearCache('employees');
    const e = res.data;
    return {
      id: String(e.id),
      fullName: e.full_name,
      docNumber: e.doc_number,
      phone: e.phone || '',
      email: e.email || '',
      address: e.address || '',
      baseSalary: e.base_salary,
      pensionSystem: e.pension_system,
      hasChildren: e.has_children,
      role: e.role,
    };
  },

  async changeEmployeePassword(id: string, oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.put(`/employees/${id}/password`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  async deleteEmployee(id: string) {
    const res = await api.delete(`/employees/${id}`);
    clearCache('employees');
    return res.data;
  },

  async updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
    const res = await api.put(`/products/${id}`, {
      category: payload.category,
      serial_number: payload.serialNumber,
      brand: payload.brand,
      model: payload.model,
      specs: payload.specs,
      condition: payload.condition,
      status: BackendService._statusToBackend(payload.status),
      origin: payload.origin,
      stock: payload.stock,
      purchase_price: payload.purchasePrice,
      notary_cost: payload.notaryCost,
      total_cost: payload.totalCost,
      intermediary_id: payload.intermediaryId ? Number(payload.intermediaryId) : null,
      transfer_base: payload.transferBase,
      transfer_igv: payload.transferIgv,
      transfer_total: payload.transferTotal,
      transfer_doc_type: payload.transferDocType,
      transfer_doc_number: payload.transferDocNumber,
      transfer_date: payload.transferDate,
    });
    clearCache('products'); // Invalidate products cache
    const p = res.data;
    return {
      id: String(p.id),
      category: p.category,
      serialNumber: p.serial_number,
      brand: p.brand,
      model: p.model,
      specs: p.specs,
      condition: p.condition,
      status: BackendService._statusFromBackend(p.status),
      origin: p.origin,
      stock: p.stock,
      purchasePrice: p.purchase_price,
      notaryCost: p.notary_cost,
      totalCost: p.total_cost,
      intermediaryId: p.intermediary_id ? String(p.intermediary_id) : undefined,
      transferBase: p.transfer_base,
      transferIgv: p.transfer_igv,
      transferTotal: p.transfer_total,
      transferDocType: p.transfer_doc_type,
      transferDocNumber: p.transfer_doc_number,
      transferDate: p.transfer_date,
    };
  },

  async deleteProduct(id: string) {
    const res = await api.delete(`/products/${id}`);
    clearCache('products'); // Invalidate products cache
    return res.data;
  },

  async createTransaction(payload: {
    trxType: 'sale' | 'purchase' | 'transfer';
    documentType: string;
    documentNumber: string;
    entityName: string;
    entityDocNumber: string;
    baseAmount: number;
    igvAmount: number;
    totalAmount: number;
    pdfUrl?: string;
    items: { productId?: string; productName: string; quantity: number; unitPriceBase: number; totalBase: number }[];
  }) {
    const res = await api.post('/transactions', {
      trx_type: payload.trxType,
      document_type: payload.documentType,
      document_number: payload.documentNumber,
      entity_name: payload.entityName,
      entity_doc_number: payload.entityDocNumber,
      base_amount: payload.baseAmount,
      igv_amount: payload.igvAmount,
      total_amount: payload.totalAmount,
      pdf_url: payload.pdfUrl,
      items: payload.items.map(i => ({
        product_id: i.productId ? Number(i.productId) : null,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price_base: i.unitPriceBase,
        total_base: i.totalBase,
      })),
    });
    clearCache('transactions'); // Invalidate transactions cache
    return res.data;
  },

  async getPurchases(params?: { type?: string; status?: string; q?: string; block_number?: number; op_date?: string; limit?: number; offset?: number }, forceRefresh = false) {
    if (params && Object.keys(params).length > 0) {
      const key = cacheKeyFromParams('purchases', params as any);
      return getCached(key, async () => {
        const res = await api.get('/purchases', { params });
        return res.data;
      }, forceRefresh);
    }
    return getCached('purchases_all', async () => {
      const res = await api.get('/purchases');
      return res.data;
    }, forceRefresh);
  },
  async getPurchaseBlocks(params?: { type?: string; status?: string }, forceRefresh = false): Promise<number[]> {
    const key = cacheKeyFromParams('purchase_blocks', (params || {}) as any);
    return getCached(key, async () => {
      const res = await api.get('/purchases/blocks', { params });
      return res.data as number[];
    }, forceRefresh);
  },
  async createPurchase(payload: {
    type: string;
    documentNumber: string;
    supplierId?: number | null;
    intermediaryId?: number | null;
    baseAmount: number;
    igvAmount: number;
    totalAmount: number;
    pdfUrl?: string | null;
    providerName?: string | null;
    productBrand?: string | null;
    productModel?: string | null;
    productSerial?: string | null;
    productIdType?: string | null;
    productCondition?: string | null;
    sellerDocNumber?: string | null;
    sellerFullName?: string | null;
    sellerAddress?: string | null;
    sellerCivilStatus?: string | null;
    sellerPhone?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    blockNumber?: number | null;
    date?: string | null;
    items?: { category?: string; brand?: string; model?: string; serial?: string; idType?: string; specs?: string; cost?: number }[];
  }) {
    const res = await api.post('/purchases', {
      type: payload.type,
      document_number: payload.documentNumber,
      supplier_id: payload.supplierId,
      intermediary_id: payload.intermediaryId,
      base_amount: payload.baseAmount,
      igv_amount: payload.igvAmount,
      total_amount: payload.totalAmount,
      pdf_url: payload.pdfUrl,
      provider_name: payload.providerName,
      product_brand: payload.productBrand,
      product_model: payload.productModel,
      product_serial: payload.productSerial,
      product_id_type: payload.productIdType,
      product_condition: payload.productCondition,
      seller_doc_number: payload.sellerDocNumber,
      seller_full_name: payload.sellerFullName,
      seller_address: payload.sellerAddress,
      seller_civil_status: payload.sellerCivilStatus,
      seller_phone: payload.sellerPhone,
      bank_name: payload.bankName,
      bank_account: payload.bankAccount,
      block_number: payload.blockNumber,
      date: payload.date,
      items: payload.items?.map(it => ({
        ...it,
        id_type: it.idType
      })),
    });
    clearCache('purchases');
    return res.data;
  },
  async updatePurchase(id: string, payload: Partial<{
    status: string;
    pdfUrl: string | null;
    providerName: string | null;
    productBrand: string | null;
    productModel: string | null;
    productSerial: string | null;
    sellerDocNumber: string | null;
    sellerFullName: string | null;
    sellerPhone: string | null;
    sellerAddress: string | null;
    bankName: string | null;
    bankAccount: string | null;
    baseAmount: number | null;
    intermediaryId: string | null;
    date: string | null;
    blockNumber: number | null;
  }>) {
    const res = await api.put(`/purchases/${id}`, {
      status: payload.status,
      pdf_url: payload.pdfUrl,
      provider_name: payload.providerName,
      product_brand: payload.productBrand,
      product_model: payload.productModel,
      product_serial: payload.productSerial,
      seller_doc_number: payload.sellerDocNumber,
      seller_full_name: payload.sellerFullName,
      seller_phone: payload.sellerPhone,
      seller_address: payload.sellerAddress,
      bank_name: payload.bankName,
      bank_account: payload.bankAccount,
      base_amount: payload.baseAmount,
      intermediary_id: payload.intermediaryId ? Number(payload.intermediaryId) : null,
      date: payload.date,
      block_number: payload.blockNumber
    });
    clearCache('purchases');
    return res.data;
  },
  async generatePurchaseDoc(id: string, docKind: 'contract' | 'dj') {
    const res = await api.post(`/purchases/${id}/generate/${docKind}`);
    return res.data as { url: string; filename: string; doc_kind: string };
  },
  async deletePurchase(id: string) {
    const res = await api.delete(`/purchases/${id}`);
    clearCache('purchases');
    return res.data;
  },
  async uploadPurchaseFile(id: string, file: File, docKind?: 'voucher' | 'contract' | 'dj' | 'general') {
    const form = new FormData();
    form.append('file', file);
    if (docKind) form.append('doc_kind', docKind);
    
    // Use raw axios to avoid default headers issues
    const baseURL = api.defaults.baseURL || '';
    const res = await axios.post(`${baseURL}/purchases/${id}/upload`, form, {
      withCredentials: true,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    clearCache('purchases');
    return res.data as { url: string; filename: string; doc_kind?: string };
  },

  async getSuppliers(forceRefresh = false): Promise<Supplier[]> {
    return getCached('suppliers', async () => {
      const res = await api.get('/suppliers');
      return res.data.map((s: any) => ({
        id: String(s.id),
        ruc: s.ruc,
        razonSocial: s.name,
        shortName: s.short_name,
        contactName: s.contact,
        phone: s.phone,
        email: s.email,
        address: s.address,
        department: s.department,
        province: s.province,
        district: s.district,
        category: s.category || 'MAYORISTA'
      }));
    }, forceRefresh);
  },

  async createSupplier(payload: { name: string; short_name?: string; ruc: string; contact?: string }) {
    const res = await api.post('/suppliers', payload);
    clearCache('suppliers');
    return res.data;
  },
  async updateSupplier(id: string, payload: { name?: string; short_name?: string; contact?: string; category?: string; department?: string; province?: string; district?: string; address?: string; phone?: string }) {
    const res = await api.put(`/suppliers/${id}`, payload);
    clearCache('suppliers');
    return res.data;
  },

  async deleteSupplier(id: string) {
    const res = await api.delete(`/suppliers/${id}`);
    clearCache('suppliers');
    return res.data;
  },

  async getIntermediaries(forceRefresh = false): Promise<Intermediary[]> {
    return getCached('intermediaries', async () => {
      const res = await api.get('/intermediaries');
      const items = res.data as any[];
      return items.map((i: any) => ({
        id: String(i.id),
        fullName: i.name,
        docNumber: i.doc_number,
        rucNumber: i.ruc_number || '',
        phone: i.phone || '',
        email: i.email || '',
        address: i.address || '',
      }));
    }, forceRefresh);
  },
  async getConfig(forceRefresh = false) {
    return getCached('config', async () => {
      const res = await api.get('/config');
      return res.data;
    }, forceRefresh);
  },
  async updateConfig(config: any) {
    const res = await api.put('/config', config);
    clearCache('config');
    return res.data;
  },

  async createIntermediary(payload: { doc_number: string; name: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.post('/intermediaries', payload);
    clearCache('intermediaries');
    return res.data;
  },

  async deleteIntermediary(id: string) {
    const res = await api.delete(`/intermediaries/${id}`);
    clearCache('intermediaries');
    return res.data;
  },
  async updateIntermediary(id: string, payload: { name?: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.put(`/intermediaries/${id}`, payload);
    clearCache('intermediaries');
    return res.data;
  },
  async getTransactions(trxType?: 'sale' | 'purchase' | 'transfer', forceRefresh = false) {
    const key = `transactions_${trxType || 'all'}`;
    return getCached(key, async () => {
      const res = await api.get('/transactions');
      const items = res.data as any[];
      const filtered = trxType ? items.filter((t: any) => t.trx_type === trxType) : items;
      return filtered.map((t: any) => ({
        id: String(t.id),
        date: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
        documentType: t.document_type,
        documentNumber: t.document_number,
        entityName: t.entity_name,
        entityDocNumber: t.entity_doc_number,
        items: (t.items || []).map((i: any) => ({
          productId: i.product_id ? String(i.product_id) : '',
          productName: i.product_name,
          quantity: i.quantity,
          unitPriceBase: i.unit_price_base,
          totalBase: i.total_base,
        })),
        baseAmount: t.base_amount,
        igvAmount: t.igv_amount,
        totalAmount: t.total_amount,
        sunatStatus: t.sunat_status || 'ACEPTADO',
        pdfUrl: BackendService.resolveUrl(t.pdf_url),
        xmlUrl: undefined,
        isIgvExempt: false,
        exemptionReason: undefined,
        // extras for UI
        voucherUrl: BackendService.resolveUrl(t.voucher_url),
        trxType: t.trx_type,
      }));
    }, forceRefresh);
  },

  async uploadTransactionFile(id: string, file: File, docKind: 'invoice' | 'voucher') {
    console.log(`Uploading file for trx ${id}, kind: ${docKind}, file: ${file.name}`);
    const form = new FormData();
    form.append('doc_kind', docKind);
    form.append('file', file);
    
    // Use raw axios to avoid default 'Content-Type: application/json' from api instance
    const baseURL = (api as any).defaults?.baseURL || '';
    const res = await axios.post(`${baseURL}/transactions/${id}/upload`, form, {
      withCredentials: true,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      }
    });
    console.log('Upload response:', res.data);
    return res.data as { url: string; filename: string; doc_kind: string };
  },

  async deleteTransaction(id: string) {
    const res = await api.delete(`/transactions/${id}`);
    clearCache('transactions'); // Invalidate transactions cache
    return res.data;
  },

  async getExpenses(forceRefresh = false) {
    return getCached('expenses', async () => {
      const res = await api.get('/expenses');
      const items = res.data as any[];
      return items.map((e: any) => ({
        id: String(e.id),
        date: e.date,
        category: 'OTROS_GASTOS' as any,
        description: e.description,
        amount: e.amount,
        paymentMethod: 'TRANSFERENCIA' as any,
        beneficiary: '',
        status: e.status === 'COMPLETED' ? ExpenseStatus.COMPLETED : ExpenseStatus.PENDING_DOCS,
        documentType: undefined,
        documentNumber: undefined,
        documentUrl: BackendService.resolveUrl(e.pdf_url || undefined),
      }));
    }, forceRefresh);
  },

  async createExpense(payload: { description: string; amount: number; date: string; status: 'PENDING' | 'COMPLETED' }) {
    const res = await api.post('/expenses', payload);
    clearCache('expenses');
    return res.data;
  },

  async updateExpense(id: string, payload: { status?: 'PENDING' | 'COMPLETED'; pdfUrl?: string }) {
    const res = await api.put(`/expenses/${id}`, {
      status: payload.status,
      pdf_url: payload.pdfUrl,
    });
    clearCache('expenses');
    return res.data;
  },

  async deleteExpense(id: string) {
    const res = await api.delete(`/expenses/${id}`);
    clearCache('expenses');
    return res.data;
  },

  async uploadExpenseFile(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    
    // Use raw axios to avoid default headers issues
    const baseURL = api.defaults.baseURL || '';
    const res = await axios.post(`${baseURL}/expenses/${id}/upload`, form, {
      withCredentials: true,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    clearCache('expenses');
    return res.data as { url: string; filename: string };
  },

  async getRoles(forceRefresh = false) {
    return getCached('roles', async () => {
      const res = await api.get('/roles');
      return res.data;
    }, forceRefresh);
  },
  async getSeller(docNumber: string) {
    const res = await api.get(`/purchases/sellers/${docNumber}`);
    return res.data;
  },
  async createRole(payload: any) {
    const res = await api.post('/roles', payload);
    clearCache('roles');
    return res.data;
  },
  async updateRole(id: string, payload: any) {
    const res = await api.put(`/roles/${id}`, payload);
    clearCache('roles');
    return res.data;
  },
  async deleteRole(id: string) {
    const res = await api.delete(`/roles/${id}`);
    clearCache('roles');
    return res.data;
  },
};
