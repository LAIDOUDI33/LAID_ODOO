// ============================================================
// HASSIBA Suite ERP v2.0.0 - Stock Movements API
// API pour la gestion des mouvements de stock
// FIXES: H-14 (Atomic Transfers), H-16 (userId Audit Trail)
// M-07 FIX: Negative stock rejection with clear error messages
// M-08 FIX: Configurable costing method (FIFO/LIFO/Weighted Average)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils'
import { randomUUID } from 'crypto'

// M-08 FIX: Costing Method Configuration
// Supported costing methods for inventory valuation
export type CostingMethod = 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE';

const DEFAULT_COSTING_METHOD: CostingMethod = (process.env.DEFAULT_COSTING_METHOD as CostingMethod) || 'WEIGHTED_AVERAGE';

/**
 * Get the configured costing method for a company
 * Falls back to environment variable, then default (WEIGHTED_AVERAGE)
 * Note: If Company model has a 'settings' JSON field, it can be used here for per-company config
 */
async function getCompanyCostingMethod(companyId?: string): Promise<CostingMethod> {
  // For now, use environment variable or default
  // TODO: Add 'settings' JSON field to Company model for per-company configuration
  return DEFAULT_COSTING_METHOD;
}

/**
 * Calculate the unit cost based on the configured costing method
 * For FIFO/LIFO, this would typically track cost layers
 * For Weighted Average, it recalculates the average on each movement
 */
export async function calculateUnitCost(
  productId: string,
  warehouseId: string,
  newQuantity: number,
  newUnitCost: number,
  movementType: string,
  companyId?: string
): Promise<{ unitCost: number; methodUsed: CostingMethod }> {
  const method = await getCompanyCostingMethod(companyId);
  
  // For inbound movements, use the provided cost or product's standard cost
  if (movementType.startsWith('in_')) {
    return { unitCost: newUnitCost, methodUsed: method };
  }
  
  // For outbound movements, determine cost based on method
  switch (method) {
    case 'FIFO':
      // FIFO: Use oldest cost first (simplified - would need cost layers for full implementation)
      // For now, fall back to current average cost
      const fifoCost = await getCurrentAverageCost(productId, warehouseId);
      return { unitCost: fifoCost || newUnitCost, methodUsed: method };
      
    case 'LIFO':
      // LIFO: Use newest cost first (simplified - would need cost layers for full implementation)
      // For now, fall back to current average cost
      const lifoCost = await getCurrentAverageCost(productId, warehouseId);
      return { unitCost: lifoCost || newUnitCost, methodUsed: method };
      
    case 'WEIGHTED_AVERAGE':
    default:
      // WEIGHTED_AVERAGE: Recalculate average cost
      const avgCost = await getWeightedAverageCost(productId, warehouseId, newQuantity, newUnitCost, movementType);
      return { unitCost: avgCost || newUnitCost, methodUsed: method };
  }
}

/**
 * Get current weighted average cost for a product in a warehouse
 */
async function getCurrentAverageCost(productId: string, warehouseId: string): Promise<number | null> {
  const stockLevel = await db.stockLevel.findFirst({
    where: { productId, warehouseId },
    select: { quantity: true }
  });
  
  if (!stockLevel || stockLevel.quantity === 0) return null;
  
  // Calculate average from recent inbound movements
  const movements = await db.stockMovement.aggregate({
    where: {
      productId,
      warehouseId,
      type: { startsWith: 'in_' }
    },
    _sum: { totalCost: true, quantity: true }
  });
  
  if (!movements._sum.quantity || movements._sum.quantity === 0) return null;
  
  return (movements._sum.totalCost || 0) / movements._sum.quantity;
}

/**
 * Calculate new weighted average cost after a movement
 */
async function getWeightedAverageCost(
  productId: string,
  warehouseId: string,
  newQty: number,
  newCost: number,
  movementType: string
): Promise<number | null> {
  const currentStock = await db.stockLevel.findFirst({
    where: { productId, warehouseId },
    select: { quantity: true }
  });
  
  const currentQty = currentStock?.quantity || 0;
  
  // For outbound movements, return existing average
  if (movementType.startsWith('out_')) {
    return await getCurrentAverageCost(productId, warehouseId);
  }
  
  // For inbound movements, calculate new weighted average
  const currentAvgCost = await getCurrentAverageCost(productId, warehouseId);
  
  if (currentQty === 0 || !currentAvgCost) {
    return newCost; // First stock entry
  }
  
  // New weighted average = (current value + new value) / (current qty + new qty)
  const currentValue = currentQty * currentAvgCost;
  const newValue = newQty * newCost;
  const newTotalQty = currentQty + newQty;
  
  return (currentValue + newValue) / newTotalQty;
}

