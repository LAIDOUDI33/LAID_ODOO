// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow API: Sales Cycle
// POST /api/workflows/sales - Execute full sales cycle
// Quote → Sales Order → Invoice → Payment
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  executeFullSalesCycle,
  type WorkflowResult,
} from '@/lib/workflow-orchestrator';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { quotationId, paymentData } = body as {
      quotationId?: string;
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
    if (!quotationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'quotationId est requis',
          errors: ['Missing required field: quotationId'],
          workflowTrace: [],
        },
        { status: 400 }
      );
    }

    // Execute full sales cycle workflow
    const result: WorkflowResult = await executeFullSalesCycle(
      quotationId,
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
    console.error('[Workflow API - Sales] Error:', error);

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
        message: 'Erreur interne du serveur lors de l\'exécution du cycle de vente',
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
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Méthode non autorisée. Utilisez POST pour exécuter le cycle de vente.',
      errors: ['Method not allowed'],
    },
    { status: 405 }
  );
}
