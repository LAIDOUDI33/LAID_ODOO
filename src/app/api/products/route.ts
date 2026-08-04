import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/products - List products
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = { isActive: true };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { nameAr: { contains: search } },
        { code: { contains: search } }
      ];
    }

    if (category) {
      whereClause.categoryId = category;
    }

    if (type) {
      whereClause.type = type;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { name: true } }
        }
      }),
      db.product.count({ where: whereClause })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Products GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.code || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Product code and name are required' },
        { status: 400 }
      );
    }

    // Check for unique code
    const existing = await db.product.findFirst({ where: { code: body.code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A product with this code already exists' },
        { status: 409 }
      );
    }

    // Get default company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No company found' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        code: body.code,
        name: body.name,
        nameAr: body.nameAr || null,
        description: body.description || null,
        type: body.type || 'stockable',
        
        // Pricing
        salePrice: parseFloat(body.salePrice) || 0,
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        costPrice: parseFloat(body.costPrice) || 0,
        tvaRate: parseFloat(body.tvaRate) || 19, // Default 19% TVA
        
        // Stock settings
        trackStock: body.trackStock !== undefined ? body.trackStock : true,
        useSerials: body.useSerials || false,
        useLots: body.useLots || false,
        unitOfMeasure: body.unitOfMeasure || 'U',
        
        // Category
        categoryId: body.categoryId || null,
        
        // Image
        image: body.image || null,
        
        // Status
        canBeSold: body.canBeSold !== undefined ? body.canBeSold : true,
        canBePurchased: body.canBePurchased !== undefined ? body.canBePurchased : true,
        
        companyId: company.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: product,
      message: 'Product created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Products POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
