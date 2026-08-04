import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/quotations/[id]/reject - Reject quotation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.reason || null;

    // Check if quotation exists
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, email: true }
        },
        opportunity: {
          select: { id: true, title: true, stage: true }
        }
      }
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if quotation can be rejected
    const rejectableStatuses = ['sent', 'viewed', 'accepted'];
    if (!rejectableStatuses.includes(quotation.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot reject quotation with status '${quotation.status}'. Only quotations in 'sent', 'viewed', or 'accepted' status can be rejected.` 
        },
        { status: 400 }
      );
    }

    // Check if already converted
    if (quotation.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'Cannot reject a quotation that has been converted to a sales order.' },
        { status: 400 }
      );
    }

    // Update status to rejected with reason in notes
    const notesParts: string[] = [];
    if (quotation.internalNotes) {
      notesParts.push(quotation.internalNotes);
    }
    if (rejectionReason) {
      notesParts.push(`[REJECTION REASON] ${rejectionReason}`);
    }
    
    const rejectedQuotation = await db.quotation.update({
      where: { id },
      data: { 
        status: 'rejected',
        internalNotes: notesParts.length > 0 ? notesParts.join('\n\n') : null
      },
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

    // Update linked opportunity status if exists
    if (quotation.opportunityId && quotation.opportunity?.stage !== 'lost') {
      try {
        await db.opportunity.update({
          where: { id: quotation.opportunityId },
          data: { 
            stage: 'lost',
            probability: 0,
            closedAt: new Date()
          }
        });
      } catch (e) {
        console.error('Failed to update opportunity:', e);
      }
    }

    // TODO: Notify sales person about rejection

    return NextResponse.json({
      success: true,
      data: rejectedQuotation,
      message: `Quotation ${quotation.reference} has been rejected${rejectionReason ? `. Reason: ${rejectionReason}` : ''}`
    });
  } catch (error) {
    console.error('Quotation REJECT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject quotation' },
      { status: 500 }
    );
  }
}
