// ============================================================
// HASSIBA Suite ERP v2.0.0 - Balance Sheet API (C-04)
// Bilan - SCF Compliant Financial Position Statement
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'

// ============================================================
// Types
// ============================================================

interface BalanceSheetAccount {
  accountCode: string
  accountName: string
  amount: number
}

interface AssetSection {
  currentAssets: BalanceSheetAccount[]
  fixedAssets: BalanceSheetAccount[]
  totalCurrentAssets: number
  totalFixedAssets: number
  totalAssets: number
}

interface LiabilitySection {
  currentLiabilities: BalanceSheetAccount[]
  longTermLiabilities: BalanceSheetAccount[]
  totalCurrentLiabilities: number
  totalLongTermLiabilities: number
  totalLiabilities: number
}

interface BalanceSheetData {
  date: string
  companyId: string | null
  assets: AssetSection
  liabilities: LiabilitySection
  equity: BalanceSheetAccount[]
  totalEquity: number
  liabilitiesAndEquity: number
  isBalanced: boolean
  difference: number
}

// ============================================================
// SCF Account Classification for Balance Sheet
// Algerian Chart of Accounts Structure
// ============================================================

// Asset Account Classes (Actif)
const ASSET_CLASSES = ['2', '3', '4', '5']

// Fixed Asset Codes (Actif Immobilisé) - Class 2 primarily
const FIXED_ASSET_PREFIXES = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29']

// Current Asset Patterns (Actif Circulant)
const CURRENT_ASSET_PATTERNS = {
  // Stocks - Class 3
  stocks: ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'],
  // Receivables (Créances) - Class 4 (debit balances)
  receivables: ['40', '41', '42', '43', '44', '45', '46', '47', '48', '49'],
  // Financial Assets - Class 5 (debit balances)
  financialAssets: ['50', '51', '52', '53', '54', '55', '56', '58', '59'],
}

// Equity Account Patterns (Capitaux Propres) - Class 1
const EQUITY_PREFIXES = ['10', '11', '12', '13', '14', '15', '16', '18']

// Liability Account Patterns (Dettes)
const LIABILITY_PATTERNS = {
  // Long-term liabilities (Dettes à long terme)
  longTerm: ['16', '17'],
  // Current liabilities (Dettes à court terme) - Class 4 & 5 credit balances
  current: ['40', '42', '43', '44', '45', '46', '47', '48', '49', '50', '52', '53', '54', '55', '56', '58', '59'],
}

// ============================================================
// Helper: Categorize account for balance sheet
// ============================================================

function categorizeBalanceSheetAccount(
  code: string,
  type: string,
  balance: number
): { category: 'fixedAsset' | 'currentAsset' | 'equity' | 'longTermLiability' | 'currentLiability' | null; amount: number } {
  
  const firstChar = code.charAt(0)
  
  // Determine if this is a debit-balance or credit-balance account
  const isDebitType = ['asset', 'expense'].includes(type)
  
  // For asset accounts (positive when debit > credit)
  if (isDebitType && ASSET_CLASSES.includes(firstChar)) {
    // Fixed assets (Class 2 - Immobilisations)
    if (firstChar === '2') {
      return { category: 'fixedAsset', amount: Math.abs(balance) }
    }
    // Current assets (Classes 3, 4, 5 with debit balance)
    if (['3', '4', '5'].includes(firstChar)) {
      return { category: 'currentAsset', amount: Math.abs(balance) }
    }
  }
  
  // For liability/equity/revenue accounts (positive when credit > debit)
  if (!isDebitType && firstChar === '1') {
    // Check for equity vs long-term liabilities
    if (EQUITY_PREFIXES.some(prefix => code.startsWith(prefix))) {
      return { category: 'equity', amount: Math.abs(balance) }
    }
    if (LIABILITY_PATTERNS.longTerm.some(prefix => code.startsWith(prefix))) {
      return { category: 'longTermLiability', amount: Math.abs(balance) }
    }
    // Default remaining class 1 to equity
    return { category: 'equity', amount: Math.abs(balance) }
  }
  
  // Handle liability accounts in classes 4 and 5 (credit balances)
  if (!isDebitType && ['4', '5'].includes(firstChar)) {
    // Current liabilities
    return { category: 'currentLiability', amount: Math.abs(balance) }
  }
  
  return { category: null, amount: 0 }
}

