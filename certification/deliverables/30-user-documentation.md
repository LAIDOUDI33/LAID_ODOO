# HASSIBA Suite ERP - User Guide

**Version 2.0.0**  
**Guide d'Utilisateur - Système de Gestion Intégré Algérien**

---

## Welcome to HASSIBA Suite ERP

HASSIBA Suite ERP is a comprehensive Enterprise Resource Planning system designed specifically for Algerian businesses. It provides integrated management of sales, purchases, human resources, accounting, inventory, and production operations, all compliant with Algerian fiscal regulations (SCF, TVA, IRG, TAP).

### Key Features

- 📊 **Tableau de Bord** - Real-time business overview
- 🛒 **Ventes (Sales)** - Quotations, orders, invoicing
- 📦 **Achats (Purchases)** - Purchase orders, supplier management
- 👥 **Ressources Humaines (HR)** - Employee management, payroll
- 💰 **Comptabilité (Accounting)** - Financial reports, tax declarations
- 📈 **Inventory (Stock)** - Stock management, movements
- 🏭 **Production (Manufacturing)** - Production planning
- ⚙️ **Workflows** - Automated approval processes

---

## Getting Started (Premiers Pas)

### Login and First Connection (Connexion)

1. **Open your web browser** and navigate to the HASSIBA Suite ERP URL
   - *Example: `https://erp.votreentreprise.com` or `http://localhost:3000` (development)*

2. **Enter your credentials:**
   - **Email:** Your company email address
   - **Password:** Your secure password

3. **Click "Se Connecter" (Login)**

4. **First-time users** may be prompted to:
   - Change temporary password
   - Set up profile information
   - Configure notification preferences

> 🔐 **Security Note:** After 5 failed login attempts, your account will be locked for 15 minutes. Contact your administrator if locked out.

### Dashboard Overview (Tableau de Bord)

After login, you'll see the main dashboard:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  HASSIBA Suite ERP    🔍 Rechercher...  🔔  👤 Admin  🌐 FR │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Ventes  │ │ Achats  │ │  HR     │ │Finance  │              │
│  │ 2.5M DZD│ │ 1.8M DZD│ │ 45 emp. │ │ 850K DZD│              │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘              │
│                                                                     │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐ │
│  │    Graphique des Ventes      │ │   Dernières Activités        │ │
│  │    (Courbe/Barres)           │ │   • Facture #INV-001 créée   │ │
│  │                              │ │   • Bon de commande approuvé │ │
│  │                              │ │   • Congé validé             │ │
│  └──────────────────────────────┘ └──────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Navigation Guide

#### Main Menu (Sidebar)

| Icon | Module | Description |
|------|--------|-------------|
| 🏠 | **Tableau de Bord** | Main dashboard with KPIs and charts |
| 🛒 | **Ventes** | Sales: quotations, orders, invoices |
| 📦 | **Achats** | Purchases: POs, suppliers, bills |
| 👥 | **RH / Personnel** | Human Resources: employees, leaves, payroll |
| 💰 | **Finance / Comptabilité** | Accounting: journals, reports, taxes |
| 📈 | **Stock / Inventaire** | Inventory: products, movements |
| 🏭 | **Production** | Manufacturing: orders, quality |
| ⚙️ | **Workflows** | Approval workflows and automation |
| 📅 | **Calendrier** | Events, deadlines, reminders |
| 📄 | **Documents** | Document management |
| 📊 | **BI / Analytics** | Business intelligence reports |
| ⚙️ | **Paramètres** | Settings and preferences |

#### Top Bar Features

| Feature | Location | Description |
|---------|----------|-------------|
| 🔍 **Global Search** | Top center | Search customers, products, invoices... |
| 🔔 **Notifications** | Top right | Alerts, approvals, deadlines |
| 👤 **User Menu** | Top right | Profile, settings, logout |
| 🌐 **Language** | Top right | Français / العربية / English |

---

## Modules Guide (Guide des Modules)

### 🛒 Sales (Ventes)

