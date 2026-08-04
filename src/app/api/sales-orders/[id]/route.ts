import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';
import { generateSCFJournalEntryFromInvoice as generateJournalEntry } from '@/lib/workflow-orchestrator';

// Valid sales order statuses
const VALID_STATUSES = ['draft', 'sent', 'confirmed', 'processing', 'delivered', 'invoiced', 'done', 'cancelled'];

// Status transition rules
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'draft', 'cancelled'],
  confirmed: ['processing', 'sent', 'cancelled'],
  processing: ['delivered', 'confirmed'],
  delivered: ['invoiced', 'processing'],
  invoiced: ['done', 'delivered'],
  done: [],
  cancelled: ['draft'] // Can reinstate cancelled orders
};

// ============================================================
// Helper: Validate status transition
// ============================================================
function canTransition(currentStatus: string, newStatus: string): boolean {
  if (!VALID_TRANSITIONS[currentStatus]) return false;
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

// ============================================================
// GET /api/sales-orders/[id] - Get single sales order
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const salesOrder = await db.salesOrder.findUnique({
      where: { id },
      include: {
        partner: {
          select: { 
            id: true, name: true, nif: true, nis: true, rc: true, 
            city: true, address: true, phone: true, email: true,
            type: true
          }
        },
        company: {
          select: { id: true, name: true, logo: true, address: true, phone: true }
        },
        warehouse: {
          select: { id: true, name: true, address: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        quotation: {
          select: { id: true, reference: true, date: true, status: true }
        },
        opportunity: {
          select: { id: true, name: true, stage: true }
        },
        lines: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: { 
                id: true, name: true, reference: true, description: true,
                unit: true, sellingPrice: true, tvaRate: true
              }
            }
          }
        },
        deliveryItems: {
          include: {
            product: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } }
          }
        },
        invoices: {
          select: { id: true, reference: true, date: true, status: true, amountTotal }
        },
        _count: {
          select: {
            lines: true,
            deliveryItems: true,
            invoices: true
          }
        }
      }
    });

    if (!salesOrder) {
      return NextResponse.json(
        { success: false, error: 'Sales order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    console.error('SalesOrders [id] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales order' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/sales-orders/[id] - Update a sales order
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if sales order exists
    const existingOrder = await db.salesOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Check if order can be modified (only draft/sent can be edited)
    if (!['draft', 'sent'].includes(existingOrder.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot modify sales order with status '${existingOrder.status}'. Only draft or sent orders can be modified.` },
        { status: 400 }
      );
    }

    const {
      expectedDate,
      paymentTerms,
      paymentMode,
      shippingAddress,
      warehouseId,
      internalNotes,
      customerNotes,
      lines,
      status
    } = body;

    // Validate status change if provided
    if (status && status !== existingOrder.status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      if (!canTransition(existingOrder.status, status)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from '${existingOrder.status}' to '${status}'` },
          { status: 400 }
        );
      }
    }

    // Check warehouse if provided
    if (warehouseId && warehouseId !== existingOrder.warehouseId) {
      const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        return NextResponse.json(
          { success: false, error: 'Warehouse not found' },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (expectedDate !== undefined) updateData.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes;
    if (status !== undefined) updateData.status = status;

    // Handle line updates if provided
    let calculatedAmounts = null;
    
    if (lines && Array.isArray(lines)) {
      if (lines.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one line item is required' },
          { status: 400 }
        );
      }

      // Validate new lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.productId) {
          return NextResponse.json(
            { success: false, error: `Line ${i + 1}: Product is required` },
            { status: 400 }
          );
        }
        if (!line.quantity || parseFloat(line.quantity) <= 0) {
          return NextResponse.json(
            { success: false, error: `Line ${i + 1}: Quantity must be greater than 0` },
            { status: 400 }
          );
        }
      }

      // Process new lines with calculations
      const processedLines = lines.map((line: any) => {
        const quantity = parseFloat(line.quantity) || 0;
        const unitPrice = parseFloat(line.unitPrice) || 0;
        const discountRate = parseFloat(line.discountRate) || 0;
        let tvaRate = parseFloat(line.tvaRate);
        
        if (isNaN(tvaRate)) tvaRate = 0.19;

        const amountUntaxedBeforeDiscount = quantity * unitPrice;
        const amountUntaxed = Math.round(amountUntaxedBeforeDiscount * (1 - discountRate / 100) * 100) / 100;
        const amountTax = Math.round(amountUntaxed * tvaRate * 100) / 100;
        const amountTotal = amountUntaxed + amountTax;

        return {
          productId: line.productId,
          description: line.description || null,
          quantity,
          unitPrice,
          discountRate,
          tvaRate,
          amountUntaxed,
          amountTax,
          amountTotal
        };
      });

      // Calculate totals
      const tvaResult = calculateTVACollectee(processedLines.map((l) => ({ 
        amountUntaxed: l.amountUntaxed, 
        tvaRate: l.tvaRate 
      })));

      const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

      calculatedAmounts = {
        amountUntaxed: tvaResult.totalHT,
        amountTax: tvaResult.totalTVACollectee,
        timbreFiscal,
        amountTotal: tvaResult.totalTTC + timbreFiscal
      };

      updateData.amountUntaxed = calculatedAmounts.amountUntaxed;
      updateData.amountTax = calculatedAmounts.amountTax;
      updateData.timbreFiscal = calculatedAmounts.timbreFiscal;
      updateData.amountTotal = calculatedAmounts.amountTotal;
    }

    // Update in transaction to handle lines properly
    const updatedOrder = await db.$transaction(async (tx) => {
      // Delete old lines and create new ones if lines are being updated
      if (lines && Array.isArray(lines)) {
        await tx.salesOrderLine.deleteMany({
          where: { salesOrderId: id }
        });
      }

      const order = await tx.salesOrder.update({
        where: { id },
        data: {
          ...updateData,
          ...(lines && Array.isArray(lines) ? {
            lines: {
              create: lines.map((line: any) => {
                const quantity = parseFloat(line.quantity) || 0;
                const unitPrice = parseFloat(line.unitPrice) || 0;
                const discountRate = parseFloat(line.discountRate) || 0;
                let tvaRate = parseFloat(line.tvaRate);
                if (isNaN(tvaRate)) tvaRate = 0.19;

                const amountUntaxedBeforeDiscount = quantity * unitPrice;
                const amountUntaxed = Math.round(amountUntaxedBeforeDiscount * (1 - discountRate / 100) * 100) / 100;
                const amountTax = Math.round(amountUntaxed * tvaRate * 100) / 100;
                const amountTotal = amountUntaxed + amountTax;

                return {
                  productId: line.productId,
                  description: line.description || null,
                  quantity,
                  unitPrice,
                  discountRate,
                  tvaRate,
                  amountUntaxed,
                  amountTax,
                  amountTotal,
                  quantityDelivered: 0,
                  quantityInvoiced: 0
                };
              })
            }
          } : {})
        },
        include: {
          partner: { select: { id: true, name: true } },
          lines: { include: { product: { select: { id: true, name: true } } } }
        }
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Sales Order ${updatedOrder.reference} updated successfully`
    });
  } catch (error) {
    console.error('SalesOrders [id] PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sales order' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/sales-orders/[id] - Cancel a sales order
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if sales order exists
    const existingOrder = await db.salesOrder.findUnique({
      where: { id },
      include: {
        deliveryItems: true,
        invoices: true
      }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (existingOrder.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Sales order is already cancelled' },
        { status: 400 }
      );
    }

    // Check if can be cancelled (no deliveries or invoices for confirmed+ orders)
    if (['confirmed', 'processing', 'delivered', 'invoiced', 'done'].includes(existingOrder.status)) {
      if (existingOrder.deliveryItems.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot cancel sales order that has deliveries. Please reverse deliveries first.' },
          { status: 400 }
        );
      }
      if (existingOrder.invoices.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot cancel sales order that has invoices. Please delete invoices first.' },
          { status: 400 }
        );
      }
    }

    // Cancel the order (soft delete by changing status)
    const cancelledOrder = await db.salesOrder.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        partner: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      data: cancelledOrder,
      message: `Sales Order ${cancelledOrder.reference} has been cancelled`
    });
  } catch (error) {
    console.error('SalesOrders [id] DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel sales order' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/sales-orders/[id]/confirm - Confirm a sales order
// ============================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    // Route based on action parameter
    switch (action) {
      case 'confirm':
        return handleConfirm(id);
      case 'deliver':
        return handleDeliver(id, body);
      case 'invoice':
        return handleCreateInvoice(id, body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: confirm, deliver, or invoice' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('SalesOrders [id] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// ============================================================
// Action: Confirm Sales Order
// ============================================================
async function handleConfirm(id: string) {
  const order = await db.salesOrder.findUnique({
    where: { id },
    include: { lines: true }
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Sales order not found' },
      { status: 404 }
    );
  }

  if (!['draft', 'sent'].includes(order.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot confirm sales order with status '${order.status}'. Only draft or sent orders can be confirmed.` },
      { status: 400 }
    );
  }

  const confirmedOrder = await db.salesOrder.update({
    where: { id },
    data: { status: 'confirmed' },
    include: {
      partner: { select: { id: true, name: true } },
      lines: { include: { product: { select: { id: true, name: true } } } }
    }
  });

  return NextResponse.json({
    success: true,
    data: confirmedOrder,
    message: `Sales Order ${confirmedOrder.reference} has been confirmed`
  });
}

