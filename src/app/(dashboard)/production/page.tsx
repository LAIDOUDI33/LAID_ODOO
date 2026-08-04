'use client'

import React from 'react'
import { 
  Factory, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Play,
  Pause
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
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion } from 'framer-motion'

// Production KPIs
const productionKpis = [
  {
    title: "OF en Cours",
    value: 12,
    change: null,
    icon: Factory,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "Production du Mois",
    value: 4520,
    change: 8.3,
    icon: Factory,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "number" as const
  },
  {
    title: "Taux de Rendement",
    value: 87.5,
    change: 2.1,
    icon: CheckCircle,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "percentage" as const
  },
  {
    title: "Rebuts (%)",
    value: 2.3,
    change: -0.8,
    icon: AlertTriangle,
    iconColor: "text-red-600",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    format: "percentage" as const
  },
]

// Production orders
const productionOrders = [
  { id: 'OF-2024-0012', product: 'Produit A - Standard', quantity: 500, produced: 350, status: 'en cours', deadline: '15/01/2024' },
  { id: 'OF-2024-0011', product: 'Produit B - Pro', quantity: 200, produced: 200, status: 'terminé', deadline: '05/01/2024' },
  { id: 'OF-2024-0010', product: 'Pack Complet E', quantity: 50, produced: 25, status: 'en cours', deadline: '20/01/2024' },
  { id: 'OF-2024-0009', product: 'Composant D', quantity: 1000, produced: 0, status: 'planifié', deadline: '25/01/2024' },
]

function getOfStatus(status: string) {
  const variants: Record<string, string> = {
    'en cours': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'terminé': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'planifié': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    'en pause': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'annulé': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  )
}

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Factory className="w-8 h-8 text-primary" />
            Production
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des ordres de fabrication et suivi de production
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Config
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvel OF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {productionKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="ordres" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="ordres">Ordres de Fabrication</TabsTrigger>
          <TabsTrigger value="ateliers">Ateliers</TabsTrigger>
          <TabsTrigger value="qualité">Qualité</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        {/* Ordres Tab */}
        <TabsContent value="ordres" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Ordres de Fabrication Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° OF</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Progression</TableHead>
                      <TableHead>Date Limite</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionOrders.map((order) => {
                      const progress = (order.produced / order.quantity) * 100
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono font-medium">{order.id}</TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell>{order.produced} / {order.quantity}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="w-20 h-2" />
                              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{order.deadline}</TableCell>
                          <TableCell>{getOfStatus(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              {order.status === 'en cours' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Ateliers Tab */}
        <TabsContent value="ateliers">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Atelier A - Assemblage', status: 'actif', ofEnCours: 3, efficiency: 92 },
                { name: 'Atelier B - Finition', status: 'actif', ofEnCours: 2, efficiency: 88 },
                { name: 'Atelier C - Contrôle Qualité', status: 'actif', ofEnCours: 1, efficiency: 95 },
                { name: 'Atelier D - Emballage', status: 'maintenance', ofEnCours: 0, efficiency: 85 },
              ].map((atelier, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold">{atelier.name}</h3>
                      <Badge variant={atelier.status === 'actif' ? 'default' : 'secondary'}>
                        {atelier.status === 'actif' ? 'Actif' : atelier.status}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">OF en cours</span>
                        <span className="font-medium">{atelier.ofEnCours}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rendement</span>
                        <span className="font-medium">{atelier.efficiency}%</span>
                      </div>
                      <Progress value={atelier.efficiency} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Qualité Tab */}
        <TabsContent value="qualite">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Contrôle Qualité</CardTitle>
                <CardDescription>Suivi des non-conformités et indicateurs qualité</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Module Qualité à venir</p>
                  <p className="text-sm">En développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Planning de Production</CardTitle>
                <CardDescription>Calendrier et planification des ordres de fabrication</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Planning interactif à venir</p>
                  <p className="text-sm">En développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
