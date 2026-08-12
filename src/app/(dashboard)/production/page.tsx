'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Factory, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Package,
  Target,
  TrendingUp,
  Shield
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

// Types
interface ProductionKPIs {
  workOrders: {
    total: number
    inProgress: number
    completed: number
    planned: number
    paused: number
    thisMonth: number
  }
  quantities: {
    planned: number
    produced: number
    scrapped: number
  }
  quality: {
    total: number
    passed: number
    failed: number
    passRate: number
  }
  oee: {
    efficiency: number
    availability: number
    performance: number
    quality: number
    overall: number
  }
  scrapRate: number
}

interface WorkOrder {
  id: string
  reference: string
  status: string
  quantityPlanned: number
  quantityProduced: number
  quantityScrapped: number
  scheduledStart?: string
  scheduledEnd?: string
  priority: string
  product: { id: string; name: string; code: string }
  workCenter?: { id: string; name: string; type: string } | null
}

interface WorkCenterData {
  id: string
  code: string
  name: string
  type: string
  efficiency: number
  status: string
  activeOrders: number
}

// Status badge variants
function getOfStatus(status: string) {
  const variants: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    'planned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'released': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'in_progress': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'paused': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  
  const labels: Record<string, string> = {
    'draft': 'Brouillon',
    'planned': 'Planifié',
    'released': 'Lancé',
    'in_progress': 'En cours',
    'paused': 'En pause',
    'completed': 'Terminé',
    'cancelled': 'Annulé',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {labels[status] || status}
    </Badge>
  )
}

function getPriorityBadge(priority: string) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
    critical: 'bg-red-200 text-red-800 font-bold',
  }
  
  const labels: Record<string, string> = {
    low: 'Basse',
    normal: 'Normale',
    high: 'Haute',
    urgent: 'Urgente',
    critical: 'Critique',
  }
  
  return (
    <Badge className={`text-xs ${colors[priority] || ''}`}>
      {labels[priority] || priority}
    </Badge>
  )
}