The Sales module manages your customer relationships from quotation to payment.

#### Creating a Devis (Quotation)

1. Navigate to **Ventes** → **Nouveau Devis**
2. Select or create a **Client (Customer)**
3. Add **Lignes (Lines):**
   - Click "Ajouter une ligne"
   - Select Product or enter custom description
   - Enter Quantity and Unit Price
   - TVA is calculated automatically based on product settings
4. Set **Conditions:**
   - Date de validité (Valid until)
   - Conditions de paiement (Payment terms)
   - Notes (internal and customer)
5. Click **Enregistrer (Save)** as draft
6. Review and click **Envoyer (Send)** to customer

#### Converting to Commande (Sales Order)

From a quotation:
1. Open the quotation
2. Click **Convertir en Commande**
3. Confirm conversion
4. The sales order is created with all quotation data

#### Delivery and Invoicing

1. From Sales Order, click **Livrer (Deliver)**
2. Enter delivery details (BL number, date)
3. After delivery, click **Facturer (Invoice)**
4. Review invoice and send to customer

#### Payment Recording

1. Go to the invoice
2. Click **Enregistrer Paiement**
3. Enter:
   - Montant (Amount)
   - Mode de paiement (Payment method: Virement, Chèque, Espèce, Traite)
   - Référence (Reference number)
   - Date
4. Save - invoice status updates automatically

#### Invoice Status Flow

```
Brouillon (Draft) → Envoyée (Sent) → Partielle (Partial) → Payée (Paid)
                    ↓                ↓
               Annulée (Cancelled)  En Retard (Overdue)
```

---

### 📦 Purchases (Achats)

Manage procurement from purchase order to supplier payment.

#### Creating a Bon de Commande (Purchase Order)

1. Navigate to **Achats** → **Nouveau BC**
2. Select **Fournisseur (Supplier)**
3. Add product lines with:
   - Product or description
   - Quantité demandée (Requested quantity)
   - Prix unitaire (Unit price)
4. Set delivery address and expected date
5. Save as **Brouillon (Draft)**

#### Approval Workflow

Purchase orders may require approval based on amount/company policy:

1. Submit for approval: **Soumettre à l'approbation**
2. Approvers receive notification
3. Approver reviews and clicks **Approuver** or **Rejeter**
4. Once approved, status changes to **Approuvé**

#### Goods Receipt (Réception)

1. From approved PO, click **Réceptionner**
2. Enter:
   - Quantité reçue (Received quantity)
   - Numéro BL (Delivery note number)
   - Date de réception
3. System updates stock levels automatically

#### Supplier Invoices (Factures Fournisseurs)

1. Navigate to **Achats** → **Factures**
2. Click **Nouvelle Facture**
3. Link to existing Purchase Order (optional)
4. Enter invoice details from supplier
5. Verify amounts match PO
6. Submit for accounting verification

---

### 👥 HR & Payroll (Ressources Humaines)

Complete employee lifecycle management.

#### Employee Management

**Viewing Employees:**
- Go to **RH** → **Employés**
- Filter by department, status, or search
- Click employee name for full profile

**Adding a New Employee:**
1. **RH** → **Nouvel Employé**
2. **Personal Information:**
   - Nom, Prénom (Last name, First name)
   - Date de naissance, Lieu de naissance
   - CIN (National ID - 18 digits)
   - Contact information
3. **Professional Information:**
   - Département, Poste (Department, Position)
   - Type de contrat: CDI, CDD, Stage, Temporaire
   - Date de début, Date de fin (if applicable)
   - Salaire de base (Base salary)
4. **Bank Information:**
   - Banque, Numéro de compte
5. Save employee record

#### Leave Requests (Congés)

**Requesting Leave:**
1. **RH** → **Congés** → **Nouvelle Demande**
2. Select type: Congé annuel, Maladie, Exceptionnel
3. Select date range
3. Add comments if needed
4. Submit

**Approval Process:**
- Submitted requests go to manager/HR for approval
- Check status in your leave list
- Approved leaves appear in calendar

