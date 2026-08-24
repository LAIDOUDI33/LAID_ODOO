// ============================================================
// HASSIBA Suite ERP v2.0.0 - Income Statement API (C-05)
// Compte de Résultat - SCF Compliant Profit & Loss Statement
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'

// ============================================================
// COGS (Cost of Goods Sold) Configuration
// M-01 FIX: Made configurable via environment variable
// Default: 0.6 (60% of operating expenses are typically COGS)
// This is an approximation for SCF-compliant income statements
// For accurate COGS, integrate with inventory movement data
// ============================================================
const COGS_RATIO = parseFloat(process.env.COGS_RATIO || '0.6')

// ============================================================
// Types
// ============================================================

interface IncomeStatementAccount {
  accountCode: string
  accountName: string
  amount: number
}

interface RevenueSection {
  totalRevenue: number
  details: IncomeStatementAccount[]
  // Sub-categories for detailed breakdown
  operatingRevenue?: IncomeStatementAccount[]
  financialRevenue?: IncomeStatementAccount[]
  extraordinaryRevenue?: IncomeStatementAccount[]
}

interface ExpenseSection {
  totalExpenses: number
  details: IncomeStatementAccount[]
  // Sub-categories for detailed breakdown
  operatingExpenses?: IncomeStatementAccount[]
  financialExpenses?: IncomeStatementAccount[]
  extraordinaryExpenses?: IncomeStatementAccount[]
}

interface IncomeStatementData {
  startDate: string
  endDate: string
  companyId: string | null
  revenue: RevenueSection
  expenses: ExpenseSection
  grossOperatingIncome: number // Résultat d'Exploitation Brut
  operatingResult: number // Résultat d'Exploitation
  financialResult: number // Résultat Financier
  ordinaryResult: number // Résultat Ordinaire
  otherIncome: number // Autres Produits
  otherExpenses: number // Autres Charges
  netResult: number // Résultat Net (Positive = Profit, Negative = Loss)
  netResultLabel: string // 'Profit' or 'Perte'
}

// ============================================================
// SCF Account Classification for Income Statement
// Algerian Chart of Accounts Structure
// ============================================================

// Revenue Account Class (Produits) - Class 7
const REVENUE_CLASS = '7'

// Expense Account Class (Charges) - Class 6
const EXPENSE_CLASS = '6'

// Operating Revenue Prefixes (Produits d'exploitation)
const OPERATING_REVENUE_PREFIXES = ['70', '71', '72', '73', '74', '75']

// Financial Revenue Prefixes (Produits financiers)
const FINANCIAL_REVENUE_PREFIXES = ['76', '77']

// Extraordinary Revenue Prefixes (Produits exceptionnels)
const EXTRAORDINARY_REVENUE_PREFIXES = ['79']

// Operating Expense Prefixes (Charges d'exploitation)
const OPERATING_EXPENSE_PREFIXES = ['60', '61', '62', '63', '64', '65']

// Financial Expense Prefixes (Charges financières)
const FINANCIAL_EXPENSE_PREFIXES = ['66', '67', '68']

// Extraordinary Expense Prefixes (Charges exceptionnelles)
const EXTRAORDINARY_EXPENSE_PREFIXES = ['69']

// ============================================================
// Helper: Categorize revenue account
// ============================================================

function categorizeRevenueAccount(code: string): 'operating' | 'financial' | 'extraordinary' {
  if (FINANCIAL_REVENUE_PREFIXES.some(prefix => code.startsWith(prefix))) {
    return 'financial'
  }
  if (EXTRAORDINARY_REVENUE_PREFIXES.some(prefix => code.startsWith(prefix))) {
    return 'extraordinary'
  }
  return 'operating'
}

// ============================================================
// Helper: Categorize expense account
// ============================================================

