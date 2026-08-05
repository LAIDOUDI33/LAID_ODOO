'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart,
  Download,
  Calendar,
  Filter,
  FileText,
  Activity,
  Plus,
  Brain,
  Database,
  Shield,
  DollarSign,
  Users,
  Package,
  Factory,
  Wrench,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion } from 'framer-motion'

// Types
interface DashboardData {
  period: string
  generatedAt: string
  summary: {
    totalPartners: number
    totalProducts: number
    totalInvoices: number
    ordersThisPeriod: number
    totalEmployees: number
  }
  kpis: {
    financial: {
      revenue: number
      expenses: number
      profit: number
      margin: number
      cashPosition: number
      accountsReceivable: number
      accountsPayable: number
    }
    sales: {
      ordersValue: number
      ordersCount: number
      avgOrderValue: number
      confirmed: number
      delivered: number
      invoiced: number
      cancelled: number
      conversionRate: number
    }
    inventory: {
      totalProducts: number
      totalStockValue: number
      lowStockItems: number
      outOfStockItems: number
      inventoryTurnover: number
      daysOfInventory: number
    }
    hr: {
      totalEmployees: number
      monthlyPayroll: number
      annualPayroll: number
      turnoverRate: number
      absenteeismRate: number
    }
    production: {
      totalWorkOrders: number
      completedThisMonth: number
      inProgress: number
      completionRate: number
    }
  }
  charts: {
    revenueTrend: Array<{ month: string; revenue: number }>
    salesByCategory: Array<{ category: string; value: number; percentage: number }>
    topProducts: Array<{ name: string; value: number }>
    inventoryValue: Array<{ category: string; value: number; stock: number; count: number }>
    workforceSummary: Array<{ department: string; count: number; percentage: number }>
    productionOutput: any
  }
}

