# DELIVERABLE 9: CRM Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The CRM (Customer Relationship Management) module in HASSIBA Suite ERP provides comprehensive tools for managing sales opportunities, customer interactions, and commercial activities. It is designed for the Algerian market with full French/Arabic language support.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Opportunity Pipeline** | Track leads through sales stages |
| **Activity Management** | Log calls, meetings, emails, notes |
| **Contact Management** | Store customer contact details |
| **Sales Analytics** | Pipeline value, conversion rates |
| **Assignment System** | Assign opportunities to sales reps |

---

## 2. API Endpoints

### 2.1 Base Endpoint

```
/api/crm
```

### 2.2 HTTP Methods

| Method | Description | Authentication |
|--------|-------------|----------------|
| `GET` | Retrieve opportunities or activities | Required |
| `POST` | Create opportunity or activity | Role: admin, manager, sales |

---

## 3. Data Models

### 3.1 Opportunity (Opportunité)

```typescript
interface Opportunity {
  id: string;
  reference: string;           // Auto-generated: OPP-YYYYMM-XXX
  name: string;                // Opportunity name/title
  partnerId?: string;          // Linked partner/customer
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Status & Stage
  status: LeadStatus;          // new, qualified, negotiation, won_won, lost_lost, cancelled
  stage: number;               // 1-5 pipeline stage
  source: LeadSource;          // website, referral, cold_call, etc.
  rating: LeadRating;          // hot, warm, cold
  
  // Financial
  expectedRevenue: number;     // Expected deal value (DZD)
  probability: number;         // Win probability (1-100%)
  weightedValue: number;       // expectedRevenue × probability / 100
  
  // Product Info
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  
  // Dates
  expectedCloseDate?: Date;
  nextActionDate?: Date;
  actualCloseDate?: Date;
  lastActivityAt?: Date;
  
  // Assignment
  assignedToId?: string;
  
  // Metadata
  nextAction?: string;
  notes?: string;
  lostReason?: string;
  convertedInvoiceId?: string;
  
  // Relations
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Activity (Activité)

```typescript
interface Activity {
  id: string;
  type: ActivityType;          // call, meeting, email, note, follow_up, task, demo
  subject: string;
  description?: string;
  dueDate?: Date;
  durationMinutes?: number;
  result?: string;
  nextStep?: string;
  
  // Relations
  userId: string;              // Activity owner
  opportunityId?: string;      // Linked opportunity
  partnerId?: string;          // Linked partner
  
  createdAt: Date;
}
```

### 3.3 Enumerations

#### LeadStatus
| Status | Description |
|--------|-------------|
| `new` | New lead, not yet contacted |
| `qualified` | Qualified prospect |
| `proposal` | Proposal sent |
| `negotiation` | In active negotiation |
| `won_won` | Deal closed - won |
| `lost_lost` | Deal closed - lost |
| `cancelled` | Cancelled/voided |

#### LeadSource
| Source | Description |
|--------|-------------|
| `website` | Company website |
| `referral` | Customer referral |
| `cold_call` | Outbound call |
| `email` | Email campaign |
| `social_media` | Social media |
| `event` | Trade show/event |
| `advertisement` | Paid advertising |
| `other` | Other sources |

#### LeadRating
| Rating | Description | Probability Range |
|--------|-------------|-------------------|
| `hot` | High intent, ready to buy | 70-100% |
| `warm` | Interested, nurturing | 30-70% |
| `cold` | Early stage, low intent | 10-30% |

#### ActivityType
| Type | Description |
|------|-------------|
| `call` | Phone call |
| `meeting` | In-person/virtual meeting |
| `email` | Email correspondence |
| `note` | General note |
| `follow_up` | Follow-up action |
| `task` | To-do task |
| `demo` | Product demonstration |

---

## 4. API Operations

### 4.1 GET /api/crm - Retrieve Data

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `opportunities` (default) or `activities` |
| `status` | LeadStatus | Filter by opportunity status |
| `assignedTo` | string | Filter by assigned user ID |
| `stage` | number | Filter by pipeline stage (1-5) |
| `userId` | string | Filter activities by user |
| `opportunityId` | string | Filter activities by opportunity |
| `activityType` | ActivityType | Filter by activity type |
| `stats` | boolean | Set `true` for aggregated statistics |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset (default: 0) |

#### Response: Opportunities List

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reference": "OPP-202501-001",
      "name": "Projet ERP Entreprise XYZ",
      "partner": { "id": "...", "name": "XYZ SARL" },
      "assignedTo": { "id": "...", "name": "Ahmed B.", "email": "a@company.dz" },
      "status": "negotiation",
      "stage": 4,
      "expectedRevenue": 2500000,
      "probability": 70,
      "weightedValue": 1750000,
      "_count": { "activities": 12 }
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

#### Response: Statistics (`stats=true`)

```json
{
  "success": true,
  "data": {
    "byStatus": [
      { "status": "new", "_count": 15 },
      { "status": "negotiation", "_count": 8 },
      { "status": "won_won", "_count": 22 }
    ],
    "byStage": [
      { "stage": 1, "_count": 15 },
      { "stage": 2, "_count": 10 },
      { "stage": 3, "_count": 8 },
      { "stage": 4, "_count": 7 },
      { "stage": 5, "_count": 5 }
    ],
    "byRating": [
      { "rating": "hot", "_count": 10 },
      { "rating": "warm", "_count": 20 },
      { "rating": "cold", "_count": 15 }
    ],
    "totalPipeline": 45000000
  }
}
```

#### Response: Activities List

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "call",
      "subject": "Appel suivi proposition commerciale",
      "dueDate": "2025-01-15T10:00:00Z",
      "durationMinutes": 25,
      "result": "Intéressé, demande démo",
      "user": { "id": "...", "name": "Ahmed B." },
      "opportunity": { "id": "...", "name": "Projet ERP" }
    }
  ]
}
```

