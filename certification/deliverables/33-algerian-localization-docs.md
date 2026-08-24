# HASSIBA Suite ERP - Algerian Localization Documentation

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D33)  
**Date:** January 2025  
**Jurisdiction:** People's Democratic Republic of Algeria  
**Regulatory Framework:** Code des Impôts Directs et Taxes Assimilées (CIDTA)

---

## 1. Executive Summary

HASSIBA Suite ERP provides **comprehensive Algerian localization** covering all aspects of business operations in Algeria:

- 🇩🇿 **National Tax Regulations** - TVA, TAP, IRG, IBS with current rates
- 🏛️ **Administrative Geography** - 58 Wilayas, 1541+ Communes
- 💰 **DZD Currency** - Algerian Dinar with proper formatting
- 🌐 **Bilingual Interface** - French/Arabic support
- 👥 **Labor Law Compliance** - SMIG, leave, social security
- 📋 **Legal Reporting** - G50, G1, G2, G4 tax declarations

---

## 2. Tax System Implementation

### 2.1 TVA (Taxe sur la Valeur Ajoutée)

#### Rate Structure

| Rate | Code | Decimal | Applicable To |
|------|------|---------|---------------|
| **Normal** | 19 | 0.19 | Most goods and services |
| **Réduit** | 9 | 0.09 | Basic food products, some medicines |
| **Particulier** | 7 | 0.07 | Essential goods and services |
| **Exonéré** | 0 | 0.00 | Exports, agricultural products |

**Source File:** `src/lib/algerian-taxes.ts`

```typescript
export const TVA_RATES: TVARates = {
  normal: 0.19,
  reduit: 0.09,
  particulier: 0.07,
  exonere: 0.00
};
```

#### TVA Declaration Support (G50)

The system tracks TVA by rate for G50 declaration:
- TVA collectée at 19%
- TVA collectée at 9%
- TVA collectée at 7%
- Exempt operations
- TVA déductible

### 2.2 TAP (Taxe sur l'Activité Professionnelle)

#### Sector Rates

| Sector | French Name | Rate |
|--------|-------------|------|
| Wholesale Trade | Commerce de gros | 1% |
| Retail Trade | Commerce de détail | 2% |
| Industry | Industrie | 2% |
| Services | Services | 2% |
| Liberal Professions | Professions libérales | 3% |

#### Geographic Abatement Zones

| Zone | Wilayas | Abattement | Description |
|------|---------|------------|-------------|
| **Nord** | 01-02, 06, 09-10, 13, 15-16, 18, 21, 23-24, 26-27, 31, 35-36, 38, 42, 44, 46, 48 | 0% | Coastal and northern regions |
| **Hauts Plateaux** | 03-05, 07, 12, 14, 17, 19-20, 22, 25, 28-29, 32, 34, 40-41, 43, 45, 51 | 20% | Central high plains |
| **Sud** | 01, 08, 11, 30, 33, 37, 39, 47, 49-50, 52-58 | 60% | Southern territories |

**Example Calculation:**
```
Company in Biskra (Zone: Hauts Plateaux)
Sector: Industry (Rate: 2%)
Turnover: 1,000,000 DZD

TAP Brut = 1,000,000 × 2% = 20,000 DZD
Abattement = 20,000 × 20% = 4,000 DZD
TAP Net = 20,000 - 4,000 = 16,000 DZD
Taux Effectif = 1.6%
```

### 2.3 IRG (Impôt sur le Revenu Global)

#### Annual Tax Brackets (2025)

| Tranche | Annual Income (DZD) | Rate | Deduction |
|---------|---------------------|------|-----------|
| 1 | 0 - 120,000 | 0% | 0 |
| 2 | 120,001 - 360,000 | 20% | 24,000 |
| 3 | 360,001 - 1,440,000 | 30% | 312,000 |
| 4 | 1,440,001+ | 35% | 384,000 |

#### Family Parts (Parts Familiales)

| Part | Description | Annual Deduction (DZD) |
|------|-------------|----------------------|
| Part 1 | Taxpayer | 10,000 |
| Part 2 | Spouse | 15,000 |
| Parts 3-4 | Children | 8,500 each |
| Parts 5+ | Additional children | 9,500 each |
| - | Dependent parent | 13,500 |

### 2.4 IBS (Impôt sur Bénéfice des Sociétés)

| Category | Rate | Applicable To |
|----------|------|---------------|
| Standard | 19% | Most companies |
| Insurance | 26% | Insurance companies |
| Encouraged Activities | 5% | South zone activities, specific sectors |

### 2.5 Social Security Contributions (Cotisations Sociales)

