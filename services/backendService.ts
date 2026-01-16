import api from './api';
import axios from 'axios';
import { Employee, Product, Intermediary, ExpenseStatus } from '../types';

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
      idType: p.id_type,
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
  },

  async createProduct(payload: Partial<Product>): Promise<Product> {
    const res = await api.post('/products', {
      category: payload.category?.toUpperCase().trim(),
      serial_number: payload.serialNumber?.toUpperCase().trim(),
      id_type: payload.idType?.toUpperCase().trim(),
      brand: payload.brand?.toUpperCase().trim(),
      model: payload.model?.toUpperCase().trim(),
      specs: payload.specs?.toUpperCase().trim(),
      condition: payload.condition?.toUpperCase().trim(),
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
      transfer_doc_type: payload.transferDocType?.toUpperCase().trim(),
      transfer_doc_number: payload.transferDocNumber?.toUpperCase().trim(),
      transfer_date: payload.transferDate,
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
      transferBase: p.transfer_base,
      transferIgv: p.transfer_igv,
      transferTotal: p.transfer_total,
      transferDocType: p.transfer_doc_type,
      transferDocNumber: p.transfer_doc_number,
      transferDate: p.transfer_date,
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
      full_name: payload.fullName?.toUpperCase().trim(),
      doc_number: payload.docNumber?.toUpperCase().trim(),
      password: payload.password,
      base_salary: payload.baseSalary,
      pension_system: payload.pensionSystem?.toUpperCase().trim(),
      has_children: payload.hasChildren,
      role: payload.role?.toUpperCase().trim(),
    };
    if (payload.phone) body.phone = payload.phone.toUpperCase().trim();
    if (payload.email) body.email = payload.email.toUpperCase().trim();
    if (payload.address) body.address = payload.address.toUpperCase().trim();
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
      full_name: payload.fullName?.toUpperCase().trim(),
      phone: payload.phone?.toUpperCase().trim(),
      email: payload.email?.toUpperCase().trim(),
      address: payload.address?.toUpperCase().trim(),
      base_salary: payload.baseSalary,
      pension_system: payload.pensionSystem?.toUpperCase().trim(),
      has_children: payload.hasChildren,
      role: payload.role?.toUpperCase().trim(),
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
      category: payload.category?.toUpperCase().trim(),
      serial_number: payload.serialNumber?.toUpperCase().trim(),
      id_type: payload.idType?.toUpperCase().trim(),
      brand: payload.brand?.toUpperCase().trim(),
      model: payload.model?.toUpperCase().trim(),
      specs: payload.specs?.toUpperCase().trim(),
      condition: payload.condition?.toUpperCase().trim(),
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
      transfer_doc_type: payload.transferDocType?.toUpperCase().trim(),
      transfer_doc_number: payload.transferDocNumber?.toUpperCase().trim(),
      transfer_date: payload.transferDate,
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
      document_type: payload.documentType?.toUpperCase().trim(),
      document_number: payload.documentNumber?.toUpperCase().trim(),
      entity_name: payload.entityName?.toUpperCase().trim(),
      entity_doc_number: payload.entityDocNumber?.toUpperCase().trim(),
      base_amount: payload.baseAmount,
      igv_amount: payload.igvAmount,
      total_amount: payload.totalAmount,
      pdf_url: payload.pdfUrl,
      items: payload.items.map(i => ({
        product_id: i.productId ? Number(i.productId) : null,
        product_name: i.productName?.toUpperCase().trim(),
        quantity: i.quantity,
        unit_price_base: i.unitPriceBase,
        total_base: i.totalBase,
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
    date?: string | null;
    items?: { category?: string; brand?: string; model?: string; serial?: string; specs?: string; cost?: number }[];
  }) {
    const res = await api.post('/purchases', {
      type: payload.type?.toUpperCase().trim(),
      document_number: payload.documentNumber?.toUpperCase().trim(),
      supplier_id: payload.supplierId,
      intermediary_id: payload.intermediaryId,
      base_amount: payload.baseAmount,
      igv_amount: payload.igvAmount,
      total_amount: payload.totalAmount,
      pdf_url: payload.pdfUrl,
      provider_name: payload.providerName?.toUpperCase().trim(),
      product_brand: payload.productBrand?.toUpperCase().trim(),
      product_model: payload.productModel?.toUpperCase().trim(),
      product_serial: payload.productSerial?.toUpperCase().trim(),
      product_id_type: payload.productIdType?.toUpperCase().trim(),
      product_condition: payload.productCondition?.toUpperCase().trim(),
      seller_doc_number: payload.sellerDocNumber?.toUpperCase().trim(),
      seller_full_name: payload.sellerFullName?.toUpperCase().trim(),
      seller_address: payload.sellerAddress?.toUpperCase().trim(),
      seller_civil_status: payload.sellerCivilStatus?.toUpperCase().trim(),
      date: payload.date,
      items: payload.items?.map(i => ({
        category: i.category?.toUpperCase().trim(),
        brand: i.brand?.toUpperCase().trim(),
        model: i.model?.toUpperCase().trim(),
        serial: i.serial?.toUpperCase().trim(),
        specs: i.specs?.toUpperCase().trim(),
        cost: i.cost,
      })),
    });
    return res.data;
  },
  async updatePurchase(id: string, payload: Partial<{
    status: string;
    pdfUrl: string | null;
    providerName: string | null;
    productBrand: string | null;
    productModel: string | null;
    productSerial: string | null;
  }>) {
    const res = await api.put(`/purchases/${id}`, {
      status: payload.status?.toUpperCase().trim(),
      pdf_url: payload.pdfUrl,
      provider_name: payload.providerName?.toUpperCase().trim(),
      product_brand: payload.productBrand?.toUpperCase().trim(),
      product_model: payload.productModel?.toUpperCase().trim(),
      product_serial: payload.productSerial?.toUpperCase().trim(),
    });
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
    
    // Use raw axios to avoid default headers issues
    const baseURL = api.defaults.baseURL || '';
    const res = await axios.post(`${baseURL}/purchases/${id}/upload`, form, {
      withCredentials: true,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    return res.data as { url: string; filename: string; doc_kind?: string };
  },

  async getSuppliers() {
    const res = await api.get('/suppliers');
    return res.data;
  },

  async createSupplier(payload: { name: string; ruc: string; contact?: string }) {
    const res = await api.post('/suppliers', {
      name: payload.name?.toUpperCase().trim(),
      ruc: payload.ruc?.toUpperCase().trim(),
      contact: payload.contact?.toUpperCase().trim(),
    });
    return res.data;
  },
  async updateSupplier(id: string, payload: { name?: string; contact?: string; category?: string; department?: string; province?: string; district?: string; address?: string; phone?: string }) {
    const res = await api.put(`/suppliers/${id}`, {
      name: payload.name?.toUpperCase().trim(),
      contact: payload.contact?.toUpperCase().trim(),
      category: payload.category?.toUpperCase().trim(),
      department: payload.department?.toUpperCase().trim(),
      province: payload.province?.toUpperCase().trim(),
      district: payload.district?.toUpperCase().trim(),
      address: payload.address?.toUpperCase().trim(),
      phone: payload.phone?.toUpperCase().trim(),
    });
    return res.data;
  },

  async deleteSupplier(id: string) {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },

  async getIntermediaries(): Promise<Intermediary[]> {
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
  },
  async getConfig() {
    const res = await api.get('/config');
    return res.data;
  },
  async updateConfig(config: any) {
    const res = await api.put('/config', {
      ...config,
      companyName: config.companyName?.toUpperCase().trim(),
      igvExemptionReason: config.igvExemptionReason?.toUpperCase().trim(),
    });
    return res.data;
  },

  async createIntermediary(payload: { doc_number: string; name: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.post('/intermediaries', {
      doc_number: payload.doc_number?.toUpperCase().trim(),
      name: payload.name?.toUpperCase().trim(),
      ruc_number: payload.ruc_number?.toUpperCase().trim(),
      phone: payload.phone?.toUpperCase().trim(),
      email: payload.email?.toUpperCase().trim(),
      address: payload.address?.toUpperCase().trim(),
    });
    return res.data;
  },

  async deleteIntermediary(id: string) {
    const res = await api.delete(`/intermediaries/${id}`);
    return res.data;
  },
  async updateIntermediary(id: string, payload: { name?: string; ruc_number?: string; phone?: string; email?: string; address?: string }) {
    const res = await api.put(`/intermediaries/${id}`, {
      name: payload.name?.toUpperCase().trim(),
      ruc_number: payload.ruc_number?.toUpperCase().trim(),
      phone: payload.phone?.toUpperCase().trim(),
      email: payload.email?.toUpperCase().trim(),
      address: payload.address?.toUpperCase().trim(),
    });
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
      pdfUrl: BackendService.resolveUrl(t.pdf_url),
      xmlUrl: undefined,
      isIgvExempt: false,
      exemptionReason: undefined,
      // extras for UI
      voucherUrl: BackendService.resolveUrl(t.voucher_url),
      trxType: t.trx_type,
    }));
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
    return res.data;
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
      status: e.status === 'COMPLETED' ? ExpenseStatus.COMPLETED : ExpenseStatus.PENDING_DOCS,
      documentType: undefined,
      documentNumber: undefined,
      documentUrl: BackendService.resolveUrl(e.pdf_url || undefined),
    }));
  },

  async createExpense(payload: { description: string; amount: number; date: string; status: 'PENDING' | 'COMPLETED' }) {
    const res = await api.post('/expenses', {
      ...payload,
      description: payload.description?.toUpperCase().trim(),
    });
    return res.data;
  },

  async updateExpense(id: string, payload: { status?: 'PENDING' | 'COMPLETED'; pdfUrl?: string }) {
    const res = await api.put(`/expenses/${id}`, {
      status: payload.status,
      pdf_url: payload.pdfUrl,
    });
    return res.data;
  },

  async deleteExpense(id: string) {
    const res = await api.delete(`/expenses/${id}`);
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
    return res.data as { url: string; filename: string };
  },

  async getRoles() {
    const res = await api.get('/roles');
    return res.data;
  },
  async createRole(payload: any) {
    const res = await api.post('/roles', {
      ...payload,
      name: payload.name?.toUpperCase().trim(),
    });
    return res.data;
  },
  async updateRole(id: string, payload: any) {
    const res = await api.put(`/roles/${id}`, {
      ...payload,
      name: payload.name?.toUpperCase().trim(),
    });
    return res.data;
  },
  async deleteRole(id: string) {
    const res = await api.delete(`/roles/${id}`);
    return res.data;
  },
};
