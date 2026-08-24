# SCF (Système Comptable Financier) Implementation

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable  
**Standard:** SCF - Journal Comptable Algérien  
**Reference:** Arrêté du 26 juillet 2008 (Plan Comptable National)

---

## 1. Account Structure (PCN Classes)

### 1.1 Class Overview

The HASSIBA Suite ERP implements the complete **Plan Comptable National (PCN)** as defined by Algerian accounting standards. The chart of accounts follows the SCF structure with 8 main classes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLAN COMPTABLE NATIONAL (PCN) - ALGÉRIE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ CLASSE 1 │  │ CLASSE 2 │  │ CLASSE 3 │  │ CLASSE 4 │  │ CLASSE 5 │          │
│  │         │  │         │  │         │  │         │  │         │          │
│  │ comptes │  │immobilis │  │  stocks │  │  tiers  │  │financier│          │
│  │ de      │  │ ations  │  │ et      │  │ (clients│  │   s     │          │
│  │ capitaux │  │         │  │encours  │  │fourniss.)│  │         │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │ CLASSE 6 │  │ CLASSE 7 │  │ CLASSE 8 │                                    │
│  │         │  │         │  │         │                                    │
│  │ charges │  │produits │  │ comptes │                                    │
│  │         │  │         │  │spéciaux │                                    │
│  └─────────┘  └─────────┘  └─────────┘                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Detailed Class Structure

#### Class 1 - Capital Accounts (Comptes de Capitaux)

| Account Range | Description | Example Accounts |
|---------------|-------------|-------------------|
| **10-13** | Capital & Reserves | 101 Capital social, 106 Réserves, 119 Résultat net |
| **16-17** | Emprunts & Dettes | 161 Emprunts à long terme, 168 Autres emprunts |
| **18-19** | Provisions & Comptes de liaison | 181 Provisions pour risques, 189 Bilan d'ouverture |

```typescript
// ChartOfAccount entries for Class 1
{
  code: "101000",
  name: "Capital Social",
  type: "equity",
  class: "1",
  nature: "header"
}
```

#### Class 2 - Fixed Assets (Immobilisations)

| Account Range | Description | Depreciation |
|---------------|-------------|--------------|
| **20** | Immobilisations incorporelles | Amortissable |
| **21** | Immobilisations corporelles | Amortissable |
| **22** | Immobilisations financières | Non amortissable |
| **28** | Amortissements des immobilizations | Contra-account |

**Asset Classes in Schema:**
```typescript
enum AssetClass {
  incorporelle,  // Class 20 - Frais développement, brevets, logiciels
  corporelle,    // Class 21 - Terrains, constructions, équipements
  financiere     // Class 22 - Titres de participation, créances
}
```

#### Class 3 - Stocks & Work in Progress

| Account Range | Description |
|---------------|-------------|
| **30** | Matières premières (Raw materials) |
| **31** | Autres approvisionnements (Supplies) |
| **32** | En-cours de production (WIP) |
| **33** | Produits en cours (Finished goods in progress) |
| **34** | Produits intermédiaires (Intermediate products) |
| **35** | Produits finis (Finished goods) |
| **36** | Produits résiduels (By-products) |
| **37** | Stocks de marchandises (Merchandise) |
| **39** | Provisions pour dépréciation des stocks |

#### Class 4 - Third Parties (Tiers)

| Account Range | Description | Sub-categories |
|---------------|-------------|----------------|
| **40** | Fournisseurs (Suppliers) | 401 Fournisseurs, 408 Fournisseurs-Factures non parvenues |
| **41** | Clients (Customers) | 411 Clients, 416 Clients douteux, 418 Clients-Produits à livrer |
| **42** | Personnel (Personnel) | 421 Personnel-Rémunérations dues, 428 Avances |
| **43** | Sécurité sociale & État | 431 Sécurité sociale, 442 État-Impôts |
| **45** | Groupe & associés | 451 Associés-Groupe, 458 Associés-Opérations en commun |
| **46** | Débiteurs/Créditeurs divers | 467 Débiteurs divers, 468 Créditeurs divers |
| **48** | Charges/Produits constatés d'avance | 486 Charges constatées d'avance, 487 Produits constatés d'avance |
| **49** | Provisions pour dépréciation | 491 Provisions pour dépréciation clients |