#### Employee Contributions (Retenues salariales)

| Fund | Name | Rate |
|------|------|------|
| CNAS | Social Security | 1.5% |
| CASNOS | Retirement | 7.5% |
| **Total Salarial** | | **9%** |

#### Employer Charges (Charges patronales)

| Fund | Name | Rate |
|------|------|------|
| CNAS | Social Security | 8.5% |
| CASNOS | Retirement | 12.5% |
| Chômage | Unemployment | 1.0% |
| AT | Work Accident | 0.75%-5%* |
| Œuvres Sociales | Social Works | 3.0% |
| **Total Patronal** | | **~26%** |

*AT rate varies by sector risk classification

---

## 3. Administrative Geography

### 3.1 Wilayas (Provinces)

Algeria is divided into **58 Wilayas**, each identified by a numeric code.

**API Endpoint:** `GET /api/wilayas`

**Data Structure:**
```typescript
interface Wilaya {
  code: string;          // "01" to "58"
  nameFr: string;        // French name
  nameAr: string;        // Arabic name
  chiefCity: string;     // Chief city
  taxZone: 'nord' | 'hauts_plateaux' | 'sud';
  abattementRate: number; // 0, 0.20, or 0.60
  surfaceKm2?: number;
  population?: number;
}
```

### 3.2 Complete Wilaya Reference

| Code | French | Arabic | Zone | Abattement |
|------|--------|--------|------|------------|
| 01 | Adrar | أدرار | sud | 60% |
| 02 | Chlef | الشلف | nord | 0% |
| 03 | Laghouat | الأغواط | hauts_plateaux | 20% |
| 04 | Oum El Bouaghi | أم البواقي | hauts_plateaux | 20% |
| 05 | Batna | باتنة | hauts_plateaux | 20% |
| 06 | Béjaïa | بجاية | nord | 0% |
| 07 | Biskra | بسكرة | hauts_plateaux | 20% |
| 08 | Béchar | بشار | sud | 60% |
| 09 | Blida | البليدة | nord | 0% |
| 10 | Bouira | البويرة | nord | 0% |
| 11 | Tamanrasset | تمنراست | sud | 60% |
| 12 | Tébessa | تبسة | hauts_plateaux | 20% |
| 13 | Tlemcen | تلمسان | nord | 0% |
| 14 | Tiaret | تيارت | hauts_plateaux | 20% |
| 15 | Tizi Ouzou | تيزي وزو | nord | 0% |
| 16 | Alger | الجزائر | nord | 0% |
| 17 | Djelfa | الجلفة | hauts_plateaux | 20% |
| 18 | Jijel | جيجل | nord | 0% |
| 19 | Sétif | سطيف | hauts_plateaux | 20% |
| 20 | Saïda | سعيدة | hauts_plateaux | 20% |
| 21 | Skikda | سكيكدة | nord | 0% |
| 22 | Sidi Bel Abbès | سيدي بلعباس | hauts_plateaux | 20% |
| 23 | Annaba | عنابة | nord | 0% |
| 24 | Guelma | قالمة | nord | 0% |
| 25 | Constantine | قسنطينة | hauts_plateaux | 20% |
| 26 | Médéa | المديعة | nord | 0% |
| 27 | Mostaganem | مستغانم | nord | 0% |
| 28 | M'Sila | المسيلة | hauts_plateaux | 20% |
| 29 | Mascara | معسكر | hauts_plateaux | 20% |
| 30 | Ouargla | ورقلة | sud | 60% |
| 31 | Oran | وهران | nord | 0% |
| 32 | El Bayadh | البيض | hauts_plateaux | 20% |
| 33 | Illizi | إيليزي | sud | 60% |
| 34 | Bordj Bou Arréridj | برج بوعريريج | hauts_plateaux | 20% |
| 35 | Boumerdès | بومرداس | nord | 0% |
| 36 | El Tarf | الطارف | nord | 0% |
| 37 | Tindouf | تندوف | sud | 60% |
| 38 | Tissemsilt | تيسمسيلت | nord | 0% |
| 39 | El Oued | الوادي | sud | 60% |
| 40 | Khenchela | خنشلة | hauts_plateaux | 20% |
| 41 | Souk Ahras | سوق أهراس | hauts_plateaux | 20% |
| 42 | Tipaza | تيبازة | nord | 0% |
| 43 | Mila | ميلة | hauts_plateaux | 20% |
| 44 | Aïn Defla | عين الدفلى | nord | 0% |
| 45 | Naâma | النعامة | hauts_plateaux | 20% |
| 46 | Aïn Témouchent | عين تموشنت | nord | 0% |
| 47 | Ghardaïa | غرداية | sud | 60% |
| 48 | Relizane | غليزان | nord | 0% |
| 49 | El M'Ghair | المغير | sud | 60% |
| 50 | El Menia | المنيعة | sud | 60% |
| 51 | Ouled Djellal | أولاد جلال | hauts_plateaux | 20% |
| 52 | Bordj Badji Mokhtar | برج باجي مختار | sud | 60% |
| 53 | Béni Abbès | بنى عباس | sud | 60% |
| 54 | Timimoun | تيميمون | sud | 60% |
| 55 | Touggourt | تقرت | sud | 60% |
| 56 | Djanet | جانت | sud | 60% |
| 57 | In Salah | إن سلام | sud | 60% |
| 58 | In Guezzam | ان قزام | sud | 60% |

