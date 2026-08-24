# HASSIBA Suite ERP - Integration Architecture

**Version:** 2.0.0  
**Last Updated:** Final Certification  

---

## Table of Contents

1. [Overview](#overview)
2. [Internal Module Integrations](#internal-module-integrations)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Event-Driven Architecture](#event-driven-architecture)
5. [External Integration Points](external-integration-points)
6. [Real-Time Communication (WebSocket)](#real-time-communication-websocket)
7. [Webhook Support](#webhook-support)
8. [Import/Export Capabilities](#importexport-capabilities)
9. [API Composition Patterns](#api-composition-patterns)

---

## Overview

HASSIBA Suite ERP is designed as a modular, integrated system with clear separation of concerns and well-defined interfaces between modules. The architecture supports:

- **Loose Coupling:** Modules communicate through defined APIs and events
- **High Cohesion:** Related functionality is grouped within modules
- **Single Source of Truth:** Workflow orchestrator ensures data consistency
- **Algerian Compliance:** Built-in SCF accounting, TVA calculations, labor law compliance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HASSIBA Suite ERP                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   CRM    │  │  Sales   │  │Purchase  │  │   HR     │  │Accounting│  │
│  │ Pipeline │  │ Orders   │  │ Orders   │  │ Payroll  │  │ Finance  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       │             │             │             │              │        │
│       └─────────────┴─────────────┴─────────────┴──────────────┘        │
│                                  │                                      │
│                    ┌─────────────▼─────────────┐                       │
│                    │   Workflow Orchestrator   │                       │
│                    │   (Business Process Engine)│                      │
│                    └─────────────┬─────────────┘                       │
│                                  │                                      │
│       ┌──────────────────────────┼──────────────────────────┐         │
│       │                          │                          │         │
│  ┌────▼────┐              ┌─────▼─────┐            ┌──────▼─────┐   │
│  │Inventory│              │ Accounting│            │ Notifications│  │
│  │ Stock   │              │ Journal   │            │   & Audit    │  │
│  └─────────┘              └───────────┘            └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Internal Module Integrations

### Sales Flow Integration

```
Quotation (Devis) 
    ↓ [Convert]
Sales Order (Commande Client)
    ↓ [Confirm/Fulfill]
Invoice (Facture) 
    ↓ [Auto-post via auto-posting.ts]
Journal Entry (Écriture Comptable - VT)
    ↓ [Record Payment]
Payment (Paiement)
    ↓ [Auto-post]
Journal Entry (Écriture Comptable - BQ/CA)
```

**Key Integration Points:**
| From | To | Trigger | Mechanism |
|------|----|---------|------------|
| Quotation | Sales Order | User converts | `POST /api/quotations/[id]/convert` |
| Sales Order | Invoice | User confirms | `POST /api/sales-orders/[id]` |
| Invoice | Journal Entry | Status → sent/paid | Auto-posting (`auto-posting.ts`) |
| Invoice | Payment | User records payment | `POST /api/invoices/[id]` with `amountPaid` |

### Purchase Flow Integration

```
Purchase Request (Demande Achat)
    ↓ [Approve - if >100K DZD]
Purchase Order (Commande Achat)
    ↓ [Receive Goods]
Stock Movement + Inventory Update
    ↓ [Create Bill]
Supplier Bill (Facture Fournisseur)
    ↓ [Auto-post]
Journal Entry (Écriture Comptable - AC)
    ↓ [Pay Supplier]
Payment (Paiement Fournisseur)
```

**Key Integration Points:**
| From | To | Trigger | Mechanism |
|------|----|---------|------------|
| Purchase Order | Workflow | Amount > threshold | Automatic workflow creation |
| Purchase Order | Stock | Receive goods | `POST /api/purchases/[id]/receive` |
| Purchase Order | Bill | Create from PO | `?action=bill` on PUT |
| Bill | Journal Entry | Status change | SCF journal entry generation |

### HR/Payroll Integration

```
Employee Record (Fiche Employé)
    ↓ [Daily]
Attendance (Pointage)
    ↓ [Request]
Leave Request (Congé)
    ↓ [Approve]
Leave Balance Update
    ↓ [Monthly]
Payroll Generation (Paie)
    ↓ [Auto-calculate]
Social Contributions (CNAS/CASNOS)
IRG Tax Calculation
    ↓ [Post]
Journal Entry (Paie - Journal)
```

**Key Integration Points:**
| Module | Data Shared | Direction |
|--------|-------------|-----------|
| Employee → Attendance | Employee ID, department | One-way |
| Employee → Leave | Employee ID, balance | Bi-directional |
| Employee → Payroll | All salary info | One-way |
| Payroll → Accounting | Journal entry | One-way |
| Attendance → Payroll | Days worked/absent | One-way |

### Inventory Integration

```
Product Catalog (Catalogue Produits)
    ↓ [Define]
Stock Level (Niveau de Stock)
    ↓ [Adjust / Move]
Stock Movement (Mouvement de Stock)
    ↓ [Triggered by]
Purchase Receipt (Réception)
Sales Delivery (Livraison)
Inventory Adjustment (Ajustement)
```

**Stock Update Triggers:**
1. **Purchase Receipt:** `receivePurchaseOrder()` in `workflow-orchestrator.ts`
2. **Sales Delivery:** (Planned) When sales order is fulfilled
3. **Manual Adjustment:** `POST /api/inventory` or `/api/inventory/adjustment`
4. **Production Output:** When production order is completed

---

## Data Flow Diagrams

### Complete Order-to-Cash Flow

```
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐
│  CRM    │───▶│ Quotation│──▶│Sales Order │──▶│ Invoice  │──▶│ Payment │
│ Pipeline│    │  (DEV)   │    │   (CMD)    │    │ (FACT)   │    │         │
└─────────┘    └──────────┘    └────────────┘    └──────────┘    └─────────┘
                    │                │                 │               │
                    ▼                ▼                 ▼               ▼
              ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐
              │ Partner  │    │   Stock    │    │ Journal  │    │ Bank   │
              │  Data    │    │  Reserve   │    │  Entry   │    │ Account│
              └──────────┘    └────────────┘    └──────────┘    └─────────┘
```

### Procure-to-Pay Flow

```
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐
│Purchase │──▶│Purchase  │──▶│  Goods     │──▶│Supplier  │──▶│Payment  │
│Request  │    │Order(ACH)│    │ Receipt   │    │Bill(FCT) │    │         │
└─────────┘    └──────────┘    └────────────┘    └──────────┘    └─────────┘
       │              │                │                 │               │
       ▼              ▼                ▼                 ▼               ▼
 ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐
 │Approval │   │ Supplier│   │   Stock    │   │ Journal  │   │ Bank   │
 │Workflow │   │  Data   │   │   Update   │   │  Entry   │   │ Account│
 └──────────┘   └──────────┘   └────────────┘   └──────────┘   └─────────┘
```

---

## Event-Driven Architecture

### Current Implementation

HASSIBA Suite uses a **synchronous event pattern** within the workflow orchestrator:

```typescript
// Example: Invoice status change triggers accounting post
if (updatedInvoice.status === 'sent' || updatedInvoice.status === 'paid') {
  const journalResult = await postInvoiceToJournal(updatedInvoice.id, user.id);
}
```

### Event Types (Implicit)

| Event | Source | Consumers | Description |
|-------|--------|-----------|-------------|
| `invoice.status_changed` | Invoice API | Auto-posting, Dashboard cache | Triggers journal entry creation |
| `purchase_order.created` | Purchase API | Workflow engine | Creates approval workflow if needed |
| `purchase_order.received` | Workflow Orchestrator | Inventory | Updates stock levels |
| `employee.created` | Employee API | Audit logger | Creates audit trail entry |
| `payroll.generated` | Payroll API | Audit logger, SMIG checker | Validates compliance |
| `leave.approved` | Leave API | Leave balances | Updates remaining balance |

### Future: Message Queue Readiness

The architecture is designed to support async messaging:

```
[Current]  API Route → Direct Function Call → Database
[Future]   API Route → Event Bus (Redis/RabbitMQ) → Consumer → Database
```

**Prepared for:**
- Redis pub/sub for real-time notifications
- RabbitMQ/Apache Kafka for heavy processing
- Background job processing (Bull Agenda ready)

---

## External Integration Points

### Banking APIs (Readiness Status: 🟡 Prepared)

**Current State:** Manual bank account management  
**Integration Ready:** `GET /api/bank-accounts`, CRUD operations

**Planned Integrations:**
| Bank | API Type | Use Case | Status |
|------|----------|----------|--------|
| BNA | SATIM | Payment initiation | 🔵 API documented |
| CPA | E-Banking | Account statements | 🔵 API documented |
| BEA | Web Service | Transfers | 🔵 API documented |
| Algérie Poste | CCP | CCP payments | 🟢 Partially integrated |

**Implementation Pattern:**
```typescript
// Future banking service interface
interface BankingService {
  initiateTransfer(accountId: string, amount: number, beneficiary: Beneficiary): Promise<TransferResult>;
  getAccountStatement(accountId: string, dateFrom: Date, dateTo: Date): Promise<Statement[]>;
  checkBalance(accountId: string): Promise<Balance>;
}
```

### Tax Authority APIs (Readiness Status: 🟡 Prepared)

**Algerian Tax Systems Integration:**

| Authority | System | Purpose | Status |
|-----------|--------|---------|--------|
| DGI (Direction Générale des Impôts) | SIGTAX | TVA declarations | 🔵 Format known |
| CNAS | E-CNAS | Social declarations | 🔵 Format known |
| CASNOS | E-CASNOS | Pension declarations | 🔵 Format known |

**Built-in Tax Compliance:**
- ✅ TVA calculation engine (algerian-taxes.ts)
- ✅ IRG calculation (monthly income tax)
- ✅ Social contributions (CNAS/CASNOS rates)
- ✅ Timbre fiscal calculation
- ✅ Tax deadline tracking (Dashboard)

**Tax Declaration Formats Supported:**
```
G50 - Déclaration de TVA (Monthly)
G2  - Déclaration TAP (Quarterly)
DAS - Déclaration Annuelle de Salaires (IRG Salaires)
```

### Payment Gateways (Readiness Status: 🟢 Ready)

**Supported Payment Modes:**
- `bank_transfer` - Virement bancaire
- `cash` - Espèces
- `check` - Chèque
- `card` - Carte bancaire (prepared)
- `ccp` - Compte chèque postal

**Integration Interface:**
```typescript
interface PaymentGateway {
  processPayment(invoiceId: string, amount: number, method: string): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}
```

### Email/SMS Services (Readiness Status: 🟢 Active)

**Email Service:**
- NextAuth verification emails
- Notification emails (template-ready)
- Report delivery (planned)

**SMS Service (Readiness):**
- OTP authentication (prepared)
- Alert notifications (prepared)
- Interface defined in notifications system

**Configuration:**
```env
# Email (via Resend/Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@hassiba.dz
SMTP_PASS=xxx

# SMS (via Algérie Telecom/MTN/Djezzy)
SMS_API_KEY=xxx
SMS_SENDER_ID=HASSIBA
```

### File Storage (Readiness Status: 🟢 Active)

**Current Implementation:**
- Local file storage (`/public/uploads/`)
- Product images
- Document attachments (contracts, invoices PDFs)

**Cloud Storage Ready:**
```typescript
// Planned storage abstraction
interface FileStorageService {
  upload(file: Buffer, path: string, metadata?: FileMetadata): Promise<FileUrl>;
  download(fileId: string): Promise<Stream>;
  delete(fileId: string): Promise<void>;
  getSignedUrl(fileId: string, expiresIn?: number): Promise<string>;
}

// Providers: AWS S3, Google Cloud Storage, Azure Blob, MinIO
```

---

## Real-Time Communication (WebSocket)

### Socket.IO Implementation

**Server Configuration:**
```typescript
// socket.ts configuration
SOCKET_CONFIG = {
  url: '/?XTransformPort=3004',  // Via Caddy gateway
  options: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  }
}
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Server→Client | Connection established |
| `join` | Client→Server | Join notification room |
| `notification:new` | Server→Client | New notification |
| `notification:updated` | Server→Client | Notification status changed |
| `notification:unread-count` | Server→Client | Unread count update |
| `notification:mark-read` | Client→Server | Mark notification read |
| `notification:mark-all-read` | Client→Server | Mark all read |
| `test-notification` | Client→Server | Send test notification |

### Room Structure

```
Socket Rooms:
├── user:{userId}           # Personal notifications
├── company:{companyId}     # Company-wide alerts
├── role:{roleName}         # Role-based broadcasts (admin, manager)
└── module:{moduleName}     # Module-specific (inventory, payroll)
```

---

## Webhook Support

### Current Status: 🟡 Partially Implemented

**Available Webhooks (Planned):**

| Webhook | Trigger | Payload |
|---------|---------|---------|
| `invoice.created` | New invoice created | `{ invoiceId, reference, amount, partnerId }` |
| `invoice.paid` | Invoice fully paid | `{ invoiceId, paidDate, amount }` |
| `payment.received` | Payment recorded | `{ paymentId, invoiceId, amount, method }` |
| `employee.created` | New employee | `{ employeeId, matricule, name, department }` |
| `stock.low` | Stock below minimum | `{ productId, currentQty, minQty, warehouseId }` |
| `leave.submitted` | Leave request submitted | `{ leaveId, employeeId, type, dates }` |

**Webhook Configuration (Future):**
```typescript
interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;          // HMAC signing key
  isActive: boolean;
  companyId: string;
  lastTriggeredAt?: Date;
  successCount: number;
  failureCount: number;
}
```

**Security (Planned):**
- HMAC-SHA256 signature verification
- Timestamp validation (replay protection)
- IP whitelist support
- Retry logic with exponential backoff

---

## Import/Export Capabilities

### Data Import

**Endpoint:** `POST /api/import`

**Supported Formats:**

| Format | Module | Fields |
|--------|--------|--------|
| CSV | Products | code, name, salePrice, purchasePrice, tvaRate, category |
| CSV | Partners | name, type, email, phone, nif, address, city |
| CSV | Employees | firstName, lastName, email, department, baseSalary |
| JSON | Chart of Accounts | code, name, class, type, parentCode |
| Excel | Invoices | reference, partner, date, lines[] |

**Import Service Architecture:**
```
Upload → Validate → Transform → Save → Report
   │          │          │         │         │
   ▼          ▼          ▼         ▼         ▼
 file-parser  validation  mappers   db      response
   .ts         .ts        .ts      .ts       .ts
```

**Validation Rules:**
- Required fields check
- Format validation (email, NIF, dates)
- Duplicate detection
- Referential integrity (foreign keys)

### Export Capabilities

**Available Exports:**

| Endpoint | Format | Content |
|----------|--------|---------|
| `GET /api/reports` | PDF | Custom reports |
| `GET /api/accounting/balance` | JSON | Trial Balance |
| `GET /api/accounting/balance-sheet` | JSON | Balance Sheet (SCF) |
| `GET /api/accounting/income-statement` | JSON | Income Statement (SCF) |
| `GET /api/employees` | JSON | Employee list (PII-filtered) |
| `GET /api/invoices` | JSON | Invoice list |
| `GET /api/products` | JSON | Product catalog |
| `GET /api/audit` | JSON | Audit trail |

**Export Features (Planned):**
- Excel (.xlsx) export for all lists
- PDF report generation with company header
- Scheduled auto-export (email delivery)
- Custom template support

### Bulk Operations API

**Pattern for Bulk Operations:**
```typescript
// POST /api/{resource}/bulk
{
  "action": "create | update | delete",
  "items": [{ ... }, { ... }],
  "options": {
    "skipErrors": false,
    "dryRun": false,
    "notifyOnComplete": true
  }
}

// Response
{
  "success": true,
  "summary": {
    "total": 100,
    "created": 95,
    "updated": 3,
    "failed": 2,
    "errors": [...]
  }
}
```

---

## API Composition Patterns

### Workflow Orchestrator Pattern

The `workflow-orchestrator.ts` serves as the central composition layer:

```typescript
// Key exported functions
export async function convertQuotationToSalesOrder(input): Promise<WorkflowResult>
export async function convertSalesOrderToInvoice(input): Promise<WorkflowResult>
export async function receivePurchaseOrder(input): Promise<WorkflowResult>
export async function createBillFromPO(input): Promise<WorkflowResult>
export async function recordPayment(input): Promise<WorkflowResult>
export async function generateSCFJournalEntry(input): Promise<WorkflowResult>
```

**Each function returns:**
```typescript
interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  workflowTrace: WorkflowStepTrace[];  // Full execution trace
}
```

### Caching Layer

**Implementation:** `lib/cache.ts`

**Cache Keys Pattern:**
```
dashboard:{companyId}
invoices:{status}:{type}:{page}:{limit}:{companyId}
products:{search}:{category}:{type}:{page}:{limit}:{companyId}
```

**Cache Strategy:**
- Dashboard: 5 minutes (frequently accessed, expensive query)
- Invoices: 2 minutes (moderate churn)
- Products: 3 minutes (relatively stable)

### State Machine Pattern

**Implementation:** `lib/state-machine.ts`

**Validated Entities:**
- Invoice (draft → sent → paid/partial/cancelled)
- Purchase Order (draft → confirmed → received → billed → closed)
- Quotation (draft → sent → viewed → accepted/rejected/expired/converted)
- Leave Request (draft → submitted → approved/rejected)

**Transition Validation:**
```typescript
const result = validateTransition('invoice', 'draft', 'sent', userRole);
// Returns: { valid: true/false, error?: string, autoFields?: {} }
```

---

## Module Dependency Graph

```
                    ┌─────────────────┐
                    │     auth.ts     │ ◄── All modules
                    │  (NextAuth JWT) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  auth-utils.ts  │ ◄── Role checks, session
                    │  (RBAC Helpers) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
    │  db.ts  │        │  audit.ts │       │ cache.ts│
    │(Prisma) │        │ (Logging) │       │ (Redis) │
    └────┬────┘        └─────┬─────┘       └─────────┘
         │                   │
         │    ┌──────────────┼──────────────┐
         │    │              │              │
    ┌────▼────▼────┐  ┌─────▼─────┐  ┌──────▼──────┐
    │algerian-taxes│  │workflow-  │  │  auto-posting│
    │   .ts        │  │orchestrator│  │    .ts       │
    │(TVA/IRG/CNSS)│  │   .ts     │  │(Journal gen) │
    └──────────────┘  └───────────┘  └─────────────┘
```

---

*Document Version: 2.0.0-Final*  
*Generated for HASSIBA Suite ERP Final Certification*
