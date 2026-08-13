// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow API
// Système d'Approbations
// ============================================================

import { NextResponse } from "next/server";
import {
  createWorkflowDefinition,
  getWorkflowDefinitions,
  getWorkflowDefinitionById,
  createWorkflowInstance,
  getWorkflowInstances,
  getWorkflowInstanceById,
  processApproval,
  addWorkflowComment,
  cancelWorkflowInstance,
  getWorkflowStats,
  // C-17 & C-18 FIX: Escalation and notification functions
  checkAndEscalate,
  sendDeadlineReminders,
  getWorkflowsApproachingDeadline,
  ESCALATION_TIMEOUTS,
} from "@/lib/workflow";
import { WorkflowType, WorkflowStatus, ApprovalAction } from "@prisma/client";
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/workflow - Récupérer les workflows (définitions ou instances)
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type");
    const status = searchParams.get("status") as WorkflowStatus | null;
    const definitionId = searchParams.get("definitionId");
    const instanceId = searchParams.get("id"); // Instance spécifique
    const initiatorId = searchParams.get("initiatorId");
    const approverId = searchParams.get("approverId");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Endpoint pour les statistiques
    if (searchParams.get("stats") === "true") {
      const stats = await getWorkflowStats();
      return NextResponse.json({ success: true, data: stats });
    }

    // C-17 FIX: Endpoint for escalation timeout configuration
    if (searchParams.get("timeouts") === "true") {
      return NextResponse.json({ 
        success: true, 
        data: { 
          timeouts: ESCALATION_TIMEOUTS,
          description: "Escalation timeouts in hours per workflow type"
        } 
      });
    }

    // C-17 FIX: Endpoint for checking workflows approaching deadline
    if (searchParams.get("approaching-deadline") === "true") {
      const hoursThreshold = parseInt(searchParams.get("threshold") || "4");
      const approaching = await getWorkflowsApproachingDeadline(hoursThreshold);
      return NextResponse.json({ success: true, data: approaching });
    }

    // Récupérer une instance spécifique
    if (instanceId) {
      const result = await getWorkflowInstanceById(instanceId);
      return NextResponse.json(result, result.success ? 200 : 404);
    }

    // Récupérer une définition spécifique
    if (definitionId) {
      const result = await getWorkflowDefinitionById(definitionId);
      return NextResponse.json(result, result.success ? 200 : 404);
    }

    // Si "type=definitions", retourner les définitions
    if (type === "definitions" || searchParams.get("definitions") === "true") {
      const result = await getWorkflowDefinitions();
      return NextResponse.json(result);
    }

    // Sinon, retourner les instances avec filtres
    const result = await getWorkflowInstances({
      status: status || undefined,
      type: type as WorkflowType | undefined,
      initiatorId: initiatorId || undefined,
      approverId: approverId || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Workflow GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

// POST /api/workflow - Créer une définition ou une instance
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for write operations
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();
    const { action, ...data } = body;

    // Créer une nouvelle instance de workflow
    if (action === "create_instance" || (!action && data.definitionId)) {
      const { definitionId, initiatorId, entityType, entityId, entityReference, amount, title, description, requestReason, initialData } = data;
      
      if (!definitionId || !initiatorId) {
        return NextResponse.json(
          { success: false, error: "definitionId and initiatorId are required to create an instance" },
          { status: 400 }
        );
      }

      const result = await createWorkflowInstance({
        definitionId,
        initiatorId,
        entityType,
        entityId,
        entityReference,
        amount,
        title,
        description,
        requestReason,
        initialData,
      });

      return NextResponse.json(result, result.success ? 201 : 400);
    }

    // Créer une nouvelle définition de workflow
    if (action === "create_definition" || (!action && data.name && data.type)) {
      const { name, description, type, companyId, priority, maxAmount, conditions, steps } = data;
      
      if (!name || !type || !companyId || !steps || steps.length === 0) {
        return NextResponse.json(
          { success: false, error: "name, type, companyId, and steps are required" },
          { status: 400 }
        );
      }

      const result = await createWorkflowDefinition({
        name,
        description,
        type,
        companyId,
        priority,
        maxAmount,
        conditions,
        steps,
      });

      return NextResponse.json(result, result.success ? 201 : 400);
    }

    // Action d'approbation
    if (action === "approve" || action === "reject" || action === "delegate") {
      const { instanceId, userId, comment, rejectedReason, delegatedToId, delegationNote } = data;
      
      if (!instanceId || !userId) {
        return NextResponse.json(
          { success: false, error: "instanceId and userId are required for approval actions" },
          { status: 400 }
        );
      }

      const result = await processApproval(instanceId, userId, {
        action: action === "delegate" ? ApprovalAction.delegate 
              : action === "reject" ? ApprovalAction.reject 
              : ApprovalAction.approve,
        comment,
        rejectedReason,
        delegatedToId,
        delegationNote,
      });

      return NextResponse.json(result);
    }

    // Ajouter un commentaire
    if (action === "comment") {
      const { instanceId, authorId, content, attachmentUrl, attachmentName } = data;
      
      if (!instanceId || !authorId || !content) {
        return NextResponse.json(
          { success: false, error: "instanceId, authorId, and content are required" },
          { status: 400 }
        );
      }

      const result = await addWorkflowComment(instanceId, authorId, content, attachmentUrl, attachmentName);
      return NextResponse.json(result, result.success ? 201 : 400);
    }

    // Annuler un workflow
    if (action === "cancel") {
      const { instanceId, userId, reason } = data;
      
      if (!instanceId || !userId) {
        return NextResponse.json(
          { success: false, error: "instanceId and userId are required to cancel" },
          { status: 400 }
        );
      }

      const result = await cancelWorkflowInstance(instanceId, userId, reason);
      return NextResponse.json(result);
    }

    // C-17 FIX: Check and escalate expired approvals
    if (action === "check_escalation" || action === "escalate") {
      const { instanceId: escalateInstanceId } = data;
      
      // Require admin or manager role for escalation checks
      const escalateAuthError = await requireRole(request, ['admin', 'manager']);
      if (escalateAuthError) return escalateAuthError;

      try {
        const result = await checkAndEscalate(escalateInstanceId);
        return NextResponse.json({ success: true, data: result });
      } catch (error) {
        console.error("Escalation check error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to perform escalation check" },
          { status: 500 }
        );
      }
    }

    // C-17/C-18 FIX: Send deadline reminder notifications
    if (action === "send_reminders") {
      const { threshold } = data;
      
      // Require admin role for sending reminders
      const reminderAuthError = await requireRole(request, ['admin', 'manager']);
      if (reminderAuthError) return reminderAuthError;

      const result = await sendDeadlineReminders(threshold || 4);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid or missing action parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Workflow POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process workflow request" },
      { status: 500 }
    );
  }
}
