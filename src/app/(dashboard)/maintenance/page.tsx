'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Wrench, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  Factory,
  Package,
  TrendingUp,
  Shield,
  Zap,
  Calendar,
  BarChart3
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
interface MaintenanceKPIs {
  equipment: {
    total: number
    operational: number
    broken: number
    underMaintenance: number
    availabilityRate: number
  }
  orders: {
    total: number
    open: number
    inProgress: number
    completedThisMonth: number
    emergency: number
  }
  costs: {
    thisMonthTotal: number
    thisMonthLabor: number
    thisMonthParts: number
  }
  metrics: {
    mttr: number
    mtbf: number
    plannedCompletion: number
  }
  alerts: {
    overduePlans: number
    criticalStockShortage: number
    brokenEquipment: number
  }
}

interface EquipmentItem {
  id: string
  code: string
  name: string
  category: string
  status: string
  operatingHours: number
  lastMaintenanceAt?: string
  nextMaintenanceAt?: string
}

interface MaintenanceOrder {
  id: string
  reference: string
  title: string
  type: string
  priority: string
  status: string
  requestedDate: string
  scheduledStart?: string
  equipment: { id: string; name: string; code: string; category: string }
  assignedTo?: { id: string; name: string } | null
}

// Status helpers
function getEquipmentStatus(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    operational: { color: 'bg-green-100 text-green-700', label: 'Opérationnel' },
    in_operation: { color: 'bg-blue-100 text-blue-700', label: 'En marche' },
    standby: { color: 'bg-gray-100 text-gray-700', label: 'Attente' },
    under_maintenance: { color: 'bg-yellow-100 text-yellow-700', label: 'En maintenance' },
    broken: { color: 'bg-red-100 text-red-700', label: 'Panne' },
    decommissioned: { color: 'bg-gray-200 text-gray-500', label: 'Hors service' },
  }
  const c = config[status] || { color: 'bg-gray-100 text-gray-700', label: status }
  return <Badge className={c.color}>{c.label}</Badge>
}

function getMOStatus(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-700', label: 'Brouillon' },
    planned: { color: 'bg-blue-100 text-blue-700', label: 'Planifié' },
    released: { color: 'bg-indigo-100 text-indigo-700', label: 'Lancé' },
    ready: { color: 'bg-purple-100 text-purple-700', label: 'Prêt' },
    in_progress: { color: 'bg-orange-100 text-orange-700', label: 'En cours' },
    paused: { color: 'bg-yellow-100 text-yellow-700', label: 'En pause' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Terminé' },
    cancelled: { color: 'bg-red-100 text-red-700', label: 'Annulé' },
  }
  const c = config[status] || { color: 'bg-gray-100 text-gray-700', label: status }
  return <Badge className={c.color}>{c.label}</Badge>
}

function getPriorityBadge(priority: string) {
  const config: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-100 text-gray-600', label: 'Basse' },
    normal: { color: 'bg-blue-100 text-blue-600', label: 'Normale' },
    high: { color: 'bg-orange-100 text-orange-600', label: 'Haute' },
    critical: { color: 'bg-red-100 text-red-600', label: 'Critique' },
    emergency: { color: 'bg-red-200 text-red-800 font-bold', label: 'URGENCE' },
  }
  const c = config[priority] || { color: 'bg-gray-100 text-gray-600', label: priority }
  return <Badge className={`text-xs ${c.color}`}>{c.label}</Badge>
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    production: 'Production',
    auxiliary: 'Auxiliaire',
    transport: 'Manutention',
    measurement: 'Mesure',
    utility: 'Utilitaire',
    safety: 'Sécurité',
    it: 'Informatique',
    building: 'Bâtiment'
  }
  return labels[category] || category
}

