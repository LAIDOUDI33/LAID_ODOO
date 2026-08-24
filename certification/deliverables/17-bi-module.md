# HASSIBA Suite ERP - Business Intelligence (BI) Module

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D17)  
**Date:** January 2025  
**Source File:** `src/app/api/analytics/route.ts`  
**Lines of Code:** ~760 lines

---

## 1. Overview

The **Business Intelligence (BI) Module** provides real-time analytics and dashboard data for HASSIBA Suite ERP. It aggregates data from all modules to deliver:

- 📊 **Executive Dashboards** - High-level KPIs and metrics
- 💰 **Financial Analytics** - Revenue, expenses, cash flow
- 📈 **Sales Analytics** - Customer analysis, trends
- 📦 **Inventory Analytics** - Stock levels, movements
- 👥 **HR Analytics** - Workforce statistics
- 🏭 **Production Analytics** - OEE, quality metrics

---

## 2. Architecture

### 2.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BI ANALYTICS ENGINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  Dashboard  │  │  Financial  │  │    Sales    │            │
│   │   Data      │  │  Analytics  │  │  Analytics  │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          │                │                │                    │
│   ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│   │  Inventory  │  │     HR      │  │ Production  │            │
│   │  Analytics  │  │  Analytics  │  │  Analytics  │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          └────────────────┼────────────────┘                    │
│                             ▼                                   │
│                  ┌──────────────────┐                           │
│                  │  Prisma ORM      │                           │
│                  │  (Parallel Query) │                           │
│                  └────────┬─────────┘                           │
│                           ▼                                     │
│                  ┌──────────────────┐                           │
│                  │  Database        │                           │
│                  │  (SQLite/PG)     │                           │
│                  └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Retrieve analytics data by type |

---

## 3. Analytics Types

### 3.1 Available Types

| Type | Parameter | Description |
|------|-----------|-------------|
| Dashboard | `dashboard` | Complete executive overview |
| Financial | `financial` | Revenue, expenses, tax, banking |
| Sales | `sales` | Customer analysis, order trends |
| Inventory | `inventory` | Stock levels, values, alerts |
| HR | `hr` | Workforce, payroll, leave stats |
| Production | `production` | Work orders, OEE, quality |

### 3.2 Time Periods

| Period | Parameter | Date Range |
|--------|-----------|------------|
| Today | `today` | Current day from 00:00 |
| This Week | `week` | Monday to current day |
| This Month | `month` | 1st to current day (default) |
| This Quarter | `quarter` | Quarter start to now |
| This Year | `year` | January 1st to now |

---

## 4. Dashboard Analytics (`type=dashboard`)

### 4.1 Summary Metrics

```typescript
interface DashboardSummary {
  totalPartners: number;       // Active partners/clients
  totalProducts: number;       // Active products
  totalInvoices: number;       // Invoices this period
  ordersThisPeriod: number;    // Work orders this period
  totalEmployees: number;      // Active employees
}
```

### 4.2 KPIs

#### Financial KPIs
```typescript
interface FinancialKPIs {
  revenue: number;           // Total invoice amount
  expenses: number;          // Total bill amount
  profit: number;            // Revenue - Expenses
  margin: number;            // Profit % of revenue
  cashPosition: number;      // Paid in - Paid out
  accountsReceivable: number; // Unpaid invoices
  accountsPayable: number;   // Unpaid bills
}
```

#### Sales KPIs
```typescript
interface SalesKPIs {
  ordersValue: number;
  ordersCount: number;
  avgOrderValue: number;
  confirmed: number;         // Quotations confirmed
  delivered: number;         // Orders delivered
  invoiced: number;          // Orders invoiced
  cancelled: number;
  conversionRate: number;    // Quote → Order %
}
```

#### Inventory KPIs
```typescript
interface InventoryKPIs {
  totalProducts: number;
  totalStockValue: number;   // At cost price
  lowStockItems: number;     // Below minimum
  outOfStockItems: number;   // Zero stock
  inventoryTurnover: number; // Annual turns
  daysOfInventory: number;   // Days of stock on hand
}
```

