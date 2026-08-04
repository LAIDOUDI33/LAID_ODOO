'use client'

import React from 'react'
import { 
  Package, 
  AlertTriangle, 
  TrendingDown,
  Plus,
  Search,
  Barcode,
  Truck
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
import { motion } from 'framer-motion'

// Inventory KPIs
const inventoryKpis = [
  {
    title: "Produits en Stock",
    value: 1247,
    change: 3.2,
    icon: Package,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "Valeur du Stock (DZD)",
    value: 8900000,
    change: -2.1,
    icon: TrendingDown,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Stocks Bas",
    value: 5,
    change: null,
    icon: AlertTriangle,
    iconColor: "text-red-600",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    format: "number" as const
  },
  {
    title: "Taux de Rotation",
    value: 4.8,
    change: 0.5,
    icon: TrendingDown,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
]

// Products data
const products = [
  { id: 'PRD-001', name: 'Produit A - Modèle Standard', category: 'Électronique', stock: 150, minStock: 50, price: 25000, location: 'A1-01' },
  { id: 'PRD-002', name: 'Produit B - Version Pro', category: 'Électronique', stock: 85, minStock: 40, price: 45000, location: 'A1-02' },
  { id: 'PRD-003', name: 'Accessoire C', category: 'Accessoires', stock: 12, minStock: 30, price: 5000, location: 'B2-05' },
  { id: 'PRD-004', name: 'Composant D', category: 'Composants', stock: 450, minStock: 100, price: 1200, location: 'C3-01' },
  { id: 'PRD-005', name: 'Pack Complet E', category: 'Kits', stock: 28, minStock: 20, price: 85000, location: 'A2-03' },
  { id: 'PRD-006', name: 'Service F (Réf)', category: 'Services', stock: 0, minStock: 0, price: 35000, location: '-' },
]

// Low stock items
const lowStockItems = [
  { name: 'Accessoire C', current: 12, minimum: 30, status: 'critique' },
  { name: 'Pack Complet E', current: 28, minimum: 20, status: 'attention' },
  { name: 'Consommable G', current: 45, minimum: 60, status: 'attention' },
  { name: 'Pièce Détachée H', current: 8, minimum: 25, status: 'critique' },
  { name: 'Emballage I', current: 150, minimum: 200, status: 'attention' },
]

function getStockStatus(stock: number, minStock: number) {
  if (stock === 0) return <Badge variant="outline" className="bg-gray-100 text-gray-700">Rupture</Badge>
  if (stock <= minStock * 0.5) return <Badge variant="destructive">Critique</Badge>
  if (stock <= minStock) return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Bas</Badge>
  return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">OK</Badge>
}

export default function InventoryPage() {
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Barcode className="w-4 h-4" />
            Scanner
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventoryKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="produits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="entrepots">Entrepôts</TabsTrigger>
          <TabsTrigger value="inventaire">Inventaire</TabsTrigger>
        </TabsList>

        {/* Produits Tab */}
        <TabsContent value="produits" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Catalogue des Produits</CardTitle>
                  <div className="relative w-64 hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher un produit..." className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Emplacement</TableHead>
                      <TableHead>Prix (DZD)</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.id}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell className="font-mono">{product.location}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(product.price)}</TableCell>
                        <TableCell>{getStockStatus(product.stock, product.minStock)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  Alertes de Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${item.status === 'critique' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-semibold">{item.current}</span>
                          <span className="text-muted-foreground"> / {item.minimum} unités</span>
                        </div>
                        <Progress 
                          value={(item.current / item.minimum) * 100} 
                          className="w-24 h-2"
                        />
                        <Button size="sm" variant="outline">Commander</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Mouvements Tab */}
        <TabsContent value="mouvements">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Mouvements de Stock</CardTitle>
                <CardDescription>Historique des entrées et sorties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Journal des mouvements à venir</p>
                  <p className="text-sm">Module en développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Entrepôts Tab */}
        <TabsContent value="entrepots">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Entrepôt Principal', location: 'Alger - Oued Smar', capacity: 75, items: 847 },
                { name: 'Zone A', location: 'Rayon Électronique', capacity: 60, items: 234 },
                { name: 'Zone B', location: 'Rayon Accessoires', capacity: 45, items: 156 },
                { name: 'Zone C', location: 'Rayon Pièces', capacity: 90, items: 89 },
                { name: 'Quarantaine', location: 'Zone Contrôle Qualité', capacity: 15, items: 12 },
              ].map((warehouse, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold">{warehouse.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{warehouse.location}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacité utilisée</span>
                        <span>{warehouse.capacity}%</span>
                      </div>
                      <Progress value={warehouse.capacity} className="h-2" />
                      <p className="text-xs text-muted-foreground">{warehouse.items} articles</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Inventaire Tab */}
        <TabsContent value="inventaire">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Inventaire Physique</CardTitle>
                <CardDescription>Réalisations d'inventaires et écarts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Outils d'inventaire à venir</p>
                  <p className="text-sm">Module en développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