**Key Third Party Accounts:**
```typescript
// Customer accounts (411x)
const CLIENT_ACCOUNTS = {
  '411000': 'Clients - Compte général',
  '411100': 'Clients nationaux',
  '411200': 'Clients export',
  '416000': 'Clients douteux',
  '418000': 'Clients - Produits non encore livrés'
};

// Supplier accounts (401x)
const SUPPLIER_ACCOUNTS = {
  '401000': 'Fournisseurs - Compte général',
  '401100': 'Fournisseurs nationaux',
  '401200': 'Fournisseurs import',
  '408000': 'Fournisseurs - Factures non parvenues'
};
```

#### Class 5 - Financial Accounts

| Account Range | Description |
|---------------|-------------|
| **51** | Banques (Banks) | 512 Banques compte courant, 514 Chèques à encaisser |
| **53** | Caisse (Cash) | 530 Caisse, 531 Caisse en monnaie étrangère |
| **54** | Régies d'avance & accréditifs | 541 Régies d'avance |
| **56** | Banques & CCP (postal) | 560 CCP |
| **58** | Virements internes | 581 Virements de fonds |
| **59** | Provisions pour dépréciation | 591 Provisions comptes bancaires |

#### Class 6 - Charges (Expenses)

| Account Range | Description |
|---------------|-------------|
| **60-61** | Achats & Variations de stocks | 601 Achats stockés, 607 Achats non stockés |
| **62-63** | Services extérieurs & Autres services | 62 Locations, 63 Rémunérations de tiers |
| **64** | Impôts & taxes | 641 Taxe sur salaires, 645 TVA déductible |
| **65** | Autres charges opérationnelles | 651 Red Valeurs CET, 659 Charges diverses |
| **66** | Charges de personnel | 661 Rémunérations, 664 Charges sociales, 668 Autres charges |
| **68** | Dotations aux amort. & provisions | 681 DAP exploitation, 686 DAP financière |
| **69** | Impôts sur les résultats | 692 Impôt sur les sociétés (IBS), 693 IRG |

#### Class 7 - Products (Revenue)

| Account Range | Description |
|---------------|-------------|
| **70** | Ventes de produits | 701 Ventes produits finis, 707 Ventes marchandises |
| **71-72** | Production stockée/immobilisée | 71 Production stockée, 72 Production immobilisée |
| **73** | Variation de stocks | 73 Variation des stocks de produits |
| **74** | Subventions d'exploitation | 74 Subventions d'exploitation |
| **75** | Autres produits | 752 Revenus des locations, 758 Produits divers |
| **76** | Produits financiers | 761 Intérêts de prêts, 768 Autres produits financiers |
| **77-78** | Produits exceptionnels | 77 Produits exceptionnels, 78 Transfers charges |
| **79** | Transfers charges | 791 Transfert charges d'exploitation |

#### Class 8 - Special Accounts (Comptes Spéciaux)

| Account Range | Description |
|---------------|-------------|
| **80** | Engagements hors bilan | 81 Engagements de garantie |
| **86** | Réduction de valeur | 86 Réductions de valeur |
| **88** | Souscriptions de capital | 88 Souscripteurs de capital |

---

## 2. Journal Entry Model (Double-Entry Accounting)

### 2.1 Fundamental Principle

The system implements strict **double-entry bookkeeping** where every transaction must satisfy:

```
Σ DEBITS = Σ CREDITS
```

### 2.2 Data Model

