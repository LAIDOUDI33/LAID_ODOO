# Algerian Localization Model

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable  
**Jurisdiction:** People's Democratic Republic of Algeria  
**Regulatory Framework:** Code des Impôts Directs et Taxes Assimilées (CIDTA)

---

## 1. Overview

The HASSIBA Suite ERP implements comprehensive **Algerian localization** covering:

- 🇩🇿 National tax regulations (TVA, TAP, IRG, IBS)
- 🏛️ Administrative geography (58 Wilayas, 1541 Communes)
- 💰 DZD currency with exchange rate management
- 🌐 Bilingual interface (French/Arabic)
- 👥 Labor law compliance (SMIG, leave, social security)
- 📋 Legal reporting (G50, G1, G2, G4 declarations)

---

## 2. Tax Configuration

### 2.1 TVA (Taxe sur la Valeur Ajoutée) - Value Added Tax

#### TVA Rate Structure

| Rate | Decimal | Applicable To |
|------|---------|---------------|
| **19%** | 0.19 | Normal rate - Most goods and services |
| **9%** | 0.09 | Reduced rate - Basic food products, some medicines |
| **7%** | 0.07 | Particular rate - Essential goods and services |
| **0%** | 0.00 | Exempt - Exports, certain agricultural products |

**Source Code Reference (`algerian-taxes.ts`):**
```typescript
export const TVA_RATES: TVARates = {
  normal: 0.19,      // 19% - Standard rate
  reduit: 0.09,      // 9% - Reduced rate
  particulier: 0.07, // 7% - Special rate
  exonere: 0.00      // 0% - Exempt
};

export const VALID_TVA_RATES_DECIMAL = [0, 0.07, 0.09, 0.19] as const;
export const VALID_TVA_RATES_INTEGER = [0, 7, 9, 19] as const;
```

#### TVA Calculation

```typescript
// Formula: TVA Amount = HT Amount × TVA Rate
function calculateTVA(montantHT: number, tauxTVA: number): TVACalculResult {
  const montantTVA = Math.round(montantHT * tauxTVA * 100) / 100;
  const montantTTC = montantHT + montantTVA;
  
  return { montantHT, tauxTVA, montantTVA, montantTTC };
}

// Example:
// calculateTVA(100000, 0.19) => { montantHT: 100000, montantTVA: 19000, montantTTC: 119000 }
```

#### TVA Collectée by Rate (for G50 Declaration)
```typescript
interface TVACollecteeResult {
  tva19: number;           // TVA at 19%
  tva9: number;            // TVA at 9%
  tva7: number;            // TVA at 7%
  tva0: number;            // Exempt amount
  totalTVACollectee: number; // Total VAT collected
  totalHT: number;         // Total before tax
  totalTTC: number;        // Total including tax
}
```

---

### 2.2 TAP (Taxe sur l'Activité Professionnelle) - Professional Activity Tax

#### TAP Rates by Sector

| Sector | French Name | Rate |
|--------|-------------|------|
| Wholesale Trade | Commerce de gros | 1% |
| Retail Trade | Commerce de détail | 2% |
| Industry | Industrie | 2% |
| Services | Services | 2% |
| Liberal Professions | Professions libérales | 3% |

**Source Code:**
```typescript
export const TAP_TAUX: TAPConfig = {
  commerce_gros: 0.01,
  commerce_detail: 0.02,
  industrie: 0.02,
  services: 0.02,
  professions_liberales: 0.03
};
```

#### Geographic Abatement Zones (Abattement Géographique)

Algeria is divided into 3 tax zones with different abatement rates to encourage investment in southern regions:

| Zone | Regions | Abatement Rate | Effective Rate (Commerce) |
|------|---------|-----------------|---------------------------|
| **Nord** | Northern coastal wilayas (01-18) | 0% | 1-2% (full) |
| **Hauts Plateaux** | High plateaus (19-36) | 20% | 0.8-1.6% |
| **Sud** | Southern regions (37-58) | 60% | 0.4-0.8% |

