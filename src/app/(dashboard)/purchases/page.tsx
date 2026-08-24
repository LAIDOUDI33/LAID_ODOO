'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ShoppingCart,
  Truck,
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit3,
  PackageCheck,
  Send,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Filter,
  MoreVertical,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  // Workflow icons
  ClipboardList,
  ArrowRight,
  Receipt,
  CreditCard,
  CircleDot,
  CircleCheckBig,
  PackageOpen,
  Banknote,
  Workflow,
  ChevronDown,
  Play,
  HandCoins,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// ============================================================
// Types & Interfaces
// ============================================================

interface PurchaseOrderLine {
  id?: string
  productId: string
  description?: string
  quantity: number
  unitPrice: number
  discountRate?: number
  tvaRate?: number
  product?: {
    id: string
    code: string
    name: string
  }
}

interface Partner {
  id: string
  name: string
  displayName?: string
  type: string
}

interface Product {
  id: string
  code: string
  name: string
  purchasePrice: number
  tvaRate: number
}

interface PurchaseOrder {
  id: string
  reference: string
  partnerId: string
  partner?: Partner
  date: string
  expectedDate?: string | null
  receiptDate?: string | null
  status: string
  amountUntaxed: number
  amountTax: number
  amountTotal: number
  amountReceived: number
  amountBilled: number
  paymentTerms?: string | null
  paymentMode?: string | null
  incoterm?: string | null
  internalNotes?: string | null
  supplierNotes?: string | null
  lines: PurchaseOrderLine[]
  bills?: Array<{ id: string; reference: string; status: string; amountTotal: number }>
}

interface PurchasesApiResponse {
  success: boolean
  data: PurchaseOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface KpiData {
  totalOrders: number
  monthlyPurchases: number
  activeSuppliers: number
  pendingOrders: number
  monthlyChange: number
}

// ============================================================
// Status Configuration (French Labels)
// ============================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: FileText,
  },
  sent: {
    label: 'Envoyée',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Send,
  },
  confirmed: {
    label: 'Confirmée',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: CheckCircle,
  },
  received: {
    label: 'Reçue',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: PackageCheck,
  },
  billed: {
    label: 'Facturée',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: FileText,
  },
  done: {
    label: 'Terminée',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Annulée',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
}

const STATUS_TABS = [
  { value: 'all', label: 'Toutes' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'sent', label: 'Envoyées' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'received', label: 'Reçues' },
  { value: 'done', label: 'Terminées' },
]

// ============================================================
// Workflow Pipeline Configuration (French Labels)
// ============================================================

interface WorkflowStage {
  id: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  statuses: string[]
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'request',
    label: 'Demande d\'Achat',
    description: 'Demandes en attente de validation',
    icon: ClipboardList,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    statuses: ['draft'],
  },
  {
    id: 'order',
    label: 'Commande Fournisseur',
    description: 'Commandes envoyées/confirmées',
    icon: ShoppingCart,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    statuses: ['sent', 'confirmed'],
  },
  {
    id: 'receipt',
    label: 'Réception Marchandise',
    description: 'Marchandises à réceptionner',
    icon: PackageOpen,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    statuses: ['received'],
  },
  {
    id: 'bill',
    label: 'Facture Fournisseur',
    description: 'Factures en attente de paiement',
    icon: Receipt,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    statuses: ['billed'],
  },
  {
    id: 'payment',
    label: 'Paiement Effectué',
    description: 'Cycle d\'achat terminé',
    icon: CreditCard,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    statuses: ['done'],
  },
]

// Workflow Actions Configuration
interface WorkflowActionConfig {
  id: string
  label: string
  icon: React.ElementType
  variant: 'default' | 'outline' | 'destructive' | 'secondary'
  className: string
  fromStatuses: string[]
  action: string
}

const WORKFLOW_ACTIONS: WorkflowActionConfig[] = [
  {
    id: 'send',
    label: 'Envoyer',
    icon: Send,
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-700',
    fromStatuses: ['draft'],
    action: 'send',
  },
  {
    id: 'confirm',
    label: 'Confirmer',
    icon: CheckCircle,
    variant: 'default',
    className: 'bg-indigo-600 hover:bg-indigo-700',
    fromStatuses: ['sent'],
    action: 'confirm',
  },
  {
    id: 'receive',
    label: 'Réceptionner',
    icon: PackageCheck,
    variant: 'secondary',
    className: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
    fromStatuses: ['confirmed'],
    action: 'receive',
  },
  {
    id: 'bill',
    label: 'Facturer',
    icon: FileText,
    variant: 'default',
    className: 'bg-purple-600 hover:bg-purple-700',
    fromStatuses: ['received', 'confirmed'],
    action: 'bill',
  },
  {
    id: 'pay',
    label: 'Payer',
    icon: HandCoins,
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-700',
    fromStatuses: ['billed'],
    action: 'pay',
  },
]

