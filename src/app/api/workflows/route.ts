// ============================================================
// HASSIBA SUITE ERP - Workflow Automation API
// Complete REST API for Visual Workflow Builder
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { workflowEngine, WorkflowEngine } from '@/lib/workflow-engine';
import { 
  Workflow, 
  WorkflowStatus, 
  WorkflowTrigger,
  WorkflowStep,
  ExecutionRecord 
} from '@/lib/types/workflow';

// ============================================================
// Helper Functions
// ============================================================

function generateExecutionReference(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AUTO-${dateStr}-${random}`;
}

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
    settings: dbWorkflow.settings ? JSON.parse(dbWorkflow.settings) : getDefaultSettings(),
    version: dbWorkflow.version,
    executionHistory: [], // Loaded separately if needed
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
    createdBy: dbWorkflow.createdBy,
    lastExecutedAt: dbWorkflow.lastExecutedAt
  };
}

function getDefaultSettings() {
  return {
    autoSave: true,
    saveIntervalMs: 30000,
    enableLogging: true,
    logLevel: 'info',
    timeoutMs: 300000,
    maxConcurrentExecutions: 10,
    enableRetry: true,
    defaultRetryCount: 3,
    notifyOnComplete: false,
    notifyOnError: true,
    tags: []
  };
}

function createDefaultStep(stepType: string, position?: { x: number; y: number }): WorkflowStep {
  const stepNames: Record<string, string> = {
    action: 'Nouvelle Action',
    condition: 'Condition',
    delay: 'Délai',
    loop: 'Boucle',
    approval: 'Approbation',
    parallel: 'Branchement Parallèle',
    switch: 'Switch',
    transform: 'Transformation',
    http_request: 'Requête HTTP',
    sub_workflow: 'Sous-Workflow'
  };

  return {
    id: uuidv4(),
    type: stepType as WorkflowStep['type'],
    name: stepNames[stepType] || 'Nouvelle Étape',
    description: '',
    position: position || { x: 400, y: 100 + Math.random() * 200 },
    config: getDefaultConfigForStepType(stepType),
    enabled: true
  };
}

function getDefaultConfigForStepType(stepType: string): any {
  switch (stepType) {
    case 'action':
      return { actionType: 'send_email', actionParams: {} };
    case 'condition':
      return { conditionType: 'simple', conditions: [{ logic: 'AND', conditions: [] }] };
    case 'delay':
      return { delayType: 'fixed', duration: 1, delayUnit: 'hours' };
    case 'loop':
      return { loopType: 'for_each', iterateOver: '' };
    case 'approval':
      return { approvalType: 'single', approvers: [], timeoutHours: 48 };
    case 'parallel':
      return { branches: [], waitAll: true };
    case 'switch':
      return { cases: [] };
    case 'transform':
      return { transformations: [] };
    case 'http_request':
      return { method: 'GET', url: '' };
    case 'sub_workflow':
      return { workflowId: '' };
    default:
      return {};
  }
}

// ============================================================
// GET /api/workflows - List all workflows
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeTemplates = searchParams.get('templates') === 'true';
    const includeStats = searchParams.get('stats') === 'true';

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (!includeTemplates) {
      where.isTemplate = false;
    }

    // Get workflows with pagination
    const [workflows, total] = await Promise.all([
      db.automationWorkflow.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { executions: true }
          }
        }
      }),
      db.automationWorkflow.count({ where })
    ]);

    // Parse and format response
    const formattedWorkflows = await Promise.all(
      workflows.map(async (w) => {
        const workflow = await parseWorkflowFromDB(w);
        return {
          ...workflow,
          creator: w.creator,
          executionCount: w._count.executions,
          lastExecutionStatus: w.lastExecutionStatus
        };
      })
    );

    // Get statistics if requested
    let stats = null;
    if (includeStats) {
      const [statusCounts, categoryCounts] = await Promise.all([
        db.automationWorkflow.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        db.automationWorkflow.groupBy({
          by: ['category'],
          _count: { category: true }
        })
      ]);

      stats = {
        total,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {}),
        byCategory: categoryCounts.reduce((acc, c) => ({ ...acc, [c.category]: c._count.category }), {})
      };
    }

    return NextResponse.json({
      success: true,
      data: formattedWorkflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/workflows - Create new workflow
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      category = 'custom',
      trigger,
      steps = [],
      variables = [],
      settings,
      tags,
      icon,
      isTemplate = false,
      createdBy = 'system'
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    // Create default trigger if not provided
    const defaultTrigger: WorkflowTrigger = trigger || {
      type: 'manual',
      config: {}
    };

    // Create default step if none provided
    const defaultSteps = steps.length > 0 ? steps : [
      createDefaultStep('action', { x: 400, y: 100 })
    ];

    // Create the workflow
    const workflow = await db.automationWorkflow.create({
      data: {
        name,
        description: description || null,
        status: 'draft',
        category,
        trigger: JSON.stringify(defaultTrigger),
        steps: JSON.stringify(defaultSteps),
        variables: variables.length > 0 ? JSON.stringify(variables) : null,
        settings: settings ? JSON.stringify(settings) : JSON.stringify(getDefaultSettings()),
        tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
        icon: icon || null,
        isTemplate,
        createdBy
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const parsedWorkflow = await parseWorkflowFromDB(workflow);

    return NextResponse.json({
      success: true,
      data: parsedWorkflow,
      message: 'Workflow created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