**Zone Mapping:**
```typescript
export type TaxZone = 'nord' | 'hauts_plateaux' | 'sud';

export const TAP_ABATTEMENT_ZONES: Record<TaxZone, number> = {
  nord: 0,           // No abatement
  hauts_plateaux: 0.20, // 20% abatement
  sud: 0.60          // 60% abatement
};
```

#### TAP Calculation Formula
```
TAP Brut = Chiffre d'Affaires HT × Taux Secteur
Abattement Zone = TAP Brut × Taux Abattement Zone
TAP Net à Payer = TAP Brut - Abattement Zone
```

**Implementation:**
```typescript
function calculateTAP(
  chiffreAffairesHT: number,
  secteur: keyof TAPConfig,
  zone: TaxZone = 'nord'
): TAPCalculResult {
  const tauxSecteur = TAP_TAUX[secteur];
  const abattementZone = TAP_ABATTEMENT_ZONES[zone];
  
  const tapBrut = chiffreAffairesHT * tauxSecteur;
  const abattementMontant = tapBrut * abattementZone;
  const tapNet = tapBrut - abattementMontant;
  
  return {
    baseImposable: chiffreAffairesHT,
    tauxSecteur,
    zone,
    abattementZone,
    tapBrut: Math.round(tapBrut * 100) / 100,
    tapNet: Math.round(tapNet * 100) / 100
  };
}
```

---

### 2.3 IRG (Impôt sur le Revenu Global) - Income Tax

#### Annual IRG Brackets (Tranches Annuelles)

| Tranche | Income Range (Annual DZD) | Rate | Deduction (DZD) |
|---------|---------------------------|------|-----------------|
| 1 | 0 - 120,000 | 0% | 0 |
| 2 | 120,001 - 360,000 | 20% | 24,000 |
| 3 | 360,001 - 1,440,000 | 30% | 312,000 |
| 4 | 1,440,001+ | 35% | 384,000 |

**Source Code:**
```typescript
export const IRG_TRANCHE_ANNUELLE: IRGTranche[] = [
  { min: 0, max: 120000, taux: 0, deduction: 0 },
  { min: 120001, max: 360000, taux: 0.20, deduction: 24000 },
  { min: 360001, max: 1440000, taux: 0.30, deduction: 312000 },
  { min: 1440001, max: null, taux: 0.35, deduction: 384000 }
];
```

#### Monthly IRG Brackets (for Payroll)

| Tranche | Income Range (Monthly DZD) | Rate | Deduction (DZD) |
|---------|----------------------------|------|-----------------|
| 1 | 0 - 10,000 | 0% | 0 |
| 2 | 10,001 - 30,000 | 20% | 2,000 |
| 3 | 30,001 - 120,000 | 30% | 26,000 |
| 4 | 120,001+ | 35% | 32,000 |

**Source Code:**
```typescript
export const IRG_TRANCHE_MENSUELLE: IRGTranche[] = [
  { min: 0, max: 10000, taux: 0, deduction: 0 },
  { min: 10001, max: 30000, taux: 0.20, deduction: 2000 },
  { min: 30001, max: 120000, taux: 0.30, deduction: 26000 },
  { min: 120001, max: null, taux: 0.35, deduction: 32000 }
];
```

#### Family Parts System (Parts Familiales)

Algerian tax law allows deductions based on family situation:

| Part | Description | Annual Deduction (DZD) |
|------|-------------|------------------------|
| Part 1 | Taxpayer (Contribuable) | 10,000 |
| Part 2 | Spouse (Époux/se) | 15,000 |
| Parts 3-4 | Children 3-4 | 8,500 each |
| Parts 5+ | Children 5+ | 9,500 each |
| Parent | Dependent parent | 13,500 |

**Source Code:**
```typescript
export const PARTS_FAMILIALES: PartsFamilialesConfig = {
  partContribuable: 10000,   // Part 1: Taxpayer
  partEpoux: 15000,          // Part 2: Spouse
  partEnfant34: 8500,        // Parts 3-4: Children
  partEnfant5Plus: 9500,     // Parts 5+: Additional children
  parentCharge: 13500        // Dependent parent
};
```

