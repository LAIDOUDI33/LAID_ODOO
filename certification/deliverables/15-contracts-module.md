# HASSIBA Suite ERP - Contracts Module Documentation

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D15)  
**Date:** January 2025  
**Source File:** `src/app/api/contracts/route.ts`  
**Fix Reference:** H-17 (Automated Contract Lifecycle)

---

## 1. Overview

The **Contracts Module** provides comprehensive contract lifecycle management for Algerian enterprises, with full compliance to Algerian Labor Law (Code du Travail). The module implements:

- 📝 **Contract Creation & Management** - Full CRUD operations
- 🔄 **Automated Lifecycle** - Auto-expiration, status transitions
- ⚠️ **Expiration Alerts** - 30-day advance warnings
- ✅ **Validation Rules** - Business rule enforcement
- 🔒 **Access Control** - Role-based permissions

---

## 2. Contract Types

### 2.1 Supported Contract Types

| Type | Code | Description | End Date Required |
|------|------|-------------|-------------------|
| Indefinite Term | `cdi` | Contrat à Durée Indéterminée | No |
| Fixed Term | `cdd` | Contrat à Durée Déterminée | **Yes** |
| Internship | `internship` | Stage | Recommended |
| Temporary | `temporary` | Intérim/Temporaire | Yes |
| Part-time | `part_time` | Temps Partiel | No |

---

## 3. Contract Lifecycle (H-17)

### 3.1 Status State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌───────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐   │
│ draft ├───▶│  active  ├───▶│ expired  ├───▶│  renewed   ├──┘
└───┬───┘    └────┬─────┘    └──────────┘    └────────────┘
    │             │
    │             ├──────────┐
    │             ▼          ▼
    │        ┌─────────┐ ┌───────────┐
    │        │suspended│ │terminated│
    │        └────┬────┘ └───────────┘
    │             │
    ▼             ▼
┌───────────┐ ┌───────────┐
│ cancelled │ │cancelled  │
└───────────┘ └───────────┘
```

### 3.2 Valid Transitions

| From Status | Allowed Transitions |
|-------------|---------------------|
| `draft` | active, cancelled, expired |
| `active` | expired, terminated, suspended, renewed |
| `suspended` | active, terminated, cancelled |
| `terminated` | *(Terminal state)* |
| `cancelled` | *(Terminal state)* |
| `expired` | renewed, active |
| `renewed` | active |

---

## 4. API Reference

### 4.1 GET /api/contracts

List contracts with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| employeeId | string | - | Filter by employee |
| status | string | all | Filter by status |
| type | string | all | Filter by contract type |
| department | string | - | Filter by department |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Authorization:** Authentication required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "contract_id",
      "reference": "CTR-2025-001",
      "type": "cdi",
      "status": "active",
      "startDate": "2024-01-15",
      "endDate": null,
      "baseSalary": 75000,
      "employee": {
        "id": "emp_id",
        "matricule": "EMP001",
        "firstName": "Ahmed",
        "lastName": "BENALI",
        "department": "IT",
        "jobTitle": "Developer"
      },
      "_lifecycle": {
        "isNearExpiration": false,
        "isExpired": false,
        "daysUntilExpiration": null,
        "canTransitionTo": ["expired", "terminated", "suspended", "renewed"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Lifecycle Enrichment (H-17)

Each contract includes computed `_lifecycle` fields:

```typescript
interface ContractLifecycle {
  isNearExpiration: boolean;  // True if expires within 30 days
  isExpired: boolean;          // True if past end date
  daysUntilExpiration: number | null; // Days remaining (null if no end date)
  canTransitionTo: string[];   // Valid target statuses
}
```

### 4.2 POST /api/contracts

Create a new employment contract.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| employeeId | string | ✅ | Employee ID |
| type | string | ✅ | Contract type (cdi/cdd/internship/temporary/part_time) |
| startDate | string | ✅ | Contract start date (ISO 8601) |
| baseSalary | number | ✅ | Monthly base salary in DZD |
| endDate | string | ❌ | End date (required for CDD) |
| trialEndDate | string | ❌ | Trial period end date |
| currency | string | ❌ | Currency code (default: DZD) |
| paymentFrequency | string | ❌ | Payment frequency (default: monthly) |
| transportAllowance | number | ❌ | Transport allowance amount |
| housingAllowance | number | ❌ | Housing allowance amount |
| foodAllowance | number | ❌ | Food/meal allowance |
| weeklyHours | number | ❌ | Weekly working hours (default: 40) |
| daysLeave | number | ❌ | Annual leave days (default: 30) |
| sickLeaveDays | number | ❌ | Sick leave entitlement (default: 15) |
| location | string | ❌ | Work location |
| department | string | ❌ | Department assignment |
| jobTitle | string | ❌ | Job title/position |
| jobGrade | string | ❌ | Job grade/classification |
| nssNumber | string | ❌ | Social Security Number (NSS) |
| cnasNumber | string | ❌ | CNAS registration number |
| casnosNumber | string | ❌ | CASNOS registration number |
| mutuelleNumber | string | ❌ | Insurance/mutuelle number |
| contractFileUrl | string | ❌ | URL to signed contract document |
| annexFilesUrls | string[] | ❌ | URLs to annex documents |
| internalNotes | string | ❌ | Internal HR notes |
| specialClauses | string | ❌ | Special contractual clauses |
| managerId | string | ❌ | Direct manager ID |
| status | string | ❌ | Initial status (auto-determined) |

**Authorization:** ADMIN, MANAGER, HR_MANAGER, or HR_STAFF

**Auto-Status Logic (H-17):**
- If `startDate` ≤ today → Status = `active`
- If `startDate` > today → Status = `draft`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new_contract_id",
    "reference": "CTR-2025-042",
    "type": "cdi",
    "status": "active",
    "startDate": "2025-01-15",
    "endDate": null,
    "baseSalary": 75000,
    "_lifecycle": {
      "isNearExpiration": false,
      "isExpired": false,
      "daysUntilExpiration": null,
      "canTransitionTo": ["expired", "terminated", "suspended", "renewed"]
    }
  },
  "message": "Contrat CTR-2025-042 créé avec succès (activé automatiquement)"
}
```

