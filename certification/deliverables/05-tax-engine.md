# HASSIBA Suite ERP - Tax Engine Documentation

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable (D5)  
**Date:** January 2025  
**Source File:** `src/lib/algerian-taxes.ts`  
**Lines of Code:** ~922 lines

---

## 1. Overview

The **Algerian Tax Calculation Engine** (`algerian-taxes.ts`) is the core fiscal computation module for HASSIBA Suite ERP. It implements all Algerian tax regulations including:

- 📊 **TVA** (Taxe sur la Valeur Ajoutée) - Value Added Tax
- 💼 **TAP** (Taxe sur l'Activité Professionnelle) - Professional Activity Tax
- 💰 **IRG** (Impôt sur le Revenu Global) - Income Tax
- 🏢 **IBS** (Impôt sur Bénéfice des Sociétés) - Corporate Profit Tax
- 👥 **Cotisations Sociales** - Social Security Contributions
- 📝 **Timbre Fiscal** - Fiscal Stamps

---

## 2. TVA (Value Added Tax) Module

### 2.1 Rate Configuration

| Rate | Decimal | Integer | French Name | Applicable To |
|------|---------|---------|-------------|---------------|
| Exempt | 0.00 | 0 | Exonéré | Exports, agricultural products |
| Particular | 0.07 | 7 | Particulier | Essential goods/services |
| Reduced | 0.09 | 9 | Réduit | Basic food, some medicines |
| Normal | 0.19 | 19 | Normal | Most goods and services |

### 2.2 TVA Functions Reference

#### `tvaToInt(rate: number): number`
Converts TVA rate from decimal to integer format for display/storage.
```typescript
tvaToInt(0.19) // => 19
tvaToInt(0.07) // => 7
```

#### `tvaToDecimal(rate: number): number`
Converts TVA rate from integer to decimal format for calculations.
```typescript
tvaToDecimal(19) // => 0.19
tvaToDecimal(7)  // => 0.07
```

#### `isValidTVARate(rate: number): boolean`
Validates if a rate is a valid Algerian TVA rate (accepts both formats).
```typescript
isValidTVARate(0.19) // => true
isValidTVARate(19)   // => true
isValidTVARate(15)   // => false
```

#### `normalizeTVARate(rate: number): number`
Normalizes any valid TVA rate to decimal format.
```typescript
normalizeTVARate(19)   // => 0.19
normalizeTVARate(0.19) // => 0.19
```

#### `getTVARateLabel(rate: number): string`
Returns French label for a TVA rate.
```typescript
getTVARateLabel(0.19) // => "Normal (19%)"
getTVARateLabel(0)    // => "Exonéré (0%)"
```

#### `calculateTVA(montantHT: number, tauxTVA: number): TVACalculResult`
Calculates TVA for a single amount.

**Interface:**
```typescript
interface TVACalculResult {
  montantHT: number;    // Amount before tax
  tauxTVA: number;      // Applied TVA rate
  montantTVA: number;   // TVA amount
  montantTTC: number;   // Amount including tax
}
```

**Example:**
```typescript
calculateTVA(100000, 0.19)
// => { montantHT: 100000, tauxTVA: 0.19, montantTVA: 19000, montantTTC: 119000 }
```

#### `calculateTVACollectee(lines: Array<{amountUntaxed, tvaRate}>): TVACollecteeResult`
Calculates TVA collectée by rate category (for G50 declaration).

**Interface:**
```typescript
interface TVACollecteeResult {
  tva19: number;           // TVA at 19%
  tva9: number;            // TVA at 9%
  tva7: number;            // TVA at 7%
  tva0: number;            // Exempt amount
  totalTVACollectee: number;
  totalHT: number;
  totalTTC: number;
}
```

---

## 3. TAP (Professional Activity Tax) Module

### 3.1 Sector Rates

| Sector | Code | Rate |
|--------|------|------|
| Wholesale Trade | commerce_gros | 1% |
| Retail Trade | commerce_detail | 2% |
| Industry | industrie | 2% |
| Services | services | 2% |
| Liberal Professions | professions_liberales | 3% |

### 3.2 Geographic Abatement Zones

| Zone | Abatement | Effective Rate (Industry) |
|------|-----------|---------------------------|
| Nord (North) | 0% | 2.00% |
| Hauts Plateaux (High Plateaus) | 20% | 1.60% |
| Sud (South) | 60% | 0.80% |

### 3.3 TAP Functions Reference

#### `calculateTAP(chiffreAffairesHT, secteur, zone?): TAPCalculResult`

**Interface:**
```typescript
interface TAPCalculResult {
  baseImposable: number;
  tauxSecteur: number;
  zone: TaxZone;
  abattementZone: number;
  tauxEffectif: number;
  tapBrut: number;
  tapNet: number;
  abattementMontant: number;
}
```

**Example:**
```typescript
// Company in South Algeria, Industry sector, 1M DZD turnover
calculateTAP(1000000, 'industrie', 'sud')
// => {
//   baseImposable: 1000000,
//   tauxSecteur: 0.02,
//   zone: 'sud',
//   abattementZone: 0.60,
//   tauxEffectif: 0.008,
//   tapBrut: 20000,
//   tapNet: 8000,
//   abattementMontant: 12000
// }
```

---

## 4. IRG (Income Tax) Module

### 4.1 Annual Tax Brackets (Tranches Annuelles)

| Tranche | Min (DZD/Year) | Max (DZD/Year) | Rate | Deduction |
|---------|----------------|----------------|------|-----------|
| 1 | 0 | 120,000 | 0% | 0 |
| 2 | 120,001 | 360,000 | 20% | 24,000 |
| 3 | 360,001 | 1,440,000 | 30% | 312,000 |
| 4 | 1,440,001 | ∞ | 35% | 384,000 |

### 4.2 Monthly Tax Brackets (for Payroll)

| Tranche | Min (DZD/Month) | Max (DZD/Month) | Rate | Deduction |
|---------|-----------------|-----------------|------|-----------|
| 1 | 0 | 10,000 | 0% | 0 |
| 2 | 10,001 | 30,000 | 20% | 2,000 |
| 3 | 30,001 | 120,000 | 30% | 26,000 |
| 4 | 120,001 | ∞ | 35% | 32,000 |

### 4.3 Family Parts (Parts Familiales)

| Part | Description | Annual Deduction (DZD) |
|------|-------------|----------------------|
| Part 1 | Taxpayer (Contribuable) | 10,000 |
| Part 2 | Spouse (Époux) | 15,000 |
| Parts 3-4 | Children (Enfants) | 8,500 each |
| Parts 5+ | Additional Children | 9,500 each |
| - | Dependent Parent | 13,500 |

### 4.4 IRG Functions Reference

#### `calculateIRGAnnuel(revenuBrutAnnuel, nbPartsFamiliales?): IRGCalculResult`

**Interface:**
```typescript
interface IRGCalculResult {
  revenuBrut: number;
  partsFamiliales: number;
  deductionParts: number;
  revenuImposable: number;
  tranche: IRGTranche;
  irgBrut: number;
  irgNet: number;
}
```

**Example:**
```typescript
// Annual income 480,000 DZD, married with 2 children (4 parts)
calculateIRGAnnuel(480000, 4)
// => deductionParts = 10000 + 15000 + 8500 + 8500 = 42000
//    revenuImposable = 438000
//    tranche = { min: 360001, max: 1440000, taux: 0.30, deduction: 312000 }
//    irgBrut = 438000 * 0.30 - 312000 = -18040 => 0 (minimum)
//    irgNet = 0
```

#### `calculateIRGMensuel(salaireBrutMensuel, nbPartsFamiliales?): IRGCalculResult`
Converts to annual, calculates IRG, then returns monthly equivalent.

---

## 5. H-19: Tax-Exempt Primes Handling

### 5.1 Prime Types Classification

#### Taxable Primes (Soumises à l'IRG)
| Code | Name | Arabic Name |
|------|------|-------------|
| prime_anciennete | Prime d'ancienneté | علاوة الأقدمية |
| prime_technique | Prime technique | علاوة تقنية |
| prime_responsabilite | Prime de responsabilité | علاوة المسؤولية |
| prime_productivite | Prime de productivité | علاوة الإنتاجية |
| prime_resultat | Prime de résultat | علاوة النتائج |
| prime_logement | Prime de logement (imposable) | علاوة السكن |

#### Tax-Exempt Primes (Exonérées d'IRG - Art. 67 CIDTA)
| Code | Name | Arabic Name |
|------|------|-------------|
| prime_familiale | Allocations familiales | المنح العائلية |
| prime_deplacement | Indemnité de déplacement | تعويض التنقل |
| prime_transport | Indemnité de transport | تعويض النقل |
| prime_repas | Indemnité de repas | تعويض الوجبات |
| prime_salariale_unique | Prime salariale unique (PSU) | العلاوة الأجرية الواحدة |
| prime_zone_difficile | Prime de zone difficile | علاوة المناطق الصعبة |
| prime_nuit | Indemnité de travail de nuit | تعويض العمل الليلي |
| prime_mariage | Prime de mariage | علاوة الزواج |
| prime_naissance | Prime de naissance | علاوة الميلاد |
| prime_scolarite | Prime de scolarité | علاوة الدراسة |
| indemnite_chomage | Indemnité de chômage | تعويض البطالة |
| indemnite_maladie | Indemnité de maladie | تعويض المرض |

### 5.2 Tax-Exempt Prime Functions

#### `calculatePrimeSplit(primes: PrimeEntry[]): {...}`
Separates primes into taxable and exempt categories.

#### `calculateIRGAvecPrimes(salaireDeBase, primes?, nbPartsFamiliales?): IRGWithPrimesResult`
Enhanced IRG calculation that properly excludes tax-exempt primes from the IRG base.

**Key Logic:**
```
IRG Base (Assiette IRG) = Base Salary + Taxable Primes ONLY
Tax-Exempt Primes are EXCLUDED from IRG calculation
```

---

## 6. Social Security Contributions (Cotisations Sociales)

### 6.1 Contribution Rates

| Contribution | Employee Rate | Employer Rate |
|--------------|---------------|---------------|
| CNAS (Social Security) | 1.5% | 8.5% |
| CASNOS (Retirement) | 7.5% | 12.5% |
| Chômage (Unemployment) | - | 1.0% |
| AT (Work Accident) | - | 0.75%-5%* |
| Œuvres Sociales | - | 3.0% |

*AT rate varies by sector risk level

### 6.2 Total Employer Burden
**Total Employer Contributions:** ~26% of base salary

### 6.3 Function Reference

#### `calculateCotisations(salaireDeBase, options?): CotisationResult`

**Interface:**
```typescript
interface CotisationResult {
  salaireDeBase: number;
  // Part Salariale (deductions)
  cnasSalarie: number;
  casnosSalarie: number;
  totalSalarial: number;
  // Part Patronal (employer charges)
  cnasEmployeur: number;
  casnosEmployeur: number;
  chomageEmployeur: number;
  atEmployeur: number;
  oeuvresSociales: number;
  totalPatronal: number;
  // Totals
  coutTotalEmploye: number;
  netAvantIRG: number;
  netApresIRG: number;
  irg: number;
}
```

---

## 7. Seniority Bonus (Prime d'Ancienneté)

### 7.1 Rates by Years of Service

| Years of Service | Rate |
|------------------|------|
| 0-4 years | 0% |
| 5-11 years | 5% |
| 12-17 years | 10% |
| 18-22 years | 15% |
| 23-27 years | 20% |
| 28+ years | 25% |

### 7.2 Function Reference

#### `calculatePrimeAncienete(salaireDeBase, anneesService): number`

```typescript
// Employee with 15 years service, 50,000 DZD base salary
calculatePrimeAncienete(50000, 15) // => 5000 (10%)
```

---

## 8. Family Allowances (Allocations Familiales)

### 8.1 Monthly Amounts per Child

| Child Rank | Monthly Amount (DZD) |
|------------|---------------------|
| 1st child | 300 |
| 2nd child | 400 |
| 3rd child | 500 |
| 4th+ child | 600 |

### 8.2 Function Reference

#### `getAllocationsFamiliales(nombreEnfants): number`

```typescript
getAllocationsFamiliales(3) // => 300 + 400 + 500 = 1200
getAllocationsFamiliales(5) // => 300 + 400 + 500 + 600 + 600 = 2400
```

---

## 9. Overtime (Heures Supplémentaires)

### 9.1 Majoration Rates

| Type | Majoration |
|------|------------|
| jour_ouvrable (Working day) | 50% |
| nuit (Night) | 100% |
| dimanche (Sunday) | 100% |
| ferie (Holiday) | 100% |

### 9.2 Function Reference

#### `calculateHeuresSupp(tauxHoraire, heures, type?): number`

```typescript
// 8 hours overtime on working day, 500 DZD/hour
calculateHeuresSupp(500, 8, 'jour_ouvrable') // => 6000
```

---

## 10. Fiscal Stamp (Timbre Fiscal)

### 10.1 Stamp Values

| Type | Amount (DZD) |
|------|--------------|
| Facture (Invoice) | 1.00 |
| Avoir (Credit Note) | 0.50 |
| Contrat (Contract) | 50 - 1,000* |
| Chèque (Check) | 0 or 1.00** |
| Passeport (Passport) | 2,000 |

*Contract stamps vary by amount: ≤20K=50, ≤100K=200, ≤500K=500, >500K=1000
**Only if amount > 5,000 DZD

### 10.2 Function Reference

#### `getTimbreFiscal(type, montant?): number`

---

## 11. IBS (Corporate Profit Tax)

### 11.1 Tax Rates

| Category | Rate |
|----------|------|
| Standard | 19% |
| Insurance Companies | 26% |
| Encouraged Activities (South Zone, etc.) | 5% |

### 11.2 Function Reference

#### `calculateIBS(beneficeNetComptable, categorie?): IBSCalculResult`

```typescript
// Net profit 10,000,000 DZD, standard rate
calculateIBS(10000000)
// => { beneficeImposable: 10000000, tauxIBS: 0.19, ibsDu: 1900000 }
```

---

## 12. Exported Utilities Object

All functions are also available via the `AlgerianTaxUtils` export:

```typescript
import { AlgerianTaxUtils } from '@/lib/algerian-taxes';

// Access any function
AlgerianTaxUtils.calculateTVA(100000, 0.19);
AlgerianTaxUtils.calculateIRGMensuel(50000, 3);
AlgerianTaxUtils.calculateCotisations(50000);
```

---

## 13. Usage Examples

### Complete Payroll Calculation Flow

```typescript
import {
  calculateCotisations,
  calculateIRGMensuel,
  calculatePrimeAncienete,
  getAllocationsFamiliales,
  calculateHeuresSupp,
  calculateIRGAvecPrimes,
  PRIME_TYPES
} from '@/lib/algerian-taxes';

// Employee data
const baseSalary = 50000; // DZD
const yearsOfService = 10;
const childrenCount = 3;
const overtimeHours = 8;
const hourlyRate = 288.35; // ~50000 / 173.33 hours

// 1. Calculate seniority bonus
const seniorityBonus = calculatePrimeAncienete(baseSalary, yearsOfService);
// => 2500 (5%)

// 2. Calculate family allowances
const familyAllowances = getAllocationsFamiliales(childrenCount);
// => 1200

// 3. Calculate overtime
const overtimePay = calculateHeuresSupp(hourlyRate, overtimeHours, 'jour_ouvrable');
// => 3459.99

// 4. Calculate gross salary
const grossSalary = baseSalary + seniorityBonus + familyAllowances + overtimePay;

// 5. Calculate social contributions
const cotisations = calculateCotisations(baseSalary, { irgParts: 4 });

// 6. Calculate IRG (with proper tax-exempt handling)
const irgResult = calculateIRGAvecPrimes(baseSalary, [
  { typeCode: 'prime_transport', amount: 5000 },
  { typeCode: 'prime_anciennete', amount: seniorityBonus }
], 4);

// 7. Calculate net pay
const netPay = grossSalary - cotisations.totalSalarial - irgResult.irgNet;
```

---

## 14. Regulatory References

| Tax | Legal Reference |
|-----|-----------------|
| TVA | Code des Impôts Directs et Taxes Assimilées (CIDTA), Articles 78-95 |
| TAP | Loi de Finances, Articles related to TAP |
| IRG | CIDTA, Articles 1-76 (Income Tax) |
| IBS | CIDTA, Articles 77-108 (Corporate Tax) |
| Cotisations | Loi 83-11 (Social Security), Décrets d'application |
| Primes exonérées | Article 67 CIDTA |

---

## 15. Testing Considerations

When testing tax calculations:

1. **Rounding**: All monetary values are rounded to 2 decimal places using `Math.round(value * 100) / 100`
2. **IRG Minimum**: IRG cannot be negative (returns 0 minimum)
3. **Family Parts**: Maximum practical parts is typically 6-8
4. **TVA Validation**: Always use `isValidTVARate()` before calculations
5. **Zone Abatement**: TAP abatement only applies to registered zones

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
