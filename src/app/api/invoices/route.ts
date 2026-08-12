import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/invoices - List invoices
export async function GET(request: Request) {
  // SECURITY: Require authentication for financial data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const partnerId = searchParams.get('partnerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause: any = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: { select: { name: true, nif: true, city: true } },
          lines: { include: { product: { select: { name: true } } } }
        }
      }),
      db.invoice.count({ where: whereClause })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Invoices GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create invoice
export async function POST(request: Request) {
  // SECURITY: Require role to create invoices
  const authError = await requireRole(request, ['admin', 'manager', 'accountant', 'sales_manager', 'salesperson']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    if (!body.partnerId || !body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner and at least one line are required' },
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

    // Generate invoice reference (FACT-YYYY-MM-XXX)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Count existing invoices this month to generate sequence
    const invoiceCount = await db.invoice.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `FACT-${year}-${month}` }
      }
    });
    const sequence = String(invoiceCount + 1).padStart(3, '0');
    const reference = `FACT-${year}-${month}-${sequence}`;

    // Calculate line amounts and TVA
    const linesData = body.lines.map((line: any) => ({
      productId: line.productId,
      label: line.label || null,
      quantity: parseFloat(line.quantity) || 0,
      unitPrice: parseFloat(line.unitPrice) || 0,
      discountRate: parseFloat(line.discountRate) || 0,
      tvaRate: parseFloat(line.tvaRate) || 0.19,
      amountUntaxed: Math.round((parseFloat(line.quantity) * parseFloat(line.unitPrice)) * 100) / 100,
      amountTax: 0, // Will be calculated below
      amountTotal: 0 // Will be calculated below
    }));

    // Calculate TVA for each line
    linesData.forEach((line: any) => {
      const montantHTApresRemise = line.amountUntaxed * (1 - line.discountRate / 100);
      line.amountUntaxed = Math.round(montantHTApresRemise * 100) / 100;
      line.amountTax = Math.round(line.amountUntaxed * line.tvaRate * 100) / 100;
      line.amountTotal = line.amountUntaxed + line.amountTax;
    });

    // Calculate totals using TVA engine
    const tvaResult = calculateTVACollectee(linesData.map((l: any) => ({ 
      amountUntaxed: l.amountUntaxed, 
      tvaRate: l.tvaRate 
    })));

    // Get timbre fiscal
    const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

    // Calculate final totals
    const amountUntaxed = tvaResult.totalHT;
    const amountTax = tvaResult.totalTVACollectee;
    const amountTotal = tvaResult.totalTTC + timbreFiscal;

    // Set due date based on payment terms
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(now.getTime() + (parseInt(body.paymentTerms || '30') * 24 * 60 * 60 * 1000));

    // Create invoice with lines in a transaction
    const invoice = await db.invoice.create({
      data: {
        reference,
        date: now,
        dueDate,
        status: 'draft',
        type: body.type || 'invoice',
        
        // Amounts
        amountUntaxed,
        amountTax,
        timbreFiscal,
        amountTotal,
        amountPaid: 0,
        amountDue: amountTotal,
        
        // Partner & Company
        partnerId: body.partnerId,
        companyId: company.id,
        
        // Payment info
        paymentTerm: body.paymentTerms || '30',
        paymentMode: body.paymentMode || null,
        
        // Notes
        internalNotes: body.internalNotes || null,
        customerNotes: body.customerNotes || null,
        
        lines: {
          create: linesData.map((line: any) => ({
            productId: line.productId,
            label: line.label,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountRate: line.discountRate,
            tvaRate: line.tvaRate,
            amountUntaxed: line.amountUntaxed,
            amountTax: line.amountTax,
            amountTotal: line.amountTotal
          }))
        }
      },
      include: {
        partner: true,
        lines: { include: { product: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: invoice,
      message: `Invoice ${reference} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Invoices POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
