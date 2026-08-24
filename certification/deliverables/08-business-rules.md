# DELIVERABLE 8: Business Rule Engine Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Overview

The HASSIBA Suite ERP implements comprehensive business rules that govern all operations within the system. These rules ensure data integrity, regulatory compliance (Algerian SCF standards), and proper business process enforcement.

---

## 2. Approval Thresholds

### 2.1 Purchase Order Approval Rules

| Amount Range (DZD) | Approval Level | Required Action |
|-------------------|----------------|-----------------|
| < 100,000 | None | Auto-approved |
| 100,000 - 499,999 | Manager | Manager approval required |
| 500,000 - 999,999 | Director | Director approval required |
| ≥ 1,000,000 | Executive | GM/CEO approval required |

**Implementation Source:** `src/app/api/purchases/route.ts`

```typescript
const PO_APPROVAL_THRESHOLDS = {
  managerApproval: 100000,
  directorApproval: 500000,
  executiveApproval: 1000000,
};

function getRequiredApprovalLevel(totalAmount: number): 
  'none' | 'manager' | 'director' | 'executive' {
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.executiveApproval) return 'executive';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.directorApproval) return 'director';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.managerApproval) return 'manager';
  return 'none';
}
```

### 2.2 Discount Approval Rules

| Discount Rate | Approval Required |
|--------------|------------------|
| 0% - 5% | None (auto-approved) |
| 5% - 15% | Sales Manager |
| 15% - 30% | Commercial Director |
| > 30% | GM/CEO with justification |

### 2.3 State Machine Approval Requirements

Certain document transitions require explicit approval:

| Document | Transition | Requires Approval |
|----------|------------|-------------------|
| Purchase Order | confirmed → approved | ✅ Yes |
| Bill | verified → approved | ✅ Yes |
| Sales Order | draft → confirmed | Role-restricted |
| Invoice | No explicit approval | ❌ No |

---

## 3. Validation Rules

### 3.1 Invoice Status Validation

**Valid Invoice States:** `draft`, `sent`, `paid`, `partial`, `overdue`, `cancelled`

**Valid Transitions:**
- `draft` → `sent` (auto-timestamps: `sentAt`)
- `draft` → `cancelled`
- `sent` → `draft` (recall allowed)
- `sent` → `paid` (auto-timestamps: `paidAt`)
- `sent` → `partial`
- `sent` → `overdue` (system auto-transition)
- `partial` → `paid`
- `overdue` → `paid`

**Terminal States:** `paid`, `cancelled`

### 3.2 Stock Movement Validation

**Negative Stock Prevention (M-07 FIX):**

```typescript
// From src/app/api/inventory/route.ts
if (newQty < 0) {
  if (process.env.NEGATIVE_STOCK_POLICY !== 'allow') {
    return NextResponse.json({
      success: false,
      error: `Ajustement refusé: résulterait en un stock négatif`,
      code: 'NEGATIVE_STOCK_PREVENTED'
    }, { status: 409 });
  }
}
```

**Stock Adjustment Rules:**
1. Product must exist in database
2. Warehouse must exist and be active
3. Quantity cannot result in negative stock (configurable)
4. Movement record created for audit trail

### 3.3 Employee Data Validation

**Required Fields for Employee Creation:**
- `firstName` (required)
- `lastName` (required)
- `contractStartDate` (required)

**PII Protection (C-07 Security Fix):**

```typescript
// Sensitive fields restricted to authorized roles only
const SENSITIVE_PII_FIELDS = [
  'cin', 'nif', 'nir', 'cnasNumber', 'casnosNumber',
  'address', 'city', 'wilayaCode', 'phone',
  'personalEmail', 'workEmail', 'bankName', 'bankAccount',
  'dateOfBirth', 'placeOfBirth'
];

const AUTHORIZED_PII_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR];
```

### 3.4 Leave Request Validation

**Business Rules:**
1. Start date must be before end date
2. Overlapping leaves prevented (checks `draft`, `submitted`, `approved` status)
3. Business days calculated excluding Algerian weekend (Friday-Saturday)
4. Half-day detection for same-day start/end

```typescript
// Business day calculation (Algerian weekend: Friday-Saturday)
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Exclude Friday (5) and Saturday (6)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
```

### 3.5 Contract Validation Rules

**Valid Contract Types:** `cdi`, `cdd`, `internship`, `temporary`, `part_time`

**Business Rules:**
1. End date must be after start date
2. CDD contracts **require** end date
3. Overlapping active contracts prevented
4. Auto-expiration check on every GET request (H-17 fix)

