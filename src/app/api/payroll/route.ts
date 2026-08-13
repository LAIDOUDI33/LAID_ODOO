import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  calculateCotisations, 
  calculateIRGMensuel,
  calculatePrimeAncienete,
  getAllocationsFamiliales
} from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';

// M-10 FIX: SMIG (Salaire Minimum Garanti) Configuration
// SMIG values in DZD (Algerian Dinars) - National Guaranteed Minimum Wage
// Source: Algerian Labor Law - Updated annually by government decree
const SMIG_CONFIG = {
  // Current SMIG for 2025 (20,000 DZD monthly as of recent increases)
  current: 20000,
  // Historical values for reference
  historical: {
    2024: 20000,
    2023: 18000,
    2022: 18000,
    2021: 18000,
    2020: 18000
  },
  // Warning threshold (% below SMIG before blocking)
  warningThreshold: 0.9, // Warn if salary < 90% of SMIG
  currency: 'DZD'
};

// GET /api/payroll - List payrolls
export async function GET(request: Request) {
  // SECURITY FIX C-06: IDOR Vulnerability - Restrict payroll access to authorized roles only
  // Payroll data contains HIGHLY SENSITIVE information: salaries, tax deductions, bank accounts
  // CVSS 9.8 - CRITICAL: Any authenticated user could previously access ALL employee financial data
  const roleCheck = await requireRole(request, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.ACCOUNTANT]);
  if (roleCheck) return roleCheck;
  
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // YYYY-MM format
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const whereClause: any = {};
    
    if (period) {
      whereClause.period = period;
    }

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const payrolls = await db.payroll.findMany({
      where: whereClause,
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            matricule: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
            contractStartDate: true,
            baseSalary: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: payrolls });
  } catch (error) {
    console.error('Payroll GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payrolls' },
      { status: 500 }
    );
  }
}

