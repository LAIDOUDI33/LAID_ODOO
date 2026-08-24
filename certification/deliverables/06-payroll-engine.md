# HASSIBA Suite ERP - Payroll Engine Documentation

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable (D6)  
**Date:** January 2025  
**Source File:** `src/app/api/payroll/route.ts`  
**Dependency:** `src/lib/algerian-taxes.ts`

---

## 1. Overview

The **Payroll Engine** is a comprehensive Algerian payroll calculation system that handles:

- 💰 **Salary Calculations** - Base salary, bonuses, overtime
- 📊 **Social Contributions** - CNAS, CASNOS, employer charges
- 🧾 **Tax Withholding** - IRG calculation with family parts
- ✅ **SMIG Compliance** - Minimum wage validation
- 📋 **Payroll Generation** - Complete payslip creation

---

## 2. Architecture

### 2.1 System Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Employee      │────▶│  Payroll Engine   │────▶│   Payroll       │
│   Data (DB)     │     │  (API Route)      │     │   Record (DB)   │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ algerian │ │   SMIG   │ │ Audit    │
              │ taxes.ts │ │  Check   │ │ Logger   │
              └──────────┘ └──────────┘ └──────────┘
```

### 2.2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payroll` | List payrolls with filters |
| POST | `/api/payroll` | Generate payroll for employee |

---

## 3. SMIG Configuration (M-10)

### 3.1 Current Values

```typescript
const SMIG_CONFIG = {
  current: 20000,        // 2025 SMIG in DZD
  historical: {
    2024: 20000,
    2023: 18000,
    2022: 18000,
    2021: 18000,
    2020: 18000
  },
  warningThreshold: 0.9, // Warn if salary < 90% of SMIG
  currency: 'DZD'
};
```

### 3.2 Compliance Checks

The payroll engine performs automatic SMIG compliance validation:

| Condition | Severity | Action |
|-----------|----------|--------|
| Salary < 90% SMIG (18,000 DZD) | ERROR | Block with critical warning |
| Salary < 100% SMIG (20,000 DZD) | WARNING | Include warning in response |
| Salary ≥ SMIG | OK | No action |

---

## 4. Payroll Calculation Algorithm

### 4.1 Calculation Sequence

```
1. SALAIRE DE BASE (Base Salary)
   └── From employee record
   
2. PRIME ANCIENNETÉ (Seniority Bonus)
   └── calculatePrimeAncienete(baseSalary, yearsOfService)
   
3. ALLOCATIONS FAMILIALES (Family Allowances)
   └── getAllocationsFamiliales(nombreEnfants)
   
4. HEURES SUPPLÉMENTAIRES (Overtime)
   └── heuresSupp × tauxHeureSupp × 1.5 (50% majoration)
   
5. AUTRES PRIMES (Other Bonuses)
   ├── primeRendement (Performance)
   ├── primeResponsabilite (Responsibility)
   ├── primeTechnicite (Technical)
   ├── primeTransport (Transport)
   ├── primePanier (Meal)
   ├── primeLogement (Housing)
   └── primeMarie (Marriage)
   
6. TOTAL BRUT (Gross Salary)
   └── baseSalary + allPrimes + allocations + overtime
   
7. COTISATIONS SOCIALES (Social Contributions)
   └── calculateCotisations(baseSalary, { irgParts })
   ├── CNAS Salarial: 1.5%
   ├── CASNOS Salarial: 7.5%
   └── Total Salarial: 9%
   
8. IRG RETENU (Income Tax)
   └── calculateIRGMensuel(grossSalary, partsFamiliales)
   
9. AUTRES RETENUES (Other Deductions)
   ├── avanceSalaire (Salary advance)
   ├── opposition (Garnishment)
   ├── mutuelle (Health insurance)
   └── cnacCredit (CNAC loan)
   
10. NET À PAYER (Net Salary)
    └── grossSalary - totalCotisations - irg - otherDeductions
    
11. CHARGES PATRONALES (Employer Charges)
    ├── CNAS Employeur: 8.5%
    ├── CASNOS Employeur: 12.5%
    ├── Chômage: 1.0%
    ├── AT (Accident): ~1%
    ├── Œuvres Sociales: 3.0%
    └── Total Patronal: ~26%
    
12. COÛT TOTAL EMPLOYÉ (Total Employee Cost)
    └── baseSalary + totalPatronal
```

### 4.2 Example Calculation

For an employee with:
- Base Salary: 50,000 DZD
- Years of Service: 10 (5% seniority bonus)
- Children: 3
- Overtime: 8 hours @ 288.35 DZD/h

