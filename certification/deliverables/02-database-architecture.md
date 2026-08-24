# HASSIBA Suite ERP - Database Architecture

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable  
**Schema File:** `prisma/schema.prisma`  
**Total Models:** 64+ Tables  
**Compliance:** SCF (Système Comptable Financier) Algerian

---

## 1. Database Overview

### 1.1 Database Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"        // Development
  // provider = "postgresql"  // Production
  url      = env("DATABASE_URL")
}
```

### 1.2 Technology Stack

| Environment | Database | Provider | Connection |
|-------------|----------|----------|------------|
| Development | SQLite | sqlite | Local file |
| Production | PostgreSQL | postgresql | Connection pool |

### 1.3 Schema Statistics

| Metric | Count |
|--------|-------|
| Total Models (Tables) | 64+ |
| Enums | 35+ |
| Relations | 200+ |
| Indexes | 50+ |
| Unique Constraints | 30+ |

---

## 2. Complete Model Catalog

### 2.1 Core Authentication & Users (5 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **User** | `users` | System users with roles | id, email, role, companyId |
| **Session** | `sessions` | NextAuth.js sessions | sessionToken, userId, expires |
| **Account** | `accounts` | OAuth/linkedin accounts | userId, provider, providerAccountId |
| **VerificationToken** | `verification_tokens` | Email verification | identifier, token, expires |
| **PasswordReset** | `password_resets` | Password reset tokens | email, token, expiresAt |

#### User Model Detail
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  password      String?
  role          String   @default("user") // admin, manager, accountant, hr, sales, user
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  companyId     String?
  company       Company?
  
  // Relations (30+ relation fields)
  sessions      Session[]
  accounts      Account[]
  auditLogs     AuditLog[]
  notifications Notification[]
  // ... more relations
}
```

---

### 2.2 Company & Localization (3 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Company** | `companies` | Tenant/company master | id, name, rc, nif, nis, taxRegime |
| **Wilaya** | `wilayas` | Algerian provinces (58) | code, nameFr, nameAr, taxZone |
| **Commune** | `communes` | Municipalities within wilayas | code, nameFr, wilayaCode |

#### Company Model - Algerian Identifiers
```prisma
model Company {
  // Legal identifiers (Algerian-specific)
  rc              String?   // Registre de Commerce
  nif             String?   // Numéro Identification Fiscale
  nis             String?   // Numéro Identification Statistique
  ai              String?   // Article d'Imposition
  taxRegime       String    @default("reel") // reel, simplifie, forfait
  
  // Localization
  currency        String    @default("DZD")
  language        String    @default("fr")     // fr, ar, ber
  wilayaCode      String?   // 01-58
  
  // Fiscal configuration
  fiscalYearStart Int       @default(1)       // Month start (1=January)
}
```

---

### 2.3 Accounting Module (6 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **ChartOfAccount** | `chart_of_accounts` | SCF chart of accounts | code, type, class, isTaxAccount |
| **Journal** | `journals` | Accounting journals | code (VT/AC/BQ/CA/OD/PA), type |
| **JournalEntry** | `journal_entries` | Accounting entries | reference, date, totalDebit, totalCredit, status |
| **JournalItem** | `journal_items` | Entry line items | accountId, debit, credit |
| **BankAccount** | `bank_accounts` | Bank accounts | accountNumber, rib, currency, balance |
| **CurrencyRate** | `currency_rates` | Exchange rates | fromCurrency, toCurrency, rate, date |

#### ChartOfAccount - SCF Structure
```prisma
model ChartOfAccount {
  code          String   @unique       // SCF account code
  name          String                 // Account name
  nameAr        String?                // Arabic name
  type          String                 // asset, liability, equity, revenue, expense
  class         String                 // Class 1-8 (PCN)
  parentCode    String?                // Parent account code
  nature        String?                // detail, header, view
  isLeaf        Boolean  @default(false)
  isTaxAccount  Boolean  @default(false) // TVA, IRG, etc.
  taxType       String?                // tva_collectee, tva_deductible, tap, irg, ibs
  reconcileable Boolean  @default(false)
  companyId     String
  company       Company
  
  @@unique([code, companyId])
}
```

