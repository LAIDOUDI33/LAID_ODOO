# DELIVERABLE 14: Projects Module Documentation

**HASSIBA Suite ERP v2.0.0 - Final Certification Document**

---

## 1. Module Overview

The Projects module in HASSIBA Suite ERP provides project management capabilities integrated with the broader ERP system. It enables organizations to plan, execute, and monitor projects while maintaining financial control and resource allocation visibility.

### 1.1 Module Capabilities

| Feature | Description |
|---------|-------------|
| **Project Planning** | Create and structure projects with phases |
| **Task Management** | Break down projects into manageable tasks |
| **Resource Allocation** | Assign team members to projects/tasks |
| **Time Tracking** | Log hours against projects and tasks |
| **Budget Management** | Track project costs vs. budget |
| **Progress Monitoring** | Status tracking and reporting |

---

## 2. Data Models

### 2.1 Project

```typescript
interface Project {
  id: string;
  name: string;
  code: string;                 // Unique project code
  description?: string;
  
  // Customer/Partner
  partnerId?: string;           // Client for billable projects
  
  // Dates
  startDate: Date;
  endDate?: Date;
  actualEndDate?: Date;
  
  // Financial
  budgetAmount: number;
  actualCost: number;
  revenueRecognized: number;
  
  // Status
  status: ProjectStatus;        // planning, active, on_hold, completed, cancelled
  priority: ProjectPriority;    // low, medium, high, critical
  
  // Team
  projectManagerId: string;
  teamMembers: ProjectMember[];
  
  // Metadata
  tags?: string[];
  companyId: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Project Task

```typescript
interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  
  // Hierarchy
  parentId?: string;            // For sub-tasks
  
  // Assignment
  assigneeId?: string;
  
  // Scheduling
  startDate?: Date;
  dueDate?: date;
  completedAt?: Date;
  
  // Effort
  estimatedHours: number;
  actualHours: number;
  
  // Status
  status: TaskStatus;           // todo, in_progress, in_review, done, cancelled
  priority: TaskPriority;
  
  // Dependencies
  dependsOnIds: string[];       // Tasks that must complete first
  
  orderBy: number;              // Display order
}
```

### 2.3 Time Entry

```typescript
interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  employeeId: string;
  
  date: Date;
  hours: number;
  description?: string;
  
  // Billing
  isBillable: boolean;
  ratePerHour: number;
  totalAmount: number;          // hours × ratePerHour
  
  // Approval
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  
  createdAt: Date;
}
```

### 2.4 Status Enumerations

#### Project Status
| Status | Description |
|--------|-------------|
| `planning` | In planning phase |
| `active` | Work in progress |
| `on_hold` | Temporarily suspended |
| `completed` | Finished successfully |
| `cancelled` | Cancelled |

#### Task Status
| Status | Description |
|--------|-------------|
| `todo` | Not started |
| `in_progress` | Being worked on |
| `in_review` | Under review |
| `done` | Completed |
| `cancelled` | Cancelled |

---

## 3. API Operations

### 3.1 Project CRUD

While a dedicated projects endpoint may exist, project functionality is often integrated with other modules:

| Operation | Method | Description |
|-----------|--------|-------------|
| List projects | GET `/api/projects` | Get all projects (filtered) |
| Get project | GET `/api/projects/[id]` | Single project with tasks |
| Create project | POST `/api/projects` | New project |
| Update project | PUT `/api/projects/[id]` | Modify project |
| Delete project | DELETE `/api/projects/[id]` | Archive project |

### 3.2 Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `projectManagerId` | string | Filter by manager |
| `partnerId` | string | Filter by client |
| `dateFrom` | Date | Start date range |
| `dateTo` | Date | End date range |
| `search` | Search in name, code |

---

## 4. Project-ERP Integration

### 4.1 Financial Integration

| Integration Point | Description |
|-------------------|-------------|
| **Invoices** | Generate invoices from billable time |
| **Employees** | Link to employee records for time tracking |
| **Partners** | Link clients to projects |
| **Accounting** | Post project costs to general ledger |

### 4.2 Reporting Metrics

| Metric | Calculation |
|--------|-------------|
| `Budget Utilization` | Actual Cost / Budget × 100 |
| `Schedule Variance` | Actual End - Planned End |
| `Cost Variance` | Actual Cost - Budgeted Cost |
| `Billable Ratio` | Billable Hours / Total Hours |
| `Project Margin` | (Revenue - Cost) / Revenue × 100 |

---

## 5. Security & Access Control

### 5.1 Authentication Requirements

| Operation | Auth Required | Roles Allowed |
|-----------|---------------|---------------|
| View projects | ✅ Yes | All authenticated users |
| Create project | ✅ Yes | admin, manager, project_manager |
| Edit project | ✅ Yes | admin, manager, project_manager, project_member |
| Delete project | ✅ Yes | admin, manager |
| Log time | ✅ Yes | All authenticated (own entries) |
| Approve time | ✅ Yes | admin, manager, project_manager |

---

## 6. Implementation Notes

### 6.1 Source Files

| File | Purpose |
|------|---------|
| Project-related API routes | Project CRUD operations |
| Time tracking endpoints | Time entry management |

### 6.2 Database Tables

| Table | Purpose |
|-------|---------|
| `Project` | Project header data |
| `ProjectTask` | Work breakdown structure |
| `TimeEntry` | Time logging |
| `ProjectMember` | Team assignments |

---

*Document Version: 1.0*
*Last Updated: 2025*
*HASSIBA Suite ERP Certification*