### 4.2 POST /api/crm - Create Data

#### Action: Create Opportunity

**Request Body:**
```json
{
  "action": "create_opportunity",
  "name": "Nouveau projet client",
  "partnerId": "partner-uuid",
  "contactName": "Mohammed A.",
  "contactEmail": "mohammed@client.dz",
  "contactPhone": "+213 555 123 456",
  "status": "new",
  "stage": 1,
  "source": "referral",
  "rating": "warm",
  "expectedRevenue": 500000,
  "probability": 30,
  "productName": "Licence ERP",
  "quantity": 10,
  "unitPrice": 50000,
  "expectedCloseDate": "2025-03-31",
  "nextAction": "Envoyer devis",
  "nextActionDate": "2025-01-20",
  "assignedToId": "user-uuid",
  "companyId": "company-uuid",
  "notes": "Référence par client existant"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference": "OPP-202501-042",
    "name": "Nouveau projet client",
    "weightedValue": 150000,
    // ... full opportunity object
  }
}
```

**Auto-calculated Fields:**
- `reference`: Auto-generated format `OPP-YYYYMM-XXX`
- `weightedValue`: `expectedRevenue × probability / 100`

#### Action: Create Activity

**Request Body:**
```json
{
  "action": "create_activity",
  "type": "call",
  "subject": "Appel de prospection",
  "description": "Premier contact avec le prospect",
  "dueDate": "2025-01-18T14:00:00Z",
  "durationMinutes": 15,
  "userId": "user-uuid",
  "opportunityId": "opp-uuid",
  "result": "À rappeler la semaine prochaine",
  "nextStep": "Envoyer documentation"
}
```

**Side Effect:** Updates `lastActivityAt` on linked opportunity.

#### Action: Update Opportunity Status

**Request Body:**
```json
{
  "action": "update_status",
  "id": "opportunity-uuid",
  "status": "won_won",
  "convertedInvoiceId": "invoice-uuid"
}
```

**Auto-set:** `actualCloseDate = now()` when status is `won_won` or `lost_lost`.

#### Action: Advance to Next Stage

**Request Body:**
```json
{
  "action": "next_stage",
  "id": "opportunity-uuid",
  "userId": "user-uuid"
}
```

**Behavior:**
- Increments `stage` (max 5)
- Auto-updates `status` to `negotiation` if stage ≥ 4 and was `new`
- Creates automatic follow-up activity
- Updates `lastActivityAt`

---

## 5. Sales Pipeline Stages

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ STAGE 1 │───▶│ STAGE 2 │───▶│ STAGE 3 │───▶│ STAGE 4 │───▶│ STAGE 5 │
│ Initial │    │Qualified│    │Proposal │    │Negotiat.│    │  Close  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
   New Lead     Qualified      Sent Prop.    Negotiating    Won/Lost
```

---

## 6. Security & Access Control

### 6.1 Authentication Requirements

| Operation | Auth Required | Roles Allowed |
|-----------|---------------|---------------|
| View opportunities | ✅ Yes | All authenticated users |
| View activities | ✅ Yes | All authenticated users |
| Create opportunity | ✅ Yes | admin, manager, sales |
| Create activity | ✅ Yes | admin, manager, sales |
| Update status | ✅ Yes | admin, manager, sales |
| View statistics | ✅ Yes | All authenticated users |

### 6.2 Data Access

- Users can only see opportunities assigned to them (when filtered)
- Partner data included as read-only reference
- No PII restrictions beyond standard auth

---

## 7. Integration Points

### 7.1 Related Modules

| Module | Integration |
|--------|-------------|
| **Partners** | Opportunities linked to `partnerId` |
| **Invoices** | Won opportunities can link to `convertedInvoiceId` |
| **Users** | Activities and assignments linked to users |
| **Calendar** | Activity due dates can sync with calendar |

### 7.2 Workflow Integration

When an opportunity reaches `won_won` status:
1. Set `actualCloseDate` to current timestamp
2. Optionally link to created invoice
3. Update pipeline analytics

---

## 8. Implementation Details

### 8.1 Source File

```
src/app/api/crm/route.ts
```

### 8.2 Database Tables

| Table | Purpose |
|-------|---------|
| `opportunity` | Store opportunity records |
| `activity` | Store activity/log records |

### 8.3 Key Dependencies

```typescript
import { db } from '@/lib/db';
import { LeadStatus, LeadSource, LeadRating, ActivityType } from '@prisma/client';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';
```

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