```prisma
model JournalEntry {
  id            String   @id @default(cuid())
  reference     String   @unique  // e.g., AC-20250115-001
  date          DateTime
  label         String            // Description of entry
  totalDebit    Float    @default(0)
  totalCredit   Float    @default(0)
  status        String   @default("draft")  // draft, posted, cancelled
  source        String?                    // manual, invoice, bill, payment
  sourceId      String?
  companyId     String?
  journalId     String
  
  items         JournalItem[]
}

model JournalItem {
  id        String  @id @default(cuid())
  accountId String
  debit     Float  @default(0)
  credit    Float  @default(0)
  label     String?
  entryId   String
}
```

### 2.3 Entry Status Workflow

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  DRAFT   │───▶│  POSTED  │───▶│CANCELLED │
│ (Brouillon)│   │(Comptabi-│   │(Annulé)  │
│           │   │ lisé)    │   │          │
└──────────┘    └──────────┘    └──────────┘
     │                │              ▲
     │                │              │
     └────────────────┴──────────────┘
              Can only cancel posted entries
```

### 2.4 Auto-Posting Implementation

The system automatically generates journal entries from business documents via `auto-posting.ts`:

#### Invoice Posting (Customer Invoice → Journal)

```
INVOICE CREATION TRIGGERS:
═══════════════════════════

Journal: VT (Ventes)
Reference: AC-YYYYMMDD-XXX

┌─────────────────────────────────────────────────────────────┐
│                     JOURNAL ENTRY                           │
│  Date: [Invoice Date]                                      │
│  Libellé: "Facture [Ref] - [Client Name]"                  │
├──────────────────────┬──────────────┬──────────────────────┤
│ ACCOUNT              │ DEBIT        │ CREDIT               │
├──────────────────────┼──────────────┼──────────────────────┤
│ 411xxx (Clients)     │ Amount TTC   │                      │
│                      │              │                      │
│ 70xxx (Ventes)       │              │ Line Amount HT       │
│                      │              │                      │
│ 4457 (TVA collectée) │              │ Line TVA Amount      │
│                      │              │                      │
│ [Timbre fiscal]      │              │ Stamp Duty (1 DZD)   │
│                      │              │                      │
│ 659 (Arrondi)        │              │ Rounding diff (<1DZD)│
├──────────────────────┼──────────────┼──────────────────────┤
│ TOTAL                │ Σ DEBIT      │ Σ CREDIT (= Σ DEBIT) │
└──────────────────────┴──────────────┴──────────────────────┘
```

**Source Code Reference (`auto-posting.ts`):**
```typescript
// Debit: Client account (amount total TTC)
journalItems.push({
  accountId: clientAccount.id,
  label: `Facture ${invoice.reference} - ${invoice.partner?.name}`,
  debit: invoice.amountTotal,  // TTC amount
  credit: 0,
});

// Credit: Revenue accounts (70x)
for (const line of invoice.lines) {
  journalItems.push({
    accountId: revenueAccount.id,
    credit: line.amountUntaxed,  // HT amount
    debit: 0,
  });
  
  // Credit: TVA collectée (4457)
  if (line.amountTax > 0) {
    journalItems.push({
      accountId: tvaCollecteAccount.id,
      credit: line.amountTax,
      debit: 0,
    });
  }
}
```

#### Bill Posting (Supplier Bill → Journal)

```
Journal: AC (Achats)

┌──────────────────────┬──────────────┬──────────────────────┐
│ ACCOUNT              │ DEBIT        │ CREDIT               │
├──────────────────────┼──────────────┼──────────────────────┤
│ 60xxx (Achats)       │ Amount HT    │                      │
│                      │              │                      │
│ 4456x (TVA déductible)│ TVA Amount  │                      │
│                      │              │                      │
│ 401xxx (Fournisseurs)│              │ Amount TTC           │
├──────────────────────┼──────────────┼──────────────────────┤
│ TOTAL                │ Σ DEBIT      │ Σ CREDIT             │
└──────────────────────┴──────────────┴──────────────────────┘
```

#### Payment Posting (Payment → Journal)

**Customer Payment (Encaissement):**
```
Journal: BQ (Banque) or CA (Caisse)

