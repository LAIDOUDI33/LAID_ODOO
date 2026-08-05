// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow Engine Library
// Système d'Approbations - Factures/Congés/Achats/Paie
// ============================================================

import { db } from "./db";
import {
  WorkflowType,
  WorkflowStatus,
  StepStatus,
  ApprovalAction,
} from "@prisma/client";

// ============================================================
// Types
// ============================================================

export interface WorkflowDefinitionInput {
  name: string;
  description?: string;
  type: WorkflowType;
  companyId: string;
  priority?: number;
  maxAmount?: number;
  conditions?: Record<string, any>;
  steps: Omit<WorkflowStepInput, "definitionId">[];
}

export interface WorkflowStepInput {
  sequenceOrder: number;
  name: string;
  description?: string;
  approverType: "user" | "role" | "manager" | "department_head" | "specific_user";
  approverRole?: string;
  approverId?: string;
  department?: string;
  isOptional?: boolean;
  allowDelegation?: boolean;
  requireComment?: boolean;
  deadlineHours?: number;
  autoApprove?: boolean;
  onDeadlineExceeded?: "escalate" | "auto_approve" | "auto_reject";
}

export interface WorkflowInstanceInput {
  definitionId: string;
  initiatorId: string;
  entityType?: string;
  entityId?: string;
  entityReference?: string;
  amount?: number;
  title?: string;
  description?: string;
  requestReason?: string;
  initialData?: Record<string, any>;
}

export interface ApprovalInput {
  action: ApprovalAction;
  comment?: string;
  rejectedReason?: string;
  delegatedToId?: string;
  delegationNote?: string;
}

export interface WorkflowQueryOptions {
  status?: WorkflowStatus;
  type?: WorkflowType;
  initiatorId?: string;
  approverId?: string; // Workflows où l'utilisateur doit approuver
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// WORKFLOW DEFINITIONS
// ============================================================

/**
 * Créer une définition de workflow (template)
 */
export async function createWorkflowDefinition(input: WorkflowDefinitionInput) {
  const definition = await db.workflowDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      companyId: input.companyId,
      priority: input.priority || 5,
      maxAmount: input.maxAmount,
      conditions: input.conditions ? JSON.stringify(input.conditions) : null,
      steps: {
        create: input.steps.map((step) => ({
          sequenceOrder: step.sequenceOrder,
          name: step.name,
          description: step.description,
          approverType: step.approverType,
          approverRole: step.approverRole,
          approverId: step.approverId,
          department: step.department,
          isOptional: step.isOptional || false,
          allowDelegation: step.allowDelegation !== false,
          requireComment: step.requireComment || false,
          deadlineHours: step.deadlineHours,
          autoApprove: step.autoApprove || false,
          onDeadlineExceeded: step.onDeadlineExceeded || "escalate",
        })),
      },
    },
    include: { steps: true },
  });

  return { success: true, data: definition };
}

/**
 * Récupérer les définitions de workflow
 */
export async function getWorkflowDefinitions(companyId?: string) {
  const where: any = { isActive: true };
  if (companyId) where.companyId = companyId;

  const definitions = await db.workflowDefinition.findMany({
    where,
    include: { 
      steps: { orderBy: { sequenceOrder: "asc" } },
      company: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, data: definitions };
}

/**
 * Récupérer une définition par ID
 */
export async function getWorkflowDefinitionById(id: string) {
  const definition = await db.workflowDefinition.findUnique({
    where: { id },
    include: { 
      steps: { orderBy: { sequenceOrder: "asc" } },
      _count: { select: { instances: true } }
    },
  });

  if (!definition) {
    return { success: false, error: "Workflow definition not found" };
  }

  return { success: true, data: definition };
}

// ============================================================
// WORKFLOW INSTANCES (Exécution)
// ============================================================

/**
 * Générer une référence unique pour le workflow
 */
function generateWorkflowReference(type: WorkflowType): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 7).replace("-", ""); // YYYYMM
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  const prefix = type.toUpperCase().slice(0, 3); // INV, LEA, PUR, etc.
  
  return `WF-${prefix}-${dateStr}-${random}`;
}

/**
 * Créer une instance de workflow (démarrer un processus d'approbation)
 */
