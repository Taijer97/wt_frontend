
// Domain Types for the Application

export enum ProductStatus {
  IN_STOCK_RUC10 = 'EN_STOCK_PERSONA', 
  TRANSFERRED_RUC20 = 'TRANSFERIDO_EMPRESA', 
  SOLD = 'VENDIDO' 
}

export enum TaxRegime {
  RER = 'REGIMEN_ESPECIAL', 
  RMT = 'REGIMEN_MYPE',     
  RGT = 'REGIMEN_GENERAL'   
}

export enum PurchaseStatus {
  PENDING_DOCS = 'PENDIENTE_DOCS', 
  COMPLETED = 'COMPLETADO' 
}

export enum ExpenseStatus {
  PENDING_DOCS = 'PENDIENTE_DOCS',
  COMPLETED = 'COMPLETADO'
}

export enum ExpenseCategory {
  ALQUILER = 'ALQUILER_LOCAL',
  SERVICIOS = 'SERVICIOS_BASICOS',
  MARKETING = 'MARKETING_PUBLICIDAD',
  SUMINISTROS = 'SUMINISTROS_OFICINA',
  MOVILIDAD = 'MOVILIDAD_VIATICOS',
  MANTENIMIENTO = 'MANTENIMIENTO',
  OTROS = 'OTROS_GASTOS'
}

export enum PaymentMethod {
  CONTADO = 'CONTADO',
  CREDITO = 'CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum ReceiptType {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  LIQUIDACION = 'LIQUIDACION_COMPRA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  RECIBO_HONORARIOS = 'RECIBO_HONORARIOS',
  CONTRATO = 'CONTRATO_LEGALIZADO',
  OTRO = 'OTRO_DOCUMENTO'
}

export enum CivilStatus {
  SOLTERO = 'SOLTERO',
  CASADO = 'CASADO',
  VIUDO = 'VIUDO',
  DIVORCIADO = 'DIVORCIADO'
}

export enum HardwareOrigin {
  DECLARACION_JURADA = 'DJ', 
  BOLETA_TIENDA = 'BOLETA', 
  IMPORTACION_DIRECTA = 'IMPORTACION', 
  COMPRA_MAYORISTA_LOCAL = 'MAYORISTA_LOCAL' 
}

export type DocumentType = ReceiptType;

export enum PensionSystem {
  ONP = 'ONP',
  AFP_INTEGRA = 'AFP_INTEGRA',
  AFP_PRIMA = 'AFP_PRIMA',
  AFP_PROFUTURO = 'AFP_PROFUTURO',
  AFP_HABITAT = 'AFP_HABITAT'
}

// UserRole ahora es string para soportar roles dinámicos creados por el usuario
export type UserRole = string;

// --- SISTEMA DE PERMISOS ---
export interface PermissionSet {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type AppModule = 
  | 'dashboard' 
  | 'inventory' 
  | 'sales' 
  | 'purchases_ruc10' 
  | 'purchases_ruc20' 
  | 'expenses' 
  | 'payroll' 
  | 'accounting' 
  | 'settings';

export interface RoleConfig {
  id?: number;
  role: UserRole;
  label: string;
  permissions: Record<AppModule, PermissionSet>;
}

export interface Intermediary {
  id: string;
  fullName: string;
  docNumber: string; 
  rucNumber?: string; 
  phone: string;
  email: string;
  address: string;
}

export interface Supplier {
  id: string;
  ruc: string;
  razonSocial: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  department?: string;
  province?: string;
  district?: string;
  category: 'MAYORISTA' | 'RETAIL' | 'SERVICIOS';
}

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  beneficiary: string;
  status: ExpenseStatus;
  documentType?: ReceiptType;
  documentNumber?: string;
  documentUrl?: string; 
}

export type MarginType = 'PERCENT' | 'FIXED';