#### HR KPIs
```typescript
interface HRKPIs {
  totalEmployees: number;
  monthlyPayroll: number;
  annualPayroll: number;
  turnoverRate: number;      // Annual %
  absenteeismRate: number;   // Absence %
}
```

#### Production KPIs
```typescript
interface ProductionKPIs {
  totalWorkOrders: number;
  completedThisMonth: number;
  inProgress: number;
  completionRate: number;    // Completed / Total %
}
```

### 4.3 Chart Data

```typescript
interface ChartData {
  revenueTrend: Array<{ month: string; revenue: number }>;  // 12 months
  salesByCategory: Array<{ category: string; value: number; percentage: number }>;
  topProducts: Array<{ name: string; value: number }>;       // Top 8 by quantity
  inventoryValue: Array<{ category: string; value: number; stock: number; count: number }>;
  workforceSummary: Array<{ department: string; count: number; percentage: number }>;
  productionOutput: {
    oee: number;              // Overall Equipment Effectiveness
    availability: number;    // % uptime
    performance: number;      % vs standard
    qualityRate: number;      // Pass rate %
  };
}
```

---

## 5. Financial Analytics (`type=financial`)

### 5.1 Response Structure

```typescript
interface FinancialAnalytics {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  cashPosition: number;
  tva: {
    collecte: number;        // TVA collected (sales)
    deductible: number;      // TVA deductible (purchases)
    aPayer: number;          // Net TVA payable
  };
  taxDeclarations: Array<{
    type: string;
    status: string;
    totalDue: number;
    totalPaid: number;
  }>;
  bankAccounts: Array<{
    name: string;
    bankName: string;
    balance: number;
  }>;
}
```

---

## 6. Sales Analytics (`type=sales`)

### 6.1 Response Structure

```typescript
interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  topCustomers: Array<{
    name: string;
    value: number;
    count: number;
  }>;                       // Top 10 customers
  statusBreakdown: Record<string, number>;
  monthlyTrend: Array<{ month: string; revenue: number; count: number }>;
  conversionRate: number;    // Quotation → Invoice %
}
```

---

## 7. Inventory Analytics (`type=inventory`)

### 7.1 Response Structure

```typescript
interface InventoryAnalytics {
  totalProducts: number;
  totalStockValue: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  lowStockAlerts: Array<{
    product: string;
    currentQty: number;
    minQty: number;
    warehouse: string;
  }>;                       // Top 10 alerts
  byCategory: Array<{ category: string; value: number; stock: number; count: number }>;
  byWarehouse: Array<{ warehouse: string; value: number; items: number }>;
  recentMovements: Array<{
    date: Date;
    product: string;
    type: string;
    quantity: number;
  }>;                       // Last 20 movements
}
```

---

## 8. HR Analytics (`type=hr`)

### 8.1 Response Structure

```typescript
interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;              // Net payable this month
  totalChargesPatronales: number;    // Employer contributions
  avgSalary: number;                 // Average net salary
  byContractType: Record<string, number>;
  byStatus: Record<string, number>;
  byDepartment: Array<{ department: string; count: number }>;
  leaveStats: Record<string, number>; // By leave type (days)
  hireThisMonth: number;             // New hires
}
```

---

## 9. Production Analytics (`type=production`)

### 9.1 Response Structure

```typescript
interface ProductionAnalytics {
  summary: {
    totalWorkCenters: number;
    activeWorkCenters: number;
    totalBOMs: number;
    totalWorkOrders: number;
  };
  workOrders: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byWorkCenter: Record<string, number>;
  };
  quality: {
    totalInspections: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;               // Percentage
  };
  oee: {
    overall: number;                // OEE % (0-100)
    availability: number;          // Uptime %
    performance: number;           // Speed %
    quality: number;               // Quality %
  };
  output: {
    byProduct: Array<{ name: string; quantity: number }>;
    dailyTrend: Array<{ date: string; planned: number; completed: number }>;
  };
  workCenters: Array<{
    name: string;
    type: string;
    capacity: number;
    efficiency: number;
  }>;
}
```

### 9.2 OEE Calculation