#### Payroll Processing (Paie)

*Note: This feature requires appropriate permissions*

1. **RH** → **Paie** → **Nouvelle Période**
2. Select pay period (mois/année)
3. System calculates:
   - Salaire brut (Gross salary)
   - **Cotisations sociales:**
     - CASNOS employeur (26%)
     - CASNOS employé (9%)
   - **IRG (Impôt sur le Revenu Global)** - Auto-calculated per brackets
   - Salaire net (Net salary)
4. Review employee payslips
5. Click **Valider la Paie** to confirm
6. Generate **Bulletins de paie** (Payslips) for distribution

#### Accessing Your Payslip

1. **RH** → **Mes Bulletins**
2. Select period
3. Download or print PDF

---

### 💰 Accounting (Comptabilité)

Algerian SCF-compliant financial management.

#### Journal Entries (Écritures Comptables)

1. **Finance** → **Journal**
2. View all entries with filters:
   - Date range
   - Journal type (Achat, Vente, Banque, OD)
   - Compte (Account)
3. Create new entry (**Nouvelle Écriture**):
   - Date, Libellé (Description)
   - Lignes: Compte, Débit, Crédit
   - Must balance (Total Débit = Total Crédit)

#### Financial Reports

**Balance Sheet (Bilan):**
1. **Finance** → **Rapports** → **Bilan**
2. Select date (usually end of fiscal year)
3. Generate report showing:
   - Actif (Assets): Immobilisations, Stocks, Créances, Trésorerie
   - Passif (Liabilities): Capitaux, Dettes

**Income Statement (Compte de Résultat):**
1. **Finance** → **Rapports** → **Compte de Résultat**
2. Select period
3. Shows:
   - Produits (Revenue): Exploitation, Financier, Exceptionnel
   - Charges (Expenses): By category
   - Résultat net (Net result)

#### Tax Declarations (Déclarations Fiscales)

**TVA Declaration:**
1. **Finance** → **Taxes** → **Déclaration TVA**
2. Select period (trimestriel or mensuel)
3. System compiles:
   - TVA collectée (on sales)
   - TVA déductible (on purchases)
   - Solde à payer or crédit
4. Review and export for ANSEJ portal submission

**IRG Declaration (Salary Tax):**
- Auto-generated from payroll data
- Available at **Finance** → **Taxes** → **IRG/Salaires**

---

### 📈 Inventory (Stock)

Track products and manage stock levels.

#### Stock Management

**Viewing Stock:**
1. **Stock** → **État des Stocks**
2. Table shows:
   - Product code and name
   - Stock actuel (Current quantity)
   - Stock minimum (Reorder point)
   - Emplacement (Location)
   - Valeur stock (Stock value)

**Stock Movements:**
1. **Stock** → **Mouvements**
2. View history of all stock changes:
   - Entrée (In): Receipts, adjustments in
   - Sortie (Out): Deliveries, adjustments out
   - Transfert (Transfer): Between locations

#### Stock Adjustments

1. **Stock** → **Ajustement**
2. Select product
3. Enter:
   - Type: Positive (gain) or Negative (loss)
   - Quantité
   - Raison (Reason): Damage, loss, found, count correction
4. Save - creates movement record

#### Stock Takes (Inventaires)

1. **Stock** → **Inventaire** → **Nouvel Inventaire**
2. Select location(s) to count
3. Print counting sheets (or use mobile)
4. Enter counted quantities
5. System generates adjustment proposals
6. Review and confirm adjustments

---

## Tips & Best Practices (Conseils)

### General Usage

| Tip | Description |
|-----|-------------|
| 🔍 **Use Global Search** | Press `Ctrl+K` (or `Cmd+K`) for quick search anywhere |
| 🔔 **Check Notifications** | Review action items daily - approvals, deadlines |
| 📱 **Mobile Friendly** | Works on tablets for warehouse/reception use |
| 💾 **Save Often** | Data auto-saves, but manual save ensures nothing lost |

### Sales Best Practices

