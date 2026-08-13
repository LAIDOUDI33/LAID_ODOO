// ============================================================
// HASSIBA Suite ERP v2.0.0 - Goods Receipt API (CANONICAL ENDPOINT)
// Réception des Marchandises - POST /api/purchases/[id]/receive
//
// *** THIS IS THE PREFERRED ENDPOINT FOR GOODS RECEIPT ***
// 
// This endpoint calls receivePurchaseOrder() from workflow-orchestrator.ts
// which is the SINGLE SOURCE OF TRUTH for all goods receipt operations.
//
// Consistency guarantees (from canonical method):
// - Uses $transaction for atomic stock updates
// - Always creates StockMovement with type 'in_receipt'
// - Always updates StockLevel (find or create pattern)
// - Validates quantities > 0
// - Proper PO status transitions (confirmed -> partial -> received)
//
// M-03 FIX: Added 3-way match variance alerts
// When received quantity differs from ordered by >5%, warning flag is added
//
// Alternative (legacy) endpoint: POST /api/purchases/[id]?action=receive
// Both endpoints now delegate to the same canonical method.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { receivePurchaseOrder } from '@/lib/workflow-orchestrator';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// Types & Interfaces
// ============================================================

interface ReceiveGoodsInput {
  lines: Array<{
    lineId: string;
    quantity: number;
    locationId?: string;
  }>;
  notes?: string;
}

// M-03 FIX: Variance threshold for 3-way match (5%)
// If received qty varies from ordered by more than this, a warning is flagged
const VARIANCE_WARNING_THRESHOLD = 0.05; // 5%

// ============================================================
// POST /api/purchases/[id]/receive - Receive Goods for PO
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role (warehouse focus)
    const authError = await requireRole(request, ['admin', 'manager', 'sales_manager', 'accountant', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const { id } = await params;
    
    // Check if PO exists
    const existingPO = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        partner: true,
        warehouse: true,
      },
    });
    
    if (!existingPO) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commande d\'achat non trouvée',
        },
        { status: 404 }
      );
    }
    
    // Validate PO status (must be confirmed or partial)
    if (!['confirmed', 'sent', 'partial'].includes(existingPO.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de réceptionner une commande avec le statut '${existingPO.status}'. La commande doit être confirmée ou partiellement reçue.`,
        },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body: ReceiveGoodsInput = await request.json();
    
    // Validate input
    if (!body.lines || body.lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Au moins une ligne de réception est requise',
        },
        { status: 400 }
      );
    }
    
    // Validate each line
    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      
      if (!line.lineId) {
        return NextResponse.json(
          {
            success: false,
            error: `L'ID de la ligne est requis pour la ligne ${i + 1}`,
          },
          { status: 400 }
        );
      }
      
      if (!line.quantity || line.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `La quantité doit être supérieure à 0 pour la ligne ${i + 1}`,
          },
          { status: 400 }
        );
      }
      
      // Check if line exists in PO
      const poLine = existingPO.lines.find((l) => l.id === line.lineId);
      if (!poLine) {
        return NextResponse.json(
          {
            success: false,
            error: `Ligne ${line.lineId} non trouvée dans la commande`,
          },
          { status: 404 }
        );
      }
      
      // Check quantity doesn't exceed ordered quantity
      const maxReceivable = poLine.quantity - poLine.quantityReceived;
      if (line.quantity > maxReceivable) {
        return NextResponse.json(
          {
            success: false,
            error: `Quantité à recevoir (${line.quantity}) supérieure à la quantité restante (${maxReceivable}) pour le produit ${poLine.product?.name || line.lineId}`,
          },
          { status: 400 }
        );
      }
    }
    
    // M-03 FIX: Calculate variance warnings for 3-way match
    const varianceWarnings: Array<{
      lineId: string;
      productName: string;
      orderedQty: number;
      receivedQty: number;
      variancePercent: number;
      warning: string;
    }> = [];
    
    for (const line of body.lines) {
      const poLine = existingPO.lines.find((l) => l.id === line.lineId);
      if (poLine) {
        const orderedQty = poLine.quantity;
        const receivedQty = line.quantity;
        const variance = Math.abs(receivedQty - orderedQty) / orderedQty;
        
        if (variance > VARIANCE_WARNING_THRESHOLD) {
          varianceWarnings.push({
            lineId: line.lineId,
            productName: poLine.product?.name || 'Unknown',
            orderedQty,
            receivedQty,
            variancePercent: Math.round(variance * 10000) / 100, // Round to 2 decimal places
            warning: `Variance of ${(Math.round(variance * 10000) / 100)}% exceeds ${VARIANCE_WARNING_THRESHOLD * 100}% threshold`
          });
        }
      }
    }
    
    // Execute workflow orchestrator's receivePurchaseOrder
    const result = await receivePurchaseOrder({
      purchaseOrderId: id,
      lines: body.lines,
      notes: body.notes,
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Marchandises réceptionnées avec succès',
        data: result.data,
        workflowTrace: result.workflowTrace,
        // M-03 FIX: Include variance warnings in response
        ...(varianceWarnings.length > 0 ? {
          varianceAlerts: {
            hasWarnings: true,
            threshold: `${VARIANCE_WARNING_THRESHOLD * 100}%`,
            warnings: varianceWarnings,
            recommendation: 'Review variances with procurement team and document reasons for discrepancy'
          }
        } : { varianceAlerts: { hasWarnings: false } })
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Erreur lors de la réception',
          errors: result.errors,
          workflowTrace: result.workflowTrace,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error receiving goods:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la réception des marchandises',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
