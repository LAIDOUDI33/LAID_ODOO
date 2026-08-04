// ============================================================
// HASSIBA Suite ERP v2.0.0 - Purchase Workflow API
// Flux: Commande Achat → Réception → Facture Fournisseur → Paiement
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  receivePurchaseOrder,
  createBillFromPurchaseOrder,
  executeFullPurchaseCycle
} from '@/lib/workflow-orchestrator';
import { db } from '@/lib/db';

// ============================================================
// POST /api/workflow/purchases - Execute Purchase Workflow Actions
// Body: { action, ...params }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'confirm':
        // Confirmer une commande d'achat
        if (!params.purchaseOrderId) {
          return NextResponse.json(
            { success: false, error: 'purchaseOrderId est requis' },
            { status: 400 }
          );
        }
        
        const po = await db.purchaseOrder.findUnique({
          where: { id: params.purchaseOrderId }
        });
        
        if (!po) {
          return NextResponse.json(
            { success: false, error: "Commande d'achat non trouvée" },
            { status: 404 }
          );
        }
        
        if (po.status !== 'draft') {
          return NextResponse.json(
            { success: false, error: `Seules les commandes brouillon peuvent être confirmées (actuel: ${po.status})` },
            { status: 400 }
          );
        }
        
        await db.purchaseOrder.update({
          where: { id: params.purchaseOrderId },
          data: { status: 'confirmed' }
        });
        
        return NextResponse.json({
          success: true,
          message: `Commande ${po.reference} confirmée avec succès`,
          data: { ...po, status: 'confirmed' }
        });

      case 'receive':
        // Réceptionner les marchandises (avec entrée stock)
        if (!params.purchaseOrderId || !params.lines || params.lines.length === 0) {
          return NextResponse.json(
            { success: false, error: 'purchaseOrderId et lines[] sont requis' },
            { status: 400 }
          );
        }
        
        const receiveResult = await receivePurchaseOrder({
          purchaseOrderId: params.purchaseOrderId,
          lines: params.lines,
          notes: params.notes
        });
        
        return NextResponse.json(receiveResult,
          receiveResult.success ? { status: 200 } : { status: 400 });

      case 'create-bill':
        // Créer facture fournisseur depuis PO
        if (!params.purchaseOrderId) {
          return NextResponse.json(
            { success: false, error: 'purchaseOrderId est requis' },
            { status: 400 }
          );
        }
        
        const billResult = await createBillFromPurchaseOrder({
          purchaseOrderId: params.purchaseOrderId,
          dueDate: params.dueDate,
          supplierReference: params.supplierReference,
          internalNotes: params.internalNotes
        });
        
        return NextResponse.json(billResult,
          billResult.success ? { status: 201 } : { status: 400 });

      case 'full-cycle':
        // Cycle complet: PO → Réception → Facture → Paiement
        if (!params.purchaseOrderId) {
          return NextResponse.json(
            { success: false, error: 'purchaseOrderId est requis pour le cycle complet' },
            { status: 400 }
          );
        }
        
        const fullCycleResult = await executeFullPurchaseCycle(
          params.purchaseOrderId,
          params.receiveData, // Optional receive data
          params.paymentData, // Optional payment data
          params.userId
        );
        
        return NextResponse.json(fullCycleResult,
          fullCycleResult.success ? { status: 201 } : { status: 400 });

      default:
        return NextResponse.json(
          { success: false, error: `Action non reconnue: ${action}. Actions disponibles: confirm, receive, create-bill, full-cycle` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Purchase Workflow Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'exécution du workflow achat' },
      { status: 500 }
    );
  }
}

// GET /api/workflow/purchases - Get available workflow actions info
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      name: 'Purchase Workflow Engine',
      description: 'Moteur de workflow Achats - HASSIBA ERP',
      version: '2.0.0',
      actions: [
        {
          action: 'confirm',
          description: 'Confirmer une commande d\'achat',
          input: ['purchaseOrderId'],
          output: 'PurchaseOrder (status: confirmed)'
        },
        {
          action: 'receive',
          description: 'Réceptionner les marchandises (avec entrée stock)',
          input: ['purchaseOrderId', 'lines[{lineId, quantity, locationId?}]', 'notes?'],
          output: 'StockMovements + UpdatedPO'
        },
        {
          action: 'create-bill',
          description: 'Créer une facture fournisseur depuis la commande',
          input: ['purchaseOrderId', 'dueDate?', 'supplierReference?'],
          output: 'Bill + JournalEntry (SCF)'
        },
        {
          action: 'full-cycle',
          description: 'Exécuter le cycle achat complet',
          input: ['purchaseOrderId', 'receiveData?', 'paymentData?'],
          output: 'Bill (+ Payment)'
        }
      ],
      features: [
        'Mise à jour automatique du stock à la réception',
        'Génération automatique des écritures comptables SCF',
        'Suivi des quantités reçues / facturées par ligne',
        'Gestion des réceptions partielles'
      ]
    }
  });
}