---

## 5. Validation Rules

### 5.1 Business Rule Validation

| Rule | Error Message |
|------|---------------|
| Required fields missing | "L'employé, le type de contrat, la date de début et le salaire de base sont obligatoires" |
| Invalid contract type | "Type de contrat invalide. Valeurs acceptées: cdi, cdd, internship, temporary, part_time" |
| Employee not found | "Employé non trouvé" |
| End date before start | "La date de fin doit être postérieure à la date de début" |
| CDD without end date | "La date de fin est obligatoire pour les contrats CDD" |
| Overlapping active contract | "Cet employé a déjà un contrat actif..." |

### 5.2 Overlap Detection (H-17)

The system prevents creating overlapping active contracts:

```
Scenario 1: New CDD during existing CDI
├── Existing: [CDI: 2024-01-01 → ∞]
└── New:      [CDD: 2025-03-01 → 2025-08-31] ← BLOCKED

Scenario 2: New contract after existing ends
├── Existing: [CDD: 2024-01-01 → 2024-12-31] [expired]
└── New:      [CDI: 2025-01-15 → ∞] ← ALLOWED
```

---

## 6. Auto-Expiration System (H-17)

### 6.1 Background Process

The `checkAndExpireContracts()` function runs automatically on each GET request:

```typescript
export async function checkAndExpireContracts(): Promise<{
  checked: number;
  expired: number;
}>
```

**Logic:**
1. Find all contracts where:
   - `status = 'active'`
   - `endDate` is not null
   - `endDate < now`
2. Update each found contract:
   - Set `status = 'expired'`
   - Append `[Auto-expired YYYY-MM-DD]` to `internalNotes`

### 6.2 Expiration Warning Detection

```typescript
function isContractNearExpiration(endDate: Date | null): boolean
// Returns TRUE if: 0 < daysUntilExpiration <= 30
```

---

## 7. Reference Number Generation

### 7.1 Format

```
CTR-YYYY-XXX
│    │     └── Sequential number (padded to 3 digits)
│    └──────── Year of contract start
└────────────── Prefix (ConTRact)
```

**Examples:**
- `CTR-2025-001` - First contract of 2025
- `CTR-2025-042` - 42nd contract of 2025

