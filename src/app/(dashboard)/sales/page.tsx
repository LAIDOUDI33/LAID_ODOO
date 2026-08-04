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
  MapPin
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

// Sales KPIs
const salesKpis = [
  {
    title: "Commandes du Mois",
    value: 147,
    change: 12.3,
    icon: ShoppingCart,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "CA Ventes (DZD)",
    value: 5200000,
    change: 8.5,
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Clients Actifs",
    value: 89,
    change: 4.2,
    icon: Users,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
  {
    title: "Panier Moyen",
    value: 35374,
    change: -2.1,
    icon: ShoppingCart,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "currency" as const
  },
]

// Recent orders
const recentOrders = [
  { id: 'CMD-2024-0142', client: 'SARL Algeria Tech', amount: 450000, status: 'livrée', date: '04/01/2024' },
  { id: 'CMD-2024-0141', client: 'EURL Services Pro', amount: 125000, status: 'en cours', date: '04/01/2024' },
  { id: 'CMD-2024-0140', client: 'Entreprise DZ', amount: 890000, status: 'préparée', date: '03/01/2024' },
  { id: 'CMD-2024-0139', client: 'Société ABC', amount: 340000, status: 'expédiée', date: '03/01/2024' },
  { id: 'CMD-2024-0138', client: 'DZ Commerce', amount: 675000, status: 'en attente', date: '02/01/2024' },
]

// Top clients
const topClients = [
  { name: 'SARL Algeria Tech', totalOrders: 45, revenue: 4500000, contact: 'contact@algeriatech.dz' },
  { name: 'Entreprise DZ', totalOrders: 32, revenue: 3200000, contact: 'info@entreprisedz.dz' },
  { name: 'EURL Services Pro', totalOrders: 28, revenue: 2100000, contact: 'services@pro.dz' },
  { name: 'Société ABC', totalOrders: 24, revenue: 1850000, contact: 'commercial@abc.dz' },
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
            Ventes & CRM
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des ventes, clients et relations commerciales
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
                  <CardTitle>Commandes Récentes</CardTitle>
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
                        <TableCell className="font-medium">{order.id}</TableCell>
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
                <CardTitle>Clients Principaux</CardTitle>
                <CardDescription>Vos meilleurs clients par chiffre d'affaires</CardDescription>
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
                            <Mail className="w-3 h-3" />
                            {client.contact}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {new Intl.NumberFormat('fr-DZ').format(client.revenue)} DZD
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
                <CardTitle>Pipeline Commercial</CardTitle>
                <CardDescription>Suivi des opportunités en cours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Pipeline des opportunités à venir</p>
                  <p className="text-sm">Module en développement</p>
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
                <CardDescription>Création et suivi des devis clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Liste des devis à venir</p>
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
