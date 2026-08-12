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
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  hireDate: string;
  employeeId?: string;
  department?: string;
  position?: string;
  contractType?: string;
  salary?: number;
  bankAccount?: string;
  bankName?: string;
  address?: string;
  city?: string;
  wilayaCode?: string;
  status?: string;
}

export interface ChartAccountImportData {
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  category?: string;
  parentCode?: string;
  balance?: number;
  currency?: string;
  taxDeductible?: boolean;
  isActive?: boolean;
}

export interface ProductImportData {
  name: string;
  sku?: string;
  barcode?: string;
  type: string;
  category?: string;
  unit?: string;
  purchasePrice?: number;
  salePrice?: number;
  taxRate?: number;
  stockQuantity?: number;
  minStock?: number;
  warehouse?: string;
  isActive?: boolean;
}

export interface PartnerImportData {
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  wilayaCode?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  contactPerson?: string;
  paymentTerms?: number;
  creditLimit?: number;
  isActive?: boolean;
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
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakMinutes?: number;
  workHours?: number;
  status?: string;
  overtimeHours?: number;
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
  code?: string;
  address?: string;
  city?: string;
  type?: 'principal' | 'secondaire' | 'magasin' | 'depot';
  isActive?: boolean;
}

export interface StockMovementImportData {
  sku: string;
  productName?: string;
  warehouse: string;
  quantity: number;
  unitCost?: number;
  location?: string;
  notes?: string;
}