#### Journal Types
| Code | Name | Type | Usage |
|------|------|------|-------|
| VT | Journal des Ventes | sale | Customer invoices |
| AC | Journal des Achats | purchase | Supplier bills |
| BQ | Journal de Banque | bank | Bank transactions |
| CA | Journal de Caisse | cash | Cash operations |
| OD | Journal des Opérations Diverses | miscellaneous | Adjustments |
| PA | Journal de Paie | payroll | Salary entries |

---

### 2.4 Partners & CRM (3 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Partner** | `partners` | Customers & suppliers | type (customer/supplier/both), rc, nif |
| **Opportunity** | `opportunities` | Sales pipeline | status, stage, expectedRevenue |
| **Activity** | `activities` | CRM activities | type (call/meeting/email), opportunityId |

#### Partner Model
```prisma
model Partner {
  type         PartnerType @default(customer)  // customer, supplier, both
  isTaxPayer   Boolean     @default(true)
  
  // Algerian identifiers
  rc           String?     // Registre Commerce
  nif          String?     // NIF
  nis          String?     // NIS
  ai           String?     // Article d'Imposition
  
  // Financial
  paymentTerms String      @default("30")  // Payment delay (days)
  paymentMode  String?     // virement, cheque, espece, traite
  creditLimit  Float       @default(0)
  bankAccount  String?     // RIB
}
```

---

### 2.5 Products & Inventory (5 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **ProductCategory** | `product_categories` | Product categories | code, parentId (hierarchical) |
| **Product** | `products` | Products & services | code, type, salePrice, purchasePrice, tvaRate |
| **Warehouse** | `warehouses` | Storage locations | code, address |
| **Location** | `locations` | Warehouse zones | code, warehouseId |
| **StockLevel** | `stock_levels` | Stock quantities | productId, warehouseId, quantity |
| **StockMovement** | `stock_movements` | Stock movements | type (in/out), quantity, unitCost |

#### Product Types
```typescript
enum ProductType {
  stockable    // Physical inventory items
  consumable   // Consumed in operations
  service      // Non-physical services
  kit          // Product bundles
  digital      // Digital goods
}
```

#### Movement Types
```typescript
enum MovementType {
  in_receipt,      // Supplier receipt
  in_return,       // Customer return
  in_adjustment,   // Positive inventory adjustment
  in_transfer,     // Incoming transfer
  out_delivery,    // Customer delivery
  out_return,      // Supplier return
  out_adjustment,  // Negative inventory adjustment
  out_transfer,    // Outgoing transfer
  out_consumption  // Internal consumption
}
```

---

### 2.6 Invoicing (6 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Invoice** | `invoices` | Customer invoices | reference, status, amountTotal |
| **InvoiceLine** | `invoice_lines` | Invoice line items | productId, quantity, unitPrice, tvaRate |
| **Bill** | `bills` | Supplier bills | reference, status, amountTotal |
| **BillLine** | `bill_lines` | Bill line items | productId, quantity, unitPrice |
| **Payment** | `payments` | Payments (in/out) | type, method, amount, status |
| **Quotation** | `quotations` | Sales quotations | reference, status, validUntil |
| **QuotationLine** | `quotation_lines` | Quotation line items | productId, quantity, unitPrice |

#### Invoice Status Flow
```
draft → sent → paid/partial → cancelled
              ↓
         (payment received)
```

#### Bill Status Flow
```
draft → received → verified → approved → paid → cancelled
```

---

### 2.7 Orders (4 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **PurchaseOrder** | `purchase_orders` | Purchase orders | reference, status, amountTotal |
| **PurchaseOrderLine** | `purchase_order_lines` | PO line items | productId, quantityReceived |
| **SalesOrder** | `sales_orders` | Sales orders | reference, status, amountTotal |
| **SalesOrderLine** | `sales_order_lines` | SO line items | productId, quantityDelivered |

---

### 2.8 Human Resources (7 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Employee** | `employees` | Employee master | matricule, firstName, lastName, baseSalary |
| **Contract** | `contracts` | Employment contracts | type, status, baseSalary |
| **Payroll** | `payrolls` | Payroll records | period, grossSalary, netPayable |
| **LeaveRequest** | `leave_requests` | Leave requests | type, startDate, endDate, status |
| **LeaveBalance** | `leave_balances` | Leave balances | leaveType, year, remaining |
| **Attendance** | `attendances` | Time clock data | date, clockIn, clockOut, workedHours |
| **PublicHoliday** | `public_holidays` | Company holidays | date, type, isRecurring |

