import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  calculateTVA, 
  calculateTAP, 
  calculateIRGAnnuel, 
  calculateCotisations,
  calculateIBS
} from '@/lib/algerian-taxes';

// GET /api/taxes - Tax calculations and declarations
export async function GET(request: Request) {
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
  const type = params.get('type'); // G50, G1, G2, G4

  const whereClause: any = {};
  
  if (period) {
    whereClause.period = period;
  }
  
  if (type) {
    whereClause.type = type;
  }

  const declarations = await db.taxDeclaration.findMany({
    where: whereClause,
    orderBy: [{ period: 'desc' }, { type: 'asc' }],
    take: 50
  });

  return NextResponse.json({
    success: true,
    data: declarations,
    count: declarations.length
  });
}

// POST /api/taxes - Create tax declaration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.type || !body.period) {
      return NextResponse.json(
        { success: false, error: 'Declaration type and period are required' },
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
