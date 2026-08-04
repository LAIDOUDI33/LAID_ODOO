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
  Loader2
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
import { motion, AnimatePresence } from 'framer-motion'

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

const taxTypeLabels: Record<string, string> = {
  G50_TVA: 'TVA (G50)',
  G1_IRG: 'IRG Salaires (G1)',
  G2_TAP: 'TAP (G2)',
  G4_IBS: 'IBS (G4)',
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

function EmptyState({ type, onCreate }: { type: 'invoices' | 'bills' | 'taxes' | 'accounts'; onCreate?: () => void }) {
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

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setInvoicePage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [invoiceSearch])

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
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
        <div className="flex-1">
          <p className="font-semibold text-dz-green">Conformité SCF Activée</p>
          <p className="text-sm text-muted-foreground">
            Plan comptable algérien • TVA 19%/9% • TAP par zone • IRG barème progressif • IBS 19%
          </p>
        </div>
        <Badge className="bg-dz-green text-white">SCF Ready</Badge>
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="fournisseurs">Factures Fournisseurs</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="fiscal">Déclarations Fiscales</TabsTrigger>
        </TabsList>

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
        {/* DÉCLARATIONS FISCALES TAB (Tax Declarations) */}
        {/* ============================================== */}
        <TabsContent value="fiscal" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <CardTitle>Déclarations Fiscales Algériennes</CardTitle>
                    <CardDescription>Gestion complète des obligations fiscales DZ</CardDescription>
                  </div>
                  <Button size="sm" className="gap-2 bg-dz-green hover:bg-dz-green/90">
                    <Plus className="w-4 h-4" />
                    Nouvelle Déclaration
                  </Button>
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
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type de Déclaration</TableHead>
                          <TableHead>Période</TableHead>
                          <TableHead className="text-right">Montant Dû</TableHead>
                          <TableHead className="text-right">Payé</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Date Création</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxes.map((tax) => (
                          <TableRow key={tax.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-muted-foreground" />
                                {taxTypeLabels[tax.type] || tax.type}
                              </div>
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
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Tax Summary */}
                    <div className="mt-6 p-4 rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-4">Résumé des Obligations Fiscales</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">TVA à payer</p>
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(
                              taxes.filter(t => t.type === 'G50_TVA').reduce((sum, t) => sum + (t.tvaNet || t.totalDue), 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">TAP</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(
                              taxes.filter(t => t.type === 'G2_TAP').reduce((sum, t) => sum + (t.tapDue || t.totalDue), 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IRG Retenu</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(
                              taxes.filter(t => t.type === 'G1_IRG').reduce((sum, t) => sum + (t.irgTotal || t.totalDue), 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IBS</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(
                              taxes.filter(t => t.type === 'G4_IBS').reduce((sum, t) => sum + (t.ibsDue || t.totalDue), 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
    </div>
  )
}
