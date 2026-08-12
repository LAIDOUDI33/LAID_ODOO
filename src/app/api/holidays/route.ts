import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * Pre-seeded Algerian public holidays
 * Fixed dates use the current year; religious dates are approximate and should be updated annually
 */
const ALGERIAN_HOLIDAYS = [
  // === JOURS FÉRIERS NATIONAUX FIXES ===
  {
    name: "Nouvel An",
    nameAr: "رأس السنة الميلادية",
    month: 0, // January
    day: 1,
    type: "national" as const,
    isRecurring: true,
    durationDays: 1,
    description: "Célébration du Nouvel An"
  },
  {
    name: "Fête de l'Indépendance",
    nameAr: "عيد الاستقلال",
    month: 6, // July
    day: 5,
    type: "national" as const,
    isRecurring: true,
    durationDays: 1,
    description: "Commémoration de l'indépendance de l'Algérie en 1962"
  },
  {
    name: "Fête de la Révolution",
    nameAr: "عيد الثورة",
    month: 10, // November
    day: 1,
    type: "national" as const,
    isRecurring: true,
    durationDays: 1,
    description: "Commémoration de la révolution du 1er novembre 1954"
  },

  // === JOURS FÉRIES RELIGIEUX (dates approximatives - à mettre à jour annuellement) ===
  {
    name: "Aïd al-Fitr",
    nameAr: "عيد الفطر",
    month: 3, // April (approximate - varies by lunar calendar)
    day: 21,   // Approximate date
    type: "religious" as const,
    isRecurring: false, // Religious holidays change each year
    durationDays: 2,
    description: "Fin du Ramadan - célébration sur 2 jours"
  },
  {
    name: "Aïd al-Adha",
    nameAr: "عيد الأضحى",
    month: 5, // June (approximate)
    day: 28,  // Approximate date
    type: "religious" as const,
    isRecurring: false,
    durationDays: 2,
    description: "Fête du Sacrifice - célébration sur 2 jours"
  },
  {
    name: "Mouloud (Anniversaire du Prophète)",
    nameAr: "المولد النبوي",
    month: 8, // September (approximate)
    day: 15,  // Approximate date
    type: "religious" as const,
    isRecurring: false,
    durationDays: 1,
    description: "Célébration de la naissance du Prophète Muhammad (PSL)"
  },
  {
    name: "Awal Muharram (Nouvel An Hégirien)",
    nameAr: "رأس السنة الهجرية",
    month: 6, // July (approximate)
    day: 19,  // Approximate date
    type: "religious" as const,
    isRecurring: false,
    durationDays: 1,
    description: "Premier jour de l'année lunaire islamique"
  },
  {
    name: "Achoura",
    nameAr: "عاشوراء",
    month: 7, // July (approximate)
    day: 28,  // Approximate date
    type: "religious" as const,
    isRecurring: false,
    durationDays: 1,
    description: "10ème jour de Muharram"
  }
];

/**
 * GET /api/holidays - List public holidays
 * Query params: year (filter by year), includeInactive
 */
export async function GET(request: Request) {
  // SECURITY: Require authentication for holidays data
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get default company
    const company = await db.company.findFirst({ where: { isActive: true } });
    
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Aucune entreprise trouvée" },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: Record<string, any> = {
      companyId: company.id
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (yearParam) {
      const year = parseInt(yearParam);
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      
      whereClause.AND = [
        { date: { gte: yearStart } },
        { date: { lte: yearEnd } }
      ];
    }

    // Fetch holidays from database
    let holidays = await db.publicHoliday.findMany({
      where: whereClause,
      orderBy: [{ date: 'asc' }]
    });

    // If no holidays exist for this company, offer to seed them
    const holidayCount = await db.publicHoliday.count({
      where: { companyId: company.id }
    });

    return NextResponse.json({
      success: true,
      data: holidays,
      meta: {
        total: holidays.length,
        year: yearParam ? parseInt(yearParam) : null,
        isSeeded: holidayCount > 0,
        canSeed: holidayCount === 0
      }
    });
  } catch (error) {
    console.error('Holidays GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des jours fériés' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/holidays - Add new public holiday or seed Algerian holidays
 * Body for single: { name, nameAr?, date, type, durationDays?, description? }
 * Body for seeding: { action: 'seed', year? } 
 */
export async function POST(request: Request) {
  // SECURITY: Require HR role for holiday management
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Get default company
    const company = await db.company.findFirst({ where: { isActive: true } });
    
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Aucune entreprise trouvée" },
        { status: 400 }
      );
    }

    // Handle seed action
    if (body.action === 'seed') {
      return await seedAlgerianHolidays(company.id, body.year);
    }

    // Validate required fields for single holiday creation
    if (!body.name || !body.date || !body.type) {
      return NextResponse.json(
        { success: false, error: "Le nom, la date et le type sont obligatoires" },
        { status: 400 }
      );
    }

    // Validate holiday type
    const validTypes = ['national', 'religious', 'cultural', 'custom'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Type invalide. Valeurs acceptées: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const holidayDate = new Date(body.date);

    if (isNaN(holidayDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Date invalide" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existingHoliday = await db.publicHoliday.findFirst({
      where: {
        companyId: company.id,
        date: holidayDate
      }
    });

    if (existingHoliday) {
      return NextResponse.json(
        { success: false, error: "Un jour férié existe déjà pour cette date" },
        { status: 409 }
      );
    }

    // Create holiday
    const holiday = await db.publicHoliday.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || null,
        date: holidayDate,
        type: body.type,
        isRecurring: body.isRecurring !== undefined ? body.isRecurring : true,
        durationDays: parseInt(body.durationDays) || 1,
        description: body.description || null,
        isActive: true,
        companyId: company.id
      }
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: `Jour férié "${body.name}" ajouté avec succès`
    }, { status: 201 });
  } catch (error) {
    console.error('Holidays POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'ajout du jour férié' },
      { status: 500 }
    );
  }
}

/**
 * Seed Algerian public holidays for a given year
 */
async function seedAlgerianHolidays(companyId: string, year?: string | number): Promise<NextResponse> {
  try {
    const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();
    
    const createdHolidays: any[] = [];
    const skippedHolidays: string[] = [];

    for (const holidayTemplate of ALGERIAN_HOLIDAYS) {
      // Create date for this year
      const holidayDate = new Date(targetYear, holidayTemplate.month, holidayTemplate.day);

      // Check if already exists
      const existing = await db.publicHoliday.findFirst({
        where: {
          companyId,
          date: holidayDate
        }
      });

      if (existing) {
        skippedHolidays.push(holidayTemplate.name);
        continue;
      }

      // Create the holiday
      const holiday = await db.publicHoliday.create({
        data: {
          name: holidayTemplate.name,
          nameAr: holidayTemplate.nameAr,
          date: holidayDate,
          type: holidayTemplate.type,
          isRecurring: holidayTemplate.isRecurring,
          durationDays: holidayTemplate.durationDays,
          description: `${holidayTemplate.description} (${targetYear})`,
          isActive: true,
          companyId
        }
      });

      createdHolidays.push(holiday);
    }

    return NextResponse.json({
      success: true,
      data: createdHolidays,
      summary: {
        totalTemplates: ALGERIAN_HOLIDAYS.length,
        created: createdHolidays.length,
        skipped: skippedHolidays.length,
        skippedNames: skippedHolidays
      },
      message: `${createdHolidays.length} jour(s) férié(s) algérien(s) créé(s) pour ${targetYear}`
    }, { status: 201 });
  } catch (error) {
    console.error('Seed Holidays Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'initialisation des jours fériés' },
      { status: 500 }
    );
  }
}