| Component | Amount (DZD) |
|-----------|--------------|
| Base Salary | 50,000.00 |
| Seniority Bonus (5%) | 2,500.00 |
| Family Allowances (3 children) | 1,200.00 |
| Overtime (8h × 432.53) | 3,460.24 |
| **Gross Salary** | **57,160.24** |
| CNAS (1.5%) | -750.00 |
| CASNOS (7.5%) | -3,750.00 |
| **Total Contributions** | **-4,500.00** |
| IRG (4 parts) | -4,587.00* |
| **Net to Pay** | **~48,073.24** |

*IRG calculated on taxable base after deductions

---

## 5. Input Validation (M-04)

### 5.1 Field Validations

| Field | Type | Min | Max | Error Code |
|-------|------|-----|-----|------------|
| baseSalary | number | 0 | 10,000,000 | INVALID_SALARY |
| primeRendement | number | 0 | 1,000,000 | INVALID_PRIME_RENDEMENT |
| primeResponsabilite | number | 0 | 1,000,000 | INVALID_PRIME_RESPONSABILITE |
| primeTechnicite | number | 0 | 1,000,000 | INVALID_PRIME_TECHNICITE |
| primeTransport | number | 0 | 1,000,000 | INVALID_PRIME_TRANSPORT |
| primePanier | number | 0 | 1,000,000 | INVALID_PRIME_PANIER |
| primeLogement | number | 0 | 1,000,000 | INVALID_PRIME_LOGEMENT |
| primeMarie | number | 0 | 1,000,000 | INVALID_PRIME_MARIE |
| heuresSupp | number | 0 | 500 | INVALID_HEURES_SUPP |
| avanceSalaire | number | 0 | 5,000,000 | INVALID_AVANCE_SALAIRE |
| opposition | number | 0 | 5,000,000 | INVALID_OPOSITION |
| mutuelle | number | 0 | 5,000,000 | INVALID_MUTUELLE |
| cnacCredit | number | 0 | 5,000,000 | INVALID_CNAC_CREDIT |

---

## 6. API Reference

### 6.1 GET /api/payroll

List all payrolls with optional filters.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | Filter by period (YYYY-MM format) |
| employeeId | string | Filter by employee ID |
| status | string | Filter by status (calculated/paid/cancelled) |

