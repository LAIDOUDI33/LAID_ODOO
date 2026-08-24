// ============================================================
// HASSIBA SUITE ERP - Workflow API (Individual Operations)
// GET, PUT, DELETE /api/workflows/[id]
// POST /api/workflows/[id]/activate
// POST /api/workflows/[id]/deactivate
// POST /api/workflows/[id]/execute
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';
import { v4 as uuidv4 } from 'uuid';
import { 
  Workflow, 
  WorkflowStatus,
  ExecutionRecord 
} from '@/lib/types/workflow';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// Helper Functions
// ============================================================

async function parseWorkflowFromDB(dbWorkflow: any): Promise<Workflow> {
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    description: dbWorkflow.description || '',
    status: dbWorkflow.status as WorkflowStatus,
    category: dbWorkflow.category,
    trigger: JSON.parse(dbWorkflow.trigger),
    steps: JSON.parse(dbWorkflow.steps),
    variables: dbWorkflow.variables ? JSON.parse(dbWorkflow.variables) : [],
    settings: dbWorkflow.settings ? JSON.parse(dbWorkflow.settings) : {},
    version: dbWorkflow.version,
    executionHistory: [],
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
    createdBy: dbWorkflow.createdBy,
    lastExecutedAt: dbWorkflow.lastExecutedAt
  };
}

function generateExecutionReference(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AUTO-${dateStr}-${random}`;
}

// ============================================================
// GET /api/workflows/[id] - Get workflow details
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    
    const workflow = await db.automationWorkflow.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            reference: true,
            status: true,
            triggerType: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
            errorMessage: true
          }
        },
        _count: {
          select: { executions: true }
        }
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const parsedWorkflow = await parseWorkflowFromDB(workflow);

    return NextResponse.json({
      success: true,
      data: {
        ...parsedWorkflow,
        creator: workflow.creator,
        executions: workflow.executions,
        executionCount: workflow._count.executions
      }
    });

  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/workflows/[id] - Update workflow
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for write operations
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const { id } = await params;
    const body = await request.json();

    // Check if workflow exists
    const existingWorkflow = await db.automationWorkflow.findUnique({
      where: { id }
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      version: existingWorkflow.version + 1
    };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.trigger !== undefined) updateData.trigger = JSON.stringify(body.trigger);
    if (body.steps !== undefined) updateData.steps = JSON.stringify(body.steps);
    if (body.variables !== undefined) updateData.variables = body.variables ? JSON.stringify(body.variables) : null;
    if (body.settings !== undefined) updateData.settings = body.settings ? JSON.stringify(body.settings) : null;
    if (body.tags !== undefined) updateData.tags = body.tags ? JSON.stringify(body.tags) : null;
    if (body.icon !== undefined) updateData.icon = body.icon;

    // Update the workflow
    const updatedWorkflow = await db.automationWorkflow.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const parsedWorkflow = await parseWorkflowFromDB(updatedWorkflow);

    // Validate if requested
    let validation = null;
    if (body.validate === true) {
      validation = workflowEngine.validateWorkflow(parsedWorkflow);
    }

    return NextResponse.json({
      success: true,
      data: parsedWorkflow,
      validation,
      message: 'Workflow updated successfully'
    });

  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/workflows/[id] - Delete workflow
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for delete operations
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const { id } = await params;

    // Check if workflow exists
    const existingWorkflow = await db.automationWorkflow.findUnique({
      where: { id }
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of active workflows
    if (existingWorkflow.status === 'active') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete an active workflow. Please deactivate it first.' },
        { status: 400 }
      );
    }

    // Delete the workflow (cascade will handle executions)
    await db.automationWorkflow.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/workflows/[id]/activate - Activate workflow
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for status changes
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const action = body.action; // 'activate', 'deactivate', 'archive', 'restore'

    // Check if workflow exists
    const existingWorkflow = await db.automationWorkflow.findUnique({
      where: { id }
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    let newStatus: WorkflowStatus;
    let message: string;

    switch (action) {
      case 'activate':
        // Validate before activating
        const workflow = await parseWorkflowFromDB(existingWorkflow);
        const validation = workflowEngine.validateWorkflow(workflow);
        
        if (!validation.isValid) {
          return NextResponse.json({
            success: false,
            error: 'Workflow validation failed',
            validation
          }, { status: 400 });
        }

        newStatus = 'active';
        message = 'Workflow activated successfully';
        break;

      case 'deactivate':
        newStatus = 'paused';
        message = 'Workflow deactivated successfully';
        break;

      case 'archive':
        newStatus = 'archived';
        message = 'Workflow archived successfully';
        break;

      case 'restore':
        newStatus = 'draft';
        message = 'Workflow restored successfully';
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    // Update status
    const updatedWorkflow = await db.automationWorkflow.update({
      where: { id },
      data: { status: newStatus }
    });

    return NextResponse.json({
      success: true,
      data: { status: newStatus },
      message
    });

  } catch (error) {
    console.error('Error updating workflow status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow status' },
      { status: 500 }
    );
  }
}

// Special handling for POST requests to this endpoint (execute)
// We'll use a query parameter to differentiate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for workflow actions
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'execute') {
      return await executeWorkflow(request, id);
    }

    if (action === 'duplicate') {
      return await duplicateWorkflow(id);
    }

    if (action === 'validate') {
      return await validateWorkflow(id);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: execute, duplicate, or validate' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in workflow action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

// ============================================================
// Execute Workflow
// ============================================================

async function executeWorkflow(request: NextRequest, workflowId: string): Promise<NextResponse> {
  try {
    const body = await request.json();
    const triggerData = body.triggerData || {};
    const inputVariables = body.inputVariables || {};
    const triggeredBy = body.triggeredBy || 'manual';

    // Get workflow
    const dbWorkflow = await db.automationWorkflow.findUnique({
      where: { id: workflowId }
    });

    if (!dbWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (dbWorkflow.status !== 'active' && dbWorkflow.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Cannot execute workflow with status: ${dbWorkflow.status}` },
        { status: 400 }
      );
    }

    // Parse workflow
    const workflow = await parseWorkflowFromDB(dbWorkflow);

    // Create execution record
    const executionRef = generateExecutionReference();
    const execution = await db.automationExecution.create({
      data: {
        reference: executionRef,
        status: 'running',
        triggerType: triggeredBy,
        triggerData: JSON.stringify(triggerData),
        inputVariables: JSON.stringify(inputVariables),
        workflowId
      }
    });

    // Execute workflow asynchronously (don't wait for completion)
    executeWorkflowAsync(workflow, execution.id, triggerData, inputVariables);

    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        reference: executionRef,
        status: 'running',
        message: 'Workflow execution started'
      }
    }, { status: 202 });

  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start workflow execution' },
      { status: 500 }
    );
  }
}

