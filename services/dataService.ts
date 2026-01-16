
import { Transaction, Product, Employee, AppConfig, PurchaseEntry, ProductStatus, PurchaseStatus, ReceiptType, Supplier, HardwareOrigin, UserRole, Intermediary, ExpenseEntry, ExpenseStatus, WholesalePurchaseEntry, AppModule, PermissionSet, PensionSystem } from '../types';
import { DEFAULT_CONFIG, MOCK_PRODUCTS, MOCK_EMPLOYEES } from '../constants';

const LS_KEYS = {
  SALES: 'mype_sales',
  PURCHASES: 'mype_purchases_v2', 
  WHOLESALE_PURCHASES: 'mype_wholesale_purchases_v1',
  PRODUCTS: 'mype_products',
  EMPLOYEES: 'mype_employees',
  SUPPLIERS: 'mype_suppliers',
  INTERMEDIARIES: 'mype_intermediaries', 
  EXPENSES: 'mype_expenses',
  CONFIG: 'mype_config',
  SESSION: 'mype_session',
  ACCOUNTING_PURCHASES: 'mype_accounting_purchases'
};

export const DataService = {
  // --- Auth & Config ---
  login: (docNumber: string, password: string) => {
    const employees = DataService.getEmployees();
    const user = employees.find(e => e.docNumber === docNumber && e.password === password);
    if (user) { localStorage.setItem(LS_KEYS.SESSION, JSON.stringify(user)); return { success: true, user }; }
    return { success: false, message: 'Credenciales inválidas' };
  },
  register: (emp: Partial<Employee>) => {
    const employees = DataService.getEmployees();
    if (employees.find(e => e.docNumber === emp.docNumber)) return false;
    const newEmp: Employee = {
      id: Date.now().toString(), fullName: emp.fullName || '', docNumber: emp.docNumber || '',
      phone: emp.phone || '', email: emp.email || '', address: emp.address || '', password: emp.password || '',
      baseSalary: 1130, pensionSystem: PensionSystem.ONP, hasChildren: false, role: emp.role || 'USER',
    };
    DataService.saveEmployee(newEmp); return true;
  },
  logout: () => localStorage.removeItem(LS_KEYS.SESSION),
  getCurrentUser: (): Employee | null => {
    const session = localStorage.getItem(LS_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  },
  checkPermission: (module: AppModule, action: keyof PermissionSet): boolean => {
    const user = DataService.getCurrentUser();
    if (!user) return false;
    const config = DataService.getConfig();
    const roleCfg = config.roleConfigs.find(r => r.role === user.role);
    return roleCfg ? roleCfg.permissions[module][action] : false;
  },
  getConfig: (): AppConfig => {
    const saved = localStorage.getItem(LS_KEYS.CONFIG);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  },
  saveConfig: (config: AppConfig) => localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(config)),

  // --- Products & Entity CRUD ---
  getProducts: () => JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || JSON.stringify(MOCK_PRODUCTS)) as Product[],
  saveProduct: (p: Product) => {
    const list = DataService.getProducts();
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(list));
  },
  getSuppliers: () => JSON.parse(localStorage.getItem(LS_KEYS.SUPPLIERS) || '[]') as Supplier[],
  saveSupplier: (s: Supplier) => {
    const list = DataService.getSuppliers();
    const idx = list.findIndex(i => i.id === s.id);
    if(idx >= 0) list[idx] = s; else list.push(s);
    localStorage.setItem(LS_KEYS.SUPPLIERS, JSON.stringify(list));
  },
  deleteSupplier: (id: string) => localStorage.setItem(LS_KEYS.SUPPLIERS, JSON.stringify(DataService.getSuppliers().filter(s => s.id !== id))),
  getIntermediaries: () => JSON.parse(localStorage.getItem(LS_KEYS.INTERMEDIARIES) || '[]') as Intermediary[],
  saveIntermediary: (i: Intermediary) => {
    const list = DataService.getIntermediaries();
    const idx = list.findIndex(x => x.id === i.id);
    if (idx >= 0) list[idx] = i; else list.push(i);
    localStorage.setItem(LS_KEYS.INTERMEDIARIES, JSON.stringify(list));
  },
  deleteIntermediary: (id: string) => localStorage.setItem(LS_KEYS.INTERMEDIARIES, JSON.stringify(DataService.getIntermediaries().filter(i => i.id !== id))),

  // --- Accounting & Audit Protection ---
  getTransactions: (type: 'sale' | 'purchase'): Transaction[] => {
    const key = type === 'sale' ? LS_KEYS.SALES : LS_KEYS.ACCOUNTING_PURCHASES;
    return JSON.parse(localStorage.getItem(key) || '[]') as Transaction[];
  },
  addTransaction: (type: 'sale' | 'purchase', t: Transaction) => {
    const key = type === 'sale' ? LS_KEYS.SALES : LS_KEYS.ACCOUNTING_PURCHASES;
    const list = DataService.getTransactions(type);
    list.push(t);
    localStorage.setItem(key, JSON.stringify(list));
  },
  deleteTransaction: (type: 'sale' | 'purchase', id: string) => {
    const key = type === 'sale' ? LS_KEYS.SALES : LS_KEYS.ACCOUNTING_PURCHASES;
    const list = DataService.getTransactions(type);
    const trans = list.find(t => t.id === id);
    if (type === 'sale' && trans) {
        const products = DataService.getProducts();
        trans.items.forEach(item => {
            const p = products.find(prod => prod.id === item.productId);
            if (p) {
                // Restaurar stock
                p.stock = (p.stock || 0) + item.quantity;
                // Restaurar estado: si tiene info de transferencia vuelve a RUC 20, sino a RUC 10
                if (p.transferDocNumber) {
                    p.status = ProductStatus.TRANSFERRED_RUC20;
                } else {
                    p.status = ProductStatus.IN_STOCK_RUC10;
                }
            }
        });
        localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
    }
    localStorage.setItem(key, JSON.stringify(list.filter(t => t.id !== id)));
  },

  // --- Purchases RUC 20 (Wholesale) ---
  getWholesalePurchases: () => JSON.parse(localStorage.getItem(LS_KEYS.WHOLESALE_PURCHASES) || '[]') as WholesalePurchaseEntry[],
  addWholesalePurchasePending: (p: WholesalePurchaseEntry) => {
    const list = DataService.getWholesalePurchases();
    list.push(p);
    localStorage.setItem(LS_KEYS.WHOLESALE_PURCHASES, JSON.stringify(list));
  },
  deleteWholesalePurchase: (id: string) => {
      const list = DataService.getWholesalePurchases();
      const purchase = list.find(p => p.id === id);
      if (purchase && purchase.status === PurchaseStatus.COMPLETED) {
          const products = DataService.getProducts();
          const serials = purchase.items.map(i => i.serial);
          const soldItems = products.filter(p => serials.includes(p.serialNumber || '') && p.status === ProductStatus.SOLD);
          if (soldItems.length > 0) { alert("ERROR AUDITORÍA: No se puede eliminar una compra con productos ya vendidos."); return; }
          localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products.filter(p => !serials.includes(p.serialNumber || ''))));
          DataService.deleteTransaction('purchase', `PUR-WH-${id}`);
      }
      localStorage.setItem(LS_KEYS.WHOLESALE_PURCHASES, JSON.stringify(list.filter(p => p.id !== id)));
  },
  completeWholesalePurchase: (purchaseId: string, pdfUrl: string) => {
    const list = DataService.getWholesalePurchases();
    const idx = list.findIndex(p => p.id === purchaseId);
    if (idx === -1) return;
    const purchase = list[idx];
    purchase.status = PurchaseStatus.COMPLETED;
    purchase.pdfUrl = pdfUrl;
    
    const config = DataService.getConfig();
    const effectiveIgv = config.isIgvExempt ? 0 : 0.18;
    const products = DataService.getProducts();
    purchase.items.forEach(item => {
      products.push({
        id: `WH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, category: item.category,
        serialNumber: item.serial, brand: item.brand, model: item.model, specs: item.specs, condition: 'NUEVO',
        status: ProductStatus.TRANSFERRED_RUC20, origin: HardwareOrigin.COMPRA_MAYORISTA_LOCAL,
        transferBase: item.cost, transferIgv: item.cost * effectiveIgv, transferTotal: item.cost * (1 + effectiveIgv),
        transferDocType: ReceiptType.FACTURA, transferDocNumber: purchase.documentNumber, transferDate: purchase.date
      });
    });
    localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
    DataService.addTransaction('purchase', {
      id: `PUR-WH-${purchase.id}`, date: purchase.date, documentType: ReceiptType.FACTURA,
      documentNumber: purchase.documentNumber, entityName: purchase.supplierName, entityDocNumber: purchase.supplierRuc,
      items: purchase.items.map(i => ({ productId: 'REF', productName: i.model, quantity: 1, unitPriceBase: i.cost, totalBase: i.cost })),
      baseAmount: purchase.baseAmount, igvAmount: purchase.baseAmount * effectiveIgv, totalAmount: purchase.baseAmount * (1 + effectiveIgv),
      sunatStatus: 'ACEPTADO', pdfUrl: pdfUrl
    });
    localStorage.setItem(LS_KEYS.WHOLESALE_PURCHASES, JSON.stringify(list));
  },

  // --- Purchases RUC 10 (Individual) ---
  getPurchases: () => JSON.parse(localStorage.getItem(LS_KEYS.PURCHASES) || '[]') as PurchaseEntry[],
  addPurchase: (p: PurchaseEntry) => {
      const list = DataService.getPurchases();
      list.push(p);
      localStorage.setItem(LS_KEYS.PURCHASES, JSON.stringify(list));
  },
  deletePurchaseRuc10: (id: string) => {
      const list = DataService.getPurchases();
      const p = list.find(x => x.id === id);
      if (p && p.status === PurchaseStatus.COMPLETED) {
          const products = DataService.getProducts();
          const target = products.find(prod => prod.serialNumber === p.productSerial);
          if (target && target.status !== ProductStatus.IN_STOCK_RUC10) { alert("ERROR: El equipo ya fue transferido o vendido."); return; }
          localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products.filter(prod => prod.serialNumber !== p.productSerial)));
      }
      localStorage.setItem(LS_KEYS.PURCHASES, JSON.stringify(list.filter(x => x.id !== id)));
  },
  updatePurchase: (upd: PurchaseEntry) => {
      const list = DataService.getPurchases();
      const idx = list.findIndex(p => p.id === upd.id);
      if (idx >= 0) {
          list[idx] = upd;
          localStorage.setItem(LS_KEYS.PURCHASES, JSON.stringify(list));
          if (upd.status === PurchaseStatus.COMPLETED) {
              DataService.saveProduct({
                  id: Date.now().toString(), category: upd.productType, serialNumber: upd.productSerial,
                  brand: upd.productBrand, model: upd.productModel, specs: `${upd.productType} - ${upd.productColor}`,
                  purchasePrice: upd.priceAgreed, notaryCost: upd.costNotary, totalCost: upd.priceAgreed + upd.costNotary,
                  status: ProductStatus.IN_STOCK_RUC10, intermediaryId: upd.intermediaryId, stock: 1
              });
          }
      }
  },

  // --- Expenses & Workers ---
  getExpenses: () => JSON.parse(localStorage.getItem(LS_KEYS.EXPENSES) || '[]') as ExpenseEntry[],
  saveExpense: (e: ExpenseEntry) => {
    const list = DataService.getExpenses();
    const idx = list.findIndex(x => x.id === e.id);
    if (idx >= 0) list[idx] = e; else list.push(e);
    localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(list));
  },
  deleteExpense: (id: string) => localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(DataService.getExpenses().filter(e => e.id !== id))),
  getEmployees: () => JSON.parse(localStorage.getItem(LS_KEYS.EMPLOYEES) || JSON.stringify(MOCK_EMPLOYEES)) as Employee[],
  saveEmployee: (e: Employee) => {
    const list = DataService.getEmployees();
    const idx = list.findIndex(x => x.id === e.id);
    if (idx >= 0) list[idx] = e; else list.push(e);
    localStorage.setItem(LS_KEYS.EMPLOYEES, JSON.stringify(list));
  },
  deleteEmployee: (id: string) => localStorage.setItem(LS_KEYS.EMPLOYEES, JSON.stringify(DataService.getEmployees().filter(e => e.id !== id))),

  // --- Tax & Internal Transfers ---
  transferProductToCompany: (pid: string, data: any) => {
      const products = DataService.getProducts();
      const idx = products.findIndex(p => p.id === pid);
      if (idx === -1) return false;
      const p = products[idx];
      products[idx] = { 
          ...p, status: ProductStatus.TRANSFERRED_RUC20, intermediaryId: data.intermediaryId,
          transferBase: data.base, transferIgv: data.igv, transferTotal: data.total,
          transferDocType: ReceiptType.FACTURA, transferDocNumber: data.docNumber,
          transferVoucherUrl: data.voucherUrl, transferDate: new Date().toISOString()
      };
      localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
      DataService.addTransaction('purchase', {
          id: `TRF-${Date.now()}`, date: new Date().toISOString(), documentType: ReceiptType.FACTURA,
          documentNumber: data.docNumber, entityName: `EMISOR RUC 10`, entityDocNumber: data.intermediaryId,
          items: [{ productId: p.id, productName: p.model || 'Laptop', quantity: 1, unitPriceBase: data.base, totalBase: data.base }],
          baseAmount: data.base, igvAmount: data.igv, totalAmount: data.total, sunatStatus: 'ACEPTADO'
      });
      return true;
  },
  calculateTaxPeriod: (monthStr: string) => {
    const sales = DataService.getTransactions('sale').filter(t => t.date.startsWith(monthStr));
    const purchases = DataService.getTransactions('purchase').filter(t => t.date.startsWith(monthStr));
    const vBase = sales.reduce((a, b) => a + b.baseAmount, 0);
    const vIgv = sales.reduce((a, b) => a + b.igvAmount, 0);
    const cIgv = purchases.reduce((a, b) => a + b.igvAmount, 0);
    const igvPagar = Math.max(0, vIgv - cIgv);
    const renta = vBase * DataService.getConfig().rentaRate;
    return { 
      period: monthStr, totalVentasBase: vBase, debitoFiscal: vIgv, 
      creditoFiscal: cIgv, igvPorPagar: igvPagar, rentaMensual: renta, 
      totalSunat: igvPagar + renta 
    };
  }
};