export interface AppConfig {
  uit: number;
  rmv: number;
  igvRate: number;
  rentaRate: number;
  companyName: string;
  companyRuc: string;
  companyAddress: string;
  companyDepartment: string;
  companyProvince: string;
  companyDistrict: string;
  companyPhone: string;
  companyEmail: string;
  defaultNotaryCost: number;
  ruc10Margin: number; 
  ruc10MarginType: MarginType; 
  ruc20SaleMargin: number; 
  ruc20SaleMarginType: MarginType;
  productCategories: string[];
  isIgvExempt: boolean;
  igvExemptionReason: string;
  ruc10TaxRegime: TaxRegime;
  ruc20TaxRegime: TaxRegime;
  ruc10DeclarationDay: number; 
  ruc20DeclarationDay: number;
  roleConfigs: RoleConfig[]; 
}

export interface Product {
  id: string;
  category?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  specs?: string;
  color?: string;
  condition?: 'USADO' | 'REACONDICIONADO' | 'NUEVO';
  sku?: string;
  name?: string;
  description?: string;
  stock?: number;
  unitPrice?: number;
  minStockAlert?: number;
  purchasePrice?: number;
  notaryCost?: number;
  totalCost?: number;
  status?: ProductStatus;
  origin?: HardwareOrigin;
  intermediaryId?: string; 
  transferBase?: number;
  transferIgv?: number;
  transferTotal?: number;
  transferDocType?: ReceiptType;
  transferDocNumber?: string;
  transferVoucherUrl?: string;
  transferVoucherBase64?: string;
  transferDate?: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceBase: number;
  totalBase: number;
}

export interface Transaction {
  id: string;
  date: string;
  documentType: ReceiptType;
  documentNumber: string;
  entityName: string;
  entityDocNumber: string;
  items: TransactionItem[];
  baseAmount: number;
  igvAmount: number;
  totalAmount: number;
  sunatStatus?: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO' | 'ANULADO';
  pdfUrl?: string;
  xmlUrl?: string;
  isIgvExempt?: boolean;
  exemptionReason?: string;
  trxType?: 'sale' | 'purchase' | 'transfer';
}

export interface Employee {
  id: string;
  fullName: string;
  docNumber: string;
  password?: string;
  phone: string;
  email: string;
  address: string;
  department?: string;
  province?: string;
  district?: string;
  civilStatus?: CivilStatus;
  baseSalary: number;
  pensionSystem: PensionSystem;
  hasChildren: boolean;
  role: UserRole;
  jobTitle?: string;
  entryDate?: string;
  cuspp?: string;
}

export interface WholesalePurchaseEntry {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierRuc: string;
  documentNumber: string;
  status: PurchaseStatus;
  items: { 
    id: string, 
    category: string,
    brand: string, 
    model: string, 
    serial: string, 
    cost: number, 
    specs: string 
  }[];
  baseAmount: number;
  igvAmount: number;
  totalAmount: number;
  pdfUrl?: string;
}

export interface PurchaseEntry {
  id: string;
  date: string;
  status: PurchaseStatus;
  intermediaryId?: string; 
  intermediaryName?: string;
  intermediaryDocNumber?: string;
  intermediaryRucNumber?: string;
  intermediaryAddress?: string;
  providerDni: string;
  providerName: string;
  providerAddress: string;
  providerCivilStatus: CivilStatus;
  providerOccupation: string;
  productType: string;
  productBrand: string;
  productModel: string;
  productSerial: string;
  productColor: string;
  productCondition: 'USADO' | 'REACONDICIONADO' | 'NUEVO';
  originType: HardwareOrigin;
  originProofUrl?: string;
  priceAgreed: number;
  costNotary: number;
  bankOrigin: string;
  bankDestination: string;
  operationNumber?: string;
  operationDate?: string;
  contractUrl?: string;
  voucherUrl?: string;
  items?: { id: string, category?: string, brand: string, model: string, serial: string, cost: number, specs?: string }[];
}

export interface SaleEntry {
  id: string;
  date: string;
  clientRucDni: string;
  clientName: string;
  documentType: 'FACTURA' | 'BOLETA';
  documentNumber: string;
  items: Product[];
  subtotal: number;
  igv: number;
  total: number;
}
