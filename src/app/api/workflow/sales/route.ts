// ============================================================
// HASSIBA Suite ERP v2.0.0 - Sales Workflow API
// Flux: Devis → Commande Client → Facture → Paiement
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  convertQuotationToSalesOrder,
  convertSalesOrderToInvoice,
  deliverSalesOrder,
  executeFullSalesCycle
} from '@/lib/workflow-orchestrator';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// POST /api/workflow/sales - Execute Sales Workflow Actions
// Body: { action, ...params }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require appropriate role for workflow actions
    const authError = await requireRole(request, ['admin', 'manager', 'sales']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'convert-quotation':
        // Devis → Commande Client
        if (!params.quotationId) {
          return NextResponse.json(
            { success: false, error: 'quotationId est requis' },
            { status: 400 }
          );
        }
        
        const conversionResult = await convertQuotationToSalesOrder({
          quotationId: params.quotationId,
          partnerId: params.partnerId,
          expectedDate: params.expectedDate,
          paymentTerms: params.paymentTerms,
          paymentMode: params.paymentMode,
          warehouseId: params.warehouseId,
          salesPersonId: params.salesPersonId,
          internalNotes: params.internalNotes,
          customerNotes: params.customerNotes
        });
        
        return NextResponse.json(conversionResult, 
          conversionResult.success ? { status: 201 } : { status: 400 });

      case 'create-invoice':
        // Commande Client → Facture
        if (!params.salesOrderId) {
          return NextResponse.json(
            { success: false, error: 'salesOrderId est requis' },
            { status: 400 }
          );
        }
        
        const invoiceResult = await convertSalesOrderToInvoice({
          salesOrderId: params.salesOrderId,
          dueDate: params.dueDate,
          paymentMode: params.paymentMode,
          internalNotes: params.internalNotes,
          customerNotes: params.customerNotes
        });
        
        return NextResponse.json(invoiceResult,
          invoiceResult.success ? { status: 201 } : { status: 400 });

      case 'deliver':
        // Livraison Commande Client (avec sortie stock)
        if (!params.salesOrderId || !params.deliveryLines) {
          return NextResponse.json(
            { success: false, error: 'salesOrderId et deliveryLines sont requis' },
            { status: 400 }
          );
        }
        
        const deliveryResult = await deliverSalesOrder(
          params.salesOrderId,
          params.deliveryLines,
          params.warehouseId
        );
        
        return NextResponse.json(deliveryResult,
          deliveryResult.success ? { status: 200 } : { status: 400 });

      case 'full-cycle':
        // Cycle complet: Devis → Commande → Facture → Paiement
        if (!params.quotationId) {
          return NextResponse.json(
            { success: false, error: 'quotationId est requis pour le cycle complet' },
            { status: 400 }
          );
        }
        
        const fullCycleResult = await executeFullSalesCycle(
          params.quotationId,
          params.paymentData, // Optional payment data
          params.userId
        );
        
        return NextResponse.json(fullCycleResult,
          fullCycleResult.success ? { status: 201 } : { status: 400 });

      default:
        return NextResponse.json(
          { success: false, error: `Action non reconnue: ${action}. Actions disponibles: convert-quotation, create-invoice, deliver, full-cycle` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Sales Workflow Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'exécution du workflow commercial' },
      { status: 500 }
    );
  }
}

// GET /api/workflow/sales - Get available workflow actions info
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    success: true,
    data: {
      name: 'Sales Workflow Engine',
      description: 'Moteur de workflow Commercial - HASSIBA ERP',
      version: '2.0.0',
      actions: [
        {
          action: 'convert-quotation',
          description: 'Convertir un Devis en Commande Client',
          input: ['quotationId', 'partnerId?', 'expectedDate?', 'paymentTerms?'],
          output: 'SalesOrder'
        },
        {
          action: 'create-invoice',
          description: 'Créer une Facture depuis une Commande Client',
          input: ['salesOrderId', 'dueDate?', 'paymentMode?'],
          output: 'Invoice + JournalEntry (SCF)'
        },
        {
          action: 'deliver',
          description: 'Enregistrer une Livraison (avec sortie stock)',
          input: ['salesOrderId', 'deliveryLines[]', 'warehouseId?'],
          output: 'StockMovements'
        },
        {
          action: 'full-cycle',
          description: 'Exécuter le cycle commercial complet',
          input: ['quotationId', 'paymentData?'],
          output: 'SalesOrder + Invoice (+ Payment)'
        }
      ],
      features: [
        'Génération automatique des écritures comptables SCF',
        'Mise à jour automatique du stock',
        'Suivi de traçabilité complète',
        'Validation des transitions de statut'
      ]
    }
  });
}