// ============================================================
// Action: Deliver Goods from Sales Order
// ============================================================
async function handleDeliver(id: string, body: any) {
  const order = await db.salesOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      partner: true,
      warehouse: true
    }
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Sales order not found' },
      { status: 404 }
    );
  }

  if (!['confirmed', 'processing'].includes(order.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot deliver sales order with status '${order.status}'. Order must be confirmed first.` },
      { status: 400 }
    );
  }

  // Get delivery details from body
  const { items, deliveryDate, notes, warehouseId } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Delivery items are required' },
      { status: 400 }
    );
  }

  // Determine target warehouse
  const targetWarehouseId = warehouseId || order.warehouseId;
  if (!targetWarehouseId) {
    return NextResponse.json(
      { success: false, error: 'No warehouse specified for delivery' },
      { status: 400 }
    );
  }

  // Verify warehouse exists
  const warehouse = await db.warehouse.findUnique({ where: { id: targetWarehouseId } });
  if (!warehouse) {
    return NextResponse.json(
      { success: false, error: 'Warehouse not found' },
      { status: 404 }
    );
  }

  // Process delivery in transaction
  const result = await db.$transaction(async (tx) => {
    const movements: any[] = [];
    let totalDelivered = 0;
    const now = new Date();
    const deliveryDt = deliveryDate ? new Date(deliveryDate) : now;

    // Generate movement reference
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const moveCount = await tx.stockMovement.count({
      where: {
        reference: { startsWith: `SORT-${year}-${month}` }
      }
    });
    const sequence = String(moveCount + 1).padStart(3, '0');

    for (const item of items) {
      const line = order.lines.find(l => l.id === item.lineId);
      if (!line) {
        throw new Error(`Line item ${item.lineId} not found in sales order`);
      }

      const qtyToDeliver = parseFloat(item.quantity);
      if (qtyToDeliver <= 0) {
        throw new Error(`Invalid quantity for line ${item.lineId}`);
      }

      const remainingQty = line.quantity - line.quantityDelivered;
      if (qtyToDeliver > remainingQty) {
        throw new Error(`Cannot deliver ${qtyToDeliver} units. Only ${remainingQty} remaining for this line.`);
      }

      // Create stock movement (outgoing)
      const movementRef = `SORT-${year}-${month}-${sequence}-${movements.length + 1}`;
      const movement = await tx.stockMovement.create({
        data: {
          reference: movementRef,
          date: deliveryDt,
          type: 'out',
          quantity: qtyToDeliver,
          unitCost: line.unitPrice, // Use selling price as cost reference
          totalCost: Math.round(qtyToDeliver * line.unitPrice * 100) / 100,
          notes: notes || `Delivery for SO: ${order.reference}`,
          
          productId: line.productId,
          warehouseId: targetWarehouseId,
          
          sourceDoc: 'sales_order',
          sourceId: order.id
        }
      });
      movements.push(movement);

      // Update line delivered quantity
      const newQtyDelivered = line.quantityDelivered + qtyToDeliver;
      await tx.salesOrderLine.update({
        where: { id: line.id },
        data: { quantityDelivered: newQtyDelivered }
      });

      // Calculate delivered amount for this line
      const lineRatio = qtyToDeliver / line.quantity;
      totalDelivered += line.amountTotal * lineRatio;
    }

    // Update order amounts and status
    const newAmountDelivered = order.amountDelivered + totalDelivered;
    let newStatus = order.status;
    
    // Check if fully delivered
    const allLinesFullyDelivered = order.lines.every(line => {
      const deliveredItem = items.find((item: any) => item.lineId === line.id);
      if (deliveredItem) {
        return (line.quantityDelivered + parseFloat(deliveredItem.quantity)) >= line.quantity;
      }
      return line.quantityDelivered >= line.quantity;
    });

    if (allLinesFullyDelivered && Math.abs(newAmountDelivered - order.amountTotal) < 0.01) {
      newStatus = 'delivered';
    } else if (newAmountDelivered > 0) {
      newStatus = 'processing';
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id },
      data: {
        amountDelivered: Math.round(newAmountDelivered * 100) / 100,
        deliveryDate: deliveryDt,
        status: newStatus
      },
      include: {
        partner: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true } } } }
      }
    });

    return { order: updatedOrder, movements };
  });

  return NextResponse.json({
    success: true,
    data: result.order,
    movements: result.movements,
    message: `Delivery processed for Sales Order ${result.order.reference}. ${result.movements.length} stock movement(s) created.`
  });
}

// ============================================================
// Action: Create Invoice from Sales Order
// ============================================================
async function handleCreateInvoice(id: string, body: any) {
  const order = await db.salesOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      partner: true,
      company: true
    }
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Sales order not found' },
      { status: 404 }
    );
  }

  // Allow invoicing from confirmed/processing/delivered statuses
  if (!['confirmed', 'processing', 'delivered'].includes(order.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot invoice sales order with status '${order.status}'. Order must be at least confirmed.` },
      { status: 400 }
    );
  }

  // Get invoice options from body
  const { invoiceAll, items, dueDate, paymentTerms, paymentMode, internalNotes, customerNotes } = body;
  
  // Default to invoicing all if not specified
  const shouldInvoiceAll = invoiceAll !== false;

  // Determine which lines to invoice
  let linesToInvoice: typeof order.lines;
  
  if (shouldInvoiceAll) {
    linesToInvoice = order.lines.filter(line => line.quantityInvoiced < line.quantity);
  } else if (items && Array.isArray(items)) {
    linesToInvoice = order.lines.filter(line => 
      items.some((item: any) => item.lineId === line.id)
    );
  } else {
    linesToInvoice = order.lines.filter(line => line.quantityInvoiced < line.quantity);
  }

  if (linesToInvoice.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No eligible lines to invoice (all quantities already invoiced)' },
      { status: 400 }
    );
  }

  // Create invoice in transaction
  const result = await db.$transaction(async (tx) => {
    const now = new Date();
    
    // Generate invoice reference
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const invoiceCount = await tx.invoice.count({
      where: {
        companyId: order.companyId,
        reference: { startsWith: `FACT-${year}-${month}` }
      }
    });
    const sequence = String(invoiceCount + 1).padStart(3, '0');
    const invoiceRef = `FACT-${year}-${month}-${sequence}`;

    // Prepare invoice lines
    const invoiceLines = linesToInvoice.map(line => {
      // Calculate remaining quantity to invoice
      const remainingQty = line.quantity - line.quantityInvoiced;
      
      // If specific quantity requested
      const requestedItem = items?.find((item: any) => item.lineId === line.id);
      const qtyToInvoice = requestedItem 
        ? Math.min(parseFloat(requestedItem.quantity), remainingQty)
        : remainingQty;

      const lineRatio = qtyToInvoice / line.quantity;
      
      return {
        productId: line.productId,
        label: line.description || line.product?.name || null,
        quantity: qtyToInvoice,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        tvaRate: line.tvaRate,
        amountUntaxed: Math.round(line.amountUntaxed * lineRatio * 100) / 100,
        amountTax: Math.round(line.amountTax * lineRatio * 100) / 100,
        amountTotal: Math.round(line.amountTotal * lineRatio * 100) / 100
      };
    });

    // Calculate totals
    const tvaResult = calculateTVACollectee(invoiceLines.map(l => ({
      amountUntaxed: l.amountUntaxed,
      tvaRate: l.tvaRate
    })));

    const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);
    const amountUntaxed = tvaResult.totalHT;
    const amountTax = tvaResult.totalTVACollectee;
    const amountTotal = tvaResult.totalTTC + timbreFiscal;

    // Set due date
    const invoiceDueDate = dueDate 
      ? new Date(dueDate) 
      : new Date(now.getTime() + (parseInt(paymentTerms || order.paymentTerms || '30') * 24 * 60 * 60 * 1000));

    // Create invoice with posted status (SCF auto-posting)
    const invoice = await tx.invoice.create({
      data: {
        reference: invoiceRef,
        date: now,
        dueDate: invoiceDueDate,
        status: 'posted', // Auto-post when created from validated SO
        type: 'invoice',
        
        amountUntaxed,
        amountTax,
        timbreFiscal,
        amountTotal,
        amountPaid: 0,
        amountDue: amountTotal,
        
        partnerId: order.partnerId,
        companyId: order.companyId,
        
        // Source tracking
        sourceType: 'sales_order',
        sourceId: order.id,
        
        paymentTerm: paymentTerms || order.paymentTerms || '30',
        paymentMode: paymentMode || order.paymentMode || null,
        
        internalNotes: internalNotes || `Facture générée depuis commande ${order.reference}`,
        customerNotes: customerNotes || order.customerNotes || null,
        
        lines: {
          create: invoiceLines
        }
      },
      include: {
        partner: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true } } } },
        company: true
      }
    });

    // Update sales order lines invoiced quantities
    for (const invLine of invoiceLines) {
      const soLine = linesToInvoice.find(l => l.productId === invLine.productId);
      if (soLine) {
        await tx.salesOrderLine.update({
          where: { id: soLine.id },
          data: {
            quantityInvoiced: soLine.quantityInvoiced + invLine.quantity
          }
        });
      }
    }

    // Update sales order invoiced amount
    const newAmountInvoiced = order.amountInvoiced + amountTotal;
    let newStatus = order.status;
    
    // Check if fully invoiced
    if (Math.abs(newAmountInvoiced - order.amountTotal) < 0.01) {
      newStatus = order.status === 'delivered' ? 'invoiced' : 'invoiced';
    }

    await tx.salesOrder.update({
      where: { id },
      data: {
        amountInvoiced: Math.round(newAmountInvoiced * 100) / 100,
        status: newStatus
      }
    });

    // Auto-generate SCF Journal Entry (Accounting Automation)
    try {
      const company = await tx.company.findUnique({ where: { id: order.companyId } });
      if (company) {
        await generateJournalEntry(tx, invoice, company);
      }
    } catch (journalError) {
      console.error('Warning: Failed to generate SCF journal entry:', journalError);
      // Don't fail the invoice creation - just log warning
    }

    return invoice;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: `Invoice ${result.reference} created successfully from Sales Order ${order.reference} (with SCF journal entry)`,
    workflowInfo: {
      journalEntryGenerated: true,
      scfCompliant: true
    }
  }, { status: 201 });
}