export async function createWorkflowInstance(input: WorkflowInstanceInput) {
  // Vérifier que la définition existe et est active
  const definition = await db.workflowDefinition.findUnique({
    where: { id: input.definitionId },
    include: { steps: { orderBy: { sequenceOrder: "asc" } } },
  });

  if (!definition || !definition.isActive) {
    return { success: false, error: "Workflow definition not found or inactive" };
  }

  // Créer l'instance
  const instance = await db.workflowInstance.create({
    data: {
      reference: generateWorkflowReference(definition.type),
      status: "pending",
      currentStep: 1,
      entityType: input.entityType,
      entityId: input.entityId,
      entityReference: input.entityReference,
      amount: input.amount || 0,
      title: input.title,
      description: input.description,
      requestReason: input.requestReason,
      initialData: input.initialData ? JSON.stringify(input.initialData) : null,
      initiatorId: input.initiatorId,
      definitionId: input.definitionId,
      submittedAt: new Date(),
      // Créer les approbations pour chaque étape
      approvals: {
        create: definition.steps.map((step) => ({
          stepSequence: step.sequenceOrder,
          status: step.sequenceOrder === 1 ? StepStatus.pending : undefined,
          deadlineAt: step.deadlineHours 
            ? new Date(Date.now() + step.deadlineHours * 60 * 60 * 1000)
            : undefined,
          assignedAt: step.sequenceOrder === 1 ? new Date() : undefined,
          stepId: step.id,
        })),
      },
    },
    include: {
      approvals: { include: { step: true } },
      definition: { include: { steps: true } },
      initiator: { select: { id: true, name: true, email: true } },
    },
  });

  // Assigner l'approbateur à la première étape
  await assignApproversToStep(instance.id, 1);

  // Mettre à jour le statut
  await db.workflowInstance.update({
    where: { id: instance.id },
    data: { status: "in_progress", lastActivityAt: new Date() },
  });

  return { success: true, data: instance };
}

/**
 * Assigner les approbateurs à une étape
 */
async function assignApproversToStep(instanceId: string, stepSequence: number) {
  const instance = await db.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { 
      approvals: { where: { stepSequence } },
      definition: { include: { steps: { where: { sequenceOrder: stepSequence } } } },
      initiator: true,
    },
  });

  if (!instance) return;

  const step = instance.definition.steps[0];
  if (!step) return;

  let approverId: string | null = null;
  let approverName: string | null = null;
  let approverRole: string | null = null;

  switch (step.approverType) {
    case "specific_user":
      approverId = step.approverId;
      break;

    case "role":
      // Trouver un utilisateur avec ce rôle dans la même entreprise
      const userByRole = await db.user.findFirst({
        where: {
          role: step.approverRole!,
          companyId: instance.initiator.companyId,
          isActive: true,
        },
      });
      approverId = userByRole?.id || null;
      approverRole = step.approverRole!;
      approverName = userByRole?.name || null;
      break;

    case "manager":
      // Trouver le manager de l'initiateur
      if (instance.initiatorId) {
        const employee = await db.employee.findFirst({
          where: { userId: instance.initiatorId },
          include: { manager: true },
        });
        if (employee?.managerId) {
          approverId = employee.managerId;
          approverName = employee.manager.firstName + " " + employee.manager.lastName;
        }
      }
      break;

    case "department_head":
      // Trouver le responsable du département
      if (step.department) {
        const deptHead = await db.user.findFirst({
          where: {
            role: { in: ["admin", "manager", "hr_manager"] },
            isActive: true,
          },
        });
        approverId = deptHead?.id || null;
        approverName = deptHead?.name || null;
      }
      break;

    default:
      // User par défaut - utiliser l'ID spécifié ou chercher admin
      if (step.approverId) {
        approverId = step.approverId;
      } else {
        const adminUser = await db.user.findFirst({
          where: { role: "admin", isActive: true },
        });
        approverId = adminUser?.id || null;
        approverName = adminUser?.name || null;
      }
  }

  // Mettre à jour l'approbation avec l'approbateur assigné
  if (approverId) {
    await db.workflowApproval.updateMany({
      where: {
        instanceId,
        stepSequence,
      },
      data: {
        approverId,
        approverName,
        approverRole,
      },
    });
  }
}

/**
 * Récupérer les instances de workflow
 */
