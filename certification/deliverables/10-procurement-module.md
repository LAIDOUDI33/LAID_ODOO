# DELIVERABLE 10: Procurement Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The Procurement (Achats) module manages the complete purchase lifecycle in HASSIBA Suite ERP, from purchase requisition through goods receipt and supplier invoice processing. It is fully compliant with Algerian business requirements including TVA (VAT) calculations and SCF accounting standards.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Purchase Orders** | Create and manage supplier orders |
| **Supplier Management** | Link to partner/supplier records |
| **TVA Calculation** | Automatic Algerian VAT computation |
| **Approval Workflows** | Multi-level approval based on amount |
| **Goods Receipt** | Receive and inspect deliveries |
| **Bill Processing** | Link to supplier invoices |
| **Multi-Warehouse** | Support for multiple receiving locations |

---

## 2. API Endpoints

### 2.1 Primary Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/purchases` | GET | List purchase orders |
| `/api/purchases` | POST | Create purchase order |
| `/api/purchases/[id]` | GET | Get single PO |
| `/api/purchases/[id]` | PUT | Update PO |
| `/api/purchases/[id]/receive` | POST | Receive goods |

### 2.2 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/bills` | Supplier invoice management |
| `/api/partners` | Supplier data |
| `/api/inventory` | Stock updates on receipt |
| `/api/workflow/purchases` | Purchase workflow actions |

---

## 3. Data Models

### 3.1 Purchase Order (Commande d'Achat)

```typescript
interface PurchaseOrder {
  id: string;
  reference: string;           // Auto: ACH-YYYY-MM-XXX
  
  // Relationships
  partnerId: string;           // Supplier (required)
  companyId: string;
  warehouseId?: string;        // Receiving warehouse
  
  // Dates
  date: Date;                  // Order date
  expectedDate?: Date;         // Expected delivery
  
  // Financial Summary
  amountUntaxed: number;       // Total HT
  amountTax: number;           // Total TVA
  amountTotal: number;         // Total TTC
  amountReceived: number;      // Value received
  amountBilled: number;        // Value invoiced
  
  // Status
  status: POStatus;
  
  // Payment & Shipping
  paymentTerms: string;        // e.g., "30"
  paymentMode?: string;
  incoterm?: string;           // DDP, FOB, etc.
  shippingAddress?: string;
  
  // Tracking
  sourceType?: string;         // 'manual', 'reorder'
  sourceId?: string;
  
  // Metadata
  internalNotes?: string;
  supplierNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Purchase Order Line

```typescript
interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;        // Percentage (0-100)
  tvaRate: number;             // 0, 7, 9, or 19 (integer)
  
  // Calculated amounts
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  
  // Receipt tracking
  quantityReceived: number;
  quantityInvoiced: number;
}
```

### 3.3 Purchase Order Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `draft` | Initial state | confirmed, cancelled |
| `pending_approval` | Awaiting approval (M-13) | approved, rejected |
| `confirmed` | Confirmed by purchaser | approved, cancelled |
| `approved` | Approved for purchase | received, cancelled |
| `received` | Goods received | done |
| `done` | Fully received & invoiced | (terminal) |
| `cancelled` | Cancelled | (terminal) |

---

## 4. TVA (VAT) Calculation System

### 4.1 Algerian TVA Rates

| Rate | Category | Application |
|------|----------|-------------|
| **0%** | Exonéré | Exports, specific sectors |
| **7%** | Particulier | Reduced rate goods/services |
| **9%** | Réduit | Basic necessities |
| **19%** | Normal | Default rate (most goods/services) |

### 4.2 Rate Validation

The system accepts both integer and decimal formats:

```typescript
// Both formats accepted and validated
isValidTVARate(19)     // → true (integer format)
isValidTVARate(0.19)   // → true (decimal format)
isValidTVARate(15)     // → false (invalid rate)

// Normalization functions
normalizeTVARate(19)   // → 0.19 (for calculation)
normalizeTVARate(0.19) // → 0.19
tvaToInt(0.19)         // → 19 (for storage)
tvaToInt(19)           // → 19
```

### 4.3 Line Amount Calculation

```
Step 1: Amount Before Discount = Quantity × Unit Price
Step 2: Discount Amount = Step 1 × (Discount Rate / 100)
Step 3: Amount Untaxed (HT) = Step 1 - Step 2
Step 4: Amount Tax (TVA) = Step 3 × TVA Rate (decimal)
Step 5: Amount Total (TTC) = Step 3 + Step 4
```

**Example Calculation:**
```
Quantity: 10 units
Unit Price: 5,000 DZD
Discount: 5%
TVA Rate: 19%