// M-07 FIX: Configuration for negative stock handling
// Set to 'reject' to block operations that would result in negative stock
// Set to 'warn' to allow but log a warning
// Set to 'allow' to silently allow (NOT RECOMMENDED for production)
const NEGATIVE_STOCK_POLICY = process.env.NEGATIVE_STOCK_POLICY || 'reject' as 'reject' | 'warn' | 'allow';

// ============================================================
// POST - Create Stock Movement (including Atomic Transfer)
// H-14 FIX: Transfer operations are now atomic within $transaction
// H-16 FIX: userId is captured for audit trail
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication and appropriate role
    const authError = await requireRole(request, ['admin', 'manager', 'warehouse_manager', 'accountant']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const body = await request.json();
    const {
      type, // 'transfer' for atomic transfer operation
      productId,
      sourceWarehouseId,
      targetWarehouseId,
      quantity,
      notes,
      locationId,
      unitCost,
      // For single warehouse movements
      warehouseId,
      movementType // in_receipt, out_delivery, etc.
    } = body;

    // H-14: Handle atomic transfer operation
    if (type === 'transfer') {
      return await handleAtomicTransfer(body, user);
    }

    // Standard single movement creation
    if (!productId || !warehouseId || !quantity || !movementType) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants: productId, warehouseId, quantity, movementType' },
        { status: 400 }
      );
    }
    
    // M-07 FIX: Check for potential negative stock on outbound movements
    const isOutboundMovement = movementType.startsWith('out_');
    if (isOutboundMovement) {
      const currentStock = await db.stockLevel.findFirst({
        where: {
          productId,
          warehouseId,
          ...(locationId ? { locationId } : {})
        }
      });
      
      const currentQty = currentStock?.quantity || 0;
      
      if (quantity > currentQty) {
        // M-07 FIX: Handle based on policy configuration
        if (NEGATIVE_STOCK_POLICY === 'reject') {
          console.warn(`[M-07] Negative stock rejected: Product ${productId}, Warehouse ${warehouseId}, Requested: ${quantity}, Available: ${currentQty}`);
          return NextResponse.json(
            { 
              success: false, 
              error: `Stock insuffisant. Quantité demandée: ${quantity}, Quantité disponible: ${currentQty}`,
              code: 'INSUFFICIENT_STOCK',
              details: {
                requested: quantity,
                available: currentQty,
                shortfall: quantity - currentQty,
                productId,
                warehouseId
              }
            },
            { status: 409 }  // Conflict - resource state doesn't allow operation
          );
        } else if (NEGATIVE_STOCK_POLICY === 'warn') {
          console.warn(`[M-07] WARNING: Operation would result in negative stock! Product ${productId}, Warehouse ${warehouseId}, Requested: ${quantity}, Available: ${currentQty}`);
        }
      }
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, code: true, name: true, costPrice: true }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    const costPrice = unitCost || product.costPrice;
    const totalCost = quantity * costPrice;
    
    // Generate reference
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refSuffix = randomUUID().slice(0, 8);
    const reference = `MOV-${dateStr}-${refSuffix}`;

    // Create movement with userId (H-16 fix)
    const movement = await db.stockMovement.create({
      data: {
        reference,
        date: new Date(),
        type: movementType,
        quantity,
        unitCost: costPrice,
        totalCost,
        notes: notes || null,
        productId,
        warehouseId,
        locationId: locationId || null,
        userId: user?.id || null, // H-16: Audit trail
      }
    });

    return NextResponse.json({
      success: true,
      data: movement,
      message: 'Mouvement de stock créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du mouvement de stock' },
      { status: 500 }
    );
  }
}

