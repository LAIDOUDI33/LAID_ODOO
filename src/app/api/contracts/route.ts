import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// HASSIBA Suite ERP v2.0.0 - Contracts API
// FIXES: H-17 (Automated Contract Lifecycle)
// ============================================================

// ============================================================
// H-17: Contract Status Validation & Transitions
// Valid status transitions for contracts
// ============================================================
const VALID_CONTRACT_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'cancelled', 'expired'],
  active: ['expired', 'terminated', 'suspended', 'renewed'],
  suspended: ['active', 'terminated', 'cancelled'],
  terminated: [], // Terminal state
  cancelled: [], // Terminal state
  expired: ['renewed', 'active'], // Can be renewed or reactivated
  renewed: ['active']
};

/**
 * H-17: Check if a contract is near expiration (within 30 days)
 */
function isContractNearExpiration(endDate: Date | null): boolean {
  if (!endDate) return false;
  const now = new Date();
  const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
}

/**
 * H-17: Check if a contract has expired
 */
function isContractExpired(endDate: Date | null): boolean {
  if (!endDate) return false;
  return new Date() > endDate;
}

/**
 * H-17: Auto-expire contracts that have passed their end date
 * This should be called periodically or on contract fetch
 */
export async function checkAndExpireContracts(): Promise<{ checked: number; expired: number }> {
  try {
    // Find active contracts that have passed their end date
    const activeContracts = await db.contract.findMany({
      where: {
        status: 'active',
        endDate: { not: null },
        endDate: { lt: new Date() }
      }
    });

    let expiredCount = 0;
    for (const contract of activeContracts) {
      await db.contract.update({
        where: { id: contract.id },
        data: { 
          status: 'expired',
          internalNotes: contract.internalNotes 
            ? `${contract.internalNotes}\n[Auto-expired ${new Date().toISOString().slice(0, 10)}]`
            : `[Auto-expired ${new Date().toISOString().slice(0, 10)}]`
        }
      });
      expiredCount++;
      console.log(`H-17: Contract ${contract.reference} auto-expired`);
    }

    return { checked: activeContracts.length, expired: expiredCount };
  } catch (error) {
    console.error('Error in checkAndExpireContracts:', error);
    return { checked: 0, expired: 0 };
  }
}

/**
 * GET /api/contracts - List contracts with filters
 * Query params: employeeId, status, type, department, page, limit
 * H-17: Includes expiration warnings and auto-expiration check
 */
export async function GET(request: Request) {
  // SECURITY: Require authentication for contract data (contains PII)
  const authError = await requireAuth(request);
  if (authError) return authError;

  // H-17: Run expiration check on each GET request (lightweight async operation)
  checkAndExpireContracts().catch(err => 
    console.error('Background contract expiration check failed:', err)
  );

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

    // H-17: Enrich contracts with lifecycle information
    const enrichedContracts = contracts.map(contract => ({
      ...contract,
      // Add computed lifecycle fields
      _lifecycle: {
        isNearExpiration: isContractNearExpiration(contract.endDate),
        isExpired: isContractExpired(contract.endDate),
        daysUntilExpiration: contract.endDate 
          ? Math.max(0, Math.ceil((contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
        canTransitionTo: VALID_CONTRACT_TRANSITIONS[contract.status] || []
      }
    }));

    return NextResponse.json({
      success: true,
      data: enrichedContracts,
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
 * H-17: Validates status transitions and enforces business rules
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

    // H-17: Check for overlapping active contracts
    const existingActiveContract = await db.contract.findFirst({
      where: {
        employeeId: body.employeeId,
        status: { in: ['active', 'draft'] },
        ...(endDate ? {
          OR: [
            { endDate: null }, // Indeterminate contract
            { endDate: { gte: startDate } } // Overlaps with new contract start
          ]
        } : {
          startDate: { lte: startDate } // New contract starts during existing one
        })
      }
    });

    if (existingActiveContract && body.status !== 'draft') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cet employé a déjà un contrat actif (${existingActiveContract.reference}). Veuillez d'abord résilier ou suspendre le contrat existant.`,
          existingContract: {
            id: existingActiveContract.id,
            reference: existingActiveContract.reference,
            type: existingActiveContract.type,
            status: existingActiveContract.status,
            endDate: existingActiveContract.endDate
          }
        },
        { status: 409 }
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

    // H-17: Determine initial status based on dates
    let initialStatus = body.status || 'draft';
    if (!initialStatus || initialStatus === 'draft') {
      // If start date is in the past or today, consider it active
      if (startDate <= new Date()) {
        initialStatus = 'active';
      }
    }
    
    // Validate initial status against allowed transitions from 'draft'
    if (!['draft', 'active'].includes(initialStatus)) {
      initialStatus = 'draft';
    }

    // Create contract
    const contract = await db.contract.create({
      data: {
        reference,
        type: body.type,
        status: initialStatus,
        
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
      data: {
        ...contract,
        _lifecycle: {
          isNearExpiration: isContractNearExpiration(contract.endDate),
          isExpired: isContractExpired(contract.endDate),
          canTransitionTo: VALID_CONTRACT_TRANSITIONS[contract.status] || []
        }
      },
      message: `Contrat ${reference} créé avec succès${initialStatus === 'active' ? ' (activé automatiquement)' : ''}`
    }, { status: 201 });
  } catch (error) {
    console.error('Contracts POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du contrat' },
      { status: 500 }
    );
  }
}