Amount Before Discount = 10 × 5,000 = 50,000 DZD
Discount Amount = 50,000 × 0.05 = 2,500 DZD
Amount Untaxed = 50,000 - 2,500 = 47,500 DZD
Amount Tax = 47,500 × 0.19 = 9,025 DZD
Amount Total = 47,500 + 9,025 = 56,525 DZD
```

---

## 5. Approval Workflow (M-13)

### 5.1 Approval Thresholds

| Total Amount | Approval Level | Workflow Action |
|--------------|---------------|-----------------|
| < 100,000 DZD | None | Auto-approved as `draft` |
| 100,000 - 499,999 DZD | Manager | Creates workflow instance |
| 500,000 - 999,999 DZD | Director | Creates workflow instance |
| ≥ 1,000,000 DZD | Executive | Creates workflow instance |

### 5.2 Workflow Integration

When a PO exceeds the threshold:

```typescript
// 1. Determine required level
const approvalLevel = getRequiredApprovalLevel(totals.amountTotal);

// 2. Check for active workflow definition
const wfDefinition = await db.workflowDefinition.findFirst({
  where: { type: 'purchase_order', companyId, isActive: true }
});

// 3. Create workflow instance if definition exists
if (wfDefinition) {
  const workflowInstance = await db.workflowInstance.create({
    data: {
      definitionId: wfDefinition.id,
      initiatorId: user?.id,
      entityType: 'purchase_order',
      entityId: purchaseOrder.id,
      entityReference: purchaseOrder.reference,
      amount: totals.amountTotal,
      title: `Approbation commande d'achat ${purchaseOrder.reference}`,
      status: 'pending',
      companyId
    }
  });
  
  // 4. Update PO status
  await db.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: { status: 'pending_approval' }
  });
}
```

### 5.3 Response with Approval Info

```json
{
  "success": true,
  "data": { /* PO object */ },
  "message": "Commande d'achat ACH-2025-01-001 créée avec succès (en attente d'approbation)",
  "approvalInfo": {
    "requiresApproval": true,
    "approvalLevel": "manager",
    "workflowInstanceId": "uuid",
    "message": "Cette commande d'achat nécessite une approbation manager avant traitement"
  },
  "thresholds": {
    "managerApproval": 100000,
    "directorApproval": 500000,
    "executiveApproval": 1000000,
    "currentLevel": "manager",
    "currency": "DZD"
  }
}
```

---

## 6. API Operations

### 6.1 GET /api/purchases - List Purchase Orders

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `partnerId` | string | Filter by supplier |
| `dateFrom` | Date | Start date filter |
| `dateTo` | Date | End date filter |
| `search` | string | Search in reference, partner name, notes |
| `companyId` | string | Company filter |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (max: 100, default: 20) |

#### Response Structure

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reference": "ACH-2025-01-001",
      "partner": {
        "id": "uuid",
        "name": "Fournisseur SARL",
        "displayName": "Fournisseur",
        "type": "supplier"
      },
      "company": { "id": "uuid", "name": "Mon Entreprise" },
      "warehouse": { "id": "uuid", "name": "Entrepôt Principal", "code": "ENT-01" },
      "date": "2025-01-15",
      "status": "approved",
      "amountUntaxed": 47500,
      "amountTax": 9025,
      "amountTotal": 56525,
      "lines": [
        {
          "productId": "uuid",
          "product": { "id": "...", "code": "PROD-001", "name": "Produit A" },
          "quantity": 10,
          "unitPrice": 5000,
          "tvaRate": 19,
          "amountTotal": 56525
        }
      ],
      "bills": [
        { "id": "uuid", "reference": "FAC-F-001", "status": "draft", "amountTotal": 56525 }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 6.2 POST /api/purchases - Create Purchase Order

#### Request Body

```json
{
  "partnerId": "supplier-uuid",
  "companyId": "company-uuid",
  "date": "2025-01-15",
  "expectedDate": "2025-02-01",
  "paymentTerms": "30",
  "paymentMode": "virement",
  "incoterm": "DDP",
  "warehouseId": "warehouse-uuid",
  "internalNotes": "Urgent pour projet X",
  "lines": [
    {
      "productId": "product-uuid-1",
      "description": "Description optionnelle",
      "quantity": 10,
      "unitPrice": 5000,
      "discountRate": 5,
      "tvaRate": 19
    },
    {
      "productId": "product-uuid-2",
      "quantity": 5,
      "unitPrice": 2000,
      "tvaRate": 9
    }
  ]
}
```

#### Validation Rules

1. **partnerId** - Required; must exist and be type `supplier`
2. **lines** - Required; at least one line
3. **quantity** - Must be > 0 for each line
4. **unitPrice** - Must be >= 0 for each line
5. **tvaRate** - Must be valid Algerian rate (0, 7, 9, 19)
6. **warehouseId** - If provided, must exist

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference": "ACH-2025-01-001",
    "status": "draft",
    "amountUntaxed": 55500,
    "amountTax": 10115,
    "amountTotal": 65615,
    "lines": [...]
  },
  "message": "Commande d'achat ACH-2025-01-001 créée avec succès"
}
```

