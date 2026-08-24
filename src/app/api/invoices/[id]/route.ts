import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';
import { postInvoiceToJournal } from '@/lib/auto-posting';
import { 
  validateTransition, 
  isTerminalStatus,
  INVOICE_STATE_MACHINE 
} from '@/lib/state-machine';
import { AuditLogger, AuditModule } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id] - Get single invoice
export async function GET(request: Request, context: RouteContext) {
  // SECURITY: Require authentication for financial data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  // C-02 FIX: Get authenticated user for company access control
  const user = await getAuthenticatedUser();
  
  try {
    const { id } = await context.params;
    
    // C-02 FIX: Build where clause with company access control
    // Only super_admin and admin can access invoices across all companies
    // Other users can only access invoices from their own company
    const whereClause: any = { id };
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      whereClause.companyId = user?.companyId;
    }
    
    const invoice = await db.invoice.findUnique({
      where: whereClause,
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
      // C-02 FIX: Return 403 if invoice exists but belongs to another company (access denied)
      // vs 404 if invoice truly doesn't exist
      const invoiceExists = await db.invoice.findUnique({
        where: { id },
        select: { id: true }
      });
      
      if (invoiceExists) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You do not have permission to view this invoice' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // M-05 FIX: Audit log for sensitive financial data access (invoice details)
    await AuditLogger.logRead(request, AuditModule.accounting, "Invoice", id, {
      action: "VIEW_INVOICE_DETAILS",
      accessedBy: user?.id,
      piiAccess: 'full',
      details: {
        invoiceReference: invoice.reference,
        amountTotal: invoice.amountTotal,
        status: invoice.status
      },
      user: user ? { id: user.id!, name: user.name || '', email: user.email || '' } : undefined
    }).catch(console.error);

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
  // SECURITY: Require appropriate role for invoice modification
  const authError = await requireRole(request, ['admin', 'manager', 'accountant', 'sales_manager']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
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

    // H-17 FIX: Use state machine to check if invoice can be updated (non-terminal status)
    if (isTerminalStatus('invoice', existingInvoice.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot update invoice with status '${existingInvoice.status}'. This is a terminal status and cannot be modified.` 
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    let recalculateAmounts = false;

    // Update status if provided
    if (body.status && body.status !== existingInvoice.status) {
      // H-17 FIX: Use centralized state machine for status transition validation
      const userRole = user?.role;
      const validationResult = validateTransition(
        'invoice',
        existingInvoice.status,
        body.status,
        userRole
      );

      if (!validationResult.valid) {
        return NextResponse.json(
          { 
            success: false, 
            error: validationResult.error || 'Invalid status transition' 
          },
          { status: 400 }
        );
      }

      // Apply the validated status change
      updateData.status = body.status;

      // H-17 FIX: Apply auto-timestamps from state machine validation
      if (validationResult.autoFields) {
        Object.assign(updateData, validationResult.autoFields);
      }

      // Auto-calculate payment amounts when marking as paid
      if (body.status === 'paid') {
        updateData.amountPaid = existingInvoice.amountTotal;
        updateData.amountDue = 0;
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

    // C-06: Auto-post invoice to journal when status changes to 'sent' or 'paid'
    let journalPostingResult = null;
    if (
      (updatedInvoice.status === 'sent' || updatedInvoice.status === 'paid') &&
      !updatedInvoice.journalEntryId &&
      user
    ) {
      journalPostingResult = await postInvoiceToJournal(updatedInvoice.id, user.id);
      if (journalPostingResult.success) {
        // Refresh the invoice to include the new journal entry ID
        updatedInvoice = await db.invoice.findUnique({
          where: { id },
          include: {
            partner: true,
            lines: { include: { product: true } }
          }
        }) as typeof updatedInvoice;
      } else {
        console.warn(`Auto-posting failed for invoice ${updatedInvoice.reference}:`, journalPostingResult.error);
        // Don't fail the update - just log the warning
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedInvoice,
      message: `Invoice ${updatedInvoice.reference} updated successfully${journalPostingResult?.success ? ' (Journal entry created)' : ''}`
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
  // SECURITY: Require appropriate role for invoice cancellation
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
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

    // H-17 FIX: Use state machine to validate cancellation transition
    const cancelValidation = validateTransition(
      'invoice',
      existingInvoice.status,
      'cancelled',
      user?.role
    );

    if (!cancelValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: cancelValidation.error || `Cannot cancel invoice with status '${existingInvoice.status}'.` 
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
