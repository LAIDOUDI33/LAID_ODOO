# DELIVERABLE 7: Workflow Engine Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Overview

The HASSIBA Suite ERP implements a comprehensive workflow engine that automates business processes across the enterprise. The workflow system consists of three main components:

| Component | File | Purpose |
|-----------|------|---------|
| **Workflow Engine** | `src/lib/workflow-engine.ts` | Core execution engine for automated workflows |
| **Workflow Orchestrator** | `src/lib/workflow-orchestrator.ts` | End-to-end business process orchestration |
| **State Machine** | `src/lib/state-machine.ts` | Status transition enforcement for documents |

---

## 2. Workflow Definition Structure

### 2.1 Core Types

```typescript
// Workflow definition structure
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  type: WorkflowType;  // 'approval' | 'process' | 'notification'
  status: 'active' | 'draft' | 'archived';
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  config: WorkflowConfig;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;  // 'approval' | 'action' | 'condition' | 'notification'
  order: number;
  config: StepConfig;
  conditions?: ConditionGroup[];
  timeoutMs?: number;
  retryConfig?: RetryConfig;
}
```

### 2.2 Step Types

| Type | Description | Use Case |
|------|-------------|----------|
| `approval` | Requires user approval | Purchase orders, leave requests |
| `action` | Automated action | Stock updates, invoice generation |
| `condition` | Branching logic | Amount-based routing |
| `notification` | Send alerts | Email, in-app notifications |

### 2.3 Trigger Types

```typescript
interface WorkflowTrigger {
  type: 'manual' | 'event' | 'schedule' | 'webhook';
  eventType?: string;      // e.g., 'purchase_order.created'
  schedule?: string;       // Cron expression
  conditions?: ConditionGroup[];
}
```

---

## 3. Approval Chain Configuration

### 3.1 Multi-Level Approval System

The workflow engine supports hierarchical approval chains based on document value:

```
┌─────────────────────────────────────────────────────────────┐
│                  APPROVAL THRESHOLDS                        │
├─────────────────┬───────────────────┬───────────────────────┤
│ Level           │ Amount (DZD)      │ Required Role        │
├─────────────────┼───────────────────┼───────────────────────┤
│ None            │ < 100,000         │ Auto-approved         │
│ Manager         │ 100,000 - 499,999 │ manager              │
│ Director        │ 500,000 - 999,999 │ director             │
│ Executive       │ ≥ 1,000,000       │ gm/ceo               │
└─────────────────┴───────────────────┴───────────────────────┘
```

### 3.2 Approval Configuration (from Purchase Orders API)

```typescript
// Source: src/app/api/purchases/route.ts
const PO_APPROVAL_THRESHOLDS = {
  managerApproval: 100000,    // 100,000 DZD
  directorApproval: 500000,   // 500,000 DZD
  executiveApproval: 1000000, // 1,000,000 DZD
};

function getRequiredApprovalLevel(totalAmount: number): 
  'none' | 'manager' | 'director' | 'executive' {
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.executiveApproval) return 'executive';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.directorApproval) return 'director';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.managerApproval) return 'manager';
  return 'none';
}
```

### 3.3 Workflow Instance Creation

When a purchase order exceeds thresholds:

```typescript
// Automatic workflow instance creation
const workflowInstance = await db.workflowInstance.create({
  data: {
    definitionId: wfDefinition.id,
    initiatorId: user?.id,
    entityType: 'purchase_order',
    entityId: purchaseOrder.id,
    entityReference: purchaseOrder.reference,
    amount: totals.amountTotal,
    title: `Approbation commande d'achat ${purchaseOrder.reference}`,
    description: `Commande d'achat de ${totals.amountTotal} DZD`,
    status: 'pending',
    companyId: companyId
  }
});
```

---

## 4. State Machine Implementation

### 4.1 Document State Machines

The state machine enforces valid status transitions for all document types:

#### Invoice State Machine

```
                    ┌──────────────────────────────────────┐
                    │          INVOICE STATES              │
                    ├──────────────────────────────────────┤
                                                    ┌──────┴──────┐
                                                    ▼             │
