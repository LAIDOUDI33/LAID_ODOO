import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-utils';

/**
 * GET /api/leave-balances - List leave balances with filters
 * Query params: employeeId, year, leaveType
 * 
 * SECURITY: Requires authentication
 */
export async function GET(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year');
    const leaveType = searchParams.get('leaveType');

    // Build where clause
    const whereClause: Record<string, any> = {};

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (year) {
      whereClause.year = parseInt(year);
    }

    if (leaveType) {
      whereClause.leaveType = leaveType;
    }

    // Fetch leave balances
    const balances = await db.leaveBalance.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { leaveType: 'asc' }
      ],
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
      data: balances,
      count: balances.length
    });
  } catch (error) {
    console.error('LeaveBalances GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des soldes de congés' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leave-balances - Create or initialize yearly leave balance
 * Body: employeeId, leaveType, year, totalAllocated
 * 
 * SECURITY: Requires HR/Manager role for balance initialization
 */
export async function POST(request: Request) {
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.leaveType || !body.year) {
      return NextResponse.json(
        { success: false, error: "L'identifiant de l'employé, le type de congé et l'année sont obligatoires" },
        { status: 400 }
      );
    }

    // Validate year is reasonable
    const year = parseInt(body.year);
    if (year < 2020 || year > 2100) {
      return NextResponse.json(
        { success: false, error: "L'année doit être entre 2020 et 2100" },
        { status: 400 }
      );
    }

    // Validate leave type
    const validLeaveTypes = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'exceptional', 'other'];
    if (!validLeaveTypes.includes(body.leaveType)) {
      return NextResponse.json(
        { success: false, error: `Type de congé invalide. Types valides: ${validLeaveTypes.join(', ')}` },
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

    // Check if balance already exists for this combination
    const existingBalance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: body.employeeId,
          leaveType: body.leaveType,
          year: year
        }
      }
    });

    if (existingBalance) {
      return NextResponse.json(
        { success: false, error: "Un solde de congés existe déjà pour cet employé, ce type et cette année" },
        { status: 409 }
      );
    }

    // Default allocation based on leave type (Algerian labor law)
    const totalAllocated = body.totalAllocated ?? getDefaultAllocation(body.leaveType);

    // Create leave balance
    const balance = await db.leaveBalance.create({
      data: {
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        year: year,
        totalAllocated: totalAllocated,
        totalUsed: 0,
        totalPending: 0,
        remaining: totalAllocated
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
      data: balance,
      message: `Solde de congés initialisé avec succès (${totalAllocated} jours alloués)`
    }, { status: 201 });
  } catch (error) {
    console.error('LeaveBalances POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du solde de congés' },
      { status: 500 }
    );
  }
}

/**
 * Get default allocation days based on leave type (Algerian labor law compliant)
 */
function getDefaultAllocation(leaveType: string): number {
  const defaults: Record<string, number> = {
    annual: 30,      // 30 days annual leave per Algerian labor law
    sick: 15,        // 15 days paid sick leave
    maternity: 98,   // 14 weeks maternity leave
    paternity: 3,    // 3 days paternity leave
    unpaid: 0,       // No allocation for unpaid leave
    exceptional: 10, // 10 days exceptional leave
    other: 5         // 5 days default for other types
  };
  
  return defaults[leaveType] ?? 0;
}
