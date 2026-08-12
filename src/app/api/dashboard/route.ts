import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

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

    // Get current date info
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const dayOfMonth = now.getDate();
    
    const startOfDay = new Date(year, month, dayOfMonth);
    const startOfMonth = new Date(year, month, 1);
    const startOfYear = new Date(year, 0, 1);

    // Get company info
    const company = await db.company.findFirst({
      where: { isActive: true }
    });

    // Calculate KPIs
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
          status: { not: 'cancelled' }
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // CA This Month
      db.invoice.aggregate({
        where: {
          date: { gte: startOfMonth },
          status: { not: 'cancelled' }
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // CA This Year
      db.invoice.aggregate({
        where: {
          date: { gte: startOfYear },
          status: { not: 'cancelled' }
        },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // Paid Invoices
      db.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { amountTotal: true },
        _count: true
      }),
      
      // Unpaid Invoices
      db.invoice.aggregate({
        where: { status: { in: ['draft', 'sent', 'partial'] } },
        _sum: { amountDue: true },
        _count: true
      }),
      
      // Employee Count
      db.employee.count({ where: { isActive: true } }),
      
      // Product Count
      db.product.count({ where: { isActive: true } }),
      
      // Partner Count
      db.partner.count({ where: { isActive: true } }),
      
      // Recent Invoices (last 10)
      db.invoice.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          partner: { select: { name: true } }
        }
      }),
      
      // Low Stock Products
      db.stockLevel.findMany({
        where: {
          availableQty: { lte: 10 }
        },
        take: 10,
        include: { product: { select: { name: true, code: true } } }
      }),
      
      // Monthly Revenue (Last 12 months)
      getMonthlyRevenue(year, month),
      
      // Sales by Category
      getSalesByCategory(startOfYear),
      
      // Expenses by Month (Bills)
      getExpensesByMonth(year, month)
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

    return NextResponse.json({
      success: true,
      data: {
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
      }
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
// ============================================================

async function getMonthlyRevenue(currentYear: number, currentMonth: number) {
  const monthlyData = [];
  
  // Get last 12 months including current month
  for (let i = 11; i >= 0; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;
    
    // Handle year rollover
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    const result = await db.invoice.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'cancelled' }
      },
      _sum: { amountTotal: true },
      _count: true
    });
    
    monthlyData.push({
      month: MONTH_NAMES_FR[targetMonth],
      revenue: result._sum.amountTotal || 0,
      count: result._count
    });
  }
  
  return monthlyData;
}

// ============================================================
// Helper: Get Sales by Product Category
// ============================================================

async function getSalesByCategory(sinceDate: Date) {
  // Get all invoices with their lines and products since the date
  const invoices = await db.invoice.findMany({
    where: {
      date: { gte: sinceDate },
      status: { not: 'cancelled' }
    },
    include: {
      lines: {
        include: {
          product: {
            include: {
              category: { select: { name: true } }
            }
          }
        }
      }
    }
  });
  
  // Aggregate by category
  const categoryMap = new Map<string, { value: number; count: number }>();
  
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const categoryName = line.product.category?.name || 'Sans categorie';
      const existing = categoryMap.get(categoryName) || { value: 0, count: 0 };
      existing.value += line.amountTotal || 0;
      existing.count += 1;
      categoryMap.set(categoryName, existing);
    }
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
  
  return result.length > 0 ? result : [{ category: 'Aucune donnee', value: 0, percentage: 100, count: 0 }];
}

// ============================================================
// Helper: Get Expenses by Month (from Bills)
// ============================================================

async function getExpensesByMonth(currentYear: number, currentMonth: number) {
  const expenseData = [];
  
  for (let i = 11; i >= 0; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;
    
    // Handle year rollover
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    const result = await db.bill.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'cancelled' }
      },
      _sum: { amountTotal: true },
      _count: true
    });
    
    expenseData.push({
      month: MONTH_NAMES_FR[targetMonth],
      expenses: result._sum.amountTotal || 0,
      count: result._count
    });
  }
  
  return expenseData;
}