export default function ProductionPage() {
  // State
  const [kpis, setKpis] = useState<ProductionKPIs | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenterData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ordres')
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/production?type=dashboard')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setKpis(result.data.kpis)
          setWorkOrders(result.data.recentOrders || [])
          setWorkCenters(result.data.workCenters || [])
        }
      }
    } catch (error) {
      console.error('Error fetching production data:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Derived KPI cards
  const kpiCards = kpis ? [
    {
      title: "OF en Cours",
      value: kpis.workOrders.inProgress,
      icon: Factory,
      iconColor: "text-dz-green",
      iconBg: "bg-dz-green/10",
      format: "number" as const
    },
    {
      title: "Production du Mois",
      value: kpis.quantities.produced,
      change: null,
      icon: Package,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      format: "number" as const
    },
    {
      title: "Taux de Rendement",
      value: kpis.oee.efficiency,
      change: null,
      icon: Target,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      format: "percentage" as const
    },
    {
      title: "Rebuts (%)",
      value: kpis.scrapRate,
      change: null,
      icon: AlertTriangle,
      iconColor: "text-red-600",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      format: "percentage" as const
    },
  ] : []

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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
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
        {kpiCards.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Additional Stats Row */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Qualité</p>
                <p className="text-xl font-bold text-green-600">{kpis.quality.passRate}%</p>
              </div>
              <Shield className="w-8 h-8 text-green-500 opacity-50" />
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">OEE Global</p>
                <p className="text-xl font-bold text-blue-600">{kpis.oee.overall}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">OF Planifiés</p>
                <p className="text-xl font-bold text-purple-600">{kpis.workOrders.planned}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500 opacity-50" />
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">OF Terminés</p>
                <p className="text-xl font-bold text-emerald-600">{kpis.workOrders.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500 opacity-50" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <CardTitle>Ordres de Fabrication Actifs</CardTitle>
                  <Badge variant="secondary">
                    {workOrders.length} OF{workOrders.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun ordre de fabrication</p>
                    <p className="text-sm">Créez votre premier OF pour commencer</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° OF</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Progression</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Atelier</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workOrders.map((order) => {
                        const progress = order.quantityPlanned > 0 
                          ? (order.quantityProduced / order.quantityPlanned) * 100 
                          : 0
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono font-medium">{order.reference}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.product.name}</p>
                                <p className="text-xs text-muted-foreground">{order.product.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.quantityProduced.toLocaleString()} / {order.quantityPlanned.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={progress} className="w-20 h-2" />
                                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                            <TableCell>{order.workCenter?.name || '-'}</TableCell>
                            <TableCell>{getOfStatus(order.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                {order.status === 'in_progress' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
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
              {(workCenters.length > 0 ? workCenters : [
                { name: 'Atelier A - Assemblage', type: 'assembly', status: 'actif', activeOrders: 3, efficiency: 92, code: 'WC-001' },
                { name: 'Atelier B - Finition', type: 'machine', status: 'actif', activeOrders: 2, efficiency: 88, code: 'WC-002' },
                { name: 'Atelier C - Contrôle Qualité', type: 'quality', status: 'actif', activeOrders: 1, efficiency: 95, code: 'WC-003' },
                { name: 'Atelier D - Emballage', type: 'packaging', status: 'maintenance', activeOrders: 0, efficiency: 85, code: 'WC-004' },
              ]).map((atelier, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{atelier.name}</h3>
                        <p className="text-xs text-muted-foreground">{atelier.code || `Type: ${atelier.type}`}</p>
                      </div>
                      <Badge 
                        variant={atelier.status === 'actif' || atelier.status === 'available' || atelier.status === 'busy' ? 'default' : 'secondary'}
                        className={
                          atelier.status === 'maintenance' || atelier.status === 'offline' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : ''
                        }
                      >
                        {atelier.status === 'busy' ? 'Occupé' : atelier.status === 'actif' ? 'Actif' : atelier.status}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">OF en cours</span>
                        <span className="font-medium">{atelier.activeOrders || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rendement</span>
                        <span className="font-medium">{atelier.efficiency}%</span>
                      </div>
                      <Progress value={atelier.efficiency} className="h-2" />
                      
                      {/* OEE Indicators */}
                      {kpis && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Disponibilité</span>
                            <span>{kpis.oee.availability}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Performance</span>
                            <span>{kpis.oee.performance}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Qualité</span>
                            <span>{kpis.oee.quality}%</span>
                          </div>
                        </div>
                      )}
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
                {kpis ? (
                  <div className="space-y-6">
                    {/* Quality KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-green-700">Taux de Conformité</p>
                          <p className="text-3xl font-bold text-green-600">{kpis.quality.passRate}%</p>
                          <p className="text-xs text-green-600 mt-1">{kpis.quality.passed}/{kpis.quality.total} contrôles</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-red-700">Non-Conformités</p>
                          <p className="text-3xl font-bold text-red-600">{kpis.quality.failed}</p>
                          <p className="text-xs text-red-600 mt-1">Ce mois</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-blue-700">Rebut Total</p>
                          <p className="text-3xl font-bold text-blue-600">{kpis.scrapRate}%</p>
                          <p className="text-xs text-blue-600 mt-1">Taux de rebut</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Quality Actions */}
                    <div className="flex justify-center gap-4 pt-4">
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nouveau Contrôle
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Voir l'historique
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chargement des données qualité...</p>
                  </div>
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Planning Summary */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Résumé du Planning</h4>
                    {kpis && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm">OF à planifier</span>
                          <Badge className="bg-blue-100 text-blue-700">{kpis.workOrders.planned}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                          <span className="text-sm">En attente</span>
                          <Badge className="bg-yellow-100 text-yellow-700">{kpis.workOrders.paused}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-sm">En cours</span>
                          <Badge className="bg-green-100 text-green-700">{kpis.workOrders.inProgress}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                          <span className="text-sm">Terminés ce mois</span>
                          <Badge className="bg-emerald-100 text-emerald-700">{kpis.workOrders.completed}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Actions Rapides</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Clock className="w-4 h-4" />
                        Voir le calendrier
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Plus className="w-4 h-4" />
                        Planifier un nouvel OF
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Factory className="w-4 h-4" />
                        Capacité des ateliers
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Package className="w-4 h-4" />
                        Besoin matières (MRP)
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Placeholder for Gantt Chart */}
                <div className="mt-6 p-8 border-2 border-dashed rounded-lg text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Diagramme de Gantt interactif</p>
                  <p className="text-sm text-muted-foreground mt-1">Visualisation temporelle des OF (bientôt disponible)</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
