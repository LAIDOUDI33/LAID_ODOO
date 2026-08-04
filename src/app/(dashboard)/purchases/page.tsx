'use client'

import React from 'react'
import { 
  ShoppingCart, 
  Truck, 
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle
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
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion } from 'framer-motion'

// Purchases KPIs
const purchasesKpis = [
  {
    title: "Commandes Fournisseurs",
    value: 34,
    change: -8.5,
    icon: ShoppingCart,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "Achats du Mois (DZD)",
    value: 2150000,
    change: 5.2,
    icon: FileText,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Fournisseurs Actifs",
    value: 18,
    change: 2,
    icon: Truck,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
  {
    title: "Commandes en Attente",
    value: 7,
    change: null,
    icon: Clock,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "number" as const
  },
]

// Purchase orders data
const purchaseOrders = [
  { id: 'ACH-2024-0034', supplier: 'Fournisseur ABC', amount: 450000, status: 'livrée', date: '04/01/2024', deliveryDate: '02/01/2024' },
  { id: 'ACH-2024-0033', supplier: 'TechSupply DZ', amount: 125000, status: 'en cours', date: '03/01/2024', deliveryDate: '10/01/2024' },
  { id: 'ACH-2024-0032', supplier: 'Matériaux Pro', amount: 890000, status: 'en attente', date: '03/01/2024', deliveryDate: '15/01/2024' },
  { id: 'ACH-2024-0031', supplier: 'Fournisseur ABC', amount: 340000, status: 'expédiée', date: '02/01/2024', deliveryDate: '05/01/2024' },
  { id: 'ACH-2024-0030', supplier: 'Global Parts', amount: 675000, status: 'annulée', date: '01/01/2024', deliveryDate: '-' },
]

// Suppliers data
const suppliers = [
  { name: 'Fournisseur ABC', totalOrders: 45, totalAmount: 4500000, rating: 4.8, status: 'actif' },
  { name: 'TechSupply DZ', totalOrders: 28, totalAmount: 2100000, rating: 4.5, status: 'actif' },
  { name: 'Matériaux Pro', totalOrders: 18, totalAmount: 1850000, rating: 4.2, status: 'actif' },
  { name: 'Global Parts', totalOrders: 12, totalAmount: 980000, rating: 3.9, status: 'inactif' },
]

function getOrderStatus(status: string) {
  const variants: Record<string, string> = {
    'livrée': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'en cours': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'en attente': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'expédiée': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'annulée': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  )
}

export default function PurchasesPage() {
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
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau Fournisseur
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvelle Commande
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {purchasesKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="commandes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="demandes">Demandes</TabsTrigger>
        </TabsList>

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
                  <CardTitle>Commandes d'Achat</CardTitle>
                  <div className="relative w-64 hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher une commande..." className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Montant (DZD)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Livraison Prévue</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.supplier}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(order.amount)}</TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell>{getOrderStatus(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Fournisseurs Tab */}
        <TabsContent value="fournisseurs" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Liste des Fournisseurs</CardTitle>
                <CardDescription>Gestion du portefeuille fournisseurs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Total Commandes</TableHead>
                      <TableHead>Montant Total (DZD)</TableHead>
                      <TableHead>Évaluation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.totalOrders}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(supplier.totalAmount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{supplier.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={supplier.status === 'actif' ? 'default' : 'secondary'}>
                            {supplier.status === 'actif' ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Factures Tab */}
        <TabsContent value="factures">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Factures Fournisseurs</CardTitle>
                <CardDescription>Suivi des factures reçues et à payer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Liste des factures fournisseurs à venir</p>
                  <p className="text-sm">Module en développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Demandes Tab */}
        <TabsContent value="demandes">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Demandes d'Achat</CardTitle>
                <CardDescription>Demandes internes en attente de validation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { requestor: 'Dépt Commercial', item: 'Matériel informatique', amount: 250000, urgency: 'normal' },
                    { requestor: 'Dépt Production', item: 'Matières premières', amount: 850000, urgency: 'urgent' },
                    { requestor: 'Dépt IT', item: 'Licences logiciels', amount: 120000, urgency: 'normal' },
                  ].map((request, index) => (
                    <Card key={index} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant={request.urgency === 'urgent' ? 'destructive' : 'secondary'}>
                            {request.urgency === 'urgent' ? 'Urgent' : 'Normal'}
                          </Badge>
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h4 className="font-semibold">{request.item}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{request.requestor}</p>
                        <p className="text-lg font-bold text-primary mt-2">
                          {new Intl.NumberFormat('fr-DZ').format(request.amount)} DZD
                        </p>
                        <Button size="sm" className="w-full mt-3" variant="outline">
                          Valider
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