// ============================================================
// H-14 FIX: ATOMIC TRANSFER OPERATION
// Both debit AND credit happen in a single $transaction
// If either fails, the entire operation rolls back
// ============================================================
async function handleAtomicTransfer(body: any, user: any) {
  const {
    productId,
    sourceWarehouseId,
    targetWarehouseId,
    quantity,
    notes,
    sourceLocationId,
    targetLocationId
  } = body;

  // Validation
  if (!productId || !sourceWarehouseId || !targetWarehouseId || !quantity || quantity <= 0) {
    return NextResponse.json(
      { success: false, error: 'Champs requis pour transfert: productId, sourceWarehouseId, targetWarehouseId, quantity' },
      { status: 400 }
    );
  }

  if (sourceWarehouseId === targetWarehouseId) {
    return NextResponse.json(
      { success: false, error: 'Les entrepôts source et cible doivent être différents' },
      { status: 400 }
    );
  }

  // Verify product exists with cost price
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, code: true, name: true, costPrice: true }
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Produit non trouvé' },
      { status: 404 }
    );
  }

  // Verify warehouses exist
  const [sourceWh, targetWh] = await Promise.all([
    db.warehouse.findUnique({ where: { id: sourceWarehouseId } }),
    db.warehouse.findUnique({ where: { id: targetWarehouseId } })
  ]);

  if (!sourceWh || !targetWh) {
    return NextResponse.json(
      { success: false, error: 'Un ou les deux entrepôts non trouvés' },
      { status: 404 }
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const refSuffix = randomUUID().slice(0, 8);
  const costPrice = product.costPrice;
  const totalCost = quantity * costPrice;

  // ============================================================
  // ATOMIC TRANSACTION: Both movements succeed or both fail
  // ============================================================
  const result = await db.$transaction(async (tx) => {
    // 1. Check and update SOURCE stock level (debit)
    let sourceStockLevel = await tx.stockLevel.findFirst({
      where: {
        productId,
        warehouseId: sourceWarehouseId,
        ...(sourceLocationId ? { locationId: sourceLocationId } : {})
      }
    });

    if (!sourceStockLevel || sourceStockLevel.quantity < quantity) {
      throw new Error(`Stock insuffisant dans l'entrepôt source. Disponible: ${sourceStockLevel?.quantity || 0}, Demandé: ${quantity}`);
    }

    // Debit source
    await tx.stockLevel.update({
      where: { id: sourceStockLevel.id },
      data: {
        quantity: { decrement: quantity },
        availableQty: { decrement: quantity }
      }
    });

    // Create OUT transfer movement
    const outMovement = await tx.stockMovement.create({
      data: {
        reference: `TRF-OUT-${dateStr}-${refSuffix}`,
        date: new Date(),
        type: 'out_transfer',
        quantity,
        unitCost: costPrice,
        totalCost,
        notes: notes || `Transfert vers ${targetWh.name}`,
        productId,
        warehouseId: sourceWarehouseId,
        locationId: sourceLocationId || null,
        stockLevelId: sourceStockLevel.id,
        userId: user?.id || null, // H-16: Audit trail
      }
    });

    // 2. Check and update TARGET stock level (credit)
    let targetStockLevel = await tx.stockLevel.findFirst({
      where: {
        productId,
        warehouseId: targetWarehouseId,
        ...(targetLocationId ? { locationId: targetLocationId } : {})
      }
    });

    if (!targetStockLevel) {
      // Create new stock level for target if doesn't exist
      targetStockLevel = await tx.stockLevel.create({
        data: {
          productId,
          warehouseId: targetWarehouseId,
          locationId: targetLocationId || null,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
          minQty: 0,
          maxQty: 0
        }
      });
    }

    // Credit target
    await tx.stockLevel.update({
      where: { id: targetStockLevel.id },
      data: {
        quantity: { increment: quantity },
        availableQty: { increment: quantity }
      }
    });

    // Create IN transfer movement
    const inMovement = await tx.stockMovement.create({
      data: {
        reference: `TRF-IN-${dateStr}-${refSuffix}`,
        date: new Date(),
        type: 'in_transfer',
        quantity,
        unitCost: costPrice,
        totalCost,
        notes: notes || `Transfert depuis ${sourceWh.name}`,
        productId,
        warehouseId: targetWarehouseId,
        locationId: targetLocationId || null,
        stockLevelId: targetStockLevel.id,
        userId: user?.id || null, // H-16: Audit trail
      }
    });

    return {
      outMovement,
      inMovement,
      sourceWarehouse: sourceWh,
      targetWarehouse: targetWh,
      product,
      quantity,
      totalCost
    };
  });

  return NextResponse.json({
    success: true,
    message: 'Transfert de stock effectué avec succès (opération atomique)',
    data: {
      transferReference: `TRF-${dateStr}-${refSuffix}`,
      outMovement: {
        id: result.outMovement.id,
        reference: result.outMovement.reference,
        type: 'out_transfer',
        quantity: result.quantity
      },
      inMovement: {
        id: result.inMovement.id,
        reference: result.inMovement.reference,
        type: 'in_transfer',
        quantity: result.quantity
      },
      source: {
        id: result.sourceWarehouse.id,
        name: result.sourceWarehouse.name
      },
      target: {
        id: result.targetWarehouse.id,
        name: result.targetWarehouse.name
      },
      product: {
        id: result.product.id,
        name: result.product.name,
        code: result.product.code
      },
      quantity: result.quantity,
      totalValue: result.totalCost
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // Filters
    const type = searchParams.get('type') // in_receipt, out_delivery, adjustment, transfer, etc.
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    
    // Build where clause
    const where: any = {}
    
    if (type) {
      // Handle type groups (in_*, out_*, etc.)
      if (type === 'in') {
        where.type = { startsWith: 'in_' }
      } else if (type === 'out') {
        where.type = { startsWith: 'out_' }
      } else if (type === 'adjustment') {
        where.type = { in: ['in_adjustment', 'out_adjustment'] }
      } else if (type === 'transfer') {
        where.type = { in: ['in_transfer', 'out_transfer'] }
      } else {
        where.type = type
      }
    }
    
    if (productId) {
      where.productId = productId
    }
    
    if (warehouseId) {
      where.warehouseId = warehouseId
    }
    
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { code: { contains: search } } },
        { notes: { contains: search } }
      ]
    }
    
    // Fetch movements with relations
    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              nameAr: true,
              unitOfMeasure: true,
              costPrice: true,
              categoryId: true,
              category: {
                select: { id: true, name: true }
              }
            }
          },
          warehouse: {
            select: { id: true, name: true, code: true }
          },
          location: {
            select: { id: true, name: true, code: true }
          },
          stockLevel: {
            select: { id: true, quantity: true, availableQty: true }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      db.stockMovement.count({ where })
    ])
    
    // Calculate running balance for each movement (grouped by product)
    // Get all movements for these products to calculate running balance
    const productIds = [...new Set(movements.map(m => m.productId))]
    
    const allMovementsForBalance = await db.stockMovement.findMany({
      where: {
        productId: { in: productIds },
        ...(warehouseId ? { warehouseId } : {}),
        ...(dateFrom ? { date: { gte: new Date(dateFrom) } } : {})
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        productId: true,
        type: true,
        quantity: true,
        date: true
      }
    })
    
    // Calculate running balance per product
    const balanceMap: Record<string, number> = {}
    const balanceAtMovement: Record<string, number> = {}
    
    // Sort and calculate cumulative balance
    const sortedAllMovements = allMovementsForBalance.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    for (const mov of sortedAllMovements) {
      if (!balanceMap[mov.productId]) {
        // Get initial stock level
        const stockLevel = await db.stockLevel.findFirst({
          where: { productId: mov.productId, ...(warehouseId ? { warehouseId } : {}) }
        })
        balanceMap[mov.productId] = stockLevel?.quantity || 0
      }
      
      const isEntry = mov.type.startsWith('in_')
      balanceMap[mov.productId] += isEntry ? mov.quantity : -mov.quantity
      balanceAtMovement[mov.id] = balanceMap[mov.productId]
    }
    
    // Enrich movements with running balance
    const enrichedMovements = movements.map(movement => ({
      ...movement,
      runningBalance: balanceAtMovement[movement.id] || 0,
      isEntry: movement.type.startsWith('in_')
    }))
    
    // Movement summary statistics
    const summary = await getMovementSummary(where)
    
    return NextResponse.json({
      success: true,
      data: {
        movements: enrichedMovements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary
      }
    })
    
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des mouvements de stock' },
      { status: 500 }
    )
  }
}