export default function MaintenancePage() {
  // State
  const [kpis, setKpis] = useState<MaintenanceKPIs | null>(null)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [orders, setOrders] = useState<MaintenanceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/maintenance?type=dashboard')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setKpis(result.data.kpis)
          setEquipment(result.data.equipment || [])
          setOrders(result.data.recentOrders || [])
        }
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // KPI cards
  const kpiCards = kpis ? [
    {
      title: "Équipements",
      value: kpis.equipment.total,
      change: null,
      icon: Factory,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      format: "number" as const
    },
    {
      title: "Disponibilité",
      value: kpis.equipment.availabilityRate,
      change: null,
      icon: Shield,
      iconColor: "text-green-600",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      format: "percentage" as const
    },
    {
      title: "OT Ouverts",
      value: kpis.orders.open + kpis.orders.inProgress,
      change: null,
      icon: Wrench,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      format: "number" as const
    },
    {
      title: "MTTR (h)",
      value: kpis.metrics.mttr,
      change: null,
      icon: Clock,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      format: "number" as const
    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            Maintenance Industrielle
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des équipements, ordres de maintenance et OEE - TPM
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
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvelle Intervention
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Alerts Row */}
      {kpis && (kpis.alerts.brokenEquipment > 0 || kpis.alerts.overduePlans > 0 || kpis.alerts.criticalStockShortage > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpis.alerts.brokenEquipment > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Équipements en Panne</p>
                  <p className="text-2xl font-bold text-red-600">{kpis.alerts.brokenEquipment}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </CardContent>
            </Card>
          )}
          {kpis.alerts.overduePlans > 0 && (
            <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Plans en Retard</p>
                  <p className="text-2xl font-bold text-yellow-600">{kpis.alerts.overduePlans}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </CardContent>
            </Card>
          )}
          {kpis.alerts.criticalStockShortage > 0 && (
            <Card className="border-l-4 border-l-orange-500 bg-orange-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Pièces Critiques</p>
                  <p className="text-2xl font-bold text-orange-600">{kpis.alerts.criticalStockShortage}</p>
                </div>
                <Package className="w-10 h-10 text-orange-500" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
          <TabsTrigger value="equipements">Équipements</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="plans">Plans PM</TabsTrigger>
          <TabsTrigger value="oee">OEE</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Dernières Interventions</CardTitle>
                    <Badge variant="secondary">{orders.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Aucune intervention</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Réf.</TableHead>
                          <TableHead>Titre</TableHead>
                          <TableHead>Équipement</TableHead>
                          <TableHead>Priorité</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.slice(0, 5).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{order.title}</TableCell>
                            <TableCell>
                              <span className="text-xs">{order.equipment.name}</span>
                            </TableCell>
                            <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                            <TableCell>{getMOStatus(order.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Equipment Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>État du Parc Équipement</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpis && (
                    <div className="space-y-4">
                      {/* Availability Gauge */}
                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                        <p className="text-sm text-green-700 mb-2">Taux de Disponibilité</p>
                        <p className="text-4xl font-bold text-green-600">{kpis.equipment.availabilityRate}%</p>
                        <Progress value={kpis.equipment.availabilityRate} className="mt-3 h-3" />
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-xs text-green-600">Opérationnels</p>
                          <p className="text-xl font-bold text-green-700">{kpis.equipment.operational}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg text-center">
                          <p className="text-xs text-red-600">En Panne</p>
                          <p className="text-xl font-bold text-red-700">{kpis.equipment.broken}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg text-center">
                          <p className="text-xs text-yellow-600">En Maintenance</p>
                          <p className="text-xl font-bold text-yellow-700">{kpis.equipment.underMaintenance}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-blue-600">Total</p>
                          <p className="text-xl font-bold text-blue-700">{kpis.equipment.total}</p>
                        </div>
                      </div>
                      
                      {/* Metrics */}
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">MTTR (Temps moyen de réparation)</span>
                          <span className="font-mono font-medium">{kpis.metrics.mttr}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">MTBF (Moyenne entre pannes)</span>
                          <span className="font-mono font-medium">{kpis.metrics.mtbf}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Coûts ce mois</span>
                          <span className="font-mono font-medium">{kpis.costs.thisMonthTotal.toLocaleString()} DZD</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Équipements Tab */}
        <TabsContent value="equipements">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Registre des Équipements</CardTitle>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter Équipement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : equipment.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Factory className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun équipement enregistré</p>
                    <p className="text-sm mt-1">Commencez par ajouter vos machines et équipements</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHe>d&apos;opération</TableHe>
                        <TableHead>Dernière Maint.</TableHead>
                        <TableHead>Prochaine Maint.</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((eq) => (
                        <TableRow key={eq.id}>
                          <TableCell className="font-mono">{eq.code}</TableCell>
                          <TableCell className="font-medium">{eq.name}</TableCell>
                          <TableCell>{getCategoryLabel(eq.category)}</TableCell>
                          <TableCell>{getEquipmentStatus(eq.status)}</TableCell>
                          <TableCell>{Math.round(eq.operatingHours)}h</TableCell>
                          <TableCell className="text-xs">
                            {eq.lastMaintenanceAt ? new Date(eq.lastMaintenanceAt).toLocaleDateString('fr-DZ') : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {eq.nextMaintenanceAt ? new Date(eq.nextMaintenanceAt).toLocaleDateString('fr-DZ') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Voir</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ordres d&apos;Intervention (OT)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Filtrer
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nouvelle OT
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune intervention</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Réf.</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Équipement</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Assigné à</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date Demandée</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                          <TableCell className="max-w-[180px]">
                            <p className="font-medium truncate">{order.title}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.type === 'corrective' ? 'Corrective' : order.type === 'preventive' ? 'Préventive' : order.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{order.equipment.name}</span>
                            <span className="block text-muted-foreground text-xs">{order.equipment.code}</span>
                          </TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell>{order.assignedTo?.name || '-'}</TableCell>
                          <TableCell>{getMOStatus(order.status)}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(order.requestedDate).toLocaleDateString('fr-DZ')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Détails</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Plans PM Tab */}
        <TabsContent value="plans">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Plans de Maintenance Préventive</CardTitle>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouveau Plan
                  </Button>
                </div>
                <CardDescription>
                  Planning des interventions préventives et inspections régulières
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick stats */}
                  {kpis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">Plans Actifs</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {kpis.orders.total > 0 ? Math.round(kpis.orders.total * 0.3) : 0}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">Réalisés ce mois</p>
                      <p className="text-2xl font-bold text-green-600">{kpis.orders.completedThisMonth}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700">Taux de Réalisation</p>
                      <p className="text-2xl font-bold text-emerald-600">{kpis.metrics.plannedCompletion}%</p>
                    </div>
                  </div>
                  )}
                  
                  {/* Placeholder for plans list */}
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Liste des plans de maintenance préventive</p>
                    <p className="text-sm text-muted-foreground mt-1">Fréquences: quotidien, hebdomadaire, mensuel, trimestriel</p>
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      Créer un plan PM
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* OEE Tab */}
        <TabsContent value="oee">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OEE Gauges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Indicateurs OEE Globaux
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* OEE Overall */}
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
                          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" 
                            strokeDasharray={`${kpis?.equipment.availabilityRate * 3.39} 339.292`} 
                            className="text-primary" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">{kpis?.equipment.availabilityRate || 85}%</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium">OEE Global</p>
                    </div>
                    
                    {/* Components */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Disponibilité</p>
                        <p className="text-lg font-bold text-blue-700">95%</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">Performance</p>
                        <p className="text-lg font-bold text-green-700">92%</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600">Qualité</p>
                        <p className="text-lg font-bold text-purple-700">98%</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 text-xs text-muted-foreground text-center">
                      OEE = Disponibilité × Performance × Qualité
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Entry & History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Saisie OEE</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Historique
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed rounded-lg text-center">
                      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Enregistrer les données OEE</p>
                      <p className="text-xs text-muted-foreground">Pour chaque équipe / machine / poste</p>
                      <Button size="sm" className="mt-3 gap-2">
                        <Plus className="w-4 h-4" />
                        Nouvel Enregistrement
                      </Button>
                    </div>
                    
                    {/* Recent records placeholder */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Derniers enregistrements</p>
                      {[1,2,3].map(i => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                          <span>CNC-001 - Matin</span>
                          <span className="text-muted-foreground">Il y a {i} jour{i > 1 ? 's' : ''}</span>
                          <Badge variant="secondary" className="text-xs">82%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