function categorizeExpenseAccount(code: string): 'operating' | 'financial' | 'extraordinary' {
  if (FINANCIAL_EXPENSE_PREFIXES.some(prefix => code.startsWith(prefix))) {
    return 'financial'
  }
  if (EXTRAORDINARY_EXPENSE_PREFIXES.some(prefix => code.startsWith(prefix))) {
    return 'extraordinary'
  }
  return 'operating'
}

// ============================================================
// GET - Generate Income Statement (Compte de Résultat)
// ============================================================

export async function GET(request: NextRequest) {
  // SECURITY: Require financial role for sensitive income statement data
  const authError = await requireRole(request, ['admin', 'manager', 'accountant'])
  if (authError) return authError
  
  try {
    const { searchParams } = new URL(request.url)
    
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const companyId = searchParams.get('companyId')
    
    // Determine date range
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1) // First of current month
    
    // Build where clause for journal entries within the period
    const entryWhere: Record<string, any> = {
      status: 'posted',
      date: {
        gte: startDate,
        lte: endDate,
      },
    }
    
    // Get all journal items with their accounts for income statement accounts (classes 6 & 7)
    const journalItems = await db.journalItem.findMany({
      where: {
        entry: entryWhere,
        account: {
          class: {
            in: [EXPENSE_CLASS, REVENUE_CLASS],
          },
        },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            class: true,
            type: true,
          }
        },
      },
    })
    
    // Aggregate balances by account
    interface AccountAggregation {
      code: string
      name: string
      type: string
      class: string
      totalDebit: number
      totalCredit: number
    }
    
    const accountMap = new Map<string, AccountAggregation>()
    
    for (const item of journalItems) {
      const accountCode = item.account.code
      
      if (!accountMap.has(accountCode)) {
        accountMap.set(accountCode, {
          code: accountCode,
          name: item.account.name,
          type: item.account.type,
          class: item.account.class,
          totalDebit: 0,
          totalCredit: 0,
        })
      }
      
      const account = accountMap.get(accountCode)!
      account.totalDebit += item.debit
      account.totalCredit += item.credit
    }
    
    // Initialize income statement sections
    const revenueDetails: IncomeStatementAccount[] = []
    const expenseDetails: IncomeStatementAccount[] = []
    
    const operatingRevenue: IncomeStatementAccount[] = []
    const financialRevenue: IncomeStatementAccount[] = []
    const extraordinaryRevenue: IncomeStatementAccount[] = []
    
    const operatingExpenses: IncomeStatementAccount[] = []
    const financialExpenses: IncomeStatementAccount[] = []
    const extraordinaryExpenses: IncomeStatementAccount[] = []
    
    // Process each account
    for (const [, account] of accountMap) {
      // Calculate amount based on account type
      let amount: number
      
      if (account.class === REVENUE_CLASS) {
        // Revenue accounts: credit increases revenue
        amount = account.totalCredit - account.totalDebit
        
        const accountEntry: IncomeStatementAccount = {
          accountCode: account.code,
          accountName: account.name,
          amount: Math.abs(amount),
        }
        
        // Only add if there's activity
        if (Math.abs(amount) >= 0.01) {
          revenueDetails.push(accountEntry)
          
          // Categorize into sub-sections
          const category = categorizeRevenueAccount(account.code)
          switch (category) {
            case 'operating':
              operatingRevenue.push(accountEntry)
              break
            case 'financial':
              financialRevenue.push(accountEntry)
              break
            case 'extraordinary':
              extraordinaryRevenue.push(accountEntry)
              break
          }
        }
      } else if (account.class === EXPENSE_CLASS) {
        // Expense accounts: debit increases expenses
        amount = account.totalDebit - account.totalCredit
        
        const accountEntry: IncomeStatementAccount = {
          accountCode: account.code,
          accountName: account.name,
          amount: Math.abs(amount),
        }
        
        // Only add if there's activity
        if (Math.abs(amount) >= 0.01) {
          expenseDetails.push(accountEntry)
          
          // Categorize into sub-sections
          const category = categorizeExpenseAccount(account.code)
          switch (category) {
            case 'operating':
              operatingExpenses.push(accountEntry)
              break
            case 'financial':
              financialExpenses.push(accountEntry)
              break
            case 'extraordinary':
              extraordinaryExpenses.push(accountEntry)
              break
          }
        }
      }
    }
    
    // Sort each section by account code
    const sortByCode = (a: IncomeStatementAccount, b: IncomeStatementAccount) => 
      a.accountCode.localeCompare(b.accountCode)
    
    revenueDetails.sort(sortByCode)
    expenseDetails.sort(sortByCode)
    operatingRevenue.sort(sortByCode)
    financialRevenue.sort(sortByCode)
    extraordinaryRevenue.sort(sortByCode)
    operatingExpenses.sort(sortByCode)
    financialExpenses.sort(sortByCode)
    extraordinaryExpenses.sort(sortByCode)
    
    // Calculate totals
    const totalRevenue = revenueDetails.reduce((sum, a) => sum + a.amount, 0)
    const totalExpenses = expenseDetails.reduce((sum, a) => sum + a.amount, 0)
    
    const totalOperatingRevenue = operatingRevenue.reduce((sum, a) => sum + a.amount, 0)
    const totalFinancialRevenue = financialRevenue.reduce((sum, a) => sum + a.amount, 0)
    const totalExtraordinaryRevenue = extraordinaryRevenue.reduce((sum, a) => sum + a.amount, 0)
    
    const totalOperatingExpenses = operatingExpenses.reduce((sum, a) => sum + a.amount, 0)
    const totalFinancialExpenses = financialExpenses.reduce((sum, a) => sum + a.amount, 0)
    const totalExtraordinaryExpenses = extraordinaryExpenses.reduce((sum, a) => sum + a.amount, 0)
    
    // Calculate results per SCF format
    // Gross Operating Income (Marge Commerciale + Production - Achats consommés)
    // M-01 FIX: COGS ratio is now configurable via COGS_RATIO env var (default 0.6)
    // This approximates the portion of operating expenses that represent cost of goods sold
    // For precise COGS calculation, integrate with inventory valuation and stock movements
    const grossOperatingIncome = totalOperatingRevenue - (
      totalOperatingExpenses * COGS_RATIO
    )
    
    // Operating Result (Résultat d'Exploitation)
    const operatingResult = totalOperatingRevenue - totalOperatingExpenses
    
    // Financial Result (Résultat Financier)
    const financialResult = totalFinancialRevenue - totalFinancialExpenses
    
    // Ordinary Result (Résultat Ordinaire avant impôt)
    const ordinaryResult = operatingResult + financialResult
    
    // Other Income/Expenses (for compatibility with expected output format)
    const otherIncome = totalFinancialRevenue + totalExtraordinaryRevenue
    const otherExpenses = totalFinancialExpenses + totalExtraordinaryExpenses
    
    // Net Result (Résultat Net)
    const netResult = totalRevenue - totalExpenses
    
    const incomeStatement: IncomeStatementData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      companyId,
      revenue: {
        totalRevenue,
        details: revenueDetails,
        operatingRevenue,
        financialRevenue,
        extraordinaryRevenue,
      },
      expenses: {
        totalExpenses,
        details: expenseDetails,
        operatingExpenses,
        financialExpenses,
        extraordinaryExpenses,
      },
      grossOperatingIncome,
      operatingResult,
      financialResult,
      ordinaryResult,
      otherIncome,
      otherExpenses,
      netResult,
      netResultLabel: netResult >= 0 ? 'Profit' : 'Perte',
    }
    
    return NextResponse.json({
      success: true,
      data: incomeStatement,
    })
    
  } catch (error) {
    console.error('Error generating income statement:', error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du compte de résultat" },
      { status: 500 }
    )
  }
}
