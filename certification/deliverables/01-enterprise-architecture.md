# HASSIBA Suite ERP - Enterprise Architecture

**Document Version:** 1.0  
**Classification:** Core Technical Deliverable  
**Date:** January 2025  
**Framework:** SCF (Système Comptable Financier) Compliant

---

## 1. System Overview

### 1.1 Architecture Diagram (Logical View)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Next.js 16    │  │   React 18+     │  │  Tailwind CSS   │            │
│  │   App Router    │  │   Server Comp.  │  │  shadcn/ui      │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
│           └────────────────────┴────────────────────┘                       │
│                                 │                                           │
├─────────────────────────────────┼───────────────────────────────────────────┤
│                     APPLICATION LAYER (API Routes)                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js API Routes + Middleware                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Auth     │ │Accounting│ │  HR/Payroll│ │ Inventory│ │  CRM    │  │  │
│  │  │ Routes   │ │ Routes   │ │  Routes   │ │ Routes   │ │ Routes  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │              Service Layer (lib/ utilities)                           │  │
│  │  algerian-taxes.ts | auto-posting.ts | workflow-engine.ts | ...      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
├─────────────────────────────────┼───────────────────────────────────────────┤
│                          DATA ACCESS LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Prisma ORM                                   │  │
│  │              (Type-safe Database Client)                              │  │
│  └──────────────────────────────┬───────────────────────────────────────┘  │
│                                 │                                           │
├─────────────────────────────────┼───────────────────────────────────────────┤
│                          DATA STORAGE LAYER                                 │
│  ┌──────────────────────────────┴───────────────────────────────────────┐  │
│  │         SQLite (Development) / PostgreSQL (Production)               │  │
│  │                   64+ Models / Tables                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 16.x | React framework with App Router |
| **UI Library** | React | 18.x | Component library |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Components** | shadcn/ui | Latest | Pre-built accessible components |
| **Backend** | Next.js API Routes | - | Server-side API endpoints |
| **ORM** | Prisma | 5.x | Type-safe database access |
| **Database (Dev)** | SQLite | 3.x | Local development |
| **Database (Prod)** | PostgreSQL | 15+ | Production deployment |
| **Authentication** | NextAuth.js | v4 | JWT-based auth |
| **State** | React Context/Zustand | - | Client state management |
| **Real-time** | Socket.io | - | WebSocket connections |

---

## 2. Architecture Patterns

### 2.1 MVC Pattern (Model-View-Controller)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    VIEW      │────▶│ CONTROLLER   │────▶│    MODEL     │
│  (React/     │     │  (API Route) │     │  (Prisma/    │
│   Pages)     │◀────│              │◀────│   Schema)    │
└──────────────┘     └──────────────┘     └──────────────┘
     UI                 Business Logic        Data Access
     Rendering          & Validation         & Persistence
