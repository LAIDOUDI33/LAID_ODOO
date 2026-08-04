'use client'

import React from 'react'
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
  DollarSign
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
import { motion } from 'framer-motion'

// Enterprise Sales KPIs - Scaled
const salesKpis = [
  {
    title: "Commandes du Mois",
    value: 1847,
    change: 12.3,
    icon: ShoppingCart,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "CA Ventes (DZD)",
    value: 5200000000,
    change: 8.5,
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Clients Actifs",
    value: 2450,
    change: 4.2,
    icon: Users,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
  {
    title: "Panier Moyen",
    value: 2815400,
    change: -2.1,
    icon: ShoppingCart,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "currency" as const
  },
]

// Recent orders (enterprise scale)
const recentOrders = [
  { id: 'CMD-2024-1847', client: 'SARL Algeria Tech Group', amount: 45000000, status: 'livrée', date: '04/01/2024' },
  { id: 'CMD-2024-1846', client: 'EURL Services Pro', amount: 12500000, status: 'en cours', date: '04/01/2024' },
  { id: 'CMD-2024-1845', client: 'Entreprise DZ National', amount: 89000000, status: 'préparée', date: '03/01/2024' },
  { id: 'CMD-2024-1844', client: 'Société ABC Holding', amount: 34000000, status: 'expédiée', date: '03/01/2024' },
  { id: 'CMD-2024-1843', client: 'DZ Commerce SARL', amount: 67500000, status: 'en attente', date: '02/01/2024' },
]

// Top clients (enterprise scale)
const topClients = [
  { name: 'SARL Algeria Tech Group', totalOrders: 450, revenue: 4500000000, contact: 'commercial@algeriatech.dz', wilaya: '16 - Alger' },
  { name: 'Entreprise DZ National', totalOrders: 320, revenue: 3200000000, contact: 'info@entreprisedz.dz', wilaya: '13 - Oran' },
  { name: 'EURL Services Pro', totalOrders: 280, revenue: 2100000000, contact: 'services@pro.dz', wilaya: '25 - Constantine' },
  { name: 'Société ABC Holding', totalOrders: 240, revenue: 1850000000, contact: 'contact@abc-holding.dz', wilaya: '09 - Béjaïa' },
]

function getOrderStatus(status: string) {
  const variants: Record<string, string> = {
    'livrée': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'en cours': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'préparée': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'expédiée': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'en attente': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  )
}

export default function SalesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Ventes & CRM Enterprise
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion commerciale pour 2,450+ clients • Pipeline multi-canal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau Client
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvelle Commande
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="commandes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="opportunites">Opportunités</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
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
                  <div className="flex items-center gap-3">
                    <CardTitle>Commandes Récentes</CardTitle>
                    <Badge variant="secondary">1,847 ce mois</Badge>
                  </div>
                  <div className="relative w-64 hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant (DZD)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium font-mono">{order.id}</TableCell>
                        <TableCell>{order.client}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(order.amount)}</TableCell>
                        <TableCell>{order.date}</TableCell>
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

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top Clients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Clients Principaux</CardTitle>
                    <CardDescription>Vos meilleurs clients par chiffre d'affaires</CardDescription>
                  </div>
                  <Badge className="bg-dz-green/10 text-dz-green border-dz-green/20">2,450+ clients</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topClients.map((client, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{client.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            {client.totalOrders} commandes
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.wilaya}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.contact}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {(client.revenue / 1000000).toFixed(0)}M DZD
                        </p>
                        <Badge variant="outline" className="mt-1">
                          Top #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Client Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">2,450</p>
                  <p className="text-sm text-muted-foreground">Clients Actifs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold">89%</p>
                  <p className="text-sm text-muted-foreground">Taux Fidélité</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">+156</p>
                  <p className="text-sm text-muted-foreground">Nouveaux/Mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-2xl font-bold">2.8M</p>
                  <p className="text-sm text-muted-foreground">Panier Moyen (DZD)</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Opportunités Tab */}
        <TabsContent value="opportunites">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Commercial Enterprise</CardTitle>
                <CardDescription>Suivi des opportunités en cours - Valeur totale: 850M DZD</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <p className="text-3xl font-bold text-blue-600">45</p>
                    <p className="text-sm text-muted-foreground">Qualification</p>
                    <p className="text-xs text-blue-600 mt-1">120M DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-center">
                    <p className="text-3xl font-bold text-yellow-600">32</p>
                    <p className="text-sm text-muted-foreground">Proposition</p>
                    <p className="text-xs text-yellow-600 mt-1">285M DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                    <p className="text-3xl font-bold text-purple-600">18</p>
                    <p className="text-sm text-muted-foreground">Négociation</p>
                    <p className="text-xs text-purple-600 mt-1">320M DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                    <p className="text-3xl font-bold text-green-600">12</p>
                    <p className="text-sm text-muted-foreground">Signature</p>
                    <p className="text-xs text-green-600 mt-1">125M DZD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Devis Tab */}
        <TabsContent value="devis">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Devis</CardTitle>
                <CardDescription>Création et suivi des devis clients - TVA incluse</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-3xl font-bold text-primary">234</p>
                    <p className="text-sm text-muted-foreground">Devis en cours</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-3xl font-bold text-green-600">78%</p>
                    <p className="text-sm text-muted-foreground">Taux conversion</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-3xl font-bold text-blue-600">45M DZD</p>
                    <p className="text-sm text-muted-foreground">Valeur en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