**Authorization:** Requires ADMIN, MANAGER, HR, or ACCOUNTANT role

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payroll_id",
      "reference": "PAIE-2025-01-001",
      "period": "2025-01",
      "employee": {
        "matricule": "EMP001",
        "firstName": "Ahmed",
        "lastName": "BENALI",
        "department": "IT"
      },
      "baseSalary": 50000,
      "grossSalary": 57160.24,
      "netPayable": 48073.24,
      "status": "calculated"
    }
  ]
}
```

### 6.2 POST /api/payroll

Generate a new payroll for an employee.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| employeeId | string | ✅ | Employee unique identifier |
| period | string | ✅ | Payroll period (YYYY-MM format) |
| forceRegenerate | boolean | ❌ | Overwrite existing payroll |
| nombreEnfants | number | ❌ | Number of children (default: 0) |
| marie | boolean | ❌ | Married status (affects parts) |
| partsFamiliales | number | ❌ | Manual override for family parts |
| primeRendement | number | ❌ | Performance bonus |
| primeTransport | number | ❌ | Transport allowance |
| heuresSupp | number | ❌ | Overtime hours |
| tauxHeureSupp | number | ❌ | Overtime hourly rate |
| avanceSalaire | number | ❌ | Salary advance deduction |
| joursTravailles | number | ❌ | Days worked (default: 26) |
| joursAbsences | number | ❌ | Absence days |
| joursConges | number | ❌ | Leave days |

**Authorization:** Requires ADMIN, MANAGER, HR_MANAGER, or ACCOUNTANT role

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "payroll_id",
    "reference": "PAIE-2025-01-001",
    "period": "2025-01",
    "baseSalary": 50000,
    "grossSalary": 57160.24,
    "netPayable": 48073.24,
    "status": "calculated",
    "employee": { ... }
  },
  "calculations": {
    "anneesService": 10.5,
    "salaireBase": 50000,
    "totalPrimes": 7160.24,
    "grossSalary": 57160.24,
    "cotisations": { ... },
    "irg": { ... },
    "totalRetenues": 9087.00,
    "netPayable": 48073.24
  },
  "smigCompliance": {
    "smig": 20000,
    "currency": "DZD",
    "isCompliant": true,
    "percentOfSmig": 250,
    "warnings": []
  },
  "message": "Payroll PAIE-2025-01-001 generated successfully"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_SALARY | Base salary out of valid range |
| 400 | INVALID_* | Invalid field value |
| 404 | - | Employee not found |
| 409 | - | Payroll already exists (use forceRegenerate) |

---

## 7. Security Features

### 7.1 Access Control (C-06)

**IDOR Protection:** Payroll data access is restricted to authorized roles only.

| Role | Can View | Can Create | Can Delete |
|------|----------|------------|------------|
| ADMIN | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ❌ |
| HR | ✅ | ✅ | ❌ |
| ACCOUNTANT | ✅ | ✅ | ❌ |
| EMPLOYEE | ❌ | ❌ | ❌ |

### 7.2 Audit Logging (M-05)

All payroll operations are logged with:
- Action type (VIEW_PAYROLL_LIST, GENERATE_PAYROLL)
- User identification
- PII access level
- Record details

---

## 8. Database Schema (Payroll Model)

```typescript
model Payroll {
  id                  String    @id @default(cuid())
  reference           String    @unique  // PAIE-YYYY-MM-XXX
  period              String             // YYYY-MM
  
  // Gains (Earnings)
  baseSalary          Decimal
  grossSalary         Decimal
  primeAncienete      Decimal
  primeRendement      Decimal
  primeResponsabilite Decimal
  primeTechnicite     Decimal
  primeTransport      Decimal
  primePanier         Decimal
  primeLogement       Decimal
  primeMarie          Decimal
  allocationsFam      Decimal
  heuresSupp          Decimal
  montantHeuresSupp   Decimal
  
  // Cotisations salariales
  cotisationCNAS      Decimal
  cotisationCASNOS    Decimal
  totalCotisations    Decimal
  
  // Retenues
  irgRetenu           Int
  avanceSalaire       Decimal
  opposition          Decimal
  mutuelle            Decimal
  cnacCredit          Decimal
  totalRetenues       Decimal
  
  // Net
  netPayable          Decimal
  
  // Charges patronales
  patronalCNAS        Decimal
  patronalCASNOS      Decimal
  patronalChomage     Decimal
  patronalAT          Decimal
  patronalOEuvres     Decimal
  totalPatronal       Decimal
  coutTotalEmploye    Decimal
  
  // Jours
  joursTravailles     Int
  joursAbsences       Int
  joursConges         Int
  
  status              String    @default("calculated")
  employeeId          String
  employee            Employee  @relation(fields: [employeeId], references: [id])
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## 9. Integration Points

### 9.1 Dependencies

| Module | Purpose |
|--------|---------|
| `algerian-taxes.ts` | All tax and contribution calculations |
| `auth-utils.ts` | Authentication and authorization |
| `audit.ts` | Operation logging |
| Prisma ORM | Database operations |

### 9.2 Downstream Integrations

- **Accounting Module:** Auto-posting of payroll journal entries
- **Reporting Module:** Payroll reports and declarations
- **CNAS/CASNOS:** Social security declaration preparation
- **Banking:** Payment file generation

---

## 10. Best Practices

### 10.1 For Developers

1. **Always validate inputs** - Use the built-in validation ranges
2. **Check for existing payrolls** - Handle 409 conflicts gracefully
3. **Log audit trails** - All sensitive operations must be logged
4. **Use decimal arithmetic** - Avoid floating-point errors with money
5. **Respect SMIG warnings** - Display compliance information to users

### 10.2 For Administrators

1. **Update SMIG annually** - When government announces new rates
2. **Review payroll before approval** - Use status workflow
3. **Backup before bulk operations** - Payroll data is critical
4. **Monitor access logs** - Payroll data is highly sensitive

---

## 11. Error Handling

### 11.1 Standard Errors

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Not authenticated | 401 | Auth required |
| Insufficient permissions | 403 | Forbidden |
| Missing required fields | 400 | Validation error |
| Invalid field values | 400 | Specific error code |
| Employee not found | 404 | Not found |
| Payroll exists | 409 | Conflict |
| Server error | 500 | Generic error |

### 11.2 Fallback Behavior

If tax calculation fails:
- Return partial results where possible
- Log detailed error server-side
- Return user-friendly error message
- Never expose internal calculation details

---

## 12. Future Enhancements (Planned)

- [ ] Multi-period payroll processing
- [ ] Bulk payroll generation
- [ ] Integration with DZ banking systems
- [ ] Automatic CNAS/CASNOS declaration generation
- [ ] Payslip PDF generation
- [ ] Retroactive payment calculations
- [ ] End-of-year tax certificate (Attestation Fiscale)

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
