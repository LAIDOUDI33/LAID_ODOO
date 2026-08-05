// ============================================================
// HASSIBA Suite ERP v2.0.0 - Trial Balance API
// Balance Générale - SCF Compliant
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// Types
// ============================================================

interface AccountBalance {
  code: string
  name: string
  class: string
  type: string
  isTaxAccount: boolean
  taxType: string | null
  totalDebit: number
  totalCredit: number
  balance: number // Positive = Debit, Negative = Credit
  balanceType: 'debit' | 'credit'
}

interface ClassSummary {
  class: string
  className: string
  totalDebit: number
  totalCredit: number
  soldeDebiteur: number
  soldeCrediteur: number
  accountCount: number
}

interface TrialBalanceData {
  accounts: AccountBalance[]
  classSummaries: ClassSummary[]
  grandTotal: {
    totalDebit: number
    totalCredit: number
    soldeDebiteur: number
    soldeCrediteur: number
    isBalanced: boolean
    difference: number
  }
  period: {
    dateFrom?: string
    dateTo?: string
  }
}

// ============================================================
// SCF Account Classes (Algerian Chart of Accounts)
// ============================================================

const SCF_CLASSES: Record<string, string> = {
  '1': 'Comptes de Capitaux',
  '2': 'Comptes d\'Immobilisations',
  '3': 'Comptes de Stocks',
  '4': 'Comptes de Tiers',
  '5': 'Comptes Financiers',
  '6': 'Comptes de Charges',
  '7': 'Comptes de Produits',
  '8': 'Comptes de Résultats',
}

// ============================================================
// GET - Generate Trial Balance (Balance Générale)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const classFilter = searchParams.get('class') || undefined

    // Build where clause for journal entries
    const entryWhere: Record<string, any> = {
      status: 'posted', // Only posted entries for trial balance
    }
    
    if (dateFrom || dateTo) {
      entryWhere.date = {}
      if (dateFrom) entryWhere.date.gte = new Date(dateFrom)
      if (dateTo) entryWhere.date.lte = new Date(dateTo)
    }

    // Get all journal items with their accounts and entries
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
            isTaxAccount: true,
            taxType: true,
          }
        },
        entry: {
          select: {
            status: true,
          }
        }
      }
    })

    // Aggregate balances by account
    const accountMap = new Map<string, AccountBalance>()

    for (const item of journalItems) {
      const accountCode = item.account.code
      
      if (!accountMap.has(accountCode)) {
        accountMap.set(accountCode, {
          code: accountCode,
          name: item.account.name,
          class: item.account.class,
          type: item.account.type,
          isTaxAccount: item.account.isTaxAccount,
          taxType: item.account.taxType,
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
          balanceType: 'debit',
        })
      }

      const account = accountMap.get(accountCode)!
      account.totalDebit += item.debit
      account.totalCredit += item.credit
    }

    // Calculate final balances
    const accounts: AccountBalance[] = []
    
    for (const [, account] of accountMap) {
      // Apply class filter if specified
      if (classFilter && account.class !== classFilter) continue
      
      // Calculate balance based on account type
      let balance: number
      let balanceType: 'debit' | 'credit'
      
      // For asset/expense accounts: normal balance is debit
      // For liability/equity/revenue accounts: normal balance is credit
      if (['asset', 'expense'].includes(account.type)) {
        balance = account.totalDebit - account.totalCredit
        balanceType = balance >= 0 ? 'debit' : 'credit'
      } else {
        balance = account.totalCredit - account.totalDebit
        balanceType = balance >= 0 ? 'credit' : 'debit'
      }
      
      account.balance = Math.abs(balance)
      account.balanceType = balanceType
      
      // Only include accounts with movement
      if (account.totalDebit > 0 || account.totalCredit > 0) {
        accounts.push(account)
      }
    }

    // Sort by account code
    accounts.sort((a, b) => a.code.localeCompare(b.code))

    // Calculate class summaries
    const classMap = new Map<string, ClassSummary>()

    for (const account of accounts) {
      const className = account.class
      
      if (!classMap.has(className)) {
        classMap.set(className, {
          class: className,
          className: SCF_CLASSES[className] || `Classe ${className}`,
          totalDebit: 0,
          totalCredit: 0,
          soldeDebiteur: 0,
          soldeCrediteur: 0,
          accountCount: 0,
        })
      }

      const summary = classMap.get(className)!
      summary.totalDebit += account.totalDebit
      summary.totalCredit += account.totalCredit
      summary.accountCount += 1
      
      if (account.balanceType === 'debit') {
        summary.soldeDebiteur += account.balance
      } else {
        summary.soldeCrediteur += account.balance
      }
    }

    const classSummaries = Array.from(classMap.values()).sort(
      (a, b) => parseInt(a.class) - parseInt(b.class)
    )

    // Calculate grand totals
    let grandTotalDebit = 0
    let grandTotalCredit = 0
    let grandSoldeDebiteur = 0
    let grandSoldeCrediteur = 0

    for (const summary of classSummaries) {
      grandTotalDebit += summary.totalDebit
      grandTotalCredit += summary.totalCredit
      grandSoldeDebiteur += summary.soldeDebiteur
      grandSoldeCrediteur += summary.soldeCrediteur
    }

    const difference = Math.abs(grandSoldeDebiteur - grandSoldeCrediteur)

    const trialBalance: TrialBalanceData = {
      accounts,
      classSummaries,
      grandTotal: {
        totalDebit: grandTotalDebit,
        totalCredit: grandTotalCredit,
        soldeDebiteur: grandSoldeDebiteur,
        soldeCrediteur: grandSoldeCrediteur,
        isBalanced: difference < 0.01,
        difference,
      },
      period: { dateFrom, dateTo },
    }

    return NextResponse.json({
      success: true,
      data: trialBalance,
    })

  } catch (error) {
    console.error('Error generating trial balance:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de la balance générale' },
      { status: 500 }
    )
  }
}
