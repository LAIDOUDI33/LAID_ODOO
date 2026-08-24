import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, getAuthenticatedUser } from '@/lib/auth-utils';
import { cache, CacheKeys } from '@/lib/cache';

// Month names in French for charts
const MONTH_NAMES_FR = [
  'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin',
  'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'
];

export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    // Get authenticated user for company scoping
    const user = await getAuthenticatedUser();
    const companyId = user?.companyId;

    // CACHE: Check for cached dashboard data (5 minute TTL)
    const cacheKey = CacheKeys.dashboard(companyId);
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, _cached: true }
      });
    }

    // Get current date info
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const dayOfMonth = now.getDate();
    
    const startOfDay = new Date(year, month, dayOfMonth);
    const startOfMonth = new Date(year, month, 1);
    const startOfYear = new Date(year, 0, 1);

    // Build company filter condition (for multi-tenant data isolation)
    const companyFilter = companyId ? { companyId } : {};

    // Get company info (scoped to user's company if applicable)
    const company = await db.company.findFirst({
      where: { 
        isActive: true,
        ...(companyId && { id: companyId })
      }
    });

    // Calculate KPIs - all queries now include company scoping
    const [
      invoicesToday,
      invoicesMonth,
      invoicesYear,
      paidInvoices,
      unpaidInvoices,
      employeeCount,
      productCount,
      partnerCount,
      recentInvoices,
      lowStockProducts,
      monthlyRevenueData,
      salesByCategoryData,
      expensesByMonthData
    ] = await Promise.all([
      // CA Today
      db.invoice.aggregate({
        where: {
          date: { gte: startOfDay },
          status: { not: 'cancelled' },
          ...companyFilter
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // CA This Month
      db.invoice.aggregate({
        where: {
          date: { gte: startOfMonth },
          status: { not: 'cancelled' },
          ...companyFilter
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // CA This Year
      db.invoice.aggregate({
        where: {
          date: { gte: startOfYear },
          status: { not: 'cancelled' },
          ...companyFilter
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // Paid Invoices
      db.invoice.aggregate({
        where: { 
          status: 'paid',
          ...companyFilter 
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // Unpaid Invoices
      db.invoice.aggregate({
        where: { 
          status: { in: ['draft', 'sent', 'partial'] },
          ...companyFilter 
        },
        _sum: { amountDue: true },
        _count: true
      }),
      
      // Employee Count (scoped to company)
      db.employee.count({ 
        where: { 
          isActive: true,
          ...companyFilter 
        } 
      }),
      
      // Product Count (scoped to company)
      db.product.count({ 
        where: { 
          isActive: true,
          ...companyFilter 
        } 
      }),
      
      // Partner Count (scoped to company)
      db.partner.count({ 
        where: { 
          isActive: true,
          ...companyFilter 
        } 
      }),
      
      // Recent Invoices (last 10) - scoped to company
      db.invoice.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: companyFilter,
        include: {
          partner: { select: { name: true } }
        }
      }),
      
      // Low Stock Products - scoped to company
      db.stockLevel.findMany({
        where: {
          availableQty: { lte: 10 },
          ...(companyId && { 
            product: { companyId } 
          })
        },
        take: 10,
        include: { product: { select: { name: true, code: true } } }
      }),
      
      // Monthly Revenue (Last 12 months) - OPTIMIZED: Parallel execution
      getMonthlyRevenue(year, month, companyId),
      
      // Sales by Category - OPTIMIZED: Database GROUP BY aggregation
      getSalesByCategory(startOfYear, companyId),
      
      // Expenses by Month (Bills) - OPTIMIZED: Parallel execution
      getExpensesByMonth(year, month, companyId)
    ]);

    // Tax Deadlines (Algerian Fiscal Calendar)
    const taxDeadlines = [
      {
        type: 'G50 - TVA',
        description: 'Declaration TVA',
        deadline: 20,
        daysUntil: 20 - dayOfMonth <= 0 ? 30 - (dayOfMonth - 20) : 20 - dayOfMonth,
        isUrgent: (20 - dayOfMonth) <= 5 && (20 - dayOfMonth) > 0,
        isOverdue: dayOfMonth > 20
      },
      {
        type: 'G2 - TAP',
        description: 'Taxe Activite Professionnelle',
        deadline: 20,
        daysUntil: 20 - dayOfMonth <= 0 ? 30 - (dayOfMonth - 20) : 20 - dayOfMonth,
        isUrgent: (20 - dayOfMonth) <= 5 && (20 - dayOfMonth) > 0,
        isOverdue: dayOfMonth > 20
      },
      {
        type: 'IRG Salaires',
        description: 'Retenue IRG sur salaires',
        deadline: 15,
        daysUntil: 15 - dayOfMonth <= 0 ? 30 - (dayOfMonth - 15) : 15 - dayOfMonth,
        isUrgent: (15 - dayOfMonth) <= 5 && (15 - dayOfMonth) > 0,
        isOverdue: dayOfMonth > 15
      },
      {
        type: 'CNAS/CASNOS',
        description: 'Cotisations sociales',
        deadline: 15,
        daysUntil: 15 - dayOfMonth <= 0 ? 30 - (dayOfMonth - 15) : 15 - dayOfMonth,
        isUrgent: (15 - dayOfMonth) <= 5 && (15 - dayOfMonth) > 0,
        isOverdue: dayOfMonth > 15
      }
    ];

    const responseData = {
      company,
      kpis: {
        caToday: invoicesToday._sum.amountTotal || 0,
        caMonth: invoicesMonth._sum.amountTotal || 0,
        caYear: invoicesYear._sum.amountTotal || 0,
        invoiceCountToday: invoicesToday._count,
        invoiceCountMonth: invoicesMonth._count,
        invoiceCountYear: invoicesYear._count,
        paidInvoiceCount: paidInvoices._count,
        unpaidInvoiceCount: unpaidInvoices._count,
        unpaidAmount: unpaidInvoices._sum.amountDue || 0,
        employeeCount,
        productCount,
        partnerCount
      },
      charts: {
        monthlyRevenue: monthlyRevenueData,
        salesByCategory: salesByCategoryData,
        expensesByMonth: expensesByMonthData
      },
      recentActivity: {
        invoices: recentInvoices,
        lowStockAlerts: lowStockProducts
      },
      taxDeadlines,
      currentDate: now.toISOString()
    };

    // CACHE: Store result for 5 minutes (300 seconds)
    await cache.set(cacheKey, responseData, 300);

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// ============================================================
// Helper: Get Monthly Revenue for Last 12 Months
// OPTIMIZED: Uses Promise.all for parallel query execution
// Instead of 12 sequential queries, all 12 run in parallel
// ============================================================

async function getMonthlyRevenue(
  currentYear: number, 
  currentMonth: number,
  companyId?: string
) {
  // Create all 12 month queries and execute them in parallel
  const monthlyPromises = Array.from({ length: 12 }, async (_, i) => {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;
    
    // Handle year rollover
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    return db.invoice.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'cancelled' },
        ...(companyId && { companyId })
      },
      _sum: { amountTotal: true },
      _count: true
    }).then(result => ({
      month: MONTH_NAMES_FR[targetMonth],
      revenue: result._sum.amountTotal || 0,
      count: result._count
    }));
  });

  // Execute all queries in parallel instead of sequentially
  return Promise.all(monthlyPromises);
}

// ============================================================
// Helper: Get Sales by Product Category
// OPTIMIZED: Uses database GROUP BY instead of loading all data into memory
// Reduces memory usage and lets the database handle aggregation
// ============================================================

async function getSalesByCategory(
  sinceDate: Date,
  companyId?: string
) {
  // Step 1: Aggregate invoice lines by product using database GROUP BY
  // This is much more efficient than loading all invoices into memory
  const productSales = await db.invoiceLine.groupBy({
    by: ['productId'],
    _sum: { amountTotal: true },
    _count: true,
    where: {
      invoice: {
        date: { gte: sinceDate },
        status: { not: 'cancelled' },
        ...(companyId && { companyId })
      }
    }
  });

  // Early return if no sales data
  if (productSales.length === 0) {
    return [{ category: 'Aucune donnee', value: 0, percentage: 100, count: 0 }];
  }

  // Step 2: Fetch product categories for each unique productId (single query)
  const productIds = [...new Set(productSales.map(ps => ps.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, categoryId: true }
  });

  // Step 3: Fetch category names for unique categories (single query)
  const categoryIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))] as string[];
  const categories = await db.productCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true }
  });

  // Create lookup maps for efficient joining
  const productCategoryMap = new Map(products.map(p => [p.id, p.categoryId]));
  const categoryNameMap = new Map(categories.map(c => [c.id, c.name]));

  // Step 4: Aggregate by category in JavaScript (on minimal dataset)
  const categoryMap = new Map<string, { value: number; count: number }>();
  
  for (const ps of productSales) {
    const catId = productCategoryMap.get(ps.productId);
    const categoryName = (catId ? categoryNameMap.get(catId) : null) || 'Sans categorie';
    const existing = categoryMap.get(categoryName) || { value: 0, count: 0 };
    existing.value += ps._sum.amountTotal || 0;
    existing.count += ps._count;
    categoryMap.set(categoryName, existing);
  }

  // Convert to array and calculate percentages
  const totalValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.value, 0);
  
  const result = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      value: data.value,
      percentage: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
      count: data.count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 categories
  
  return result;
}

// ============================================================
// Helper: Get Expenses by Month (from Bills)
// OPTIMIZED: Uses Promise.all for parallel query execution
// ============================================================

async function getExpensesByMonth(
  currentYear: number, 
  currentMonth: number,
  companyId?: string
) {
  // Create all 12 month queries and execute them in parallel
  const expensePromises = Array.from({ length: 12 }, async (_, i) => {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;
    
    // Handle year rollover
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    return db.bill.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'cancelled' },
        ...(companyId && { companyId })
      },
      _sum: { amountTotal: true },
      _count: true
    }).then(result => ({
      month: MONTH_NAMES_FR[targetMonth],
      expenses: result._sum.amountTotal || 0,
      count: result._count
    }));
  });

  // Execute all queries in parallel instead of sequentially
  return Promise.all(expensePromises);
}
