import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/quotations/[id]/send - Mark quotation as sent to customer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Check if quotation exists
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check current status - only draft can be sent
    if (quotation.status !== 'draft') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot send quotation with status '${quotation.status}'. Only quotations in 'draft' status can be sent.` 
        },
        { status: 400 }
      );
    }

    // Check if quotation is not expired
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot send an expired quotation. Please update the validity date.' },
        { status: 400 }
      );
    }

    // Update status to sent
    const updatedQuotation = await db.quotation.update({
      where: { id },
      data: { 
        status: 'sent',
        // Update customer notes if provided
        ...(body.customerNotes && { customerNotes: body.customerNotes })
      },
      include: {
        partner: {
          select: { id: true, name: true, email: true, phone: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        lines: {
          include: {
            product: {
              select: { id: true, name: true, reference: true }
            }
          }
        }
      }
    });

    // TODO: Send email notification to customer (implement email service)
    // TODO: Generate PDF if not already generated

    return NextResponse.json({
      success: true,
      data: updatedQuotation,
      message: `Quotation ${quotation.reference} has been sent to ${quotation.partner.name}`
    });
  } catch (error) {
    console.error('Quotation SEND Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send quotation' },
      { status: 500 }
    );
  }
}