┌──────────────────────┬──────────────┬──────────────────────┐
│ ACCOUNT              │ DEBIT        │ CREDIT               │
├──────────────────────┼──────────────┼──────────────────────┤
│ 512/530 (Banque/Caisse)│ Payment Amt│                      │
│                      │              │                      │
│ 411xxx (Clients)     │              │ Payment Amount       │
├──────────────────────┼──────────────┼──────────────────────┤
│ TOTAL                │ Σ DEBIT      │ Σ CREDIT             │
└──────────────────────┴──────────────┴──────────────────────┘
```

**Supplier Payment (Décaissement):**
```
┌──────────────────────┬──────────────┬──────────────────────┐
│ ACCOUNT              │ DEBIT        │ CREDIT               │
├──────────────────────┼──────────────┼──────────────────────┤
│ 401xxx (Fournisseurs)│ Payment Amt │                      │
│                      │              │                      │
│ 512/530 (Banque/Caisse)│            │ Payment Amount       │
├──────────────────────┼──────────────┼──────────────────────┤
│ TOTAL                │ Σ DEBIT      │ Σ CREDIT             │
└──────────────────────┴──────────────┴──────────────────────┘
```

---

## 3. Financial Statements

### 3.1 Balance Sheet (Bilan - État Financier)

The balance sheet shows the financial position at a given date:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BILAN (BALANCE SHEET)                             │
│                              AU [DATE]                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTIF (ASSETS)                                        PASSIF (LIABILITIES) │
│  ══════════════                                       ════════════════════  │
│                                                                             │
│  ACTIF IMMOBILISÉ                                    CAPITAUX PROPRES       │
│  ─────────────────                                    ─────────────────      │
│  Immobilisations incorporelles    20x                 Capital social   101  │
│  Immobilisations corporelles      21x                 Réserves         106  │
│  Immobilisations financières      22x                 Résultat net     11x  │
│                                                     Autres capitaux   1xx  │
│  ACTIF CIRCULANT                                                           │
│  ────────────────                                   DETTES                 │
│  Stocks                            3xx                 Dettes LT       16x  │
│  Créances (Clients)                4xx                 Dettes CT       40-48│
│  Disponibilités                    51-53                                       │
│                                                                             │
│  TOTAL ACTIF (A)                                  TOTAL PASSIF (P)          │
│                                                                             │
│  A = P (ÉQUILIBRE)                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Query for Balance Sheet:**
```sql
-- Assets (Classes 1-5 with debit balances, minus credit)
SELECT 
  class,
  SUM(CASE WHEN debit > credit THEN debit - credit ELSE 0 END) as actif,
  SUM(CASE WHEN credit > debit THEN credit - debit ELSE 0 END) as passif
FROM journal_items ji
JOIN journal_entries je ON ji.entryId = je.id
JOIN chart_of_accounts ca ON ji.accountId = ca.id
WHERE je.status = 'posted'
  AND je.date <= [END_DATE]