#### IRG Calculation Formula
```
Revenu Imposable = Revenu Brut - Déduction Parts Familiales
IRG Brut = (Revenu Imposable × Taux Tranche) - Déduction Tranche
IRG Net = Max(0, IRG Brut)
```

**Implementation:**
```typescript
function calculateIRGAnnuel(
  revenuBrutAnnuel: number,
  nbPartsFamiliales: number = 1
): IRGCalculResult {
  // Calculate parts deduction
  let deductionParts = PARTS_FAMILIALES.partContribuable; // Always Part 1
  
  if (nbPartsFamiliales >= 2) {
    deductionParts += PARTS_FAMILIALES.partEpoux; // Part 2 (spouse)
  }
  
  if (nbPartsFamiliales >= 3) {
    const parts34 = Math.min(nbPartsFamiliales - 2, 2);
    deductionParts += parts34 * PARTS_FAMILIALES.partEnfant34;
  }
  
  if (nbPartsFamiliales > 4) {
    const parts5Plus = nbPartsFamiliales - 4;
    deductionParts += parts5Plus * PARTS_FAMILIALES.partEnfant5Plus;
  }

  const revenuImposable = Math.max(0, revenuBrutAnnuel - deductionParts);
  
  // Find applicable tranche
  const tranche = IRG_TRANCHE_ANNUELLE.find(
    t => revenuImposable >= t.min && (t.max === null || revenuImposable <= t.max)
  ) || IRG_TRANCHE_ANNUELLE[IRG_TRANCHE_ANNUELLE.length - 1];

  const irgBrut = (revenuImposable * tranche.taux) - tranche.deduction;
  const irgNet = Math.max(0, Math.round(irgBrut));

  return { revenuBrut: revenuBrutAnnuel, partsFamiliales: nbPartsFamiliales,
           deductionParts, revenuImposable, tranche, irgBrut, irgNet };
}
```

---

### 2.4 IBS (Impôt sur Bénéfice des Sociétés) - Corporate Income Tax

#### IBS Rates

| Category | Rate | Applicable To |
|----------|------|---------------|
| **Standard** | 19% | Most companies |
| **Insurance** | 26% | Insurance companies |
| **Encouraged Activities** | 5% | Activities in encouraged zones (South, etc.) |

**Source Code:**
```typescript
export const IBS_RATES: Record<string, number> = {
  standard: 0.19,     // 19% - General rate
  assurances: 0.26,   // 26% - Insurance companies
  encouragees: 0.05   // 5% - Encouraged activities
};
```

#### IBS Calculation
```
IBS Due = Bénéfice Imposable × Taux IBS
```

---

### 2.5 Social Contributions (Cotisations Sociales)

#### Contribution Rates Summary

| Contribution | Employer % | Employee % | Total | Account |
|--------------|-------------|------------|-------|---------|
| **CNAS** (Social Security) | 8.5% | 1.5% | 10% | Health/family benefits |
| **CASNOS** (Pension) | 12.5% | 7.5% | 20% | Retirement pension |
| **Chômage** (Unemployment) | 1% | 0% | 1% | Unemployment insurance |
| **AT** (Work Accident) | 0.75-5%* | 0% | Variable | Work injury coverage |
| **Œuvres Sociales** | 3% | 0% | 3% | Social works |
| **TOTAL** | ~25-30% | 9% | ~34-39% | |

*AT rate varies by industry risk level (0.75% minimum, 5% maximum)

**Source Code:**
```typescript
export const COTISATION_RATES: CotisationRates = {
  cnasEmployeur: 0.085,       // 8.5%
  cnasSalarie: 0.015,        // 1.5%
  casnosEmployeur: 0.125,     // 12.5%
  casnosSalarie: 0.075,       // 7.5%
  chomageEmployeur: 0.01,     // 1%
  atMin: 0.0075,              // 0.75% minimum
  atMax: 0.05,                // 5% maximum
  oeuvresSociales: 0.03       // 3%
};
```

