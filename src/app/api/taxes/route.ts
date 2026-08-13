import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  calculateTVA, 
  calculateTAP, 
  calculateIRGAnnuel, 
  calculateCotisations,
  calculateIBS
} from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// M-04 FIX: Valid Algerian tax declaration types with their required fields
const VALID_DECLARATION_TYPES = ['G50_TVA', 'G2_TAP', 'G1_IRG', 'G4_IBS'] as const;
type DeclarationType = typeof VALID_DECLARATION_TYPES[number];

// M-04 FIX: Period validation regex (YYYY-MM format)
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/taxes - Tax calculations and declarations
export async function GET(request: Request) {
  // SECURITY: Require authentication for tax data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type'); // tva, tap, irg, cotisations, ibs

    if (action === 'calculate') {
      return await handleCalculation(type, searchParams);
    }

    if (action === 'declarations') {
      return await getDeclarations(searchParams);
    }

    return NextResponse.json({
      success: true,
      message: 'Taxes API - Use action=calculate or action=declarations',
      availableActions: ['calculate', 'declarations'],
      availableTypes: ['tva', 'tap', 'irg', 'cotisations', 'ibs']
    });
  } catch (error) {
    console.error('Taxes API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process tax request' },
      { status: 500 }
    );
  }
}

async function handleCalculation(type: string | null, params: URLSearchParams) {
  switch (type) {
    case 'tva': {
      const montantHT = parseFloat(params.get('montant') || '0');
      const taux = parseFloat(params.get('taux') || '19') / 100;
      const result = calculateTVA(montantHT, taux);
      return NextResponse.json({ success: true, data: result });
    }
    
    case 'tap': {
      const ca = parseFloat(params.get('ca') || '0');
      const secteur = (params.get('secteur') || 'services') as any;
      const zone = (params.get('zone') || 'nord') as any;
      const result = calculateTAP(ca, secteur, zone);
      return NextResponse.json({ success: true, data: result });
    }
    
    case 'irg': {
      const revenu = parseFloat(params.get('revenu') || '0');
      const parts = parseInt(params.get('parts') || '1');
      const annuel = params.get('periode') === 'annuel';
      
      if (annuel) {
        const result = calculateIRGAnnuel(revenu, parts);
        return NextResponse.json({ success: true, data: result });
      } else {
        const result = await import('@/lib/algerian-taxes').then(m => m.calculateIRGMensuel(revenu, parts));
        return NextResponse.json({ success: true, data: result });
      }
    }
    
    case 'cotisations': {
      const salaire = parseFloat(params.get('salaire') || '0');
      const parts = parseInt(params.get('parts') || '1');
      const result = calculateCotisations(salaire, { irgParts: parts });
      return NextResponse.json({ success: true, data: result });
    }
    
    case 'ibs': {
      const benefice = parseFloat(params.get('benefice') || '0');
      const categorie = (params.get('categorie') || 'standard') as any;
      const result = calculateIBS(benefice, categorie);
      return NextResponse.json({ success: true, data: result });
    }
    
    default:
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing type parameter',
        validTypes: ['tva', 'tap', 'irg', 'cotisations', 'ibs'],
        example: '/api/taxes?action=calculate&type=tva&montant=100000'
      }, { status: 400 });
  }
}

