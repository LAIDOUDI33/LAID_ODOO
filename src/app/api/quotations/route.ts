import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';

// Valid quotation statuses
const VALID_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'];

// GET /api/quotations - List quotations with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Filter parameters
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const validFrom = searchParams.get('validFrom');
    const validTo = searchParams.get('validTo');
    const search = searchParams.get('search');
    const salesPersonId = searchParams.get('salesPersonId');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build where clause
    const whereClause: any = {};
    
    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      whereClause.status = status;
    }
    
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }
    
    if (salesPersonId) {
      whereClause.salesPersonId = salesPersonId;
    }
    
    // Date range filter on validUntil
    if (validFrom || validTo) {
      whereClause.validUntil = {};
      if (validFrom) {
        whereClause.validUntil.gte = new Date(validFrom);
      }
      if (validTo) {
        whereClause.validUntil.lte = new Date(validTo);
      }
    }
    
    // Search in reference or partner name
    if (search) {
      whereClause.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { partner: { name: { contains: search, mode: 'insensitive' } } },
        { customerNotes: { contains: search, mode: 'insensitive' } },
        { internalNotes: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute queries in parallel
    const [quotations, total] = await Promise.all([
      db.quotation.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: {
            select: { id: true, name: true, nif: true, city: true, email: true, phone: true }
          },
          company: {
            select: { id: true, name: true, logo: true }
          },
          salesPerson: {
            select: { id: true, name: true, email: true }
          },
          opportunity: {
            select: { id: true, title: true, status: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, name: true, reference: true, unit: true }
              }
            }
          },
          convertedTo: {
            select: { id: true, reference: true, status: true }
          }
        }
      }),
      db.quotation.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Quotations GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotations' },
      { status: 500 }
    );
  }
}

// POST /api/quotations - Create a new quotation with lines
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner is required' },
        { status: 400 }
      );
    }
    
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one line is required' },
        { status: 400 }
      );
    }

    // Validate each line
    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      if (!line.productId) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Product is required` },
          { status: 400 }
        );
      }
      if (!line.quantity || parseFloat(line.quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Valid quantity is required` },
          { status: 400 }
        );
      }
      if (line.unitPrice === undefined || line.unitPrice === null || parseFloat(line.unitPrice) < 0) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Valid unit price is required` },
          { status: 400 }
        );
      }
    }

    // Get active company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No active company configured' },
        { status: 400 }
      );
    }

    // Verify partner exists
    const partner = await db.partner.findUnique({
      where: { id: body.partnerId }
    });
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Generate reference (DEV-YYYY-MM-XXX)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const quotationCount = await db.quotation.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `DEV-${year}-${month}` }
      }
    });
    const sequence = String(quotationCount + 1).padStart(3, '0');
    const reference = `DEV-${year}-${month}-${sequence}`;

    // Calculate line amounts with Algerian TVA rates
    const linesData = body.lines.map((line: any) => {
      const quantity = parseFloat(line.quantity) || 0;
      const unitPrice = parseFloat(line.unitPrice) || 0;
      const discountRate = parseFloat(line.discountRate) || 0;
      
      // Default TVA rate is 19% (normal rate in Algeria)
      let tvaRate = parseFloat(line.tvaRate);
      if (isNaN(tvaRate)) {
        tvaRate = 19; // Default to 19%
      } else if (tvaRate > 1) {
        tvaRate = tvaRate / 100; // Convert percentage to decimal if needed
      }
      
      // Calculate amounts
      const amountUntaxedBeforeDiscount = quantity * unitPrice;
      const discountAmount = amountUntaxedBeforeDiscount * (discountRate / 100);
      const amountUntaxed = Math.round((amountUntaxedBeforeDiscount - discountAmount) * 100) / 100;
      const amountTax = Math.round(amountUntaxed * tvaRate * 100) / 100;
      const amountTotal = Math.round((amountUntaxed + amountTax) * 100) / 100;

      return {
        productId: line.productId,
        description: line.description || null,
        quantity,
        unitPrice,
        discountRate,
        tvaRate,
        amountUntaxed,
        amountTax,
        amountTotal
      };
    });

    // Calculate totals using TVA engine
    const tvaResult = calculateTVACollectee(linesData.map(l => ({
      amountUntaxed: l.amountUntaxed,
      tvaRate: l.tvaRate
    })));

    // Get timbre fiscal (1 DZD for quotations/invoices)
    const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

    // Final totals
    const amountUntaxed = tvaResult.totalHT;
    const amountTax = tvaResult.totalTVACollectee;
    const amountTotal = Math.round((tvaResult.totalTTC + timbreFiscal) * 100) / 100;

    // Set validity date (default 30 days from creation)
    const validityDays = parseInt(body.validityDays || '30');
    const validUntil = body.validUntil 
      ? new Date(body.validUntil) 
      : new Date(now.getTime() + (validityDays * 24 * 60 * 60 * 1000));

    // Create quotation with lines in a transaction
    const quotation = await db.quotation.create({
      data: {
        reference,
        date: now,
        validUntil,
        status: 'draft',
        
        // Amounts
        amountUntaxed,
        amountTax,
        timbreFiscal,
        amountTotal,
        
        // Relations
        partnerId: body.partnerId,
        companyId: company.id,
        opportunityId: body.opportunityId || null,
        salesPersonId: body.salesPersonId || null,
        
        // Payment conditions
        paymentTerms: body.paymentTerms || String(validityDays),
        paymentMode: body.paymentMode || null,
        
        // Notes
        internalNotes: body.internalNotes || null,
        customerNotes: body.customerNotes || null,
        
        // Lines
        lines: {
          create: linesData.map(line => ({
            productId: line.productId,
            description: line.description,
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
        partner: {
          select: { id: true, name: true, nif: true, city: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, logo: true }
        },
        salesPerson: {
          select: { id: true, name: true, email: true }
        },
        opportunity: {
          select: { id: true, title: true, status: true }
        },
        lines: {
          include: {
            product: {
              select: { id: true, name: true, reference: true, unit: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: quotation,
      message: `Quotation ${reference} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Quotations POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create quotation' },
      { status: 500 }
    );
  }
}
