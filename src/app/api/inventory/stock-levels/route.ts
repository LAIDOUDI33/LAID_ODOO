// ============================================================
// HASSIBA Suite ERP v2.0.0 - Stock Levels API
// API pour la gestion des niveaux de stock
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url)
    
    // Filters
    const warehouseId = searchParams.get('warehouseId')
    const lowStockOnly = searchParams.get('lowStock') === 'true'
    const outOfStockOnly = searchParams.get('outOfStock') === 'true'
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    
    // Build where clause
    const where: any = {
      product: { isActive: true }
    }
    
    if (warehouseId) {
      where.warehouseId = warehouseId
    }
    
    if (categoryId) {
      where.product = { ...where.product, categoryId }
    }
    
    if (lowStockOnly) {
      where.lte = { quantity: { field: 'minQty' } }
      // Alternative: filter after fetch for SQLite compatibility
    }
    
    // Fetch stock levels with product and warehouse info
    const stockLevels = await db.stockLevel.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: {
        product: {
          include: {
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
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    // Apply client-side filters (for complex conditions)
    let filteredLevels = stockLevels
    
    if (search) {
      const q = search.toLowerCase()
      filteredLevels = filteredLevels.filter(item =>
        item.product.code.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.nameAr?.toLowerCase().includes(q)
      )
    }
    
    if (categoryId) {
      filteredLevels = filteredLevels.filter(item => 
        item.product.categoryId === categoryId
      )
    }
    
    if (lowStockOnly) {
      filteredLevels = filteredLevels.filter(item => 
        item.quantity <= item.minQty && item.minQty > 0
      )
    }
    
    if (outOfStockOnly) {
      filteredLevels = filteredLevels.filter(item => item.quantity === 0)
    }
    
    // Calculate KPIs
    const totalProducts = new Set(filteredLevels.map(sl => sl.productId)).size
    const totalQuantity = filteredLevels.reduce((acc, sl) => acc + sl.quantity, 0)
    const totalValue = filteredLevels.reduce((acc, sl) => acc + (sl.quantity * sl.product.costPrice), 0)
    const lowStockCount = filteredLevels.filter(sl => sl.quantity <= sl.minQty && sl.minQty > 0).length
    const outOfStockCount = filteredLevels.filter(sl => sl.quantity === 0).length
    
    // Low stock alerts details
    const lowStockAlerts = filteredLevels
      .filter(sl => sl.quantity <= sl.minQty && sl.minQty > 0)
      .sort((a, b) => {
        const aRatio = a.quantity / Math.max(a.minQty, 1)
        const bRatio = b.quantity / Math.max(b.minQty, 1)
        return aRatio - bRatio
      })
      .slice(0, 20)
      .map(sl => ({
        id: sl.id,
        productId: sl.productId,
        productName: sl.product.name,
        productCode: sl.product.code,
        currentQuantity: sl.quantity,
        minQuantity: sl.minQty,
        unitOfMeasure: sl.product.unitOfMeasure,
        warehouseName: sl.warehouse.name,
        deficit: Math.max(0, sl.minQty - sl.quantity),
        status: sl.quantity === 0 ? 'out_of_stock' : sl.quantity <= sl.minQty * 0.5 ? 'critical' : 'low',
        valueAtRisk: Math.max(0, sl.minQty - sl.quantity) * sl.product.costPrice
      }))
    
    // Stock valuation by warehouse
    const warehouseValuation = filteredLevels.reduce((acc, sl) => {
      const whId = sl.warehouseId
      const whName = sl.warehouse.name
      
      if (!acc[whId]) {
        acc[whId] = {
          warehouseId: whId,
          warehouseName: whName,
          warehouseCode: sl.warehouse.code,
          totalQuantity: 0,
          totalValue: 0,
          productCount: 0,
          lowStockCount: 0
        }
      }
      
      acc[whId].totalQuantity += sl.quantity
      acc[whId].totalValue += sl.quantity * sl.product.costPrice
      acc[whId].productCount += 1
      if (sl.quantity <= sl.minQty && sl.minQty > 0) {
        acc[whId].lowStockCount += 1
      }
      
      return acc
    }, {} as Record<string, any>)
    
    // Stock valuation by category
    const categoryValuation = filteredLevels.reduce((acc, sl) => {
      const catId = sl.product.category?.id || 'uncategorized'
      const catName = sl.product.category?.name || 'Non classé'
      
      if (!acc[catId]) {
        acc[catId] = {
          categoryId: catId,
          categoryName: catName,
          totalQuantity: 0,
          totalValue: 0,
          productCount: 0
        }
      }
      
      acc[catId].totalQuantity += sl.quantity
      acc[catId].totalValue += sl.quantity * sl.product.costPrice
      acc[catId].productCount += 1
      
      return acc
    }, {} as Record<string, any>)
    
    // Top products by value
    const topProductsByValue = [...filteredLevels]
      .sort((a, b) => (b.quantity * b.product.costPrice) - (a.quantity * a.product.costPrice))
      .slice(0, 10)
      .map(sl => ({
        productId: sl.productId,
        productCode: sl.product.code,
        productName: sl.product.name,
        quantity: sl.quantity,
        unitCost: sl.product.costPrice,
        totalValue: sl.quantity * sl.product.costPrice,
        unitOfMeasure: sl.product.unitOfMeasure,
        warehouseName: sl.warehouse.name
      }))
    
    return NextResponse.json({
      success: true,
      data: {
        stockLevels: filteredLevels,
        kpis: {
          totalProducts,
          totalQuantity,
          totalValue,
          lowStockCount,
          outOfStockCount
        },
        lowStockAlerts,
        warehouseValuation: Object.values(warehouseValuation),
        categoryValuation: Object.values(categoryValuation),
        topProductsByValue
      }
    })
    
  } catch (error) {
    console.error('Error fetching stock levels:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des niveaux de stock' },
      { status: 500 }
    )
  }
}