// Async execution handler
async function executeWorkflowAsync(
  workflow: Workflow,
  executionId: string,
  triggerData: Record<string, any>,
  inputVariables: Record<string, any>
): Promise<void> {
  try {
    // Execute using engine
    const result = await workflowEngine.execute(workflow, triggerData, inputVariables);

    // Update execution record
    await db.automationExecution.update({
      where: { id: executionId },
      data: {
        status: result.status as any,
        outputVariables: JSON.stringify(result.outputVariables),
        stepResults: JSON.stringify(result.steps),
        completedAt: result.completedAt,
        durationMs: result.durationMs,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        errorDetails: result.error?.details ? JSON.stringify(result.error.details) : null
      }
    });

    // Update workflow stats
    await db.automationWorkflow.update({
      where: { id: workflow.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
        lastExecutionStatus: result.status,
        ...(result.status === 'completed' ? { successCount: { increment: 1 } } : {}),
        ...(result.status === 'failed' ? { failureCount: { increment: 1 } } : {})
      }
    });

  } catch (error) {
    console.error('Workflow execution failed:', error);
    
    // Mark execution as failed
    await db.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorCode: 'EXECUTION_ERROR',
        errorMessage: (error as Error).message
      }
    });
  }
}

// ============================================================
// Duplicate Workflow
// ============================================================

async function duplicateWorkflow(workflowId: string): Promise<NextResponse> {
  try {
    const original = await db.automationWorkflow.findUnique({
      where: { id: workflowId }
    });

    if (!original) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Create duplicate
    const duplicated = await db.automationWorkflow.create({
      data: {
        name: `${original.name} (Copie)`,
        description: original.description,
        status: 'draft',
        category: original.category,
        trigger: original.trigger,
        steps: original.steps,
        variables: original.variables,
        settings: original.settings,
        tags: original.tags,
        icon: original.icon,
        isTemplate: false,
        createdBy: original.createdBy
      }
    });

    const parsedWorkflow = await parseWorkflowFromDB(duplicated);

    return NextResponse.json({
      success: true,
      data: parsedWorkflow,
      message: 'Workflow duplicated successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error duplicating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate workflow' },
      { status: 500 }
    );
  }
}

// ============================================================
// Validate Workflow
// ============================================================

async function validateWorkflow(workflowId: string): Promise<NextResponse> {
  try {
    const dbWorkflow = await db.automationWorkflow.findUnique({
      where: { id: workflowId }
    });

    if (!dbWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflow = await parseWorkflowFromDB(dbWorkflow);
    const validation = workflowEngine.validateWorkflow(workflow);

    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate workflow' },
      { status: 500 }
    );
  }
}
