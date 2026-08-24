# DELIVERABLE 11: Inventory Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The Inventory (Stock) module in HASSIBA Suite ERP provides comprehensive stock management capabilities including real-time stock level tracking, warehouse management, stock movements, and inventory adjustments. It supports multi-warehouse operations with full audit trail compliance.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Stock Levels** | Real-time quantity tracking per product/warehouse/location |
| **Multi-Warehouse** | Support for multiple storage locations |
| **Stock Movements** | Complete audit trail of all stock changes |
| **Adjustments** | Manual stock corrections with validation |
| **Low Stock Alerts** | Automatic detection of items below minimum |
| **KPI Dashboard** | Inventory metrics and analytics |

---

## 2. API Endpoints

### 2.1 Primary Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inventory` | GET | Get stock levels & KPIs |
| `/api/inventory` | POST | Stock adjustment |
| `/api/inventory/movements` | GET | List stock movements |
| `/api/inventory/stock-levels` | GET | Detailed stock levels |
| `/api/inventory/adjustment` | POST | Dedicated adjustment endpoint |

### 2.2 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/products` | Product master data |
| `/api/warehouses` (via include) | Warehouse information |
| `/api/purchases/[id]/receive` | Stock-in from PO receipt |

---

## 3. Data Models

### 3.1 Stock Level (Niveau de Stock)

```typescript
interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  locationId?: string;          // Optional bin/rack location
  
  // Quantities
  quantity: number;             // Total physical quantity
  availableQty: number;         // Available for use (qty - reserved)
  reservedQty: number;          // Reserved for orders
  
  // Limits
  minQty: number;               // Reorder point
  maxQty: number;               // Maximum capacity
  
  // Relations
  product: Product;
  warehouse: Warehouse;
  location?: Location;
  
  updatedAt: Date;
}
```

### 3.2 Stock Movement (Mouvement de Stock)

```typescript
interface StockMovement {
  id: string;
  reference: string;            // Auto-generated reference
  date: Date;
  
  // Type & Quantity
  type: MovementType;
  quantity: number;             // Always positive (direction from type)
  unitCost: number;
  totalCost: number;            // quantity × unitCost
  
  // References
  productId: string;
  warehouseId: string;
  locationId?: string;
  stockLevelId?: string;
  
  // Metadata
  notes?: string;
  referenceDocument?: string;   // PO, SO, adjustment ref
  userId?: string;              // Who made the movement
  
  createdAt: Date;
}
```

### 3.3 Movement Types

| Type | Description | Direction |
|------|-------------|-----------|
| `in_purchase` | Goods received from purchase order | Stock IN |
| `in_production` | Finished goods from production | Stock IN |
| `in_adjustment` | Manual increase adjustment | Stock IN |
| `in_return` | Customer return | Stock IN |
| `out_sale` | Goods sold (delivery) | Stock OUT |
| `out_production` | Raw materials for production | Stock OUT |
| `out_adjustment` | Manual decrease adjustment | Stock OUT |
| `out_damage` | Damaged/written off | Stock OUT |

---

## 4. API Operations

### 4.1 GET /api/inventory - Stock Levels & KPIs

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name, code (French/Arabic) |
| `category` | string | Filter by category ID |
| `warehouse` | string | Filter by warehouse ID |
| `lowStock` | boolean | Show only items at/below min qty |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 50) |

#### Response Structure

```json
{
  "success": true,
  "data": {
    "stockLevels": [
      {
        "id": "uuid",
        "product": {
          "id": "uuid",
          "name": "Produit A",
          "nameAr": "منتج أ",
          "code": "PROD-001",
          "category": { "id": "uuid", "name": "Catégorie 1" }
        },
        "warehouse": { "id": "uuid", "name": "Entrepôt Principal", "code": "ENT-01" },
        "location": { "id": "uuid", "name": "Zone A", "code": "Z-A" },
        "quantity": 150,
        "availableQty": 120,
        "reservedQty": 30,
        "minQty": 20,
        "maxQty": 500,
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "warehouses": [
      { "id": "uuid", "name": "Entrepôt Principal", "code": "ENT-01" },
      { "id": "uuid", "name": "Entrepôt Secondaire", "code": "ENT-02" }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "pages": 4
    },
    "kpis": {
      "totalProducts": 200,
      "totalQuantity": 15000,
      "totalValue": 250000000,
      "lowStockCount": 12,
      "outOfStockCount": 5
    }
  }
}
```

### 4.2 KPI Calculations

The API automatically calculates these key performance indicators:

| KPI | Calculation | Description |
|-----|-------------|-------------|
| `totalProducts` | Count of active, tracked products | Unique products with stock |
| `totalQuantity` | Sum of all quantities | Total units across all locations |
| `totalValue` | Σ(quantity × costPrice) | Total inventory value at cost |
| `lowStockCount` | Items where qty ≤ minQty | Items needing reorder |
| `outOfStockCount` | Items where qty = 0 | Completely out of stock |

---

## 5. Stock Adjustment (POST /api/inventory)

### 5.1 Request Body

```json
{
  "productId": "product-uuid",
  "warehouseId": "warehouse-uuid",
  "locationId": "location-uuid",     // Optional
  "quantity": 10,                    // Amount to adjust (+ or -)
  "type": "in",                      // "in" or "out" (or "adjustment_in"/"adjustment_out")
  "notes": "Ajustement inventaire physique"
}
```

### 5.2 Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | string | ✅ Yes | Product to adjust |
| `warehouseId` | string | ✅ Yes | Target warehouse |
| `quantity` | number | ✅ Yes | Adjustment amount (absolute value) |
| `type` | string | No | Direction: `in`, `out`, `adjustment_in`, `adjustment_out` |
| `locationId` | string | No | Specific location within warehouse |
| `notes` | string | No | Reason for adjustment |

