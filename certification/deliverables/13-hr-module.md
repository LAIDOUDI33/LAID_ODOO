# DELIVERABLE 13: HR Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The Human Resources (RH) module in HASSIBA Suite ERP provides comprehensive employee management capabilities tailored for Algerian businesses. It covers the complete employee lifecycle from hiring to payroll, including attendance tracking, leave management, contract administration, and full compliance with Algerian labor regulations.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Employee Management** | Complete employee master data with PII protection |
| **Leave Management** | Request, approve, and track employee absences |
| **Attendance Tracking** | Clock in/out with overtime calculation |
| **Payroll Processing** | Full Algerian payroll with CNAS/CASNOS/IRG |
| **Contract Management** | Employment contracts with lifecycle tracking |
| **Compliance** | SMIG compliance, social contributions |

### 1.2 Sub-Modules

| Sub-Module | Endpoint | Purpose |
|------------|----------|---------|
| Employees | `/api/employees` | Employee CRUD |
| Leaves | `/api/leaves` | Leave requests |
| Attendance | `/api/attendance` | Time tracking |
| Contracts | `/api/contracts` | Contract management |
| Payroll | `/api/payroll` | Salary processing |
| Leave Balances | `/api/leave-balances` | Leave entitlements |

---

## 2. Employee Management

### 2.1 API Endpoint: `/api/employees`

#### GET - List Employees

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `department` | string | Filter by department |
| `status` | string | Filter by employment status |
| `contractType` | string | Filter by contract type |
| `search` | string | Search in name, matricule |

**Security (C-07 Fix):** PII fields are filtered based on user role.

#### POST - Create Employee

**Required Fields:** `firstName`, `lastName`, `contractStartDate`

**Auto-generated Fields:**
- `matricule`: Format `EMP-XXXX` (e.g., `EMP-0042`)

### 2.2 Employee Data Model

```typescript
interface Employee {
  id: string;
  matricule: string;            // Auto: EMP-XXXX
  
  // Identity
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  gender: 'M' | 'F';
  
  // Personal (PII - Protected)
  dateOfBirth?: Date;
  placeOfBirth?: string;
  nationality: string;          // Default: 'DZ'
  
  // Identification (PII)
  cin?: string;                // Carte d'Identité Nationale
  nif?: string;                // Numéro d'Identification Fiscale
  nir?: string;                // Numéro d'Inscription de Recette
  cnasNumber?: string;          // CNAS social security
  casnosNumber?: string;        // CASNOS retirement fund
  
  // Contact (PII)
  personalEmail?: string;
  workEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  wilayaCode?: string;          // Algerian province code
  
  // Professional
  department?: string;
  jobTitle?: string;
  jobPosition?: string;
  managerId?: string;
  
  // Contract
  contractType: ContractType;   // cdi, cdd, internship, etc.
  contractStartDate: Date;
  contractEndDate?: Date;
  employeeStatus: string;       // active, terminated, resigned
  hireDate: Date;
  
  // Financial
  baseSalary: number;
  dailyRate: number;
  hourlyRate: number;
  
  // Banking (PII)
  bankName?: string;
  bankAccount?: string;
  
  // System
  isActive: boolean;
  companyId: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 PII Protection (Security Fix C-07)

**Sensitive Fields (Restricted Access):**

```typescript
const SENSITIVE_PII_FIELDS = [
  'cin', 'nif', 'nir',           // Identification
  'cnasNumber', 'casnosNumber',   // Social security
  'address', 'city', 'wilayaCode', // Address
  'phone',                         // Phone
  'personalEmail', 'workEmail',    // Email
  'bankName', 'bankAccount',       // Banking
  'dateOfBirth', 'placeOfBirth'    // Personal
];