---

## 4. Currency & Number Formatting

### 4.1 DZD (Algerian Dinar)

**Currency Code:** DZD  
**ISO 4217 Number:** 012  
**Subunit:** Centime (1/100) - rarely used  
**Decimal Separator:** Comma (,)  
**Thousands Separator:** Space or period

### 4.2 Formatting Implementation

```typescript
// Currency formatting (French locale)
const formatDZD = (value: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Examples:
formatDZD(1500000)  // => "1 500 000 DA"
formatDZD(2500.50)  // => "2 501 DA" (rounded)
```

### 4.3 Number Formatting

| Type | Format | Example |
|------|--------|---------|
| Currency | 1 234 567,89 DA | Amounts |
| Percentage | 19,5 % | Rates |
| Quantity | 1 234 | Units |
| Decimal | 0,1875 | Ratios |

---

## 5. Labor Law Compliance

### 5.1 SMIG (Salaire Minimum Garanti)

| Year | Monthly SMIG (DZD) | Hourly SMIG (DZD) |
|------|-------------------|-------------------|
| 2025 | 20,000 | ~115.37 |
| 2024 | 20,000 | ~115.37 |
| 2023 | 18,000 | ~103.83 |
| 2022 | 18,000 | ~103.83 |
| 2021 | 18,000 | ~103.83 |
| 2020 | 18,000 | ~103.83 |

**Source:** `src/app/api/payroll/route.ts` (SMIG_CONFIG)

### 5.2 Working Hours

| Type | Hours | Notes |
|------|-------|-------|
| Standard work week | 40 hours | Default configuration |
| Overtime (weekday) | +50% majoration | Standard rate |
| Overtime (night) | +100% majoration | After 21:00 |
| Overtime (Sunday) | +100% majoration | Weekly rest day |
| Overtime (holiday) | +100% majoration | Public holidays |

### 5.3 Leave Entitlements

| Leave Type | Default Days | Notes |
|------------|--------------|-------|
| Annual leave | 30 days | Per labor law |
| Sick leave | 15 days | Paid by social security |
| Maternity leave | 14 weeks | As per regulations |
| Paternity leave | 3 days | Optional employer benefit |

### 5.4 Seniority Bonus (Prime d'Ancienneté)

| Years of Service | Bonus Rate |
|------------------|------------|
| 0-4 years | 0% |
| 5-11 years | 5% |
| 12-17 years | 10% |
| 18-22 years | 15% |
| 23-27 years | 20% |
| 28+ years | 25% |

---

## 6. Tax-Exempt Benefits (Article 67 CIDTA)

The following benefits are **exempt from IRG** calculation:

| Benefit | French Name | Arabic Name | Notes |
|---------|-------------|-------------|-------|
| Family allowances | Allocations familiales | المنح العائلية | Per child |
| Transport allowance | Indemnité de transport | تعويض النقل | Within limits |
| Meal allowance | Indemnité de repas | تعويض الوجبات | Within limits |
| Travel allowance | Indemnité de déplacement | تعويض التنقل | Business travel |
| Night work | Indemnité de nuit | تعويض العمل الليلي | Within limits |
| Hardship zone | Prime de zone difficile | علاوة المناطق الصعبة | South Algeria |
| PSU | Prime salariale unique | العلاوة الأجرية الواحدة | Since 2022 |
| Marriage grant | Prime de mariage | علاوة الزواج | One-time |
| Birth grant | Prime de naissance | علاوة الميلاد | One-time |
| Unemployment | Indemnité de chômage | تعويض البطالة | State benefit |
| Sickness | Indemnité de maladie | تعويض المرض | Social security |

---

## 7. Fiscal Calendar

### 7.1 Tax Declaration Deadlines

