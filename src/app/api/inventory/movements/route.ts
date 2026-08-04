// ============================================================
// HASSIBA Suite ERP v2.0.0 - Stock Movements API
// API pour la gestion des mouvements de stock
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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
