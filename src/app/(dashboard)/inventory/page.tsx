'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Package, 
  AlertTriangle, 
  TrendingDown,
  Plus,
  Search,
  Barcode,
  Truck,
  Warehouse,
  Edit3,
  Eye,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  PlusCircle,
  Save,
  Loader2,
  Inbox,
  AlertOctagon,
  ArrowUpDown,
  BarChart3,
  PieChart,
  Activity,
  ClipboardList,
  ArrowRightLeft,
  Scale,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  DollarSign,
  Boxes,
  Zap,
  Clock
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
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/dashboard/kpi-card'
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
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// Charts imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts'

// Types
interface Product {
  id: string
  code: string
  name: string
  nameAr?: string | null
  description?: string | null
  type: string
  salePrice: number
  purchasePrice: number
  costPrice: number
  tvaRate: number
  trackStock: boolean
  unitOfMeasure: string
  categoryId?: string | null
  category?: { id: string; name: string } | null
  image?: string | null
  isActive: boolean
  canBeSold: boolean
  canBePurchased: boolean
  createdAt: string
}

interface StockLevel {
  id: string
  quantity: number
  reservedQty: number
  availableQty: number
  minQty: number
  maxQty: number
  productId: string
  warehouseId: string
  locationId?: string | null
  product: Product & { category?: { id: string; name: string } | null }
  warehouse: { id: string; name: string; code: string }
  location?: { id: string; name: string; code: string } | null
  movements?: StockMovement[]
}

interface StockMovement {
  id: string
  reference: string
  date: string
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  notes?: string | null
  productId: string
  warehouseId: string
  locationId?: string | null
  product?: Product
  warehouse?: { id: string; name: string; code: string }
  location?: { id: string; name: string; code: string }
  runningBalance?: number
  isEntry?: boolean
}

interface Warehouse {
  id: string
  name: string
  code: string
}

interface LowStockAlert {
  id: string
  productId: string
  productName: string
  productCode: string
  currentQuantity: number
  minQuantity: number
  unitOfMeasure: string
  warehouseName: string
  deficit: number
  status: 'out_of_stock' | 'critical' | 'low'
  valueAtRisk: number
}

interface WarehouseValuation {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  totalQuantity: number
  totalValue: number
  productCount: number
  lowStockCount: number
}

interface CategoryValuation {
  categoryId: string
  categoryName: string
  totalQuantity: number
  totalValue: number
  productCount: number
}

interface MovementSummary {
  totalEntries: number
  totalEntriesQuantity: number
  totalEntriesValue: number
  totalExits: number
  totalExitsQuantity: number
  totalExitsValue: number
  netMovement: number
}

interface InventoryData {
  stockLevels: StockLevel[]
  warehouses: Warehouse[]
  pagination: { page: number; limit: number; total: number; pages: number }
  kpis: {
    totalProducts: number
    totalQuantity: number
    totalValue: number
    lowStockCount: number
    outOfStockCount: number
  }
}

// Movement type labels
const movementTypeLabels: Record<string, { label: string; color: string }> = {
  in_receipt: { label: 'Réception', color: 'bg-green-100 text-green-700' },
  in_return: { label: 'Retour Client', color: 'bg-blue-100 text-blue-700' },
  in_adjustment: { label: 'Ajustement (+)', color: 'bg-emerald-100 text-emerald-700' },
  in_transfer: { label: 'Transfert Entrant', color: 'bg-teal-100 text-teal-700' },
  out_delivery: { label: 'Livraison', color: 'bg-orange-100 text-orange-700' },
  out_purchase_return: { label: 'Retour Fourn.', color: 'bg-red-100 text-red-700' },
  out_adjustment: { label: 'Ajustement (-)', color: 'bg-rose-100 text-rose-700' },
  out_transfer: { label: 'Transfert Sortant', color: 'bg-amber-100 text-amber-700' },
  out_consumption: { label: 'Consommation', color: 'bg-purple-100 text-purple-700' },
}

// Chart colors
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// Format currency in DZD
function formatDZD(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format number
function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-DZ').format(num)
}

// Get stock status badge
function getStockStatus(quantity: number, minQty: number) {
  if (quantity === 0) {
    return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Rupture</Badge>
  }
  if (quantity <= minQty * 0.5 && minQty > 0) {
    return <Badge variant="destructive">Critique</Badge>
  }
  if (quantity <= minQty && minQty > 0) {
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Bas</Badge>
  }
  return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">En stock</Badge>
}

// Loading Skeleton Component
function InventorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Error State Component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <AlertOctagon className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Erreur de chargement
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Impossible de charger les données d'inventaire. Veuillez vérifier votre connexion et réessayer.
      </p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </Button>
    </div>
  )
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Aucun produit en stock
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Commencez par ajouter des produits à votre inventaire ou effectuez des ajustements de stock.
      </p>
      <Button className="gap-2">
        <Plus className="w-4 h-4" />
        Ajouter un produit
      </Button>
    </div>
  )
}

