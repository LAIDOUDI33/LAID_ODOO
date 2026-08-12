import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * GET /api/attendance/[id] - Get single attendance record
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require authentication for attendance data (PII)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const attendance = await db.attendance.findUnique({
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

    if (!attendance) {
      return NextResponse.json(
        { success: false, error: "Enregistrement de pointage non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Attendance GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du pointage' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/attendance/[id] - Update attendance record (admin only)
 * This allows manual corrections to attendance data
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require HR role for attendance modifications
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if attendance record exists
    const existingRecord = await db.attendance.findUnique({ where: { id } });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: "Enregistrement de pointage non trouvé" },
        { status: 404 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    if (body.clockIn !== undefined) {
      updateData.clockIn = body.clockIn ? new Date(body.clockIn) : null;
    }

    if (body.clockOut !== undefined) {
      updateData.clockOut = body.clockOut ? new Date(body.clockOut) : null;
    }

    if (body.breakDuration !== undefined) {
      updateData.breakDuration = parseInt(body.breakDuration) || 0;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    if (body.overtimeHours !== undefined) {
      updateData.overtimeHours = parseFloat(body.overtimeHours) || 0;
    }

    // Recalculate worked hours if clock times are being updated
    const newClockIn = body.clockIn ? new Date(body.clockIn) : existingRecord.clockIn;
    const newClockOut = body.clockOut ? new Date(body.clockOut) : existingRecord.clockOut;

    if ((body.clockIn || body.clockOut) && newClockIn && newClockOut) {
      const clockInTime = newClockIn.getTime();
      const clockOutTime = newClockOut.getTime();
      const breakMinutes = body.breakDuration !== undefined 
        ? (parseInt(body.breakDuration) || 0) 
        : existingRecord.breakDuration;
      const totalMs = clockOutTime - clockInTime;
      const breakMs = breakMinutes * 60 * 1000;
      const workedMs = Math.max(0, totalMs - breakMs);
      updateData.workedHours = parseFloat((workedMs / (1000 * 60 * 60)).toFixed(2));
      
      // Recalculate overtime
      updateData.overtimeHours = body.overtimeHours !== undefined 
        ? parseFloat(body.overtimeHours) || 0
        : Math.max(0, parseFloat((updateData.workedHours - 8).toFixed(2)));
    } else if (body.workedHours !== undefined) {
      updateData.workedHours = parseFloat(body.workedHours) || 0;
    }

    const attendance = await db.attendance.update({
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
      data: attendance,
      message: "Pointage mis à jour avec succès"
    });
  } catch (error) {
    console.error('Attendance PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du pointage' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/attendance/[id] - Delete attendance record (admin only)
 * Use with caution - this permanently removes the record
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require HR role for attendance deletion
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager']);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Check if attendance record exists
    const existingRecord = await db.attendance.findUnique({ where: { id } });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: "Enregistrement de pointage non trouvé" },
        { status: 404 }
      );
    }

    await db.attendance.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Enregistrement de pointage supprimé avec succès"
    });
  } catch (error) {
    console.error('Attendance DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du pointage' },
      { status: 500 }
    );
  }
}
