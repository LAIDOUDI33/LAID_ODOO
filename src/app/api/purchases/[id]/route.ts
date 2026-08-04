// ============================================================
// HASSIBA Suite ERP v2.0.0 - Purchase Orders API
// Commandes d'Achat - Operations sur une commande spécifique
// PUT /api/purchases/[id] - Update purchase order
// DELETE /api/purchases/[id] - Cancel/delete purchase order
// POST /api/purchases/[id]/receive - Receive goods from PO
// POST /api/purchases/[id]/confirm - Confirm PO status change
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidTVARate, calculateLineAmounts, calculateOrderTotals } from '../route';

// ============================================================
// Types & Interfaces
// ============================================================

interface UpdatePurchaseOrderInput {
  partnerId?: string;
  date?: string;
  expectedDate?: string;
  paymentTerms?: string;
  paymentMode?: string;
  incoterm?: string;
  shippingAddress?: string;
  warehouseId?: string;
  internalNotes?: string;
  supplierNotes?: string;
  lines?: Array<{
    id?: string; // Include ID for existing lines to update
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discountRate?: number;
    tvaRate?: number;
  }>;
}

interface ReceiveGoodsInput {
  lines: Array<{
    lineId: string;
    quantity: number;
    locationId?: string;
  }>;
  notes?: string;
}

// ============================================================
// Helper: Get PO with full details
// ============================================================

async function getPurchaseOrderWithDetails(id: string) {
  return db.purchaseOrder.findUnique({
    where: { id },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      lines: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      receiptItems: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      bills: {
        select: {
          id: true,
          reference: true,
          status: true,
          amountTotal: true,
        },
      },
    },
  });
}

// ============================================================
// Status Transition Validation
// ============================================================

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'confirmed', 'cancelled'],
  sent: ['confirmed', 'draft', 'cancelled'],
  confirmed: ['received', 'cancelled'],
  received: ['billed', 'done'],
  billed: ['done', 'done'],
  done: [],
  cancelled: ['draft'], // Can be reinstated to draft
};

function canTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