```

**Implementation:**
- **Models:** Defined in `prisma/schema.prisma` (64+ models)
- **Views:** React components in `src/app/` and `src/components/`
- **Controllers:** API routes in `src/app/api/`

### 2.2 Repository Pattern (via Prisma)

Prisma acts as the repository layer, providing:
- Type-safe queries
- Relation handling
- Aggregation functions
- Transaction support

```typescript
// Example: Repository pattern via Prisma
const company = await prisma.company.findUnique({
  where: { id: companyId },
  include: {
    users: true,
    chartOfAccounts: true,
    invoices: { include: { lines: true } }
  }
});
```

### 2.3 Service Layer (`src/lib/`)

Business logic is encapsulated in service utilities:

| Service File | Responsibility |
|--------------|----------------|
| `algerian-taxes.ts` | Tax calculations (TVA, TAP, IRG, IBS) |
| `auto-posting.ts` | Automatic journal entry generation |
| `workflow-engine.ts` | Workflow orchestration |
| `auth.ts` | Authentication logic |
| `audit.ts` | Audit trail management |
| `notifications.ts` | Notification dispatch |
| `validation.ts` | Data validation rules |
| `security.ts` | Security utilities |

### 2.4 Middleware Pattern

#### Authentication Middleware
```typescript
// JWT-based session validation
// Role-based access control (admin, manager, accountant, hr, sales, user)
```

#### Rate Limiting
```typescript
// API rate limiting to prevent abuse
// Configurable per endpoint
```

#### Audit Middleware
```typescript
// Automatic logging of all CRUD operations
// Tracks user, timestamp, changes made
```

---

## 3. Component Diagram

### 3.1 Core Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HASSIBA SUITE ERP MODULES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   MODULE 1  │  │   MODULE 2  │  │   MODULE 3  │  │   MODULE 4  │       │
│  │             │  │             │  │             │  │             │       │
│  │ AUTH & USERS│  │ ACCOUNTING  │  │   WORKFLOW  │  │NOTIFICATIONS│       │
│  │             │  │             │  │             │  │             │       │
│  │ • User Mgmt │  │ • Chart of  │  │ • Approval  │  │ • In-App    │       │
│  │ • Sessions  │  │   Accounts  │  │   Circuits  │  │ • Email     │       │
│  │ • Roles     │  │ • Journals  │  │ • Delegation│  │ • Push      │       │
│  │ • Permissions│  │ • Invoices  │  │ • Escalation│  │ • Webhook   │       │
│  │ • Audit Trail│  │ • Bills     │  │             │  │             │       │
│  │             │  │ • Payments  │  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   MODULE 5  │  │   MODULE 6  │  │   MODULE 7  │  │   MODULE 8  │       │
│  │             │  │             │  │             │  │             │       │
│  │   REPORTS   │  │  BUDGET &   │  │   INVENTORY │  │     CRM     │       │
│  │             │  │  TREASURY   │  │             │  │             │       │
│  │ • Templates │  │             │  │ • Warehouse │  │ • Pipeline  │       │
│  │ • Financial │  │ • Budgets   │  │ • Stock     │  │ • Leads     │       │
│  │ • Payroll   │  │ • Cash Flow │  │ • Movements │  │ • Opportunities│     │
│  │ • Tax Decl. │  │ • Forecast  │  │ • Locations │  │ • Activities│       │
│  │ • Custom    │  │             │  │ • Fixed     │  │ • Quotations│       │
│  │             │  │             │  │   Assets    │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   MODULE 9  │  │  MODULE 10  │  │  MODULE 11  │  │  MODULE 12  │       │
│  │             │  │             │  │             │  │             │       │
│  │  PURCHASE   │  │   SALES     │  │  HR/PAYROLL │  │ PRODUCTION  │       │
│  │   ORDERS    │  │   ORDERS    │  │             │  │             │       │
│  │             │  │             │  │ • Employees │  │ • Work Centers│      │
│  │ • RFQ       │  │ • Quotations│  │ • Contracts │  │ • BOM/Routing│      │
│  │ • PO Mgmt   │  │ • SO Mgmt   │  │ • Payroll   │  │ • Work Orders│      │
│  │ • Receipts  │  │ • Delivery  │  │ • Leave     │  │ • Quality    │      │
│  │ • 3-Way Match│  │ • Invoicing│  │ • Attendance│  │ • OEE Tracking│     │
│  │             │  │             │  │ • Balances  │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐                                          │
│  │  MODULE 13  │  │  MODULE 14  │                                          │
│  │             │  │             │                                          │
│  │ MAINTENANCE │  │  OPERATIONS │                                          │
│  │             │  │             │                                          │
│  │ • Equipment │  │ • Calendar  │                                          │
│  │ • PM Plans  │  │ • Documents │                                          │
│  │ • Work Orders│  │ • Holidays  │                                          │
│  │ • Spare Parts│  │ • Import    │                                          │
│  │ • OEE       │  │ • Automation│                                          │
│  └─────────────┘  └─────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Interactions

| Source Component | Target Component | Interaction Type | Data Flow |
|------------------|-----------------|-----------------|-----------|
| Invoice | JournalEntry | Auto-posting | Accounting entries |
| Payment | JournalEntry | Auto-posting | Bank/Cash entries |
| Employee | Payroll | Calculation | Salary processing |
| PurchaseOrder | StockMovement | Receipt | Inventory update |
| SalesOrder | StockMovement | Delivery | Inventory update |
| WorkflowInstance | Notification | Event trigger | Alerts |
| User | AuditLog | Automatic | Compliance logging |

---

## 4. Data Flow Diagram

### 4.1 Request Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  CLIENT  │───▶│  API     │───▶│ SERVICE  │───▶│  PRISMA  │───▶│ DATABASE │
│ Browser  │◀───│  ROUTE   │◀───│  LAYER   │◀───│   ORM    │◀───│ SQLite/  │
│          │    │          │    │          │    │          │    │ Postgres │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
     │  1. HTTP       │  2. Parse     │  3. Business  │  4. Query    │  5.
     │     Request   │    & Validate │    Logic     │    Build     │  Execute
     │               │               │               │               │
     │               │  6. Response   │  7. Format   │  8. Results  │
     │  9. JSON      │◀──────────────│◀──────────────│◀──────────────│
     │   Response    │               │               │               │
```