#### Employee Model
```prisma
model Employee {
  matricule         String   @unique    // Internal ID
  firstName         String
  lastName          String
  firstNameAr       String?
  lastNameAr        String?
  
  // Identification
  cin               String?   // National ID
  cnasNumber        String?   // Social security (CNAS)
  casnosNumber      String?   // Pension fund (CASNOS)
  
  // Employment
  contractType      ContractType @default(cdi)  // cdi, cdd, internship, etc.
  department        String?
  jobTitle          String?
  baseSalary        Float     @default(0)
  dailyRate         Float     @default(0)
  hourlyRate        Float     @default(0)
  
  // Bank
  bankName          String?
  bankAccount       String?   // CCP or RIB
}
```

#### Payroll Model - Complete Structure
```prisma
model Payroll {
  // Gains
  baseSalary          Float  @default(0)
  grossSalary         Float  @default(0)
  primeAnciennete     Float  @default(0)   // Seniority bonus
  primeRendement      Float  @default(0)   // Performance bonus
  primeResponsabilite Float  @default(0)   // Responsibility bonus
  primeTechnicite     Float  @default(0)   // Technical bonus
  primeTransport      Float  @default(0)   // Transport allowance
  primePanier         Float  @default(0)   // Meal allowance
  primeLogement       Float  @default(0)   // Housing allowance
  primeMarie          Float  @default(0)   // Marriage allowance
  allocationsFam      Float  @default(0)   // Family allowances
  heuresSupp          Float  @default(0)   // Overtime hours
  montantHeuresSupp   Float  @default(0)   // Overtime amount
  autresGains         Float  @default(0)   // Other gains
  
  // Employee deductions (Cotisations salariales)
  cotisationCNAS      Float  @default(0)   // 1.5%
  cotisationCASNOS    Float  @default(0)   // 7.5%
  totalCotisations    Float  @default(0)   // 9% total
  
  // Retenues
  irgRetenu           Float  @default(0)   // Income tax
  avanceSalaire       Float  @default(0)   // Salary advance
  opposition          Float  @default(0)   // Wage garnishment
  mutuelle            Float  @default(0)   // Health insurance
  cnacCredit          Float  @default(0)   // CNAC loan
  autresRetenues      Float  @default(0)   // Other deductions
  totalRetenues       Float  @default(0)
  
  // Net
  netPayable          Float  @default(0)
  netEnLettres        String?
  
  // Employer charges (Charges patronales)
  patronalCNAS        Float  @default(0)   // 8.5%
  patronalCASNOS      Float  @default(0)   // 12.5%
  patronalChomage     Float  @default(0)   // 1%
  patronalAT          Float  @default(0)   // Work accident
  patronalOEuvres     Float  @default(0)   // Social works
  totalPatronal       Float  @default(0)   // ~25-30% total
  coutTotalEmploye    Float  @default(0)   // Total cost
  
  // Days tracking
  joursTravailles     Int    @default(26)
  joursAbsences       Int    @default(0)
  joursConges         Int    @default(0)
}
```

---

### 2.9 Tax Management (1 Model)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **TaxDeclaration** | `tax_declarations` | Tax declarations | type (G50/G1/G2/G4), period, status |

#### Tax Declaration Model
```prisma
model TaxDeclaration {
  type    String  // G50_TVA, G1_IRG, G2_TAP, G4_IBS
  period  String  // YYYY-MM or YYYY
  
  // TVA (G50)
  tvaCollecte19           Float  @default(0)
  tvaCollecte9            Float  @default(0)
  tvaDeductibleBiens      Float  @default(0)
  tvaDeductibleServices   Float  @default(0)
  tvaDeductibleImport     Float  @default(0)
  tvaNet                 Float  @default(0)
  
  // TAP (G2)
  tapBaseCA              Float  @default(0)
  tapTaux                Float  @default(1)
  tapAbattement          Float  @default(0)
  tapDue                 Float  @default(0)
  
  // IRG (G1)
  irgRetenuSalaires      Float  @default(0)
  irgRetenuAutres        Float  @default(0)
  irgTotal               Float  @default(0)
  
  // IBS (G4)
  ibsBenefice            Float  @default(0)
  ibsTaux                Float  @default(19)
  ibsDue                 Float  @default(0)
  
  totalDue               Float  @default(0)
  totalPaid              Float  @default(0)
}
```