GROUP BY class;
```

### 3.2 Income Statement (Compte de Résultat)

Shows financial performance over a period:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPTE DE RÉSULTAT (INCOME STATEMENT)                   │
│                         DU [START] AU [END]                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CHARGES (EXPENSES)                                 PRODUITS (REVENUE)      │
│  ══════════════════                                 ══════════════════════  │
│                                                                             │
│  CHARGES D'EXPLOITATION                            PRODUITS D'EXPLOITATION  │
│  ──────────────────────                            ───────────────────────  │
│  Achats consommés                  60-61           Ventes de produits   70  │
│  Services extérieurs                62-63                                          │
│  Impôts & taxes                     64                                           │
│  Charges de personnel               66                                           │
│  Autres charges                     65                                           │
│  DAP                                68                                           │
│                                                     Autres produits      75-78│
│                                                                             │
│  CHARGES FINANCIÈRES                               PRODUITS FINANCIERS     │
│  ────────────────────                               ────────────────────     │
│  Intérêts                        661/671          Intérêts perçus      76  │
│                                                                             │
│  CHARGES EXCEPTIONNELLES                            PRODUITS EXCEPTIONNELS │
│  ─────────────────────────                             ──────────────────── │
│  Sur opérations de gestion        77               Sur opérations      77  │
│                                                                             │
│  Impôt sur bénéfices (IBS)        69                                       │
│                                                                             │
│  RÉSULTAT NET (BÉNÉFICE OU PERTE)                                            │
│  ══════════════════════════════════                                         │
│                                                                             │
│  Total Charges = Total Produits ± Résultat                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Formulas:**
```
Marge Brute = Ventes (70) - Coût des ventes (603 + 61)
Résultat d'Exploitation = Produits d'exploitation (70-75) - Charges d'exploitation (60-68)
Résultat Courant = Résultat d'exploitation + Résultat financier (76-77)
Résultat Net = Résultat courant + Résultat exceptionnel - IBS (69)
```

### 3.3 Cash Flow Statement (Tableau de Financement)

Tracks cash movements by category:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TABLEAU DES FLUX DE TRÉSORERIE                         │
│                          PÉRIODE : [PERIOD]                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FLUX D'EXPLOITATION (Operating Activities)                                 │
│  ─────────────────────────────────────────                                   │
│  Encaissements clients                                                      │
│  - Paiements reçus (411 → 512/530)                                         │
│  Décaissements fournisseurs                                                │
│  - Paiements effectués (401 ← 512/530)                                     │
│  Salaires nets versés (661)                                                 │
│  Impôts & taxes payés (64)                                                  │
│  ═══════════════════════════════════════                                    │
│  FLUX NET D'EXPLOITATION (A)                                               │
│                                                                             │
│  FLUX D'INVESTISSEMENT (Investing Activities)                               │
│  ─────────────────────────────────────────                                   │
│  Acquisition d'immobilisations (2x)                                         │
│  Cession d'immobilisations                                                  │
│  ═══════════════════════════════════════                                    │
│  FLUX NET D'INVESTISSEMENT (B)                                              │
│                                                                             │
│  FLUX DE FINANCEMENT (Financing Activities)                                 │
│  ─────────────────────────────────────────                                   │
│  Augmentation de capital (101)                                               │
│  Nouveaux emprunts (16)                                                      │
│  Remboursement d'emprunts                                                   │
│  Distribution de dividendes                                                 │
│  ═══════════════════════════════════════                                    │
│  FLUX NET DE FINANCEMENT (C)                                                 │
│                                                                             │
│  VARIATION DE TRÉSORERIE = A + B + C                                        │
│  Trésorerie ouverture + Variation = Trésorerie clôture                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cash Flow Entry Model:**
```prisma
model CashFlowEntry {
  reference     String           // TRS-YYYYMM-XXX
  date          DateTime
  type          CashFlowType     // inflow / outflow
  category      CashFlowCategory // operating, investing, financing
  label         String
  amount        Float
  bankAccountId String?
  reconciled    Boolean          @default(false)
}
```

---

## 4. Tax Accounts Mapping

### 4.1 VAT (TVA - Taxe sur la Valeur Ajoutée)

| Account Code | Account Name | Type | Usage |
|--------------|--------------|------|-------|
| **44571** | TVA collectée (19%) | Liability | Output VAT on sales at 19% |
| **44572** | TVA collectée (9%) | Liability | Output VAT on sales at 9% |
| **44573** | TVA collectée (7%) | Liability | Output VAT on sales at 7% |
| **44562** | TVA déductible sur biens | Asset | Input VAT on goods |
| **44563** | TVA déductible sur services | Asset | Input VAT on services |
| **44566** | TVA déductible sur importations | Asset | Input VAT on imports |
| **44580** | Crédit de TVA à reporter | Asset | VAT credit carryforward |
| **44551** | TVA à payer | Liability | Net VAT payable (G50) |

**VAT Calculation Flow:**
```
                    TVA COLLECTÉE (4457x)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    19% (44571)      9% (44572)      7% (44573)
        │                │                │
        └────────────────┼────────────────┘
                         ▼
              TOTAL TVA COLLECTÉE
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   TVA DÉDUCTIBLE    TVA DÉDUCTIBLE   TVA DÉDUCTIBLE
   SUR BIENS        SUR SERVICES     SUR IMPORTS
   (44562)          (44563)          (44566)
        │                │                │
        └────────────────┼────────────────┘
                         ▼
              TOTAL TVA DÉDUCTIBLE
                         │
                         ▼
              TVA NETTE = COLLECTÉE - DÉDUCTIBLE
                         │
              Si > 0 → 44551 (À payer)
              Si < 0 → 44580 (Crédit)