### 4.2 Example: Invoice Creation Flow

```
User Action → POST /api/invoices
                │
                ▼
        ┌───────────────────┐
        │ 1. Authenticate   │ ← JWT Session Validation
        │ 2. Validate Input │ ← Schema Validation
        │ 3. Check Rights   │ ← Role-based Access
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ 4. Calculate TVA  │ ← algerian-taxes.ts
        │ 5. Compute Totals │ ← Line items aggregation
        │ 6. Generate Ref   │ ← FAC-YYYY-MM-XXX format
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ 7. Create Invoice │ ← prisma.invoice.create()
        │ 8. Create Lines   │ ← prisma.invoiceLine.createMany()
        │ 9. Update Partner │ ← Customer balance
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │10. Log Audit      │ ← audit.log()
        │11. Trigger WF     │ ← If approval required
        │12. Return Response│ ← JSON with invoice data
        └───────────────────┘
```

---

## 5. Integration Points

### 5.1 External APIs

| Integration | Purpose | Protocol | Status |
|-------------|---------|----------|--------|
| Email Service | Transactional emails | SMTP/REST | Configurable |
| SMS Gateway | SMS notifications | REST | Optional |
| Push Service | Browser push notifications | Web Push | Optional |
| Bank API | Payment initiation | REST | Future |
| Tax Authority | E-filing (DGI) | SOAP/REST | Planned |

### 5.2 Internal Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION HUB                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   Socket.io │◀────▶│   Redis/    │◀────▶│   API       │     │
│  │ Real-time   │      │   Cache     │      │   Routes    │     │
│  │ Events      │      │             │      │             │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│         │                                         │             │
│         ▼                                         ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  Notification│     │   Audit     │     │   Workflow  │     │
│  │  Dispatch   │     │   Logger    │     │   Engine    │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 File Storage

| Storage Type | Use Case | Provider |
|--------------|----------|----------|
| Local FS | Development | Node.js fs |
| S3 Compatible | Production files | AWS S3 / MinIO |
| CDN | Static assets | Cloudflare |

### 5.4 Notification Service