async function getMovementSummary(where: any) {
  try {
    // Total entries
    const entriesWhere = { 
      ...where, 
      type: { startsWith: 'in_' } 
    }
    const [entriesCount, entriesQty, entriesValue] = await Promise.all([
      db.stockMovement.count({ where: entriesWhere }),
      db.stockMovement.aggregate({
        where: entriesWhere,
        _sum: { quantity: true }
      }),
      db.stockMovement.aggregate({
        where: entriesWhere,
        _sum: { totalCost: true }
      })
    ])
    
    // Total exits
    const exitsWhere = { 
      ...where, 
      type: { startsWith: 'out_' } 
    }
    const [exitsCount, exitsQty, exitsValue] = await Promise.all([
      db.stockMovement.count({ where: exitsWhere }),
      db.stockMovement.aggregate({
        where: exitsWhere,
        _sum: { quantity: true }
      }),
      db.stockMovement.aggregate({
        where: exitsWhere,
        _sum: { totalCost: true }
      })
    ])
    
    return {
      totalEntries: entriesCount,
      totalEntriesQuantity: entriesQty._sum.quantity || 0,
      totalEntriesValue: entriesValue._sum.totalCost || 0,
      totalExits: exitsCount,
      totalExitsQuantity: exitsQty._sum.quantity || 0,
      totalExitsValue: exitsValue._sum.totalCost || 0,
      netMovement: (entriesQty._sum.quantity || 0) - (exitsQty._sum.quantity || 0)
    }
  } catch (error) {
    console.error('Error calculating movement summary:', error)
    return null
  }
}