---

## 7. Reference Generation

### 7.1 Format

```
ACH-YYYY-MM-XXX
```

Where:
- `ACH` - Fixed prefix for purchase orders
- `YYYY` - Year (4 digits)
- `MM` - Month (2 digits)
- `XXX` - Sequential number (3 digits, padded with zeros)

### 7.2 Examples

| Reference | Meaning |
|-----------|---------|
| `ACH-2025-01-001` | First PO of January 2025 |
| `ACH-2025-01-042` | 42nd PO of January 2025 |
| `ACH-2024-12-156` | 156th PO of December 2024 |

### 7.3 Generation Logic

```typescript
async function generatePurchaseReference(date: Date, companyId: string): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const count = await db.purchaseOrder.count({
    where: {
      companyId,
      date: {
        gte: new Date(year, date.getMonth(), 1),
        lt: new Date(year, date.getMonth() + 1, 1),
      },
    },
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `ACH-${year}-${month}-${sequence}`;
}
```

---

## 8. Security & Access Control

### 8.1 Authentication Requirements

| Operation | Auth Required | Roles Allowed |
|-----------|---------------|---------------|
| List POs | ✅ Yes | All authenticated users |
| Create PO | ✅ Yes | admin, manager, accountant, warehouse_manager |
| Update PO | ✅ Yes | admin, manager, accountant, warehouse_manager |
| Receive goods | ✅ Yes | admin, manager, warehouse_manager |

### 8.2 Company Scoping

Non-super-admin users are automatically scoped to their company:

```typescript
if (user && user.role !== ROLES.SUPER_ADMIN && user.companyId && !companyId) {
  where.companyId = user.companyId;
}
```

### 8.3 Supplier Validation

System prevents creating POs for partners typed as `customer`:

```typescript
if (partner.type === 'customer') {
  return NextResponse.json({
    success: false,
    error: "Ce partenaire n'est pas un fournisseur"
  }, { status: 400 });
}
```

---

## 9. Procurement Process Flow

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│ CREATE PO   │───▶│ APPROVAL CHECK   │───▶│ CONFIRMED   │
│ (Draft)     │    │ (If >threshold)  │    │             │
└─────────────┘    └──────────────────┘    └──────┬──────┘
                                               │
┌─────────────┐    ┌─────────────┐    ┌────────▼──────┐
│ DONE        │◀───│ INVOICED    │◀───│ RECEIVED     │
│ (Terminal)  │    │ (Bill linked)│    │ (Goods rcvd) │
└─────────────┘    └─────────────┘    └──────────────┘
                                               │
                    ┌────────────────────────────┘
                    │
              ┌─────▼──────┐
              │ CANCELLED  │
              │ (Terminal) │
              └────────────┘
```

---

## 10. Implementation Details

### 10.1 Source Files

| File | Purpose |
|------|---------|
| `src/app/api/purchases/route.ts` | Main CRUD operations |
| `src/app/api/purchases/[id]/route.ts` | Single PO operations |
| `src/app/api/purchases/[id]/receive/route.ts` | Goods receipt |
| `src/lib/algerian-taxes.ts` | TVA calculation utilities |

### 10.2 Database Tables

| Table | Purpose |
|-------|---------|
| `PurchaseOrder` | Header information |
| `PurchaseOrderLine` | Line items |
| `Partner` | Supplier data |
| `Warehouse` | Receiving locations |
| `WorkflowInstance` | Approval tracking |

### 10.3 Key Dependencies

```typescript
import { db } from '@/lib/db';
import { calculateTVA, TVA_RATES, isValidTVARate, normalizeTVARate, tvaToInt } from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';
```

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
