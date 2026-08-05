// ============================================================
// HASSIBA Suite ERP v2.0.0 - Payments Workflow API
// Enregistrement des paiements (Clients & Fournisseurs)
// Avec génération automatique des écritures comptables
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { recordPayment } from '@/lib/workflow-orchestrator';
import { db } from '@/lib/db';

// ============================================================
// POST /api/workflow/payments - Record Payment
// Body: { invoiceType, invoiceId, amount, paymentDate, paymentMode, ... }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      invoiceType,
      invoiceId,
      amount,
      paymentDate,
      paymentMode,
      bankAccountId,
      reference,
      notes,
      action
    } = body;

    // Handle different actions
    if (action === 'list' || action === 'history') {
      // Get payment history for a document
      const docType = body.documentType || invoiceType;
      const docId = body.documentId || invoiceId;
      
      if (!docId) {
        return NextResponse.json(
          { success: false, error: 'documentId est requis pour l\'historique' },
          { status: 400 }
        );
      }
      
      const payments = await db.payment.findMany({
        where: {
          sourceType: docType === 'supplier' ? 'bill' : 'invoice',
          sourceId: docId
        },
        orderBy: { date: 'desc' },
        include: {
          partner: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true, bankName: true } }
        }
      });
      
      return NextResponse.json({
        success: true,
        data: payments,
        total: payments.length,
        totalAmount: payments.reduce((sum: number, p: any) => sum + p.amount, 0)
      });
    }

    if (action === 'status') {
      // Get payment status of a document
      const docType = body.documentType || invoiceType;
      const docId = body.documentId || invoiceId;
      
      if (!docId) {
        return NextResponse.json(
          { success: false, error: 'documentId est requis' },
          { status: 400 }
        );
      }
      
      let document: any;
      if (docType === 'supplier') {
        document = await db.bill.findUnique({
          where: { id: docId },
          include: { 
            partner: { select: { id: true, name: true } },
            payments: { orderBy: { date: 'desc' } }
          }
        });
      } else {
        document = await db.invoice.findUnique({
          where: { id: docId },
          include: { 
            partner: { select: { id: true, name: true } },
            payments: { orderBy: { date: 'desc' } }
          }
        });
      }
      
      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document non trouvé' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          documentId: document.id,
          reference: document.reference,
          status: document.status,
          amountTotal: document.amountTotal,
          amountPaid: document.amountPaid,
          amountDue: document.amountDue || (document.amountTotal - document.amountPaid),
          payments: document.payments || [],
          isFullyPaid: (document.amountDue || 0) <= 0.01,
          isPartiallyPaid: document.status === 'partially_paid',
          overdueDays: document.dueDate && new Date(document.dueDate) < new Date() 
            ? Math.floor((Date.now() - new Date(document.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0
        }
      });
    }

    // Default action: record a new payment
    if (!invoiceType || !['customer', 'supplier'].includes(invoiceType)) {
      return NextResponse.json(
        { success: false, error: 'invoiceType doit être "customer" ou "supplier"' },
        { status: 400 }
      );
    }

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'invoiceId est requis' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Le montant doit être supérieur à 0' },
        { status: 400 }
      );
    }

    if (!paymentMode) {
      return NextResponse.json(
        { success: false, error: 'Le mode de paiement est requis' },
        { status: 400 }
      );
    }

    // Execute payment recording with workflow orchestrator
    const result = await recordPayment({
      invoiceType,
      invoiceId,
      amount: parseFloat(amount),
      paymentDate: paymentDate || new Date().toISOString(),
      paymentMode,
      bankAccountId: bankAccountId || null,
      reference: reference || undefined,
      notes: notes || undefined
    });

    return NextResponse.json(result,
      result.success ? { status: 201 } : { status: 400 });

  } catch (error) {
    console.error('Payment Workflow Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du paiement' },
      { status: 500 }
    );
  }
}

// GET /api/workflow/payments - Get payments info and available methods
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const info = searchParams.get('info');
  
  if (info === 'methods') {
    return NextResponse.json({
      success: true,
      data: {
        paymentMethods: [
          { code: 'bank_transfer', label: 'Virement Bancaire', icon: 'Building2' },
          { code: 'check', label: 'Chèque', icon: 'FileText' },
          { code: 'cash', label: 'Espèces', icon: 'Banknote' },
          { code: 'card', label: 'Carte Bancaire', icon: 'CreditCard' },
          { code: 'wire', label: 'Virement International', icon: 'Globe' },
          { code: 'exchange', label: 'Dossier Caisse', icon: 'Archive' }
        ],
        workflowFeatures: [
          'Génération automatique de l\'écriture comptable',
          'Mise à jour du solde document',
          'Historique complet des paiements',
          'Rapprochement bancaire'
        ]
      }
    });
  }

  if (info === 'recent') {
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // customer or supplier
    
    const whereClause: any = {};
    if (type) {
      whereClause.type = type === 'customer' ? 'inflow' : 'outflow';
    }
    
    const payments = await db.payment.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        partner: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: payments,
      pagination: { limit, total: payments.length }
    });
  }

  // Default: API info
  return NextResponse.json({
    success: true,
    data: {
      name: 'Payments Workflow Engine',
      description: 'Moteur de gestion des Paiements - HASSIBA ERP',
      version: '2.0.0',
      endpoints: {
        'POST /': 'Enregistrer un paiement',
        'GET ?info=methods': 'Liste des modes de paiement',
        'GET ?info=recent&type=customer|supplier': 'Paiements récents',
        'POST ?action=history': 'Historique paiements d\'un document',
        'POST ?action=status': 'Statut de paiement d\'un document'
      },
      features: [
        'Écriture comptable automatique (SCF)',
        'Support clients et fournisseurs',
        'Gestion des paiements partiels',
        'Traçabilité complète'
      ]
    }
  });
}
