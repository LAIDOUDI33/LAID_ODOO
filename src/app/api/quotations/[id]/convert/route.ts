import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/quotations/[id]/convert - Convert quotation to Sales Order
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Get full quotation with all relations
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, nif: true, city: true, address: true }
        },
        company: {
          select: { id: true, name: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        opportunity: {
          select: { id: true, title: true, stage: true }
        },
        lines: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: { id: true, name: true, reference: true, unit: true }
            }
          }
        },
        convertedTo: {
          select: { id: true, reference: true, status: true }
        }
      }
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if quotation can be converted
    const convertibleStatuses = ['accepted'];
    
    // Also allow conversion from other statuses if explicitly requested (force mode)
    const forceConvert = body.force === true;
    if (!forceConvert && !convertibleStatuses.includes(quotation.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot convert quotation with status '${quotation.status}'. Quotation must be 'accepted' before conversion. Use force=true to override.` 
        },
        { status: 400 }
      );
    }

    // Check if already converted
    if (quotation.convertedToId || quotation.convertedTo) {
      return NextResponse.json(
        { 
          success: false, 
          error: `This quotation has already been converted to Sales Order ${quotation.convertedTo?.reference || quotation.convertedToId}.` 
        },
        { status: 400 }
      );
    }

    // Check if quotation has lines
    if (!quotation.lines || quotation.lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot convert a quotation without lines.' },
        { status: 400 }
      );
    }

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

    // Calculate expected delivery date based on payment terms or default 30 days
    const expectedDeliveryDays = parseInt(body.expectedDeliveryDays || quotation.paymentTerms || '30');
    const expectedDate = new Date(now.getTime() + (expectedDeliveryDays * 24 * 60 * 60 * 1000));

    // Perform conversion in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create Sales Order
      const salesOrder = await tx.salesOrder.create({
        data: {
          reference,
          
          // Customer & Company
          partnerId: quotation.partnerId,
          companyId: quotation.companyId,
          
          // Dates
          date: now,
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : expectedDate,
          
          // Status - start as confirmed (ready for processing)
          status: body.initialStatus || 'confirmed',
          
          // Amounts (copy from quotation)
          amountUntaxed: quotation.amountUntaxed,
          amountTax: quotation.amountTax,
          timbreFiscal: quotation.timbreFiscal,
          amountTotal: quotation.amountTotal,
          
          // Payment conditions
          paymentTerms: quotation.paymentTerms,
          paymentMode: quotation.paymentMode,
          
          // Delivery info
          shippingAddress: body.shippingAddress || null,
          warehouseId: body.warehouseId || null,
          
          // Notes
          internalNotes: body.internalNotes || quotation.internalNotes 
            ? `[Converted from DEV-${quotation.reference}] ${quotation.internalNotes || ''}`.trim()
            : `[Converted from DEV-${quotation.reference}]`,
          customerNotes: quotation.customerNotes,
          
          // References
          quotationId: quotation.id,
          opportunityId: quotation.opportunityId,
          salesPersonId: quotation.salesPersonId,
          
          // Lines - copy from quotation
          lines: {
            create: quotation.lines.map((line) => ({
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
          partner: {
            select: { id: true, name: true, nif: true, city: true, email: true, phone: true }
          },
          company: {
            select: { id: true, name: true }
          },
          salesPerson: {
            select: { id: true, name: true, email: true }
          },
          opportunity: {
            select: { id: true, title: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, name: true, reference: true, unit: true }
              }
            }
          },
          quotation: {
            select: { id: true, reference: true, date: true }
          }
        }
      });

      // Update quotation status to converted
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'converted',
          convertedToId: salesOrder.id
        }
      });

      // Update opportunity if linked
      if (quotation.opportunityId) {
        await tx.opportunity.update({
          where: { id: quotation.opportunityId },
          data: {
            stage: 'won',
            probability: 100,
            closedAt: now
          }
        });
      }

      return salesOrder;
    });

    return NextResponse.json({
      success: true,
      data: {
        quotation: {
          id: quotation.id,
          reference: quotation.reference,
          status: 'converted'
        },
        salesOrder: result
      },
      message: `Quotation ${quotation.reference} successfully converted to Sales Order ${result.reference}`
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation CONVERT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert quotation to Sales Order' },
      { status: 500 }
    );
  }
}