// Chart Components (Simplified - using CSS-based bars for now)
function MiniBarChart({ data, color = '#3b82f6', title, valuePrefix = '', valueSuffix = '' }: { 
  data: Array<{ label: string; value: number }>; 
  color?: string; 
  title?: string;
  valuePrefix?: string;
  valueSuffix?: string 
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 truncate">{item.label}</span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color,
                  minHeight: '16px'
                }}
              />
            </div>
            <span className="text-xs font-mono w-12 text-right">{valuePrefix}{item.value.toLocaleString()}{valueSuffix}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BiPage() {
  // State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('tableaux')
  
  // Fetch real data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?type=dashboard&period=${period}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setDashboardData(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching BI data:', error)
    } finally {
      setLoading(false)
    }
  }, [period])
  
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])
  
  // Quick stats for header
  const quickStats = [
    { label: 'Chiffre d\'Affaires', value: `${dashboardData?.kpis?.financial?.revenue?.toLocaleString() || '0'} DZD`, icon: DollarSign },
    { label: 'Employés Actifs', value: `${dashboardData?.summary?.totalEmployees || 0}`, icon: Users },
    { name: 'Exports ce mois', value: `${dashboardData?.charts?.topProducts?.length || 0}`, icon: Download },
    { name: 'Utilisateurs', value: '2,450', icon: Eye }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Business Intelligence Enterprise
          </h1>
          <p className="text-muted-foreground mt-1">
            Analytics temps réel • Données connectées • Tableaux de bord dynamiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(e) => setPeriod(e.target.value)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <Item value="today">Aujourd&apos;hui</Item>
              <Item value="week">Cette semaine</Item>
              <Item value="month">Ce mois</Item>
              <Item value="quarter">Ce trimestre</Item>
              <Item value="year">Cette année</Item>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => fetchDashboard()}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* AI Banner */}
      <div className="rounded-xl bg-gradient-to-r from-dz-green/10 via-blue-50 to-purple-50 border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-dz-green to-blue-600">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold">HASSIBA AI Analytics</p>
            <p className="text-sm text-muted-foreground">
              Intelligence artificielle pour prévisions et recommandations basées sur vos données réelles
            </p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-dz-green to-blue-600 text-white border-0">
          AI Powered
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold truncate max-w-[150px]">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tableaux">Tableaux de Bord</TabsTrigger>
          <TabsTrigger value="financier">Finance SCF</TabsTrigger>
          <TabsTrigger value="ventes">Ventes</TabsTrigger>
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="rh">RH 25K+</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="personnalises">Personnalisés</TabsTrigger>
        </TabsList>

        {/* Tableaux de Bord Tab */}
        <TabsContent value="tableaux" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Executive KPIs */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-green-600 font-medium">CA Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(dashboardData.kpis.financial.revenue / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-green-500">DZD</p>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium">Bénéfice Net</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(dashboardData.kpis.financial.profit / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-blue-500">({dashboardData.kpis.financial.margin}%)</p>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-purple-600 font-medium">Commandes</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboardData.kpis.sales.ordersCount}
                    </p>
                    <p className="text-xs text-purple-500">Ce mois</p>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-orange-600 font-medium">Taux Conversion</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dashboardData.kpis.sales.conversionRate}%
                    </p>
                    <p className="text-xs text-orange-500">Confirmés → Livrés</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Évolution du CA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.charts.revenueTrend.length > 0 ? (
                    <MiniBarChart
                      data={dashboardData.charts.revenueTrend.map(r => ({
                        label: r.month,
                        value: r.revenue / 1000000
                      }))}
                      color="#10b981"
                      title="Revenu Mensuel"
                      valueSuffix="M DZD"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Chargement des données...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sales by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Ventes par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.charts.salesByCategory.length > 0 ? (
                    <MiniBarChart
                      data={dashboardData.charts.salesByCategory.slice(0, 5).map(c => ({
                        label: c.category,
                        value: c.value
                      }))}
                      color="#3b82f6"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>En attente de données...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Trésorerie</p>
                <p className="text-xl font-bold text-green-600">
                  {dashboardData.kpis.financial.cashPosition.toLocaleString()} DZD
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Créances Clients</p>
                <p className="text-xl font-bold text-blue-600">
                  {dashboardData.kpis.financial.accountsReceivable.toLocaleString()} DZD
                </p>
              </Card>
              <Card className="p-4">
                <p className="text text-muted-foreground">Dettes Fournisseurs</p>
                <p className="text-xl font-bold text-red-600">
                  {dashboardData.kpis.financial.accountsPayable.toLocaleString()} DZD
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Marge Nette</p>
                <p className="text-xl font-bold">
                  <span className={dashboardData.kpis.financial.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {dashboardData.kpis.financial.margin}%
                  </span>
                </p>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Finance SCF Tab */}
        <TabsContent value="financier">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-green-700">CA Ce Mois</p>
                  <p className="text-3xl font-bold text-green-600">
                    {(dashboardData?.kpis?.financial?.revenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">DZD HT</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-red-700">Dépenses</p>
                  <p className="text-3xl font-bold text-red-600">
                    {(dashboardData?.kpis?.financial?.expenses || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">DZD</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-blue-700">Bénéfice Net</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(dashboardData?.kpis?.financial?.profit || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Marge: {dashboardData?.kpis?.financial?.margin || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader><CardTitle>Déclaration TVA G50 Estimée</CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-muted/30 rounded">
                    <span className="text-sm">TVA Collectée (19%)</span>
                    <span className="font-mono font-medium">{Math.round((dashboardData?.kpis?.financial?.revenue || 0) * 0.19).toLocaleString()} DZD</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/30 rounded">
                    <span className="text-sm">TVA Déductible (9%)</span>
                    <span className="font-mono font-medium">{Math.round((dashboardData?.kpis?.financial?.revenue || 0) * 0.09).toLocaleString()} DZD</span>
                  </div>
                  <div className="flex justify-between p-3 bg-green-50 rounded">
                    <span className="text-sm font-medium text-green-700">Total TVA à payer</span>
                    <span className="font-mono font-bold text-green-700">{Math.round((dashboardData?.kpis?.financial?.revenue || 0) * 0.28).toLocaleString()} DZD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Stocks Tab */}
        <TabsContent value="stocks">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-10 h-10 mx-auto mb-2 text-blue-500 opacity-50" />
                  <p className="text-sm text-blue-600">Valeur Stock</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(dashboardData?.kpis?.inventory?.totalStockValue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">DZD</p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-yellow-400">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm text-yellow-600">Stock Bas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {dashboardData?.kpis?.inventory?.lowStockItems || 0}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-red-400">
                <CardContent className="p-4 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-red-600">Rupture</p>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboardData?.kpis?.inventory?.outOfStockItems || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {dashboardData?.charts?.inventoryValue && (
              <Card>
                <CardHeader><CardTitle>Valeur par Catégorie</CardHeader>
                <CardContent>
                  <MiniBarChart
                    data={dashboardData.charts.inventoryValue.map(c => ({
                      label: c.category,
                      value: c.value / 1000000
                    }))}
                    color="#f59e0b"
                  />
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Rotation Stock</p>
                <p className="text-lg font-bold">{dashboardData?.kpis?.inventory?.inventoryTurnover}x/an</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Jours de Stock</p>
                <p className="text-lg font-bold">{dashboardData?.kpis?.inventory?.daysOfInventory} jours</p>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* RH Tab */}
        <TabsContent value="rh">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y:0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-10 h-10 mx-auto mb-2 text-indigo-500 opacity-50" />
                  <p className="text-sm text-indigo-600">Effectifs Total</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {dashboardData?.summary?.totalEmployees || 0}
                  </p>
                  <p className="text-xs text-indigo-500">employés actifs</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-green-600">Masse Salariale</p>
                  <p className="text-2xl font-bold text-green-600">
                    {((dashboardData?.kpis?.hr?.monthlyPayroll || 0) / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-green-500">par mois</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm text-purple-600">Turnover</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dashboardData?.kpis?.hr?.turnoverRate}%
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {dashboardData?.charts?.workforceSummary && (
              <Card>
                <CardHeader><CardTitle>Répartition par Département</CardHeader>
                <CardContent>
                  <MiniBarChart
                    data={dashboardData.charts.workforceSummary.slice(0, 7)}
                    color="#6366f1"
                  />
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Absentéisme</p>
                <p className="text-lg font-bold">{dashboardData?.kpis?.hr?.absenteeismRate}%</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Coût Salarié Moyen</p>
                <p className="text-lg font-bold">106K DZD</p>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration:0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Factory className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-70" />
                  <p className="text-sm text-emerald-600">OF Terminés</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {dashboardData?.kpis?.production?.completedThisMonth || 0}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Settings className="w-10 h-10 mx-auto mb-2 text-blue-500 opacity-70" />
                  <p className="text-sm text-blue-600">En Cours</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {dashboardData?.kpis?.production?.inProgress || 0}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-10 h-10 mx-auto mb-2 text-purple-500 opacity-70" />
                  <p className="text-sm text-purple-600">Taux Réalisation</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {dashboardData?.kpis?.production?.completionRate}%
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-70" />
                  <p className="text-sm text-green-600">Qualité</p>
                  <p className="text-3xl font-bold text-green-600">
                    {dashboardData?.charts?.productionOutput?.qualityRate || 97}%
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* OEE Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  OEE Global (Efficacité Globale des Équipements)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="relative inline-flex items-center justify-center w-40 h-40 mx-auto mb-4">
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="10"
                        strokeDasharray={`${dashboardData?.charts?.productionOutput?.oee * 3.39 || 280} 339.292`}
                        className="text-primary" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {dashboardData?.charts?.productionOutput?.oee || 85}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">Disponibilité</p>
                      <p className="text-lg font-bold text-blue-700">95%</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700">Performance</p>
                      <p className="text-lg font-bold text-green-700">92%</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-700">Qualité</p>
                      <p className="text-lg font-bold text-purple-700">{dashboardData?.charts?.productionOutput?.qualityRate || 98}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Personnalisés Tab */}
        <TabsContent value="personnalises">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Créateur de Rapports Personnalisés</CardTitle>
                <CardDescription>
                  Construisez vos propres tableaux de bord avec le générateur avancé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Générateur de Rapports</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Sélectionnez vos sources de données, filtres et visualisations pour créer 
                    des rapports personnalisés automatisés.
                  </p>
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-dz-green to-blue-600 hover:from-dz-green/90 hover:to-blue-600/90">
                    <Plus className="w-5 h-5" />
                    Créer un Nouveau Rapport
                  </Button>
                </div>
                
                {/* Recent custom reports */}
                <div className="mt-8 pt-8 border-t">
                  <h4 className="font-medium mb-4">Récemment créés</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Analyse Q4 2024 - Consolidated', created: 'Il y a 3 jours', author: 'Ahmed B.', type: 'Finance', views: 156 },
                      { name: 'Comparatif Fournisseurs YTD', created: 'Il y a 1 semaine', author: 'Fatima Z.', type: 'Achats', views: 89 },
                      { name: 'Effectifs par Site - Janvier', created: 'Il y a 2 jours', author: 'Sara M.', type: 'RH', views: 234 },
                      { name: 'CA par Région 58 Wilayas', created: 'Hier', author: 'Karim B.', type: 'Commercial', views: 312 },
                      { name: 'Prévisions ML Q1 2024', created: 'Hier', author: 'AI System', type: 'Analytics', views: 445 },
                      { name: 'Audit Sécurité - Décembre', created: 'Il y a 1 semaine', author: 'Mohamed C.', type: 'IT', views: 67 }
                    ].map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{report.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Par {report.author}</span>
                            <span>• {report.created}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5">{report.type}</Badge>
                          <span className="text-xs text-muted-foreground">{report.views} vues</span>
                        </div>
                      </div>
                    ))}
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

// SelectItem helper
function Item(props: { value: string; children: React.ReactNode }) {
  return <option value={props.value}>{props.children}</option>
}