---

### 2.10 Fixed Assets (2 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **FixedAsset** | `fixed_assets` | Depreciable assets | assetClass, acquisitionValue, depreciationMethod |
| **AssetDepreciation** | `asset_depreciations` | Depreciation records | period, amount, accumulatedAmount |

#### Asset Classes
```typescript
enum AssetClass {
  incorporelle  // Class 20 - Intangible assets
  corporelle    // Class 21 - Tangible fixed assets
  financiere    // Class 22 - Financial assets
}
```

---

### 2.11 Workflow Engine (5 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **WorkflowDefinition** | `workflow_definitions` | Workflow templates | type, priority, maxAmount |
| **WorkflowStep** | `workflow_steps` | Approval steps | sequenceOrder, approverType, deadlineHours |
| **WorkflowInstance** | `workflow_instances` | Active workflows | status, currentStep, entityType |
| **WorkflowApproval** | `workflow_approvals` | Approval actions | status, action, comment |
| **WorkflowComment** | `workflow_comments` | Workflow discussions | content, authorId |

#### Workflow Types
```typescript
enum WorkflowType {
  invoice_approval,
  bill_approval,
  leave_request,
  purchase_order,
  expense_report,
  payroll_validation,
  tax_declaration,
  payment_approval,
  document_approval,
  custom
}
```

---

### 2.12 Notifications (2 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Notification** | `notifications` | User notifications | type, channel, isRead |
| **NotificationPreference** | `notification_preferences` | User preferences | per-type toggles |

---

### 2.13 Reports & Budgets (5 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Report** | `reports` | Generated reports | type, format, status, fileUrl |
| **ReportTemplate** | `report_templates` | Report templates | type, templateConfig, columns |
| **ReportBuilderConfig** | `report_builder_configs` | Custom report configs | Configuration JSON |
| **Budget** | `budgets` | Budget plans | type, year, status, totalBudgeted |
| **BudgetLine** | `budget_lines` | Budget line items | accountCode, m1-m12 columns |

#### Report Types
```typescript
enum ReportType {
  financial_statement,
  balance_sheet,
  income_result,
  cash_flow,
  invoice_report,
  payroll_report,
  tax_declaration,
  inventory_report,
  sales_report,
  purchase_report,
  employee_list,
  audit_trail,
  custom
}
```

---

### 2.14 Cash Flow (1 Model)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **CashFlowEntry** | `cash_flow_entries` | Cash movements | type (inflow/outflow), category, amount |

#### Cash Flow Categories
```typescript
enum CashFlowCategory {
  operating,    // Exploitation
  investing,    // Investissement
  financing     // Financement
}
```

---

### 2.15 Operations (3 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **CalendarEvent** | `calendar_events` | Calendar events | type, startDate, isRecurring |
| **Document** | `documents` | Document management | category, fileUrl, version |
| **PublicHoliday** | `public_holidays` | Holidays | date, type (national/religious) |

---

### 2.16 Production Module (8 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **WorkCenter** | `work_centers` | Work stations | type, capacityPerHour, hourlyCost |
| **BillOfMaterials** | `bill_of_materials` | BOM/Nomenclature | productId, version, outputQuantity |
| **BOMLine** | `bom_lines` | BOM components | componentId, quantity, scrapPercentage |
| **Routing** | `routings` | Operations routing | productId, totalTime |
| **RoutingOperation** | `routing_operations` | Routing steps | operationType, runTime, workCenterId |
| **WorkOrder** | `work_orders` | Production orders (OF) | status, quantityPlanned, quantityProduced |
| **WorkOrderLine** | `work_order_lines` | Work order lines | type (consumption/production) |
| **QualityControl** | `quality_controls` | QC inspections | type, status, decision |
| **QCPoint** | `qc_points` | QC checkpoints | specification, targetValue, actualValue |

