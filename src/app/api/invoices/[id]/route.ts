import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';

// Valid statuses for updates
const UPDATABLE_STATUSES = ['draft', 'sent', 'partial'];
const CANCELLABLE_STATUSES = ['draft', 'sent', 'partial', 'overdue'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id] - Get single invoice
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        partner: true,
        company: true,
        lines: {
          include: { product: true },
          orderBy: { createdAt: 'asc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Invoice GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update an invoice
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Check if invoice exists
    const existingInvoice = await db.invoice.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can be updated
    if (!UPDATABLE_STATUSES.includes(existingInvoice.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot update invoice with status '${existingInvoice.status}'. Only invoices with status: ${UPDATABLE_STATUSES.join(', ')} can be updated.` 
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    let recalculateAmounts = false;

    // Update status if provided
    if (body.status && body.status !== existingInvoice.status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        draft: ['sent', 'cancelled'],
        sent: ['draft', 'paid', 'partial', 'cancelled'],
        partial: ['paid', 'cancelled']
      };

      if (validTransitions[existingInvoice.status]?.includes(body.status)) {
        updateData.status = body.status;
        
        // Auto-set paid date when marking as paid
        if (body.status === 'paid') {
          updateData.paidDate = new Date();
          updateData.amountPaid = existingInvoice.amountTotal;
          updateData.amountDue = 0;
        }
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid status transition from '${existingInvoice.status}' to '${body.status}'` 
          },
          { status: 400 }
        );
      }
    }

    // Update payment info
    if (body.paymentMode !== undefined) {
      updateData.paymentMode = body.paymentMode;
    }

    if (body.paymentTerm !== undefined) {
      updateData.paymentTerm = body.paymentTerm;
      // Recalculate due date if payment term changes
      if (existingInvoice.date) {
        const days = parseInt(body.paymentTerm) || 30;
        updateData.dueDate = new Date(existingInvoice.date.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Update notes
    if (body.customerNotes !== undefined) {
      updateData.customerNotes = body.customerNotes;
    }

    if (body.internalNotes !== undefined) {
      updateData.internalNotes = body.internalNotes;
    }

    // Update due date if explicitly provided
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    // Handle line updates - this requires full recalculation
    if (body.lines && Array.isArray(body.lines) && body.lines.length > 0) {
      recalculateAmounts = true;

      // Calculate new line amounts
      const linesData = body.lines.map((line: any) => ({
        id: line.id || undefined, // Keep existing ID for updates
        productId: line.productId,
        label: line.label || null,
        quantity: parseFloat(line.quantity) || 0,
        unitPrice: parseFloat(line.unitPrice) || 0,
        discountRate: parseFloat(line.discountRate) || 0,
        tvaRate: parseFloat(line.tvaRate) || 0.19,
        amountUntaxed: Math.round((parseFloat(line.quantity) * parseFloat(line.unitPrice)) * 100) / 100,
        amountTax: 0,
        amountTotal: 0
      }));

      // Calculate TVA for each line
      linesData.forEach((line: any) => {
        const montantHTApresRemise = line.amountUntaxed * (1 - line.discountRate / 100);
        line.amountUntaxed = Math.round(montantHTApresRemise * 100) / 100;
        line.amountTax = Math.round(line.amountUntaxed * line.tvaRate * 100) / 100;
        line.amountTotal = line.amountUntaxed + line.amountTax;
      });

      // Calculate totals using TVA engine
      const tvaResult = calculateTVACollectee(linesData.map((l: any) => ({ 
        amountUntaxed: l.amountUntaxed, 
        tvaRate: l.tvaRate 
      })));

      // Get timbre fiscal
      const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

      // Update amounts
      updateData.amountUntaxed = tvaResult.totalHT;
      updateData.amountTax = tvaResult.totalTVACollectee;
      updateData.timbreFiscal = timbreFiscal;
      updateData.amountTotal = tvaResult.totalTTC + timbreFiscal;
      
      // Recalculate amount due based on payments already made
      const currentPaid = existingInvoice.amountPaid || 0;
      updateData.amountDue = Math.max(0, updateData.amountTotal - currentPaid);

      // Store lines data for transaction
      (updateData as any)._linesData = linesData;
    } else if (body.amountPaid !== undefined) {
      // Manual payment amount update
      const newAmountPaid = parseFloat(body.amountPaid) || 0;
      updateData.amountPaid = newAmountPaid;
      updateData.amountDue = Math.max(0, existingInvoice.amountTotal - newAmountPaid);
      
      // Auto-update status based on payment
      if (newAmountPaid >= existingInvoice.amountTotal) {
        updateData.status = 'paid';
        updateData.paidDate = new Date();
      } else if (newAmountPaid > 0) {
        updateData.status = 'partial';
      }
    }

    // Perform update in a transaction if lines need updating
    let updatedInvoice;
    
    if (recalculateAmounts && (updateData as any)._linesData) {
      const linesData = (updateData as any)._linesData;
      delete (updateData as any)._linesData;

      updatedInvoice = await db.$transaction(async (tx) => {
        // Delete existing lines
        await tx.invoiceLine.deleteMany({
          where: { invoiceId: id }
        });

        // Update invoice
        const invoice = await tx.invoice.update({
          where: { id },
          data: updateData,
          include: {
            partner: true,
            lines: { include: { product: true } }
          }
        });

        // Create new lines
        await tx.invoiceLine.createMany({
          data: linesData.map((line: any) => ({
            ...line,
            invoiceId: id
          }))
        });

        // Return invoice with lines
        return tx.invoice.findUnique({
          where: { id },
          include: {
            partner: true,
            lines: { include: { product: true } }
          }
        });
      });
    } else {
      updatedInvoice = await db.invoice.update({
        where: { id },
        data: updateData,
        include: {
          partner: true,
          lines: { include: { product: true } }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedInvoice,
      message: `Invoice ${updatedInvoice.reference} updated successfully`
    });
  } catch (error) {
    console.error('Invoice PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Cancel/Soft delete an invoice
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Check if invoice exists
    const existingInvoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is already cancelled
    if (existingInvoice.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Invoice is already cancelled' },
        { status: 400 }
      );
    }

    // Validate invoice can be cancelled
    if (!CANCELLABLE_STATUSES.includes(existingInvoice.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot cancel invoice with status '${existingInvoice.status}'. Only invoices with status: ${CANCELLABLE_STATUSES.join(', ')} can be cancelled.` 
        },
        { status: 400 }
      );
    }

    // Check if invoice is fully paid
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a fully paid invoice. Please process a credit note instead.' },
        { status: 400 }
      );
    }

    // Check if there are payments that need to be handled
    if (existingInvoice.payments && existingInvoice.payments.length > 0) {
      const totalPayments = existingInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPayments > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invoice has payments totaling ${totalPayments}. Please refund payments before cancelling or contact support.` 
          },
          { status: 400 }
        );
      }
    }

    // Soft delete - set status to cancelled
    const cancelledInvoice = await db.invoice.update({
      where: { id },
      data: {
        status: 'cancelled',
        internalNotes: `${existingInvoice.internalNotes ? existingInvoice.internalNotes + '\n' : ''}[CANCELLED] Invoice cancelled on ${new Date().toISOString()}`
      },
      include: {
        partner: true,
        lines: { include: { product: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cancelledInvoice,
      message: `Invoice ${cancelledInvoice.reference} has been cancelled`
    });
  } catch (error) {
    console.error('Invoice DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel invoice' },
      { status: 500 }
    );
  }
}