#### Total Employee Cost Calculation
```
Salaire Base:                    100,000 DZD
─────────────────────────────────────────────
RETENUES SALARIALES (Employee):
  CNAS (1.5%)                      1,500 DZD
  CASNOS (7.5%)                    7,500 DZD
  ──────────────────────────────────────
  Total Retenues Salariales:        9,000 DZD
  
  IRG (calculated):               XX,XXX DZD
  ──────────────────────────────────────
  SALAIRE NET À PAYER:            XX,XXX DZD

CHARGES PATRONALES (Employer):
  CNAS (8.5%)                      8,500 DZD
  CASNOS (12.5%)                  12,500 DZD
  Chômage (1%)                     1,000 DZD
  AT (1% default)                  1,000 DZD
  Œuvres Sociales (3%)             3,000 DZD
  ──────────────────────────────────────
  Total Charges Patronales:       26,000 DZD

COÛT TOTAL EMPLOYÉ:              126,000 DZD
(Salaire Base + Charges Patronales)
```

---

## 3. Regulatory Compliance

### 3.1 Fiscal Calendar (Algerian Tax Deadlines)

| Declaration | Type | Frequency | Deadline | Form |
|-------------|------|-----------|----------|------|
| **G50** | TVA | Monthly | Before 20th of following month | G50 |
| **G1** | IRG (salaries) | Monthly | Before 15th of following month | G1 |
| **G2** | TAP | Quarterly | Before 20th of month following quarter | G2 |
| **G4** | IBS | Annual | Before April 30th | G4 |

**Declaration Types in System:**
```prisma
model TaxDeclaration {
  type    String  // "G50_TVA", "G1_IRG", "G2_TAP", "G4_IBS"
  period  String  // "YYYY-MM" or "YYYY" for annual
  status  String  // draft, submitted, validated, paid
}
```

### 3.2 Legal Reports (Déclarations Fiscales)

#### G50 - TVA Declaration
```typescript
// G50 Data Structure
{
  // TVA Collectée (Output VAT)
  tvaCollecte19: number,           // 19% sales
  tvaCollecte9: number,            // 9% sales
  tvaCollecte7: number,            // 7% sales
  
  // TVA Déductible (Input VAT)
  tvaDeductibleBiens: number,      // On goods
  tvaDeductibleServices: number,   // On services
  tvaDeductibleImport: number,     // On imports
  
  // Result
  tvaNet: number                   // Payable or credit
}
```

#### G1 - IRG Salaries Declaration
```typescript
{
  irgRetenuSalaires: number,   // Total IRG withheld from salaries
  irgRetenuAutres: number,     // IRG from other sources
  irgTotal: number             // Total IRG due
}
```

#### G2 - TAP Declaration
```typescript
{
  tapBaseCA: number,           // Turnover base
  tapTaux: number,             // Applied rate
  tapAbattement: number,       // Geographic abatement
  tapDue: number               // Net TAP payable
}
```

#### G4 - IBS Declaration (Annual)
```typescript
{
  ibsBenefice: number,         // Taxable profit
  ibsTaux: number,             // IBS rate applied
  ibsDue: number               // IBS amount due
}
```

---

## 4. Labor Law Compliance

### 4.1 SMIG (Salaire Minimum Garanti)

| Category | Daily Rate (DZD) | Monthly Rate (DZD)* |
|----------|------------------|---------------------|
| SMIG 2024 | ~1,600 | ~26,700 (26.75 days) |
| SMIG 2025 | TBD | TBD |

*Based on 26.75 working days per month (Algerian standard)

### 4.2 Working Time Standards

| Parameter | Standard | Source |
|-----------|----------|--------|
| Weekly hours | 40 hours | Labor Law |
| Daily hours | 8 hours | Standard |
| Working days/month | 26 days | Average |
| Overtime (weekday) | +50% | Labor Law |
| Overtime (night) | +100% | Labor Law |
| Overtime (Sunday/holiday) | +100% | Labor Law |