```typescript
// Notification channels supported
type NotificationChannel = 
  | 'in_app'    // Real-time via Socket.io
  | 'email'     // SMTP transactional
  | 'sms'       // SMS gateway
  | 'push'      // Web push notifications
  | 'webhook';  // Outbound webhooks
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Login   │────▶│ NextAuth │────▶│ Database │
│ Browser  │     │  Form    │     │  .js     │     │ Sessions │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                        │               │
                        ▼               ▼
                 ┌─────────────────────────────┐
                 │  JWT Token Generation        │
                 │  - User ID                   │
                 │  - Role                      │
                 │  - Company ID                │
                 │  - Expiration (24h)          │
                 └─────────────────────────────┘
```

### 6.2 Authorization Model

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| `admin` | Full system | All modules, settings, user management |
| `manager` | Department | Department reports, approvals, team management |
| `accountant` | Finance | Accounting, invoices, taxes, reports |
| `hr` | Human Resources | Employees, payroll, leave, contracts |
| `sales` | Commercial | CRM, quotations, sales orders |
| `user` | Basic | Assigned tasks, personal data view |

### 6.3 Data Security

- **Encryption at Rest:** Database encryption (PostgreSQL)
- **Encryption in Transit:** TLS 1.3 for all connections
- **Password Hashing:** bcrypt with salt
- **Session Security:** HTTP-only cookies, CSRF protection
- **Input Sanitization:** Prisma parameterized queries (SQL injection prevention)
- **XSS Protection:** React's built-in escaping

---

## 7. Deployment Architecture

### 7.1 Development Environment

```
┌────────────────────────────────────────┐
│         Local Development             │
│                                        │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ Next.js  │  │  SQLite (file)   │   │
│  │ Dev Server│  │  prisma/dev.db  │   │
│  │ :3000    │  │                  │   │
│  └──────────┘  └──────────────────┘   │
│         │               │             │
│         └───────┬───────┘             │
│                 ▼                     │
│  ┌──────────────────────────┐         │
│  │  Prisma Studio (:5555)   │         │
│  │  Database Browser        │         │
│  └──────────────────────────┘         │
└────────────────────────────────────────┘
```

### 7.2 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Nginx/    │───▶│   Node.js   │───▶│ PostgreSQL  │          │
│  │   CDN       │    │   Cluster   │    │   Primary   │          │
│  │  (SSL Term) │    │  (PM2/K8s)  │    │   Replica   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                            │                   │                │
│                            ▼                   ▼                │
│                   ┌─────────────────────────────────┐           │
│                   │        Redis Cluster            │           │
│                   │    (Cache/Sessions/Queue)        │           │
│                   └─────────────────────────────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    S3/MinIO                               │    │
│  │              (File Storage/Backups)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Key Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Next.js App Router | Server components, better performance | Improved SEO, reduced JS bundle |
| Prisma ORM | Type-safe, excellent DX | Fewer bugs, faster development |
| SQLite for Dev | Zero-config, portable | Easy onboarding, fast tests |
| shadcn/ui | Customizable, accessible | Consistent UI, accessibility compliance |
| NextAuth.js v4 | Battle-tested auth | Secure sessions, multiple providers |
| Socket.io | Real-time features | Live updates, notifications |

---

## 9. Scalability Considerations

### 9.1 Horizontal Scaling

- **Stateless API servers:** Session state in Redis/JWT
- **Database read replicas:** Report generation offload
- **CDN caching:** Static assets and API responses
- **Queue system:** Background job processing

### 9.2 Performance Optimization

- **Prisma query optimization:** Selective includes, pagination
- **React optimization:** Memoization, code splitting
- **Database indexing:** Strategic indexes on frequently queried fields
- **Caching layer:** Redis for hot data

---

## 10. Compliance & Standards

| Standard | Implementation |
|----------|----------------|
| **SCF (Algerian)** | Full chart of accounts, double-entry accounting |
| **Algerian Tax Law** | TVA, TAP, IRG, IBS calculation engines |
| **Labor Law** | Leave management, SMIG compliance |
| **Data Privacy** | GDPR-inspired data handling |
| **Audit Trail** | Complete action logging per DGI requirements |

---

*Document End: Enterprise Architecture*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
