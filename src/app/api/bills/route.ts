import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';

// GET /api/bills - List supplier bills
export async function GET(request: Request) {
  // SECURITY: Require authentication for financial data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // SECURITY: Get authenticated user for company scoping
    const user = await getAuthenticatedUser();

    const whereClause: any = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // SECURITY: Company scoping - non-super-admins can only see their company's data
    if (user && user.role !== ROLES.SUPER_ADMIN && user.companyId) {
      whereClause.companyId = user.companyId;
    }

    const [bills, total] = await Promise.all([
      db.bill.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: { select: { name: true, nif: true, city: true } },
          lines: { include: { product: { select: { name: true } } } }
        }
      }),
      db.bill.count({ where: whereClause })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: bills,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Bills GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create supplier bill
export async function POST(request: Request) {
  // SECURITY: Require appropriate role for bill creation
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    if (!body.partnerId) {
      return NextResponse.json(
        { success: false, error: 'Supplier partner is required' },
        { status: 400 }
      );
    }

    // Get company for reference generation
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No company configured' },
        { status: 400 }
      );
    }

    // Generate bill reference
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const billCount = await db.bill.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `FRN-${year}-${month}` }
      }
    });
    const sequence = String(billCount + 1).padStart(3, '0');
    const reference = `FRN-${year}-${month}-${sequence}`;

    // Calculate amounts
    let amountUntaxed = 0;
    let amountTax = 0;
    let amountTotal = 0;

    const linesData = (body.lines || []).map((line: any) => {
      const lineAmountUntaxed = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
      const discountRate = parseFloat(line.discountRate) || 0;
      const tvaRate = parseFloat(line.tvaRate) || 19;
      
      const amountAfterDiscount = lineAmountUntaxed * (1 - discountRate / 100);
      const lineTax = amountAfterDiscount * (tvaRate / 100);
      const lineTotal = amountAfterDiscount + lineTax;

      amountUntaxed += amountAfterDiscount;
      amountTax += lineTax;
      amountTotal += lineTotal;

      return {
        productId: line.productId,
        label: line.label || null,
        quantity: parseFloat(line.quantity) || 0,
        unitPrice: parseFloat(line.unitPrice) || 0,
        discountRate,
        tvaRate,
        amountUntaxed: Math.round(amountAfterDiscount * 100) / 100,
        amountTax: Math.round(lineTax * 100) / 100,
        amountTotal: Math.round(lineTotal * 100) / 100
      };
    });

    // Round totals
    amountUntaxed = Math.round(amountUntaxed * 100) / 100;
    amountTax = Math.round(amountTax * 100) / 100;
    amountTotal = Math.round(amountTotal * 100) + 1; // Add timbre fiscal

    // Validate purchaseOrderId if provided (H-09 FIX: Source tracking)
    if (body.purchaseOrderId) {
      const po = await db.purchaseOrder.findUnique({
        where: { id: body.purchaseOrderId }
      });
      if (!po) {
        return NextResponse.json(
          { success: false, error: 'Purchase Order not found' },
          { status: 404 }
        );
      }
    }

    // Set due date
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create bill with lines
    // H-09 FIX: Added optional source tracking fields (purchaseOrderId, sourceType, sourceId)
    const bill = await db.bill.create({
      data: {
        reference,
        date: now,
        dueDate,
        status: 'draft',
        
        // Amounts
        amountUntaxed,
        amountTax,
        timbreFiscal: 1,
        amountTotal,
        amountPaid: 0,
        amountDue: amountTotal,
        
        // Partner & Company
        partnerId: body.partnerId,
        companyId: company.id,
        
        // H-09 FIX: Source tracking - link to Purchase Order if provided
        purchaseOrderId: body.purchaseOrderId || null,
        
        // Notes
        internalNotes: body.internalNotes || null,
        
        lines: { create: linesData }
      },
      include: {
        partner: true,
        purchaseOrder: {
          select: { id: true, reference: true, status: true }
        },
        lines: { include: { product: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: bill,
      message: `Bill ${reference} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Bills POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}
