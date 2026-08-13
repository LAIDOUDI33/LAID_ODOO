import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';

// GET /api/partners - List partners
export async function GET(request: Request) {
  // SECURITY: Require authentication for partner data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // customer, supplier, both
    const search = searchParams.get('search');
    const wilaya = searchParams.get('wilaya');

    // SECURITY: Get authenticated user for company scoping
    const user = await getAuthenticatedUser();

    const whereClause: any = { isActive: true };
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { displayName: { contains: search } },
        { nif: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (wilaya) {
      whereClause.wilayaCode = wilaya;
    }

    // SECURITY: Company scoping - non-super-admins can only see their company's data
    if (user && user.role !== ROLES.SUPER_ADMIN && user.companyId) {
      whereClause.companyId = user.companyId;
    }

    const partners = await db.partner.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: 100
    });

    return NextResponse.json({ success: true, data: partners });
  } catch (error) {
    console.error('Partners GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

// POST /api/partners - Create partner
export async function POST(request: Request) {
  // SECURITY: Require authentication to create partners
  const authError = await requireRole(request, ['admin', 'manager', 'sales_manager', 'salesperson', 'accountant']);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Partner name is required' },
        { status: 400 }
      );
    }

    // Validate NIF format if provided and is tax payer
    if (body.isTaxPayer && body.nif && !/^\d{15}$/.test(body.nif)) {
      return NextResponse.json(
        { success: false, error: 'NIF must be 15 digits for tax payers' },
        { status: 400 }
      );
    }

    // Get or use default company
    let companyId = body.companyId;
    if (!companyId) {
      const defaultCompany = await db.company.findFirst({ where: { isActive: true } });
      if (!defaultCompany) {
        return NextResponse.json(
          { success: false, error: 'No company found. Please create a company first.' },
          { status: 400 }
        );
      }
      companyId = defaultCompany.id;
    }

    const partner = await db.partner.create({
      data: {
        name: body.name,
        displayName: body.displayName || null,
        type: body.type || 'customer',
        isCompany: body.isCompany !== undefined ? body.isCompany : true,
        isTaxPayer: body.isTaxPayer !== undefined ? body.isTaxPayer : true,
        
        // Algerian Identifiers
        rc: body.rc || null,
        nif: body.nif || null,
        nis: body.nis || null,
        ai: body.ai || null,
        
        // Contact
        contactName: body.contactName || null,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        website: body.website || null,
        
        // Address
        address: body.address || null,
        addressAr: body.addressAr || null,
        postalCode: body.postalCode || null,
        city: body.city || null,
        wilayaCode: body.wilayaCode || null,
        
        // Financial
        paymentTerms: body.paymentTerms || '30',
        paymentMode: body.paymentMode || null,
        creditLimit: parseFloat(body.creditLimit) || 0,
        bankAccount: body.bankAccount || null,
        
        // Categorization
        category: body.category || null,
        priceList: body.priceList || null,
        
        companyId
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: partner,
      message: 'Partner created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Partners POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