---

## 8. Database Schema (Contract Model)

```typescript
model Contract {
  id                String    @id @default(cuid())
  reference         String    @unique              // CTR-YYYY-XXX
  
  // Classification
  type              String                          // cdi, cdd, internship, etc.
  status            String    @default("draft")     // Lifecycle status
  
  // Dates
  startDate         DateTime                        // Contract start
  endDate           DateTime?                       // Contract end (optional for CDI)
  trialEndDate      DateTime?                       // Trial period end
  
  // Financial
  baseSalary        Decimal                         // Monthly salary
  currency          String    @default("DZD")       // Currency
  paymentFrequency  String    @default("monthly")   // Payment frequency
  
  // Benefits/Allowances
  transportAllowance Decimal   @default(0)
  housingAllowance   Decimal   @default(0)
  foodAllowance      Decimal   @default(0)
  otherBenefits      String?                         // JSON array
  
  // Working Conditions
  weeklyHours       Decimal   @default(40)
  daysLeave         Int       @default(30)
  sickLeaveDays     Int       @default(15)
  location          String?
  department        String?
  jobTitle          String?
  jobGrade          String?
  
  // Legal/Compliance (Algerian)
  nssNumber         String?                         // Numéro Sécurité Sociale
  cnasNumber        String?
  casnosNumber      String?
  mutuelleNumber    String?
  
  // Documents
  contractFileUrl   String?                         // Signed contract PDF
  annexFilesUrls    String?                         // JSON array of URLs
  
  // Notes
  internalNotes     String?
  specialClauses    String?
  
  // Relations
  employeeId        String
  employee          Employee  @relation(fields: [employeeId], references: [id])
  managerId         String?
  manager           User?     @relation(fields: [managerId], references: [id])
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

---

## 9. Integration Points

### 9.1 Upstream Dependencies

| Module | Purpose |
|--------|---------|
| Employees | Contract owner data |
| Users | Manager assignment |
| Auth | Access control |

### 9.2 Downstream Consumers

| Module | Purpose |
|--------|---------|
| Payroll | Salary basis, contribution calculations |
| HR | Leave entitlements, benefits |
| Attendance | Working hours configuration |
| Accounting | Cost center allocation |

---

## 10. Security Considerations

### 10.1 Access Control Matrix

| Operation | Admin | Manager | HR Manager | HR Staff | Employee |
|-----------|-------|---------|------------|----------|----------|
| List contracts | ✅ | ✅ | ✅ | ✅ | ❌ |
| View own contract | ✅ | ✅ | ✅ | ✅ | ✅* |
| Create contract | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update contract | ✅ | ✅ | ✅ | ❌ | ❌ |
| Terminate contract | ✅ | ✅ | ✅ | ❌ | ❌ |

*Employees can only view their own contract via separate endpoint

### 10.2 Data Protection

- PII fields (NSS, CNAS numbers) restricted to HR roles
- Salary information requires authorized access
- Audit trail for all modifications

---

## 11. Best Practices

### 11.1 For HR Administrators

1. **Always set end dates for CDD contracts** - Required by law
2. **Upload signed contracts** - Use `contractFileUrl` for compliance
3. **Review expiration alerts** - Check `_lifecycle.isNearExpiration`
4. **Document special clauses** - Use `specialClauses` field
5. **Keep manager assignments current** - Affects approval workflows

### 11.2 For Developers

1. **Use lifecycle transitions** - Don't manually change statuses
2. **Check overlap before creating** - Prevent duplicate active contracts
3. **Handle auto-expiration** - Call `checkAndExpireContracts()` periodically
4. **Validate dates properly** - Use ISO 8601 format
5. **Include lifecycle in responses** - Frontend needs transition info

---

## 12. Compliance Notes (Algerian Labor Law)

| Requirement | Implementation |
|-------------|----------------|
| Trial period max (CDI) | Validate via `trialEndDate` |
| Trial period max (CDD) | Shorter than CDI |
| CDD max duration | 24 months (validate `endDate`) |
| Renewal limits | Track via status history |
| Written contract required | `contractFileUrl` field |
| Social security registration | NSS/CNAS/CASNOS fields |

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
