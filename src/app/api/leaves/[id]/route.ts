import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * GET /api/leaves/[id] - Get single leave request
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require authentication for leave data (PII)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const leave = await db.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
            phone: true,
            workEmail: true
          }
        }
      }
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, error: "Demande de congés non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: leave });
  } catch (error) {
    console.error('Leave GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la demande de congés' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leaves/[id] - Update leave request (only if draft or submitted)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require authentication for leave updates (employee can update own draft/submitted)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if leave exists
    const existingLeave = await db.leaveRequest.findUnique({ where: { id } });

    if (!existingLeave) {
      return NextResponse.json(
        { success: false, error: "Demande de congés non trouvée" },
        { status: 404 }
      );
    }

    // Only allow updates for draft or submitted status
    if (!['draft', 'submitted'].includes(existingLeave.status)) {
      return NextResponse.json(
        { success: false, error: "Seules les demandes en brouillon ou soumises peuvent être modifiées" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (body.type !== undefined) updateData.type = body.type;
    
    if (body.startDate !== undefined || body.endDate !== undefined) {
      const startDate = body.startDate ? new Date(body.startDate) : existingLeave.startDate;
      const endDate = body.endDate ? new Date(body.endDate) : existingLeave.endDate;

      if (startDate > endDate) {
        return NextResponse.json(
          { success: false, error: "La date de début doit être antérieure à la date de fin" },
          { status: 400 }
        );
      }

      updateData.startDate = startDate;
      updateData.endDate = endDate;

      // Recalculate days count
      const isHalfDay = startDate.toDateString() === endDate.toDateString();
      updateData.halfDay = isHalfDay;
      updateData.daysCount = isHalfDay ? 0.5 : calculateBusinessDays(startDate, endDate);

      // Check for overlapping leaves (excluding current)
      const overlappingLeave = await db.leaveRequest.findFirst({
        where: {
          employeeId: existingLeave.employeeId,
          status: { in: ['draft', 'submitted', 'approved'] },
          id: { not: id },
          OR: [
            { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate } }] },
            { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }] },
            { AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate } }] }
          ]
        }
      });

      if (overlappingLeave) {
        return NextResponse.json(
          { success: false, error: "Une demande de congés existe déjà pour cette période" },
          { status: 409 }
        );
      }
    }

    if (body.reason !== undefined) updateData.reason = body.reason || null;
    if (body.halfDay !== undefined) updateData.halfDay = body.halfDay;
    if (body.morningOnly !== undefined) updateData.morningOnly = body.morningOnly;
    if (body.status === 'submitted') updateData.status = 'submitted';

    const leave = await db.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: leave,
      message: "Demande de congés mise à jour avec succès"
    });
  } catch (error) {
    console.error('Leave PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de la demande de congés' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leaves/[id]/approve - Approve leave request
 * Body: approvedBy (user ID)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require HR/Manager role for approve/reject actions
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  // Get user for audit logging
  const user = await getAuthenticatedUser();

  try {
    const { id } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Check if leave exists
    const existingLeave = await db.leaveRequest.findUnique({ where: { id } });

    if (!existingLeave) {
      return NextResponse.json(
        { success: false, error: "Demande de congés non trouvée" },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'approve') {
      // Can only approve submitted leaves
      if (existingLeave.status !== 'submitted') {
        return NextResponse.json(
          { success: false, error: "Seules les demandes soumises peuvent être approuvées" },
          { status: 400 }
        );
      }

      const approvedBy = body.approvedBy || body.userId;

      const leave = await db.leaveRequest.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: approvedBy || null,
          approvedAt: new Date()
        },
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: leave,
        message: "Demande de congés approuvée avec succès"
      });
    }

    if (action === 'reject') {
      // Can only reject submitted or approved leaves
      if (!['submitted', 'approved'].includes(existingLeave.status)) {
        return NextResponse.json(
          { success: false, error: "Cette demande ne peut pas être rejetée dans son état actuel" },
          { status: 400 }
        );
      }

      if (!body.rejectReason && !body.reason) {
        return NextResponse.json(
          { success: false, error: "La raison du rejet est obligatoire" },
          { status: 400 }
        );
      }

      const leave = await db.leaveRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectReason: body.rejectReason || body.reason
        },
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: leave,
        message: "Demande de congés rejetée"
      });
    }

    // Default POST behavior: submit for approval
    if (existingLeave.status === 'draft') {
      const leave = await db.leaveRequest.update({
        where: { id },
        data: { status: 'submitted' },
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: leave,
        message: "Demande de congés soumise pour approbation"
      });
    }

    return NextResponse.json(
      { success: false, error: "Action non valide. Utilisez ?action=approve ou ?action=reject" },
      { status: 400 }
    );
  } catch (error) {
    console.error('Leave POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement de la demande de congés' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leaves/[id] - Delete leave request (only if draft)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require authentication for leave deletion (own drafts only)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Check if leave exists
    const existingLeave = await db.leaveRequest.findUnique({ where: { id } });

    if (!existingLeave) {
      return NextResponse.json(
        { success: false, error: "Demande de congés non trouvée" },
        { status: 404 }
      );
    }

    // Only allow deletion for draft status
    if (existingLeave.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: "Seules les demandes en brouillon peuvent être supprimées" },
        { status: 400 }
      );
    }

    await db.leaveRequest.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Demande de congés supprimée avec succès"
    });
  } catch (error) {
    console.error('Leave DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la demande de congés' },
      { status: 500 }
    );
  }
}

/**
 * Calculate business days between two dates (excluding weekends)
 * In Algeria, weekend is Friday and Saturday
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Exclude Friday (5) and Saturday (6)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