// Only these roles can view full PII
const AUTHORIZED_PII_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR];
```

**Access Matrix:**

| Field Category | Admin/Manager/HR | Other Users |
|----------------|-------------------|-------------|
| Name, Department, Job Title | ✅ Full | ✅ Full |
| CIN, NIF, NIR | ✅ Full | ❌ Hidden |
| Address, Phone, Email | ✅ Full | ❌ Hidden |
| Bank Account | ✅ Full | ❌ Hidden |
| Date of Birth | ✅ Full | ❌ Hidden |

---

## 3. Leave Management

### 3.1 API Endpoint: `/api/leaves`

#### GET - List Leave Requests

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | string | Filter by employee |
| `status` | string | draft, submitted, approved, rejected, cancelled |
| `type` | string | Leave type |
| `dateFrom` | Date | Start of date range |
| `dateTo` | Date | End of date range |
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 20) |

#### POST - Create Leave Request

**Request Body:**
```json
{
  "employeeId": "employee-uuid",
  "type": "annual",
  "startDate": "2025-02-01",
  "endDate": "2025-02-05",
  "reason": "Vacances familiales",
  "halfDay": false,
  "morningOnly": false
}
```

### 3.2 Leave Request Model

```typescript
interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  
  // Leave Details
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  daysCount: number;            // Business days calculated
  halfDay: boolean;
  morningOnly: boolean;
  
  // Status & Workflow
  status: LeaveStatus;         // draft, submitted, approved, rejected, cancelled
  reason?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  createdAt: Date;
}
```

### 3.3 Business Day Calculation (Algerian Calendar)

```typescript
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Exclude Friday (5) and Saturday (6) - Algerian weekend
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
```

### 3.4 Overlapping Leave Prevention

System prevents creating overlapping leave requests:

```typescript
// Check for existing leaves that overlap
const overlappingLeave = await db.leaveRequest.findFirst({
  where: {
    employeeId: body.employeeId,
    status: { in: ['draft', 'submitted', 'approved'] },
    OR: [
      { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate }}] },
      { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate }}] },
      { AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate }}] }
    ]
  }
});

if (overlappingLeave) {
  return NextResponse.json({
    success: false,
    error: "Une demande de congés existe déjà pour cette période"
  }, { status: 409 });
}
```

### 3.5 Leave Types

| Type | Description | Typical Duration |
|------|-------------|------------------|
| `annual` | Annual paid leave | Up to 30 days |
| `sickness` | Sick leave | With medical certificate |
| `unpaid` | Unpaid leave | Variable |
| `maternity` | Maternity leave | 14 weeks (Algeria) |
| `paternity` | Paternity leave | 3 days (Algeria) |
| `special` | Special circumstances | Case by case |

### 3.6 Leave Status Workflow

```
┌──────┐  submit  ┌──────────┐  approve   ┌──────────┐
│ draft│─────────▶│submitted │──────────▶│ approved │
└──────┘          └──────────┘            └──────────┘
  │  │                 │  │                     │
  │  │             draft│  │reject           cancel
  │  │                 ▼  ▼                     ▼
  │  │            ┌──────────┐            ┌──────────┐
  │  └────────────▶│submitted │            │ cancelled│
  │               └──────────┘            └──────────┘
  └──────────────────────────────────────────▶ ┌──────────┐
                                                   │ cancelled│
                                                   └──────────┘
```

---

## 4. Attendance Tracking

### 4.1 API Endpoint: `/api/attendance`

#### GET - List Attendance Records

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | string | Filter by employee |
| `dateFrom` | Date | Start date (includes time 00:00:00) |
| `dateTo` | Date | End date (includes time 23:59:59) |
| `status` | string | present, late, absent, half_day |
| `page` | number | Page number |
| `limit` | number | Per page |

#### POST - Clock In/Out

**Request Body:**
```json
{
  "employeeId": "employee-uuid",
  "action": "clock_in",        // or "clock_out" or omit for auto-detect
  "clockIn": "2025-01-15T08:55:00Z",  // Optional: override time
  "clockOut": "2025-01-15T17:30:00Z", // For clock_out
  "breakDuration": 30,          // Minutes
  "notes": ""
}
```

### 4.2 Attendance Model

```typescript
interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  
  // Timestamps
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  
  // Calculated
  workedHours: number;         // Total hours worked
  overtimeHours: number;       // Hours > 8 per day
  breakDuration: number;       // Minutes
  
  // Status
  status: AttendanceStatus;    // present, late, absent, half_day
  
  notes?: string;
  
  createdAt: Date;
}
```

### 4.3 Late Detection (M-09 FIX)

**Configurable Threshold:**

```typescript
// Environment variables (or defaults)
const DEFAULT_LATE_HOUR = parseInt(process.env.LATE_THRESHOLD_HOURS || '9');
const DEFAULT_LATE_MINUTE = parseInt(process.env.LATE_THRESHOLD_MINUTES || '0');
// Default: 9:00 AM
```

**Logic:**
```typescript
let initialStatus = 'present';
const hour = clockIn.getHours();
const minute = clockIn.getMinutes();