| Declaration | Type | Frequency | Deadline |
|-------------|------|-----------|----------|
| G50 | TVA | Monthly | Before 15th of following month |
| G1 | Salary tax | Monthly | Before 15th of following month |
| G2 | Activity tax | Quarterly | 30 days after quarter end |
| G4 | IBS | Annual | April 30th |
| Balance Sheet | Accounting | Annual | 4 months after year-end |

### 7.2 Implementation

**Fiscal Calendar Component:** `src/components/dashboard/fiscal-calendar.tsx`

---

## 8. Bilingual Support

### 8.1 Language Configuration

| Aspect | French | Arabic |
|--------|--------|--------|
| UI Labels | ✅ Primary | ✅ Supported |
| Data Names | ✅ Stored | ✅ Stored |
| Reports | ✅ Generated | Planned |
| Error Messages | ✅ | Partial |
| AI Assistant | ✅ | ✅ (responds in both) |

### 8.2 Data Model Bilingual Fields

```typescript
interface BilingualEntity {
  nameFr: string;   // French name (required)
  nameAr?: string;  // Arabic name (optional)
}

// Applied to:
// - Wilayas
// - Products
// - Document categories
// - Prime types
// - And more...
```

### 8.3 Locale Configuration

```typescript
// French-Algerian locale
const frDZ = {
  locale: 'fr-DZ',
  currency: 'DZD',
  dateFormat: 'DD/MM/YYYY',
  firstDayOfWeek: 1 (Monday),
};
```

---

## 9. Regulatory References

### 9.1 Legal Framework

| Regulation | Description | Application |
|------------|-------------|-------------|
| CIDTA | Code des Impôts Directs et Taxes Assimilées | All taxes |
| Code du Travail | Labor Law | HR/Payroll |
| Loi de Finances | Finance Law (Annual) | Tax rates, SMIG |
| Ordinance 03-11 | Accounting regulations | SCF compliance |
| Loi 83-11 | Social Security | Cotisations |

### 9.2 SCF Compliance (Système Comptable Financier)

HASSIBA Suite implements SCF-compliant accounting:
- Chart of accounts per PCN (Plan Comptable National)
- Double-entry bookkeeping
- Accrual-based accounting
- Proper journal entry structure

---

## 10. Localization API Endpoints

### 10.1 Wilayas API

```http
GET /api/wilayas
# Returns all 58 wilayas with tax zone info

GET /api/wilayas?action=seed
# Seed/refresh wilaya data

GET /api/wilayas?action=refresh
# Force refresh from source data
```

### 10.2 Taxes API

```http
GET /api/taxes
# Get tax configuration and rates
```

---

## 11. Testing Localization

### 11.1 Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Calculate TVA at 19% | Correct amount, proper rounding |
| Apply TAP abatement for South | 60% reduction applied |
| Calculate IRG with 4 parts | Correct deduction applied |
| Format 1M DZD | "1 000 000 DA" |
| Display wilaya name | Show French (and Arabic if available) |
| Check SMIG compliance | Warn if below 20,000 DZD |

### 11.2 Sample Test Cases

```typescript
describe('Algerian Localization', () => {
  it('should apply South zone TAP abatement', () => {
    const result = calculateTAP(1000000, 'industrie', 'sud');
    expect(result.abattementZone).toBe(0.60);
    expect(result.tapNet).toBe(8000); // 20000 * 0.4
  });
  
  it('should format DZD correctly', () => {
    const formatted = formatDZD(1234567);
    expect(formatted).toContain('1 234 567');
  });
});
```

---

## 12. Future Localization Enhancements

### 12.2 Planned Features

- [ ] Full Arabic interface (RTL)
- [ ] Commune-level geography (1541 communes)
- [ ] Automatic tax declaration generation (G50, G1, etc.)
- [ ] Integration with ANSEJ/DGI portals
- [ ] Electronic invoicing (facturation électronique)
- [ ] CNAS/CASNOS online declaration
- [ ] Multi-company consolidation
- [ ] Regional reporting by Wilaya

---

## 13. Compliance Checklist

For full Algerian compliance, verify:

- [ ] TVA rates match current law (19%, 9%, 7%, 0%)
- [ ] TAP zones correctly assigned
- [ ] IRG brackets up to date
- [ ] SMIG value reflects current year
- [ ] Social security rates correct
- [ ] Tax-exempt benefits properly handled
- [ ] Currency formatting uses fr-DZ locale
- [ ] Dates in DD/MM/YYYY format
- [ ] Working hours comply with labor law
- [ ] Leave entitlements meet minimums

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
*Regulatory references valid for fiscal year 2025*
