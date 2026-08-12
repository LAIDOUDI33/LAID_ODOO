import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * GET /api/contracts - List contracts with filters
 * Query params: employeeId, status, type, department, page, limit
 */
export async function GET(request: Request) {
  // SECURITY: Require authentication for contract data (contains PII)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const department = searchParams.get('department');
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

    if (department) {
      whereClause.department = department;
    }

    // Get pagination info
    const total = await db.contract.count({ where: whereClause });
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch contracts with pagination
    const contracts = await db.contract.findMany({
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
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Contracts GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des contrats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts - Create new contract
 * Body: employeeId, type, startDate, endDate?, baseSalary, and other optional fields
 */
export async function POST(request: Request) {
  // SECURITY: Require HR role for contract creation
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.type || !body.startDate || body.baseSalary === undefined) {
      return NextResponse.json(
        { success: false, error: "L'employé, le type de contrat, la date de début et le salaire de base sont obligatoires" },
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

    // Validate contract type
    const validTypes = ['cdi', 'cdd', 'internship', 'temporary', 'part_time'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Type de contrat invalide. Valeurs acceptées: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(body.startDate);
    let endDate = null;
    
    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (endDate <= startDate) {
        return NextResponse.json(
          { success: false, error: "La date de fin doit être postérieure à la date de début" },
          { status: 400 }
        );
      }
    }

    // For CDD contracts, endDate is required
    if (body.type === 'cdd' && !endDate) {
      return NextResponse.json(
        { success: false, error: "La date de fin est obligatoire pour les contrats CDD" },
        { status: 400 }
      );
    }

    // Generate reference (CTR-YYYY-XXX)
    const year = startDate.getFullYear();
    const contractCount = await db.contract.count({
      where: {
        reference: { startsWith: `CTR-${year}` }
      }
    });
    const sequence = String(contractCount + 1).padStart(3, '0');
    const reference = `CTR-${year}-${sequence}`;

    // Parse trial end date if provided
    let trialEndDate = null;
    if (body.trialEndDate) {
      trialEndDate = new Date(body.trialEndDate);
    }

    // Create contract
    const contract = await db.contract.create({
      data: {
        reference,
        type: body.type,
        status: 'draft',
        
        // Dates
        startDate,
        endDate,
        trialEndDate,
        
        // Financial
        baseSalary: parseFloat(body.baseSalary),
        currency: body.currency || 'DZD',
        paymentFrequency: body.paymentFrequency || 'monthly',
        
        // Benefits
        transportAllowance: parseFloat(body.transportAllowance) || 0,
        housingAllowance: parseFloat(body.housingAllowance) || 0,
        foodAllowance: parseFloat(body.foodAllowance) || 0,
        otherBenefits: body.otherBenefits ? JSON.stringify(body.otherBenefits) : null,
        
        // Working conditions
        weeklyHours: parseFloat(body.weeklyHours) || 40,
        daysLeave: parseInt(body.daysLeave) || 30,
        sickLeaveDays: parseInt(body.sickLeaveDays) || 15,
        location: body.location || null,
        department: body.department || employee.department || null,
        jobTitle: body.jobTitle || employee.jobTitle || null,
        jobGrade: body.jobGrade || null,
        
        // Legal (Algerian compliance)
        nssNumber: body.nssNumber || employee.cnasNumber || null,
        cnasNumber: body.cnasNumber || employee.cnasNumber || null,
        casnosNumber: body.casnosNumber || employee.casnosNumber || null,
        mutuelleNumber: body.mutuelleNumber || null,
        
        // Files
        contractFileUrl: body.contractFileUrl || null,
        annexFilesUrls: body.annexFilesUrls ? JSON.stringify(body.annexFilesUrls) : null,
        
        // Notes
        internalNotes: body.internalNotes || null,
        specialClauses: body.specialClauses || null,
        
        // Relations
        employeeId: body.employeeId,
        managerId: body.managerId || employee.managerId || null
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: `Contrat ${reference} créé avec succès`
    }, { status: 201 });
  } catch (error) {
    console.error('Contracts POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du contrat' },
      { status: 500 }
    );
  }
}