// POST /api/payroll - Generate payroll for an employee
export async function POST(request: Request) {
  // SECURITY: Require HR Manager or Admin role to generate payroll
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'accountant']);
  if (authError) return authError;
  
  // Get user for audit logging
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    if (!body.employeeId || !body.period) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and period (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    // Get employee data
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    // M-10 FIX: SMIG Minimum Wage Validation
    // Check if base salary is below SMIG and add appropriate warnings
    const smigWarnings: Array<{ code: string; message: string; severity: 'warning' | 'error'; details?: any }> = [];
    const baseSalary = employee.baseSalary;
    const currentSMIG = SMIG_CONFIG.current;
    
    if (baseSalary < currentSMIG) {
      const percentOfSmig = ((baseSalary / currentSMIG) * 100).toFixed(1);
      const shortfall = currentSMIG - baseSalary;
      
      if (baseSalary < currentSMIG * SMIG_CONFIG.warningThreshold) {
        // Salary is significantly below SMIG - this might be an error
        smigWarnings.push({
          code: 'SALARY_BELOW_SMIG_CRITICAL',
          message: `Salaire de base (${baseSalary.toLocaleString()} ${SMIG_CONFIG.currency}) est significativement en dessous du SMIG (${currentSMIG.toLocaleString()} ${SMIG_CONFIG.currency}). Écart: ${shortfall.toLocaleString()} ${SMIG_CONFIG.currency} (${percentOfSmig}% du SMIG)`,
          severity: 'error',
          details: {
            baseSalary,
            smig: currentSMIG,
            percentOfSmig: parseFloat(percentOfSmig),
            shortfall,
            recommendation: 'Vérifier le salaire de l\'employé ou justifier l\'écart dans les notes'
          }
        });
        
        console.warn(`[M-10] CRITICAL: Employee ${body.employeeId} salary (${baseSalary}) is significantly below SMIG (${currentSMIG})`);
      } else {
        // Salary is slightly below SMIG - just warn
        smigWarnings.push({
          code: 'SALARY_BELOW_SMIG',
          message: `Salaire de base (${baseSalary.toLocaleString()} ${SMIG_CONFIG.currency}) est en dessous du SMIG actuel (${currentSMIG.toLocaleString()} ${SMIG_CONFIG.currency}). Écart: ${shortfall.toLocaleString()} ${SMIG_CONFIG.currency}`,
          severity: 'warning',
          details: {
            baseSalary,
            smig: currentSMIG,
            percentOfSmig: parseFloat(percentOfSmig),
            shortfall
          }
        });
        
        console.info(`[M-10] WARNING: Employee ${body.employeeId} salary (${baseSalary}) is below SMIG (${currentSMIG})`);
      }
    }

    // Check if payroll already exists for this period
    const existingPayroll = await db.payroll.findFirst({
      where: {
        employeeId: body.employeeId,
        period: body.period
      }
    });

    if (existingPayroll && !body.forceRegenerate) {
      return NextResponse.json(
        { success: false, error: `Payroll already exists for ${body.period}. Use forceRegenerate to overwrite.` },
        { status: 409 }
      );
    }

    // Parse options
    const options = {
      // Primes (optional)
      primeRendement: parseFloat(body.primeRendement) || 0,
      primeResponsabilite: parseFloat(body.primeResponsabilite) || 0,
      primeTechnicite: parseFloat(body.primeTechnicite) || 0,
      primeTransport: parseFloat(body.primeTransport) || 0,
      primePanier: parseFloat(body.primePanier) || 0,
      primeLogement: parseFloat(body.primeLogement) || 0,
      primeMarie: parseFloat(body.primeMarie) || 0,
      
      // Heures supplémentaires
      heuresSupp: parseFloat(body.heuresSupp) || 0,
      tauxHeureSupp: parseFloat(body.tauxHeureSupp) || (employee.hourlyRate || employee.baseSalary / 173.33),
      
      // Autres
      nombreEnfants: parseInt(body.nombreEnfants) || 0,
      partsFamiliales: parseInt(body.partsFamiliales) || 1 + (body.marie ? 1 : 0) + Math.min(body.nombreEnfants || 0, 4),
      avanceSalaire: parseFloat(body.avanceSalaire) || 0,
      opposition: parseFloat(body.opposition) || 0,
      mutuelle: parseFloat(body.mutuelle) || 0,
      cnacCredit: parseFloat(body.cnacCredit) || 0,
      joursTravailles: parseInt(body.joursTravailles) || 26,
      joursAbsences: parseInt(body.joursAbsences) || 0,
      joursConges: parseInt(body.joursConges) || 0,
    };

    // Calculate years of service for seniority bonus
    const hireDate = new Date(employee.contractStartDate);
    const now = new Date();
    const anneesService = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // === CALCULATIONS ===

    // 1. Base salary (prorated if needed)
    const salaireBase = employee.baseSalary;

    // 2. Prime ancienneté
    const primeAncienete = calculatePrimeAncienete(salaireBase, anneesService);

    // 3. Allocations familiales
    const allocationsFam = getAllocationsFamiliales(options.nombreEnfants);

    // 4. Heures supplémentaires
    const montantHeuresSupp = options.heuresSupp > 0 
      ? options.heuresSupp * options.tauxHeureSupp * 1.5 // 50% majoration standard
      : 0;

    // 5. Total brut
    const totalPrimes = 
      primeAncienete +
      options.primeRendement +
      options.primeResponsabilite +
      options.primeTechnicite +
      options.primeTransport +
      options.primePanier +
      options.primeLogement +
      options.primeMarie +
      allocationsFam +
      montantHeuresSupp;

    const grossSalary = salaireBase + totalPrimes;

    // 6. Cotisations sociales
    const cotisations = calculateCotisations(salaireBase, {
      irgParts: options.partsFamiliales
    });

    // 7. IRG sur salaire brut
    const irgResult = calculateIRGMensuel(grossSalary, options.partsFamiliales);

    // 8. Total retenues
    const totalRetenues = 
      cotisations.totalSalarial +
      irgResult.irgNet +
      options.avanceSalaire +
      options.opposition +
      options.mutuelle +
      options.cnacCredit;

    // 9. Net à payer
    const netPayable = Math.max(0, grossSalary - totalRetenues);

    // Generate reference
    const [year, month] = body.period.split('-');
    const refSequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const reference = `PAIE-${year}-${month}-${refSequence}`;

    // Create or update payroll record
    let payroll;
    if (existingPayroll && body.forceRegenerate) {
      payroll = await db.payroll.update({
        where: { id: existingPayroll.id },
        data: {
          reference,
          period: body.period,
          
          // Gains
          baseSalary: salaireBase,
          grossSalary: Math.round(grossSalary * 100) / 100,
          primeAncienete: Math.round(primeAncienete * 100) / 100,
          primeRendement: Math.round(options.primeRendement * 100) / 100,
          primeResponsabilite: Math.round(options.primeResponsabilite * 100) / 100,
          primeTechnicite: Math.round(options.primeTechnicite * 100) / 100,
          primeTransport: Math.round(options.primeTransport * 100) / 100,
          primePanier: Math.round(options.primePanier * 100) / 100,
          primeLogement: Math.round(options.primeLogement * 100) / 100,
          primeMarie: Math.round(options.primeMarie * 100) / 100,
          allocationsFam: Math.round(allocationsFam * 100) / 100,
          heuresSupp: options.heuresSupp,
          montantHeuresSupp: Math.round(montantHeuresSupp * 100) / 100,
          
          // Cotisations salariales
          cotisationCNAS: Math.round(cotisations.cnasSalarie * 100) / 100,
          cotisationCASNOS: Math.round(cotisations.casnosSalarie * 100) / 100,
          totalCotisations: Math.round(cotisations.totalSalarial * 100) / 100,
          
          // Retenues
          irgRetenu: Math.round(irgResult.irgNet),
          avanceSalaire: options.avanceSalaire,
          opposition: options.opposition,
          mutuelle: options.mutuelle,
          cnacCredit: options.cnacCredit,
          totalRetenues: Math.round(totalRetenues * 100) / 100,
          
          // Net
          netPayable: Math.round(netPayable * 100) / 100,
          
          // Charges patronales
          patronalCNAS: Math.round(cotisations.cnasEmployeur * 100) / 100,
          patronalCASNOS: Math.round(cotisations.casnosEmployeur * 100) / 100,
          patronalChomage: Math.round(cotisations.chomageEmployeur * 100) / 100,
          patronalAT: Math.round(cotisations.atEmployer * 100) / 100,
          patronalOEuvres: Math.round(cotisations.oeuvresSociales * 100) / 100,
          totalPatronal: Math.round(cotisations.totalPatronal * 100) / 100,
          coutTotalEmploye: Math.round(cotisations.coutTotalEmploye * 100) / 100,
          
          // Jours
          joursTravailles: options.joursTravailles,
          joursAbsences: options.joursAbsences,
          joursConges: options.joursConges,
          
          status: 'calculated'
        },
        include: { employee: true }
      });
    } else {
      payroll = await db.payroll.create({
        data: {
          reference,
          period: body.period,
          
          // Gains
          baseSalary: salaireBase,
          grossSalary: Math.round(grossSalary * 100) / 100,
          primeAncienete: Math.round(primeAncienete * 100) / 100,
          primeRendement: Math.round(options.primeRendement * 100) / 100,
          primeResponsabilite: Math.round(options.primeResponsabilite * 100) / 100,
          primeTechnicite: Math.round(options.primeTechnicite * 100) / 100,
          primeTransport: Math.round(options.primeTransport * 100) / 100,
          primePanier: Math.round(options.primePanier * 100) / 100,
          primeLogement: Math.round(options.primeLogement * 100) / 100,
          primeMarie: Math.round(options.primeMarie * 100) / 100,
          allocationsFam: Math.round(allocationsFam * 100) / 100,
          heuresSupp: options.heuresSupp,
          montantHeuresSupp: Math.round(montantHeuresSupp * 100) / 100,
          
          // Cotisations salariales
          cotisationCNAS: Math.round(cotisations.cnasSalarie * 100) / 100,
          cotisationCASNOS: Math.round(cotisations.casnosSalarie * 100) / 100,
          totalCotisations: Math.round(cotisations.totalSalarial * 100) / 100,
          
          // Retenues
          irgRetenu: Math.round(irgResult.irgNet),
          avanceSalaire: options.avanceSalaire,
          opposition: options.opposition,
          mutuelle: options.mutuelle,
          cnacCredit: options.cnacCredit,
          totalRetenues: Math.round(totalRetenues * 100) / 100,
          
          // Net
          netPayable: Math.round(netPayable * 100) / 100,
          
          // Charges patronales
          patronalCNAS: Math.round(cotisations.cnasEmployeur * 100) / 100,
          patronalCASNOS: Math.round(cotisations.casnosEmployeur * 100) / 100,
          patronalChomage: Math.round(cotisations.chomageEmployeur * 100) / 100,
          patronalAT: Math.round(cotisations.atEmployer * 100) / 100,
          patronalOEuvres: Math.round(cotisations.oeuvresSociales * 100) / 100,
          totalPatronal: Math.round(cotisations.totalPatronal * 100) / 100,
          coutTotalEmploye: Math.round(cotisations.coutTotalEmploye * 100) / 100,
          
          // Jours
          joursTravailles: options.joursTravailles,
          joursAbsences: options.joursAbsences,
          joursConges: options.joursConges,
          
          status: 'calculated',
          employeeId: body.employeeId
        },
        include: { employee: true }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: payroll,
      calculations: {
        anneesService: Math.round(anneesService * 10) / 10,
        salaireBase,
        totalPrimes: Math.round(totalPrimes * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        cotisations,
        irg: irgResult,
        totalRetenues: Math.round(totalRetenues * 100) / 100,
        netPayable: Math.round(netPayable * 100) / 100
      },
      // M-10 FIX: Include SMIG compliance warnings if any
      ...(smigWarnings.length > 0 ? {
        smigCompliance: {
          smig: currentSMIG,
          currency: SMIG_CONFIG.currency,
          isCompliant: baseSalary >= currentSMIG,
          percentOfSmig: parseFloat(((baseSalary / currentSMIG) * 100).toFixed(1)),
          warnings: smigWarnings
        }
      } : {}),
      message: `Payroll ${reference} generated successfully${smigWarnings.length > 0 ? ' (with SMIG warnings)' : ''}`
    }, { status: 201 });
  } catch (error) {
    console.error('Payroll POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll' },
      { status: 500 }
    );
  }
}