export async function getWorkflowInstances(options: WorkflowQueryOptions = {}) {
  const where: any = {};

  if (options.status) where.status = options.status;
  if (options.initiatorId) where.initiatorId = options.initiatorId;
  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;

  // Filtrer par approbateur (joindre sur approvals)
  if (options.approverId) {
    where.approvals = {
      some: {
        approverId: options.approverId,
        status: StepStatus.pending,
      },
    };
  }

  const [instances, total] = await Promise.all([
    db.workflowInstance.findMany({
      where,
      include: {
        initiator: { select: { id: true, name: true, email: true, avatar: true } },
        definition: { select: { id: true, name: true, type: true } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true, email: true, avatar: true } },
            step: true,
          },
          orderBy: { stepSequence: "asc" },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    db.workflowInstance.count({ where }),
  ]);

  return {
    success: true,
    data: instances.map(inst => ({
      ...inst,
      initialData: inst.initialData ? JSON.parse(inst.initialData) : null,
    })),
    total,
    limit: options.limit || 20,
    offset: options.offset || 0,
  };
}

/**
 * Récupérer une instance par ID
 */
export async function getWorkflowInstanceById(id: string) {
  const instance = await db.workflowInstance.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, name: true, email: true, avatar: true } },
      definition: { 
        include: { 
          steps: { orderBy: { sequenceOrder: "asc" } },
          company: { select: { id: true, name: true } }
        } 
      },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true, avatar: true } },
          delegatedTo: { select: { id: true, name: true, email: true } },
          step: true,
        },
        orderBy: { stepSequence: "asc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!instance) {
    return { success: false, error: "Workflow instance not found" };
  }

  return {
    success: true,
    data: {
      ...instance,
      initialData: instance.initialData ? JSON.parse(instance.initialData) : null,
    },
  };
}

// ============================================================
// ACTIONS D'APPROBATION
// ============================================================

/**
 * Traiter une action d'approbation sur une étape
 */
export async function processApproval(
  instanceId: string,
  userId: string,
  input: ApprovalInput
) {
  // Récupérer l'instance
  const instance = await db.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      approvals: {
        where: { stepSequence: instance.currentStep }, // Étape actuelle
        include: { step: true },
      },
      definition: { include: { steps: { orderBy: { sequenceOrder: "asc" } } } },
    },
  });

  if (!instance) {
    return { success: false, error: "Workflow instance not found" };
  }

  if (instance.status === "completed" || instance.status === "cancelled") {
    return { success: false, error: "Workflow already completed or cancelled" };
  }

  const approval = instance.approvals[0];
  if (!approval) {
    return { success: false, error: "No approval found for current step" };
  }

  // Vérifier que l'utilisateur est l'approbateur
  if (approval.approverId !== userId && !approval.delegatedToId) {
    return { success: false, error: "You are not authorized to approve this step" };
  }

  // Vérifier si délégation
  if (approval.delegatedToId && approval.delegatedToId !== userId) {
    return { success: false, error: "This step has been delegated to another user" };
  }

  // Mettre à jour l'approbation
  let newStatus: StepStatus;
  switch (input.action) {
    case "approve":
      newStatus = StepStatus.approved;
      break;
    case "reject":
      newStatus = StepStatus.rejected;
      break;
    case "delegate":
      newStatus = StepStatus.delegated;
      break;
    default:
      newStatus = StepStatus.pending;
  }

  await db.workflowApproval.update({
    where: { id: approval.id },
    data: {
      status: newStatus,
      action: input.action,
      comment: input.comment,
      rejectedReason: input.rejectedReason,
      delegatedToId: input.delegatedToId,
      delegationNote: input.delegationNote,
      actionedAt: new Date(),
    },
  });

  // Déterminer la suite des opérations
  if (input.action === "approve") {
    // Passer à l'étape suivante ou terminer
    const nextStep = instance.currentStep + 1;
    const totalSteps = instance.definition.steps.length;

    if (nextStep > totalSteps) {
      // Workflow terminé avec succès
      await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: "approved",
          currentStep: nextStep - 1,
          completedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });
    } else {
      // Passer à l'étape suivante
      await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: "in_progress",
          currentStep: nextStep,
          lastActivityAt: new Date(),
        },
      });

      // Assigner les approbateurs à l'étape suivante
      await assignApproversToStep(instanceId, nextStep);
      
      // Marquer comme pending
      await db.workflowApproval.updateMany({
        where: { instanceId, stepSequence: nextStep },
        data: { status: StepStatus.pending, assignedAt: new Date() },
      });
    }
  } else if (input.action === "reject") {
    // Workflow rejeté
    await db.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: "rejected",
        completedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  } else if (input.action === "delegate") {
    // Mise à jour du statut mais reste en cours
    await db.workflowInstance.update({
      where: { id: instanceId },
      data: { lastActivityAt: new Date() },
    });
  }

  // Ajouter un commentaire si fourni
  if (input.comment) {
    await db.workflowComment.create({
      data: {
        content: `[${input.action.toUpperCase()}] ${input.comment}`,
        authorId: userId,
        instanceId,
      },
    });
  }

  // Retourner l'instance mise à jour
  return getWorkflowInstanceById(instanceId);
}

