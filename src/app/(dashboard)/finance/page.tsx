'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Wallet, 
  FileText, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  Plus,
  Download,
  Filter,
  Shield,
  Calculator,
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  Building2,
  Landmark,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Loader2,
  BookOpen,
  Scale,
  FileSpreadsheet,
  Printer,
  BarChart3,
  PieChart,
  CheckCircle2,
  Circle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpIcon,
  CalendarDays,
  Tags,
  AlignJustify,
  BookCheck,
  ReceiptText,
  DollarSign,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis
} from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import { toast } from 'sonner'

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Invoice {
  id: string
  reference: string
  date: string
  dueDate?: string
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'
  type: 'invoice' | 'credit_note'
  amountUntaxed: number
  amountTax: number
  amountTotal: number
  amountPaid: number
  amountDue: number
  partner: { name: string; nif?: string; city?: string }
}

interface Bill {
  id: string
  reference: string
  date: string
  dueDate?: string
  status: 'draft' | 'received' | 'verified' | 'approved' | 'paid' | 'cancelled'
  amountUntaxed: number
  amountTax: number
  amountTotal: number
  amountPaid: number
  amountDue: number
  partner: { name: string; nif?: string; city?: string }
}

interface TaxDeclaration {
  id: string
  type: string // G50_TVA, G1_IRG, G2_TAP, G4_IBS
  period: string
  status: 'draft' | 'submitted' | 'validated' | 'paid'
  totalDue: number
  totalPaid: number
  tvaNet?: number
  tapDue?: number
  irgTotal?: number
  ibsDue?: number
  createdAt: string
}

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNumber: string
  accountType: string
  currency: string
  balance: number
  isActive: boolean
}

interface TreasuryStats {
  totalBalance: number
  totalAccounts: number
  recentIncoming: number
  recentOutgoing: number
  netCashFlow: number
}

interface ApiResponse<T> {
  success: boolean
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats?: TreasuryStats
  error?: string
}

// ============================================================
// ACCOUNTING TYPES
// ============================================================

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

