'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Target,
  DollarSign,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Receipt,
  Send,
  Calendar,
  Clock,
  AlertTriangle,
  Building2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface SalesOrder {
  id: string
  reference: string
  date: string
  expectedDate?: string | null
  status: string
  amountUntaxed: number
  amountTax: number
  timbreFiscal: number
  amountTotal: number
  amountDelivered: number
  amountInvoiced: number
  paymentTerms: string
  paymentMode?: string | null
  customerNotes?: string | null
  internalNotes?: string | null
  partner: {
    id: string
    name: string
    nif?: string | null
    city?: string | null
    phone?: string | null
  }
  company?: {
    id: string
    name: string
    logo?: string | null
  }
  warehouse?: {
    id: string
    name: string
  } | null
  salesPerson?: {
    id: string
    name: string
  } | null
  quotation?: {
    id: string
    reference: string
  } | null
  lines: SalesOrderLine[]
  _count?: {
    deliveryItems: number
    invoices: number
  }
}

interface SalesOrderLine {
  id: string
  productId: string
  description?: string | null
  quantity: number
  unitPrice: number
  discountRate: number
  tvaRate: number
  amountUntaxed: number
  amountTax: number
  amountTotal: number
  quantityDelivered: number
  quantityInvoiced: number
  product?: {
    id: string
    name: string
    reference?: string | null
    unit?: string | null
  }
}

interface Quotation {
  id: string
  reference: string
  date: string
  validUntil: string
  status: string
  amountUntaxed: number
  amountTax: number
  timbreFiscal: number
  amountTotal: number
  paymentTerms: string
  paymentMode?: string | null
  customerNotes?: string | null
  internalNotes?: string | null
  partner: {
    id: string
    name: string
    nif?: string | null
    city?: string | null
    email?: string | null
    phone?: string | null
  }
  company?: {
    id: string
    name: string
    logo?: string | null
  }
  salesPerson?: {
    id: string
    name: string
    email?: string | null
  } | null
  opportunity?: {
    id: string
    title?: string | null
    status?: string | null
  } | null
  convertedTo?: {
    id: string
    reference: string
    status: string
  } | null
  lines: QuotationLine[]
}

interface QuotationLine {
  id: string
  productId: string
  description?: string | null
  quantity: number
  unitPrice: number
  discountRate: number
  tvaRate: number
  amountUntaxed: number
  amountTax: number
  amountTotal: number
  product?: {
    id: string
    name: string
    reference?: string | null
    unit?: string | null
  }
}

interface Opportunity {
  id: string
  reference: string
  name: string
  status: string
  stage: number
  probability: number
  expectedRevenue: number
  weightedValue: number
  expectedCloseDate?: string | null
  contactName?: string | null
  contactEmail?: string | null
  nextAction?: string | null
  nextActionDate?: string | null
  partner?: {
    id: string
    name: string
  } | null
  assignedTo?: {
    id: string
    name: string
    email?: string | null
  } | null
  _count?: {
    activities: number
  }
}