```

### 4.2 TAP (Taxe sur l'Activité Professionnelle)

| Account Code | Account Name | Usage |
|--------------|--------------|-------|
| **642** | TAP / Taxe professionnelle | Expense account |
| **44512** | TAP à payer | Liability (G2 declaration) |

### 4.3 IRG (Impôt sur le Revenu Global)

| Account Code | Account Name | Usage |
|--------------|--------------|-------|
| **6421** | IRG salaires | Salary withholding (employer pays) |
| **44525** | IRG retenu à la source | Liability to state (G1) |
| **447** | Autres impôts, taxes et versements assimilés | General tax payable |
| **691** | Impôt sur les bénéfices (IBS) | Corporate income tax expense |
| **44519** | IBS à payer | IBS liability (G4) |

### 4.4 Social Contributions (Cotisations Sociales)

| Account Code | Account Name | Rate | Payed By |
|--------------|--------------|-------|----------|
| **6431** | Cotisation CNAS (salarial) | 1.5% | Employee |
| **6432** | Cotisation CNAS (patronal) | 8.5% | Employer |
| **6433** | Cotisation CASNOS (salarial) | 7.5% | Employee |
| **6434** | Cotisation CASNOS (patronal) | 12.5% | Employer |
| **6435** | Cotisation chômage (patronal) | 1% | Employer |
| **6436** | Accident de travail (AT) | 0.75-5% | Employer |
| **6437** | Œuvres sociales | 3% | Employer |

**Social Contribution Accounts Summary:**
```
CHARGES DE PERSONNEL (Class 66)
├── 661 Rémunérations du personnel (Salaires bruts)
├── 642 Impôts sur revenus (IRG retenu)
├── 643 Charges sociales
│   ├── 6431 CNAS salarié (1.5%)
│   ├── 6432 CNAS employeur (8.5%)
│   ├── 6433 CASNOS salarié (7.5%)
│   ├── 6434 CASNOS employeur (12.5%)
│   ├── 6435 Assurance chômage (1%)
│   ├── 6436 Accident travail (variable)
│   └── 6437 Œuvres sociales (3%)
└── 668 Autres charges sociales (mutuelle, etc.)
```

---

## 5. Accounting Period Management

### 5.1 Fiscal Year Configuration

```prisma
model Company {
  fiscalYearStart Int @default(1)  // Month start (1=January for calendar year)
}
```

### 5.2 Period Closing Process

```
OPEN PERIOD → ACTIVE OPERATIONS → PERIOD CLOSE → LOCKED
     │              │                  │
     ▼              ▼                  ▼
  Journal       All entries        No modifications
  entries       posted or          allowed without
  created       cancelled          reversal entry