### 5.3 Processing Logic

```
1. Validate product exists
2. Validate warehouse exists
3. Determine direction:
   - type 'in' or 'adjustment_in' → Increase (positive)
   - type 'out' or 'adjustment_out' → Decrease (negative)
4. Find or create StockLevel record
5. Calculate new quantity = current + adjusted
6. NEGATIVE STOCK CHECK (M-07):
   - If newQty < 0:
     - If NEGATIVE_STOCK_POLICY != 'allow' → REJECT (409)
     - Else → Continue with warning
7. Update StockLevel:
   - quantity = newQty
   - availableQty = max(0, newQty - reservedQty)
8. Create StockMovement record
9. Return result
```

### 5.4 Negative Stock Prevention (M-07 FIX)

```typescript
// Configuration via environment variable
// Default: Prevent negative stock
if (newQty < 0) {
  console.warn(`[M-07] Stock adjustment would result in negative stock`);
  
  if (process.env.NEGATIVE_STOCK_POLICY !== 'allow') {
    return NextResponse.json({
      success: false,
      error: `Ajustement refusé: résulterait en un stock négatif`,
      code: 'NEGATIVE_STOCK_PREVENTED',
      details: {
        currentStock: currentQty,
        requestedAdjustment: adjustedQty,
        resultingStock: newQty
      }
    }, { status: 409 });  // Conflict
  }
}
```

### 5.5 Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "stockLevel": {
      "id": "uuid",
      "productId": "product-uuid",
      "warehouseId": "warehouse-uuid",
      "quantity": 160,
      "availableQty": 130
    },
    "movement": {
      "id": "uuid",
      "reference": "ADJ-IN-20250115-A1B2C3",
      "type": "in_adjustment",
      "quantity": 10,
      "unitCost": 5000,
      "totalCost": 50000,
      "date": "2025-01-15T11:00:00Z"
    }
  },
  "message": "Stock adjustment completed successfully"
}
```

---

## 6. Movement Reference Generation

### 6.1 Format

```
ADJ-{DIR}-{YYYYMMDD}-{XXXX}
```

Where:
- `ADJ` - Fixed prefix for adjustments
- `DIR` - `IN` (increase) or `OUT` (decrease)
- `YYYYMMDD` - Date of adjustment
- `XXXX` - Random alphanumeric (6 chars)

### 6.2 Examples

| Reference | Meaning |
|-----------|---------|
| `ADJ-IN-20250115-A1B2C3` | Stock increase on Jan 15, 2025 |
| `ADJ-OUT-20250115-X9Y8Z7` | Stock decrease on Jan 15, 2025 |

---

## 7. Stock Level Queries

### 7.1 Low Stock Filter

```
GET /api/inventory?lowStock=true
```

Returns all products where `quantity <= minQty`.

### 7.2 Search Functionality

Searches across multiple fields:
- Product name (French): `name`
- Product name (Arabic): `nameAr`
- Product code: `code`

```typescript
if (search) {
  productWhere.OR = [
    { name: { contains: search } },
    { nameAr: { contains: search } },
    { code: { contains: search } }
  ];
}
```

---

## 8. Security & Access Control

### 8.1 Authentication Requirements

| Operation | Auth Required | Roles Allowed |
|-----------|---------------|---------------|
| View stock levels | ✅ Yes | All authenticated users |
| Create adjustment | ✅ Yes | admin, manager, warehouse_manager |
| View movements | ✅ Yes | All authenticated users |

### 8.2 Audit Trail

Every stock change creates a permanent `StockMovement` record with:
- Timestamp
- User who made the change
- Previous and new quantities
- Reason/notes
- Reference to source document

---

## 9. Integration Points

### 9.1 Related Modules

| Module | Integration |
|--------|-------------|
| **Products** | Stock levels linked to product catalog |
| **Purchases** | Receipt creates stock-in movements |
| **Sales** | Delivery creates stock-out movements |
| **Production** | Raw material consumption & finished goods |
| **Warehouses** | Location-based tracking |

### 9.2 Stock Impact Events

| Event | Movement Type | Effect |
|-------|--------------|--------|
| Purchase Order Received | `in_purchase` | Increases stock |
| Sales Order Delivered | `out_sale` | Decreases stock |
| Production Completed | `in_production` | Increases finished goods |
| Production Started | `out_production` | Decreases raw materials |
| Manual Adjustment | `in_adjustment` / `out_adjustment` | User-defined |
| Customer Return | `in_return` | Increases stock |
| Damage/Loss | `out_damage` | Decreases stock |

---

## 10. Implementation Details

### 10.1 Source Files

| File | Purpose |
|------|---------|
| `src/app/api/inventory/route.ts` | Main CRUD & adjustments |
| `src/app/api/inventory/movements/route.ts` | Movement history |
| `src/app/api/inventory/stock-levels/route.ts` | Detailed queries |
| `src/app/api/inventory/adjustment/route.ts` | Dedicated adjustments |

### 10.2 Database Tables

| Table | Purpose |
|-------|---------|
| `StockLevel` | Current quantities per product/location |
| `StockMovement` | Historical movement records |
| `Product` | Product master data |
| `Warehouse` | Storage locations |
| `Location` | Bin/rack within warehouses |

### 10.3 Key Dependencies

```typescript
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';
```

### 10.4 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEGATIVE_STOCK_POLICY` | `deny` | Set to `allow` to permit negative stock |

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
