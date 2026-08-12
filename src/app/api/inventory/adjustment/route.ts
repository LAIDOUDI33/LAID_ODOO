// ============================================================
// HASSIBA Suite ERP v2.0.0 - Stock Adjustment API
// API pour les ajustements de stock (entrées/sorties/transferts)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils'

// POST - Create a stock adjustment
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require appropriate role (stock adjustments affect financials)
    const authError = await requireRole(request, ['admin', 'manager', 'warehouse_manager', 'accountant']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const body = await request.json()
    const { 
      productId, 
      warehouseId, 
      locationId,
      quantity, 
      type,  // 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out'
      notes,
      reason, // Reason for adjustment (required for audit)
      sourceWarehouseId, // For transfers
      unitCost // Optional: override cost price
    } = body
    
    // Validation
    if (!productId || !warehouseId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Champs requis manquants: productId, warehouseId, quantity' },
        { status: 400 }
      )
    }
    
    if (!['adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type de mouvement invalide' },
        { status: 400 }
      )
    }
    
    // For adjustments, reason is required
    if ((type === 'adjustment_in' || type === 'adjustment_out') && !notes?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le motif de l\'ajustement est obligatoire' },
        { status: 400 }
      )
    }
    
    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, code: true, name: true, costPrice: true, trackStock: true }
    })
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      )
    }
    
    // Verify warehouse exists
    const warehouse = await db.warehouse.findUnique({
      where: { id: warehouseId }
    })
    
    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: 'Entrepôt non trouvé' },
        { status: 404 }
      )
    }
    
    // For transfers, verify source warehouse
    if (type === 'transfer_out' && sourceWarehouseId) {
      const sourceWh = await db.warehouse.findUnique({ where: { id: sourceWarehouseId } })
      if (!sourceWh) {
        return NextResponse.json(
          { success: false, error: 'Entrepôt source non trouvé' },
          { status: 404 }
        )
      }
    }
    
    const costPrice = unitCost || product.costPrice
    const totalCost = quantity * costPrice
    
    // Determine movement type enum value
    let movementType: string
    switch (type) {
      case 'adjustment_in':
        movementType = 'in_adjustment'
        break
      case 'adjustment_out':
        movementType = 'out_adjustment'
        break
      case 'transfer_in':
        movementType = 'in_transfer'
        break
      case 'transfer_out':
        movementType = 'out_transfer'
        break
      default:
        movementType = type
    }
    
    // Generate reference
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const refSuffix = randomUUID().slice(0, 8)
    const prefix = movementType.startsWith('in_') ? 'AJT-IN' : 'AJT-OUT'
    const reference = `${prefix}-${dateStr}-${refSuffix}`
    
    // Get or create stock level
    let stockLevel = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId_locationId: {
          productId,
          warehouseId,
          locationId: locationId || null
        }
      }
    })
    
    if (!stockLevel) {
      // Create new stock level
      stockLevel = await db.stockLevel.create({
        data: {
          productId,
          warehouseId,
          locationId,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
          minQty: 0,
          maxQty: 0
        }
      })
    }
    
    // Calculate new quantities
    const isEntry = movementType.startsWith('in_')
    const quantityChange = isEntry ? quantity : -quantity
    const newQuantity = Math.max(0, stockLevel.quantity + quantityChange)
    const newAvailableQty = Math.max(0, stockLevel.availableQty + quantityChange)
    
    // Validate sufficient stock for exits
    if (!isEntry && stockLevel.quantity < quantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Stock insuffisant. Disponible: ${stockLevel.quantity}, Demandé: ${quantity}` 
        },
        { status: 400 }
      )
    }
    
    // Create transaction for atomic update
    const result = await db.$transaction(async (tx) => {
      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          reference,
          date: new Date(),
          type: movementType as any,
          quantity,
          unitCost: costPrice,
          totalCost,
          notes: notes || null,
          productId,
          warehouseId,
          locationId,
          stockLevelId: stockLevel.id
        }
      })
      
      // Update stock level
      await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: {
          quantity: newQuantity,
          availableQty: newAvailableQty
        }
      })
      
      return movement
    })
    
    // Return success response with updated stock info
    return NextResponse.json({
      success: true,
      message: `Ajustement de stock enregistré avec succès`,
      data: {
        movement: {
          id: result.id,
          reference: result.reference,
          type: result.type,
          quantity: result.quantity,
          date: result.date
        },
        stockLevel: {
          id: stockLevel.id,
          previousQuantity: stockLevel.quantity,
          newQuantity,
          change: quantityChange
        },
        product: {
          id: product.id,
          code: product.code,
          name: product.name
        },
        warehouse: {
          id: warehouse.id,
          name: warehouse.name
        }
      }
    })
    
  } catch (error) {
    console.error('Error creating stock adjustment:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'ajustement de stock' },
      { status: 500 }
    )
  }
}

// GET - Get adjustment history
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    const where: any = {
      OR: [
        { type: 'in_adjustment' },
        { type: 'out_adjustment' },
        { type: 'in_transfer' },
        { type: 'out_transfer' }
      ]
    }
    
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    
    const [adjustments, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, code: true, name: true, unitOfMeasure: true }
          },
          warehouse: {
            select: { id: true, name: true, code: true }
          },
          location: {
            select: { id: true, name: true, code: true }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      db.stockMovement.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        adjustments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching adjustments:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des ajustements' },
      { status: 500 }
    )
  }
}
