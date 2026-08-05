import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/quotations/[id]/accept - Accept quotation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const autoConvert = body.autoConvert === true;

    // Check if quotation exists
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, email: true }
        },
        lines: {
          include: {
            product: {
              select: { id: true, name: true, reference: true }
            }
          }
        },
        company: {
          select: { id: true, name: true }
        }
      }
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if quotation can be accepted
    const acceptableStatuses = ['sent', 'viewed'];
    if (!acceptableStatuses.includes(quotation.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot accept quotation with status '${quotation.status}'. Only quotations in 'sent' or 'viewed' status can be accepted.` 
        },
        { status: 400 }
      );
    }

    // Check if quotation is expired
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      // Allow acceptance of expired quotations but with a warning
      console.warn(`Accepting expired quotation: ${quotation.reference}`);
    }

    // Check if already converted
    if (quotation.convertedToId) {
      return NextResponse.json(
        { success: false, error: 'This quotation has already been converted to a sales order.' },
        { status: 400 }
      );
    }

    // Update status to accepted
    const acceptedQuotation = await db.quotation.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        partner: {
          select: { id: true, name: true, email: true, phone: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        opportunity: {
          select: { id: true, title: true }
        }
      }
    });

    let result: any = {
      success: true,
      data: acceptedQuotation,
      message: `Quotation ${quotation.reference} has been accepted`,
      converted: false
    };

    // Auto-convert to Sales Order if requested
    if (autoConvert) {
      try {
        const salesOrder = await convertToSalesOrder(quotation);
        result.converted = true;
        result.salesOrder = salesOrder;
        result.message += ` and converted to Sales Order ${salesOrder.reference}`;
      } catch (convertError) {
        console.error('Auto-convert failed:', convertError);
        result.message += '. Auto-conversion to Sales Order failed.';
        result.convertError = 'Failed to auto-convert to Sales Order';
      }
    }

    // TODO: Update linked opportunity status if exists
    if (quotation.opportunityId) {
      try {
        await db.opportunity.update({
          where: { id: quotation.opportunityId },
          data: { 
            stage: 'won',
            probability: 100,
            closedAt: new Date()
          }
        });
      } catch (e) {
        console.error('Failed to update opportunity:', e);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Quotation ACCEPT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept quotation' },
      { status: 500 }
    );
  }
}

// Helper function to convert quotation to sales order
async function convertToSalesOrder(quotation: any) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Generate Sales Order reference (CMD-YYYY-MM-XXX)
  const soCount = await db.salesOrder.count({
    where: {
      companyId: quotation.companyId,
      reference: { startsWith: `CMD-${year}-${month}` }
    }
  });
  const sequence = String(soCount + 1).padStart(3, '0');
  const reference = `CMD-${year}-${month}-${sequence}`;

  // Create Sales Order from Quotation
  const salesOrder = await db.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        reference,
        
        // Copy from quotation
        partnerId: quotation.partnerId,
        companyId: quotation.companyId,
        date: now,
        
        // Amounts
        amountUntaxed: quotation.amountUntaxed,
        amountTax: quotation.amountTax,
        timbreFiscal: quotation.timbreFiscal,
        amountTotal: quotation.amountTotal,
        
        // Payment terms
        paymentTerms: quotation.paymentTerms,
        paymentMode: quotation.paymentMode,
        
        // Notes
        internalNotes: quotation.internalNotes ? `[From DEV] ${quotation.internalNotes}` : '[From Quotation]',
        customerNotes: quotation.customerNotes,
        
        // References
        quotationId: quotation.id,
        opportunityId: quotation.opportunityId,
        salesPersonId: quotation.salesPersonId,
        
        // Status
        status: 'confirmed',
        
        // Lines
        lines: {
          create: quotation.lines.map((line: any) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountRate: line.discountRate,
            tvaRate: line.tvaRate,
            amountUntaxed: line.amountUntaxed,
            amountTax: line.amountTax,
            amountTotal: line.amountTotal
          }))
        }
      },
      include: {
        partner: { select: { id: true, name: true } },
        lines: { include: { product: { select: { name: true } } } }
      }
    });

    // Update quotation status and link
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: 'converted',
        convertedToId: order.id
      }
    });

    return order;
  });

  return salesOrder;
}
