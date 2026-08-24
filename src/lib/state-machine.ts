// ============================================================
// HASSIBA Suite ERP - State Machine Utility
// Enforces valid status transitions for all document types
// ============================================================

export interface StateTransition {
  from: string;
  to: string;
  allowedRoles?: string[]; // If empty, any authenticated user with access can do it
  requireApproval?: boolean;
  autoTimestamps?: Record<string, string>; // Field to set automatically
}

export interface DocumentStateMachine {
  documentType: string;
  initialStatus: string;
  terminalStatuses: string[];
  transitions: StateTransition[];
  validStatuses: string[];
}

// Define state machines for each document type

export const INVOICE_STATE_MACHINE: DocumentStateMachine = {
  documentType: 'Invoice',
  initialStatus: 'draft',
  terminalStatuses: ['paid', 'cancelled'],
  validStatuses: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
  transitions: [
    { from: 'draft', to: 'sent', autoTimestamps: { sentAt: 'now' } },
    { from: 'draft', to: 'cancelled' },
    { from: 'sent', to: 'draft' }, // Allow recall
    { from: 'sent', to: 'paid', autoTimestamps: { paidAt: 'now' } },
    { from: 'sent', to: 'partial' },
    { from: 'sent', to: 'overdue' }, // System auto-transition
    { from: 'sent', to: 'cancelled' },
    { from: 'partial', to: 'paid', autoTimestamps: { paidAt: 'now' } },
    { from: 'partial', to: 'cancelled' },
    { from: 'overdue', to: 'paid', autoTimestamps: { paidAt: 'now' } },
    { from: 'overdue', to: 'cancelled' },
  ]
};

export const SALES_ORDER_STATE_MACHINE: DocumentStateMachine = {
  documentType: 'SalesOrder',
  initialStatus: 'draft',
  terminalStatuses: ['done', 'cancelled'],
  validStatuses: ['draft', 'confirmed', 'processing', 'delivered', 'invoiced', 'done', 'cancelled'],
  transitions: [
    { from: 'draft', to: 'confirmed', allowedRoles: ['admin', 'manager', 'sales_manager'] },
    { from: 'draft', to: 'cancelled' },
    { from: 'confirmed', to: 'draft' },
    { from: 'confirmed', to: 'processing' },
    { from: 'confirmed', to: 'cancelled' },
    { from: 'processing', to: 'delivered', autoTimestamps: { deliveredAt: 'now' } },
    { from: 'processing', to: 'cancelled' },
    { from: 'delivered', to: 'invoiced' },
    { from: 'invoiced', to: 'done' },
  ]
};

export const PURCHASE_ORDER_STATE_MACHINE: DocumentStateMachine = {
  documentType: 'PurchaseOrder',
  initialStatus: 'draft',
  terminalStatuses: ['done', 'cancelled'],
  validStatuses: ['draft', 'confirmed', 'approved', 'received', 'done', 'cancelled'],
  transitions: [
    { from: 'draft', to: 'confirmed' },
    { from: 'draft', to: 'cancelled' },
    { from: 'confirmed', to: 'draft' },
    { from: 'confirmed', to: 'approved', requireApproval: true },
    { from: 'confirmed', to: 'cancelled' },
    { from: 'approved', to: 'received', autoTimestamps: { receivedAt: 'now' } },
    { from: 'approved', to: 'cancelled' },
    { from: 'received', to: 'done' },
  ]
};

export const BILL_STATE_MACHINE: DocumentStateMachine = {
  documentType: 'Bill',
  initialStatus: 'draft',
  terminalStatuses: ['paid', 'cancelled'],
  validStatuses: ['draft', 'received', 'verified', 'approved', 'paid', 'partial', 'cancelled'],
  transitions: [
    { from: 'draft', to: 'received', autoTimestamps: { receivedAt: 'now' } },
    { from: 'draft', to: 'cancelled' },
    { from: 'received', to: 'verified', allowedRoles: ['admin', 'manager', 'accountant'] },
    { from: 'received', to: 'cancelled' },
    { from: 'verified', to: 'approved', requireApproval: true },
    { from: 'verified', to: 'draft' },
    { from: 'approved', to: 'paid', autoTimestamps: { paidAt: 'now' } },
    { from: 'approved', to: 'partial' },
    { from: 'approved', to: 'cancelled' },
    { from: 'partial', to: 'paid', autoTimestamps: { paidAt: 'now' } },
  ]
};