┌──────┐    send    ┌──────┐   pay    ┌──────┐         ┌────────┐
│ draft│───────────▶│ sent │─────────▶│ paid │◀────────│partial │
└──────┘            └──────┘          └──────┘         └────────┘
  │  │                  │  │                              │
  │  │              cancel │                          cancel
  │  │                  ▼                              ▼
  │  │              ┌────────┐                      ┌──────────┐
  │  └─────────────▶│cancelled│                      │ overdue  │
  │                 └────────┘                      └──────────┘
  └────────────────────────────────────────────────────┘
                                                          │
                                                       cancel
                                                          ▼
                                                      ┌──────────┐
                                                      │ cancelled│
                                                      └──────────┘
```

**Valid Transitions:**
- `draft` → `sent`, `cancelled`
- `sent` → `draft`, `paid`, `partial`, `overdue`, `cancelled`
- `partial` → `paid`, `cancelled`
- `overdue` → `paid`, `cancelled`
- `paid`, `cancelled` → Terminal states

#### Sales Order State Machine

```
┌──────┐  confirm  ┌──────────┐  process  ┌───────────┐ deliver ┌─────────┐
│ draft│──────────▶│ confirmed│──────────▶│processing │────────▶│delivered │
└──────┘           └──────────┘           └───────────┘         └────┬────┘
  │                     │                                         │
  │cancel           cancel│                                     invoice
  ▼                     ▼                                         ▼
┌──────────┐        ┌──────────┐                            ┌────────┐
│ cancelled │        │ cancelled │                            │invoiced│
└──────────┘        └──────────┘                               └───┬────┘
                                                           done │
                                                               ▼
                                                           ┌──────┐
                                                           │ done │
                                                           └──────┘
```

#### Purchase Order State Machine

```
┌──────┐  confirm  ┌──────────┐  approve  ┌─────────┐ receive ┌────────┐
│ draft│──────────▶│confirmed │──────────▶│approved │────────▶│received│
└──────┘           └──────────┘           └─────────┘         └───┬────┘
  │                     │                                       │
  │cancel             cancel│                                 done
  ▼                     ▼                                       ▼
┌──────────┐        ┌──────────┐                            ┌──────┐
│ cancelled │        │ cancelled │                            │ done │
└──────────┘        └──────────┘                            └──────┘
```

#### Bill (Supplier Invoice) State Machine

```
┌──────┐  receive  ┌──────────┐  verify  ┌─────────┐ approve ┌──────┐ pay ┌──────┐
│ draft│──────────▶│ received │─────────▶│verified │────────▶│approved│────▶│ paid │
└──────┘           └──────────┘          └─────────┘         └──────┘     └──────┘
  │                     │                    │                   │
  │cancel             cancel│              draft              partial
  ▼                     ▼                    ▼                   ▼
┌──────────┐        ┌──────────┐        ┌──────────┐       ┌──────────┐
│ cancelled │        │ cancelled │        │ cancelled │       │ cancelled│
└──────────┘        └──────────┘        └──────────┘       └──────────┘
```

#### Leave Request State Machine

```
┌──────┐ submit  ┌──────────┐  approve   ┌──────────┐
│ draft│────────▶│submitted │───────────▶│ approved │
└──────┘         └──────────┘            └──────────┘
  │  │                │  │                    │
  │  │            draft│  │reject           cancel
  │  │                ▼  ▼                    ▼
  │  │           ┌──────────┐            ┌──────────┐
  │  └──────────▶│submitted │            │ cancelled│
  │              └──────────┘            └──────────┘
  │                                         
  └──────────────────────────────────────────▶ ┌──────────┐
                                               │ cancelled│
                                               └──────────┘
```

### 4.2 State Transition Validation API

```typescript
// Core validation function
export function validateTransition(
  documentType: string,
  currentStatus: string,
  newStatus: string,
  userRole?: string
): ValidationResult {
  // Returns:
  // { valid: boolean, error?: string, transition?, autoFields? }
}

// Get available next statuses
export function getNextValidStatuses(
  documentType: string,
  currentStatus: string
): Array<{ status: string; requiresApproval?: boolean; allowedRoles?: string[] }>

// Check terminal state
export function isTerminalStatus(documentType: string, status: string): boolean
```

### 4.3 Role-Based Transition Control

```typescript
// Example: Sales Order confirmation requires specific roles
{ 
  from: 'draft', 
  to: 'confirmed', 
  allowedRoles: ['admin', 'manager', 'sales_manager'] 
}

