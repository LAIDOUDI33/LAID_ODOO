import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/inventory - Get inventory/stock data
export async function GET(request: Request) {
  // SECURITY: Require authentication for inventory data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const warehouseId = searchParams.get('warehouse');
    const lowStock = searchParams.get('lowStock') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause for stock levels
    const stockWhere: any = {};
    
    if (warehouseId) {
      stockWhere.warehouseId = warehouseId;
    }

    if (lowStock) {
      // Items at or below minimum quantity
      stockWhere.quantity = { lte: db.stockLevel.fields.minQty };
    }

    // Build product filter
    const productWhere: any = { isActive: true };
    
    if (search) {
      productWhere.OR = [
        { name: { contains: search } },
        { nameAr: { contains: search } },
        { code: { contains: search } }
      ];
    }

    if (category) {
      productWhere.categoryId = category;
    }

    // Fetch stock levels with related data
    const [stockLevels, total, warehouses, summary] = await Promise.all([
      db.stockLevel.findMany({
        where: {
          ...stockWhere,
          product: productWhere
        },
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } }
            }
          },
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.stockLevel.count({
        where: {
          ...stockWhere,
          product: productWhere
        }
      }),
      db.warehouse.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }),
      // Calculate KPI summaries
      db.stockLevel.groupBy({
        by: ['productId'],
        _sum: { quantity: true, availableQty: true, reservedQty: true },
        where: {
          product: { isActive: true }
        }
      })
    ]);

    // Calculate overall stats
    let totalProducts = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    // Get all products with their costs for value calculation
    const productsWithCosts = await db.product.findMany({
      where: { isActive: true, trackStock: true },
      select: { id: true, costPrice: true, salePrice: true }
    });

    const costMap = new Map(productsWithCosts.map(p => [p.id, p]));

    for (const sl of await db.stockLevel.findMany({
      where: { product: { isActive: true } }
    })) {
      totalQuantity += sl.quantity;
      const product = costMap.get(sl.productId);
      if (product) {
        totalValue += sl.quantity * (product.costPrice || 0);
      }
      if (sl.quantity <= sl.minQty && sl.minQty > 0) {
        lowStockCount++;
      }
      if (sl.quantity === 0) {
        outOfStockCount++;
      }
    }

    // Count unique active products with stock tracking
    const uniqueProductsCount = await db.product.count({
      where: { isActive: true, trackStock: true }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        stockLevels,
        warehouses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        kpis: {
          totalProducts: uniqueProductsCount,
          totalQuantity,
          totalValue,
          lowStockCount,
          outOfStockCount
        }
      }
    });
  } catch (error) {
    console.error('Inventory GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Stock adjustment
export async function POST(request: Request) {
  // SECURITY: Require Warehouse Manager role for stock adjustments
  const authError = await requireRole(request, ['admin', 'manager', 'warehouse_manager']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    const { productId, warehouseId, locationId, quantity, type, notes } = body;

    if (!productId || !warehouseId || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: 'Product ID, Warehouse ID, and quantity are required' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify warehouse exists
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Determine movement type and adjust quantity sign
    const isIncrease = type === 'in' || type === 'adjustment_in';
    const adjustedQty = isIncrease ? Math.abs(quantity) : -Math.abs(quantity);

    // Generate reference
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refPrefix = isIncrease ? 'ADJ-IN' : 'ADJ-OUT';
    const reference = `${refPrefix}-${dateStr}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Use a transaction to update stock level and create movement
    const result = await db.$transaction(async (tx) => {
      // Find or create stock level
      const locationFilter = locationId ? { productId, warehouseId, locationId } : { productId, warehouseId, locationId: null };
      
      let stockLevel = await tx.stockLevel.findFirst({
        where: locationFilter
      });

      if (!stockLevel) {
        // Create new stock level
        stockLevel = await tx.stockLevel.create({
          data: {
            productId,
            warehouseId,
            locationId: locationId || null,
            quantity: Math.max(0, adjustedQty),
            availableQty: Math.max(0, adjustedQty),
            minQty: 0,
            maxQty: 0
          }
        });
      } else {
        // Update existing stock level
        const newQty = stockLevel.quantity + adjustedQty;
        
        // M-07 FIX: Check for negative stock and handle based on policy
        if (newQty < 0) {
          const currentQty = stockLevel.quantity;
          console.warn(`[M-07] Stock adjustment would result in negative stock: Product ${productId}, Current: ${currentQty}, Adjustment: ${adjustedQty}`);
          
          if (process.env.NEGATIVE_STOCK_POLICY !== 'allow') {
            return NextResponse.json(
              { 
                success: false, 
                error: `Ajustement refusé: résulterait en un stock négatif. Stock actuel: ${currentQty}, Ajustement demandé: ${adjustedQty}`,
                code: 'NEGATIVE_STOCK_PREVENTED',
                details: {
                  currentStock: currentQty,
                  requestedAdjustment: adjustedQty,
                  resultingStock: newQty
                }
              },
              { status: 409 }
            );
          }
        }
        
        const safeNewQty = Math.max(0, newQty); // Final safety clamp if policy allows negative
        stockLevel = await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: {
            quantity: safeNewQty,
            availableQty: Math.max(0, safeNewQty - stockLevel.reservedQty)
          }
        });
      }

      // Create stock movement record
      const movementType = isIncrease ? 'in_adjustment' : 'out_adjustment';
      const movement = await tx.stockMovement.create({
        data: {
          reference,
          date: new Date(),
          type: movementType,
          quantity: Math.abs(quantity),
          unitCost: product.costPrice || 0,
          totalCost: Math.abs(quantity) * (product.costPrice || 0),
          notes: notes || `Ajustement manuel de stock`,
          productId,
          warehouseId,
          locationId: locationId || null,
          stockLevelId: stockLevel.id
        }
      });

      return { stockLevel, movement };
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: 'Stock adjustment completed successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Inventory POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