**Contract Status Transitions:**
```
draft → active, cancelled, expired
active → expired, terminated, suspended, renewed
suspended → active, terminated, cancelled
terminated → (terminal)
cancelled → (terminal)
expired → renewed, active
renewed → active
```

---

## 4. Tax Calculation Rules (Algerian SCF)

### 4.1 TVA (VAT) Rates

| Rate | Category | Code |
|------|----------|------|
| 0% | Exonéré | 0 |
| 7% | Particulier | 7 |
| 9% | Réduit | 9 |
| 19% | Normal (default) | 19 |

**TVA Validation:**
```typescript
// Accepts both INTEGER (19) and DECIMAL (0.19) formats
function isValidTVARate(rate: number): boolean {
  const validRates = [0, 7, 9, 19];
  return validRates.includes(rate > 1 ? rate : Math.round(rate * 100));
}

function normalizeTVARate(rate: number): number {
  return rate > 1 ? rate / 100 : rate; // Always returns decimal
}

function tvaToInt(rate: number): number {
  return rate > 1 ? rate : Math.round(rate * 100); // Always returns integer
}
```

### 4.2 TVA Calculation Formula

```
Amount Before Discount = Quantity × Unit Price
Discount Amount = Amount Before Discount × (Discount Rate / 100)
Amount Untaxed = Amount Before Discount - Discount Amount
Amount Tax = Amount Untaxed × TVA Rate (decimal)
Amount Total = Amount Untaxed + Amount Tax
```

### 4.3 Timbre Fiscal (Stamp Duty)

Applied to invoices based on configuration from `getTimbreFiscal()`.

---

## 5. Payroll Computation Rules

### 5.1 SMIG Compliance (M-10 FIX)

**Current SMIG (2025):** 20,000 DZD/month

```typescript
const SMIG_CONFIG = {
  current: 20000,           // Current SMIG
  historical: {
    2024: 20000,
    2023: 18000,
    // ... historical values
  },
  warningThreshold: 0.9,    // Warn if salary < 90% of SMIG
  currency: 'DZD'
};
```

**Validation Rules:**
- Salary < 90% SMIG → Error (blocking)
- Salary < 100% SMIG → Warning (non-blocking)
- Full compliance report included in payroll response

### 5.2 Salary Calculation Components

```
GROSS SALARY COMPONENTS:
├── Base Salary (salaireBase)
├── Primes:
│   ├── Prime Ancienneté (seniority bonus)
│   ├── Prime Rendement (performance bonus)
│   ├── Prime Responsabilité (responsibility allowance)
│   ├── Prime Technicité (skill allowance)
│   ├── Prime Transport (transport allowance)
│   ├── Prime Panier (meal allowance)
│   ├── Prime Logement (housing allowance)
│   └── Prime Marié (marriage allowance)
├── Allocations Familiales (family allowances)
└── Heures Supplémentaires (overtime × 1.5× rate)

DEDUCTIONS:
├── Cotisations Sociales:
│   ├── CNAS (employee share)
│   └── CASNOS (employee share)
├── IRG (Income Tax)
├── Avance sur Salaire (salary advance)
├── Opposition (garnishment)
├uelle (health insurance)
└── Crédit CNAC (housing loan)

NET PAYABLE = Gross Salary - Total Deductions
```

### 5.3 Input Validation Ranges

| Field | Min | Max | Unit |
|-------|-----|-----|------|
| baseSalary | 0 | 10,000,000 | DZD |
| prime* | 0 | 1,000,000 | DZD |
| heuresSupp | 0 | 500 | hours |
| avanceSalaire | 0 | 5,000,000 | DZD |
| opposition | 0 | 5,000,000 | DZD |

### 5.4 Overtime Calculation

```typescript
// Standard overtime rate: 1.5× hourly rate
const montantHeuresSupp = heuresSupp > 0 
  ? heuresSupp * tauxHeureSupp * 1.5 
  : 0;

// Default hourly rate calculation
tauxHeureSupp = employee.hourlyRate || employee.baseSalary / 173.33;
// 173.33 = average working hours/month (based on 40h week)
```

---

## 6. Access Control Rules

### 6.1 Role-Based API Access

| API Endpoint | Allowed Roles |
|--------------|---------------|
| `/api/employees` (GET) | All authenticated users (PII filtered) |
| `/api/employees` (POST) | admin, manager, hr_manager, hr_staff |
| `/api/payroll` (GET/POST) | admin, manager, hr, accountant |
| `/api/leaves` (POST) | Any authenticated (own requests) |
| `/api/leaves` (approve) | admin, manager, hr_manager |
| `/api/attendance` (POST) | admin, manager, hr_manager, hr_staff |
| `/api/inventory` (POST) | admin, manager, warehouse_manager |
| `/api/purchases` (POST) | admin, manager, accountant, warehouse_manager |
| `/api/contracts` (POST) | admin, manager, hr_manager, hr_staff |
| `/api/documents` (POST) | admin, manager, hr |
| `/api/crm` (POST) | admin, manager, sales |

