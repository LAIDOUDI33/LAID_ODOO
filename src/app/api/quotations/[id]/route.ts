import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';

// Valid statuses that allow editing
const EDITABLE_STATUSES = ['draft', 'sent'];

// GET /api/quotations/[id] - Get single quotation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, nif: true, nis: true, rc: true, city: true, address: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, logo: true, address: true, phone: true, email: true, wilaya: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true, phone: true }
        },
        opportunity: {
          select: { id: true, title: true, status: true, expectedRevenue: true }
        },
        lines: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: { id: true, name: true, reference: true, unit: true, sellingPrice: true, tvaRate: true }
            }
          }
        },
        convertedTo: {
          select: { id: true, reference: true, status: true, date: true }
        }
      }
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Quotation GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotation' },
      { status: 500 }
    );
  }
}

// PUT /api/quotations/[id] - Update a quotation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if quotation exists
    const existingQuotation = await db.quotation.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if quotation can be edited
    if (!EDITABLE_STATUSES.includes(existingQuotation.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot update quotation with status '${existingQuotation.status}'. Only quotations in 'draft' or 'sent' status can be updated.` 
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    // Update basic fields if provided
    if (body.partnerId) {
      // Verify partner exists
      const partner = await db.partner.findUnique({ where: { id: body.partnerId } });
      if (!partner) {
        return NextResponse.json(
          { success: false, error: 'Partner not found' },
          { status: 404 }
        );
      }
      updateData.partnerId = body.partnerId;
    }
    
    if (body.paymentTerms !== undefined) {
      updateData.paymentTerms = body.paymentTerms;
    }
    
    if (body.paymentMode !== undefined) {
      updateData.paymentMode = body.paymentMode;
    }
    
    if (body.validUntil !== undefined) {
      updateData.validUntil = new Date(body.validUntil);
    }
    
    if (body.internalNotes !== undefined) {
      updateData.internalNotes = body.internalNotes;
    }
    
    if (body.customerNotes !== undefined) {
      updateData.customerNotes = body.customerNotes;
    }
    
    if (body.salesPersonId !== undefined) {
      updateData.salesPersonId = body.salesPersonId || null;
    }
    
    if (body.opportunityId !== undefined) {
      updateData.opportunityId = body.opportunityId || null;
    }

    // If lines are provided, recalculate everything
    if (body.lines && Array.isArray(body.lines) && body.lines.length > 0) {
      // Validate lines
      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i];
        if (!line.productId) {
          return NextResponse.json(
            { success: false, error: `Line ${i + 1}: Product is required` },
            { status: 400 }
          );
        }
        if (!line.quantity || parseFloat(line.quantity) <= 0) {
          return NextResponse.json(
            { success: false, error: `Line ${i + 1}: Valid quantity is required` },
            { status: 400 }
          );
        }
      }

      // Calculate new line amounts
      const linesData = body.lines.map((line: any) => {
        const quantity = parseFloat(line.quantity) || 0;
        const unitPrice = parseFloat(line.unitPrice) || 0;
        const discountRate = parseFloat(line.discountRate) || 0;
        
        let tvaRate = parseFloat(line.tvaRate);
        if (isNaN(tvaRate)) {
          tvaRate = 19;
        } else if (tvaRate > 1) {
          tvaRate = tvaRate / 100;
        }
        
        const amountUntaxedBeforeDiscount = quantity * unitPrice;
        const discountAmount = amountUntaxedBeforeDiscount * (discountRate / 100);
        const amountUntaxed = Math.round((amountUntaxedBeforeDiscount - discountAmount) * 100) / 100;
        const amountTax = Math.round(amountUntaxed * tvaRate * 100) / 100;
        const amountTotal = Math.round((amountUntaxed + amountTax) * 100) / 100;

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

      // Recalculate totals
      const tvaResult = calculateTVACollectee(linesData.map(l => ({
        amountUntaxed: l.amountUntaxed,
        tvaRate: l.tvaRate
      })));

      const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

      updateData.amountUntaxed = tvaResult.totalHT;
      updateData.amountTax = tvaResult.totalTVACollectee;
      updateData.timbreFiscal = timbreFiscal;
      updateData.amountTotal = Math.round((tvaResult.totalTTC + timbreFiscal) * 100) / 100;

      // Delete old lines and create new ones in a transaction
      await db.$transaction(async (tx) => {
        // Delete existing lines
        await tx.quotationLine.deleteMany({
          where: { quotationId: id }
        });

        // Create new lines
        await tx.quotationLine.createMany({
          data: linesData.map(line => ({
            ...line,
            quotationId: id
          }))
        });

        // Update quotation totals
        await tx.quotation.update({
          where: { id },
          data: updateData
        });
      });
    } else {
      // Just update basic fields without changing lines
      if (Object.keys(updateData).length > 0) {
        await db.quotation.update({
          where: { id },
          data: updateData
        });
      }
    }

    // Fetch updated quotation
    const updatedQuotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, nif: true, city: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, logo: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        opportunity: {
          select: { id: true, title: true, status: true }
        },
        lines: {
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

    return NextResponse.json({
      success: true,
      data: updatedQuotation,
      message: `Quotation ${existingQuotation.reference} updated successfully`
    });
  } catch (error) {
    console.error('Quotation PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update quotation' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotations/[id] - Cancel a quotation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if quotation exists
    const existingQuotation = await db.quotation.findUnique({
      where: { id },
      include: { convertedTo: true }
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (existingQuotation.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Quotation is already cancelled' },
        { status: 400 }
      );
    }

    // Check if converted (cannot cancel converted quotations)
    if (existingQuotation.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a converted quotation. Please cancel the sales order first.' },
        { status: 400 }
      );
    }

    // Cancel the quotation (soft delete by updating status)
    const cancelledQuotation = await db.quotation.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        partner: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: cancelledQuotation,
      message: `Quotation ${existingQuotation.reference} has been cancelled`
    });
  } catch (error) {
    console.error('Quotation DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel quotation' },
      { status: 500 }
    );
  }
}
