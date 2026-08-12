import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * GET /api/calendar/events - List calendar events with filters
 * Query params: type, dateFrom, dateTo, year, month, page, limit
 * Includes public holidays in results when in date range
 */
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeHolidays = searchParams.get('includeHolidays') !== 'false';

    // Determine date range
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (year && month) {
      // Month view mode
      const y = parseInt(year);
      const m = parseInt(month) - 1; // JS months are 0-indexed
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0); // Last day of month
    } else if (dateFrom || dateTo) {
      if (dateFrom) startDate = new Date(dateFrom);
      if (dateTo) endDate = new Date(dateTo);
    }

    // Build where clause for events
    const whereClause: Record<string, any> = {};

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.OR = [
        // Events that start within range
        ...(startDate ? [{ startDate: { gte: startDate }, startDate: { lte: endDate || new Date('2100-12-31') } }] : []),
        // Events that end within range
        ...(endDate ? [{ endDate: { gte: startDate || new Date('2000-01-01') }, endDate: { lte: endDate } }] : []),
        // Events that span the entire range
        ...(startDate && endDate ? [{ startDate: { lte: startDate }, endDate: { gte: endDate } }] : [])
      ];
    }

    // Get default company for filtering
    const company = await db.company.findFirst({ where: { isActive: true } });
    
    if (company) {
      whereClause.companyId = company.id;
    }

    // Get pagination info
    const total = await db.calendarEvent.count({ where: whereClause });
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch calendar events with pagination
    const events = await db.calendarEvent.findMany({
      where: whereClause,
      orderBy: [{ startDate: 'asc' }],
      skip,
      take: limit
    });

    // Fetch public holidays if requested and we have a date range
    let holidays: any[] = [];
    if (includeHolidays && company) {
      const holidayWhereClause: Record<string, any> = { 
        companyId: company.id,
        isActive: true 
      };

      if (startDate || endDate) {
        holidayWhereClause.AND = [];
        if (startDate) {
          holidayWhereClause.AND.push({ date: { gte: startDate } });
        }
        if (endDate) {
          holidayWhereClause.AND.push({ date: { lte: endDate } });
        }
      } else if (year) {
        // Filter by year for recurring holidays
        const yearStart = new Date(parseInt(year), 0, 1);
        const yearEnd = new Date(parseInt(year), 11, 31);
        holidayWhereClause.date = { gte: yearStart, lte: yearEnd };
      }

      holidays = await db.publicHoliday.findMany({
        where: holidayWhereClause,
        orderBy: [{ date: 'asc' }]
      });

      // Convert holidays to event-like format for unified display
      holidays = holidays.map(holiday => ({
        id: `holiday-${holiday.id}`,
        title: holiday.name,
        description: holiday.description,
        type: 'holiday',
        startDate: holiday.date,
        endDate: holiday.durationDays > 1 
          ? new Date(new Date(holiday.date).getTime() + (holiday.durationDays - 1) * 24 * 60 * 60 * 1000)
          : holiday.date,
        allDay: true,
        isPublicHoliday: true,
        holidayType: holiday.type,
        nameAr: holiday.nameAr
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        events,
        holidays
      },
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      meta: {
        dateRange: {
          from: startDate?.toISOString(),
          to: endDate?.toISOString(),
          monthView: !!(year && month)
        }
      }
    });
  } catch (error) {
    console.error('Calendar GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des événements du calendrier' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events - Create new calendar event
 * Body: title, type, startDate, endDate?, allDay?, location?, description?, etc.
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for creating events
    const authError = await requireRole(request, ['admin', 'manager', 'hr']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.startDate || !body.type) {
      return NextResponse.json(
        { success: false, error: "Le titre, la date de début et le type sont obligatoires" },
        { status: 400 }
      );
    }

    // Validate event type
    const validTypes = ['holiday', 'meeting', 'deadline', 'reminder', 'training', 'event', 'leave'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Type d'événement invalide. Valeurs acceptées: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const startDate = new Date(body.startDate);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Date de début invalide" },
        { status: 400 }
      );
    }

    let endDate = null;
    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "Date de fin invalide" },
          { status: 400 }
        );
      }
      
      if (endDate < startDate) {
        return NextResponse.json(
          { success: false, error: "La date de fin doit être postérieure à la date de début" },
          { status: 400 }
        );
      }
    }

    // Get default company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Aucune entreprise trouvée" },
        { status: 400 }
      );
    }

    // Create event
    const event = await db.calendarEvent.create({
      data: {
        title: body.title,
        description: body.description || null,
        type: body.type,
        startDate,
        endDate,
        allDay: body.allDay || false,
        location: body.location || null,
        color: body.color || null,
        
        // Participants
        employeeIds: body.employeeIds ? JSON.stringify(body.employeeIds) : null,
        isPublic: body.isPublic || false,
        
        // Recurrence
        isRecurring: body.isRecurring || false,
        recurrenceRule: body.recurrenceRule || null,
        
        // Reminders
        reminderMinutes: parseInt(body.reminderMinutes) || 0,
        
        // Linking
        sourceType: body.sourceType || null,
        sourceId: body.sourceId || null,
        
        // Relations
        companyId: company.id,
        createdById: body.createdById || null
      }
    });

    return NextResponse.json({
      success: true,
      data: event,
      message: "Événement créé avec succès"
    }, { status: 201 });
  } catch (error) {
    console.error('Calendar POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    );
  }
}