// ============================================================
// GET - Generate Balance Sheet (Bilan)
// ============================================================

export async function GET(request: NextRequest) {
  // SECURITY: Require financial role for sensitive balance sheet data
  const authError = await requireRole(request, ['admin', 'manager', 'accountant'])
  if (authError) return authError
  
  try {
    const { searchParams } = new URL(request.url)
    
    const dateParam = searchParams.get('date')
    const companyId = searchParams.get('companyId')
    
    // Use provided date or default to now
    const reportDate = dateParam ? new Date(dateParam) : new Date()
    
    // Build where clause for journal entries (up to the specified date)
    const entryWhere: Record<string, any> = {
      status: 'posted',
    }
    
    // Only include entries up to the report date
    entryWhere.date = {
      lte: reportDate,
    }
    
    // Get all journal items with their accounts
    const journalItems = await db.journalItem.findMany({
      where: {
        entry: entryWhere,
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
    
    // Initialize balance sheet sections
    const fixedAssets: BalanceSheetAccount[] = []
    const currentAssets: BalanceSheetAccount[] = []
    const equityAccounts: BalanceSheetAccount[] = []
    const longTermLiabilities: BalanceSheetAccount[] = []
    const currentLiabilities: BalanceSheetAccount[] = []
    
    // Categorize each account
    for (const [, account] of accountMap) {
      // Calculate raw balance
      let rawBalance: number
      if (['asset', 'expense'].includes(account.type)) {
        rawBalance = account.totalDebit - account.totalCredit
      } else {
        rawBalance = account.totalCredit - account.totalDebit
      }
      
      // Skip accounts with zero balance
      if (Math.abs(rawBalance) < 0.01) continue
      
      // Only include balance sheet accounts (classes 1-5)
      if (!['1', '2', '3', '4', '5'].includes(account.class)) continue
      
      const categorized = categorizeBalanceSheetAccount(
        account.code,
        account.type,
        rawBalance
      )
      
      const accountEntry: BalanceSheetAccount = {
        accountCode: account.code,
        accountName: account.name,
        amount: categorized.amount,
      }
      
      switch (categorized.category) {
        case 'fixedAsset':
          if (accountEntry.amount > 0) fixedAssets.push(accountEntry)
          break
        case 'currentAsset':
          if (accountEntry.amount > 0) currentAssets.push(accountEntry)
          break
        case 'equity':
          equityAccounts.push(accountEntry)
          break
        case 'longTermLiability':
          if (accountEntry.amount > 0) longTermLiabilities.push(accountEntry)
          break
        case 'currentLiability':
          if (accountEntry.amount > 0) currentLiabilities.push(accountEntry)
          break
      }
    }
    
    // Sort each section by account code
    const sortByCode = (a: BalanceSheetAccount, b: BalanceSheetAccount) => 
      a.accountCode.localeCompare(b.accountCode)
    
    fixedAssets.sort(sortByCode)
    currentAssets.sort(sortByCode)
    equityAccounts.sort(sortByCode)
    longTermLiabilities.sort(sortByCode)
    currentLiabilities.sort(sortByCode)
    
    // Calculate totals
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0)
    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0)
    const totalAssets = totalFixedAssets + totalCurrentAssets
    
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.amount, 0)
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + a.amount, 0)
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.amount, 0)
    const totalLiabilities = totalLongTermLiabilities + totalCurrentLiabilities
    
    const liabilitiesAndEquity = totalEquity + totalLiabilities
    
    // Verification: Assets should equal Liabilities + Equity
    const difference = Math.abs(totalAssets - liabilitiesAndEquity)
    const isBalanced = difference < 0.01
    
    const balanceSheet: BalanceSheetData = {
      date: reportDate.toISOString(),
      companyId,
      assets: {
        fixedAssets,
        currentAssets,
        totalFixedAssets,
        totalCurrentAssets,
        totalAssets,
      },
      liabilities: {
        longTermLiabilities,
        currentLiabilities,
        totalLongTermLiabilities,
        totalCurrentLiabilities,
        totalLiabilities,
      },
      equity: equityAccounts,
      totalEquity,
      liabilitiesAndEquity,
      isBalanced,
      difference,
    }
    
    return NextResponse.json({
      success: true,
      data: balanceSheet,
    })
    
  } catch (error) {
    console.error('Error generating balance sheet:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du bilan' },
      { status: 500 }
    )
  }
}