interface Partner {
  id: string
  name: string
  displayName?: string | null
  type: string
  city?: string | null
  wilayaCode?: string | null
  email?: string | null
  phone?: string | null
  nif?: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

// ============================================================
// Status configurations
// ============================================================
const SALES_ORDER_STATUSES = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  sent: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  confirmed: { label: 'Confirmée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  processing: { label: 'En traitement', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Package },
  delivered: { label: 'Livrée', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
  invoiced: { label: 'Facturée', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Receipt },
  done: { label: 'Terminée', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

const QUOTATION_STATUSES = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  viewed: { label: 'Vu', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Eye },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
  converted: { label: 'Converti', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: ArrowRight },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

const CRM_STAGES = [
  { stage: 1, label: 'Qualification', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', textColor: 'text-blue-600 dark:text-blue-400' },
  { stage: 2, label: 'Proposition', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', textColor: 'text-yellow-600 dark:text-yellow-400' },
  { stage: 3, label: 'Négociation', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', textColor: 'text-purple-600 dark:text-purple-400' },
  { stage: 4, label: 'Signature', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', textColor: 'text-green-600 dark:text-green-400' },
]

const OPPORTUNITY_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-cyan-100 text-cyan-700',
  qualified: 'bg-emerald-100 text-emerald-700',
  proposal_sent: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-purple-100 text-purple-700',
  won_won: 'bg-green-100 text-green-700',
  lost_lost: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

// ============================================================
// Utility functions
// ============================================================
function formatDZD(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDaysUntil(dateString: string): number {
  const target = new Date(dateString)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function isExpired(dateString: string): boolean {
  return getDaysUntil(dateString) < 0
}

// ============================================================
// Status Badge Components
// ============================================================
function SalesOrderStatusBadge({ status }: { status: string }) {
  const config = SALES_ORDER_STATUSES[status as keyof typeof SALES_ORDER_STATUSES] || SALES_ORDER_STATUSES.draft
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={`${config.color} gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

function QuotationStatusBadge({ status, validUntil }: { status: string; validUntil?: string }) {
  let config = QUOTATION_STATUSES[status as keyof typeof QUOTATION_STATUSES]
  
  // Auto-detect expired status
  if (status === 'sent' && validUntil && isExpired(validUntil)) {
    config = QUOTATION_STATUSES.expired
  }
  
  if (!config) config = QUOTATION_STATUSES.draft
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={`${config.color} gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

function OpportunityStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={OPPORTUNITY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}>
      {status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)}
    </Badge>
  )
}

// ============================================================
// Main Component
// ============================================================
export default function SalesPage() {
  // Data states
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [customers, setCustomers] = useState<Partner[]>([])
  
  // Pagination states
  const [soPagination, setSoPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 })
  const [quotePagination, setQuotePagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 })
  
  // Loading states
  const [loadingSO, setLoadingSO] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [loadingCRM, setLoadingCRM] = useState(true)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  
  // Filter states
  const [soSearch, setSoSearch] = useState('')
  const [soStatusFilter, setSoStatusFilter] = useState('all')
  const [quoteSearch, setQuoteSearch] = useState('')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all')
  
  // Modal states
  const [createSOModalOpen, setCreateSOModalOpen] = useState(false)
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Form states
  const [newSOForm, setNewSOForm] = useState({
    partnerId: '',
    customerNotes: '',
    internalNotes: '',
    paymentTerms: '30',
  })

  // ============================================================
  // API Fetch Functions
  // ============================================================
  const fetchSalesOrders = useCallback(async (page = 1, status = 'all', search = '') => {
    setLoadingSO(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (status !== 'all') params.set('status', status)
      if (search) params.set('search', search)
      
      const response = await fetch(`/api/sales-orders?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSalesOrders(result.data)
        setSoPagination(result.pagination)
      } else {
        toast.error('Erreur lors du chargement des commandes')
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error)
      toast.error('Erreur de connexion')
    } finally {
      setLoadingSO(false)
    }
  }, [])

  const fetchQuotations = useCallback(async (page = 1, status = 'all', search = '') => {
    setLoadingQuotes(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (status !== 'all') params.set('status', status)
      if (search) params.set('search', search)
      
      const response = await fetch(`/api/quotations?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setQuotations(result.data)
        setQuotePagination(result.pagination)
      } else {
        toast.error('Erreur lors du chargement des devis')
      }
    } catch (error) {
      console.error('Error fetching quotations:', error)
      toast.error('Erreur de connexion')
    } finally {
      setLoadingQuotes(false)
    }
  }, [])

  const fetchOpportunities = useCallback(async () => {
    setLoadingCRM(true)
    try {
      const response = await fetch('/api/crm?type=opportunities&limit=50')
      const result = await response.json()
      
      if (result.success) {
        setOpportunities(result.data)
      } else {
        toast.error('Erreur lors du chargement des opportunités')
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      toast.error('Erreur de connexion')
    } finally {
      setLoadingCRM(false)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      const response = await fetch('/api/partners?type=customer')
      const result = await response.json()
      
      if (result.success) {
        setCustomers(result.data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    fetchSalesOrders()
    fetchQuotations()
    fetchOpportunities()
    fetchCustomers()
  }, [fetchSalesOrders, fetchQuotations, fetchOpportunities, fetchCustomers])

  // ============================================================
  // Action Handlers (with Workflow Integration)
  // ============================================================
  const handleUpdateSalesOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(true)
    try {
      // Use workflow API for actions that trigger business processes
      if (['confirmed', 'delivered', 'invoiced'].includes(newStatus)) {
        const actionMap: Record<string, string> = {
          'confirmed': 'confirm',
          'delivered': 'deliver',
          'invoiced': 'invoice'
        }
        
        const response = await fetch(`/api/sales-orders/${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionMap[newStatus] }),
        })
        const result = await response.json()
        
        if (result.success) {
          const msg = result.message || `Commande ${SALES_ORDER_STATUSES[newStatus as keyof typeof SALES_ORDER_STATUSES]?.label || newStatus}`
          // Show SCF journal entry info if invoice created
          if (result.workflowInfo?.journalEntryGenerated) {
            toast.success(`${msg} ✓ Écriture comptable SCF générée`, { duration: 5000 })
          } else {
            toast.success(msg)
          }
          fetchSalesOrders(soPagination.page, soStatusFilter, soSearch)
        } else {
          toast.error(result.error || 'Erreur lors de l\'action')
        }
      } else {
        // Simple status update for other cases
        const response = await fetch(`/api/sales-orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        const result = await response.json()
        
        if (result.success) {
          toast.success(`Commande ${SALES_ORDER_STATUSES[newStatus as keyof typeof SALES_ORDER_STATUSES]?.label || newStatus}`)
          fetchSalesOrders(soPagination.page, soStatusFilter, soSearch)
        } else {
          toast.error(result.error || 'Erreur lors de la mise à jour')
        }
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptQuotation = async (quotationId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/quotations/${quotationId}/accept`, { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Devis accepté avec succès')
        fetchQuotations(quotePagination.page, quoteStatusFilter, quoteSearch)
      } else {
        toast.error(result.error || 'Erreur lors de l\'acceptation')
      }
    } catch (error) {
      console.error('Error accepting quotation:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectQuotation = async (quotationId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/quotations/${quotationId}/reject`, { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Devis rejeté')
        fetchQuotations(quotePagination.page, quoteStatusFilter, quoteSearch)
      } else {
        toast.error(result.error || 'Erreur lors du rejet')
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendQuotation = async (quotationId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/quotations/${quotationId}/send`, { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Devis envoyé au client')
        fetchQuotations(quotePagination.page, quoteStatusFilter, quoteSearch)
      } else {
        toast.error(result.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Error sending quotation:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConvertToSO = async () => {
    if (!selectedQuotation) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/quotations/${selectedQuotation.id}/convert`, { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Commande ${result.data?.reference} créée depuis le devis`)
        setConvertModalOpen(false)
        setSelectedQuotation(null)
        fetchQuotations(quotePagination.page, quoteStatusFilter, quoteSearch)
        fetchSalesOrders(soPagination.page, soStatusFilter, soSearch)
      } else {
        toast.error(result.error || 'Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Error converting quotation:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateSalesOrder = async () => {
    if (!newSOForm.partnerId) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    
    setActionLoading(true)
    try {
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSOForm),
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Commande ${result.data?.reference} créée`)
        setCreateSOModalOpen(false)
        setNewSOForm({ partnerId: '', customerNotes: '', internalNotes: '', paymentTerms: '30' })
        fetchSalesOrders()
      } else {
        toast.error(result.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Error creating SO:', error)
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================================
  // Computed KPIs
  // ============================================================
  const kpis = useMemo(() => {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    const monthlyOrders = salesOrders.filter(o => new Date(o.date) >= thisMonth)
    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + o.amountTotal, 0)
    const activeClients = new Set(salesOrders.map(o => o.partner.id)).size
    const avgCart = monthlyOrders.length > 0 ? monthlyRevenue / monthlyOrders.length : 0
    
    return [
      {
        title: "Commandes du Mois",
        value: monthlyOrders.length,
        change: 12.3,
        icon: ShoppingCart,
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
        format: "number" as const
      },
      {
        title: "CA Ventes (DZD)",
        value: monthlyRevenue,
        change: 8.5,
        icon: TrendingUp,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        format: "currency" as const
      },
      {
        title: "Clients Actifs",
        value: customers.length || activeClients,
        change: 4.2,
        icon: Users,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        format: "number" as const
      },
      {
        title: "Panier Moyen",
        value: avgCart,
        change: -2.1,
        icon: ShoppingCart,
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        format: "currency" as const
      },
    ]
  }, [salesOrders, customers])

  // CRM Pipeline stats by stage
  const pipelineByStage = useMemo(() => {
    const stages = CRM_STAGES.map(s => ({
      ...s,
      count: 0,
      value: 0,
      opportunities: [] as Opportunity[],
    }))
    
    opportunities.forEach(opp => {
      const stageIndex = Math.min(Math.max(opp.stage - 1, 0), stages.length - 1)
      stages[stageIndex].count++
      stages[stageIndex].value += opp.expectedRevenue
      stages[stageIndex].opportunities.push(opp)
    })
    
    return stages
  }, [opportunities])

  const totalPipelineValue = useMemo(() => 
    opportunities.reduce((sum, o) => sum + o.expectedRevenue, 0), 
    [opportunities]
  )

  // ============================================================
  // Render Helpers
  // ============================================================
  const renderSalesOrderActions = (order: SalesOrder) => {
    const canConfirm = ['draft', 'sent'].includes(order.status)
    const canProcess = order.status === 'confirmed'
    const canDeliver = ['confirmed', 'processing'].includes(order.status)
    const canInvoice = ['delivered', 'processing'].includes(order.status) && order.amountDelivered > 0
    
    return (
      <div className="flex items-center gap-1">
        {canConfirm && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => handleUpdateSalesOrderStatus(order.id, 'confirmed')}
            disabled={actionLoading}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmer
          </Button>
        )}
        {canProcess && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => handleUpdateSalesOrderStatus(order.id, 'processing')}
            disabled={actionLoading}
          >
            <Package className="w-3 h-3 mr-1" />
            Traiter
          </Button>
        )}
        {canDeliver && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => handleUpdateSalesOrderStatus(order.id, 'delivered')}
            disabled={actionLoading}
          >
            <Truck className="w-3 h-3 mr-1" />
            Livrer
          </Button>
        )}
        {canInvoice && (
          <Button 
            size="sm" 
            variant="default" 
            className="h-7 text-xs bg-primary"
            onClick={() => handleUpdateSalesOrderStatus(order.id, 'invoiced')}
            disabled={actionLoading}
          >
            <Receipt className="w-3 h-3 mr-1" />
            Facturer
          </Button>
        )}
      </div>
    )
  }

  const renderQuotationActions = (quotation: Quotation) => {
    const daysUntilExpiry = getDaysUntil(quotation.validUntil)
    const isQuotationExpired = isExpired(quotation.validUntil)
    
    return (
      <div className="flex items-center gap-1">
        {quotation.status === 'draft' && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => handleSendQuotation(quotation.id)}
            disabled={actionLoading}
          >
            <Send className="w-3 h-3 mr-1" />
            Envoyer
          </Button>
        )}
        {(quotation.status === 'sent' || (quotation.status === 'viewed' && !isQuotationExpired)) && (
          <>
            <Button 
              size="sm" 
              variant="default" 
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleAcceptQuotation(quotation.id)}
              disabled={actionLoading}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accepter
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleRejectQuotation(quotation.id)}
              disabled={actionLoading}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Rejeter
            </Button>
          </>
        )}
        {(quotation.status === 'accepted' || quotation.status === 'sent') && !quotation.convertedTo && (
          <Button 
            size="sm" 
            variant="default" 
            className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              setSelectedQuotation(quotation)
              setConvertModalOpen(true)
            }}
            disabled={actionLoading}
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Convertir en CO
          </Button>
        )}
        {daysUntilExpiry <= 5 && daysUntilExpiry >= 0 && (
          <Badge variant="outline" className="h-7 text-xs text-orange-600 border-orange-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {daysUntilExpiry}j restants
          </Badge>
        )}
      </div>
    )
  }

  // ============================================================
  // Loading Skeleton
  // ============================================================
  const SkeletonRow = ({ cols = 6 }: { cols?: number }) => (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </TableCell>
      ))}
    </TableRow>
  )

  // ============================================================
  // Main Render
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Ventes & Commandes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion commerciale • {customers.length} clients • Pipeline commercial actif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createQuoteModalOpen} onOpenChange={setCreateQuoteModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Nouveau Devis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un Nouveau Devis</DialogTitle>
                <DialogDescription>Générez un devis pour un client</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select onValueChange={(v) => {/* Handle selection */}}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  La création complète des devis sera disponible prochainement avec sélection de produits.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateQuoteModalOpen(false)}>Annuler</Button>
                <Button onClick={() => {
                  toast.info('Fonctionnalité en développement')
                  setCreateQuoteModalOpen(false)
                }}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createSOModalOpen} onOpenChange={setCreateSOModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Nouvelle Commande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une Nouvelle Commande</DialogTitle>
                <DialogDescription>Créez une commande de vente pour un client</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="partner">Client *</Label>
                  <Select 
                    value={newSOForm.partnerId} 
                    onValueChange={(v) => setNewSOForm(prev => ({ ...prev, partnerId: v }))}
                  >
                    <SelectTrigger id="partner">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Conditions de paiement</Label>
                  <Select 
                    value={newSOForm.paymentTerms} 
                    onValueChange={(v) => setNewSOForm(prev => ({ ...prev, paymentTerms: v }))}
                  >
                    <SelectTrigger id="paymentTerms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="45">45 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                      <SelectItem value="cash">Comptant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerNotes">Notes client</Label>
                  <Textarea 
                    id="customerNotes"
                    placeholder="Notes visibles par le client..."
                    value={newSOForm.customerNotes}
                    onChange={(e) => setNewSOForm(prev => ({ ...prev, customerNotes: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Notes internes</Label>
                  <Textarea 
                    id="internalNotes"
                    placeholder="Notes internes uniquement..."
                    value={newSOForm.internalNotes}
                    onChange={(e) => setNewSOForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateSOModalOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateSalesOrder} disabled={actionLoading || !newSOForm.partnerId}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Créer la commande
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content - Tabs */}
      <Tabs defaultValue="commandes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="commandes" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="devis" className="gap-2">
            <FileText className="w-4 h-4" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Target className="w-4 h-4" />
            Pipeline CRM
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* COMMANDES TAB */}
        {/* ============================================================ */}
        <TabsContent value="commandes" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>Commandes de Vente</CardTitle>
                    <Badge variant="secondary">{soPagination.total} commandes</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Rechercher..." 
                        className="pl-10"
                        value={soSearch}
                        onChange={(e) => {
                          setSoSearch(e.target.value)
                          fetchSalesOrders(1, soStatusFilter, e.target.value)
                        }}
                      />
                    </div>
                    <Select value={soStatusFilter} onValueChange={(v) => {
                      setSoStatusFilter(v)
                      fetchSalesOrders(1, v, soSearch)
                    }}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous statuts</SelectItem>
                        {Object.entries(SALES_ORDER_STATUSES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => fetchSalesOrders(soPagination.page, soStatusFilter, soSearch)}
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingSO ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Commande</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant HT</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSO ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      ) : salesOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">Aucune commande trouvée</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-4"
                              onClick={() => setCreateSOModalOpen(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Créer une commande
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        salesOrders.map((order) => (
                          <TableRow key={order.id} className="group">
                            <TableCell className="font-medium font-mono text-sm">
                              {order.reference}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {order.partner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{order.partner.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(order.date)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatDZD(order.amountUntaxed)} DZD
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm">
                              {formatDZD(order.amountTotal)} DZD
                            </TableCell>
                            <TableCell>
                              <SalesOrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {renderSalesOrderActions(order)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {!loadingSO && soPagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Affichage {(soPagination.page - 1) * soPagination.limit + 1}-{Math.min(soPagination.page * soPagination.limit, soPagination.total)} sur {soPagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchSalesOrders(soPagination.page - 1, soStatusFilter, soSearch)}
                        disabled={soPagination.page <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Précédent
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(soPagination.pages, 5) }).map((_, i) => {
                          const pageNum = i + 1
                          return (
                            <Button
                              key={pageNum}
                              size="sm"
                              variant={pageNum === soPagination.page ? 'default' : 'outline'}
                              className="w-8 h-8 p-0"
                              onClick={() => fetchSalesOrders(pageNum, soStatusFilter, soSearch)}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchSalesOrders(soPagination.page + 1, soStatusFilter, soSearch)}
                        disabled={soPagination.page >= soPagination.pages}
                      >
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* DEVIS TAB */}
        {/* ============================================================ */}
        <TabsContent value="devis" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>Devis Clients</CardTitle>
                    <Badge variant="secondary">{quotePagination.total} devis</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Rechercher..." 
                        className="pl-10"
                        value={quoteSearch}
                        onChange={(e) => {
                          setQuoteSearch(e.target.value)
                          fetchQuotations(1, quoteStatusFilter, e.target.value)
                        }}
                      />
                    </div>
                    <Select value={quoteStatusFilter} onValueChange={(v) => {
                      setQuoteStatusFilter(v)
                      fetchQuotations(1, v, quoteSearch)
                    }}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous statuts</SelectItem>
                        {Object.entries(QUOTATION_STATUSES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => fetchQuotations(quotePagination.page, quoteStatusFilter, quoteSearch)}
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Devis</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Validité</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingQuotes ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      ) : quotations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">Aucun devis trouvé</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-4"
                              onClick={() => setCreateQuoteModalOpen(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Créer un devis
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        quotations.map((quotation) => {
                          const daysUntil = getDaysUntil(quotation.validUntil)
                          const expired = isExpired(quotation.validUntil)
                          
                          return (
                            <TableRow key={quotation.id} className="group">
                              <TableCell className="font-medium font-mono text-sm">
                                {quotation.reference}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {quotation.partner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{quotation.partner.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(quotation.date)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm">{formatDate(quotation.validUntil)}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      expired 
                                        ? 'text-red-600 border-red-200 bg-red-50' 
                                        : daysUntil <= 5 
                                          ? 'text-orange-600 border-orange-200 bg-orange-50'
                                          : 'text-muted-foreground'
                                    }`}
                                  >
                                    {expired ? 'Expiré' : `${daysUntil}j`}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-sm">
                                {formatDZD(quotation.amountTotal)} DZD
                              </TableCell>
                              <TableCell>
                                <QuotationStatusBadge 
                                  status={quotation.status} 
                                  validUntil={quotation.validUntil}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {renderQuotationActions(quotation)}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {!loadingQuotes && quotePagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Affichage {(quotePagination.page - 1) * quotePagination.limit + 1}-{Math.min(quotePagination.page * quotePagination.limit, quotePagination.total)} sur {quotePagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchQuotations(quotePagination.page - 1, quoteStatusFilter, quoteSearch)}
                        disabled={quotePagination.page <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Précédent
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(quotePagination.pages, 5) }).map((_, i) => {
                          const pageNum = i + 1
                          return (
                            <Button
                              key={pageNum}
                              size="sm"
                              variant={pageNum === quotePagination.page ? 'default' : 'outline'}
                              className="w-8 h-8 p-0"
                              onClick={() => fetchQuotations(pageNum, quoteStatusFilter, quoteSearch)}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchQuotations(quotePagination.page + 1, quoteStatusFilter, quoteSearch)}
                        disabled={quotePagination.page >= quotePagination.pages}
                      >
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* PIPELINE CRM TAB */}
        {/* ============================================================ */}
        <TabsContent value="pipeline" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Pipeline Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {pipelineByStage.map((stage) => (
                <Card 
                  key={stage.stage} 
                  className={`border-2 ${stage.color} transition-all hover:shadow-md`}
                >
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {stage.label}
                      </span>
                      <Badge variant="secondary" className={stage.textColor}>
                        {stage.count}
                      </Badge>
                    </div>
                    <p className={`text-2xl font-bold ${stage.textColor}`}>
                      {formatDZD(stage.value)} DZD
                    </p>
                    <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
                      {stage.opportunities.slice(0, 3).map(opp => (
                        <div key={opp.id} className="text-xs truncate text-muted-foreground">
                          • {opp.name}
                        </div>
                      ))}
                      {stage.count > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{stage.count - 3} autre(s)...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total Pipeline Value */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valeur totale du pipeline</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatDZD(totalPipelineValue)} DZD
                    </p>
                  </div>
                  <Target className="w-12 h-12 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            {/* Opportunities List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Opportunités en Cours</CardTitle>
                    <CardDescription>{opportunities.length} opportunités dans le pipeline</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => fetchOpportunities()}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingCRM ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Opportunité</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Étape</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Revenu Estimé</TableHead>
                        <TableHead>Probabilité</TableHead>
                        <TableHead>Clôture Prévue</TableHead>
                        <TableHead>Responsable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCRM ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                      ) : opportunities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">Aucune opportunité trouvée</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        opportunities.map((opp) => {
                          const stageConfig = CRM_STAGES.find(s => s.stage === opp.stage) || CRM_STAGES[0]
                          
                          return (
                            <TableRow key={opp.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {opp.reference}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{opp.name}</p>
                                  {opp.contactName && (
                                    <p className="text-xs text-muted-foreground">{opp.contactName}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {opp.partner ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span>{opp.partner.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${stageConfig.color}`}>
                                  Étape {opp.stage}: {stageConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <OpportunityStatusBadge status={opp.status} />
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {formatDZD(opp.expectedRevenue)} DZD
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${opp.probability}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{opp.probability}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {opp.expectedCloseDate ? formatDate(opp.expectedCloseDate) : '-'}
                              </TableCell>
                              <TableCell>
                                {opp.assignedTo ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {opp.assignedTo.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{opp.assignedTo.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Non assigné</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Convert Quotation to SO Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir le Devis en Commande</DialogTitle>
            <DialogDescription>
              Transformer ce devis en commande de vente confirmée
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">N° Devis:</span>
                  <span className="font-mono font-medium">{selectedQuotation.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedQuotation.partner.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Montant TTC:</span>
                  <span className="font-semibold">{formatDZD(selectedQuotation.amountTotal)} DZD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Articles:</span>
                  <span>{selectedQuotation.lines.length} ligne(s)</span>
                </div>
              </div>
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Le devis sera marqué comme &quot;Converti&quot; et une nouvelle commande sera créée.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConvertModalOpen(false)
              setSelectedQuotation(null)
            }}>
              Annuler
            </Button>
            <Button onClick={handleConvertToSO} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Convertir en Commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Import Alert component for the convert modal
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