| Practice | Benefit |
|----------|---------|
| ✅ Always convert quotations to orders | Tracks conversion rate |
| ✅ Send invoices promptly | Improves cash flow |
| ✅ Record payments against specific invoices | Accurate AR aging |
| ✅ Use payment terms consistently | Predictable cash flow |
| ✅ Review overdue invoices weekly | Reduce DSO |

### Purchases Best Practices

| Practice | Benefit |
|----------|---------|
| ✅ Use purchase orders for all orders | Audit trail, budget control |
| ✅ Receive goods against PO | Ensures accuracy |
| ✅ Match supplier invoices to POs/receipts | Prevents overpayment |
| ✅ Approve before ordering (when required) | Proper authorization |
| ✅ Maintain supplier scorecards | Better vendor management |

### HR Best Practices

| Practice | Benefit |
|----------|---------|
| ✅ Keep employee data current | Accurate payroll |
| ✅ Submit leave requests in advance | Proper planning |
| ✅ Approve leaves timely | Employee satisfaction |
| ✅ Run payroll validation before finalizing | Catch errors early |
| ✅ Securely distribute payslips | Privacy protection |

### Accounting Best Practices

| Practice | Benefit |
|----------|---------|
| ✅ Reconcile bank accounts monthly | Accurate cash position |
| ✅ Review trial balance regularly | Catch errors early |
| ✅ Back up before period close | Recovery option |
| ✅ Keep audit trail intact | Compliance |
| ✅ Use proper account codes | Consistent reporting |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Global search |
| `Ctrl+S` | Save (where available) |
| `Esc` | Close modal/dialog |
| `Enter` | Submit form |
| `Tab` | Next field |

---

## Troubleshooting (Dépannage)

### Common Issues

| Issue | Solution |
|-------|----------|
| **Page loads slowly** | Clear browser cache; check internet connection |
| **Can't login** | Verify credentials; check Caps Lock; contact admin if locked |
| **Data not saving** | Check required fields (marked with *) |
| **Reports won't generate** | Ensure date range has data; try shorter period |
| **Permissions error** | Contact administrator for access |
| **Calculation seems wrong** | Verify TVA rates; check product settings |

### Error Messages You Might See

| Message | Meaning | Action |
|---------|---------|--------|
| "Non autorisé" | Not logged in or insufficient permissions | Login or contact admin |
| "Données invalides" | Form validation failed | Check required fields and formats |
| "Ressource non trouvée" | Record doesn't exist or was deleted | Verify ID or search for record |
| "Trop de requêtes" | Rate limited | Wait a few minutes and retry |
| "Erreur serveur" | Unexpected server error | Contact IT support |

### Getting Help

1. **In-app Help:** Look for ❓ icons on pages
2. **User Manual:** This document
3. **Administrator:** Your system admin for access/issues
4. **IT Support:** For technical problems

---

## Glossary (Glossaire)

| French Term | English | Definition |
|-------------|---------|------------|
| **Devis** | Quotation | Price offer to customer |
| **Commande** | Sales Order | Confirmed customer order |
| **Facture** | Invoice | Bill for goods/services |
| **Bon de Commande (BC)** | Purchase Order | Order to supplier |
| **Facture Fournisseur** | Supplier Invoice | Bill from supplier |
| **Bon de Livraison (BL)** | Delivery Note | Goods receipt document |
| **Congé** | Leave | Time off work |
| **Bulletin de Paie** | Payslip | Salary statement |
| **TVA** | VAT | Value Added Tax (19%, 9%, 7%, 0%) |
| **IRG** | Income Tax | Personal income tax |
| **TAP** | Activity Tax | Professional activity tax |
| **CASNOS** | Social Security | Algerian social security fund |
| **CIN** | National ID | Carte d'Identité Nationale |
| **Wilaya** | Province | Administrative division |
| **SCF** | SCF | Système Comptable Financier |

---

*User Guide v2.0.0 - HASSIBA Suite ERP*  
*Last updated: 2026-08-24*
*For support, contact your system administrator*
