# DELIVERABLE 12: Manufacturing Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The Manufacturing (Production) module in HASSIBA Suite ERP provides comprehensive production management capabilities including work order management, Bill of Materials (BOM) handling, work center tracking, and production costing. The module is designed for Algerian manufacturing operations with full cost tracking and WIP (Work In Progress) monitoring.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Work Orders** | Create and track production orders |
| **Bill of Materials** | Define product recipes/components |
| **Work Centers** | Manage production resources/capacity |
| **Production Costing** | Track material, labor, and overhead costs |
| **WIP Tracking** | Monitor work in progress (H-22) |
| **Quality Control** | Production quality checks |
| **BOM Explosion** | Automatic component requirements (H-23) |

### 1.2 Implemented Fixes

| Fix ID | Description |
|--------|-------------|
| H-20 | Costing Automation - Automatic cost calculation |
| H-21 | Labor Cost Integration - Work center hourly rates |
| H-22 | WIP Tracking - Work in progress monitoring |
| H-23 | BOM Explosion - Component requirement calculation |
| M-11 | WorkCenter.hourlyCost in production calculations |

---

## 2. API Endpoints

### 2.1 Primary Endpoint

```
/api/production
```

### 2.2 Operations

| Method | Type Parameter | Description |
|--------|----------------|-------------|
| GET | `dashboard` (default) | Full production dashboard |
| GET | `kpis` | Production KPIs only |
| GET | `work-orders` | List work orders |
| GET | `work-centers` | List work centers |
| GET | `boms` | List bill of materials |
| POST | (body action) | Create work order or BOM |

### 2.3 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/production/quality` | Quality control operations |
| `/api/inventory` | Stock movements from production |

---

## 3. Data Models

### 3.1 Work Order (Ordre de Fabrication)

```typescript
interface WorkOrder {
  id: string;
  reference: string;           // Auto-generated
  
  // Product
  productId: string;
  product?: Product;
  
  // Quantities
  quantityPlanned: number;     // Planned quantity
  quantityProduced: number;    // Actual produced
  quantityScrapped: number;    // Scrapped/waste
  
  // Status
  status: WorkOrderStatus;     // draft, confirmed, in_progress, completed, cancelled
  
  // Scheduling
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Costing (H-20, H-21)
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  
  // Relations
  bomId?: string;
  workCenterId?: string;
  
  // Metadata
  notes?: string;
  companyId: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Bill of Materials (Nomenclature)

```typescript
interface BillOfMaterials {
  id: string;
  name: string;
  productId: string;           // Finished product
  version: number;
  isActive: boolean;
  
  // Components
  lines: BOMLine[];
  
  // Metadata
  companyId: string;
  createdAt: Date;
}

interface BOMLine {
  id: string;
  bomId: string;
  productId: string;           // Component product
  quantity: number;            // Quantity per finished unit
  unitOfMeasure?: string;
  scrapFactor?: number;        // Expected waste %
  notes?: string;
}
```

### 3.3 Work Center (Centre de Travail)

```typescript
interface WorkCenter {
  id: string;
  name: string;
  code: string;
  type: WorkCenterType;        // machine, assembly, packing, quality, other
  
  // Capacity
  capacityPerDay: number;
  efficiencyFactor: number;    // 0-100%
  
  // Costing (M-11, H-21)
  hourlyCost: number;          // Cost per hour (DZD)
  overheadRate: number;        // Overhead multiplier
  
  // Location
  location?: string;
  
  // Status
  isActive: boolean;
  
  companyId: string;
}
```

### 3.4 Status Enumerations

#### Work Order Status
| Status | Description |
|--------|-------------|
| `draft` | Initial state, editable |
| `confirmed` | Planned, ready to start |
| `in_progress` | Currently producing |
| `completed` | Finished |
| `cancelled` | Cancelled |

#### Work Center Type
| Type | Description |
|------|-------------|
| `machine` | Machine/equipment |
| `assembly` | Assembly station |
| `packing` | Packing area |
| `quality` | QC inspection point |
| `other` | Other type |

---

## 4. API Operations

### 4.1 GET /api/production?type=dashboard

Returns comprehensive production dashboard data:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalWorkOrders": 25,
      "activeOrders": 8,
      "completedThisMonth": 12,
      "completionRate": 85
    },
    "workOrders": [...],
    "workCenters": [...],
    "recentActivity": [...],
    "alerts": [
      {
        "type": "delayed",
        "message": "OF-2025-003 en retard",
        "workOrderId": "uuid"
      }
    ]
  }
}
```

### 4.2 GET /api/production?type=kpis

Returns production KPIs:

```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "completedOrders": 120,
    "inProgressOrders": 15,
    "pendingOrders": 15,
    "completionRate": 80,
    "onTimeDeliveryRate": 92,
    "averageCycleTime": 5.2,
    "totalProducedQty": 10000,
    "totalScrapRate": 2.5,
    "utilizationRate": 78,
    "overtimeHours": 45,
    "materialEfficiency": 95,
    "laborProductivity": 1.2
  }
}
```

### 4.3 GET /api/production?type=work-orders

Query Parameters:
| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status |
| `workCenterId` | Filter by work center |
| `dateFrom` | Start date filter |
| `dateTo` | End date filter |

### 4.4 GET /api/production?type=boms

Query Parameters:
| Parameter | Description |
|-----------|-------------|
| `productId` | Filter by finished product |
| `isActive` | Show only active BOMs |

### 4.5 GET /api/production?type=work-centers