if (hour > lateHour || (hour === lateHour && minute > lateMinute)) {
  initialStatus = 'late';
}
```

### 4.4 Work Hours Calculation

```
Clock Out Logic:
1. Verify open record exists for today
2. Calculate total time: clockOut - clockIn
3. Subtract break: totalMs - (breakMinutes × 60 × 1000)
4. Convert to hours: workedMs / (1000 × 60 × 60)
5. Calculate overtime: max(0, workedHours - 8)
6. Round to 2 decimal places
```

**Example:**
```
Clock In: 08:30
Clock Out: 17:45
Break: 30 minutes

Total Time: 9h15m = 9.25 hours
Minus Break: 8h45m = 8.75 hours
Worked Hours: 8.75
Overtime: 0.75 hours (45 minutes)
```

### 4.5 Bulk Operations

Endpoint: `/api/attendance/bulk`

Supports bulk clock-in/out for multiple employees (e.g., gate system integration).

---

## 5. Payroll Processing

### 5.1 API Endpoint: `/api/payroll`

**Security (C-06 Fix):** Highly restricted access - payroll contains sensitive financial data.

**Allowed Roles:** admin, manager, hr, accountant

#### GET - List Payrolls

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Period filter (YYYY-MM format) |
| `employeeId` | string | Filter by employee |
| `status` | string | calculated, paid, cancelled |

#### POST - Generate Payroll

**Request Body:**
```json
{
  "employeeId": "employee-uuid",
  "period": "2025-01",
  
  // Primes (optional)
  "primeRendement": 0,
  "primeResponsabilite": 0,
  "primeTechnicite": 0,
  "primeTransport": 5000,
  "primePanier": 3000,
  "primeLogement": 0,
  "primeMarie": 0,
  
  // Overtime
  "heuresSupp": 10,
  "tauxHeureSupp": 0,              // Auto-calculated if 0
  
  // Family situation
  "nombreEnfants": 2,
  "marie": true,
  
  // Deductions
  "avanceSalaire": 0,
  "opposition": 0,
  "mutuelle": 2000,
  "cnacCredit": 0,
  
  // Days
  "joursTravailles": 26,
  "joursAbsences": 0,
  "joursConges": 0,
  
  "forceRegenerate": false
}
```

### 5.2 Payroll Calculation (Algerian Regulations)

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYROLL CALCULATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GAINS (Gross)                                             │
│  ├── Base Salary (Salaire de base)                         │
│  ├── Seniority Bonus (Prime d'ancienneté)                  │
│  ├── Performance Bonus (Prime de rendement)                │
│  ├── Responsibility Allowance                              │
│  ├── Skill Allowance                                       │
│  ├── Transport Allowance                                   │
│  ├── Meal Allowance                                        │
│  ├── Housing Allowance                                     │
│  ├── Marriage Allowance                                    │
│  ├── Family Allocations (Allocations familiales)           │
│  └── Overtime (Heures supplémentaires × 1.5×)              │
│                                                             │
│  GROSS SALARY = Base + All Primes                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DEDUCTIONS                                                │
│  ├── Social Contributions (Cotisations sociales)           │
│  │   ├── CNAS (Employee share: 9%)                        │
│  │   └── CASNOS (Employee share: 1.25%)                   │
│  ├── IRG (Income Tax - Impôt sur le Revenu Global)        │
│  ├── Salary Advance (Avance sur salaire)                  │
│  ├── Garnishment (Opposition)                             │
│  ├── Health Insurance (Mutuelle)                           │
│  └── Housing Loan (Crédit CNAC)                           │
│                                                             │
│  TOTAL DEDUCTIONS = Sum of above                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NET PAYABLE = GROSS SALARY - TOTAL DEDUCTIONS             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 SMIG Compliance (M-10 FIX)

**Current SMIG (2025):** 20,000 DZD/month

```typescript
const SMIG_CONFIG = {
  current: 20000,              // Current minimum wage
  warningThreshold: 0.9,       // Warn at 90% of SMIG
  currency: 'DZD'
};
```

**Validation Results:**

| Condition | Response |
|-----------|----------|
| Salary ≥ SMIG | ✅ Compliant, no warning |
| 90% ≤ Salary < SMIG | ⚠️ Warning (non-blocking) |
| Salary < 90% SMIG | 🚫 Error with details |

**Warning Response Example:**
```json
{
  "smigCompliance": {
    "smig": 20000,
    "currency": "DZD",
    "isCompliant": false,
    "percentOfSmig": 95.0,
    "warnings": [{
      "code": "SALARY_BELOW_SMIG",
      "message": "Salaire de base (19,000 DZD) est en dessous du SMIG actuel (20,000 DZD)",
      "severity": "warning"
    }]
  }
}
```

### 5.4 Employer Charges (Charges Patronales)

| Contribution | Rate | Base |
|--------------|-------|------|
| CNAS (Employer) | 26% | Gross salary |
| CASNOS (Employer) | 8.25% | Gross salary |
| Chômage (Unemployment) | 1.75% | Gross salary |
| AT (Work Accident) | 0.5%-3% | By sector |
| Œuvres Sociales | 5% | Gross salary |

**Total Employer Cost ≈ 41.5% + of gross salary**

### 5.5 Input Validation Ranges

| Field | Min | Max | Unit |
|-------|-----|-----|------|
| baseSalary | 0 | 10,000,000 | DZD |
| prime* | 0 | 1,000,000 | DZD |
| heuresSupp | 0 | 500 | hours |
| avanceSalaire | 0 | 5,000,000 | DZD |
| opposition | 0 | 5,000,000 | DZD |

---

## 6. Contract Management

### 6.1 API Endpoint: `/api/contracts`

See **Deliverable 15: Contracts Module** for full documentation.

**HR-Specific Features:**
- Auto-expiration detection (H-17)
- Overlapping contract prevention
- Trial period tracking
- Benefits management

### 6.2 Contract Types

| Type | Code | Description |
|------|------|-------------|
| CDI | `cdi` | Contrat à Durée Indéterminée (Permanent) |
| CDD | `cdd` | Contrat à Durée Déterminée (Fixed-term) |
| Internship | `internship` | Stage |
| Temporary | `temporary` | Intérim |
| Part-time | `part_time` | Temps partiel |

---

## 7. Security Summary

### 7.1 Role-Based Access

| Endpoint | Admin | Manager | HR | Accountant | User |
|----------|:-----:|:-------:|:--:|:----------:|:----:|
| GET /employees | ✅ | ✅ | ✅ | ✅ | ✅* |
| POST /employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /leaves | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /leaves | ✅ | ✅ | ✅ | ❌ | ✅** |
| GET /attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /attendance | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /payroll | ✅ | ✅ | ✅ | ✅ | ❌ |
| POST /payroll | ✅ | ✅ | ✅ | ✅ | ❌ |

*PII filtered for non-HR roles
**Employees can create own requests

### 7.2 Audit Logging

Sensitive operations are logged:
- Payroll access (M-05 fix)
- PII access attempts
- Salary modifications

---

## 8. Implementation Details

### 8.1 Source Files

| File | Purpose |
|------|---------|
| `src/app/api/employees/route.ts` | Employee CRUD |
| `src/app/api/employees/[id]/route.ts` | Single employee ops |
| `src/app/api/leaves/route.ts` | Leave management |
| `src/app/api/leaves/[id]/route.ts` | Single leave ops |
| `src/app/api/attendance/route.ts` | Attendance tracking |
| `src/app/api/attendance/bulk/route.ts` | Bulk operations |
| `src/app/api/payroll/route.ts` | Payroll processing |
| `src/app/api/contracts/route.ts` | Contract management |
| `src/app/api/leave-balances/route.ts` | Leave balances |
| `src/lib/algerian-taxes.ts` | Tax calculations |

### 8.2 Database Tables

| Table | Purpose |
|-------|---------|
| `Employee` | Employee master data |
| `LeaveRequest` | Leave requests |
| `Attendance` | Time records |
| `Payroll` | Payroll records |
| `Contract` | Employment contracts |
| `LeaveBalance` | Leave entitlements |

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
