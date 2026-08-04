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
  ArrowUpDown
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
}

interface Warehouse {
  id: string
  name: string
  code: string
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
}

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
  loading
}: {
  open: boolean
  onClose: () => void
  onAdjust: (data: any) => void
  stockItem?: StockLevel | null
  warehouses: Warehouse[]
  loading: boolean
}) {
  const [form, setForm] = useState({
    warehouseId: '',
    quantity: '0',
    type: 'in' as 'in' | 'out',
    notes: ''
  })

  useEffect(() => {
    if (stockItem) {
      setForm({
        warehouseId: stockItem.warehouseId,
        quantity: '0',
        type: 'in',
        notes: ''
      })
    } else if (warehouses.length > 0) {
      setForm({
        warehouseId: warehouses[0]?.id || '',
        quantity: '0',
        type: 'in',
        notes: ''
      })
    }
  }, [stockItem, open, warehouses])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdjust({
      productId: stockItem?.productId || '',
      warehouseId: form.warehouseId,
      locationId: stockItem?.locationId || null,
      quantity: parseFloat(form.quantity) || 0,
      type: form.type === 'in' ? 'adjustment_in' : 'adjustment_out',
      notes: form.notes
    })
  }

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

            {!stockItem && (
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Motif</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Motif de l'ajustement..."
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
              disabled={loading || !form.warehouseId || parseFloat(form.quantity) <= 0}
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

// Main Page Component
export default function InventoryPage() {
  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  
  // UI State
  const [activeTab, setActiveTab] = useState('produits')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  
  // Modal States
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null)
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

      const [inventoryRes, productsRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch(`/api/products?limit=500`)
      ])

      if (!inventoryRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const inventoryJson = await inventoryRes.json()
      const productsJson = await productsRes.json()

      if (inventoryJson.success) {
        setInventoryData(inventoryJson.data)
      }
      if (productsJson.success) {
        setProducts(productsJson.data)
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedWarehouse, showLowStockOnly])

  // Fetch movements for a specific product
  const fetchProductMovements = async (productId: string) => {
    try {
      // We'll use the stock levels which include recent movements info
      // For now, we'll show mock movement data based on actual stock changes
      const res = await fetch(`/api/inventory?${new URLSearchParams({ search: productId })}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data.stockLevels?.[0]?.movements) {
          setMovements(json.data.stockLevels[0].movements)
        }
      }
    } catch (err) {
      console.error('Error fetching movements:', err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchInventoryData()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        fetchInventoryData()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory, selectedWarehouse, showLowStockOnly])

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
        setProductModalOpen(false)
        fetchInventoryData()
      } else {
        const json = await res.json()
        alert(json.error || 'Erreur lors de la création')
      }
    } catch (err) {
      alert('Erreur réseau')
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
        setProductModalOpen(false)
        setEditingProduct(null)
        fetchInventoryData()
      } else {
        const json = await res.json()
        alert(json.error || 'Erreur lors de la modification')
      }
    } catch (err) {
      alert('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStockAdjustment = async (data: any) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        setStockModalOpen(false)
        setAdjustingStock(null)
        fetchInventoryData()
      } else {
        const json = await res.json()
        alert(json.error || 'Erreur lors de l\'ajustement')
      }
    } catch (err) {
      alert('Erreur réseau')
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

  // KPI Data
  const kpiData = useMemo(() => {
    if (!inventoryData?.kpis) return []

    const { totalProducts, totalQuantity, totalValue, lowStockCount, outOfStockCount } = inventoryData.kpis

    return [
      {
        title: "Produits en Stock",
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
        icon: TrendingDown,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        format: "currency" as const
      },
      {
        title: "Stocks Bas",
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
        icon: Package,
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
            Stocks & Inventaire
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des stocks et inventaire des produits
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => openStockModal()}>
            <ArrowUpDown className="w-4 h-4" />
            Ajustement
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Barcode className="w-4 h-4" />
            Scanner
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="entrepots">Entrepôts</TabsTrigger>
        </TabsList>

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

            {/* Low Stock Alert Section */}
            {lowStockItems.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-5 h-5" />
                    Alertes de Stock
                    <Badge variant="secondary" className="ml-2">{lowStockItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {lowStockItems.map((item, index) => {
                      const percentage = item.minQty > 0 ? (item.quantity / item.minQty) * 100 : 100
                      const isCritical = item.quantity <= item.minQty * 0.5
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{item.product.name}</span>
                              <span className="text-xs text-muted-foreground">{item.product.code} • {item.warehouse.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
                                {formatNumber(item.quantity)}
                              </span>
                              <span className="text-muted-foreground text-xs ml-1">
                                / {formatNumber(item.minQty)} {item.product.unitOfMeasure}
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(percentage, 100)} 
                              className={`w-24 h-2 ${isCritical ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openStockModal(item)}
                            >
                              Ajuster
                            </Button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* ==================== STOCK TAB ==================== */}
        <TabsContent value="stock" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stock Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Résumé du Stock</CardTitle>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                      <SelectTrigger className="w-[180px]">
                        <Warehouse className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Entrepôt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les entrepôts</SelectItem>
                        {inventoryData?.warehouses.map(wh => (
                          <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {inventoryData?.kpis ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{formatNumber(inventoryData.kpis.totalQuantity)}</p>
                        <p className="text-sm text-muted-foreground">Quantité Totale</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-emerald-600">{formatDZD(inventoryData.kpis.totalValue)}</p>
                        <p className="text-sm text-muted-foreground">Valeur Stock</p>
                      </div>
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                        <p className="text-2xl font-bold text-yellow-600">{inventoryData.kpis.lowStockCount}</p>
                        <p className="text-sm text-muted-foreground">Stock Bas</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-600">{inventoryData.kpis.outOfStockCount}</p>
                        <p className="text-sm text-muted-foreground">Rupture</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Chargement...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline"
                    onClick={() => openStockModal()}
                  >
                    <PlusCircle className="w-4 h-4 text-green-600" />
                    Entrée de stock
                  </Button>
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline"
                    onClick={() => {
                      setAdjustingStock(null)
                      setStockModalOpen(true)
                      // Will be handled in modal
                    }}
                  >
                    <MinusCircle className="w-4 h-4 text-red-600" />
                    Sortie de stock
                  </Button>
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline"
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Voir stocks bas
                  </Button>
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline"
                    onClick={fetchInventoryData}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualiser
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Stock by Warehouse Table */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Stock par Entrepôt</CardTitle>
                <CardDescription>Détail des niveaux de stock par emplacement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entrepôt</TableHead>
                        <TableHead>Emplacement</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Réservé</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStockLevels.slice(0, 15).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.warehouse.name}</TableCell>
                          <TableCell>
                            {item.location ? (
                              <Badge variant="outline">{item.location.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">{item.product.name}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.availableQty)}</TableCell>
                          <TableCell className="text-right font-mono text-orange-600">{formatNumber(item.reservedQty)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatNumber(item.quantity)}</TableCell>
                          <TableCell>{getStockStatus(item.availableQty, item.minQty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== MOUVEMENTS TAB ==================== */}
        <TabsContent value="mouvements">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mouvements de Stock</CardTitle>
                    <CardDescription>Historique des entrées et sorties de stock</CardDescription>
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
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Journal des mouvements</p>
                  <p className="text-sm mt-1">
                    Les mouvements de stock sont enregistrés lors des ajustements manuels, 
                    des réceptions et des livraisons.
                  </p>
                  <p className="text-sm mt-2">
                    Utilisez le bouton &quot;Ajustement&quot; pour créer un mouvement manuel.
                  </p>
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
        loading={actionLoading}
      />
    </div>
  )
}