// ============================================================
// PUT /api/purchases/[id] - Update Purchase Order
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdatePurchaseOrderInput = await request.json();
    
    // Check if PO exists
    const existingPO = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        lines: true,
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
    
    // Check if PO can be updated (only draft or cancelled status)
    if (!['draft', 'cancelled'].includes(existingPO.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de modifier une commande avec le statut '${existingPO.status}'. Seules les commandes en brouillon ou annulées peuvent être modifiées.`,
        },
        { status: 400 }
      );
    }
    
    // Validate partner if provided
    if (body.partnerId && body.partnerId !== existingPO.partnerId) {
      const partner = await db.partner.findUnique({
        where: { id: body.partnerId },
      });
      
      if (!partner) {
        return NextResponse.json(
          {
            success: false,
            error: 'Fournisseur non trouvé',
          },
          { status: 404 }
        );
      }
      
      if (partner.type === 'customer') {
        return NextResponse.json(
          {
            success: false,
            error: 'Ce partenaire n\'est pas un fournisseur',
          },
          { status: 400 }
        );
      }
    }
    
    // Validate warehouse if provided
    if (body.warehouseId && body.warehouseId !== existingPO.warehouseId) {
      const warehouse = await db.warehouse.findUnique({
        where: { id: body.warehouseId },
      });
      
      if (!warehouse) {
        return NextResponse.json(
          {
            success: false,
            error: 'Entrepôt non trouvé',
          },
          { status: 404 }
        );
      }
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (body.partnerId) updateData.partnerId = body.partnerId;
    if (body.date) updateData.date = new Date(body.date);
    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
    if (body.paymentMode !== undefined) updateData.paymentMode = body.paymentMode;
    if (body.incoterm !== undefined) updateData.incoterm = body.incoterm;
    if (body.shippingAddress !== undefined) updateData.shippingAddress = body.shippingAddress;
    if (body.warehouseId !== undefined) updateData.warehouseId = body.warehouseId;
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;
    if (body.supplierNotes !== undefined) updateData.supplierNotes = body.supplierNotes;
    
    // If lines are provided, recalculate everything
    if (body.lines && body.lines.length > 0) {
      const processedLines = [];
      
      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i];
        
        // Validate required fields
        if (!line.productId) {
          return NextResponse.json(
            {
              success: false,
              error: `Le produit est requis pour la ligne ${i + 1}`,
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
        
        if (line.unitPrice === undefined || line.unitPrice < 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Le prix unitaire doit être positif pour la ligne ${i + 1}`,
            },
            { status: 400 }
          );
        }
        
        // Validate product exists
        const product = await db.product.findUnique({
          where: { id: line.productId },
        });
        
        if (!product) {
          return NextResponse.json(
            {
              success: false,
              error: `Produit non trouvé pour la ligne ${i + 1}`,
            },
            { status: 404 }
          );
        }
        
        // Validate TVA rate
        const tvaRate = line.tvaRate ?? product.tvaRate ?? 19;
        if (!isValidTVARate(tvaRate)) {
          return NextResponse.json(
            {
              success: false,
              error: `Taux TVA invalide pour la ligne ${i + 1}. Taux autorisés: 0%, 9%, 19%`,
            },
            { status: 400 }
          );
        }
        
        // Calculate amounts
        const amounts = calculateLineAmounts({
          ...line,
          tvaRate,
        });
        
        processedLines.push({
          id: line.id, // Keep existing line ID if updating
          productId: line.productId,
          description: line.description || product.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || 0,
          tvaRate,
          ...amounts,
        });
      }
      
      // Calculate order totals
      const totals = calculateOrderTotals(processedLines);
      updateData.amountUntaxed = totals.amountUntaxed;
      updateData.amountTax = totals.amountTax;
      updateData.amountTotal = totals.amountTotal;
      
      // Perform update in transaction
      const updatedOrder = await db.$transaction(async (tx) => {
        // Delete existing lines
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id },
        });
        
        // Create new lines
        const lines = await Promise.all(
          processedLines.map((line) =>
            tx.purchaseOrderLine.create({
              data: {
                purchaseOrderId: id,
                productId: line.productId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountRate: line.discountRate,
                tvaRate: line.tvaRate,
                amountUntaxed: line.amountUntaxed,
                amountTax: line.amountTax,
                amountTotal: line.amountTotal,
                quantityReceived: 0,
                quantityInvoiced: 0,
              },
            })
          )
        );
        
        // Update order header
        const order = await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
        });
        
        return { ...order, lines };
      });
      
      // Return full updated order
      const fullOrder = await getPurchaseOrderWithDetails(id);
      
      return NextResponse.json({
        success: true,
        data: fullOrder,
        message: `Commande d'achat ${existingPO.reference} mise à jour avec succès`,
      });
    } else {
      // Just update header without changing lines
      const updatedOrder = await db.purchaseOrder.update({
        where: { id },
        data: updateData,
      });
      
      const fullOrder = await getPurchaseOrderWithDetails(id);
      
      return NextResponse.json({
        success: true,
        data: fullOrder,
        message: `Commande d'achat ${existingPO.reference} mise à jour avec succès`,
      });
    }
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la mise à jour de la commande d\'achat',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/purchases/[id] - Cancel/Delete Purchase Order
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if PO exists
    const existingPO = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        receiptItems: true,
        bills: true,
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
    
    // Check if already cancelled
    if (existingPO.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cette commande est déjà annulée',
        },
        { status: 400 }
      );
    }
    
    // Check if goods have been received
    if (existingPO.receiptItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossible d\'annuler cette commande car des marchandises ont déjà été reçues. Veuillez d\'abord effectuer un retour de stock.',
        },
        { status: 400 }
      );
    }
    
    // Check if bills exist
    if (existingPO.bills.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossible d\'annuler cette commande car des factures fournisseurs y sont liées.',
        },
        { status: 400 }
      );
    }
    
    // Cancel the order (soft delete by setting status to cancelled)
    const cancelledOrder = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: cancelledOrder,
      message: `Commande d'achat ${existingPO.reference} annulée avec succès`,
    });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'annulation de la commande d\'achat',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/purchases/[id]/receive - Receive Goods from PO
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse URL to check action
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Route to appropriate handler based on action
    if (action === 'receive') {
      return handleReceiveGoods(request, id);
    } else if (action === 'confirm') {
      return handleConfirmOrder(request, id);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Action non reconnue. Utilisez ?action=receive ou ?action=confirm',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/purchases/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du traitement de la requête',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// Handle Receive Goods Action
// ============================================================

async function handleReceiveGoods(request: NextRequest, poId: string): Promise<NextResponse> {
  try {
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
    
    // Get PO with full details
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        warehouse: true,
        company: true,
      },
    });
    
    if (!po) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commande d\'achat non trouvée',
        },
        { status: 404 }
      );
    }
    
    // Check if PO can receive goods
    if (!['confirmed', 'sent', 'draft'].includes(po.status) && po.status !== 'received') {
      return NextResponse.json(
        {
          success: false,
          error: `La commande doit être confirmée avant de pouvoir recevoir des marchandises. Statut actuel: ${po.status}`,
        },
        { status: 400 }
      );
    }
    
    // Check if warehouse is set
    if (!po.warehouseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Aucun entrepôt défini pour cette commande. Veuillez définir l\'entrepôt de réception.',
        },
        { status: 400 }
      );
    }
    
    // Process each received line
    const movements = [];
    const updatedLines = [];
    let totalReceived = 0;
    
    for (const recvLine of body.lines) {
      // Find the corresponding PO line
      const poLine = po.lines.find((l) => l.id === recvLine.lineId);
      
      if (!poLine) {
        return NextResponse.json(
          {
            success: false,
            error: `Ligne de commande ${recvLine.lineId} non trouvée`,
          },
          { status: 404 }
        );
      }
      
      // Validate quantity
      if (!recvLine.quantity || recvLine.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `La quantité reçue doit être supérieure à 0 pour le produit ${poLine.product.name}`,
          },
          { status: 400 }
        );
      }
      
      // Check not over-receiving
      const maxReceivable = poLine.quantity - poLine.quantityReceived;
      if (recvLine.quantity > maxReceivable) {
        return NextResponse.json(
          {
            success: false,
            error: `Quantité reçue (${recvLine.quantity}) supérieure au restant à recevoir (${maxReceivable}) pour ${poLine.product.name}`,
          },
          { status: 400 }
        );
      }
      
      // Calculate cost for this reception
      const lineUnitCost = poLine.unitPrice * (1 - poLine.discountRate / 100);
      const totalCost = Math.round(recvLine.quantity * lineUnitCost * 100) / 100;
      
      movements.push({
        productId: poLine.productId,
        quantity: recvLine.quantity,
        unitCost: lineUnitCost,
        totalCost,
        locationId: recvLine.locationId || null,
        lineId: poLine.id,
      });
      
      updatedLines.push({
        lineId: poLine.id,
        quantityReceived: poLine.quantityReceived + recvLine.quantity,
        amountReceived: Math.round((poLine.quantityReceived + recvLine.quantity) * lineUnitCost * 100) / 100,
      });
      
      totalReceived += totalCost;
    }
    
    // Generate movement reference
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const movementCount = await db.stockMovement.count({
      where: {
        type: 'in_receipt',
        date: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });
    const movementRef = `ENT-${year}-${month}-${String(movementCount + 1).padStart(3, '0')}`;
    
    // Process in transaction
    const result = await db.$transaction(async (tx) => {
      // Create stock movements
      const createdMovements = await Promise.all(
        movements.map((mov) =>
          tx.stockMovement.create({
            data: {
              reference: `${movementRef}-${mov.productId.slice(-6)}`,
              date: now,
              type: 'in_receipt',
              quantity: mov.quantity,
              unitCost: mov.unitCost,
              totalCost: mov.totalCost,
              notes: body.notes || `Réception commande ${po.reference}`,
              productId: mov.productId,
              warehouseId: po.warehouseId!,
              locationId: mov.locationId,
              sourceDoc: 'purchase_order',
              sourceId: poId,
              purchaseOrderId: poId,
            },
          })
        )
      );
      
      // Update PO lines quantities received
      for (const ul of updatedLines) {
        await tx.purchaseOrderLine.update({
          where: { id: ul.lineId },
          data: {
            quantityReceived: ul.quantityReceived,
          },
        });
      }
      
      // Update stock levels for each product
      for (const mov of movements) {
        // Find or create stock level
        const existingStockLevel = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId_locationId: {
              productId: mov.productId,
              warehouseId: po.warehouseId!,
              locationId: mov.locationId ?? '',
            },
          },
        });
        
        if (existingStockLevel) {
          // Update existing stock level
          const newQuantity = existingStockLevel.quantity + mov.quantity;
          await tx.stockLevel.update({
            where: { id: existingStockLevel.id },
            data: {
              quantity: Math.round(newQuantity * 100) / 100,
              availableQty: Math.round((newQuantity - existingStockLevel.reservedQty) * 100) / 100,
            },
          });
        } else {
          // Create new stock level
          await tx.stockLevel.create({
            data: {
              productId: mov.productId,
              warehouseId: po.warehouseId!,
              locationId: mov.locationId,
              quantity: mov.quantity,
              reservedQty: 0,
              availableQty: mov.quantity,
              minQty: 0,
              maxQty: 0,
            },
          });
        }
      }
      
      // Determine new PO status
      let newStatus = po.status;
      const allFullyReceived = po.lines.every(
        (l) => {
          const updatedL = updatedLines.find((ul) => ul.lineId === l.id);
          return updatedL ? updatedL.quantityReceived >= l.quantity : l.quantityReceived >= l.quantity;
        }
      );
      
      if (allFullyReceived) {
        newStatus = 'received';
      } else if (updatedLines.length > 0 && po.status === 'confirmed') {
        newStatus = 'received'; // Partially received
      }
      
      // Update PO
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          amountReceived: po.amountReceived + totalReceived,
          receiptDate: now,
          status: newStatus,
        },
      });
      
      return {
        movements: createdMovements,
        purchaseOrder: updatedPO,
      };
    });
    
    // Return full updated order
    const fullOrder = await getPurchaseOrderWithDetails(poId);
    
    return NextResponse.json({
      success: true,
      data: {
        purchaseOrder: fullOrder,
        movements: result.movements,
      },
      message: `${movements.length} produit(s) reçu(s) avec succès`,
    });
  } catch (error) {
    console.error('Error receiving goods:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la réception des marchandises',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// Handle Confirm Order Action
// ============================================================

async function handleConfirmOrder(request: NextRequest, poId: string): Promise<NextResponse> {
  try {
    // Get PO
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
    });
    
    if (!po) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commande d\'achat non trouvée',
        },
        { status: 404 }
      );
    }
    
    // Check current status and validate transition
    const targetStatus = 'confirmed';
    
    if (!canTransition(po.status, targetStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transition de statut invalide: '${po.status}' -> '${targetStatus}'`,
        },
        { status: 400 }
      );
    }
    
    // Determine intermediate status based on current state
    let newStatus: string;
    
    switch (po.status) {
      case 'draft':
        newStatus = 'sent'; // First send to supplier
        break;
      case 'sent':
      case 'cancelled':
        newStatus = 'confirmed'; // Then confirm
        break;
      default:
        newStatus = targetStatus;
    }
    
    // Update status
    const updatedPO = await db.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: newStatus,
      },
    });
    
    // Return full order
    const fullOrder = await getPurchaseOrderWithDetails(poId);
    
    const statusMessages: Record<string, string> = {
      sent: 'Commande envoyée au fournisseur',
      confirmed: 'Commande confirmée par le fournisseur',
    };
    
    return NextResponse.json({
      success: true,
      data: fullOrder,
      message: statusMessages[newStatus] || `Statut mis à jour: ${newStatus}`,
    });
  } catch (error) {
    console.error('Error confirming purchase order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la confirmation de la commande d\'achat',
      },
      { status: 500 }
    );
  }
}
