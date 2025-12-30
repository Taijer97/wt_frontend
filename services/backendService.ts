import api from './api';
import { Employee, Product } from '../types';

const LS_SESSION = 'mype_session';

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
    if (u.startsWith('http')) return u;
    return `${base}${u}`;
  },
  async login(docNumber: string, password: string): Promise<{ success: boolean; user?: Employee; message?: string }> {
    try {
      const res = await api.post('/auth/login', { doc_number: docNumber, password });
      const { success, user_id, role } = res.data;
      if (!success || !user_id) return { success: false, message: 'Credenciales inválidas' };
      const empRes = await api.get(`/employees/${user_id}`);
      const e = empRes.data as any;
      const user: Employee = {
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
      };
      localStorage.setItem(LS_SESSION, JSON.stringify(user));
      return { success: true, user };
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Error de autenticación';
      return { success: false, message: msg };
    }
  },

  async getProducts(): Promise<Product[]> {
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
    }));
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
    });
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
    };
  },

  async getEmployees(): Promise<Employee[]> {
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

  async deleteEmployee(id: string) {
    const res = await api.delete(`/employees/${id}`);
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
    });
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
    };
  },

  async createTransaction(payload: {
    trx_type: 'sale' | 'purchase' | 'transfer';
    document_type: string;
    document_number: string;
    entity_name: string;
    entity_doc_number: string;
    base_amount: number;
    igv_amount: number;
    total_amount: number;
    pdf_url?: string;
    items: { product_id?: string; product_name: string; quantity: number; unit_price_base: number; total_base: number }[];
  }) {
    const res = await api.post('/transactions', {
      ...payload,
      items: payload.items.map(i => ({
        product_id: i.product_id ? Number(i.product_id) : null,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price_base: i.unit_price_base,
        total_base: i.total_base,
      })),
    });
    return res.data;
  },

  async getPurchases(params?: { type?: string; status?: string; q?: string; limit?: number; offset?: number }) {
    const res = await api.get('/purchases', { params });
    return res.data;
  },
  async createPurchase(payload: {
    type: string;
    document_number: string;
    supplier_id?: number | null;
    intermediary_id?: number | null;
    base_amount: number;
    igv_amount: number;
    total_amount: number;
    pdf_url?: string | null;
    provider_name?: string | null;
    product_brand?: string | null;
    product_model?: string | null;
    product_serial?: string | null;
    product_condition?: string | null;
    seller_doc_number?: string | null;
    seller_full_name?: string | null;
    seller_address?: string | null;
    seller_civil_status?: string | null;
    date?: string | null;
    items?: { category?: string; brand?: string; model?: string; serial?: string; specs?: string; cost?: number }[];
  }) {
    const res = await api.post('/purchases', payload);
    return res.data;
  },
  async updatePurchase(id: string, payload: Partial<{
    status: string;
    pdf_url: string | null;
    provider_name: string | null;
    product_brand: string | null;
    product_model: string | null;
    product_serial: string | null;
  }>) {
    const res = await api.put(`/purchases/${id}`, payload);
    return res.data;
  },
  async generatePurchaseDoc(id: string, docKind: 'contract' | 'dj') {
    const res = await api.post(`/purchases/${id}/generate/${docKind}`);
    return res.data as { url: string; filename: string; doc_kind: string };
  },
  async deletePurchase(id: string) {
    const res = await api.delete(`/purchases/${id}`);
    return res.data;
  },
  async uploadPurchaseFile(id: string, file: File, docKind?: 'voucher' | 'contract' | 'dj' | 'general') {
    const form = new FormData();
    form.append('file', file);
    if (docKind) form.append('doc_kind', docKind);
    const res = await api.post(`/purchases/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { url: string; filename: string; doc_kind?: string };
  },

  async getSuppliers() {
    const res = await api.get('/suppliers');
    return res.data;
  },

  async createSupplier(payload: { name: string; ruc: string; contact?: string }) {
    const res = await api.post('/suppliers', payload);
    return res.data;
  },
  async updateSupplier(id: string, payload: { name?: string; contact?: string; category?: string; department?: string; province?: string; district?: string; address?: string; phone?: string }) {
    const res = await api.put(`/suppliers/${id}`, payload);
    return res.data;
  },

  async deleteSupplier(id: string) {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },

  async getIntermediaries() {
    const res = await api.get('/intermediaries');
    return res.data;
  },
  async getConfig() {
    const res = await api.get('/config');
    return res.data;
  },
  async updateConfig(config: any) {
    const res = await api.put('/config', config);
    return res.data;
  },

  async createIntermediary(payload: { doc_number: string; name: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.post('/intermediaries', payload);
    return res.data;
  },

  async deleteIntermediary(id: string) {
    const res = await api.delete(`/intermediaries/${id}`);
    return res.data;
  },
  async updateIntermediary(id: string, payload: { name?: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.put(`/intermediaries/${id}`, payload);
    return res.data;
  },
  async getTransactions(trxType?: 'sale' | 'purchase' | 'transfer') {
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
      pdfUrl: t.pdf_url || undefined,
      xmlUrl: undefined,
      isIgvExempt: false,
      exemptionReason: undefined,
      // extras for UI
      voucherUrl: t.voucher_url || undefined,
      trxType: t.trx_type,
    }));
  },

  async uploadTransactionFile(id: string, file: File, docKind: 'invoice' | 'voucher') {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_kind', docKind);
    const res = await api.post(`/transactions/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { url: string; filename: string; doc_kind: string };
  },

  async getExpenses() {
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
      status: e.status === 'COMPLETED' ? 'COMPLETADO' : 'PENDIENTE_DOCS',
      documentType: undefined,
      documentNumber: undefined,
      documentUrl: BackendService.resolveUrl(e.pdf_url || undefined),
    }));
  },

  async createExpense(payload: { description: string; amount: number; date: string; status: 'PENDING' | 'COMPLETED' }) {
    const res = await api.post('/expenses', payload);
    return res.data;
  },

  async updateExpense(id: string, payload: { status?: 'PENDING' | 'COMPLETED'; pdf_url?: string }) {
    const res = await api.put(`/expenses/${id}`, payload);
    return res.data;
  },

  async deleteExpense(id: string) {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },

  async uploadExpenseFile(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/expenses/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { url: string; filename: string };
  },

  async getRoles() {
    const res = await api.get('/roles');
    return res.data;
  },
  async createRole(payload: any) {
    const res = await api.post('/roles', payload);
    return res.data;
  },
  async updateRole(id: string, payload: any) {
    const res = await api.put(`/roles/${id}`, payload);
    return res.data;
  },
  async deleteRole(id: string) {
    const res = await api.delete(`/roles/${id}`);
    return res.data;
  },
};