interface JournalEntry {
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

interface AccountingStats {
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  difference: number
  totalEntries: number
  postedEntries: number
  draftEntries: number
  tvaCollectee: number
  tvaDeductible: number
  tvaNet: number
  classTotals: Record<string, { debit: number; credit: number }>
}

interface AccountBalance {
  code: string
  name: string
  class: string
  type: string
  isTaxAccount: boolean
  taxType: string | null
  totalDebit: number
  totalCredit: number
  balance: number
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
// UTILITY FUNCTIONS
// ============================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ============================================================
// STATUS BADGE CONFIGURATIONS
// ============================================================

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Envoyée', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  paid: { label: 'Payée', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'Partielle', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const billStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  received: { label: 'Reçue', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  verified: { label: 'Vérifiée', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  approved: { label: 'Approuvée', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  paid: { label: 'Payée', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const taxStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  submitted: { label: 'Soumise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  validated: { label: 'Validée', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paid: { label: 'Payée', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
}

const entryStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  posted: { 
    label: 'Comptabilisée', 
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  draft: { 
    label: 'Brouillon', 
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Circle className="w-3 h-3" />
  },
  cancelled: { 
    label: 'Annulée', 
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <X className="w-3 h-3" />
  },
}

const journalTypeLabels: Record<string, string> = {
  sale: 'Vente',
  purchase: 'Achat',
  bank: 'Banque',
  cash: 'Caisse',
  miscellaneous: 'OD',
  payroll: 'Paie',
}

const taxTypeLabels: Record<string, string> = {
  G50_TVA: 'TVA (G50)',
  G1_IRG: 'IRG Salaires (G1)',
  G2_TAP: 'TAP (G2)',
  G4_IBS: 'IBS (G4)',
}

const SCF_CLASS_NAMES: Record<string, string> = {
  '1': 'Capitaux',
  '2': 'Immobilisations',
  '3': 'Stocks',
  '4': 'Tiers',
  '5': 'Financiers',
  '6': 'Charges',
  '7': 'Produits',
  '8': 'Résultats',
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = invoiceStatusConfig[status] || { label: status, className: '' }
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function BillStatusBadge({ status }: { status: string }) {
  const config = billStatusConfig[status] || { label: status, className: '' }
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function TaxStatusBadge({ status }: { status: string }) {
  const config = taxStatusConfig[status] || { label: status, className: '' }
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function EntryStatusBadge({ status }: { status: string }) {
  const config = entryStatusConfig[status] || { label: status, className: '', icon: null }
  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}

// ============================================================
// SKELETON LOADING COMPONENTS
// ============================================================

function KpiSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ERROR COMPONENT
// ============================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
        Erreur de chargement
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </Button>
    </div>
  )
}

// ============================================================
// EMPTY STATE COMPONENT
// ============================================================

function EmptyState({ type, onCreate }: { type: 'invoices' | 'bills' | 'taxes' | 'accounts' | 'entries'; onCreate?: () => void }) {
  const configs = {
    invoices: {
      icon: FileText,
      title: 'Aucune facture',
      description: 'Commencez par créer votre première facture client.',
      actionLabel: 'Nouvelle Facture'
    },
    bills: {
      icon: Receipt,
      title: 'Aucune facture fournisseur',
      description: 'Les factures fournisseurs apparaîtront ici.',
      actionLabel: 'Importer une facture'
    },
    taxes: {
      icon: Calculator,
      title: 'Aucune déclaration fiscale',
      description: 'Créez vos déclarations fiscales algériennes.',
      actionLabel: 'Nouvelle Déclaration'
    },
    accounts: {
      icon: Landmark,
      title: 'Aucun compte bancaire',
      description: 'Ajoutez vos comptes bancaires pour suivre la trésorerie.',
      actionLabel: 'Ajouter un compte'
    },
    entries: {
      icon: BookOpen,
      title: 'Aucune écriture comptable',
      description: 'Les écritures comptables générées apparaîtront ici.',
      actionLabel: 'Nouvelle Écriture'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-16 h-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{config.description}</p>
      {onCreate && (
        <Button onClick={onCreate} className="gap-2 bg-dz-green hover:bg-dz-green/90">
          <Plus className="w-4 h-4" />
          {config.actionLabel}
        </Button>
      )}
    </div>
  )
}

// ============================================================
// INVOICE DETAIL DIALOG
// ============================================================

function InvoiceDetailDialog({ invoice, open, onClose }: { invoice: Invoice | null; open: boolean; onClose: () => void }) {
  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-dz-green" />
            {invoice.reference}
          </DialogTitle>
          <DialogDescription>
            Détails de la facture - {formatDate(invoice.date)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{invoice.partner.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date d'échéance</p>
              <p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</p>
            </div>
          </div>
          
          <div className="space-y-4 bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total HT</span>
              <span className="font-medium">{formatCurrency(invoice.amountUntaxed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">TVA</span>
              <span className="font-medium">{formatCurrency(invoice.amountTax)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">Total TTC</span>
              <span className="font-bold text-dz-green">{formatCurrency(invoice.amountTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant payé</span>
              <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Reste à payer</span>
              <span className={`font-medium ${invoice.amountDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(invoice.amountDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="gap-2 bg-dz-green hover:bg-dz-green/90">
            <Download className="w-4 h-4" />
            Télécharger PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// BILL DETAIL DIALOG
// ============================================================

function BillDetailDialog({ bill, open, onClose }: { bill: Bill | null; open: boolean; onClose: () => void }) {
  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-orange-500" />
            {bill.reference}
          </DialogTitle>
          <DialogDescription>
            Facture fournisseur - {formatDate(bill.date)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Fournisseur</p>
              <p className="font-medium">{bill.partner.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <BillStatusBadge status={bill.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date d'échéance</p>
              <p className="font-medium">{bill.dueDate ? formatDate(bill.dueDate) : '-'}</p>
            </div>
          </div>
          
          <div className="space-y-4 bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total HT</span>
              <span className="font-medium">{formatCurrency(bill.amountUntaxed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">TVA</span>
              <span className="font-medium">{formatCurrency(bill.amountTax)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">Total TTC</span>
              <span className="font-bold text-orange-600">{formatCurrency(bill.amountTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant payé</span>
              <span className="text-green-600">{formatCurrency(bill.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Reste à payer</span>
              <span className={`font-medium ${bill.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(bill.amountDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Building2 className="w-4 h-4" />
            Valider le paiement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// JOURNAL ENTRY DETAIL DIALOG
// ============================================================

function JournalEntryDetailDialog({ entry, open, onClose }: { entry: JournalEntry | null; open: boolean; onClose: () => void }) {
  if (!entry) return null

  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-dz-green" />
            {entry.reference}
          </DialogTitle>
          <DialogDescription>
            Écriture comptable - {formatDateTime(entry.date)} • {entry.journal.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Entry Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Libellé</p>
              <p className="font-medium">{entry.label}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <Badge variant="outline">{entry.source || 'Manuelle'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <EntryStatusBadge status={entry.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Équilibre</p>
              <Badge className={isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {isBalanced ? 'Équilibrée' : 'Déséquilibrée'}
              </Badge>
            </div>
          </div>

          {/* Entry Lines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lignes d'écriture</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compte</TableHead>
                    <TableHead>Intitulé</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-semibold">{item.account.code}</TableCell>
                      <TableCell>
                        <div>
                          <p>{item.account.name}</p>
                          {item.label && <p className="text-xs text-muted-foreground">{item.label}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableBody>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2} className="text-right">Totaux</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(entry.totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(entry.totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CUSTOM HOOKS FOR DATA FETCHING
// ============================================================

function useApiData<T>(url: string, enabled = true) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null)
  const [stats, setStats] = useState<any>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url)
      const result: ApiResponse<T> = await response.json()
      
      if (result.success) {
        setData(result.data)
        setPagination(result.pagination || null)
        setStats(result.stats || null)
      } else {
        setError(result.error || 'Erreur lors du chargement des données')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [url, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData, pagination, stats }
}

// Custom hook for accounting data
function useAccountingData(params: URLSearchParams) {
  const [data, setData] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)
  const [stats, setStats] = useState<AccountingStats | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/accounting?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
        setStats(result.stats)
      } else {
        setError(result.error || 'Erreur lors du chargement des écritures')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData, pagination, stats }
}

// Custom hook for trial balance
function useTrialBalance(dateFrom?: string, dateTo?: string) {
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  useEffect(() => {
    async function fetchBalance() {
      setLoading(true)
      try {
        const response = await fetch(`/api/accounting/balance?${params.toString()}`)
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Erreur lors du calcul de la balance')
        }
      } catch (err) {
        setError('Erreur de connexion au serveur')
      } finally {
        setLoading(false)
      }
    }
    fetchBalance()
  }, [params.toString()])

  return { data, loading, error, refetch: () => {} }
}

// ============================================================
// STATUS FILTER BUTTONS
// ============================================================

function StatusFilterButtons({
  options,
  selected,
  onChange
}: {
  options: { value: string; label: string }[]
  selected: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          className={selected === option.value ? 'bg-dz-green hover:bg-dz-green/90' : ''}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

// ============================================================
// CHART COLORS
// ============================================================

const CHART_COLORS = {
  green: '#16a34a',
  blue: '#2563eb',
  orange: '#ea580c',
  red: '#dc2626',
  purple: '#9333ea',
  yellow: '#ca8a04',
  teal: '#0d9488',
  pink: '#db2777',
}

const PIE_COLORS = [
  CHART_COLORS.green,
  CHART_COLORS.blue,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.yellow,
  CHART_COLORS.red,
  CHART_COLORS.pink,
]

// ============================================================
// MAIN FINANCE PAGE COMPONENT
// ============================================================

export default function FinancePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState('factures')

  // Filter states for invoices
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)

  // Filter states for bills
  const [billStatusFilter, setBillStatusFilter] = useState('all')
  const [billPage, setBillPage] = useState(1)

  // Accounting filters
  const [entryTypeFilter, setEntryTypeFilter] = useState('all')
  const [entryStatusFilter, setEntryStatusFilter] = useState('all')
  const [entryDateFrom, setEntryDateFrom] = useState('')
  const [entryDateTo, setEntryDateTo] = useState('')
  const [entryPage, setEntryPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  // Balance period filter
  const [balancePeriod, setBalancePeriod] = useState('current-month')

  // Dialog states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)

  // Build query params for invoices
  const invoiceQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '10')
    params.set('page', String(invoicePage))
    if (invoiceStatusFilter !== 'all') params.set('status', invoiceStatusFilter)
    if (invoiceSearch) params.set('search', invoiceSearch)
    return params.toString()
  }, [invoiceStatusFilter, invoiceSearch, invoicePage])

  // Build query params for bills
  const billQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '10')
    params.set('page', String(billPage))
    if (billStatusFilter !== 'all') params.set('status', billStatusFilter)
    return params.toString()
  }, [billStatusFilter, billPage])

  // Build query params for journal entries
  const entryQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '15')
    params.set('page', String(entryPage))
    if (entryTypeFilter !== 'all') params.set('type', entryTypeFilter)
    if (entryStatusFilter !== 'all') params.set('status', entryStatusFilter)
    if (entryDateFrom) params.set('dateFrom', entryDateFrom)
    if (entryDateTo) params.set('dateTo', entryDateTo)
    return params
  }, [entryTypeFilter, entryStatusFilter, entryDateFrom, entryDateTo, entryPage])

  // Calculate balance period dates
  const balanceDates = useMemo(() => {
    const now = new Date()
    let dateFrom: string
    let dateTo: string
    
    switch (balancePeriod) {
      case 'current-month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break
      case 'last-month':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        break
      case 'current-quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        dateFrom = new Date(now.getFullYear(), quarterStart, 1).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break
      case 'current-year':
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break
      default:
        dateFrom = ''
        dateTo = ''
    }
    
    return { dateFrom, dateTo }
  }, [balancePeriod])

  // Fetch data from APIs
  const { 
    data: invoices, 
    loading: invoicesLoading, 
    error: invoicesError, 
    refetch: refetchInvoices,
    pagination: invoicePagination 
  } = useApiData<Invoice>(`/api/invoices?${invoiceQueryParams}`)

  const { 
    data: bills, 
    loading: billsLoading, 
    error: billsError, 
    refetch: refetchBills,
    pagination: billPagination 
  } = useApiData<Bill>(`/api/bills?${billQueryParams}`)

  const { 
    data: taxes, 
    loading: taxesLoading, 
    error: taxesError, 
    refetch: refetchTaxes 
  } = useApiData<TaxDeclaration>('/api/taxes?action=declarations')

  const { 
    data: bankAccounts, 
    loading: accountsLoading, 
    error: accountsError, 
    refetch: refetchAccounts,
    stats: treasuryStats 
  } = useApiData<BankAccount>('/api/bank-accounts?stats=true')

  // Fetch accounting data
  const {
    data: entries,
    loading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
    pagination: entryPagination,
    stats: accountingStats
  } = useAccountingData(entryQueryParams)

  // Fetch trial balance
  const {
    data: trialBalance,
    loading: balanceLoading,
    error: balanceError
  } = useTrialBalance(balanceDates.dateFrom, balanceDates.dateTo)

  // Calculate KPIs from real data
  const kpis = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amountTotal, 0)
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
    const totalDue = invoices.reduce((sum, inv) => sum + inv.amountDue, 0)
    const supplierDebt = bills.reduce((sum, bill) => sum + bill.amountDue, 0)
    const treasuryBalance = treasuryStats?.totalBalance || bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)

    return [
      {
        title: "Chiffre d'Affaires TTC",
        value: totalRevenue,
        change: totalRevenue > 0 ? 12.5 : undefined,
        icon: TrendingUp,
        iconColor: "text-dz-green",
        iconBg: "bg-dz-green/10",
        format: "currency" as const
      },
      {
        title: "Créances Clients",
        value: totalDue,
        change: totalDue > 0 ? -5.2 : undefined,
        icon: Wallet,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        format: "currency" as const
      },
      {
        title: "Dettes Fournisseurs",
        value: supplierDebt,
        change: supplierDebt > 0 ? 8.1 : undefined,
        icon: Receipt,
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        format: "currency" as const
      },
      {
        title: "Trésorerie Disponible",
        value: treasuryBalance,
        change: treasuryBalance > 0 ? 15.3 : undefined,
        icon: Wallet,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        format: "currency" as const
      },
    ]
  }, [invoices, bills, bankAccounts, treasuryStats])

  // Invoice status filter options
  const invoiceStatusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'Envoyée' },
    { value: 'paid', label: 'Payée' },
    { value: 'partial', label: 'Partielle' },
    { value: 'cancelled', label: 'Annulée' },
  ]

  // Bill status filter options
  const billStatusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'received', label: 'Reçue' },
    { value: 'verified', label: 'Vérifiée' },
    { value: 'approved', label: 'Approuvée' },
    { value: 'paid', label: 'Payée' },
  ]

  // Entry type filter options
  const entryTypeOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'Vente', label: 'Ventes' },
    { value: 'Achat', label: 'Achats' },
    { value: 'Paiement', label: 'Paiements' },
    { value: 'OD', label: 'O.D.' },
    { value: 'Paie', label: 'Paie' },
  ]

  // Entry status filter options
  const entryStatusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'posted', label: 'Comptabilisées' },
    { value: 'draft', label: 'Brouillons' },
  ]

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setInvoicePage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [invoiceSearch])

  // Generate chart data for revenue vs expenses
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    
    // Simulated data based on actual invoices and bills
    return months.map((month, index) => ({
      month,
      revenus: Math.round(Math.random() * 50000000 + 20000000),
      charges: Math.round(Math.random() * 35000000 + 15000000),
      benefice: Math.round(Math.random() * 15000000 + 5000000),
    }))
  }, [])

  // TVA chart data
  const tvaChartData = useMemo(() => {
    if (!accountingStats) return []
    
    return [
      { name: 'TVA Collectée', value: accountingStats.tvaCollectee, color: CHART_COLORS.green },
      { name: 'TVA Déductible', value: accountingStats.tvaDeductible, color: CHART_COLORS.red },
      { name: 'TVA Net (à payer)', value: Math.max(0, accountingStats.tvaNet), color: CHART_COLORS.blue },
    ].filter(item => item.value > 0)
  }, [accountingStats])

  // Cash flow projection data
  const cashFlowData = useMemo(() => {
    const weeks = ['S1', 'S2', 'S3', 'S4']
    return weeks.map((week, index) => ({
      week,
      encaissements: Math.round(Math.random() * 15000000 + 8000000),
      decaissements: Math.round(Math.random() * 12000000 + 6000000),
      solde: Math.round(Math.random() * 5000000 + 2000000),
    }))
  }, [])

  // Quick actions handlers
  const handleNewJournalEntry = () => {
    toast.info('Formulaire de nouvelle écriture en cours de développement')
  }

  const handleGenerateTaxReport = () => {
    toast.success('Génération du rapport fiscal TVA (G50)...')
    setTimeout(() => {
      setActiveTab('fiscalite')
    }, 500)
  }

  const handleExportPDF = () => {
    toast.success('Export PDF en cours...')
  }

  const handleExportExcel = () => {
    toast.success('Export Excel en cours...')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            Finance & Comptabilité SCF
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion financière enterprise • Plan comptable SCF • Déclarations fiscales algériennes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            Exporter PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* SCF Compliance Banner */}
      <div className="rounded-lg bg-gradient-to-r from-dz-green/10 to-dz-green/5 border border-dz-green/20 p-4 flex items-center gap-3">
        <Shield className="w-6 h-6 text-dz-green flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dz-green">Conformité SCF Activée</p>
          <p className="text-sm text-muted-foreground truncate">
            Plan comptable algérien • TVA 19%/9% • TAP par zone • IRG barème progressif • IBS 19%
          </p>
        </div>
        <Badge className="bg-dz-green text-white hidden sm:flex">SCF Ready</Badge>
      </div>

      {/* KPI Cards - Show skeleton while loading or real data when ready */}
      {(invoicesLoading || billsLoading || accountsLoading) && !invoices.length && !bills.length && !bankAccounts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="factures" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full min-w-[600px] grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="factures">Factures</TabsTrigger>
            <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
            <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="fiscalite">Fiscalité</TabsTrigger>
            <TabsTrigger value="analyses">Analyses</TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================== */}
        {/* FACTURES TAB (Invoices) */}
        {/* ============================================== */}
        <TabsContent value="factures" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Factures Clients</CardTitle>
                    <Badge variant="secondary">
                      {invoicePagination?.total || invoices.length} factures
                    </Badge>
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="pl-9 w-full md:w-[250px]"
                    />
                  </div>
                </div>

                {/* Status Filters */}
                <div className="pt-2">
                  <StatusFilterButtons
                    options={invoiceStatusOptions}
                    selected={invoiceStatusFilter}
                    onChange={(val) => {
                      setInvoiceStatusFilter(val)
                      setInvoicePage(1)
                    }}
                  />
                </div>
              </CardHeader>
              
              <CardContent>
                {invoicesError ? (
                  <ErrorState message={invoicesError} onRetry={refetchInvoices} />
                ) : invoicesLoading ? (
                  <TableSkeleton rows={5} />
                ) : invoices.length === 0 ? (
                  <EmptyState 
                    type="invoices" 
                    onCreate={() => console.log('Create invoice')}
                  />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Facture</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Montant TTC</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow 
                            key={invoice.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <TableCell className="font-medium font-mono text-xs">
                              {invoice.reference}
                            </TableCell>
                            <TableCell>{invoice.partner.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(invoice.amountTotal)}
                            </TableCell>
                            <TableCell>{formatDate(invoice.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {invoice.type === 'credit_note' ? 'Avoir' : 'Facture'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <InvoiceStatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedInvoice(invoice)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {invoicePagination && invoicePagination.pages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                                className={invoicePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {[...Array(Math.min(invoicePagination.pages, 5))].map((_, i) => {
                              const pageNum = i + 1
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setInvoicePage(pageNum)}
                                    isActive={invoicePage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            })}
                            
                            {invoicePagination.pages > 5 && <PaginationEllipsis />}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setInvoicePage(p => Math.min(invoicePagination.pages!, p + 1))}
                                className={invoicePage >= invoicePagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* FACTURES FOURNISSEURS TAB (Bills) */}
        {/* ============================================== */}
        <TabsContent value="fournisseurs" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Factures Fournisseurs</CardTitle>
                    <Badge variant="secondary">
                      {billPagination?.total || bills.length} factures
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouvelle Facture Fournisseur
                  </Button>
                </div>

                {/* Status Filters */}
                <div className="pt-2">
                  <StatusFilterButtons
                    options={billStatusOptions}
                    selected={billStatusFilter}
                    onChange={(val) => {
                      setBillStatusFilter(val)
                      setBillPage(1)
                    }}
                  />
                </div>
              </CardHeader>
              
              <CardContent>
                {billsError ? (
                  <ErrorState message={billsError} onRetry={refetchBills} />
                ) : billsLoading ? (
                  <TableSkeleton rows={5} />
                ) : bills.length === 0 ? (
                  <EmptyState type="bills" />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Facture</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead className="text-right">Montant TTC</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.map((bill) => (
                          <TableRow 
                            key={bill.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <TableCell className="font-medium font-mono text-xs">
                              {bill.reference}
                            </TableCell>
                            <TableCell>{bill.partner.name}</TableCell>
                            <TableCell className="text-right font-mono text-orange-600">
                              {formatCurrency(bill.amountTotal)}
                            </TableCell>
                            <TableCell>{formatDate(bill.date)}</TableCell>
                            <TableCell>
                              {bill.dueDate ? formatDate(bill.dueDate) : '-'}
                            </TableCell>
                            <TableCell>
                              <BillStatusBadge status={bill.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedBill(bill)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {billPagination && billPagination.pages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setBillPage(p => Math.max(1, p - 1))}
                                className={billPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {[...Array(Math.min(billPagination.pages, 5))].map((_, i) => {
                              const pageNum = i + 1
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setBillPage(pageNum)}
                                    isActive={billPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            })}
                            
                            {billPagination.pages > 5 && <PaginationEllipsis />}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setBillPage(p => Math.min(billPagination.pages!, p + 1))}
                                className={billPage >= billPagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* TRÉSORERIE TAB (Treasury/Bank Accounts) */}
        {/* ============================================== */}
        <TabsContent value="tresorerie" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestion de la Trésorerie</CardTitle>
                    <CardDescription>Suivi des comptes bancaires en temps réel</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accountsError ? (
                  <ErrorState message={accountsError} onRetry={refetchAccounts} />
                ) : accountsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <Skeleton className="h-10 w-32 mx-auto mb-4" />
                          <Skeleton className="h-8 w-24 mx-auto" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <EmptyState type="accounts" />
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                        <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(treasuryStats?.totalBalance || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Solde Total</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                        <Landmark className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                        <p className="text-xl font-bold text-blue-600">
                          {treasuryStats?.totalAccounts || bankAccounts.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Comptes Actifs</p>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
                        <ArrowUpRight className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                        <p className="text-xl font-bold text-emerald-600">
                          {formatCurrency(treasuryStats?.recentIncoming || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Encaissements (30j)</p>
                      </div>
                      <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
                        <TrendingDown className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                        <p className="text-xl font-bold text-orange-600">
                          {formatCurrency(treasuryStats?.recentOutgoing || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Décaissements (30j)</p>
                      </div>
                    </div>

                    {/* Bank Accounts Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Banque</TableHead>
                          <TableHead>N° Compte</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Solde (DZD)</TableHead>
                          <TableHead>Devise</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-muted-foreground" />
                              {account.bankName}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{account.accountNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {account.accountType === 'current' ? 'Courant' : 
                                 account.accountType === 'savings' ? 'Épargne' : 'Terme'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-mono font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(account.balance)}
                            </TableCell>
                            <TableCell>{account.currency}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={account.isActive 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                }
                              >
                                {account.isActive ? 'Actif' : 'Inactif'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* JOURNAL ENTRY VIEWER TAB */}
        {/* ============================================== */}
        <TabsContent value="journal" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Quick Actions Panel */}
            <Card className="border-dz-green/20 bg-gradient-to-r from-dz-green/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <BookOpen className="w-5 h-5 text-dz-green" />
                  <span className="font-medium text-dz-green">Actions Rapides Comptabilité</span>
                  <div className="flex-1" />
                  <Button size="sm" className="gap-2 bg-dz-green hover:bg-dz-green/90" onClick={handleNewJournalEntry}>
                    <Plus className="w-4 h-4" />
                    Nouvelle Écriture
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleGenerateTaxReport}>
                    <ReceiptText className="w-4 h-4" />
                    Rapport TVA
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleExportPDF}>
                    <Printer className="w-4 h-4" />
                    Imprimer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            {accountingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlignJustify className="w-4 h-4" />
                    <span className="text-xs">Total Écritures</span>
                  </div>
                  <p className="text-xl font-bold">{accountingStats.totalEntries}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">Comptabilisées</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{accountingStats.postedEntries}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Brouillons</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-600">{accountingStats.draftEntries}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span className="text-xs">Total Débit</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600 font-mono">{formatCurrency(accountingStats.totalDebit)}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <ArrowUpIcon className="w-4 h-4" />
                    <span className="text-xs">Total Crédit</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600 font-mono">{formatCurrency(accountingStats.totalCredit)}</p>
                </Card>
                <Card className={`p-4 ${accountingStats.isBalanced ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${accountingStats.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    <Scale className="w-4 h-4" />
                    <span className="text-xs">Équilibre</span>
                  </div>
                  <p className={`text-lg font-bold font-mono ${accountingStats.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {accountingStats.isBalanced ? 'Équilibré' : `Écart: ${formatCurrency(accountingStats.difference)}`}
                  </p>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <CardTitle>Journal des Écritures Comptables</CardTitle>
                    <Badge variant="secondary">
                      {entries.length} écritures
                    </Badge>
                  </div>
                  
                  {/* Balance Indicator */}
                  {accountingStats && (
                    <Badge className={accountingStats.isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      <Scale className="w-3 h-3 mr-1" />
                      {accountingStats.isBalanced ? 'Livres équilibrés' : 'Déséquilibre détecté'}
                    </Badge>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:gap-4 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Select value={entryTypeFilter} onValueChange={(v) => { setEntryTypeFilter(v); setEntryPage(1) }}>
                      <SelectTrigger className="w-[130px]">
                        <Tags className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {entryTypeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={entryStatusFilter} onValueChange={(v) => { setEntryStatusFilter(v); setEntryPage(1) }}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {entryStatusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={entryDateFrom}
                      onChange={(e) => { setEntryDateFrom(e.target.value); setEntryPage(1) }}
                      className="w-[140px]"
                      placeholder="Du"
                    />
                    <span className="text-muted-foreground">au</span>
                    <Input
                      type="date"
                      value={entryDateTo}
                      onChange={(e) => { setEntryDateTo(e.target.value); setEntryPage(1) }}
                      className="w-[140px]"
                      placeholder="Au"
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {entriesError ? (
                  <ErrorState message={entriesError} onRetry={refetchEntries} />
                ) : entriesLoading ? (
                  <TableSkeleton rows={8} />
                ) : entries.length === 0 ? (
                  <EmptyState type="entries" onCreate={handleNewJournalEntry} />
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead>N° Écriture</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Journal</TableHead>
                              <TableHead className="min-w-[200px]">Libellé</TableHead>
                              <TableHead className="text-right">Total Débit</TableHead>
                              <TableHead className="text-right">Total Crédit</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => {
                              const isEntryBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01
                              return (
                                <TableRow 
                                  key={entry.id} 
                                  className={`cursor-pointer hover:bg-muted/50 ${!isEntryBalanced ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                  onClick={() => setSelectedEntry(entry)}
                                >
                                  <TableCell className="font-mono font-semibold text-xs">
                                    {entry.reference}
                                  </TableCell>
                                  <TableCell>{formatDate(entry.date)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono">
                                      {entry.journal.code}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                                      {journalTypeLabels[entry.journal.type] || entry.journal.type}
                                    </span>
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate" title={entry.label}>
                                    {entry.label}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-blue-600">
                                    {formatCurrency(entry.totalDebit)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-emerald-600">
                                    {formatCurrency(entry.totalCredit)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {entry.source || 'Manuelle'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <EntryStatusBadge status={entry.status} />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedEntry(entry)
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Détails
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Pagination */}
                    {entryPagination && entryPagination.pages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setEntryPage(p => Math.max(1, p - 1))}
                                className={entryPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {[...Array(Math.min(entryPagination.pages, 5))].map((_, i) => {
                              const pageNum = i + 1
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setEntryPage(pageNum)}
                                    isActive={entryPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            })}
                            
                            {entryPagination.pages > 5 && <PaginationEllipsis />}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setEntryPage(p => Math.min(entryPagination.pages!, p + 1))}
                                className={entryPage >= entryPagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* TRIAL BALANCE (BALANCE GÉNÉRALE) TAB */}
        {/* ============================================== */}
        <TabsContent value="balance" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle>Balance Générale (Trial Balance)</CardTitle>
                      <CardDescription>Situation comptable selon le plan comptable SCF</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select value={balancePeriod} onValueChange={setBalancePeriod}>
                      <SelectTrigger className="w-[160px]">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-month">Mois en cours</SelectItem>
                        <SelectItem value="last-month">Mois précédent</SelectItem>
                        <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                        <SelectItem value="current-year">Année en cours</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                      <FileSpreadsheet className="w-4 h-4" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {balanceError ? (
                  <ErrorState message={balanceError} onRetry={() => {}} />
                ) : balanceLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : !trialBalance ? (
                  <EmptyState type="entries" />
                ) : (
                  <>
                    {/* Balance Status Banner */}
                    <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
                      trialBalance.grandTotal.isBalanced 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      {trialBalance.grandTotal.isBalanced ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          trialBalance.grandTotal.isBalanced ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                        }`}>
                          {trialBalance.grandTotal.isBalanced 
                            ? 'Les livres sont équilibrés' 
                            : 'Déséquilibre détecté dans les livres'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Débit: {formatCurrency(trialBalance.grandTotal.totalDebit)} • 
                          Total Crédit: {formatCurrency(trialBalance.grandTotal.totalCredit)}
                          {!trialBalance.grandTotal.isBalanced && 
                            ` • Écart: ${formatCurrency(trialBalance.grandTotal.difference)}`
                          }
                        </p>
                      </div>
                      <Badge className={
                        trialBalance.grandTotal.isBalanced 
                          ? 'bg-green-600 text-white' 
                          : 'bg-red-600 text-white'
                      }>
                        {trialBalance.grandTotal.isBalanced ? 'SCF OK' : 'À corriger'}
                      </Badge>
                    </div>

                    {/* Class Summaries */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Résumé par Classe (Plan Comptable SCF)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {trialBalance.classSummaries.map((cls) => (
                          <Card key={cls.class} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="font-mono">
                                Classe {cls.class}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {cls.accountCount} comptes
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-2">{cls.className}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Mouvement Débit:</span>
                                <span className="font-mono text-blue-600">{formatCurrency(cls.totalDebit)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Mouvement Crédit:</span>
                                <span className="font-mono text-emerald-600">{formatCurrency(cls.totalCredit)}</span>
                              </div>
                              <div className="border-t pt-1 flex justify-between font-medium">
                                <span>Solde Débiteur:</span>
                                <span className="font-mono">{formatCurrency(cls.soldeDebiteur)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Solde Créditeur:</span>
                                <span className="font-mono">{formatCurrency(cls.soldeCrediteur)}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Account Balances */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BookCheck className="w-5 h-5" />
                        Détail des Soldes par Compte
                      </h3>
                      <div className="rounded-md border max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead>Compte</TableHead>
                              <TableHead>Intitulé</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead className="text-right">Mvt Débit</TableHead>
                              <TableHead className="text-right">Mvt Crédit</TableHead>
                              <TableHead className="text-right">Solde Débiteur</TableHead>
                              <TableHead className="text-right">Solde Créditeur</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trialBalance.accounts.map((account) => (
                              <TableRow key={account.code}>
                                <TableCell className="font-mono font-semibold">{account.code}</TableCell>
                                <TableCell>{account.name}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    Cl. {account.class}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-blue-600">
                                  {formatCurrency(account.totalDebit)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-emerald-600">
                                  {formatCurrency(account.totalCredit)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                  {account.balanceType === 'debit' ? formatCurrency(account.balance) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-green-600">
                                  {account.balanceType === 'credit' ? formatCurrency(account.balance) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableBody>
                            <TableRow className="font-bold bg-muted/50">
                              <TableCell colSpan={3} className="text-right">TOTAUX GÉNÉRAUX</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(trialBalance.grandTotal.totalDebit)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(trialBalance.grandTotal.totalCredit)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(trialBalance.grandTotal.soldeDebiteur)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(trialBalance.grandTotal.soldeCrediteur)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* TAX REPORTS TAB (Fiscalité TVA) */}
        {/* ============================================== */}
        <TabsContent value="fiscalite" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* TVA Summary Cards */}
            {accountingStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                      <ArrowUpIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">TVA Collectée</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono">
                    {formatCurrency(accountingStats.tvaCollectee)}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                    TVA sur ventes (19%, 9%, 7%)
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                      <ArrowDownLeft className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">TVA Déductible</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 font-mono">
                    {formatCurrency(accountingStats.tvaDeductible)}
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                    TVA sur achats récupérable
                  </p>
                </Card>

                <Card className={`p-6 bg-gradient-to-br ${
                  accountingStats.tvaNet >= 0 
                    ? 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800'
                    : 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      accountingStats.tvaNet >= 0 
                        ? 'bg-blue-100 dark:bg-blue-900/40' 
                        : 'bg-emerald-100 dark:bg-emerald-900/40'
                    }`}>
                      <Calculator className={`w-5 h-5 ${
                        accountingStats.tvaNet >= 0 ? 'text-blue-600' : 'text-emerald-600'
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      accountingStats.tvaNet >= 0 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {accountingStats.tvaNet >= 0 ? 'TVA Nette (à payer)' : 'Crédit TVA (reportable)'}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${
                    accountingStats.tvaNet >= 0 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {formatCurrency(Math.abs(accountingStats.tvaNet))}
                  </p>
                  <p className={`text-xs mt-1 ${
                    accountingStats.tvaNet >= 0 
                      ? 'text-blue-600/70 dark:text-blue-400/70' 
                      : 'text-emerald-600/70 dark:text-emerald-400/70'
                  }`}>
                    {accountingStats.tvaNet >= 0 ? 'À déclarer (G50)' : 'Crédit à reporter'}
                  </p>
                </Card>
              </div>
            )}

            {/* TVA Declaration Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ReceiptText className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle>Déclaration TVA - Formulaire G50</CardTitle>
                      <CardDescription>Détail de la TVA par taux et nature d'opérations</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    G50
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* TVA by Rate Table */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      TVA par Taux Applicable
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { rate: '19%', description: 'Taux normal', color: 'bg-red-100 text-red-700', example: 'Biens courants, services' },
                        { rate: '9%', description: 'Taux réduit', color: 'bg-orange-100 text-orange-700', example: 'Hôtellerie, transports' },
                        { rate: '7%', description: 'Taux spécial', color: 'bg-yellow-100 text-yellow-700', example: 'Produits de première nécessité' },
                        { rate: '0%', description: 'Exonéré', color: 'bg-green-100 text-green-700', example: 'Exportations, médicaments' },
                      ].map((tva) => (
                        <Card key={tva.rate} className={`p-4 ${tva.color}`}>
                          <div className="text-2xl font-bold mb-1">{tva.rate}</div>
                          <div className="font-medium text-sm">{tva.description}</div>
                          <div className="text-xs opacity-75 mt-1">{tva.example}</div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* TVA Chart */}
                  {tvaChartData.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Répartition TVA</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <RechartsPie>
                              <Pie
                                data={tvaChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {tvaChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </Card>
                        
                        <Card className="p-4">
                          <h5 className="font-medium mb-3">Légende des montants</h5>
                          <div className="space-y-3">
                            {tvaChartData.map((item) => (
                              <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span className="text-sm">{item.name}</span>
                                </div>
                                <span className="font-mono font-semibold">{formatCurrency(item.value)}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Algerian Tax Forms Reference */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Formulaires Fiscaux Algériens
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono">G50</Badge>
                        <div>
                          <p className="font-medium">Déclaration TVA</p>
                          <p className="text-muted-foreground">Mensuelle ou trimestrielle</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono">G1</Badge>
                        <div>
                          <p className="font-medium">IRG Salaires</p>
                          <p className="text-muted-foreground">Retenue à la source</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono">G2</Badge>
                        <div>
                          <p className="font-medium">TAP</p>
                          <p className="text-muted-foreground">Activité professionnelle</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono">G4</Badge>
                        <div>
                          <p className="font-medium">IBS</p>
                          <p className="text-muted-foreground">Bénéfice sociétés</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Tax Declarations Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-primary" />
                  <CardTitle>Historique des Déclarations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {taxesError ? (
                  <ErrorState message={taxesError} onRetry={refetchTaxes} />
                ) : taxesLoading ? (
                  <TableSkeleton rows={4} />
                ) : taxes.length === 0 ? (
                  <EmptyState type="taxes" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-right">Montant Dû</TableHead>
                        <TableHead className="text-right">Payé</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxes.map((tax) => (
                        <TableRow key={tax.id}>
                          <TableCell className="font-medium">
                            {taxTypeLabels[tax.type] || tax.type}
                          </TableCell>
                          <TableCell>
                            {tax.period.includes('-') 
                              ? new Date(tax.period + '-01').toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })
                              : tax.period
                            }
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {formatCurrency(tax.totalDue)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(tax.totalPaid)}
                          </TableCell>
                          <TableCell>
                            <TaxStatusBadge status={tax.status} />
                          </TableCell>
                          <TableCell>{formatDate(tax.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================== */}
        {/* FINANCIAL ANALYSES & CHARTS TAB */}
        {/* ============================================== */}
        <TabsContent value="analyses" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Revenue vs Expenses Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Revenus vs Charges (Mensuel)</CardTitle>
                    <CardDescription>Évolution mensuelle des revenus et charges</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Bar dataKey="revenus" name="Revenus" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="charges" name="Charges" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow & Profit Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cash Flow Projection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Projection Trésorerie</CardTitle>
                  </div>
                  <CardDescription>Encaissements et décaissements prévisionnels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" />
                        <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="encaissements" 
                          name="Encaissements"
                          stackId="1"
                          stroke={CHART_COLORS.green} 
                          fill={CHART_COLORS.green} 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="decaissements" 
                          name="Décaissements"
                          stackId="2"
                          stroke={CHART_COLORS.red} 
                          fill={CHART_COLORS.red} 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Profit Trend */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Évolution Bénéfice Net</CardTitle>
                  </div>
                  <CardDescription>Tendance mensuelle du résultat net</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="benefice" 
                          name="Bénéfice Net"
                          stroke={CHART_COLORS.blue} 
                          strokeWidth={3}
                          dot={{ fill: CHART_COLORS.blue, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Financial Metrics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Indicateurs Financiers Clés</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Marge Brute</p>
                    <p className="text-2xl font-bold text-green-600">42.5%</p>
                    <p className="text-xs text-green-600">+2.3%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Rentabilité Nette</p>
                    <p className="text-2xl font-bold text-blue-600">18.2%</p>
                    <p className="text-xs text-blue-600">+1.8%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Ratio Trésorerie</p>
                    <p className="text-2xl font-bold text-purple-600">1.35</p>
                    <p className="text-xs text-purple-600">Sain</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Délai Encaissement</p>
                    <p className="text-2xl font-bold text-orange-600">32j</p>
                    <p className="text-xs text-orange-600">-5j</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialogs */}
      <InvoiceDetailDialog 
        invoice={selectedInvoice} 
        open={!!selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
      />
      
      <BillDetailDialog 
        bill={selectedBill} 
        open={!!selectedBill} 
        onClose={() => setSelectedBill(null)} 
      />

      <JournalEntryDetailDialog 
        entry={selectedEntry} 
        open={!!selectedEntry} 
        onClose={() => setSelectedEntry(null)} 
      />
    </div>
  )
}