export const LEAVE_REQUEST_STATE_MACHINE: DocumentStateMachine = {
  documentType: 'LeaveRequest',
  initialStatus: 'draft',
  terminalStatuses: ['approved', 'rejected', 'cancelled'],
  validStatuses: ['draft', 'submitted', 'approved', 'rejected', 'cancelled'],
  transitions: [
    { from: 'draft', to: 'submitted', autoTimestamps: { submittedAt: 'now' } },
    { from: 'draft', to: 'cancelled' },
    { from: 'submitted', to: 'draft' }, // Allow editing
    { from: 'submitted', to: 'approved', allowedRoles: ['admin', 'manager', 'hr_manager'], autoTimestamps: { approvedAt: 'now' } },
    { from: 'submitted', to: 'rejected', allowedRoles: ['admin', 'manager', 'hr_manager'], autoTimestamps: { rejectedAt: 'now' } },
    { from: 'submitted', to: 'cancelled' },
    { from: 'approved', to: 'cancelled' }, // Cancellation of approved leave
  ]
};

// Registry of all state machines
export const STATE_MACHINES: Record<string, DocumentStateMachine> = {
  invoice: INVOICE_STATE_MACHINE,
  salesOrder: SALES_ORDER_STATE_MACHINE,
  purchaseOrder: PURCHASE_ORDER_STATE_MACHINE,
  bill: BILL_STATE_MACHINE,
  leaveRequest: LEAVE_REQUEST_STATE_MACHINE,
};

// ============================================================
// State Machine Functions
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  transition?: StateTransition;
  autoFields?: Record<string, Date>;
}

/**
 * Validate a status transition
 */
export function validateTransition(
  documentType: string,
  currentStatus: string,
  newStatus: string,
  userRole?: string
): ValidationResult {
  const machine = STATE_MACHINES[documentType];
  if (!machine) {
    return { valid: false, error: `Unknown document type: ${documentType}` };
  }

  // Check if new status is valid
  if (!machine.validStatuses.includes(newStatus)) {
    return { 
      valid: false, 
      error: `Invalid status '${newStatus}' for ${documentType}. Valid statuses: ${machine.validStatuses.join(', ')}` 
    };
  }

  // Check if current status is valid
  if (!machine.validStatuses.includes(currentStatus)) {
    return { 
      valid: false, 
      error: `Invalid current status '${currentStatus}' for ${documentType}` 
    };
  }

  // Same status - allow (no-op)
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Find the transition
  const transition = machine.transitions.find(
    t => t.from === currentStatus && t.to === newStatus
  );

  if (!transition) {
    return { 
      valid: false, 
      error: `Invalid transition from '${currentStatus}' to '${newStatus}' for ${documentType}.` 
    };
  }

  // Check role-based access
  if (transition.allowedRoles && userRole && !transition.allowedRoles.includes(userRole)) {
    return { 
      valid: false, 
      error: `Transition from '${currentStatus}' to '${newStatus}' requires one of roles: ${transition.allowedRoles.join(', ')}` 
    };
  }

  // Calculate auto-timestamps
  const autoFields: Record<string, Date> = {};
  if (transition.autoTimestamps) {
    for (const [field, value] of Object.entries(transition.autoTimestamps)) {
      if (value === 'now') {
        autoFields[field] = new Date();
      }
    }
  }

  return { 
    valid: true, 
    transition,
    autoFields 
  };
}

/**
 * Get all valid next statuses for a document in its current state
 */
export function getNextValidStatuses(
  documentType: string,
  currentStatus: string
): Array<{ status: string; requiresApproval?: boolean; allowedRoles?: string[] }> {
  const machine = STATE_MACHINES[documentType];
  if (!machine) return [];

  return machine.transitions
    .filter(t => t.from === currentStatus)
    .map(t => ({
      status: t.to,
      requiresApproval: t.requireApproval,
      allowedRoles: t.allowedRoles,
    }));
}

/**
 * Check if a status is terminal (no further transitions possible)
 */
export function isTerminalStatus(documentType: string, status: string): boolean {
  const machine = STATE_MACHINES[documentType];
  if (!machine) return false;
  return machine.terminalStatuses.includes(status);
}
