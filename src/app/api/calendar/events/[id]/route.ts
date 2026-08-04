import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/calendar/events/[id] - Get single calendar event
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await db.calendarEvent.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Parse JSON fields for response
    const responseEvent = {
      ...event,
      employeeIds: event.employeeIds ? JSON.parse(event.employeeIds) : null
    };

    return NextResponse.json({ success: true, data: responseEvent });
  } catch (error) {
    console.error('Calendar Event GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'événement' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/events/[id] - Update calendar event
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if event exists
    const existingEvent = await db.calendarEvent.findUnique({ where: { id } });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    if (body.type !== undefined) {
      const validTypes = ['holiday', 'meeting', 'deadline', 'reminder', 'training', 'event', 'leave'];
      if (validTypes.includes(body.type)) {
        updateData.type = body.type;
      }
    }

    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      if (!isNaN(startDate.getTime())) {
        updateData.startDate = startDate;
      }
    }

    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    if (body.allDay !== undefined) {
      updateData.allDay = body.allDay;
    }

    if (body.location !== undefined) {
      updateData.location = body.location || null;
    }

    if (body.color !== undefined) {
      updateData.color = body.color || null;
    }

    if (body.employeeIds !== undefined) {
      updateData.employeeIds = Array.isArray(body.employeeIds) 
        ? JSON.stringify(body.employeeIds) 
        : null;
    }

    if (body.isPublic !== undefined) {
      updateData.isPublic = body.isPublic;
    }

    if (body.isRecurring !== undefined) {
      updateData.isRecurring = body.isRecurring;
    }

    if (body.recurrenceRule !== undefined) {
      updateData.recurrenceRule = body.recurrenceRule || null;
    }

    if (body.reminderMinutes !== undefined) {
      updateData.reminderMinutes = parseInt(body.reminderMinutes) || 0;
    }

    if (body.sourceType !== undefined) {
      updateData.sourceType = body.sourceType || null;
    }

    if (body.sourceId !== undefined) {
      updateData.sourceId = body.sourceId || null;
    }

    const event = await db.calendarEvent.update({
      where: { id },
      data: updateData
    });

    // Parse JSON fields for response
    const responseEvent = {
      ...event,
      employeeIds: event.employeeIds ? JSON.parse(event.employeeIds) : null
    };

    return NextResponse.json({
      success: true,
      data: responseEvent,
      message: "Événement mis à jour avec succès"
    });
  } catch (error) {
    console.error('Calendar Event PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'événement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[id] - Delete calendar event
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if event exists
    const existingEvent = await db.calendarEvent.findUnique({ where: { id } });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    await db.calendarEvent.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Événement supprimé avec succès"
    });
  } catch (error) {
    console.error('Calendar Event DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    );
  }
}