/**
 * Soumettre un commentaire sur un workflow
 */
export async function addWorkflowComment(
  instanceId: string,
  authorId: string,
  content: string,
  attachmentUrl?: string,
  attachmentName?: string
) {
  const comment = await db.workflowComment.create({
    data: {
      content,
      authorId,
      instanceId,
      attachmentUrl,
      attachmentName,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  // Mettre à jour lastActivityAt
  await db.workflowInstance.update({
    where: { id: instanceId },
    data: { lastActivityAt: new Date() },
  });

  return { success: true, data: comment };
}

/**
 * Annuler un workflow instance
 */
export async function cancelWorkflowInstance(
  instanceId: string,
  userId: string,
  reason?: string
) {
  const instance = await db.workflowInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    return { success: false, error: "Workflow instance not found" };
  }

  // Seul l'initiateur ou un admin peut annuler
  if (instance.initiatorId !== userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.role !== "admin" && user?.role !== "super_admin") {
      return { success: false, error: "Only the initiator or admin can cancel this workflow" };
    }
  }

  if (instance.status === "completed" || instance.status === "cancelled") {
    return { success: false, error: "Cannot cancel a completed or already cancelled workflow" };
  }

  await db.workflowInstance.update({
    where: { id: instanceId },
    data: {
      status: "cancelled",
      completedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  // Ajouter un commentaire d'annulation
  if (reason) {
    await db.workflowComment.create({
      data: {
        content: `[ANNULÉ] ${reason}`,
        authorId: userId,
        instanceId,
      },
    });
  }

  return { success: true, message: "Workflow cancelled successfully" };
}

// ============================================================
// STATISTIQUES WORKFLOW
// ============================================================

export interface WorkflowStats {
  totalInstances: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  pendingApprovals: number; // En attente d'action
  avgProcessingTime: number; // heures
  approvalRate: number; // % approuvé
  rejectionRate: number; // % rejeté
}

export async function getWorkflowStats(companyId?: string) {
  const where: any = {};
  if (companyId) {
    where.definition = { companyId };
  }

  const instances = await db.workflowInstance.findMany({
    where,
    include: { definition: true },
  });

  const stats: WorkflowStats = {
    totalInstances: instances.length,
    byStatus: {},
    byType: {},
    pendingApprovals: 0,
    avgProcessingTime: 0,
    approvalRate: 0,
    rejectionRate: 0,
  };

  let totalTime = 0;
  let completedCount = 0;

  for (const inst of instances) {
    // Par statut
    stats.byStatus[inst.status] = (stats.byStatus[inst.status] || 0) + 1;
    
    // Par type
    stats.byType[inst.definition.type] = (stats.byType[inst.definition.type] || 0) + 1;
    
    // Pending approvals
    if (inst.status === "in_progress" || inst.status === "pending") {
      stats.pendingApprovals++;
    }

    // Temps de traitement
    if (inst.submittedAt && inst.completedAt) {
      const hours = (inst.completedAt.getTime() - inst.submittedAt.getTime()) / (1000 * 60 * 60);
      totalTime += hours;
      completedCount++;
    }
  }

  // Calculs finaux
  if (completedCount > 0) {
    stats.avgProcessingTime = Math.round((totalTime / completedCount) * 10) / 10;
  }

  const approvedCount = stats.byStatus["approved"] || 0;
  const rejectedCount = stats.byStatus["rejected"] || 0;
  const totalDecisions = approvedCount + rejectedCount;
  
  if (totalDecisions > 0) {
    stats.approvalRate = Math.round((approvedCount / totalDecisions) * 100);
    stats.rejectionRate = Math.round((rejectedCount / totalDecisions) * 100);
  }

  return stats;
}