async function getDeclarations(params: URLSearchParams) {
  const period = params.get('period'); // YYYY-MM format
  const type = params.get('type'); // G50, G1, G2, G4 (or full names)

  // M-04 FIX: Validate period format if provided
  if (period && !PERIOD_REGEX.test(period)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid period format. Expected YYYY-MM (e.g., 2025-01)',
        code: 'INVALID_PERIOD_FORMAT'
      },
      { status: 400 }
    );
  }
  
  // M-04 FIX: Validate period is not in the future
  if (period) {
    const [year, month] = period.split('-').map(Number);
    const periodDate = new Date(year, month - 1); // Month is 0-indexed
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth());
    
    if (periodDate > currentMonth) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Declaration period cannot be in the future',
          code: 'FUTURE_PERIOD'
        },
        { status: 400 }
      );
    }
  }

  // M-04 FIX: Normalize declaration type (allow short codes like G50, G1, etc.)
  let normalizedType = type;
  if (type && !type.startsWith('G50') && !type.startsWith('G2_') && !type.startsWith('G1_') && !type.startsWith('G4_')) {
    // Map short codes to full names
    const typeMap: Record<string, string> = {
      'G50': 'G50_TVA',
      'G2': 'G2_TAP',
      'G1': 'G1_IRG',
      'G4': 'G4_IBS'
    };
    normalizedType = typeMap[type] || type;
  }
  
  // M-04 FIX: Validate declaration type if provided
  if (normalizedType && !VALID_DECLARATION_TYPES.includes(normalizedType as DeclarationType)) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Invalid declaration type. Valid types: ${VALID_DECLARATION_TYPES.join(', ')}`,
        validTypes: VALID_DECLARATION_TYPES,
        code: 'INVALID_DECLARATION_TYPE'
      },
      { status: 400 }
    );
  }

  const whereClause: any = {};
  
  if (period) {
    whereClause.period = period;
  }
  
  if (normalizedType) {
    whereClause.type = normalizedType;
  }

  const declarations = await db.taxDeclaration.findMany({
    where: whereClause,
    orderBy: [{ period: 'desc' }, { type: 'asc' }],
    take: 50
  });

  // M-04 FIX: Return proper structure with metadata
  return NextResponse.json({
    success: true,
    data: declarations,
    count: declarations.length,
    meta: {
      availableTypes: VALID_DECLARATION_TYPES,
      filtersApplied: {
        period: period || null,
        type: normalizedType || null
      }
    }
  });
}

// POST /api/taxes - Create tax declaration
export async function POST(request: Request) {
  // SECURITY: Require appropriate role for tax declaration creation
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    if (!body.type || !body.period) {
      return NextResponse.json(
        { success: false, error: 'Declaration type and period are required' },
        { status: 400 }
      );
    }
    
    // M-04 FIX: Validate declaration type
    if (!VALID_DECLARATION_TYPES.includes(body.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid declaration type '${body.type}'. Valid types: ${VALID_DECLARATION_TYPES.join(', ')}`,
          validTypes: VALID_DECLARATION_TYPES,
          code: 'INVALID_DECLARATION_TYPE'
        },
        { status: 400 }
      );
    }
    
    // M-04 FIX: Validate period format (YYYY-MM)
    if (!PERIOD_REGEX.test(body.period)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid period format. Expected YYYY-MM (e.g., 2025-01)',
          code: 'INVALID_PERIOD_FORMAT'
        },
        { status: 400 }
      );
    }

    // Get company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No company found' },
        { status: 400 }
      );
    }
    
    // M-04 FIX: Check for duplicate declaration
    const existingDecl = await db.taxDeclaration.findFirst({
      where: {
        type: body.type,
        period: body.period,
        companyId: company.id
      }
    });
    
    if (existingDecl && existingDecl.status !== 'draft') {
      return NextResponse.json(
        { 
          success: false, 
          error: `A ${body.type} declaration for period ${body.period} already exists with status '${existingDecl.status}'`,
          existingDeclarationId: existingDecl.id,
          code: 'DUPLICATE_DECLARATION'
        },
        { status: 409 }
      );
    }

    // Calculate based on type
    let declarationData: any = {
      type: body.type,
      period: body.period,
      status: 'draft'
    };

    switch (body.type) {
      case 'G50_TVA':
        declarationData.tvaCollecte19 = parseFloat(body.tvaCollecte19) || 0;
        declarationData.tvaCollecte9 = parseFloat(body.tvaCollecte9) || 0;
        declarationData.tvaDeductibleBiens = parseFloat(body.tvaDeductibleBiens) || 0;
        declarationData.tvaDeductibleServices = parseFloat(body.tvaDeductibleServices) || 0;
        declarationData.tvaDeductibleImport = parseFloat(body.tvaDeductibleImport) || 0;
        declarationData.tvaNet = (declarationData.tvaCollecte19 + declarationData.tvaCollecte9) - 
          (declarationData.tvaDeductibleBiens + declarationData.tvaDeductibleServices + declarationData.tvaDeductibleImport);
        break;

      case 'G2_TAP':
        declarationData.tapBaseCA = parseFloat(body.tapBaseCA) || 0;
        declarationData.tapTaux = parseFloat(body.tapTaux) || 2;
        declarationData.tapAbattement = parseFloat(body.tapAbattement) || 0;
        declarationData.tapDue = Math.max(0, declarationData.tapBaseCA * (declarationData.tapTaux / 100) * (1 - declarationData.tapAbattement));
        break;

      case 'G1_IRG':
        declarationData.irgRetenuSalaires = parseFloat(body.irgRetenuSalaires) || 0;
        declarationData.irgRetenuAutres = parseFloat(body.irgRetenuAutres) || 0;
        declarationData.irgTotal = declarationData.irgRetenuSalaires + declarationData.irgRetenuAutres;
        break;

      case 'G4_IBS':
        declarationData.ibsBenefice = parseFloat(body.ibsBenefice) || 0;
        declarationData.ibsTaux = parseFloat(body.ibsTaux) || 19;
        declarationData.ibsDue = declarationData.ibsBenefice * (declarationData.ibsTaux / 100);
        break;
    }

    declarationData.totalDue = declarationData.tvaNet || declarationData.tapDue || 
      declarationData.irgTotal || declarationData.ibsDue || 0;

    const declaration = await db.taxDeclaration.create({
      data: {
        ...declarationData,
        companyId: company.id
      }
    });

    return NextResponse.json({
      success: true,
      data: declaration,
      message: `Tax declaration ${body.type} for ${body.period} created`
    }, { status: 201 });
  } catch (error) {
    console.error('Taxes POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tax declaration' },
      { status: 500 }
    );
  }
}
