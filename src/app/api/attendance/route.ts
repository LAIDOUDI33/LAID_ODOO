import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/attendance - List attendance records with filters
 * Query params: employeeId, dateFrom, dateTo, status, page, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const whereClause: Record<string, any> = {};

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (dateFrom || dateTo) {
      whereClause.AND = [];
      if (dateFrom) {
        // Set time to start of day for dateFrom
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        whereClause.AND.push({ date: { gte: fromDate } });
      }
      if (dateTo) {
        // Set time to end of day for dateTo
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        whereClause.AND.push({ date: { lte: toDate } });
      }
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Get pagination info
    const total = await db.attendance.count({ where: whereClause });
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch attendance records with pagination
    const attendances = await db.attendance.findMany({
      where: whereClause,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
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

    return NextResponse.json({
      success: true,
      data: attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Attendance GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des pointages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance - Clock in/out
 * Body: employeeId, action? ('clock_in'|'clock_out'), clockIn?, clockOut?, breakDuration?, notes?
 * 
 * Logic:
 * - If no open record for today: create new with clockIn
 * - If open record exists: update with clockOut, calculate workedHours
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId) {
      return NextResponse.json(
        { success: false, error: "L'identifiant de l'employé est obligatoire" },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employé non trouvé" },
        { status: 404 }
      );
    }

    // Get today's date (start of day)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Check for existing record for this employee today
    const existingRecord = await db.attendance.findFirst({
      where: {
        employeeId: body.employeeId,
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const action = body.action;

    // Handle explicit action or auto-detect based on existing record
    if (action === 'clock_out' || (!action && existingRecord && !existingRecord.clockOut)) {
      // CLOCK OUT
      if (!existingRecord) {
        return NextResponse.json(
          { success: false, error: "Aucun pointage d'entrée trouvé pour aujourd'hui" },
          { status: 400 }
        );
      }

      if (existingRecord.clockOut) {
        return NextResponse.json(
          { success: false, error: "Le pointage de sortie a déjà été enregistré" },
          { status: 400 }
        );
      }

      const clockOut = body.clockOut ? new Date(body.clockOut) : new Date();
      const clockInTime = existingRecord.clockIn!.getTime();
      const clockOutTime = clockOut.getTime();

      // Calculate worked hours in hours (excluding break)
      const totalMs = clockOutTime - clockInTime;
      const breakMinutes = parseInt(body.breakDuration) || existingRecord.breakDuration || 0;
      const breakMs = breakMinutes * 60 * 1000;
      const workedMs = Math.max(0, totalMs - breakMs);
      const workedHours = parseFloat((workedMs / (1000 * 60 * 60)).toFixed(2));

      // Calculate overtime (after 8 hours standard workday)
      const overtimeHours = Math.max(0, parseFloat((workedHours - 8).toFixed(2)));

      const attendance = await db.attendance.update({
        where: { id: existingRecord.id },
        data: {
          clockOut,
          breakDuration: breakMinutes,
          workedHours,
          overtimeHours,
          notes: body.notes || existingRecord.notes
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
        data: attendance,
        message: `Pointage de sortie enregistré. Durée travaillée: ${workedHours}h`
      });
    } else {
      // CLOCK IN
      if (existingRecord && !existingRecord.clockOut) {
        return NextResponse.json(
          { success: false, error: "Un pointage d'entrée est déjà en cours. Veuillez pointer la sortie d'abord." },
          { status: 400 }
        );
      }

      const clockIn = body.clockIn ? new Date(body.clockIn) : new Date();

      // Determine initial status based on time (late after 9:00 AM)
      let initialStatus = 'present';
      const hour = clockIn.getHours();
      const minute = clockIn.getMinutes();
      if (hour > 9 || (hour === 9 && minute > 0)) {
        initialStatus = 'late';
      }

      const attendance = await db.attendance.create({
        data: {
          date: clockIn,
          clockIn,
          breakDuration: body.breakDuration || 0,
          status: initialStatus,
          notes: body.notes || null,
          employeeId: body.employeeId
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
        data: attendance,
        message: `Pointage d'entrée enregistré à ${clockIn.toLocaleTimeString('fr-DZ')}`
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Attendance POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du pointage' },
      { status: 500 }
    );
  }
}
