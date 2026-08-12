import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVACollectee, getTimbreFiscal } from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// Valid sales order statuses
const VALID_STATUSES = ['draft', 'sent', 'confirmed', 'processing', 'delivered', 'invoiced', 'done', 'cancelled'];

// ============================================================
// GET /api/sales-orders - List sales orders with filters
// ============================================================
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Filter parameters
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build where clause
    const whereClause: any = {};
    
    if (status && status !== 'all') {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      whereClause.status = status;
    }
    
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) {
        whereClause.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.date.lte = new Date(dateTo);
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
    const [salesOrders, total] = await Promise.all([
      db.salesOrder.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: {
            select: { id: true, name: true, nif: true, city: true, phone: true }
          },
          company: {
            select: { id: true, name: true, logo: true }
          },
          warehouse: {
            select: { id: true, name: true }
          },
          salesPerson: {
            select: { id: true, name: true }
          },
          quotation: {
            select: { id: true, reference: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, name: true, code: true, unitOfMeasure: true }
              }
            }
          },
          _count: {
            select: {
              deliveryItems: true,
              invoices: true
            }
          }
        }
      }),
      db.salesOrder.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: salesOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('SalesOrders GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales orders', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/sales-orders - Create a new sales order (or convert from quotation)
// ============================================================
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role
    const authError = await requireRole(request, ['admin', 'manager', 'sales_manager', 'salesperson', 'accountant', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();
    const {
      partnerId,
      lines,
      expectedDate,
      paymentTerms,
      paymentMode,
      shippingAddress,
      warehouseId,
      internalNotes,
      customerNotes,
      quotationId,
      opportunityId,
      salesPersonId
    } = body;

    // Validation
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner is required' },
        { status: 400 }
      );
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one line item is required' },
        { status: 400 }
      );
    }

    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Product is required` },
          { status: 400 }
        );
      }
      if (!line.quantity || parseFloat(line.quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Quantity must be greater than 0` },
          { status: 400 }
        );
      }
      if (line.unitPrice === undefined || line.unitPrice === null || parseFloat(line.unitPrice) < 0) {
        return NextResponse.json(
          { success: false, error: `Line ${i + 1}: Unit price must be 0 or greater` },
          { status: 400 }
        );
      }
    }

    // Get active company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No active company configured. Please set up company first.' },
        { status: 400 }
      );
    }

    // Verify partner exists
    const partner = await db.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Check warehouse if provided
    if (warehouseId) {
      const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        return NextResponse.json(
          { success: false, error: 'Warehouse not found' },
          { status: 404 }
        );
      }
    }

    // Handle quotation conversion
    let sourceQuotation = null;
    if (quotationId) {
      sourceQuotation = await db.quotation.findUnique({
        where: { id: quotationId },
        include: { lines: true }
      });
      
      if (!sourceQuotation) {
        return NextResponse.json(
          { success: false, error: 'Quotation not found' },
          { status: 404 }
        );
      }

      // Check if already converted
      const existingOrder = await db.salesOrder.findUnique({
        where: { quotationId }
      });
      if (existingOrder) {
        return NextResponse.json(
          { success: false, error: 'This quotation has already been converted to a sales order' },
          { status: 400 }
        );
      }

      // Update quotation status to converted
      await db.quotation.update({
        where: { id: quotationId },
        data: { status: 'converted' }
      });
    }

    // Generate reference (CMD-YYYY-MM-XXX)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const orderCount = await db.salesOrder.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `CMD-${year}-${month}` }
      }
    });
    const sequence = String(orderCount + 1).padStart(3, '0');
    const reference = `CMD-${year}-${month}-${sequence}`;

    // Process lines - calculate amounts with Algerian TVA
    const linesData = lines.map((line: any) => {
      const quantity = parseFloat(line.quantity) || 0;
      const unitPrice = parseFloat(line.unitPrice) || 0;
      const discountRate = parseFloat(line.discountRate) || 0;
      
      // Use provided TVA rate or default to 19% (normal rate in Algeria)
      let tvaRate = parseFloat(line.tvaRate);
      if (isNaN(tvaRate)) {
        tvaRate = 0.19; // Default normal rate
      }
      
      // Validate TVA rate (Algerian rates: 19%, 9%, 7%, 0%)
      const validTvaRates = [0.19, 0.09, 0.07, 0];
      if (!validTvaRates.includes(tvaRate)) {
        tvaRate = 0.19; // Fallback to normal rate
      }

      // Calculate amounts
      const amountUntaxedBeforeDiscount = quantity * unitPrice;
      const amountUntaxed = Math.round(amountUntaxedBeforeDiscount * (1 - discountRate / 100) * 100) / 100;
      const amountTax = Math.round(amountUntaxed * tvaRate * 100) / 100;
      const amountTotal = amountUntaxed + amountTax;

      return {
        productId: line.productId,
        description: line.description || null,
        quantity,
        unitPrice,
        discountRate,
        tvaRate,
        amountUntaxed,
        amountTax,
        amountTotal,
        quantityDelivered: 0,
        quantityInvoiced: 0
      };
    });

    // Calculate totals using TVA engine
    const tvaResult = calculateTVACollectee(linesData.map((l) => ({ 
      amountUntaxed: l.amountUntaxed, 
      tvaRate: l.tvaRate 
    })));

    // Get timbre fiscal (1 DZD for standard documents)
    const timbreFiscal = getTimbreFiscal('facture', tvaResult.totalTTC);

    // Calculate final totals
    const amountUntaxed = tvaResult.totalHT;
    const amountTax = tvaResult.totalTVACollectee;
    const amountTotal = tvaResult.totalTTC + timbreFiscal;

    // Create sales order with lines in a transaction
    const salesOrder = await db.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          reference,
          date: now,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          
          // Status starts as draft or sent
          status: 'sent',
          
          // Amounts
          amountUntaxed,
          amountTax,
          timbreFiscal,
          amountTotal,
          amountDelivered: 0,
          amountInvoiced: 0,
          
          // Relations
          partnerId,
          companyId: company.id,
          warehouseId: warehouseId || null,
          salesPersonId: salesPersonId || null,
          quotationId: quotationId || null,
          opportunityId: opportunityId || null,
          
          // Payment & Shipping
          paymentTerms: paymentTerms || '30',
          paymentMode: paymentMode || null,
          shippingAddress: shippingAddress || null,
          
          // Notes
          internalNotes: internalNotes || null,
          customerNotes: customerNotes || null,
          
          // Lines
          lines: {
            create: linesData
          }
        },
        include: {
          partner: true,
          company: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          salesPerson: { select: { id: true, name: true } },
          quotation: { select: { id: true, reference: true } },
          lines: { include: { product: true } }
        }
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: salesOrder,
      message: quotationId 
        ? `Sales Order ${reference} created successfully from quotation`
        : `Sales Order ${reference} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('SalesOrders POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sales order' },
      { status: 500 }
    );
  }
}