### 6.2 Company Scoping Rule

Non-super-admin users can only access their company's data:

```typescript
// Applied in purchases, dashboard, analytics APIs
if (user && user.role !== ROLES.SUPER_ADMIN && user.companyId && !companyId) {
  where.companyId = user.companyId;
}
```

### 6.3 PII Access Matrix

| Data Category | Admin/Manager | HR | Regular User | Sales |
|--------------|---------------|-----|--------------|-------|
| Name, Department | ✅ | ✅ | ✅ | ✅ |
| CIN/NIF | ✅ | ✅ | ❌ | ❌ |
| Address, Phone | ✅ | ✅ | ❌ | ❌ |
| Bank Account | ✅ | ✅ | ❌ | ❌ |
| Salary/Payroll | ✅ | ✅ | ❌ | ❌ |
| Date of Birth | ✅ | ✅ | ❌ | ❌ |

---

## 7. Attendance Business Rules

### 7.1 Late Threshold Configuration (M-09 FIX)

```typescript
// Configurable via environment variables
const DEFAULT_LATE_HOUR = parseInt(process.env.LATE_THRESHOLD_HOURS || '9');
const DEFAULT_LATE_MINUTE = parseInt(process.env.LATE_THRESHOLD_MINUTES || '0');
// Default: 9:00 AM
```

### 7.2 Attendance Logic

```
CLOCK IN:
├── Check for existing open record today
│   ├── If exists → Error "Déjà en cours"
│   └── If none → Create new record
├── Compare clock-in time to threshold
│   ├── Before threshold → status = 'present'
│   └── After threshold → status = 'late'
└── Return attendance record

CLOCK OUT:
├── Verify open record exists
├── Calculate worked hours (clockOut - clockIn - breakDuration)
├── Calculate overtime (workedHours - 8, min 0)
└── Update record with times
```

### 7.3 Work Hour Standards

| Metric | Value |
|--------|-------|
| Standard workday | 8 hours |
| Overtime threshold | > 8 hours |
| Weekend (Algeria) | Friday, Saturday |

---

## 8. Document Numbering Rules

### 8.1 Reference Format Patterns

| Entity | Pattern | Example |
|--------|---------|---------|
| Purchase Order | ACH-YYYY-MM-XXX | ACH-2025-01-001 |
| Sales Invoice | FAC-YYYYMM-XXX | FAC-202501-001 |
| Quotation | DEV-YYYYMM-XXX | DEV-202501-001 |
| Contract | CTR-YYYY-XXX | CTR-2025-001 |
| Payroll | PAIE-YYYY-MM-XXX | PAIE-2025-01-001 |
| Opportunity | OPP-YYYYMM-XXX | OPP-202501-001 |
| Stock Movement | ADJ-IN/OUT-YYYYMMDD-XXXX | ADJ-IN-20250115-A1B2C3 |

### 8.2 Sequence Generation

Sequences are auto-incremented per month/year/company combination to ensure uniqueness.

---

## 9. Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NEGATIVE_STOCK_PREVENTED` | Stock adjustment would result in negative stock | 409 Conflict |
| `INVALID_SALARY` | Salary outside valid range | 400 Bad Request |
| `INVALID_*_FIELD` | Specific field validation failure | 400 Bad Request |
| `SALARY_BELOW_SMIG` | Salary below minimum wage (warning) | 200 OK (with warning) |
| `SALARY_BELOW_SMIG_CRITICAL` | Salary significantly below SMIG | 200 OK (with error) |
| `INTERNAL_ERROR` | Server-side error | 500 Internal Server |

---

## 10. Regulatory Compliance Notes

### 10.1 Algerian Labor Law Compliance
- ✅ SMIG minimum wage enforcement
- ✅ CNAS/CASNOS social contributions
- ✅ IRG income tax calculation
- ✅ Family allowances (allocations familiales)
- ✅ Seniority bonus (prime d'ancienneté)
- ✅ Overtime compensation (150% rate)

### 10.2 SCF Accounting Standards
- ✅ TVA calculation per Algerian rates
- ✅ Timbre fiscal support
- ✅ Proper chart of accounts structure
- ✅ Audit trail for all transactions

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
