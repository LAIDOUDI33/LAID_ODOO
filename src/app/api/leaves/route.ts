import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/leaves - List leave requests with filters
 * Query params: employeeId, status, type, dateFrom, dateTo, page, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const whereClause: Record<string, any> = {};

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    if (dateFrom || dateTo) {
      whereClause.AND = [];
      if (dateFrom) {
        whereClause.AND.push({ startDate: { gte: new Date(dateFrom) } });
      }
      if (dateTo) {
        whereClause.AND.push({ endDate: { lte: new Date(dateTo) } });
      }
    }

    // Get pagination info
    const total = await db.leaveRequest.count({ where: whereClause });
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch leaves with pagination
    const leaves = await db.leaveRequest.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
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
      data: leaves,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Leaves GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des demandes de congés' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leaves - Create new leave request
 * Body: employeeId, type, startDate, endDate, reason?, morningOnly?
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.type || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "L'identifiant de l'employé, le type, la date de début et la date de fin sont obligatoires" },
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

    // Parse dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: "La date de début doit être antérieure à la date de fin" },
        { status: 400 }
      );
    }

    // Calculate days count (excluding weekends)
    const daysCount = calculateBusinessDays(startDate, endDate);

    // Auto-detect half day
    const isHalfDay = startDate.toDateString() === endDate.toDateString();
    const halfDay = body.halfDay !== undefined ? body.halfDay : isHalfDay;

    // Check for overlapping leaves
    const overlappingLeave = await db.leaveRequest.findFirst({
      where: {
        employeeId: body.employeeId,
        status: { in: ['draft', 'submitted', 'approved'] },
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      }
    });

    if (overlappingLeave) {
      return NextResponse.json(
        { success: false, error: "Une demande de congés existe déjà pour cette période" },
        { status: 409 }
      );
    }

    // Create leave request
    const leave = await db.leaveRequest.create({
      data: {
        type: body.type,
        startDate,
        endDate,
        daysCount: halfDay ? 0.5 : daysCount,
        halfDay,
        morningOnly: body.morningOnly || false,
        reason: body.reason || null,
        status: 'draft',
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
      data: leave,
      message: `Demande de congés créée avec succès (${daysCount} jour${daysCount > 1 ? 's' : ''})`
    }, { status: 201 });
  } catch (error) {
    console.error('Leaves POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la demande de congés' },
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