```
OEE = Availability × Performance × Quality / 10000

Where:
- Availability: % of planned production time (default: 95%)
- Performance: Actual vs planned output ratio
- Quality: Pass rate from QC inspections

Example:
  OEE = 95 × 92 × 97 / 10000 = 84.7%
```

---

## 10. API Usage Examples

### 10.1 Get Dashboard Data

```http
GET /api/analytics?type=dashboard&period=month
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "periodLabel": "Ce mois",
    "generatedAt": "2025-01-15T10:30:00Z",
    "summary": {
      "totalPartners": 145,
      "totalProducts": 520,
      "totalInvoices": 89,
      "ordersThisPeriod": 34,
      "totalEmployees": 75
    },
    "kpis": { ... },
    "charts": { ... }
  }
}
```

### 10.2 Get Financial Analytics for Quarter

```http
GET /api/analytics?type=financial&period=quarter
```

### 10.3 Get Production Analytics

```http
GET /api/analytics?type=production&period=month
```

---

## 11. Performance Optimization

### 11.1 Parallel Query Execution

All analytics use `Promise.all()` for parallel database queries:

```typescript
// Example: Dashboard data aggregation
const [partners, products, invoices, bills, employees, ...] = await Promise.all([
  db.partner.count({ where: { isActive: true } }),
  db.product.count({ where: { isActive: true } }),
  db.invoice.findMany({ where: { date: { gte: startDate, lte: endDate } } }),
  // ... more queries
]);
```

### 11.2 Query Best Practices

1. **Use selective fields** - Only query needed columns with `select`
2. **Filter by date range** - Always limit data by period
3. **Use aggregation** - Prefer `_count`, `_sum` over fetching all records
4. **Limit results** - Use `take()` for top-N queries
5. **Index utilization** - Queries leverage database indexes

---

## 12. Caching Strategy

### 12.1 Recommended Implementation

While not currently implemented, recommended caching:

| Data Type | Cache TTL | Strategy |
|-----------|-----------|----------|
| Dashboard summary | 5 minutes | Short-lived cache |
| Financial totals | 15 minutes | Medium cache |
| Historical trends | 1 hour | Longer cache |
| Real-time counts | No cache | Always fresh |

### 12.2 Cache Invalidation

Cache should be invalidated on:
- New invoice/bill creation
- Payroll generation
- Inventory movement
- Employee status change

---

## 13. Data Aggregation Helpers

### 13.1 Revenue Trend Generator

```typescript
function generateRevenueTrend(invoices): Array<{ month: string; revenue: number }>
// Returns 12-month rolling revenue trend
// Months abbreviated in French: Jan, Fév, Mar...
```

### 13.2 Top Products Aggregator

```typescript
async function getTopProducts(): Promise<Array<{ name: string; value: number }>>
// Returns top 8 products by quantity sold (from invoice lines)
```

### 13.3 Category-based Aggregation

```typescript
function generateInventoryByCategory(stockLevels, products): Array<{...}>
// Groups inventory value by product category
```

---

## 14. Integration Points

### 14.1 Data Sources

| Source Model | Analytics Used |
|--------------|----------------|
| `Partner` | Active partner count |
| `Product` | Product count, categories |
| `Invoice` | Revenue, sales trends |
| `Bill` | Expenses, payables |
| `Employee` | Workforce stats |
| `Payroll` | Payroll costs |
| `StockLevel` | Inventory values |
| `WorkOrder` | Production metrics |
| `QualityControl` | Quality rates |
| `BankAccount` | Cash position |

### 14.2 Consumers

| Consumer | Usage |
|----------|-------|
| Dashboard UI | Executive overview |
| Reports module | Scheduled reports |
| Export API | Data export |
| Alerts system | Threshold monitoring |

---

## 15. Future Enhancements (Planned)

- [ ] Custom date range selection
- [ ] Year-over-year comparisons
- [ ] Forecasting/predictive analytics
- [ ] Drill-down capabilities
- [ ] Real-time WebSocket updates
- [ ] Cached aggregation tables
- [ ] Multi-currency support
- [ ] Consolidated company reporting
- [ ] Export to Excel/PDF
- [ ] Scheduled report delivery

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