// Create/Edit Product Modal
function ProductModal({
  open,
  onClose,
  onSave,
  product,
  categories,
  loading
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => void
  product?: Product | null
  categories: { id: string; name: string }[]
  loading: boolean
}) {
  const isEdit = !!product
  const [form, setForm] = useState({
    code: '',
    name: '',
    nameAr: '',
    description: '',
    type: 'stockable',
    salePrice: '',
    purchasePrice: '',
    costPrice: '',
    tvaRate: '19',
    trackStock: true,
    unitOfMeasure: 'U',
    categoryId: '',
    canBeSold: true,
    canBePurchased: true
  })

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code || '',
        name: product.name || '',
        nameAr: product.nameAr || '',
        description: product.description || '',
        type: product.type || 'stockable',
        salePrice: product.salePrice?.toString() || '',
        purchasePrice: product.purchasePrice?.toString() || '',
        costPrice: product.costPrice?.toString() || '',
        tvaRate: product.tvaRate?.toString() || '19',
        trackStock: product.trackStock ?? true,
        unitOfMeasure: product.unitOfMeasure || 'U',
        categoryId: product.categoryId || '',
        canBeSold: product.canBeSold ?? true,
        canBePurchased: product.canBePurchased ?? true
      })
    } else {
      setForm({
        code: '',
        name: '',
        nameAr: '',
        description: '',
        type: 'stockable',
        salePrice: '',
        purchasePrice: '',
        costPrice: '',
        tvaRate: '19',
        trackStock: true,
        unitOfMeasure: 'U',
        categoryId: '',
        canBeSold: true,
        canBePurchased: true
      })
    }
  }, [product, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      salePrice: parseFloat(form.salePrice) || 0,
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      tvaRate: parseFloat(form.tvaRate) || 19,
      categoryId: form.categoryId || null
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le Produit' : 'Nouveau Produit'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifiez les informations du produit' : 'Remplissez les informations pour créer un nouveau produit'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="PRD-001"
                  required
                  disabled={isEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unité</Label>
                <Select value={form.unitOfMeasure} onValueChange={(v) => setForm({ ...form, unitOfMeasure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U">Unité (U)</SelectItem>
                    <SelectItem value="KG">Kilogramme (KG)</SelectItem>
                    <SelectItem value="L">Litre (L)</SelectItem>
                    <SelectItem value="ML">Mètre Linéaire (ML)</SelectItem>
                    <SelectItem value="M2">Mètre Carré (m²)</SelectItem>
                    <SelectItem value="M3">Mètre Cube (m³)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du Produit *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom du produit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameAr">Nom en Arabe</Label>
              <Input
                id="nameAr"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="اسم المنتج"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description du produit..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stockable">Stockable</SelectItem>
                    <SelectItem value="consumable">Consommable</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="kit">Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Tarification
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Prix Achat HT</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Coût de Revient</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Prix Vente HT *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tvaRate">Taux TVA (%)</Label>
                <Select value={form.tvaRate} onValueChange={(v) => setForm({ ...form, tvaRate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% - Exonéré</SelectItem>
                    <SelectItem value="9">9% - Réduit</SelectItem>
                    <SelectItem value="19">19% - Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={(e) => setForm({ ...form, trackStock: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Suivre le stock</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? 'Modifier' : 'Créer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Stock Adjustment Modal
function StockAdjustModal({
  open,
  onClose,
  onAdjust,
  stockItem,
  warehouses,
  products,
  loading
}: {
  open: boolean
  onClose: () => void
  onAdjust: (data: any) => void
  stockItem?: StockLevel | null
  warehouses: Warehouse[]
  products: Product[]
  loading: boolean
}) {
  const [form, setForm] = useState({
    warehouseId: '',
    productId: '',
    quantity: '0',
    type: 'in' as 'in' | 'out',
    notes: ''
  })

  useEffect(() => {
    if (stockItem) {
      setForm({
        warehouseId: stockItem.warehouseId,
        productId: stockItem.productId,
        quantity: '0',
        type: 'in',
        notes: ''
      })
    } else if (warehouses.length > 0 && products.length > 0) {
      setForm({
        warehouseId: warehouses[0]?.id || '',
        productId: products[0]?.id || '',
        quantity: '0',
        type: 'in',
        notes: ''
      })
    }
  }, [stockItem, open, warehouses, products])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdjust({
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity: parseFloat(form.quantity) || 0,
      type: form.type === 'in' ? 'adjustment_in' : 'adjustment_out',
      notes: form.notes
    })
  }

  const selectedProduct = products.find(p => p.id === form.productId)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Ajustement de Stock
          </DialogTitle>
          <DialogDescription>
            {stockItem 
              ? `Ajuster le stock de ${stockItem.product.name} (Actuel: ${formatNumber(stockItem.quantity)} ${stockItem.product.unitOfMeasure})`
              : 'Effectuer un ajustement de stock manuel'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!stockItem && (
              <>
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner le produit" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Entrepôt</Label>
                  <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner l'entrepôt" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {stockItem && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Produit:</span>
                  <span className="font-medium">{stockItem.product.code} - {stockItem.product.name}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Stock actuel:</span>
                  <span className="font-medium">{formatNumber(stockItem.quantity)} {stockItem.product.unitOfMeasure}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Stock min:</span>
                  <span className="font-medium">{formatNumber(stockItem.minQty)} {stockItem.product.unitOfMeasure}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Type d'ajustement</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.type === 'in' ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setForm({ ...form, type: 'in' })}
                >
                  <PlusCircle className="w-4 h-4" />
                  Entrée
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'out' ? 'destructive' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setForm({ ...form, type: 'out' })}
                >
                  <MinusCircle className="w-4 h-4" />
                  Sortie
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantité</Label>
              <Input
                id="qty"
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Valeur: {formatDZD((parseFloat(form.quantity) || 0) * selectedProduct.costPrice)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Motif *</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Motif de l'ajustement..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !form.warehouseId || !form.productId || parseFloat(form.quantity) <= 0 || !form.notes.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Confirmer l&apos;ajustement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Stock Transfer Modal
function StockTransferModal({
  open,
  onClose,
  onTransfer,
  warehouses,
  products,
  loading
}: {
  open: boolean
  onClose: () => void
  onTransfer: (data: any) => void
  warehouses: Warehouse[]
  products: Product[]
  loading: boolean
}) {
  const [form, setForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    targetWarehouseId: '',
    quantity: '0',
    notes: ''
  })

  useEffect(() => {
    if (open && warehouses.length >= 2 && products.length > 0) {
      setForm({
        productId: products[0]?.id || '',
        sourceWarehouseId: warehouses[0]?.id || '',
        targetWarehouseId: warehouses[1]?.id || '',
        quantity: '0',
        notes: ''
      })
    }
  }, [open, warehouses, products])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onTransfer({
      productId: form.productId,
      sourceWarehouseId: form.sourceWarehouseId,
      targetWarehouseId: form.targetWarehouseId,
      quantity: parseFloat(form.quantity) || 0,
      notes: form.notes
    })
  }

  const selectedProduct = products.find(p => p.id === form.productId)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transfert de Stock
          </DialogTitle>
          <DialogDescription>
            Transférer des produits entre entrepôts
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Produit</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner le produit" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entrepôt Source</Label>
                <Select value={form.sourceWarehouseId} onValueChange={(v) => setForm({ ...form, sourceWarehouseId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== form.targetWarehouseId).map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entrepôt Cible</Label>
                <Select value={form.targetWarehouseId} onValueChange={(v) => setForm({ ...form, targetWarehouseId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== form.sourceWarehouseId).map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferQty">Quantité à transférer</Label>
              <Input
                id="transferQty"
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Valeur: {formatDZD((parseFloat(form.quantity) || 0) * selectedProduct.costPrice)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferNotes">Notes / Motif</Label>
              <Textarea
                id="transferNotes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Motif du transfert..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !form.sourceWarehouseId || !form.targetWarehouseId || 
                       form.sourceWarehouseId === form.targetWarehouseId ||
                       !form.productId || parseFloat(form.quantity) <= 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  Effectuer le transfert
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Physical Count Modal
function PhysicalCountModal({
  open,
  onClose,
  onSave,
  stockItems,
  loading
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any[]) => void
  stockItems: StockLevel[]
  loading: boolean
}) {
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open && stockItems.length > 0) {
      const initialCounts: Record<string, string> = {}
      stockItems.forEach(item => {
        initialCounts[item.id] = item.quantity.toString()
      })
      setCounts(initialCounts)
      setSearchQuery('')
    }
  }, [open, stockItems])

  const filteredItems = searchQuery 
    ? stockItems.filter(item => 
        item.product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stockItems

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const adjustments = Object.entries(counts)
      .filter(([id]) => {
        const item = stockItems.find(i => i.id === id)
        return item && parseFloat(counts[id]) !== item.quantity
      })
      .map(([id, countedQty]) => {
        const item = stockItems.find(i => i.id === id)!
        const diff = parseFloat(countedQty) - item.quantity
        return {
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: Math.abs(diff),
          type: diff > 0 ? 'adjustment_in' : 'adjustment_out',
          notes: `Inventaire physique - Comptage: ${countedQty}, Système: ${item.quantity}`
        }
      })
    
    onSave(adjustments)
  }

  const hasChanges = Object.entries(counts).some(([id]) => {
    const item = stockItems.find(i => i.id === id)
    return item && parseFloat(counts[id]) !== item.quantity
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Inventaire Physique
          </DialogTitle>
          <DialogDescription>
            Saisir les quantités comptées pour chaque produit
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
            {filteredItems.slice(0, 20).map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.product.code} • {item.warehouse.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Système: {formatNumber(item.quantity)}
                  </span>
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="any"
                    className="w-24 text-right"
                    value={counts[item.id] || '0'}
                    onChange={(e) => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  {parseFloat(counts[item.id] || '0') !== item.quantity && (
                    <Badge variant={parseFloat(counts[item.id] || '0') > item.quantity ? "default" : "destructive"} className="text-xs">
                      {parseFloat(counts[item.id] || '0') > item.quantity ? '+' : ''}{formatNumber(parseFloat(counts[item.id] || '0') - item.quantity)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun produit trouvé
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !hasChanges}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Appliquer les écarts ({Object.entries(counts).filter(([id]) => {
                    const item = stockItems.find(i => i.id === id)
                    return item && parseFloat(counts[id]) !== item.quantity
                  }).length})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main Page Component
export default function InventoryPage() {
  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementSummary, setMovementSummary] = useState<MovementSummary | null>(null)
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [warehouseValuation, setWarehouseValuation] = useState<WarehouseValuation[]>([])
  const [categoryValuation, setCategoryValuation] = useState<CategoryValuation[]>([])
  
  // UI State
  const [activeTab, setActiveTab] = useState('tableau-bord')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  
  // Movement filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')
  const [movementDateFrom, setMovementDateFrom] = useState('')
  const [movementDateTo, setMovementDateTo] = useState('')
  const [movementProductFilter, setMovementProductFilter] = useState<string>('all')
  
  // Modal States
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [physicalCountOpen, setPhysicalCountOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedWarehouse !== 'all') params.set('warehouse', selectedWarehouse)
      if (showLowStockOnly) params.set('lowStock', 'true')

      const [inventoryRes, productsRes, stockLevelsRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch(`/api/products?limit=500`),
        fetch(`/api/inventory/stock-levels?${params.toString()}`)
      ])

      if (!inventoryRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const inventoryJson = await inventoryRes.json()
      const productsJson = await productsRes.json()
      const stockLevelsJson = await stockLevelsRes.ok ? await stockLevelsRes.json() : null

      if (inventoryJson.success) {
        setInventoryData(inventoryJson.data)
      }
      if (productsJson.success) {
        setProducts(productsJson.data)
      }
      if (stockLevelsJson?.success) {
        setLowStockAlerts(stockLevelsJson.data.lowStockAlerts || [])
        setWarehouseValuation(stockLevelsJson.data.warehouseValuation || [])
        setCategoryValuation(stockLevelsJson.data.categoryValuation || [])
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedWarehouse, showLowStockOnly])

  // Fetch movements data
  const fetchMovementsData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      
      if (movementTypeFilter !== 'all') {
        params.set('type', movementTypeFilter)
      }
      if (movementDateFrom) {
        params.set('dateFrom', movementDateFrom)
      }
      if (movementDateTo) {
        params.set('dateTo', movementDateTo)
      }
      if (movementProductFilter !== 'all') {
        params.set('productId', movementProductFilter)
      }
      if (selectedWarehouse !== 'all') {
        params.set('warehouseId', selectedWarehouse)
      }

      const res = await fetch(`/api/inventory/movements?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setMovements(json.data.movements || [])
          setMovementSummary(json.data.summary)
        }
      }
    } catch (err) {
      console.error('Error fetching movements:', err)
    }
  }, [movementTypeFilter, movementDateFrom, movementDateTo, movementProductFilter, selectedWarehouse])

  // Initial load
  useEffect(() => {
    fetchInventoryData()
    fetchMovementsData()
  }, [])

  // Debounced search for inventory
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        fetchInventoryData()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory, selectedWarehouse, showLowStockOnly])

  // Fetch movements when filters change
  useEffect(() => {
    if (activeTab === 'mouvements') {
      fetchMovementsData()
    }
  }, [activeTab, movementTypeFilter, movementDateFrom, movementDateTo, movementProductFilter, selectedWarehouse])

  // Handlers
  const handleCreateProduct = async (data: any) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        toast.success('Produit créé avec succès')
        setProductModalOpen(false)
        fetchInventoryData()
      } else {
        const json = await res.json()
        toast.error(json.error || 'Erreur lors de la création')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return
    
    setActionLoading(true)
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        toast.success('Produit modifié avec succès')
        setProductModalOpen(false)
        setEditingProduct(null)
        fetchInventoryData()
      } else {
        const json = await res.json()
        toast.error(json.error || 'Erreur lors de la modification')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStockAdjustment = async (data: any) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        const json = await res.json()
        toast.success(json.message || 'Ajustement effectué avec succès')
        setStockModalOpen(false)
        setAdjustingStock(null)
        fetchInventoryData()
        fetchMovementsData()
      } else {
        const json = await res.json()
        toast.error(json.error || 'Erreur lors de l\'ajustement')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStockTransfer = async (data: any) => {
    setActionLoading(true)
    try {
      // Create exit from source
      const exitRes = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          warehouseId: data.sourceWarehouseId,
          type: 'transfer_out',
          notes: `${data.notes} (Transfert vers entrepôt cible)`
        })
      })

      if (!exitRes.ok) {
        const json = await exitRes.json()
        toast.error(json.error || 'Erreur lors du transfert (sortie)')
        return
      }

      // Create entry to target
      const entryRes = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          warehouseId: data.targetWarehouseId,
          type: 'transfer_in',
          notes: `${data.notes} (Transfert depuis entrepôt source)`
        })
      })

      if (entryRes.ok) {
        toast.success('Transfert effectué avec succès')
        setTransferModalOpen(false)
        fetchInventoryData()
        fetchMovementsData()
      } else {
        const json = await entryRes.json()
        toast.error(json.error || 'Erreur lors du transfert (entrée)')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePhysicalCount = async (adjustments: any[]) => {
    setActionLoading(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const adj of adjustments) {
        try {
          const res = await fetch('/api/inventory/adjustment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adj)
          })
          
          if (res.ok) successCount++
          else errorCount++
        } catch {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ajustement(s) appliqué(s) avec succès`)
        setPhysicalCountOpen(false)
        fetchInventoryData()
        fetchMovementsData()
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'application`)
      }
    } catch (err) {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  const openStockModal = (stockItem?: StockLevel) => {
    setAdjustingStock(stockItem || null)
    setStockModalOpen(true)
  }

  // Computed values
  const categories = useMemo(() => {
    const catMap = new Map<string, string>()
    products.forEach(p => {
      if (p.category?.id && p.category?.name) {
        catMap.set(p.category.id, p.category.name)
      }
    })
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }))
  }, [products])

  const filteredStockLevels = useMemo(() => {
    if (!inventoryData?.stockLevels) return []
    
    let filtered = [...inventoryData.stockLevels]

    // Apply client-side search filter as backup
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.product.code.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.nameAr?.toLowerCase().includes(q)
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.product.categoryId === selectedCategory)
    }

    // Apply low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter(item => item.quantity <= item.minQty && item.minQty > 0)
    }

    return filtered
  }, [inventoryData, searchQuery, selectedCategory, showLowStockOnly])

  const lowStockItems = useMemo(() => {
    if (!inventoryData?.stockLevels) return []
    
    return inventoryData.stockLevels
      .filter(item => item.quantity <= item.minQty && item.minQty > 0)
      .sort((a, b) => (a.quantity / Math.max(a.minQty, 1)) - (b.quantity / Math.max(b.minQty, 1)))
      .slice(0, 10)
  }, [inventoryData])

  // Chart data
  const warehouseChartData = useMemo(() => {
    return warehouseValuation.map(wh => ({
      name: wh.warehouseName,
      valeur: Math.round(wh.totalValue / 1000),
      quantite: wh.totalQuantity,
      produits: wh.productCount
    }))
  }, [warehouseValuation])

  const categoryChartData = useMemo(() => {
    return categoryValuation.map(cat => ({
      name: cat.categoryName.length > 15 ? cat.categoryName.substring(0, 15) + '...' : cat.categoryName,
      fullName: cat.categoryName,
      valeur: Math.round(cat.totalValue / 1000),
      produits: cat.productCount
    }))
  }, [categoryValuation])

  const topProductsChartData = useMemo(() => {
    if (!inventoryData?.stockLevels) return []
    
    return [...inventoryData.stockLevels]
      .sort((a, b) => (b.quantity * b.product.costPrice) - (a.quantity * a.product.costPrice))
      .slice(0, 8)
      .map(sl => ({
        name: sl.product.name.length > 18 ? sl.product.name.substring(0, 18) + '...' : sl.product.name,
        fullName: sl.product.name,
        valeur: Math.round((sl.quantity * sl.product.costPrice) / 1000),
        quantite: sl.quantity
      }))
  }, [inventoryData])

  // KPI Data
  const kpiData = useMemo(() => {
    if (!inventoryData?.kpis) return []

    const { totalProducts, totalQuantity, totalValue, lowStockCount, outOfStockCount } = inventoryData.kpis

    return [
      {
        title: "Articles en Stock",
        value: totalQuantity,
        change: 3.2,
        icon: Package,
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
        format: "number" as const
      },
      {
        title: "Valeur du Stock (DZD)",
        value: totalValue,
        change: -2.1,
        icon: DollarSign,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        format: "currency" as const
      },
      {
        title: "Alertes Stock",
        value: lowStockCount + outOfStockCount,
        change: null,
        icon: AlertTriangle,
        iconColor: "text-red-600",
        iconBg: "bg-red-100 dark:bg-red-900/30",
        format: "number" as const
      },
      {
        title: "Total Produits",
        value: totalProducts,
        change: 1.5,
        icon: Boxes,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        format: "number" as const
      }
    ]
  }, [inventoryData])

  // Render loading state
  if (loading && !inventoryData) {
    return <InventorySkeleton />
  }

  // Render error state
  if (error && !inventoryData) {
    return <ErrorState onRetry={fetchInventoryData} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Gestion des Stocks
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi complet des stocks, mouvements et valorisation
          </p>
        </div>
        <div className="items-center gap-2 flex-wrap flex">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => openStockModal()}>
            <ArrowUpDown className="w-4 h-4" />
            Ajustement
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setTransferModalOpen(true)}>
            <ArrowRightLeft className="w-4 h-4" />
            Transfert
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setPhysicalCountOpen(true)}>
            <Scale className="w-4 h-4" />
            Inventaire
          </Button>
          <Button 
            size="sm" 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => {
              setEditingProduct(null)
              setProductModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* KPI Cards - with error boundary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.length > 0 ? kpiData.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        )) : (
          <>
            <KpiCard title="Articles en Stock" value={0} icon={Package} iconColor="text-emerald-600" iconBg="bg-emerald-100" format="number" />
            <KpiCard title="Valeur du Stock (DZD)" value={0} icon={DollarSign} iconColor="text-blue-600" iconBg="bg-blue-100" format="currency" />
            <KpiCard title="Alertes Stock" value={0} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-100" format="number" />
            <KpiCard title="Total Produits" value={0} icon={Boxes} iconColor="text-purple-600" iconBg="bg-purple-100" format="number" />
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tableau-bord">Tableau de Bord</TabsTrigger>
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="valorisation">Valorisation</TabsTrigger>
          <TabsTrigger value="entrepots">Entrepôts</TabsTrigger>
        </TabsList>

        {/* ==================== TABLEAU DE BORD TAB ==================== */}
        <TabsContent value="tableau-bord" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-5 h-5" />
                    Alertes de Stock Faible
                    <Badge variant="secondary" className="ml-2">{lowStockAlerts.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                    {lowStockAlerts.slice(0, 12).map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            alert.status === 'out_of_stock' ? 'bg-red-500 animate-pulse' :
                            alert.status === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <div className="min-w-0">
                            <span className="font-medium truncate block text-sm">{alert.productName}</span>
                            <span className="text-xs text-muted-foreground">{alert.productCode} • {alert.warehouseName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-sm font-semibold ${
                            alert.status === 'out_of_stock' ? 'text-red-600' :
                            alert.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {formatNumber(alert.currentQuantity)}
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              const stockItem = inventoryData?.stockLevels.find(s => s.id === alert.id)
                              openStockModal(stockItem)
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stock Value by Warehouse Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Valeur par Entrepôt
                  </CardTitle>
                  <CardDescription>Valeur totale du stock (milliers DZD)</CardDescription>
                </CardHeader>
                <CardContent>
                  {warehouseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={warehouseChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number) => [`${formatNumber(value * 1000)} DZD`, 'Valeur']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="valeur" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products by Value Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Produits par Valeur
                  </CardTitle>
                  <CardDescription>Les produits les plus valorisés</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProductsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topProductsChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip 
                          formatter={(value: number) => [`${formatNumber(value * 1000)} DZD`, 'Valeur']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="valeur" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Distribution & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Distribution Pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    Répartition par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPie>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="valeur"
                          nameKey="fullName"
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${formatNumber(value * 1000)} DZD`, 'Valeur']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Movement Summary */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Résumé des Mouvements
                  </CardTitle>
                  <CardDescription>Bilan des entrées et sorties récentes</CardDescription>
                </CardHeader>
                <CardContent>
                  {movementSummary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <PlusCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">ENTRÉES</span>
                        </div>
                        <p className="text-xl font-bold text-green-700">{formatNumber(movementSummary.totalEntriesQuantity)}</p>
                        <p className="text-xs text-muted-foreground">{formatDZD(movementSummary.totalEntriesValue)}</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <MinusCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-orange-600 font-medium">SORTIES</span>
                        </div>
                        <p className="text-xl font-bold text-orange-700">{formatNumber(movementSummary.totalExitsQuantity)}</p>
                        <p className="text-xs text-muted-foreground">{formatDZD(movementSummary.totalExitsValue)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <ArrowUpDown className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-blue-600 font-medium">MOUVEMENT NET</span>
                        </div>
                        <p className={`text-xl font-bold ${movementSummary.netMovement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {movementSummary.netMovement >= 0 ? '+' : ''}{formatNumber(movementSummary.netMovement)}
                        </p>
                        <p className="text-xs text-muted-foreground">Unités</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <ClipboardList className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-purple-600 font-medium">TOTAL OPÉRATIONS</span>
                        </div>
                        <p className="text-xl font-bold text-purple-700">{movementSummary.totalEntries + movementSummary.totalExits}</p>
                        <p className="text-xs text-muted-foreground">Mouvements</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Chargement des statistiques...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Movements Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Mouvements Récents
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => setActiveTab('mouvements')}
                  >
                    Voir tout
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.slice(0, 8).map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="font-mono text-xs">{mov.reference}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(mov.date).toLocaleDateString('fr-DZ')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={movementTypeLabels[mov.type]?.color || ''}
                            >
                              {movementTypeLabels[mov.type]?.label || mov.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {mov.product?.name || mov.productId}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${mov.isEntry ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.isEntry ? '+' : '-'}{formatNumber(mov.quantity)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatDZD(mov.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Aucun mouvement récent
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== PRODUITS TAB ==================== */}
        <TabsContent value="produits" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle>Catalogue des Produits</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Category Filter */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes catégories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Rechercher..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Low Stock Toggle */}
                    <Button
                      variant={showLowStockOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                      className="gap-2"
                    >
                      <AlertTriangle className={`w-4 h-4 ${showLowStockOnly ? '' : 'text-yellow-600'}`} />
                      Stock bas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStockLevels.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Référence</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Catégorie</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Stock Min.</TableHead>
                          <TableHead>Prix HT</TableHead>
                          <TableHead>Valeur Stock</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredStockLevels.map((item) => (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell className="font-mono text-sm font-medium">
                                {item.product.code}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.product.name}</div>
                                  {item.product.nameAr && (
                                    <div className="text-xs text-muted-foreground" dir="rtl">{item.product.nameAr}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.product.category ? (
                                  <Badge variant="secondary">{item.product.category.name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                <span className={item.quantity <= item.minQty && item.minQty > 0 ? 'text-red-600 font-semibold' : ''}>
                                  {formatNumber(item.quantity)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  {item.product.unitOfMeasure}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatNumber(item.minQty)}
                              </TableCell>
                              <TableCell>{formatDZD(item.product.salePrice)}</TableCell>
                              <TableCell className="font-mono">
                                {formatDZD(item.quantity * item.product.costPrice)}
                              </TableCell>
                              <TableCell>
                                {getStockStatus(item.quantity, item.minQty)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => openStockModal(item)}
                                    title="Ajuster le stock"
                                  >
                                    <ArrowUpDown className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => openEditModal(item.product)}
                                    title="Modifier"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Pagination Info */}
                {inventoryData && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
                    <span>
                      Affichage de {filteredStockLevels.length} sur {inventoryData.pagination.total} articles
                    </span>
                    <Button variant="outline" size="sm" className="gap-2" onClick={fetchInventoryData}>
                      <RefreshCw className="w-4 h-4" />
                      Actualiser
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== MOUVEMENTS TAB ==================== */}
        <TabsContent value="mouvements" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Journal des Mouvements</CardTitle>
                    <CardDescription>Historique complet des entrées et sorties de stock</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => openStockModal()}
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau mouvement
                  </Button>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                  <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="in">Entrées</SelectItem>
                      <SelectItem value="out">Sorties</SelectItem>
                      <SelectItem value="adjustment">Ajustements</SelectItem>
                      <SelectItem value="transfer">Transferts</SelectItem>
                      <SelectItem value="in_receipt">Réceptions</SelectItem>
                      <SelectItem value="out_delivery">Livraisons</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Du:</Label>
                    <Input
                      type="date"
                      className="w-[150px]"
                      value={movementDateFrom}
                      onChange={(e) => setMovementDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Au:</Label>
                    <Input
                      type="date"
                      className="w-[150px]"
                      value={movementDateTo}
                      onChange={(e) => setMovementDateTo(e.target.value)}
                    />
                  </div>

                  <Select value={movementProductFilter} onValueChange={setMovementProductFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Package className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Produit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les produits</SelectItem>
                      {products.slice(0, 50).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(movementTypeFilter !== 'all' || movementDateFrom || movementDateTo || movementProductFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMovementTypeFilter('all')
                        setMovementDateFrom('')
                        setMovementDateTo('')
                        setMovementProductFilter('all')
                      }}
                      className="gap-1"
                    >
                      <X className="w-3 h-3" />
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Entrepôt</TableHead>
                        <TableHead className="text-right">Entrée</TableHead>
                        <TableHead className="text-right">Sortie</TableHead>
                        <TableHead className="text-right">Solde</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((mov) => (
                        <TableRow key={mov.id} className="hover:bg-muted/50">
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(mov.date).toLocaleDateString('fr-DZ')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {mov.reference}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={movementTypeLabels[mov.type]?.color || ''}
                            >
                              {movementTypeLabels[mov.type]?.label || mov.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="truncate" title={mov.product?.name}>
                              {mov.product?.code && (
                                <span className="text-xs text-muted-foreground">{mov.product.code} - </span>
                              )}
                              {mov.product?.name || mov.productId}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {mov.warehouse?.name || mov.warehouseId}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {mov.isEntry ? formatNumber(mov.quantity) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {!mov.isEntry ? formatNumber(mov.quantity) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium ${
                            (mov.runningBalance || 0) < 0 ? 'text-red-600' : ''
                          }`}>
                            {formatNumber(mov.runningBalance || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatDZD(mov.totalCost)}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                            {mov.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12">
                            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-muted-foreground">Aucun mouvement trouvé</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Essayez de modifier les filtres ou créez un nouveau mouvement
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== VALORISATION TAB ==================== */}
        <TabsContent value="valorisation" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Valuation Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valeur Totale</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatDZD(inventoryData?.kpis?.totalValue || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Layers className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Articles</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNumber(inventoryData?.kpis?.totalQuantity || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Boxes className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produits en Stock</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {inventoryData?.kpis?.totalProducts || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Valuation by Warehouse Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5" />
                  Valorisation par Entrepôt
                </CardTitle>
                <CardDescription>Détail de la valeur du stock par emplacement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entrepôt</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Nb Produits</TableHead>
                        <TableHead className="text-right">Quantité Totale</TableHead>
                        <TableHead className="text-right">Valeur Stock</TableHead>
                        <TableHead className="text-right">% du Total</TableHead>
                        <TableHead>Alertes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouseValuation.map((wh) => {
                        const totalValue = inventoryData?.kpis?.totalValue || 1
                        const percentage = (wh.totalValue / totalValue) * 100
                        
                        return (
                          <TableRow key={wh.warehouseId}>
                            <TableCell className="font-medium">{wh.warehouseName}</TableCell>
                            <TableCell className="font-mono text-sm">{wh.warehouseCode}</TableCell>
                            <TableCell className="text-right">{wh.productCount}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(wh.totalQuantity)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-600">
                              {formatDZD(wh.totalValue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Progress value={percentage} className="w-16 h-2" />
                                <span className="text-sm w-12 text-right">{percentage.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {wh.lowStockCount > 0 ? (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                  {wh.lowStockCount} alerte(s)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      
                      {warehouseValuation.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Aucune donnée de valorisation disponible
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Valuation by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Valorisation par Catégorie
                </CardTitle>
                <CardDescription>Répartition de la valeur du stock par catégorie de produits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Catégorie</TableHead>
                          <TableHead className="text-right">Produits</TableHead>
                          <TableHead className="text-right">Quantité</TableHead>
                          <TableHead className="text-right">Valeur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryValuation
                          .sort((a, b) => b.totalValue - a.totalValue)
                          .map((cat) => (
                          <TableRow key={cat.categoryId}>
                            <TableCell className="font-medium">{cat.categoryName}</TableCell>
                            <TableCell className="text-right">{cat.productCount}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(cat.totalQuantity)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatDZD(cat.totalValue)}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {categoryValuation.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              Aucune donnée
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Chart */}
                  <div>
                    {categoryChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <RechartsPie>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="valeur"
                            nameKey="fullName"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={true}
                          >
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string) => [formatDZD(value * 1000), name]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== ENTREPÔTS TAB ==================== */}
        <TabsContent value="entrepots">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryData?.warehouses.map((warehouse, index) => {
                // Calculate stats for this warehouse
                const whStockLevels = inventoryData.stockLevels.filter(sl => sl.warehouseId === warehouse.id)
                const totalItems = whStockLevels.reduce((acc, sl) => acc + sl.quantity, 0)
                const uniqueProducts = whStockLevels.length
                const lowStockInWh = whStockLevels.filter(sl => sl.quantity <= sl.minQty && sl.minQty > 0).length
                const totalValue = whStockLevels.reduce((acc, sl) => acc + (sl.quantity * sl.product.costPrice), 0)
                
                // Calculate capacity percentage (mock calculation based on items count)
                const capacityPercent = Math.min(95, Math.round((uniqueProducts / Math.max(uniqueProducts * 1.5, 1)) * 100))

                return (
                  <motion.div
                    key={warehouse.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg">
                              <Warehouse className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{warehouse.name}</h3>
                              <p className="text-sm text-muted-foreground font-mono">{warehouse.code}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{uniqueProducts} produits</Badge>
                        </div>
                        
                        <div className="mt-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Articles totaux</span>
                            <span className="font-medium">{formatNumber(totalItems)}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valeur stock</span>
                            <span className="font-medium text-green-600">{formatDZD(totalValue)}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Capacité utilisée</span>
                            <span className="font-medium">{capacityPercent}%</span>
                          </div>
                          
                          <Progress 
                            value={capacityPercent} 
                            className={`h-2 ${capacityPercent > 80 ? '[&>div]:bg-red-500' : capacityPercent > 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                          />

                          {lowStockInWh > 0 && (
                            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>{lowStockInWh} produit(s) en stock bas</span>
                            </div>
                          )}
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4 gap-2"
                          onClick={() => {
                            setSelectedWarehouse(warehouse.id)
                            setActiveTab('produits')
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          Voir le stock
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}

              {/* No warehouses state */}
              {(!inventoryData?.warehouses || inventoryData.warehouses.length === 0) && (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Warehouse className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Aucun entrepôt configuré</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ProductModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false)
          setEditingProduct(null)
        }}
        onSave={editingProduct ? handleUpdateProduct : handleCreateProduct}
        product={editingProduct}
        categories={categories}
        loading={actionLoading}
      />

      <StockAdjustModal
        open={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false)
          setAdjustingStock(null)
        }}
        onAdjust={handleStockAdjustment}
        stockItem={adjustingStock}
        warehouses={inventoryData?.warehouses || []}
        products={products}
        loading={actionLoading}
      />

      <StockTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onTransfer={handleStockTransfer}
        warehouses={inventoryData?.warehouses || []}
        products={products}
        loading={actionLoading}
      />

      <PhysicalCountModal
        open={physicalCountOpen}
        onClose={() => setPhysicalCountOpen(false)}
        onSave={handlePhysicalCount}
        stockItems={filteredStockLevels}
        loading={actionLoading}
      />
    </div>
  )
}