---

### 2.17 Maintenance Module (6 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **Equipment** | `equipments` | Equipment registry | category, status, manufacturer |
| **MaintenancePlan** | `maintenance_plans` | PM schedules | frequency, lastExecutionDate |
| **MaintenanceOrder** | `maintenance_orders` | Work orders | type, priority, status |
| **MaintenanceLog** | `maintenance_logs` | Execution logs | workOrderId, technicianNotes |
| **SparePart** | `spare_parts` | Spare parts inventory | equipmentId, quantity |
| **OEERecord** | `oee_records` | OEE tracking | availability, performance, quality |

---

### 2.18 Automation & Import (2 Models)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **AutomationWorkflow** | `automation_workflows` | Visual automations | trigger, actions JSON |
| **ImportJob** | `import_jobs` | Data import jobs | type, status, recordCount |

---

### 2.19 Audit Trail (1 Model)

| Model | Table Name | Description | Key Fields |
|-------|------------|-------------|------------|
| **AuditLog** | `audit_logs` | Action log | action, module, entityName, entityId, oldValues, newValues |

#### Audit Coverage
```typescript
enum AuditAction {
  create, update, delete, login, logout, view,
  export, print, approve, reject, submit, cancel,
  restore, archive
}

enum AuditModule {
  auth, users, company, accounting, invoices, bills,
  payments, partners, products, inventory, employees,
  payroll, leaves, taxes, reports, settings, system, workflow
}
```

---

## 3. Entity Relationship Diagram (Key Relationships)

### 3.1 Core Business Flow

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│ Partner │──────▶│ Invoice │──────▶│Payment  │
│         │       │         │       │         │
│ *invoices│       │ *lines  │       │ *invoice│
│ *bills  │       │ *payments│       │ *bill   │
└────┬────┘       └────┬────┘       └────┬────┘
     │                 │                 │
     ▼                 ▼                 ▼
┌─────────┐       ┌─────────┐       ┌─────────┐
│  Bill   │       │Journal  │       │Journal  │
│         │       │  Entry  │       │  Item   │
└─────────┘       └────┬────┘       └─────────┘
                       │
                       ▼
                 ┌─────────────┐
                 │ChartOfAccount│
                 └─────────────┘
```

### 3.2 HR/Payroll Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Employee │────▶│ Contract │────▶│ Payroll  │
│          │     │          │     │          │
│*payrolls │     │*employee │     │*employee │
│*leaves   │     └──────────┘     │*leaves  │
│*attendance│                    └──────────┘
└──────────┘
     │
     ├────────▶┌─────────────┐
     │        │LeaveRequest │
     │        └─────────────┘
     │
     └────────▶┌─────────────┐
              │ Attendance  │
              └─────────────┘
```

### 3.3 Inventory Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Product  │────▶│StockLevel│◀────│Warehouse │
│          │     │          │     │          │
│*movements│     │*movements│     │*locations│
│*levels   │     └────┬─────┘     └──────────┘
└──────────┘          │
                       ▼
                ┌─────────────┐
                │StockMovement│
                └─────────────┘
