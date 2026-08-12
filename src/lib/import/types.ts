// ============================================================
// Data Import System - Type Definitions
// ============================================================

export type ImportModule = 
  | 'employees'           // HR - Employees
  | 'attendance'          // HR - Attendance Records
  | 'leaves'              // HR - Leave Balances
  | 'chart_of_accounts'   // Finance - Chart of Accounts
  | 'journal_entries'     // Finance - Journal Entries (Opening Balances)
  | 'invoices'            // Sales - Historical Invoices
  | 'bills'               // Purchases - Historical Bills
  | 'products'            // Inventory - Products/Services
  | 'partners'            // CRM - Customers/Suppliers
  | 'warehouses'          // Inventory - Warehouses & Locations
  | 'stock_movements'     // Inventory - Stock Movements (Initial)
  | 'sales_orders'        // Sales - Sales Orders
  | 'purchase_orders'     // Purchases - Purchase Orders
  | 'fixed_assets'        // Finance - Fixed Assets
  | 'tax_declarations'    // Tax - Tax Declarations
  | 'contracts'           // Legal - Contracts
  | 'bank_transactions'   // Finance - Bank Reconciliation
  | 'payroll_records'     // Payroll - Historical Payroll;

export type ImportJobStatusType = 
  | 'pending'
  | 'validating'
  | 'validated'
  | 'previewing'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled'
  | 'rolling_back'
  | 'rolled_back';

export type RowStatusType = 
  | 'pending'
  | 'validating'
  | 'valid'
  | 'warning'
  | 'error'
  | 'skipped'
  | 'imported'
  | 'failed';

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  dryRun?: boolean;
  batchSize?: number;
  continueOnError?: boolean;
  validateOnly?: boolean;
  skipRows?: number;
  dateFormat?: string;
  encoding?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

export interface ColumnMapping {
  [sourceColumn: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
  value?: any;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  row?: number;
  value?: any;
  code: string;
}

export interface ImportRowData {
  rowIndex: number;
  rawData: Record<string, any>;
  mappedData?: Record<string, any>;
  status: RowStatusType;
  validations?: ValidationResult;
  entityId?: string;
  entityType?: string;
  action?: string;
  errors?: string[];
  warnings?: string[];
}

export interface ImportJobSummary {
  id: string;
  jobName: string;
  module: ImportModule;
  status: ImportJobStatusType;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  skippedCount: number;
  duplicateCount: number;
  progress: number;
  fileName: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface ImportTemplateDefinition {
  name: string;
  module: ImportModule;
  description: string;
  version: string;
  columns: ImportColumnDef[];
  requiredColumns: string[];
  optionalColumns: string[];
  validationRules: Record<string, FieldValidationRule[]>;
  sampleData?: Record<string, any>[];
}

export interface ImportColumnDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'email' | 'phone';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  format?: string;
  description?: string;
  example?: string;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldValidationRule {
  type: 'required' | 'unique' | 'format' | 'range' | 'custom' | 'reference' | 'enum';
  message: string;
  params?: Record<string, any>;
  validator?: (value: any, row: Record<string, any>, ctx: ValidationContext) => boolean | string;
}

export interface ValidationContext {
  companyId: string;
  module: ImportModule;
  existingRecords?: Map<string, any>;
  db: any;
}

export interface ImportProgress {
  jobId: string;
  status: ImportJobStatusType;
  progress: number;
  currentRow: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
  message?: string;
}

// Module-specific data interfaces
export interface EmployeeImportData {
  firstName: string;
  lastName: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate: string;
  matricule?: string;
  department?: string;
  jobPosition?: string;
  jobTitle?: string;
  contractType?: string;
  baseSalary?: number;
  bankAccount?: string;
  bankName?: string;
  address?: string;
  city?: string;
  wilayaCode?: string;
  employeeStatus?: string;
  isActive?: boolean;
}

export interface ChartAccountImportData {
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  class?: string;           // Classe 1-8 du PCN
  parentCode?: string;
  nature?: string;          // detail, header, view
  isLeaf?: boolean;
  isTaxAccount?: boolean;
  taxType?: string;         // tva_collectee, tva_deductible, tap, irg, ibs
  reconcileable?: boolean;
}

export interface ProductImportData {
  name: string;
  code?: string;              // Code produit unique (SKU)
  description?: string;
  nameAr?: string;
  type: string;               // stockable, service, consumable
  category?: string;          // Category name (will lookup categoryId)
  unitOfMeasure?: string;     // U, KG, L, m², m³, ML
  purchasePrice?: number;
  salePrice?: number;
  costPrice?: number;
  tvaRate?: number;
  trackStock?: boolean;
  canBeSold?: boolean;
  canBePurchased?: boolean;
  isActive?: boolean;
}

export interface PartnerImportData {
  name: string;
  displayName?: string;
  type: string;               // customer, supplier, both
  isCompany?: boolean;
  isTaxPayer?: boolean;
  
  // Identifiants Algériens
  rc?: string;                // Registre Commerce
  nif?: string;               // NIF
  nis?: string;               // NIS
  ai?: string;                // Article d'imposition
  numArticleImpot?: string;
  
  // Contact
  contactName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  
  // Adresse
  address?: string;
  city?: string;
  postalCode?: string;
  wilayaCode?: string;
  
  // Financier
  paymentTerms?: string;      // Délai en jours (ex: "30")
  paymentMode?: string;       // virement, cheque, espece, traite
  creditLimit?: number;
  bankAccount?: string;       // RIB
  
  // Catégorisation
  category?: string;
  
  // Statut
  isActive?: boolean;
  notes?: string;
}

export interface InvoiceImportData {
  invoiceNumber: string;
  partnerName: string;
  partnerType: string;
  date: string;
  dueDate?: string;
  items: InvoiceItemImportData[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  status?: string;
  paymentStatus?: string;
  notes?: string;
}

export interface InvoiceItemImportData {
  productSku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  total?: number;
}

export interface BillImportData {
  billNumber: string;
  supplierName: string;
  date: string;
  dueDate?: string;
  items: BillItemImportData[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface BillItemImportData {
  productSku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total?: number;
}

export interface AttendanceImportData {
  employeeId: string;       // Matricule or employee ID
  date: string;             // Date YYYY-MM-DD
  clockIn?: string;         // Heure d'arrivée HH:MM
  clockOut?: string;        // Heure de départ HH:MM
  breakDuration?: number;   // Durée pause (minutes)
  workedHours?: number;     // Heures travaillées
  status?: string;          // present, absent, late, half_day, leave, holiday
  overtimeHours?: number;   // Heures supplémentaires
  notes?: string;
}

export interface JournalEntryImportData {
  date: string;
  journalCode: string;
  label: string;
  reference?: string;
  lines: JournalLineImportData[];
  attachmentRef?: string;
}

export interface JournalLineImportData {
  accountCode: string;
  label: string;
  debit: number;
  credit: number;
  partnerRef?: string;
}

// Inventory Module Types
export interface WarehouseImportData {
  name: string;
  code: string;              // Required - unique identifier
  address?: string;
  type?: 'principal' | 'secondaire' | 'magasin' | 'depot';
  isActive?: boolean;
}

export interface StockMovementImportData {
  sku: string;               // Product reference (required)
  productName?: string;      // For display/validation
  warehouse: string;         // Warehouse name (required)
  quantity: number;          // Movement quantity (required)
  unitCost?: number;         // Cost per unit
  date?: string;             // Movement date YYYY-MM-DD
  type?: string;             // in, out, adjustment, initial
  location?: string;        // Bin location
  reference?: string;        // Movement reference number
  notes?: string;
}