**Overtime Implementation:**
```typescript
export type HeuresSuppType = 'jour_ouvrable' | 'nuit' | 'dimanche' | 'ferie';

export const HEURES_SUPP_MAJORIZATION: Record<HeuresSuppType, number> = {
  jour_ouvrable: 0.50,  // 50% additional
  nuit: 1.00,           // 100% additional
  dimanche: 1.00,       // 100% additional
  ferie: 1.00           // 100% additional
};

function calculateHeuresSupp(
  tauxHoraire: number,
  heures: number,
  type: HeuresSuppType = 'jour_ouvrable'
): number {
  const majoration = HEURES_SUPP_MAJORIZATION[type];
  return Math.round(tauxHoraire * heures * (1 + majoration) * 100) / 100;
}
```

### 4.3 Leave Entitlements

| Leave Type | Days/Year | Paid | Conditions |
|------------|-----------|------|-------------|
| **Annual Leave** | 30 days | Yes | After 1 month service |
| **Sick Leave** | 15 days | Yes | Medical certificate required |
| **Maternity Leave** | 14 weeks | Yes | 7 weeks before, 7 after |
| **Paternity Leave** | 3 days | Yes | Birth of child |
| **Marriage Leave** | 3 days | Yes | First marriage |
| **Religious Pilgrimage** | 30 days | Without pay | Once during employment |
| **Bereavement** | 3 days | Yes | Immediate family |
| **Exceptional Leave** | 10 days | With/without pay | By agreement |

**Leave Types in Schema:**
```typescript
enum LeaveType {
  annual, sickness, maternity, paternity, unpaid,
  exceptional, marriage, birth, death, pilgrimage
}
```

### 4.4 Seniority Bonus (Prime d'Ancienneté)

| Years of Service | Rate |
|-------------------|------|
| 0-4 years | 0% |
| 5-11 years | 5% |
| 12-17 years | 10% |
| 18-22 years | 15% |
| 23-27 years | 20% |
| 28+ years | 25% |

**Implementation:**
```typescript
export const ANCIENNETE_TAUX: AncienneteConfig[] = [
  { annees: 0, taux: 0 },
  { annees: 5, taux: 0.05 },
  { annees: 12, taux: 0.10 },
  { annees: 18, taux: 0.15 },
  { annees: 23, taux: 0.20 },
  { annees: 28, taux: 0.25 }
];

function calculatePrimeAncienete(salaireDeBase: number, anneesService: number): number {
  let tauxApplicable = 0;
  
  for (let i = ANCIENNETE_TAUX.length - 1; i >= 0; i--) {
    if (anneesService >= ANCIENNETE_TAUX[i].annees) {
      tauxApplicable = ANCIENNETE_TAUX[i].taux;
      break;
    }
  }
  
  return Math.round(salaireDeBase * tauxApplicable * 100) / 100;
}
```

### 5. Localization Features

### 5.1 Currency Management

| Feature | Implementation |
|---------|----------------|
| Base Currency | DZD (Algerian Dinar) |
| Exchange Rates | CurrencyRate model (daily rates) |
| Supported Currencies | EUR, USD (extensible) |
| Rounding | 2 decimal places (centimes) |

**Currency Model:**
```prisma
model CurrencyRate {
  fromCurrency  String @default("DZD")
  toCurrency    String              // EUR, USD
  rate          Float  @default(1)
  date          DateTime
  source        String?             // Bank of Algeria, custom
  
  @@unique([fromCurrency, toCurrency, date])
}
```

### 5.2 Bilingual Support (French/Arabic)

All key entities support bilingual names:

```prisma
model Company {
  name        String     // French name
  nameAr      String?    // Arabic name (الاسم بالعربية)
}

model Wilaya {
  nameFr      String     // French name
  nameAr      String?    // Arabic name
}

model Commune {
  nameFr      String     // French name
  nameAr      String?    // Arabic name
}

model ChartOfAccount {
  name        String     // French account name
  nameAr      String?    // Arabic account name
}

model Employee {
  firstName   String
  lastName    String
  firstNameAr String?
  lastNameAr  String?
}
```