// Example: Bill verification restricted to finance
{
  from: 'received',
  to: 'verified',
  allowedRoles: ['admin', 'manager', 'accountant']
}
```

---

## 5. Escalation Rules

### 5.1 Timeout Configuration

```typescript
interface RetryConfig {
  maxRetries: number;      // Maximum retry attempts (default: 3)
  retryDelayMs: number;    // Delay between retries (default: 5000)
  backoffMultiplier: number; // Exponential backoff (default: 2)
}

interface StepConfig {
  timeoutMs: number;       // Step timeout (default: 30000ms)
  escalationAction?: string; // Action on timeout
  escalateTo?: string;      // Role or user to escalate to
  reminderIntervalMs?: number; // Reminder frequency
}
```

### 5.2 Engine Configuration

```typescript
export interface EngineConfig {
  maxExecutionTimeMs: number;   // 5 minutes (300000ms)
  maxStepsPerExecution: number; // 1000 steps
  defaultTimeoutMs: number;     // 30 seconds per step
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  maxExecutionTimeMs: 300000,
  maxStepsPerExecution: 1000,
  defaultTimeoutMs: 30000,
  enableLogging: true,
  logLevel: 'info'
};
```

---

## 6. Delegation Support

### 6.1 Execution Context

```typescript
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflowVersion: number;
  variables: Record<string, any>;
  triggerData?: Record<string, any>;
  startedAt: Date;
  config: EngineConfig;
  logs: ExecutionLogEntry[];
  currentStepIndex: number;
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
}
```

### 6.2 Delegation Features

The workflow engine supports:
- **Temporary delegation**: Assign approval to delegate during absence
- **Role-based delegation**: Automatic fallback to role members
- **Timeout escalation**: Auto-escalate when step times out

---

## 7. SLA Tracking

### 7.1 Execution Records

```typescript
interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  currentStepIndex: number;
  variables: Record<string, any>;
  error?: ExecutionError;
  results: StepExecutionResult[];
}
```

### 7.2 SLA Metrics Tracked

| Metric | Description |
|--------|-------------|
| `startedAt` | Workflow start timestamp |
| `completedAt` | Workflow completion timestamp |
| `durationMs` | Total execution time |
| `stepDuration` | Individual step timing |
| `status` | Final execution status |

---

## 8. Event Triggers

### 8.1 Supported Event Types

The orchestrator handles these business events:

| Event | Trigger | Action |
|-------|---------|--------|
| `quotation.converted` | Quotation → Sales Order | Create SO, reserve stock |
| `sales_order.confirmed` | SO Confirmed | Reserve inventory |
| `sales_order.delivered` | Delivery complete | Create invoice |
| `invoice.paid` | Payment received | Update accounting |
| `purchase_order.created` | New PO | Check approval threshold |
| `purchase_order.received` | Goods received | Update stock, create bill |

### 8.2 Workflow Orchestrator Functions

```typescript
// Main orchestration functions from workflow-orchestrator.ts

// Sales workflows
convertQuotationToSalesOrder(input: ConvertQuotationInput): Promise<WorkflowResult>
convertSalesOrderToInvoice(input: ConvertSalesOrderToInvoiceInput): Promise<WorkflowResult>

// Purchase workflows  
receivePurchaseOrder(input: ReceivePurchaseOrderInput): Promise<WorkflowResult>
convertBillToPayment(input: ConvertBillToPaymentInput): Promise<WorkflowResult>
```

### 8.3 Workflow Step Trace

```typescript
export interface WorkflowStepTrace {
  step: string;
  status: 'completed' | 'skipped' | 'failed';
  timestamp: Date;
  details?: string;
  entityId?: string;
}

export interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  workflowTrace: WorkflowStepTrace[];
}
```

---

## 9. Implementation Files Summary

| File | Lines | Key Exports |
|------|-------|-------------|
| `workflow-engine.ts` | ~1200 | `WorkflowEngine`, `ExecutionContext`, `EngineConfig` |
| `workflow-orchestrator.ts` | ~1800 | `convertQuotationToSalesOrder`, `receivePurchaseOrder`, etc. |
| `state-machine.ts` | ~233 | `validateTransition`, `getNextValidStatuses`, `isTerminalStatus` |

---

## 10. Security Considerations

1. **Authentication Required**: All workflow operations require authenticated users
2. **Role-Based Access**: Transitions can be restricted by role
3. **Audit Trail**: All state changes are logged
4. **Company Scoping**: Data isolated per company in multi-tenant mode

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
