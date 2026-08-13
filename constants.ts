
import { AppConfig, PensionSystem, Product, ReceiptType, Employee, TaxRegime, UserRoleConfig, PermissionSet, AppModule } from './types';

const allAccess = (): PermissionSet => ({ create: true, read: true, update: true, delete: true });
const readOnly = (): PermissionSet => ({ create: false, read: true, update: false, delete: false });
const noAccess = (): PermissionSet => ({ create: false, read: false, update: false, delete: false });

const ROLES_DEFAULT: UserRoleConfig[] = [
  {
    role: 'ADMIN',
    label: 'Administrador Total',
    permissions: {
      // Principal
      dashboard: allAccess(),
      tablero_estadistico: allAccess(),
      clientes: allAccess(),
      // Ventas & Compras
      sales: allAccess(),
      sales_history: allAccess(),
      purchases_ruc10: allAccess(),
      purchases_ruc20: allAccess(),
      // Operaciones
      inventory: allAccess(),
      expenses: allAccess(),
      // Administración
      payroll: allAccess(),
      // Sistema & Reportes
      accounting: allAccess(),
      accounting_sire: allAccess(),
      audit: allAccess(),
      settings: allAccess(),
    }
  },
  {
    role: 'VENDEDOR',
    label: 'Vendedor / Counter',
    permissions: {
      dashboard: readOnly(),
      tablero_estadistico: readOnly(),
      clientes: readOnly(),
      sales: { create: true, read: true, update: false, delete: false },
      sales_history: readOnly(),
      purchases_ruc10: noAccess(),
      purchases_ruc20: noAccess(),
      inventory: readOnly(),
      expenses: noAccess(),
      payroll: noAccess(),
      accounting: noAccess(),
      accounting_sire: noAccess(),
      audit: noAccess(),
      settings: noAccess(),
    }
  },
  {
    role: 'CAJA',
    label: 'Tesorero / Caja',
    permissions: {
      dashboard: readOnly(),
      tablero_estadistico: readOnly(),
      clientes: readOnly(),
      sales: { create: true, read: true, update: true, delete: false },
      sales_history: readOnly(),
      purchases_ruc10: { create: true, read: true, update: true, delete: false },
      purchases_ruc20: { create: true, read: true, update: true, delete: false },
      inventory: readOnly(),
      expenses: { create: true, read: true, update: true, delete: false },
      payroll: noAccess(),
      accounting: readOnly(),
      accounting_sire: noAccess(),
      audit: noAccess(),
      settings: noAccess(),
    }
  },
  {
    role: 'RRHH',
    label: 'Recursos Humanos',
    permissions: {
      dashboard: readOnly(),
      tablero_estadistico: readOnly(),
      clientes: noAccess(),
      sales: noAccess(),
      sales_history: noAccess(),
      purchases_ruc10: noAccess(),
      purchases_ruc20: noAccess(),
      inventory: noAccess(),
      expenses: { create: true, read: true, update: false, delete: false },
      payroll: allAccess(),
      accounting: noAccess(),
      accounting_sire: noAccess(),
      audit: noAccess(),
      settings: { create: false, read: true, update: true, delete: false },
    }
  },
  {
    role: 'USER',
    label: 'Usuario Estándar',
    permissions: {
      dashboard: readOnly(),
      tablero_estadistico: readOnly(),
      clientes: readOnly(),
      sales: noAccess(),
      sales_history: noAccess(),
      purchases_ruc10: { create: true, read: true, update: true, delete: false },
      purchases_ruc20: noAccess(),
      inventory: readOnly(),
      expenses: noAccess(),
      payroll: noAccess(),
      accounting: noAccess(),
      accounting_sire: noAccess(),
      audit: noAccess(),
      settings: noAccess(),
    }
  }
];

export const DEFAULT_CONFIG: AppConfig = {
  uit: 5350, 
  rmv: 1130, 
  igvRate: 0.18,
  rentaRate: 0.01, 
  companyName: "Nombre de su Empresa S.A.C.",
  companyRuc: "20XXXXXXXXX",
  companyAddress: "Av. Principal 123",
  companyDepartment: "Lima",
  companyProvince: "Lima",
  companyDistrict: "La Victoria",
  companyPhone: "01-5555555",
  companyEmail: "contacto@empresa.com",
  defaultNotaryCost: 40,
  ruc10Margin: 0.05, 
  ruc10MarginType: 'PERCENT',
  ruc20SaleMargin: 0.30,
  ruc20SaleMarginType: 'PERCENT',
  productCategories: ["Laptop", "Desktop", "Tablet", "Smartphone", "Televisor", "Audio", "Electrodomésticos"],
  isIgvExempt: false,
  igvExemptionReason: "Exoneradas (código 20 en facturación electrónica)",
  ruc10TaxRegime: TaxRegime.RMT,
  ruc20TaxRegime: TaxRegime.RMT,
  ruc10DeclarationDay: 1,
  ruc20DeclarationDay: 20,
  roleConfigs: ROLES_DEFAULT
};

export const MOCK_PRODUCTS: Product[] = [];

export const MOCK_EMPLOYEES: Employee[] = [
  { 
    id: 'admin-1', 
    fullName: 'Admin Sistema', 
    docNumber: 'admin', 
    password: 'admin', 
    baseSalary: 3500, 
    pensionSystem: PensionSystem.ONP, 
    hasChildren: false, 
    role: 'ADMIN', 
    phone: '999000000', 
    email: 'admin@empresa.com', 
    address: 'Dirección Fiscal' 
  }
];