Returns all active work centers with capacity info.

---

## 5. Production Costing System (H-20, H-21, M-11)

### 5.1 Cost Components

```
TOTAL PRODUCTION COST
├── Material Cost
│   └── Σ(Components × Unit Cost × Quantity)
├── Labor Cost (H-21)
│   └── Work Hours × WorkCenter.hourlyCost (M-11)
└── Overhead Cost
    └── Labor Cost × Overhead Rate
```

### 5.2 Work Center Cost Application

```typescript
// From M-11 FIX: WorkCenter.hourlyCost applied in calculations
interface WorkCenterCostCalculation {
  workCenterId: string;
  hourlyCost: number;          // DZD per hour
  hoursWorked: number;
  efficiencyFactor: number;   // 0-100%
  
  // Calculated
  laborCost: number;          = hoursWorked × hourlyCost
  effectiveHours: number;     = hoursWorked × (efficiencyFactor / 100)
  overheadCost: number;       = laborCost × overheadRate
}
```

### 5.3 Cost Rollup Example

```
Work Order: Produce 100 units of Product A

MATERIAL COST:
├── Component X: 50 units × 100 DZD = 5,000 DZD
├── Component Y: 200 units × 50 DZD = 10,000 DZD
└── Total Material: 15,000 DZD

LABOR COST (H-21):
├── Assembly WC: 8 hours × 500 DZD/hour = 4,000 DZD
├── Packing WC: 2 hours × 300 DZD/hour = 600 DZD
└── Total Labor: 4,600 DZD

OVERHEAD COST:
└── 4,600 DZD × 20% overhead rate = 920 DZD

TOTAL PRODUCTION COST: 20,520 DZD
COST PER UNIT: 205.20 DZD
```

---

## 6. BOM Explosion (H-23)

### 6.1 Purpose

Automatically calculate component requirements for a production run based on the Bill of Materials.

### 6.2 Calculation Logic

```
For each BOM line:
  Required Qty = (Planned Quantity × BOM Line Quantity) × (1 + Scrap Factor)

Example:
  Work Order: Produce 100 units
  BOM Line: 2 components per unit, 5% scrap factor
  
  Required = 100 × 2 × 1.05 = 210 components
```

### 6.3 Multi-Level BOM Support

The system supports nested BOMs where components can themselves be manufactured items:

```
Finished Product A
├── Component B (purchased)
├── Component C (purchased)
└── Sub-Assembly D (manufactured)
    ├── Component E (purchased)
    └── Component F (purchased)
```

---

## 7. WIP Tracking (H-22)

### 7.1 Tracked Metrics

| Metric | Description |
|--------|-------------|
| `quantityInWIP` | Units currently in production |
| `wipValue` | Value of WIP inventory |
| `wipAge` | Days since production started |
| `stageCurrent` | Current production stage |

### 7.2 WIP Status Updates

WIP is automatically updated when:
- Work order moves to `in_progress` → WIP increases
- Work order completes → WIP decreases, finished goods increase
- Work order scraps → WIP decreases, scrap recorded

---

## 8. Quality Control

### 8.1 Quality Checkpoints

Quality control is integrated via `/api/production/quality` endpoint:

| Checkpoint | Timing | Actions |
|------------|--------|---------|
| Incoming QC | Before production start | Verify raw materials |
| In-Process QC | During production | Spot checks |
| Final QC | After completion | Verify finished goods |

### 8.2 Quality Data Tracked

```typescript
interface QualityCheck {
  id: string;
  workOrderId: string;
  checkpoint: 'incoming' | 'in_process' | 'final';
  result: 'pass' | 'fail' | 'conditional';
  defectsFound?: number;
  inspectorId?: string;
  notes?: string;
  checkedAt: Date;
}
```

---

## 9. Security & Access Control

### 9.1 Authentication Requirements

| Operation | Auth Required | Roles Allowed |
|-----------|---------------|---------------|
| View dashboard/KPIs | ✅ Yes | All authenticated users |
| View work orders | ✅ Yes | All authenticated users |
| Create work order | ✅ Yes | admin, manager, production_manager |
| Edit BOM | ✅ Yes | admin, manager, production_manager |
| Update work order | ✅ Yes | admin, manager, production_manager |

---

## 10. Production Process Flow

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│ CREATE WO   │───▶│ CONFIRM WO  │───▶│ START PROD.  │
│ (Draft)     │    │             │    │ (In Progress)│
└─────────────┘    └─────────────┘    └──────┬───────┘
                                               │
                    ┌──────────────────────────┘
                    │
              ┌─────▼──────┐
              │ COMPLETE   │
              │ (Finished) │
              └─────┬──────┘
                    │
        ┌───────────┼───────────┐
        ▼                       ▼
┌───────────────┐        ┌───────────────┐
│ TO STOCK      │        │ SCRAP         │
│ (FG +, RM -)  │        │ (Write-off)   │
└───────────────┘        └───────────────┘
```

---

## 11. Implementation Details

### 11.1 Source Files

| File | Purpose |
|------|---------|
| `src/app/api/production/route.ts` | Main production API |
| `src/app/api/production/quality/route.ts` | Quality control API |

### 11.2 Database Tables

| Table | Purpose |
|-------|---------|
| `WorkOrder` | Production orders |
| `BillOfMaterials` | Product recipes |
| `BOMLine` | BOM components |
| `WorkCenter` | Production resources |

### 11.3 Key Dependencies

```typescript
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';
```

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
