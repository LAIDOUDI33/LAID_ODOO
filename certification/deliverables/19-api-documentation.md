# HASSIBA Suite ERP - Complete API Documentation

**Version:** 2.0.0  
**Base URL:** `/api`  
**Last Updated:** Final Certification  

---

## Table of Contents

1. [Authentication](#authentication)
2. [System Endpoints](#system-endpoints)
3. [Dashboard](#dashboard)
4. [Company Management](#company-management)
5. [Employee Management (HR)](#employee-management-hr)
6. [Attendance & Leave Management](#attendance--leave-management)
7. [Partner Management (CRM)](#partner-management-crm)
8. [Product & Inventory Management](#product--inventory-management)
9. [Sales - Quotations](#sales---quotations)
10. [Sales - Invoices](#sales---invoices)
11. [Sales Orders](#sales-orders)
12. [Purchase Orders](#purchase-orders)
13. [Accounting & Finance](#accounting--finance)
14. [Payroll](#payroll)
15. [CRM Pipeline](#crm-pipeline)
16. [Workflow Automation](#workflow-automation)
17. [Reports & Analytics](#reports--analytics)
18. [AI Assistant](#ai-assistant)
19. [Notifications](#notifications)
20. [Audit Trail](#audit-trail)
21. [Other Modules](#other-modules)

---

## Authentication

### Method: Bearer Token (JWT via NextAuth)

**Header:** `Authorization: Bearer <token>`

All API endpoints (except health check and registration) require authentication.

---

### POST `/api/auth/register`
Register a new user account.

- **Auth:** Public
- **Rate Limit:** 3 requests per IP per 15 minutes
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "name": "Full Name",
    "password": "SecurePassword123!",
    "phone": "+213 XXX XXX XXX",
    "companyId": "optional-company-id"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "Full Name",
      "role": "user",
      "message": "Utilisateur créé avec succès"
    }
  }
  ```
- **Errors:** 
  - `400` - Invalid input, weak password, invalid email format
  - `429` - Rate limited (headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
  - `500` - Server error

### GET `/api/auth/register`
Check if an email is available for registration.

- **Auth:** Public (rate limited)
- **Query Params:** `email=user@example.com`
- **Response:**
  ```json
  {
    "success": true,
    "available": true,
    "message": "Vérification terminée"
  }
  ```

### GET|POST `/api/auth/[...nextauth]`
NextAuth.js handlers for authentication sessions.

- **Endpoints:**
  - `GET /api/auth/signin` - Login page
  - `POST /api/auth/signin` - Submit credentials
  - `GET /api/auth/signout` - Sign out
  - `POST /api/auth/signout` - Submit sign out
  - `GET /api/auth/session` - Get current session
  - `GET /api/auth/csrf` - CSRF token

### GET `/api/auth/login-status`
Check account lockout status without authenticating.

- **Auth:** Public
- **Query Params:** `email=user@example.com`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "locked": false,
      "remainingTime": null,
      "attempts": 0,
      "maxAttempts": 5,
      "attemptsRemaining": 5,
      "lockedUntil": null
    }
  }
  ```

---

## System Endpoints

### GET `/api/health`
Health check endpoint for monitoring and load balancers.

- **Auth:** None
- **Response (200/503):**
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "uptime": 86400,
    "version": "2.0.0",
    "environment": "production",
    "checks": {
      "database": {
        "status": "up",
        "latency_ms": 12
      },
      "memory": {
        "status": "ok",
        "used_mb": 128,
        "total_mb": 512,
        "percent": 25
      }
    }
  }
  ```
- **Headers:** `Cache-Control: no-cache`, `X-Response-Time`, `X-App-Version` (HEAD)

### HEAD `/api/health`
Lightweight health check returning only headers.

### GET `/api`
Root endpoint - basic connectivity test.

- **Response:** `{ "message": "Hello, world!" }`

### POST `/api/seed`
Database seeding endpoint (development/admin use).

---

## Dashboard

### GET `/api/dashboard`
Get dashboard KPIs, charts, and recent activity.

- **Auth:** Required
- **Caching:** 5-minute TTL
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "company": { ... },
      "kpis": {
        "caToday": 1500000,
        "caMonth": 45000000,
        "caYear": 480000000,
        "invoiceCountToday": 5,
        "invoiceCountMonth": 120,
        "employeeCount": 45,
        "productCount": 250,
        "partnerCount": 80,
        "paidInvoiceCount": 450,
        "unpaidInvoiceCount": 35,
        "unpaidAmount": 12500000
      },
      "charts": {
        "monthlyRevenue": [...],     // Last 12 months
        "salesByCategory": [...],   // Top 10 categories
        "expensesByMonth": [...]    // Last 12 months
      },
      "recentActivity": {
        "invoices": [...],
        "lowStockAlerts": [...]
      },
      "taxDeadlines": [
        { "type": "G50 - TVA", "deadline": 20, "daysUntil": 5, "isUrgent": true, "isOverdue": false },
        { "type": "G2 - TAP", "deadline": 20, "daysUntil": 5, "isUrgent": true, "isOverdue": false },
        { "type": "IRG Salaires", "deadline": 15, "isOverdue": false },
        { "type": "CNAS/CASNOS", "deadline": 15, "isOverdue": false }
      ],
      "currentDate": "2025-01-15T..."
    }
  }
  ```

---

## Company Management

### GET `/api/companies`
List all active companies with counts.

- **Auth:** Required
- **Roles:** Any authenticated user
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "...",
        "name": "HASSIBA SARL",
        "_count": { "employees": 45, "partners": 80, "products": 250, "invoices": 500 }
      }
    ]
  }
  ```

### POST `/api/companies`
Create a new company (tenant).

- **Auth:** Admin only
- **Request Body:**
  ```json
  {
    "name": "Company Name",
    "nameAr": "اسم الشركة",
    "commercialName": "Trading Name",
    "legalForm": "SARL",
    "capital": 1000000,
    "currency": "DZD",
    "rc": "XX/AA-XXXXX",
    "nif": "15-digit-nif",
    "nis": "10-digit-nis",
    "ai": "AI-number",
    "taxRegime": "reel",
    "address": "Street Address",
    "city": "Alger",
    "wilayaCode": "16",
    "phone": "+213 XXX XXX XXX",
    "email": "contact@company.dz",
    "fiscalYearStart": 1,
    "language": "fr"
  }
  ```
- **Validation:** NIF must be 15 digits, NIS must be 10 digits, unique NIF

### GET `/api/companies/[id]`
Get company details.

### PUT `/api/companies/[id]`
Update company details (Admin only).

---

## Employee Management (HR)

### GET `/api/employees`
List employees with filtering and PII protection.

- **Auth:** Required
- **PII Filtering:** Non-HR roles get sanitized data (no CIN, SSN, bank info, addresses, phones)
- **Query Params:**
  - `department` - Filter by department
  - `status` - Filter by status (active, terminated, etc.)
  - `contractType` - Filter by contract type (cdi, cdd, etc.)
  `search` - Search in name or matricule
- **Sensitive PII Fields Protected:**
  - `cin`, `nif`, `nir`, `cnasNumber`, `casnosNumber`
  - `address`, `city`, `wilayaCode`, `phone`
  - `personalEmail`, `workEmail`, `bankName`, `bankAccount`
  - `dateOfBirth`, `placeOfBirth`
- **Authorized PII Roles:** `admin`, `manager`, `hr_manager`, `hr_staff`, `super_admin`

### POST `/api/employees`
Create a new employee.

- **Auth:** `admin`, `manager`, `hr_manager`, `hr_staff`
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "firstNameAr": "جون",
    "lastNameAr": "دو",
    "gender": "M",
    "dateOfBirth": "1990-01-15",
    "placeOfBirth": "Algiers",
    "nationality": "DZ",
    "cin": "cin-number",
    "cnasNumber": "cnas-number",
    "casnosNumber": "casnos-number",
    "personalEmail": "personal@email.com",
    "workEmail": "work@company.dz",
    "phone": "+213 XXX XXX XXX",
    "address": "Address",
    "city": "City",
    "wilayaCode": "16",
    "department": "IT",
    "jobTitle": "Developer",
    "jobPosition": "Senior Developer",
    "managerId": "manager-id",
    "contractType": "cdi",
    "contractStartDate": "2024-01-01",
    "contractEndDate": "2025-01-01",
    "baseSalary": 150000,
    "dailyRate": 5000,
    "hourlyRate": 625,
    "bankName": "BNA",
    "bankAccount": "XXXXXXXX"
  }
  ```
- **Auto-generated:** Matricule (`EMP-XXXX`) if not provided

### GET `/api/employees/[id]`
Get single employee with full details or sanitized based on role.

- **Auth:** Required
- **PII Filtering:** Same as list endpoint
- **Audit Log:** Access is logged with PII access level (full/sanitized)

### PUT `/api/employees/[id]`
Update employee information.

- **Auth:** `admin`, `manager`, `hr_manager`, `hr_staff`
- **Partial Update:** Only provided fields are updated

### DELETE `/api/employees/[id]`
Terminate employee (soft delete).

- **Auth:** `admin`, `hr_manager`
- **Query Params:** `reason=Termination reason`
- **Behavior:** Sets `employeeStatus=terminated`, `isActive=false`
- **Warnings:** Returns warnings if employee has subordinates or pending records

---

## Attendance & Leave Management

### GET `/api/attendance`
List attendance records.

- **Auth:** Required
- **Query Params:**
  - `employeeId` - Filter by employee
  - `dateFrom` / `dateTo` - Date range
  - `status` - Filter by status (present, late, absent)
  - `page`, `limit` - Pagination

### POST `/api/attendance`
Clock in/out or create attendance record.

- **Auth:** `admin`, `manager`, `hr_manager`, `hr_staff`
- **Request Body:**
  ```json
  {
    "employeeId": "emp-id",
    "action": "clock_in | clock_out",
    "clockIn": "2025-01-15T08:30:00Z",
    "clockOut": "2025-01-15T17:30:00Z",
    "breakDuration": 60,
    "notes": "Optional notes"
  }
  ```
- **Logic:**
  - Auto-detects action if not specified
  - Calculates worked hours and overtime (>8h)
  - Configurable late threshold via `LATE_THRESHOLD_HOURS`/`LATE_THRESHOLD_MINUTES` env vars (default: 9:00 AM)

### GET `/api/attendance/bulk`
Bulk attendance operations.

### GET|POST `/api/attendance/[id]`
Get or update specific attendance record.

### GET `/api/leaves`
List leave requests.

- **Auth:** Required
- **Query Params:**
  - `employeeId`, `status`, `type`
  - `dateFrom`, `dateTo`
  - `page`, `limit`
- **Business Days Calculation:** Excludes Friday and Saturday (Algerian weekend)

### POST `/api/leaves`
Create leave request.

- **Auth:** Required (employees can create their own)
- **Request Body:**
  ```json
  {
    "employeeId": "emp-id",
    "type": "annual | sick | unpaid | maternity | paternity",
    "startDate": "2025-02-01",
    "endDate": "2025-02-05",
    "reason": "Family vacation",
    "halfDay": false,
    "morningOnly": false
  }
  ```
- **Validations:**
  - Date range validation
  - Overlapping leave detection
  - Auto-calculates business days

### GET|PUT `/api/leaves/[id]`
Get or update specific leave request.

### GET `/api/leave-balances`
List leave balances.

### GET|POST `/api/leave-balances/[id]`
Get or update employee leave balance.

### GET `/api/holidays`
Get holiday calendar.

---

## Partner Management (CRM)

### GET `/api/partners`
List partners (customers/suppliers).

- **Auth:** Required
- **Company Scoping:** Non-super-admins see only their company's partners
- **Query Params:**
  - `type` - `customer`, `supplier`, or `all`
  - `search` - Search in name, display name, NIF, email
  - `wilaya` - Filter by wilaya code
- **Max Results:** 100

### POST `/api/partners`
Create new partner.

- **Auth:** `admin`, `manager`, `sales_manager`, `salesperson`, `accountant`
- **Request Body:**
  ```json
  {
    "name": "Partner Company",
    "displayName": "Trading Name",
    "type": "customer | supplier",
    "isCompany": true,
    "isTaxPayer": true,
    "rc": "RC number",
    "nif": "15-digit-NIF",
    "nis": "NIS number",
    "ai": "AI number",
    "contactName": "Contact Person",
    "email": "contact@partner.dz",
    "phone": "+213 XXX XXX XXX",
    "mobile": "+213 XXX XXX XXX",
    "website": "https://partner.dz",
    "address": "Street Address",
    "city": "City",
    "wilayaCode": "16",
    "postalCode": "16000",
    "paymentTerms": "30",
    "paymentMode": "bank_transfer",
    "creditLimit": 500000,
    "bankAccount": "Account number",
    "category": "Category",
    "priceList": "default"
  }
  ```
- **Validation:** NIF must be 15 digits for tax payers

### GET `/api/partners/[id]`
Get partner details with counts.

### PUT `/api/partners/[id]`
Update partner.

### DELETE `/api/partners/[id]`
Soft delete partner (deactivate).

- **Warnings:** Returns dependency warnings if partner has invoices or quotes

---

## Product & Inventory Management

### GET `/api/products`
List products with filtering.

- **Auth:** Required
- **Company Scoping:** Applied for non-super-admins
- **Caching:** 3-minute TTL
- **Query Params:**
  - `search` - Search in name, nameAr, code
  - `category` - Filter by category ID
  - `type` - Filter by type (stockable, service, consumable)
  - `page`, `limit` - Pagination

### POST `/api/products`
Create product.

- **Auth:** `admin`, `manager`, `accountant`, `sales_manager`, `warehouse_manager`
- **Request Body:**
  ```json
  {
    "code": "PROD-001",
    "name": "Product Name",
    "nameAr": "اسم المنتج",
    "description": "Description",
    "type": "stockable",
    "salePrice": 10000,
    "purchasePrice": 7000,
    "costPrice": 6500,
    "tvaRate": 19,
    "trackStock": true,
    "useSerials": false,
    "useLots": false,
    "unitOfMeasure": "U",
    "categoryId": "category-id",
    "image": "url-to-image",
    "canBeSold": true,
    "canBePurchased": true
  }
  ```
- **Validation:** Unique product code required

### GET `/api/products/[id]`
Get product with usage counts.

### PUT `/api/products/[id]`
Update product.

### DELETE `/api/products/[id]`
Soft delete (deactivate) product.

- **Dependency Check:** Warns about active invoices, bills, POs, SOs, quotations

### GET `/api/inventory`
Get inventory/stock data with KPIs.

- **Auth:** Required
- **Query Params:**
  - `search`, `category`, `warehouse`
  - `lowStock=true` - Show only low stock items
  - `page`, `limit`
- **Response Includes:**
  - Stock levels with warehouse/location info
  - KPIs: total products, quantity, value, low stock count, out of stock count
  - Warehouse list

### POST `/api/inventory`
Stock adjustment.

- **Auth:** `admin`, `manager`, `warehouse_manager`
- **Request Body:**
  ```json
  {
    "productId": "prod-id",
    "warehouseId": "wh-id",
    "locationId": "loc-id",
    "quantity": 10,
    "type": "in | out | adjustment_in | adjustment_out",
    "notes": "Adjustment reason"
  }
  ```
- **Negative Stock Policy:** Controlled by `NEGATIVE_STOCK_POLICY` env var (default: prevent)

### GET `/api/inventory/movements`
Get stock movement history.

### GET `/api/inventory/stock-levels`
Get current stock levels.

### POST `/api/inventory/adjustment`
Dedicated adjustment endpoint.

---

## Sales - Quotations

### GET `/api/quotations`
List quotations.

- **Auth:** Required
- **Query Params:**
  - `status` - draft, sent, viewed, accepted, rejected, expired, converted, cancelled
  - `partnerId`, `validFrom`, `validTo`
  - `search`, `salesPersonId`
  - `page`, `limit`

### POST `/api/quotations`
Create quotation with lines.

- **Auth:** `admin`, `manager`, `sales_manager`, `salesperson`, `accountant`, `warehouse_manager`
- **Reference Format:** `DEV-YYYY-MM-XXX`
- **Request Body:**
  ```json
  {
    "partnerId": "partner-id",
    "opportunityId": "opp-id",
    "salesPersonId": "user-id",
    "paymentTerms": "30",
    "paymentMode": "bank_transfer",
    "validityDays": 30,
    "validUntil": "2025-02-15",
    "internalNotes": "Internal notes",
    "customerNotes": "Customer notes",
    "lines": [
      {
        "productId": "prod-id",
        "description": "Line description",
        "quantity": 10,
        "unitPrice": 1000,
        "discountRate": 0,
        "tvaRate": 19
      }
    ]
  }
  ```
- **Calculations:** Auto-calculates TVA (Algerian rates), timbre fiscal, totals

### GET `/api/quotations/[id]`
Get quotation details.

### PUT `/api/quotations/[id]`
Update quotation.

### POST `/api/quotations/[id]/send`
Mark quotation as sent.

### POST `/api/quotations/[id]/accept`
Accept quotation.

### POST `/api/quotations/[id]/reject`
Reject quotation.

### POST `/api/quotations/[id]/convert`
Convert quotation to invoice.

---

## Sales - Invoices

### GET `/api/invoices`
List invoices.

- **Auth:** Required
- **Company Scoping:** Enforced (C-08 FIX)
- **Caching:** 2-minute TTL
- **Query Params:**
  - `status` - draft, sent, paid, partial, cancelled
  - `type` - invoice, credit_note
  - `partnerId`
  - `page`, `limit` (max 100)
- **Response:**
  ```json
  {
    "success": true,
    "data": [...],
    "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
  }
  ```

### POST `/api/invoices`
Create invoice with TVA calculations.

- **Auth:** `admin`, `manager`, `accountant`, `sales_manager`, `salesperson`
- **Reference Format:** `FACT-YYYY-MM-XXX`
- **Features:**
  - Algerian TVA engine integration (rates: 0%, 7%, 9%, 19%)
  - Timbre fiscal calculation
  - Transactional creation (header + lines atomic)
- **Request Body:**
  ```json
  {
    "partnerId": "partner-id",
    "paymentTerms": "30",
    "paymentMode": "bank_transfer",
    "dueDate": "2025-02-15",
    "internalNotes": "Internal notes",
    "customerNotes": "Customer notes",
    "lines": [
      {
        "productId": "prod-id",
        "label": "Description",
        "quantity": 10,
        "unitPrice": 1000,
        "discountRate": 0,
        "tvaRate": 19
      }
    ]
  }
  ```

### GET `/api/invoices/[id]`
Get invoice with full details.

- **Access Control:** Returns 403 if invoice belongs to another company (C-02 FIX)
- **Audit Logged:** Financial data access is audited

### PUT `/api/invoices/[id]`
Update invoice.

- **State Machine Validation:** Cannot update terminal statuses (H-17 FIX)
- **Status Transitions:** Validated via centralized state machine
- **Auto-posting:** Creates journal entry when status → sent/paid

### DELETE `/api/invoices/[id]`
Cancel invoice (soft delete to `cancelled` status).

- **Validations:**
  - State machine validation
  - Cannot cancel fully paid invoices
  - Checks for existing payments

---

## Sales Orders

### GET `/api/sales-orders`
List sales orders.

### POST `/api/sales-orders`
Create sales order.

### GET `/api/sales-orders/[id]`
Get sales order details.

### PUT `/api/sales-orders/[id]`
Update sales order.

---

## Purchase Orders

### GET `/api/purchases`
List purchase orders.

- **Auth:** Required
- **Company Scoping:** Enforced
- **Query Params:**
  - `status`, `partnerId`, `dateFrom`, `dateTo`, `search`
  - `companyId`, `page`, `limit` (max 100)
- **Response Includes:** Partner, company, warehouse, lines with products, linked bills

### POST `/api/purchases`
Create purchase order with approval workflow.

- **Auth:** `admin`, `manager`, `accountant`, `warehouse_manager`
- **Reference Format:** `ACH-YYYY-MM-XXX`
- **Approval Thresholds (M-13 FIX):**
  - Manager approval: > 100,000 DZD
  - Director approval: > 500,000 DZD
  - Executive approval: > 1,000,000 DZD
- **Request Body:**
  ```json
  {
    "partnerId": "supplier-id",
    "date": "2025-01-15",
    "expectedDate": "2025-02-01",
    "paymentTerms": "30",
    "paymentMode": "bank_transfer",
    "incoterm": "DDP",
    "shippingAddress": "Delivery address",
    "warehouseId": "wh-id",
    "internalNotes": "Notes",
    "supplierNotes": "Supplier notes",
    "lines": [
      {
        "productId": "prod-id",
        "description": "Description",
        "quantity": 100,
        "unitPrice": 500,
        "discountRate": 0,
        "tvaRate": 19
      }
    ]
  }
  ```
- **Response Includes:** `approvalInfo` if approval required

### GET `/api/purchases/[id]`
Get purchase order details.

### PUT `/api/purchases/[id]`
Update purchase order.

- **Actions via query param:**
  - `?action=confirm` - Confirm PO
  - `?action=bill` - Create bill from PO
  - `?action=receive` - Receive goods (delegates to workflow orchestrator)

### POST `/api/purchases/[id]/receive`
Receive goods from purchase order (canonical endpoint).

---

## Accounting & Finance

### GET `/api/accounting`
List journal entries (SCF compliant).

- **Auth:** Required
- **Query Params:**
  - `dateFrom`, `dateTo`
  - `type` - Vente, Achat, Paiement, OD, Paie
  - `status`, `journalCode`, `search`
  - `page`, `limit`
- **Response Includes:** Entry items with accounts, statistics (balanced, TVA totals, class breakdown)

### POST `/api/accounting`
Create journal entry (double-entry).

- **Auth:** `admin`, `manager`, `accountant`
- **Validation:** Must balance (debit = credit ± 0.01)
- **Reference Format:** `{JOURNAL_CODE}-XXXXXX`
- **Request Body:**
  ```json
  {
    "journalId": "journal-id",
    "date": "2025-01-15",
    "label": "Entry description",
    "source": "manual | invoice | bill",
    "sourceId": "source-entity-id",
    "items": [
      {
        "accountId": "account-id",
        "debit": 10000,
        "credit": 0,
        "label": "Line description"
      },
      {
        "accountId": "account-id",
        "debit": 0,
        "credit": 10000,
        "label": "Counterpart"
      }
    ]
  }
  ```

### GET `/api/accounting/balance`
Generate Trial Balance (Balance Générale - SCF).

- **Auth:** Required
- **Query Params:** `dateFrom`, `dateTo`, `class` (1-8)
- **SCF Classes:**
  - Class 1: Comptes de Capitaux
  - Class 2: Comptes d'Immobilisations
  - Class 3: Comptes de Stocks
  - Class 4: Comptes de Tiers
  - Class 5: Comptes Financiers
  - Class 6: Comptes de Charges
  - Class 7: Comptes de Produits
  - Class 8: Comptes de Résultats

### GET `/api/accounting/balance-sheet`
Generate Balance Sheet (Bilan - SCF).

- **Auth:** `admin`, `manager`, `accountant`
- **Query Params:** `date`, `companyId`
- **Structure:**
  - Assets: Fixed assets + Current assets
  - Liabilities: Long-term + Current liabilities
  - Equity
  - Balance verification

### GET `/api/accounting/income-statement`
Generate Income Statement (Compte de Résultat - SCF).

- **Auth:** `admin`, `manager`, `accountant`
- **Query Params:** `startDate`, `endDate`, `companyId`
- **COGS Ratio:** Configurable via `COGS_RATIO` env var (default: 0.6)
- **Sections:**
  - Operating revenue/expenses
  - Financial revenue/expenses
  - Extraordinary revenue/expenses
  - Net result (Profit/Perte)

### GET `/api/bills`
List supplier bills.

### POST `/api/bills`
Create supplier bill.

### GET `/api/taxes`
Get tax configuration and rates.

### GET `/api/bank-accounts`
List bank accounts.

---

## Payroll

### GET `/api/payroll`
List payroll records.

- **Auth:** `admin`, `manager`, `hr`, `accountant` (C-06 FIX - restricted access)
- **Query Params:** `period` (YYYY-MM), `employeeId`, `status`
- **Audit:** Access is logged (M-05 FIX)

### POST `/api/payroll`
Generate payroll for employee.

- **Auth:** `admin`, `manager`, `hr_manager`, `accountant`
- ** Algerian Payroll Calculations:
  - Base salary + primes (ancienneté, rendement, responsabilité, etc.)
  - Social contributions (CNAS, CASNOS, chômage, AT, œuvres sociales)
  - IRG (income tax) calculation with family parts
  - Allocations familiales
  - Overtime (heures supplémentaires at 1.5x)
  - Deductions (avance, opposition, mutuelle, CNAC credit)
- **SMIG Validation (M-10 FIX):**
  - Current SMIG: 20,000 DZD (2025)
  - Warning if salary < 90% of SMIG
  - Error if significantly below SMIG
- **Request Body:**
  ```json
  {
    "employeeId": "emp-id",
    "period": "2025-01",
    "forceRegenerate": false,
    "primeRendement": 0,
    "primeResponsabilite": 0,
    "primeTechnicite": 0,
    "primeTransport": 0,
    "primePanier": 0,
    "primeLogement": 0,
    "primeMarie": 0,
    "heuresSupp": 0,
    "tauxHeureSupp": 0,
    "nombreEnfants": 2,
    "avanceSalaire": 0,
    "opposition": 0,
    "mutuelle": 0,
    "cnacCredit": 0,
    "joursTravailles": 26,
    "joursAbsences": 0,
    "joursConges": 0
  }
  ```
- **Response Includes:** Full breakdown, calculations detail, SMIG compliance warnings

---

## CRM Pipeline

### GET `/api/crm`
Get CRM opportunities and activities.

- **Auth:** Required
- **Query Params:**
  - `type` - `opportunities` or `activities`
  - `status`, `assignedTo`, `stage`
  - `stats=true` - Return pipeline statistics
  - `limit`, `offset`
- **Stats Response:**
  ```json
  {
    "byStatus": [...],
    "byStage": [...],
    "byRating": [...],
    "totalPipeline": 50000000
  }
  ```

### POST `/api/crm`
CRM operations.

- **Auth:** `admin`, `manager`, `sales`
- **Actions:**
  - `create_opportunity` - Create new opportunity
  - `create_activity` / `add_activity` - Add activity
  - `update_status` - Update opportunity status
  - `next_stage` - Advance to next stage
- **Opportunity Request:**
  ```json
  {
    "action": "create_opportunity",
    "name": "Deal Name",
    "partnerId": "partner-id",
    "contactName": "Contact",
    "contactEmail": "email@example.com",
    "status": "new",
    "stage": 1,
    "source": "website",
    "rating": "hot",
    "expectedRevenue": 100000,
    "probability": 50,
    "productName": "Product",
    "expectedCloseDate": "2025-03-15",
    "assignedToId": "user-id",
    "notes": "Notes"
  }
  ```

---

## Workflow Automation

### GET `/api/workflows`
List workflows.

- **Auth:** Required
- **Query Params:** `status`, `category`, `search`, `templates`, `stats`, `page`, `limit` (max 100)
- **Response:** Parsed workflows with creator info and execution count

### POST `/api/workflows`
Create workflow.

- **Auth:** `admin`, `manager`
- **Request Body:**
  ```json
  {
    "name": "Workflow Name",
    "description": "Description",
    "category": "approval",
    "trigger": { "type": "manual", "config": {} },
    "steps": [...],
    "variables": [],
    "settings": {},
    "tags": [],
    "icon": "icon-name",
    "isTemplate": false
  }
  ```
- **Default Step Types:** action, condition, delay, loop, approval, parallel, switch, transform, http_request, sub_workflow

### GET `/api/workflows/[id]`
Get workflow details.

### PUT `/api/workflows/[id]`
Update workflow.

### Specialized Workflow Endpoints:
- `GET/POST /api/workflows/sales` - Sales workflows
- `GET/POST /api/workflows/purchase` - Purchase workflows
- `GET/POST /api/workflows/delivery` - Delivery workflows
- `GET/POST /api/workflows/catalog` - Catalog workflows

---

## Reports & Analytics

### GET `/api/reports`
Get reports and templates.

- **Auth:** Required
- **Query Params:**
  - `type` - `reports`, `templates`, `stats`
  - `reportType`, `status`, `companyId`
- **Stats Response:**
  ```json
  {
    "summary": {
      "totalReports": 100,
      "byType": [...],
      "byStatus": [...]
    },
    "recentReports": [...]
  }
  ```

### POST `/api/reports`
Create report or template.

- **Auth:** `admin`, `manager`
- **Actions:**
  - `generate` / `create_report` - Generate new report
  - `create_template` - Create report template
  - `delete` - Delete report (with `id`)

### Report Builder Endpoints:
- `GET/POST /api/reports/builder` - Report builder CRUD
- `GET/PUT /api/reports/builder/[id]` - Specific report
- `POST /api/reports/builder/[id]/execute` - Execute report

### GET `/api/analytics`
Get analytics data.

---

## AI Assistant

### GET `/api/ai/chat`
Get AI chat service info.

- **Response:** Service status, features, supported queries

### POST `/api/ai/chat`
Send message to HASSIBA AI assistant.

- **Auth:** Required
- **Rate Limit:** 20 requests per minute per IP
- **Request Body:**
  ```json
  {
    "message": "Quel est le CA du mois ?",
    "history": [
      { "role": "user", "content": "Previous question" },
      { "role": "assistant", "content": "Previous answer" }
    ]
  }
  ```
- **Features:**
  - French (Algerian) responses
  - Real-time company context (cached 5 min)
  - DZD currency formatting
  - Conversation history (last 10 messages)
- **Context Data:** Company info, employee count, revenue, invoices, stock, leaves

---

## Notifications

### GET `/api/notifications`
Get user notifications.

- **Auth:** Required
- **Query Params:**
  - `userId` - Required for real data
  - `isRead`, `type`
  - `stats=true` - Notification statistics
  - `preferences=true` - User notification preferences
  - `limit`, `offset`

### POST `/api/notifications`
Notification operations.

- **Auth:** `admin`, `manager`
- **Actions:**
  - (none) - Quick create notification
  - `mark_read` - Mark as read
  - `mark_all_read` - Mark all as read
  - `delete` - Delete notification
  - `workflow_pending` - Workflow pending notification
  - `workflow_approved` - Workflow approved notification
  - `invoice_due` - Invoice due notification
  - `payroll_ready` - Payroll ready notification

---

## Audit Trail

### GET `/api/audit`
Get audit logs.

- **Auth:** Required (implied - admin function)
- **Query Params:**
  - `action` - CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, APPROVE, REJECT, etc.
  - `module` - auth, hr, accounting, inventory, sales, purchase, crm, etc.
  - `entityName`, `entityId`
  - `userId`, `startDate`, `endDate`
  - `search`, `limit`, `offset`
  - `stats=true` - Audit statistics

### POST `/api/audit`
Create manual audit log entry.

- **Request Body:**
  ```json
  {
    "action": "CREATE",
    "module": "accounting",
    "entityName": "JournalEntry",
    "entityId": "entry-id",
    "description": "Manual entry created",
    "oldValues": {},
    "newValues": { "amount": 1000 },
    "user": { "id": "...", "name": "Admin", "email": "admin@hassiba.dz" }
  }
  ```

---

## Other Modules

### Contracts
- `GET/POST /api/contracts` - Contract management
- `GET/PUT /api/contracts/[id]` - Specific contract

### Production
- `GET/POST /api/production` - Production orders
- `GET/POST /api/production/quality` - Quality control

### Budget
- `GET/POST /api/budget` - Budget management

### Maintenance
- `GET/POST /api/maintenance` - Maintenance requests

### Documents
- `GET/POST /api/documents` - Document management
- `GET/DELETE /api/documents/[id]` - Specific document

### Calendar
- `GET/POST /api/calendar` - Calendar events
- `GET/PUT/DELETE /api/calendar/events/[id]` - Specific event

### Import/Export
- `POST /api/import` - Data import

### Reference Data
- `GET /api/wilayas` - Algerian wilayas list

### Legacy Workflows
- `GET/POST /api/workflow` - Legacy workflow endpoints
- `GET/POST /api/workflow/sales` - Sales workflow
- `GET/POST /api/workflow/purchases` - Purchase workflow
- `GET/POST /api/workflow/payments` - Payment workflow

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message in French",
  "code": "ERROR_CODE"  // Optional: Machine-readable error code
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate, already exists)
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable (AI rate limit)

---

## Rate Limiting

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| POST /api/auth/register | 15 min | 3 per IP |
| POST /api/ai/chat | 1 min | 20 per IP |

Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Caching Strategy

| Endpoint | TTL | Key Pattern |
|----------|-----|-------------|
| GET /api/dashboard | 5 min | `dashboard:{companyId}` |
| GET /api/invoices | 2 min | `invoices:{filters}` |
| GET /api/products | 3 min | `products:{filters}` |

---

*Document Version: 2.0.0-Final*  
*Generated for HASSIBA Suite ERP Final Certification*