```

---

## 4. Index Strategy

### 4.1 Performance Indexes

| Table | Indexed Columns | Purpose |
|-------|-----------------|---------|
| `users` | email (unique) | Login lookup |
| `journal_entries` | companyId, date | Company filtering, date range queries |
| `journal_entries` | date | Chronological ordering |
| `invoices` | partnerId | Customer invoice lookup |
| `payments` | companyId | Company-scoped payments |
| `payrolls` | [employeeId, period] | Monthly payroll lookup |
| `attendances` | date, [employeeId, date] | Daily attendance |
| `attendances` | employeeId | Employee history |
| `stock_levels` | productId, warehouseId | Stock lookup |
| `workflow_instances` | status, initiatorId, [entityType, entityId] | Workflow queries |
| `notifications` | userId, isRead, createdAt, type | Notification queries |
| `reports` | type, status, generatedBy, companyId | Report searches |
| `budgets` | status, year, type, companyId | Budget filtering |
| `cash_flow_entries` | date, type, category, companyId | Cash flow reports |
| `opportunities` | status, stage, assignedToId, expectedCloseDate | Pipeline views |
| `purchase_orders` | status, partnerId, companyId, date | PO tracking |
| `sales_orders` | status, partnerId, companyId, date | SO tracking |
| `quotations` | status, partnerId, companyId, validUntil | Quote management |
| `work_orders` | [companyId, status], scheduledStart | Production planning |
| `quality_controls` | [companyId, status] | QC tracking |
| `routing_operations` | [routingId, sequence] | Operation sequencing |
| `audit_logs` | userId, module, action, createdAt, [entityName, entityId] | Audit trails |

### 4.2 Unique Constraints

| Table | Unique Columns | Purpose |
|-------|---------------|---------|
| `users` | email | Single email per user |
| `chart_of_accounts` | [code, companyId] | Unique account per company |
| `journals` | code | Single journal per type |
| `journal_entries` | reference | Unique entry number |
| `bank_accounts` | accountNumber | Unique bank account |
| `employees` | matricule | Unique employee ID |
| `partners` | (implicit via business logic) | Partner identification |
| `products` | code | Unique product code |
| `warehouses` | code | Unique warehouse code |
| `locations` | [code, warehouseId] | Unique location per warehouse |
| `stock_levels` | [productId, warehouseId, locationId] | Unique stock position |
| `currency_rates` | [fromCurrency, toCurrency, date] | Single rate per day |
| `workflow_steps` | [definitionId, sequenceOrder] | Step ordering |
| `notification_preferences` | userId | Single pref set per user |
| `budgets` | code | Unique budget code |
| `bill_of_materials` | [productId, version] | BOM versioning |
| `routings` | [productId, version] | Routing versioning |
| `bom_lines` | [bomId, componentId] | Unique component per BOM |
| `contracts` | reference | Unique contract ref |
| `public_holidays` | [companyId, date] | Single holiday per date |
| `leave_balances` | [employeeId, leaveType, year] | Balance tracking |
| `equipments` | code | Unique equipment code |
| `work_centers` | code | Unique WC code |
| `opportunities` | reference | Unique opp ref |
| `purchase_orders` | reference | Unique PO ref |
| `sales_orders` | reference | Unique SO ref |
| `quotations` | reference | Unique quote ref |
| `quality_controls` | reference | Unique QC ref |
| `verification_tokens` | [identifier, token] | Token uniqueness |

---

## 5. Data Types Used

### 5.1 Prisma/SQL Type Mapping

| Prisma Type | SQLite | PostgreSQL | Usage |
|-------------|--------|------------|-------|
| `String` | TEXT | VARCHAR/VARCHAR(255) | Names, codes, descriptions |
| `String @id` | TEXT PK | UUID/VARCHAR PK | Primary keys (cuid) |
| `Int` | INTEGER | INTEGER | Counts, quantities, years |
| `Float` | REAL | DECIMAL(15,2) | Monetary amounts, rates |
| `Boolean` | INTEGER (0/1) | BOOLEAN | Flags, statuses |
| `DateTime` | TEXT (ISO8601) | TIMESTAMP | Dates, timestamps |
| `Json` | TEXT | JSONB | Configurations, metadata |

### 5.2 Special Patterns

#### Monetary Values
```prisma
amountUntaxed  Float  @default(0)  // Always stored in DZD
amountTax      Float  @default(0)  // TVA amounts
amountTotal    Float  @default(0)  // TTC amounts
// Precision: 2 decimal places (centimes)
```

#### Status Fields
```prisma
status  String  @default("draft")  // Pattern: draft → active → completed/cancelled
```

#### Timestamps
```prisma
createdAt  DateTime  @default(now())   // Creation timestamp
updatedAt  DateTime  @updatedAt        // Auto-update on change
```

---

## 6. Constraints & Validations

### 6.1 Field-Level Constraints

| Constraint Type | Implementation | Example |
|-----------------|----------------|---------|
| Required | Non-nullable field | `name String` (no `?`) |
| Unique | `@unique` attribute | `email String @unique` |
| Default value | `@default()` | `isActive Boolean @default(true)` |
| Enum | `enum` type | `status InvoiceStatus` |
| Range | Application level | `tvaRate Float @default(19)` |
| Format | Application level | `email String @unique` (email format) |
| Referential | `@relation` | `company Company @relation(...)` |

### 6.2 Business Rule Validations

| Rule | Location | Validation |
|------|----------|------------|
| TVA Rate | Product, InvoiceLine | Must be in [0, 7, 9, 19] |
| Debit = Credit | JournalEntry | Balanced entry requirement |
| Date Sequence | Invoice | dueDate >= date |
| Stock Availability | StockMovement | Sufficient stock for out movements |
| Approval Limits | WorkflowDefinition | Amount <= maxAmount |
| Fiscal Year | JournalEntry | Within company fiscal year |

### 6.3 Cascade Behaviors

```prisma
// Example cascade deletions
model Session {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model WorkflowApproval {
  instance WorkflowInstance @relation(..., onDelete: Cascade)
  step WorkflowStep @relation(..., onDelete: Cascade)
}

model JournalItem {
  entry JournalEntry @relation(..., onDelete: Cascade)
}
```

---

## 7. Multi-Tenancy Architecture

### 7.1 Tenant Isolation

All business entities include `companyId` for data segregation:

```prisma
model Invoice {
  companyId  String
  company    Company @relation(fields: [companyId], references: [id])
  
  @@index([companyId])  // Essential for tenant filtering
}
```

### 7.2 Tenant-Scoped Queries

```typescript
// All queries must include company filter
const invoices = await prisma.invoice.findMany({
  where: { companyId: user.companyId }
});
```

---

## 8. Data Migration Strategy

### 8.1 Schema Evolution

```bash
# Create migration
npx prisma migrate dev --name "add_new_field"

# Deploy to production
npx prisma migrate deploy

# Generate client after changes
npx prisma generate
```

### 8.2 Seed Data

- Chart of Accounts (SCF standard)
- Algerian Wilayas (58 provinces)
- Communes (1541 municipalities)
- Tax rates and configurations
- Default journals
- Public holidays (Algerian)

---

## 9. Backup & Recovery

### 9.1 Development (SQLite)

```bash
# Manual backup
cp prisma/dev.db backups/dev-$(date +%Y%m%d).db
```

### 9.2 Production (PostgreSQL)

- **Frequency:** Hourly incremental, daily full
- **Retention:** 30 days
- **Point-in-Time Recovery:** Enabled
- **Cross-region replication:** Recommended for DR

---

## 10. Schema Summary Table

| # | Module | Models | Key Tables |
|---|--------|--------|------------|
| 1 | Auth & Users | 5 | User, Session, Account |
| 2 | Company & Localization | 3 | Company, Wilaya, Commune |
| 3 | Accounting | 6 | ChartOfAccount, Journal, JournalEntry |
| 4 | Partners & CRM | 3 | Partner, Opportunity, Activity |
| 5 | Products & Inventory | 6 | Product, Warehouse, StockLevel, StockMovement |
| 6 | Invoicing | 7 | Invoice, Bill, Payment, Quotation (+ lines) |
| 7 | Orders | 4 | PurchaseOrder, SalesOrder (+ lines) |
| 8 | Human Resources | 7 | Employee, Contract, Payroll, Leave, Attendance |
| 9 | Tax Management | 1 | TaxDeclaration |
| 10 | Fixed Assets | 2 | FixedAsset, AssetDepreciation |
| 11 | Workflow Engine | 5 | WorkflowDefinition, Instance, Approval |
| 12 | Notifications | 2 | Notification, Preference |
| 13 | Reports & Budgets | 5 | Report, Template, Budget, BudgetLine |
| 14 | Cash Flow | 1 | CashFlowEntry |
| 15 | Operations | 3 | CalendarEvent, Document, PublicHoliday |
| 16 | Production | 9 | WorkCenter, BOM, Routing, WorkOrder, QC |
| 17 | Maintenance | 6 | Equipment, MaintenancePlan, Order, SparePart, OEE |
| 18 | Automation & Import | 2 | AutomationWorkflow, ImportJob |
| 19 | Audit Trail | 1 | AuditLog |
| **TOTAL** | | **64+** | |

---

*Document End: Database Architecture*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
*Schema compliant with SCF (Système Comptable Financier) Algerian*