// ============================================================
// Utility Functions
// ============================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'bg-gray-100 text-gray-700',
    icon: FileText,
  }
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} gap-1.5 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

// ============================================================
// Loading Skeleton Component
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Error View Component
// ============================================================

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Erreur de chargement</h3>
            <p className="text-muted-foreground mt-1">
              Impossible de charger les commandes d&apos;achat. Veuillez réessayer.
            </p>
          </div>
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Empty State Component
// ============================================================

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Aucune commande d&apos;achat</h3>
            <p className="text-muted-foreground mt-1">
              Commencez par créer votre première commande d&apos;achat.
            </p>
          </div>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle Commande
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Workflow Pipeline Component
// ============================================================

interface WorkflowPipelineProps {
  orders: PurchaseOrder[]
  onStageClick: (stageId: string | null) => void
  activeStage: string | null
}

function WorkflowPipeline({ orders, onStageClick, activeStage }: WorkflowPipelineProps) {
  // Calculate counts for each stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    WORKFLOW_STAGES.forEach((stage) => {
      counts[stage.id] = orders.filter((order) =>
        stage.statuses.includes(order.status)
      ).length
    })
    
    return counts
  }, [orders])

  // Calculate overall progress (percentage of done orders)
  const totalOrders = orders.filter((o) => o.status !== 'cancelled').length
  const completedOrders = stageCounts['payment'] || 0
  const progressPercent = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Flux de Travail Achats</h3>
                <p className="text-sm text-muted-foreground">
                  {completedOrders} sur {totalOrders || 0} commandes complétées
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Progress value={progressPercent} className="flex-1 md:w-40 h-2" />
              <span className="text-sm font-medium text-primary min-w-[45px]">{progressPercent}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {WORKFLOW_STAGES.map((stage, index) => {
          const Icon = stage.icon
          const count = stageCounts[stage.id] || 0
          const isActive = activeStage === stage.id

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                  isActive
                    ? `${stage.bgColor} ${stage.borderColor} border-2 ring-2 ring-primary/20`
                    : 'border-transparent hover:border-muted-foreground/20'
                }`}
                onClick={() => onStageClick(isActive ? null : stage.id)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-xl ${stage.bgColor} ${
                        isActive ? 'ring-2 ring-current opacity-100' : 'opacity-80'
                      }`}
                    >
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stage.color}`} />
                    </div>

                    {/* Label */}
                    <p className="font-medium text-xs md:text-sm leading-tight">{stage.label}</p>

                    {/* Count Badge */}
                    <Badge
                      variant={count > 0 ? 'default' : 'secondary'}
                      className={`text-xs font-bold px-2 py-0.5 ${
                        count > 0
                          ? `${stage.bgColor} ${stage.color} border-0`
                          : ''
                      }`}
                    >
                      {count}
                    </Badge>

                    {/* Arrow (except last) */}
                    {index < WORKFLOW_STAGES.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mobile arrow between cards */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div className="flex justify-center lg:hidden -my-1">
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Stage Description */}
      {activeStage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const stage = WORKFLOW_STAGES.find((s) => s.id === activeStage)
                  if (!stage) return null
                  const Icon = stage.icon
                  return (
                    <>
                      <Icon className={`w-5 h-5 ${stage.color}`} />
                      <div>
                        <p className="font-medium">{stage.label}</p>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                    </>
                  )
                })()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStageClick(null)}
              >
                Effacer le filtre
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// Goods Receipt Modal Component
// ============================================================

interface GoodsReceiptModalProps {
  open: boolean
  onClose: () => void
  order: PurchaseOrder | null
  onSubmit: (data: { lines: Array<{ lineId: string; quantity: number }>; notes?: string }) => Promise<void>
  loading: boolean
}

export function GoodsReceiptModal({
  open,
  onClose,
  order,
  onSubmit,
  loading,
}: GoodsReceiptModalProps) {
  // Initialize state from order - using lazy initializer
  // Note: Parent component uses `key={order?.id}` to force remount on order change
  const [receiptLines, setReceiptLines] = useState<Array<{ lineId: string; quantity: number; maxQty: number }>>(() => {
    if (!order) return []
    return order.lines.map((line) => ({
      lineId: line.id!,
      quantity: Math.max(0, line.quantity - (line as any).quantityReceived || 0),
      maxQty: line.quantity - ((line as any).quantityReceived || 0),
    }))
  })
  
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validate at least one line has quantity > 0
    const validLines = receiptLines.filter((l) => l.quantity > 0)
    if (validLines.length === 0) {
      toast.error('Veuillez spécifier au moins une quantité à recevoir')
      return
    }

    await onSubmit({
      lines: validLines.map((l) => ({ lineId: l.lineId, quantity: l.quantity })),
      notes,
    })
  }

  function updateLineQuantity(lineId: string, quantity: number) {
    setReceiptLines((prev) =>
      prev.map((l) =>
        l.lineId === lineId
          ? { ...l, quantity: Math.min(Math.max(0, quantity), l.maxQty) }
          : l
      )
    )
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-cyan-600" />
            Réception Marchandise - {order.reference}
          </DialogTitle>
          <DialogDescription>
            Enregistrez la réception des marchandises pour cette commande
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fournisseur:</span>
                  <p className="font-medium">{order.partner?.displayName || order.partner?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total TTC:</span>
                  <p className="font-medium">{formatCurrency(order.amountTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Lines */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Quantités à Recevoir</Label>
            
            <div className="space-y-3">
              {receiptLines.map((line, index) => {
                const poLine = order.lines.find((l) => l.id === line.lineId)
                
                return (
                  <Card key={line.lineId} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {poLine?.description || poLine?.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Commandé: {poLine?.quantity} | 
                          Déjà reçu: {(poLine as any)?.quantityReceived || 0} | 
                          Restant: {line.maxQty}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={line.maxQty}
                          value={line.quantity}
                          onChange={(e) => updateLineQuantity(line.lineId, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right"
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          / {line.maxQty}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="receiptNotes">Notes de réception</Label>
            <Textarea
              id="receiptNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observations sur la réception..."
            />
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <PackageCheck className="w-4 h-4" />
              Valider la Réception
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Create/Edit PO Modal Component
// ============================================================

interface PurchaseOrderModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreatePOFormData) => Promise<void>
  editingOrder?: PurchaseOrder | null
  loading: boolean
}

interface CreatePOFormData {
  partnerId: string
  expectedDate?: string
  paymentTerms?: string
  incoterm?: string
  internalNotes?: string
  supplierNotes?: string
  lines: PurchaseOrderLine[]
}

export function PurchaseOrderModal({
  open,
  onClose,
  onSubmit,
  editingOrder,
  loading,
}: PurchaseOrderModalProps) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreatePOFormData>({
    partnerId: '',
    expectedDate: '',
    paymentTerms: '30',
    incoterm: '',
    internalNotes: '',
    supplierNotes: '',
    lines: [{ productId: '', quantity: 1, unitPrice: 0, tvaRate: 19 }],
  })

  // Load partners and products on mount
  useEffect(() => {
    if (open) {
      loadPartners()
      loadProducts()
      
      if (editingOrder) {
        setFormData({
          partnerId: editingOrder.partnerId,
          expectedDate: editingOrder.expectedDate
            ? new Date(editingOrder.expectedDate).toISOString().split('T')[0]
            : '',
          paymentTerms: editingOrder.paymentTerms || '30',
          incoterm: editingOrder.incoterm || '',
          internalNotes: editingOrder.internalNotes || '',
          supplierNotes: editingOrder.supplierNotes || '',
          lines:
            editingOrder.lines.length > 0
              ? editingOrder.lines.map((l) => ({
                  id: l.id,
                  productId: l.productId,
                  description: l.description,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  discountRate: l.discountRate,
                  tvaRate: l.tvaRate,
                }))
              : [{ productId: '', quantity: 1, unitPrice: 0, tvaRate: 19 }],
        })
      } else {
        setFormData({
          partnerId: '',
          expectedDate: '',
          paymentTerms: '30',
          incoterm: '',
          internalNotes: '',
          supplierNotes: '',
          lines: [{ productId: '', quantity: 1, unitPrice: 0, tvaRate: 19 }],
        })
      }
    }
  }, [open, editingOrder])

  async function loadPartners() {
    setLoadingPartners(true)
    try {
      const res = await fetch('/api/partners?type=supplier')
      const json = await res.json()
      if (json.success) setPartners(json.data)
    } catch (error) {
      console.error('Error loading partners:', error)
    } finally {
      setLoadingPartners(false)
    }
  }

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/products?limit=100')
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  function updateField(field: keyof CreatePOFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function updateLine(index: number, field: keyof PurchaseOrderLine, value: any) {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }))
  }

  function addLine() {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { productId: '', quantity: 1, unitPrice: 0, tvaRate: 19 },
      ],
    }))
  }

  function removeLine(index: number) {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }))
  }

  // Calculate totals
  const totals = useMemo(() => {
    let amountUntaxed = 0
    let amountTax = 0

    for (const line of formData.lines) {
      const qty = line.quantity || 0
      const price = line.unitPrice || 0
      const discount = line.discountRate || 0
      const tvaRate = line.tvaRate ?? 19

      const lineTotal = qty * price * (1 - discount / 100)
      amountUntaxed += lineTotal
      amountTax += lineTotal * (tvaRate / 100)
    }

    return {
      amountUntaxed: Math.round(amountUntaxed * 100) / 100,
      amountTax: Math.round(amountTax * 100) / 100,
      amountTotal: Math.round((amountUntaxed + amountTax) * 100) / 100,
    }
  }, [formData.lines])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate
    if (!formData.partnerId) {
      toast.error('Veuillez sélectionner un fournisseur')
      return
    }

    const validLines = formData.lines.filter(
      (l) => l.productId && l.quantity > 0 && l.unitPrice >= 0
    )
    if (validLines.length === 0) {
      toast.error('Veuillez ajouter au moins une ligne de commande valide')
      return
    }

    await onSubmit({
      ...formData,
      lines: validLines.map((l) => ({
        ...l,
        product: undefined,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingOrder ? `Modifier ${editingOrder.reference}` : 'Nouvelle Commande d\'Achat'}
          </DialogTitle>
          <DialogDescription>
            {editingOrder
              ? 'Modifiez les informations de la commande d\'achat'
              : 'Créez une nouvelle commande d\'achat auprès d\'un fournisseur'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partner">Fournisseur *</Label>
              <Select
                value={formData.partnerId}
                onValueChange={(v) => updateField('partnerId', v)}
                disabled={loadingPartners}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDate">Date de livraison prévue</Label>
              <Input
                id="expectedDate"
                type="date"
                value={formData.expectedDate}
                onChange={(e) => updateField('expectedDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Conditions de paiement</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(v) => updateField('paymentTerms', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="45">45 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incoterm">Incoterm</Label>
              <Select
                value={formData.incoterm}
                onValueChange={(v) => updateField('incoterm', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  <SelectItem value="EXW">EXW (Départ usine)</SelectItem>
                  <SelectItem value="FCA">FCA</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="DDP">DDP (Rendu destination)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Order Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Lignes de commande</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter ligne
              </Button>
            </div>

            <div className="space-y-3">
              {formData.lines.map((line, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <Label className="text-xs">Produit *</Label>
                      <Select
                        value={line.productId}
                        onValueChange={(v) => {
                          updateLine(index, 'productId', v)
                          // Auto-fill price and TVA from product
                          const product = products.find((p) => p.id === v)
                          if (product) {
                            updateLine(index, 'unitPrice', product.purchasePrice)
                            updateLine(index, 'tvaRate', product.tvaRate)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-xs">Quantité *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-xs">Prix unitaire (HT)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-2 md:col-span-2 space-y-1">
                      <Label className="text-xs">TVA %</Label>
                      <Select
                        value={String(line.tvaRate ?? 19)}
                        onValueChange={(v) =>
                          updateLine(index, 'tvaRate', parseInt(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="9">9%</SelectItem>
                          <SelectItem value="19">19%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 flex justify-end">
                      {formData.lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                        >
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Totals */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex justify-end">
                <div className="space-y-2 w-64">
                  <div className="flex justify-between text-sm">
                    <span>Total HT:</span>
                    <span className="font-medium">{formatCurrency(totals.amountUntaxed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>TVA:</span>
                    <span className="font-medium">{formatCurrency(totals.amountTax)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total TTC:</span>
                    <span>{formatCurrency(totals.amountTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Notes internes</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => updateField('internalNotes', e.target.value)}
                rows={3}
                placeholder="Notes visibles uniquement en interne..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierNotes">Notes fournisseur</Label>
              <Textarea
                id="supplierNotes"
                value={formData.supplierNotes}
                onChange={(e) => updateField('supplierNotes', e.target.value)}
                rows={3}
                placeholder="Notes qui apparaîtront sur le document..."
              />
            </div>
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingOrder ? 'Modifier' : 'Créer'} la commande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// PO Detail Modal Component
// ============================================================

interface PODetailModalProps {
  order: PurchaseOrder | null
  open: boolean
  onClose: () => void
  onStatusChange: (id: string, action: string) => Promise<void>
  onEdit: () => void
  loading: boolean
}

export function PODetailModal({
  order,
  open,
  onClose,
  onStatusChange,
  onEdit,
  loading,
}: PODetailModalProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{order.reference}</DialogTitle>
              <DialogDescription className="mt-1">
                Commande du {formatDate(order.date)}
              </DialogDescription>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations Fournisseur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fournisseur:</span>
                  <p className="font-medium">{order.partner?.displayName || order.partner?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Conditions paiement:</span>
                  <p className="font-medium">{order.paymentTerms ? `${order.paymentTerms} jours` : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode de paiement:</span>
                  <p className="font-medium">{order.paymentMode || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Incoterm:</span>
                  <p className="font-medium">{order.incoterm || '-'}</p>
                </div>
                {order.expectedDate && (
                  <div>
                    <span className="text-muted-foreground">Livraison prévue:</span>
                    <p className="font-medium">{formatDate(order.expectedDate)}</p>
                  </div>
                )}
                {order.receiptDate && (
                  <div>
                    <span className="text-muted-foreground">Date de réception:</span>
                    <p className="font-medium">{formatDate(order.receiptDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lines Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Articles commandés</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((line, idx) => (
                    <TableRow key={line.id || idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.description || line.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{line.product?.code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                      <TableCell className="text-right">{line.tvaRate}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.amountTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex justify-end">
                <div className="space-y-2 w-72">
                  <div className="flex justify-between text-sm">
                    <span>Total HT:</span>
                    <span className="font-medium">{formatCurrency(order.amountUntaxed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total TVA:</span>
                    <span className="font-medium">{formatCurrency(order.amountTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Montant reçu:</span>
                    <span className="font-medium">{formatCurrency(order.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Montant facturé:</span>
                    <span className="font-medium">{formatCurrency(order.amountBilled)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total TTC:</span>
                    <span className="text-primary">{formatCurrency(order.amountTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(order.internalNotes || order.supplierNotes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.internalNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes internes:</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{order.internalNotes}</p>
                  </div>
                )}
                {order.supplierNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes fournisseur:</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{order.supplierNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            {order.status === 'draft' && (
              <>
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  onClick={() => onStatusChange(order.id, 'send')}
                  disabled={loading}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </>
            )}
            {order.status === 'sent' && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, 'confirm')}
                disabled={loading}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmer
              </Button>
            )}
            {order.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, 'receive')}
                disabled={loading}
                className="gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Réceptionner
              </Button>
            )}
            {(order.status === 'received' || order.status === 'confirmed') && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onStatusChange(order.id, 'bill')}
                disabled={loading}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="w-4 h-4" />
                Facturer
              </Button>
            )}
            {!['done', 'cancelled'].includes(order.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onStatusChange(order.id, 'cancel')}
                disabled={loading}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main Purchases Page Component
// ============================================================

export default function PurchasesPage() {
  // Data state
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
  }>({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  
  // Workflow state
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<string | null>(null)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Debounced search
  const debouncedSearch = useMemo(() => searchQuery, [searchQuery])

  // Fetch purchase orders
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', String(pagination.limit))

      if (activeTab !== 'all') {
        params.set('status', activeTab)
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      const response = await fetch(`/api/purchases?${params.toString()}`)
      const data: PurchasesApiResponse = await response.json()

      if (data.success) {
        setOrders(data.data)
        setPagination((prev) => ({
          ...prev,
          ...data.pagination,
        }))

        // Calculate KPIs from fetched data
        calculateKPIs(data.data)
      } else {
        setError(data.error || 'Erreur lors du chargement des données')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Erreur réseau. Veuillez vérifier votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, activeTab, debouncedSearch])

  // Calculate KPIs from orders
  const calculateKPIs = useCallback((ordersList: PurchaseOrder[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthlyOrders = ordersList.filter((o) => {
      const orderDate = new Date(o.date)
      return (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      )
    })

    const monthlyPurchases = monthlyOrders.reduce(
      (sum, o) => sum + o.amountTotal,
      0
    )

    const uniqueSuppliers = new Set(ordersList.map((o) => o.partnerId)).size
    const pendingOrders = ordersList.filter(
      (o) => ['draft', 'sent', 'confirmed'].includes(o.status)
    ).length

    setKpiData({
      totalOrders: ordersList.length,
      monthlyPurchases,
      activeSuppliers: uniqueSuppliers,
      pendingOrders,
      monthlyChange: 5.2, // Would need historical data for real calculation
    })
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Handle page change
  function handlePageChange(newPage: number) {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  // Handle tab change
  function handleTabChange(value: string) {
    setActiveTab(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Handle search
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Create PO handler
  async function handleCreatePO(data: CreatePOFormData) {
    setActionLoading(true)
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Commande créée avec succès')
        setCreateModalOpen(false)
        fetchOrders()
      } else {
        toast.error(result.error || 'Erreur lors de la création')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  // Update PO handler
  async function handleUpdatePO(data: CreatePOFormData) {
    if (!selectedOrder) return

    setActionLoading(true)
    try {
      const response = fetch(`/api/purchases/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((res) => res.json())

      const result = await response

      if (result.success) {
        toast.success('Commande modifiée avec succès')
        setCreateModalOpen(false)
        setSelectedOrder(null)
        fetchOrders()
      } else {
        toast.error(result.error || 'Erreur lors de la modification')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  // Status change handler
  async function handleStatusChange(id: string, action: string) {
    setActionLoading(true)
    try {
      let url = `/api/purchases/${id}`
      let options: RequestInit = {}

      switch (action) {
        case 'send':
          url += '?action=send'
          options.method = 'POST'
          break
        case 'confirm':
          url += '?action=confirm'
          options.method = 'POST'
          break
        case 'receive':
          // For receive, we need to send the lines data
          options.method = 'POST'
          options.headers = { 'Content-Type': 'application/json' }
          options.body = JSON.stringify({ 
            action: 'receive',
            lines: (order?.lines || []).map((l: PurchaseOrderLine) => ({
              lineId: l.id,
              quantity: l.quantity - (l as any).quantityReceived
            })).filter((l: any) => l.quantity > 0)
          })
          break
        case 'bill':
          url += '?action=bill'
          options.method = 'POST'
          options.headers = { 'Content-Type': 'application/json' }
          options.body = JSON.stringify({})
          break
        case 'cancel':
          options.method = 'DELETE'
          break
        default:
          throw new Error(`Action inconnue: ${action}`)
      }

      const response = await fetch(url, options)
      const result = await response.json()

      if (result.success) {
        // Show SCF journal entry info if bill created
        if (action === 'bill' && result.workflowInfo?.journalEntryGenerated) {
          toast.success(result.message || 'Facture fournisseur créée ✓ Écriture comptable SCF générée', { duration: 5000 })
        } else {
          toast.success(result.message || 'Statut mis à jour')
        }
        setDetailModalOpen(false)
        setSelectedOrder(null)
        fetchOrders()
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  // Open detail modal
  function openDetailModal(order: PurchaseOrder) {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  // Open edit modal
  function openEditModal() {
    setDetailModalOpen(false)
    setCreateModalOpen(true)
  }

  // Open receipt modal
  function openReceiptModal(order: PurchaseOrder) {
    setSelectedOrder(order)
    setReceiptModalOpen(true)
  }

  // Handle workflow stage click
  function handleWorkflowStageClick(stageId: string | null) {
    setActiveWorkflowStage(stageId)
    // When a stage is selected, we filter the orders locally
    if (stageId) {
      const stage = WORKFLOW_STAGES.find((s) => s.id === stageId)
      if (stage) {
        // Set active tab to show all, then we'll filter by workflow stage
        setActiveTab('all')
      }
    }
  }

  // Get filtered orders based on workflow stage
  const filteredOrders = useMemo(() => {
    if (!activeWorkflowStage) return orders
    const stage = WORKFLOW_STAGES.find((s) => s.id === activeWorkflowStage)
    if (!stage) return orders
    return orders.filter((order) => stage.statuses.includes(order.status))
  }, [orders, activeWorkflowStage])

  // Goods receipt handler
  async function handleGoodsReceipt(data: { lines: Array<{ lineId: string; quantity: number }>; notes?: string }) {
    if (!selectedOrder) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/purchases/${selectedOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Marchandises réceptionnées avec succès')
        setReceiptModalOpen(false)
        setSelectedOrder(null)
        fetchOrders()
      } else {
        toast.error(result.error || 'Erreur lors de la réception')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  // Quick action handler for table row buttons
  async function handleQuickAction(order: PurchaseOrder, action: string) {
    if (action === 'receive') {
      openReceiptModal(order)
      return
    }
    
    // For other actions, use existing status change handler
    setSelectedOrder(order)
    await handleStatusChange(order.id, action)
  }

  // Get available actions for an order
  function getOrderActions(order: PurchaseOrder): WorkflowActionConfig[] {
    return WORKFLOW_ACTIONS.filter((action) =>
      action.fromStatuses.includes(order.status)
    )
  }

  // KPI cards configuration
  const kpiCards = useMemo(() => {
    if (!kpiData) return []

    return [
      {
        title: 'Commandes Fournisseurs',
        value: kpiData.totalOrders,
        change: -8.5,
        icon: ShoppingCart,
        iconColor: 'text-dz-green',
        iconBg: 'bg-dz-green/10',
        format: 'number' as const,
      },
      {
        title: "Achats du Mois (DZD)",
        value: kpiData.monthlyPurchases,
        change: kpiData.monthlyChange,
        icon: FileText,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        format: 'currency' as const,
      },
      {
        title: 'Fournisseurs Actifs',
        value: kpiData.activeSuppliers,
        change: 2,
        icon: Truck,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        format: 'number' as const,
      },
      {
        title: 'Commandes en Attente',
        value: kpiData.pendingOrders,
        change: null,
        icon: Clock,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        format: 'number' as const,
      },
    ]
  }, [kpiData])

  // Loading state
  if (loading && orders.length === 0) {
    return <LoadingSkeleton />
  }

  // Error state
  if (error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Achats
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion des achats et relations fournisseurs
            </p>
          </div>
        </div>
        <ErrorView onRetry={() => { setError(null); fetchOrders(); }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Achats
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des achats et relations fournisseurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fetchOrders()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => {
              setSelectedOrder(null)
              setCreateModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle Commande
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="commandes" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger
              value="workflow"
              onClick={() => {
                setActiveTab('all')
                setActiveWorkflowStage(null)
              }}
              className="text-xs sm:text-sm gap-1.5"
            >
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline">Workflow</span>
            </TabsTrigger>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                onClick={() => {
                  handleTabChange(tab.value)
                  setActiveWorkflowStage(null)
                }}
                className="text-xs sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par réf ou fournisseur..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Workflow Tab Content */}
        <TabsContent value="workflow" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Workflow Pipeline */}
            <WorkflowPipeline
              orders={orders}
              onStageClick={handleWorkflowStageClick}
              activeStage={activeWorkflowStage}
            />

            {/* Filtered Orders Table (when a stage is selected) */}
            {activeWorkflowStage && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {(() => {
                        const stage = WORKFLOW_STAGES.find((s) => s.id === activeWorkflowStage)
                        return stage ? stage.label : 'Documents'
                      })()}
                      <Badge variant="secondary" className="ml-2">
                        {filteredOrders.length}
                      </Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Référence</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead className="text-right">Total TTC</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions Workflow</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Aucun document dans cette étape du workflow
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.reference}</TableCell>
                              <TableCell>{order.partner?.displayName || order.partner?.name}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(order.amountTotal)}</TableCell>
                              <TableCell>{formatDate(order.date)}</TableCell>
                              <TableCell><StatusBadge status={order.status} /></TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDetailModal(order)}
                                    className="gap-1"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {getOrderActions(order).map((action) => {
                                    const ActionIcon = action.icon
                                    return (
                                      <Button
                                        key={action.id}
                                        variant={action.variant as 'default' | 'outline' | 'destructive' | 'secondary'}
                                        size="sm"
                                        onClick={() => handleQuickAction(order, action.action)}
                                        className={`gap-1 h-8 px-2 text-xs ${action.className}`}
                                        title={action.label}
                                      >
                                        <ActionIcon className="w-3.5 h-3.5" />
                                        <span className="hidden md:inline">{action.label}</span>
                                      </Button>
                                    )
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Panel when no stage selected */}
            {!activeWorkflowStage && (
              <Card className="border-dashed">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Workflow className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Flux de Travail des Achats</h3>
                      <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Sélectionnez une étape du pipeline ci-dessus pour voir les documents correspondants 
                        et effectuer les actions de workflow.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {WORKFLOW_STAGES.map((stage) => {
                        const Icon = stage.icon
                        const count = orders.filter((o) => stage.statuses.includes(o.status)).length
                        return (
                          <Button
                            key={stage.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowStageClick(stage.id)}
                            disabled={count === 0}
                            className="gap-2"
                          >
                            <Icon className={`w-4 h-4 ${stage.color}`} />
                            {stage.label}
                            {count > 0 && (
                              <Badge variant="secondary" className="ml-1">{count}</Badge>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* Commandes Tab */}
        <TabsContent value="commandes" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Commandes d&apos;Achat
                    <Badge variant="secondary" className="ml-2">
                      {pagination.total}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Page {pagination.page} sur {pagination.totalPages || 1}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 && !loading ? (
                  <EmptyState onCreateNew={() => setCreateModalOpen(true)} />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Référence</TableHead>
                            <TableHead>Fournisseur</TableHead>
                            <TableHead className="text-right">Montant HT</TableHead>
                            <TableHead className="text-right">TVA</TableHead>
                            <TableHead className="text-right">Total TTC</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Livraison</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            [...Array(5)].map((_, i) => (
                              <TableRow key={i}>
                                {[...Array(9)].map((_, j) => (
                                  <TableCell key={j}>
                                    <Skeleton className="h-5 w-full" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : (
                            orders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.reference}</TableCell>
                                <TableCell>{order.partner?.displayName || order.partner?.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(order.amountUntaxed)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(order.amountTax)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(order.amountTotal)}</TableCell>
                                <TableCell>{formatDate(order.date)}</TableCell>
                                <TableCell>{order.expectedDate ? formatDate(order.expectedDate) : '-'}</TableCell>
                                <TableCell><StatusBadge status={order.status} /></TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openDetailModal(order)} className="gap-1">
                                      <Eye className="w-4 h-4" />
                                      <span className="hidden sm:inline">Voir</span>
                                    </Button>
                                    {/* Quick workflow actions */}
                                    {getOrderActions(order).slice(0, 2).map((action) => {
                                      const ActionIcon = action.icon
                                      return (
                                        <Button
                                          key={action.id}
                                          variant={action.variant as 'default' | 'outline' | 'destructive' | 'secondary'}
                                          size="sm"
                                          onClick={() => handleQuickAction(order, action.action)}
                                          className={`gap-1 h-8 px-2 text-xs ${action.className}`}
                                          title={action.label}
                                        >
                                          <ActionIcon className="w-3.5 h-3.5" />
                                          <span className="hidden lg:inline">{action.label}</span>
                                        </Button>
                                      )
                                    })}
                                    {getOrderActions(order).length > 2 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDetailModal(order)}
                                        className="gap-1 h-8 px-2"
                                        title="Plus d'actions"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                          Affichage de{' '}
                          {(pagination.page - 1) * pagination.limit + 1} à{' '}
                          {Math.min(
                            pagination.page * pagination.limit,
                            pagination.total
                          )}{' '}
                          sur {pagination.total} commandes
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrev || loading}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Précédent
                          </Button>
                          {[...Array(pagination.totalPages)]
                            .map((_, i) => i + 1)
                            .filter(
                              (page) =>
                                page === 1 ||
                                page === pagination.totalPages ||
                                Math.abs(page - pagination.page) <= 1
                            )
                            .map((page, idx, arr) => (
                              <React.Fragment key={page}>
                                {idx > 0 &&
                                  arr[idx - 1] !== page - 1 && (
                                    <span className="px-1">...</span>
                                  )}
                                <Button
                                  variant={
                                    page === pagination.page ? 'default' : 'outline'
                                  }
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                  disabled={loading}
                                  className="w-9"
                                >
                                  {page}
                                </Button>
                              </React.Fragment>
                            ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNext || loading}
                          >
                            Suivant
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <PurchaseOrderModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setSelectedOrder(null)
        }}
        onSubmit={selectedOrder ? handleUpdatePO : handleCreatePO}
        editingOrder={selectedOrder}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      <PODetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedOrder(null)
        }}
        onStatusChange={handleStatusChange}
        onEdit={openEditModal}
        loading={actionLoading}
      />

      {/* Goods Receipt Modal */}
      <GoodsReceiptModal
        key={selectedOrder?.id || 'receipt-modal'}
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onSubmit={handleGoodsReceipt}
        loading={actionLoading}
      />
    </div>
  )
}
