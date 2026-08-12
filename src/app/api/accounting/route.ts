// ============================================================
// HASSIBA Suite ERP v2.0.0 - Accounting API
// Journal Entries & Double-Entry SCF Accounting
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils'

// ============================================================
// Types
// ============================================================

interface JournalEntryWithItems {
  id: string
  reference: string
  date: string
  label: string
  totalDebit: number
  totalCredit: number
  status: string
  source: string | null
  sourceId: string | null
  journalId: string
  journal: {
    id: string
    code: string
    name: string
    type: string
  }
  items: JournalItemWithAccount[]
}

interface JournalItemWithAccount {
  id: string
  accountId: string
  debit: number
  credit: number
  label: string | null
  account: {
    id: string
    code: string
    name: string
    class: string
    type: string
    isTaxAccount: boolean
    taxType: string | null
  }
}

interface AccountingFilters {
  dateFrom?: string
  dateTo?: string
  type?: string // Vente, Achat, Paiement, etc.
  status?: string
  journalCode?: string
  search?: string
  page?: number
  limit?: number
}

// ============================================================
// GET - List Journal Entries with Filters
// ============================================================

export async function GET(request: NextRequest) {
  // SECURITY: Require authentication for accounting data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: AccountingFilters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      journalCode: searchParams.get('journalCode') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    // Build where clause
    const where: Record<string, any> = {}
    
    if (filters.dateFrom || filters.dateTo) {
      where.date = {}
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo)
    }
    
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status
    }
    
    if (filters.journalCode && filters.journalCode !== 'all') {
      where.journal = { code: filters.journalCode }
    }
    
    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search } },
        { label: { contains: filters.search } },
      ]
    }

    // Filter by journal type for Vente/Achat/Paiement
    if (filters.type && filters.type !== 'all') {
      const typeMap: Record<string, string[]> = {
        'Vente': ['sale'],
        'Achat': ['purchase'],
        'Paiement': ['bank', 'cash'],
        'OD': ['miscellaneous'],
        'Paie': ['payroll']
      }
      
      const journalTypes = typeMap[filters.type]
      if (journalTypes) {
        where.journal = { ...where.journal, type: { in: journalTypes } }
      }
    }

    // Get total count
    const total = await db.journalEntry.count({ where })

    // Get entries with items and accounts
    const entries = await db.journalEntry.findMany({
      where,
      include: {
        journal: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          }
        },
        items: {
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
            }
          },
          orderBy: { accountId: 'asc' }
        }
      },
      orderBy: { date: 'desc' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 20),
      take: filters.limit || 20,
    })

    // Calculate summary statistics
    const stats = await getAccountingStats(where)

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / (filters.limit || 20)),
      },
      stats,
    })

  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des écritures comptables' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST - Create New Journal Entry
// ============================================================

export async function POST(request: NextRequest) {
  // SECURITY: Require Accountant or Admin role for journal entries
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json()
    const { 
      journalId, 
      date, 
      label, 
      items, 
      source,
      sourceId 
    } = body

    // Validate required fields
    if (!journalId || !date || !label || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    // Verify journal exists
    const journal = await db.journal.findUnique({
      where: { id: journalId }
    })
    
    if (!journal) {
      return NextResponse.json(
        { success: false, error: 'Journal non trouvé' },
        { status: 404 }
      )
    }

    // Calculate totals and verify balance
    let totalDebit = 0
    let totalCredit = 0
    
    for (const item of items) {
      totalDebit += parseFloat(item.debit) || 0
      totalCredit += parseFloat(item.credit) || 0
      
      // Verify account exists
      const account = await db.chartOfAccount.findUnique({
        where: { id: item.accountId }
      })
      if (!account) {
        return NextResponse.json(
          { success: false, error: `Compte ${item.accountId} non trouvé` },
          { status: 400 }
        )
      }
    }

    // Check balance (allow small rounding difference)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { 
          success: false, 
          error: `L'écriture n'est pas équilibrée: Débit=${totalDebit.toFixed(2)}, Crédit=${totalCredit.toFixed(2)}` 
        },
        { status: 400 }
      )
    }

    // Generate reference
    const entryCount = await db.journalEntry.count({
      where: { journalId }
    })
    const reference = `${journal.code}-${String(entryCount + 1).padStart(6, '0')}`

    // Create journal entry with items
    const entry = await db.journalEntry.create({
      data: {
        reference,
        date: new Date(date),
        label,
        totalDebit,
        totalCredit,
        status: 'posted',
        source: source || 'manual',
        sourceId,
        journalId,
        items: {
          create: items.map((item: any) => ({
            accountId: item.accountId,
            debit: parseFloat(item.debit) || 0,
            credit: parseFloat(item.credit) || 0,
            label: item.label || null,
          }))
        }
      },
      include: {
        journal: true,
        items: { include: { account: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Écriture comptable créée avec succès',
    })

  } catch (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'écriture comptable' },
      { status: 500 }
    )
  }
}

// ============================================================
// Helper: Get Accounting Statistics
// ============================================================

async function getAccountingStats(whereClause: Record<string, any>) {
  try {
    const entries = await db.journalEntry.findMany({
      where: whereClause,
      select: {
        totalDebit: true,
        totalCredit: true,
        status: true,
        source: true,
        items: {
          select: {
            debit: true,
            credit: true,
            account: {
              select: {
                class: true,
                type: true,
                isTaxAccount: true,
                taxType: true,
              }
            }
          }
        }
      }
    })

    // Calculate totals
    let totalDebit = 0
    let totalCredit = 0
    let tvaCollectee = 0
    let tvaDeductible = 0
    
    const classTotals: Record<string, { debit: number; credit: number }> = {}

    for (const entry of entries) {
      totalDebit += entry.totalDebit
      totalCredit += entry.totalCredit
      
      for (const item of entry.items) {
        const className = item.account.class || '0'
        
        if (!classTotals[className]) {
          classTotals[className] = { debit: 0, credit: 0 }
        }
        
        classTotals[className].debit += item.debit
        classTotals[className].credit += item.credit
        
        // TVA calculations
        if (item.account.isTaxAccount) {
          if (item.account.taxType === 'tva_collectee') {
            tvaCollectee += item.credit
          } else if (item.account.taxType === 'tva_deductible') {
            tvaDeductible += item.debit
          }
        }
      }
    }

    return {
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      difference: Math.abs(totalDebit - totalCredit),
      totalEntries: entries.length,
      postedEntries: entries.filter(e => e.status === 'posted').length,
      draftEntries: entries.filter(e => e.status === 'draft').length,
      tvaCollectee,
      tvaDeductible,
      tvaNet: tvaCollectee - tvaDeductible,
      classTotals,
    }

  } catch (error) {
    console.error('Error calculating stats:', error)
    return {
      totalDebit: 0,
      totalCredit: 0,
      isBalanced: true,
      difference: 0,
      totalEntries: 0,
      postedEntries: 0,
      draftEntries: 0,
      tvaCollectee: 0,
      tvaDeductible: 0,
      tvaNet: 0,
      classTotals: {},
    }
  }
}