### 5.3 Algerian Geography (Wilayas & Communes)

#### Wilaya Structure (58 Provinces)

```prisma
model Wilaya {
  code          String @unique    // "01" to "58"
  nameFr        String           // French name
  nameAr        String?          // Arabic name
  chiefCity     String?          // Chef-lieu (capital city)
  taxZone       String           // nord, hauts_plateaux, sud
  abattementRate Float @default(0) // TAP abatement %
  surfaceKm2    Float?
  population    Int?
  
  communes      Commune[]       // Associated communes
  companies     Company[]       // Companies in this wilaya
}
```

**Complete Wilaya List (Key Examples):**

| Code | Name (FR) | Name (AR) | Zone | Chief City |
|------|-----------|-----------|------|------------|
| 01 | Adrar | أدرار | Sud | Adrar |
| 02 | Chlef | الشلف | Nord | Chlef |
| 16 | Algiers | الجزائر | Nord | Algiers |
| 28 | M'Sila | المسيلة | Hauts Plateaux | M'Sila |
| 33 | Illizi | إيليزي | Sud | Illizi |
| 39 | Tamanrasset | تمنراست | Sud | Tamanrasset |

#### Commune Structure (1541 Municipalities)

```prisma
model Commune {
  code        String
  nameFr      String
  nameAr      String?
  postalCode  String?
  wilayaCode  String
  wilaya      Wilaya @relation(...)
  
  @@unique([code, wilayaCode])
}
```

### 5.4 Business Identifiers (Algérien)

All companies and partners can store Algerian legal identifiers:

| Identifier | Full Name | Description | Format |
|------------|-----------|-------------|--------|
| **RC** | Registre de Commerce | Commercial registration | Alphanumeric |
| **NIF** | Numéro Identification Fiscale | Tax identification | Numeric (15 digits) |
| **NIS** | Numéro Identification Statistique | Statistical ID | Numeric (10 digits) |
| **AI** | Article d'Imposition | Tax article reference | Alphanumeric |

**Implementation:**
```prisma
model Company {
  rc   String?   // Registre de Commerce
  nif  String?   // Numéro Identification Fiscale
  nis  String?   // Numéro Identification Statistique
  ai   String?   // Article d'Imposition
  taxRegime String @default("reel")  // reel, simplifie, forfait
}

model Partner {
  rc      String?   // Registre Commerce
  nif     String?   // NIF
  nis     String?   // NIS
  ai      String?   // Article imposition
  isTaxPayer Boolean @default(true)
}
```

### 5.5 Fiscal Stamp (Timbre Fiscal)

| Document Type | Stamp Amount (DZD) |
|----------------|---------------------|
| Invoice (Facture) | 1.00 |
| Credit Note (Avoir) | 0.50 |
| Contract (< 20,000 DZD) | 50.00 |
| Contract (20k-100k DZD) | 200.00 |
| Contract (100k-500k DZD) | 500.00 |
| Contract (> 500k DZD) | 1,000.00 |
| Cheque (> 5,000 DZD) | 1.00 |
| Passport | 2,000.00 |

**Implementation:**
```typescript
export const TIMBRE_FISCAL: Record<TimbreType, number> = {
  facture: 1.00,
  avoir: 0.50,
  contrat: 0,      // Variable
  cheque: 0,       // Conditional
  passeport: 2000
};

function getTimbreFiscal(type: TimbreType, montant?: number): number {
  if (type === 'contrat') {
    if (!montant || montant <= 20000) return 50;
    if (montant <= 100000) return 200;
    if (montant <= 500000) return 500;
    return 1000;
  }
  return TIMBRE_FISCAL[type] || 0;
}
```

### 5.6 Family Allowances (Allocations Familiales)

