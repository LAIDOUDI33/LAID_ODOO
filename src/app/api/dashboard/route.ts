import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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
      paidInvoices,
      unpaidInvoices,
      employeeCount,
      productCount,
      partnerCount,
      recentInvoices,
      lowStockProducts
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
      })
    ]);

    // Tax Deadlines (Algerian Fiscal Calendar)
    const taxDeadlines = [
      {
        type: 'G50 - TVA',
        description: 'Déclaration TVA',
        deadline: 20,
        daysUntil: 20 - dayOfMonth <= 0 ? 30 - (dayOfMonth - 20) : 20 - dayOfMonth,
        isUrgent: (20 - dayOfMonth) <= 5 && (20 - dayOfMonth) > 0,
        isOverdue: dayOfMonth > 20
      },
      {
        type: 'G2 - TAP',
        description: 'Taxe Activité Professionnelle',
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
          caYear: null, // Would need aggregation
          invoiceCountToday: invoicesToday._count,
          invoiceCountMonth: invoicesMonth._count,
          paidInvoiceCount: paidInvoices._count,
          unpaidInvoiceCount: unpaidInvoices._count,
          unpaidAmount: unpaidInvoices._sum.amountDue || 0,
          employeeCount,
          productCount,
          partnerCount
        },
        charts: {
          monthlyRevenue: [], // Would need historical data
          salesByCategory: [],
          expensesByMonth: []
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
