// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow API: Delivery
// POST /api/workflows/delivery - Record delivery for sales order
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  deliverSalesOrder,
  type WorkflowResult,
} from '@/lib/workflow-orchestrator';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require appropriate role for delivery operations
    const authError = await requireRole(request, ['admin', 'manager', 'sales']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    // Parse request body
    const body = await request.json();
    const { salesOrderId, deliveryLines, warehouseId } = body as {
      salesOrderId?: string;
      deliveryLines?: Array<{
        lineId: string;
        quantity: number;
      }>;
      warehouseId?: string;
    };

    // Validate required fields
    if (!salesOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: 'salesOrderId est requis',
          errors: ['Missing required field: salesOrderId'],
          workflowTrace: [],
        },
        { status: 400 }
      );
    }

    if (!deliveryLines || !Array.isArray(deliveryLines) || deliveryLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'deliveryLines est requis et doit être un tableau non vide',
          errors: ['Missing or invalid field: deliveryLines'],
          workflowTrace: [],
        },
        { status: 400 }
      );
    }

    // Validate each delivery line
    for (let i = 0; i < deliveryLines.length; i++) {
      const line = deliveryLines[i];
      
      if (!line.lineId) {
        return NextResponse.json(
          {
            success: false,
            message: `deliveryLines[${i}].lineId est requis`,
            errors: [`Missing lineId at index ${i}`],
            workflowTrace: [],
          },
          { status: 400 }
        );
      }

      if (typeof line.quantity !== 'number' || line.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `deliveryLines[${i}.quantity] doit être un nombre positif`,
            errors: [`Invalid quantity at index ${i}`],
            workflowTrace: [],
          },
          { status: 400 }
        );
      }
    }

    // Execute delivery workflow
    const result: WorkflowResult = await deliverSalesOrder(
      salesOrderId,
      deliveryLines,
      warehouseId
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
    console.error('[Workflow API - Delivery] Error:', error);

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
        message: 'Erreur interne du serveur lors de l\'enregistrement de la livraison',
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
      message: 'Méthode non autorisée. Utilisez POST pour enregistrer une livraison.',
      errors: ['Method not allowed'],
    },
    { status: 405 }
  );
}