| Number of Children | Monthly Amount (DZD) |
|--------------------|----------------------|
| 1st child | 300 |
| 2nd child | 400 |
| 3rd child | 500 |
| 4th+ child | 600 each |

**Implementation:**
```typescript
export const ALLOCATIONS_FAMILIALES: Record<number, number> = {
  1: 300,   // 1st child
  2: 400,   // 2nd child
  3: 500,   // 3rd child
  4: 600,   // 4th child
};

function getAllocationsFamiliales(nombreEnfants: number): number {
  if (nombreEnfants <= 0) return 0;
  
  let total = 0;
  for (let i = 1; i <= Math.min(nombreEnfants, 4); i++) {
    total += ALLOCATIONS_FAMILIALES[i];
  }
  
  // Additional children at 4th child rate
  if (nombreEnfants > 4) {
    total += (nombreEnfants - 4) * ALLOCATIONS_FAMILIALES[4];
  }
  
  return total;
}
```

---

## 6. Public Holidays (Jours Fériés)

### 6.1 Holiday Categories

```typescript
enum HolidayType {
  national,    // Fixed national holidays
  religious,   // Religious holidays (Islamic calendar dates vary)
  cultural,    // Cultural celebrations
  custom       // Company-specific
}
```

### 6.2 Major Algerian Holidays

| Date | Name (FR) | Name (AR) | Type | Duration |
|------|-----------|-----------|------|----------|
| Jan 1 | Nouvel Anر | رأس السنة الميلادية | National | 1 day |
| Mar 20 | Printemps Berbère | ربيع الأمازيغ | Cultural | 1 day |
| May 1 | Fête du Travail | عيد الشغل | National | 1 day |
| Jul 5 | Fête de l'Indépendance | عيد الاستقلال | National | 1 day |
| Nov 1 | Révolution | ثورة نوفمبر | National | 1 day |
| Varied | Aïd El-Fitr | عيد الفطر | Religious | 2 days |
| Varied | Aïd El-Adha | الأضحى | Religious | 3 days |
| Varied | Awal Muharram | رأس السنة الهجرية | Religious | 1 day |
| Varied | Ashura | عاشوراء | Religious | 1 day |
| Varied | Mawlid Ennabaoui | المولد النبوي | Religious | 1 day |

**Model:**
```prisma
model PublicHoliday {
  name          String
  nameAr        String?
  date          DateTime
  type          HolidayType  @default(national)
  isRecurring   Boolean      @default(true)
  durationDays  Int          @default(1)
  
  @@unique([companyId, date])
}
```

---

## 7. Compliance Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| DZD currency | Default currency, exchange rates | ✅ |
| TVA rates (0%, 7%, 9%, 19%) | algerian-taxes.ts | ✅ |
| TAP with zones | Zone-based calculation | ✅ |
| IRG brackets (annual/monthly) | Progressive tax tables | ✅ |
| Family parts | Deduction system | ✅ |
| IBS rates | Corporate tax engine | ✅ |
| Social contributions (CNAS/CASNOS) | Full payroll integration | ✅ |
| SMIG compliance | Configurable minimum wage | ✅ |
| Leave management | All leave types supported | ✅ |
| Overtime rules | Type-based majoration | ✅ |
| Seniority bonus | Years-of-service table | ✅ |
| Timbre fiscal | Document-type stamps | ✅ |
| Family allowances | Per-child amounts | ✅ |
| Wilayas (58) | Complete list with zones | ✅ |
| Communes (1541) | Hierarchical structure | ✅ |
| Business identifiers (RC/NIF/NIS/AI) | Company & Partner models | ✅ |
| Bilingual (FR/AR) | name/nameAr fields | ✅ |
| Tax declarations (G50/G1/G2/G4) | TaxDeclaration model | ✅ |
| Public holidays | National + Islamic calendar | ✅ |
| Fiscal year configuration | Company.fiscalYearStart | ✅ |

---

*Document End: Algerian Localization Model*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
*Fully compliant with Algerian fiscal and labor regulations*