```

### 5.3 Trial Balance (Balance Générale)

Generated from posted journal entries:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BALANCE GÉNÉRALE (TRIAL BALANCE)             │
│                         AU [DATE]                               │
├──────────┬─────────────┬─────────────┬─────────────────────────┤
│ COMPTE   │ INTITULÉ    │ SOLDE DÉBIT │ SOLDE CRÉDIT           │
├──────────┼─────────────┼─────────────┼─────────────────────────┤
│ 101000   │ Capital     │             │ 1,000,000.00            │
│ 211000   │ Terrains    │ 500,000.00  │                        │
│ 213000   │ Constructions│ 800,000.00 │                        │
│ 215000   │ Equipements │ 350,000.00  │                        │
│ 281300   │ Amort. Const.│             │ 200,000.00             │
│ 281500   │ Amort. Equip.│             │ 150,000.00             │
│ ...      │ ...         │ ...         │ ...                    │
├──────────┼─────────────┼─────────────┼─────────────────────────┤
│ TOTAUX   │             │ X,XXX,XXX.XX│ X,XXX,XXX.XX           │
└──────────┴─────────────┴─────────────┴─────────────────────────┘
                    SOLDE DÉBIT = SOLDE CRÉDIT ✓
```

---

## 6. Reconciliation Features

### 6.1 Account Reconciliation

```prisma
model ChartOfAccount {
  reconcileable Boolean @default(false)  // Enable reconciliation for this account
}
```

**Reconciliable Accounts:**
- Bank accounts (512x)
- Cash accounts (530x)
- Customer accounts (411x)
- Supplier accounts (401x)
- VAT accounts (445x)

### 6.2 Bank Reconciliation

```
┌─────────────────────────────────────────────────────────────────┐
│                  RAPPROCHEMENT BANCAIRE                         │
│  Compte: 512 - CPA Compte Courant                              │
│  Période: Janvier 2025                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SOLDE INITIAL COMPTABLE                    1,250,000.00       │
│                                                                 │
│  + Encaissements rapprochés                   150,000.00       │
│  - Décaissements rapprochés                  (85,000.00)       │
│                                                                 │
│  SOLDE THÉORIQUE                          1,315,000.00       │
│                                                                 │
│  SOLDE BANQUE RELEVÉ                       1,310,000.00       │
│                                                                 │
│  ÉCART DE RAPPROCHEMENT                       5,000.00         │
│  (En cours de rapprochement)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Audit Trail Compliance

All accounting operations are logged:

```prisma
model AuditLog {
  action      AuditAction  // create, update, delete, approve
  module      AuditModule  // accounting, invoices, payments
  entityName  String?      // "JournalEntry", "Invoice"
  entityId    String?      // ID of affected record
  oldValues   String?      // JSON before changes
  newValues   String?      // JSON after changes
  userId      String?      // Who made the change
  createdAt   DateTime     // When
  ipAddress   String?      // From where
}
```

---

## 8. SCF Compliance Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| PCN account structure | ChartOfAccount model with classes 1-8 | ✅ |
| Double-entry booking | JournalEntry with balanced debits/credits | ✅ |
| Journal types (VT, AC, BQ, CA, OD, PA) | Journal model with types | ✅ |
| Auto-posting from invoices/bills/payments | auto-posting.ts | ✅ |
| VAT tracking (collectible/deductible) | TaxDeclaration model | ✅ |
| Fixed asset depreciation | FixedAsset + AssetDepreciation models | ✅ |
| Multi-currency support | CurrencyRate model | ✅ |
| Fiscal year management | Company.fiscalYearStart | ✅ |
| Trial balance generation | Aggregation queries | ✅ |
| Financial statements | Report module (balance sheet, income statement) | ✅ |
| Audit trail | AuditLog model | ✅ |
| Document retention | Document model with versioning | ✅ |
| Algerian tax declarations (G50, G1, G2, G4) | TaxDeclaration model | ✅ |

---

*Document End: SCF Accounting Model*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
*Compliant with Arrêté du 26 juillet 2008 - Plan Comptable National Algérien*
