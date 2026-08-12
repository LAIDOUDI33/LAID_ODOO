// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow API: Purchase Cycle
// POST /api/workflows/purchase - Execute full purchase cycle
// PO → Receipt → Bill → Payment
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  executeFullPurchaseCycle,
  type WorkflowResult,
} from '@/lib/workflow-orchestrator';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require appropriate role for workflow execution
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    // Parse request body
    const body = await request.json();
    const { purchaseOrderId, receiveData, paymentData } = body as {
      purchaseOrderId?: string;
      receiveData?: {
        lines?: Array<{
          lineId: string;
          quantity: number;
          locationId?: string;
        }>;
        notes?: string;
      };
      paymentData?: {
        amount?: number;
        paymentDate?: string;
        paymentMode?: string;
        bankAccountId?: string;
        reference?: string;
        notes?: string;
      };
    };

    // Validate required fields
    if (!purchaseOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: 'purchaseOrderId est requis',
          errors: ['Missing required field: purchaseOrderId'],
          workflowTrace: [],
        },
        { status: 400 }
      );
    }

    // Execute full purchase cycle workflow
    const result: WorkflowResult = await executeFullPurchaseCycle(
      purchaseOrderId,
      receiveData,
      paymentData
    );

    // Return appropriate HTTP status based on workflow result
    const statusCode = result.success ? 200 : 422;

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
        errors: result.errors,
        workflowTrace: result.workflowTrace.map((step) => ({
          ...step,
          timestamp: step.timestamp.toISOString(),
        })),
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('[Workflow API - Purchase] Error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: 'JSON invalide dans le corps de la requête',
          errors: ['Invalid JSON in request body'],
          workflowTrace: [],
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur interne du serveur lors de l\'exécution du cycle d\'achat',
        errors: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
        workflowTrace: [],
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  return NextResponse.json(
    {
      success: false,
      message: 'Méthode non autorisée. Utilisez POST pour exécuter le cycle d\'achat.',
      errors: ['Method not allowed'],
    },
    { status: 405 }
  );
}
