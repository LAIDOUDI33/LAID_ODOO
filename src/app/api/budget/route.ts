// ============================================================
// HASSIBA Suite ERP v2.0.0 - Budgeting & Treasury API
// Gestion Budgétaire & Trésorerie
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BudgetStatus, BudgetType, CashFlowType, CashFlowCategory } from "@prisma/client";
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/budget - Récupérer budgets et cashflow
export async function GET(request: Request) {
  // SECURITY: Require authentication for financial data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // budget, cashflow, stats
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
    const status = searchParams.get("status") as BudgetStatus | null;
    const companyId = searchParams.get("companyId");

    // Stats endpoint
    if (type === "stats") {
      const [budgetCount, totalBudgeted, totalActual, activeBudgets, cashFlowStats] = await Promise.all([
        db.budget.count({ where: { year, companyId: companyId || undefined } }),
        db.budget.aggregate({
          _sum: { totalBudgeted: true, totalActual: true },
          where: { year, companyId: companyId || undefined },
        }),
        db.budgetLine.aggregate({
          _sum: { totalBudgeted: true, totalActual: true },
          where: {
            budget: { year, companyId: companyId || undefined },
          },
        }),
        db.budget.count({
          where: { 
            year, 
            status: BudgetStatus.active,
            companyId: companyId || undefined,
          },
        }),
        // Cash flow stats for current year
        db.cashFlowEntry.aggregate({
          _sum: { amount: true },
          where: {
            date: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`),
            },
            companyId: companyId || undefined,
          },
        }),
      ]);

      // Monthly cash flow trend
      const monthlyCashFlow = await db.cashFlowEntry.groupBy({
        by: ["type", "date"],
        where: {
          date: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
          companyId: companyId || undefined,
        },
        _sum: { amount: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalBudgets: budgetCount,
            totalBudgeted: totalBudgeted._sum.totalBudgeted || 0,
            totalActual: totalActual._sum.totalActual || 0,
            activeBudgets,
            variance: (totalActual._sum.totalActual || 0) - (totalBudgeted._sum.totalBudgeted || 0),
          },
          cashFlow: {
            totalMovement: Math.abs(cashFlowStats._sum.amount || 0),
            monthlyTrend: monthlyCashFlow,
          },
        },
      });
    }

    // Get budgets
    if (!type || type === "budgets") {
      const where: any = { year };
      if (status) where.status = status;
      if (companyId) where.companyId = companyId;

      const budgets = await db.budget.findMany({
        where,
        include: {
          lines: {
            orderBy: { accountCode: "asc" },
            take: 50,
          },
          _count: { select: { lines: true } },
        },
        orderBy: [{ status: "desc" }, { createdAt: "desc" }],
        take: 50,
      });

      return NextResponse.json({
        success: true,
        data: budgets,
        total: budgets.length,
      });
    }

    // Get cash flow entries
    if (type === "cashflow") {
      const month = searchParams.get("month");
      const category = searchParams.get("category") as CashFlowCategory | null;
      const cashFlowType = searchParams.get("cashFlowType") as CashFlowType | null;

      const where: any = {};
      
      // Date filtering
      if (month) {
        const [y, m] = month.split("-").map(Number);
        where.date = {
          gte: new Date(y, m - 1, 1),
          lte: new Date(y, m, 0),
        };
      } else {
        where.date = {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        };
      }
      
      if (category) where.category = category;
      if (cashFlowType) where.type = cashFlowType;
      if (companyId) where.companyId = companyId;

      const cashFlows = await db.cashFlowEntry.findMany({
        where,
        include: {
          bankAccount: { select: { id: true, name: true, bankName: true } },
        },
        orderBy: { date: "desc" },
        take: 100,
      });

      return NextResponse.json({
        success: true,
        data: cashFlows,
        total: cashFlows.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Specify type=budgets or type=cashflow or type=stats" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Budget GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch budget data" },
      { status: 500 }
    );
  }
}

// POST /api/budget - Créer budget ou entrée de trésorerie
export async function POST(request: Request) {
  // SECURITY: Require appropriate role for budget modifications
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Create new budget
    if (action === "create_budget" || (!action && data.name)) {
      const code = `BUD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      
      const budget = await db.budget.create({
        data: {
          code,
          name: data.name,
          description: data.description || null,
          type: data.type || BudgetType.operational,
          status: BudgetStatus.draft,
          year: data.year || new Date().getFullYear(),
          startMonth: data.startMonth || 1,
          endMonth: data.endMonth || 12,
          currency: data.currency || "DZD",
          departmentId: data.departmentId || null,
          departmentName: data.departmentName || null,
          managerId: data.managerId || null,
          managerName: data.managerName || null,
          notes: data.notes || null,
          companyId: data.companyId,
        },
      });

      return NextResponse.json({ success: true, data: budget }, 201);
    }

    // Create budget line
    if (action === "add_line" && data.budgetId) {
      const line = await db.budgetLine.create({
        data: {
          budgetId: data.budgetId,
          accountCode: data.accountCode || null,
          accountName: data.accountName || null,
          category: data.category || null,
          m1Budgeted: data.m1Budgeted || 0,
          m1Actual: data.m1Actual || 0,
          m2Budgeted: data.m2Budgeted || 0,
          m2Actual: data.m2Actual || 0,
          m3Budgeted: data.m3Budgeted || 0,
          m3Actual: data.m3Actual || 0,
          m4Budgeted: data.m4Budgeted || 0,
          m4Actual: data.m4Actual || 0,
          m5Budgeted: data.m5Budgeted || 0,
          m5Actual: data.m5Actual || 0,
          m6Budgeted: data.m6Budgeted || 0,
          m6Actual: data.m6Actual || 0,
          m7Budgeted: data.m7Budgeted || 0,
          m7Actual: data.m7Actual || 0,
          m8Budgeted: data.m8Budgeted || 0,
          m8Actual: data.m8Actual || 0,
          m9Budgeted: data.m9Budgeted || 0,
          m9Actual: data.m9Actual || 0,
          m10Budgeted: data.m10Budgeted || 0,
          m10Actual: data.m10Actual || 0,
          m11Budgeted: data.m11Budgeted || 0,
          m11Actual: data.m11Actual || 0,
          m12Budgeted: data.m12Budgeted || 0,
          m12Actual: data.m12Actual || 0,
        },
      });

      // Update budget totals
      await updateBudgetTotals(data.budgetId);

      return NextResponse.json({ success: true, data: line }, 201);
    }

    // Create cash flow entry
    if (action === "create_cashflow" || action === "add_cashflow") {
      const reference = `TRS-${new Date().toISOString().slice(0,7).replace("-","")}-${Math.floor(Math.random() * 1000).toString().padStart(3,"0")}`;
      
      const entry = await db.cashFlowEntry.create({
        data: {
          reference,
          date: data.date ? new Date(data.date) : new Date(),
          type: data.type || CashFlowType.inflow,
          category: data.category || CashFlowCategory.operating,
          label: data.label,
          description: data.description || null,
          amount: data.amount || 0,
          currency: data.currency || "DZD",
          bankAccountId: data.bankAccountId || null,
          counterpartName: data.counterpartName || null,
          documentRef: data.documentRef || null,
          documentType: data.documentType || null,
          isForecast: data.isForecast || false,
          forecastDate: data.forecastDate ? new Date(data.forecastDate) : null,
          companyId: data.companyId,
        },
        include: {
          bankAccount: { select: { id: true, name: true, bankName: true } },
        },
      });

      return NextResponse.json({ success: true, data: entry }, 201);
    }

    // Update budget status
    if (action === "update_status" && data.id && data.status) {
      const updateData: any = { status: data.status };
      if (data.status === BudgetStatus.approved) {
        updateData.approvedAt = new Date();
        updateData.approvedBy = data.approvedBy || null;
      }
      if (data.rejectionReason) {
        updateData.rejectionReason = data.rejectionReason;
      }

      const budget = await db.budget.update({
        where: { id: data.id },
        data: updateData,
      });

      return NextResponse.json({ success: true, data: budget });
    }

    return NextResponse.json(
      { success: false, error: "Invalid or missing action parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Budget POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process budget request" },
      { status: 500 }
    );
  }
}

// Helper function to update budget totals
async function updateBudgetTotals(budgetId: string) {
  const lines = await db.budgetLine.findMany({ where: { budgetId } });
  
  const totals = lines.reduce(
    (acc, line) => ({
      totalBudgeted: acc.totalBudgeted + line.totalBudgeted,
      totalActual: acc.totalActual + line.totalActual,
    }),
    { totalBudgeted: 0, totalActual: 0 }
  );

  await db.budget.update({
    where: { id: budgetId },
    data: {
      totalBudgeted: totals.totalBudgeted,
      totalActual: totals.totalActual,
      variance: totals.totalActual - totals.totalBudgeted,
      variancePercent: totals.totalBudgeted > 0 ? ((totals.totalActual - totals.totalBudgeted) / totals.totalBudgeted) * 100 : 0,
    },
  });
}
