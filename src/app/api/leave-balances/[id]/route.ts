import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-utils';

/**
 * GET /api/leave-balances/[id] - Get single leave balance
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const balance = await db.leaveBalance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true
          }
        }
      }
    });

    if (!balance) {
      return NextResponse.json(
        { success: false, error: "Solde de congés non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: balance });
  } catch (error) {
    console.error('LeaveBalance GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du solde de congés' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leave-balances/[id] - Update leave balance (adjust allocations)
 * Only HR/Manager can adjust allocations
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if balance exists
    const existingBalance = await db.leaveBalance.findUnique({ where: { id } });

    if (!existingBalance) {
      return NextResponse.json(
        { success: false, error: "Solde de congés non trouvé" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (body.totalAllocated !== undefined) {
      if (body.totalAllocated < 0) {
        return NextResponse.json(
          { success: false, error: "L'allocation totale ne peut pas être négative" },
          { status: 400 }
        );
      }
      updateData.totalAllocated = body.totalAllocated;
    }

    if (body.totalUsed !== undefined) {
      if (body.totalUsed < 0) {
        return NextResponse.json(
          { success: false, error: "Le total utilisé ne peut pas être négatif" },
          { status: 400 }
        );
      }
      updateData.totalUsed = body.totalUsed;
    }

    if (body.totalPending !== undefined) {
      if (body.totalPending < 0) {
        return NextResponse.json(
          { success: false, error: "Le total en attente ne peut pas être négatif" },
          { status: 400 }
        );
      }
      updateData.totalPending = body.totalPending;
    }

    // Recalculate remaining if any value changed
    if (Object.keys(updateData).length > 0) {
      const newAllocated = body.totalAllocated ?? existingBalance.totalAllocated;
      const newUsed = body.totalUsed ?? existingBalance.totalUsed;
      const newPending = body.totalPending ?? existingBalance.totalPending;
      updateData.remaining = newAllocated - newUsed - newPending;
    }

    const balance = await db.leaveBalance.update({
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
      data: balance,
      message: "Solde de congés mis à jour avec succès"
    });
  } catch (error) {
    console.error('LeaveBalance PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du solde de congés' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leave-balances/[id] - Delete leave balance
 * Only admin can delete balances (with confirmation)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(request, ['admin']);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Check if balance exists
    const existingBalance = await db.leaveBalance.findUnique({ where: { id } });

    if (!existingBalance) {
      return NextResponse.json(
        { success: false, error: "Solde de congés non trouvé" },
        { status: 404 }
      );
    }

    // Prevent deletion if there's used leave
    if (existingBalance.totalUsed > 0) {
      return NextResponse.json(
        { success: false, error: "Impossible de supprimer un solde de congés avec des jours utilisés" },
        { status: 400 }
      );
    }

    await db.leaveBalance.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Solde de congés supprimé avec succès"
    });
  } catch (error) {
    console.error('LeaveBalance DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du solde de congés' },
      { status: 500 }
    );
  }
}
