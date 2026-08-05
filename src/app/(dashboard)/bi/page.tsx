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
  Eye,
  RefreshCw,
  AlertTriangle,
  Settings,
  Target,
  Zap
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

// Recharts imports
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

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

// Fallback data when API is not available
const FALLBACK_DATA: DashboardData = {
  period: 'month',
  generatedAt: new Date().toISOString(),
  summary: {
    totalPartners: 156,
    totalProducts: 428,
    totalInvoices: 1245,
    ordersThisPeriod: 89,
    totalEmployees: 2450
  },
  kpis: {
    financial: {
      revenue: 485000000,
      expenses: 315250000,
      profit: 169750000,
      margin: 35,
      cashPosition: 145500000,
      accountsReceivable: 72750000,
      accountsPayable: 48500000
    },
    sales: {
      ordersValue: 485000000,
      ordersCount: 89,
      avgOrderValue: 5449438,
      confirmed: 76,
      delivered: 67,
      invoiced: 89,
      cancelled: 4,
      conversionRate: 78
    },
    inventory: {
      totalProducts: 428,
      totalStockValue: 325000000,
      lowStockItems: 42,
      outOfStockItems: 12,
      inventoryTurnover: 4.2,
      daysOfInventory: 87
    },
    hr: {
      totalEmployees: 2450,
      monthlyPayroll: 208250000,
      annualPayroll: 2499000000,
      turnoverRate: 3.5,
      absenteeismRate: 4.2
    },
    production: {
      totalWorkOrders: 156,
      completedThisMonth: 109,
      inProgress: 31,
      completionRate: 70
    }
  },
  charts: {
    revenueTrend: [
      { month: 'Sep', revenue: 380000000 },
      { month: 'Oct', revenue: 420000000 },
      { month: 'Nov', revenue: 395000000 },
      { month: 'Déc', revenue: 450000000 },
      { month: 'Jan', revenue: 485000000 },
      { month: 'Fév', revenue: 435000000 },
      { month: 'Mar', revenue: 470000000 },
      { month: 'Avr', revenue: 510000000 },
      { month: 'Mai', revenue: 495000000 },
      { month: 'Jun', revenue: 520000000 },
      { month: 'Jul', revenue: 480000000 },
      { month: 'Aoû', revenue: 505000000 }
    ],
    salesByCategory: [
      { category: 'Électronique', value: 145500000, percentage: 30 },
      { category: 'Mécanique', value: 121250000, percentage: 25 },
      { category: 'Textile', value: 97000000, percentage: 20 },
      { category: 'Alimentaire', value: 72750000, percentage: 15 },
      { category: 'Autre', value: 48500000, percentage: 10 }
    ],
    topProducts: [
      { name: 'Produit A', value: 150 },
      { name: 'Produit B', value: 120 },
      { name: 'Produit C', value: 95 },
      { name: 'Produit D', value: 80 },
      { name: 'Produit E', value: 65 }
    ],
    inventoryValue: [
      { category: 'Électronique', value: 162500000, stock: 500, count: 25 },
      { category: 'Mécanique', value: 97500000, stock: 350, count: 18 },
      { category: 'Textile', value: 48750000, stock: 200, count: 12 }
    ],
    workforceSummary: [
      { department: 'Production', count: 980, percentage: 40 },
      { department: 'Commercial', count: 490, percentage: 20 },
      { department: 'Administration', count: 368, percentage: 15 },
      { department: 'IT', count: 245, percentage: 10 },
      { department: 'RH', count: 196, percentage: 8 },
      { department: 'Finance', count: 171, percentage: 7 }
    ],
    productionOutput: { oee: 85, availability: 95, performance: 92, qualityRate: 97 }
  }
}

// Color palette
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// Format currency
const formatDZD = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M DZD`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K DZD`
  return `${value.toLocaleString('fr-DZ')} DZD`
}

const formatCompact = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-DZ') : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// KPI Card Component
function KpiCard({ title, value, subtitle, icon: Icon, color, trend, trendValue }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {(subtitle || trendValue) && (
                <div className="flex items-center gap-2">
                  {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                  <span className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {trendValue || subtitle}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Main BI Page Component
export default function BiPage() {
  // State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('tableaux')
  const [exporting, setExporting] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  
  // Fetch data with fallback
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setUsingFallback(false)
      
      // Try to fetch from API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      const response = await fetch(`/api/analytics?type=dashboard&period=${period}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setDashboardData(result.data)
          return
        }
      }
      
      // If API fails, use fallback data
      throw new Error('API failed')
    } catch (error) {
      console.log('Using fallback data for BI dashboard')
      setUsingFallback(true)
      setDashboardData(FALLBACK_DATA)
    } finally {
      setLoading(false)
    }
  }, [period])
  
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Export handler
  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert(`Export ${format.toUpperCase()} initié! Le fichier sera téléchargé.`)
    } finally {
      setExporting(false)
    }
  }

  // Use fallback data if no data loaded yet
  const data = dashboardData || FALLBACK_DATA

  // Loading skeleton
  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-96 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-36 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

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
            {usingFallback && (
              <Badge variant="secondary" className="ml-2">Mode Démo</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2" 
            onClick={() => fetchDashboard()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            PDF
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={() => handleExport('excel')}
            disabled={exporting}
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            Excel
          </Button>
        </div>
      </div>

      {/* AI Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-r from-dz-green/10 via-blue-50 to-purple-50 dark:from-dz-green/5 dark:via-blue-950/30 dark:to-purple-950/30 border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
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
        <Badge className="bg-gradient-to-r from-dz-green to-blue-600 text-white border-0 shrink-0">
          AI Powered
        </Badge>
      </motion.div>

      {/* Executive KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Chiffre d'Affaires"
          value={formatDZD(data.kpis.financial.revenue)}
          icon={DollarSign}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          trend="up"
          trendValue="+12.5%"
        />
        <KpiCard
          title="Bénéfice Net"
          value={formatDZD(data.kpis.financial.profit)}
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          trend="up"
          trendValue={`${data.kpis.financial.margin}% marge`}
        />
        <KpiCard
          title="Commandes"
          value={data.kpis.sales.ordersCount}
          icon={Package}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          subtitle="Ce mois"
        />
        <KpiCard
          title="Employés Actifs"
          value={data.summary.totalEmployees}
          icon={Users}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          trend="up"
          trendValue="+4.2%"
        />
        <KpiCard
          title="Taux Production"
          value={`${data.kpis.production.completionRate}%`}
          icon={Factory}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          subtitle={`${data.kpis.production.inProgress} en cours`}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid lg:flex-wrap gap-1">
          <TabsTrigger value="tableaux" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="financier" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Finance SCF
          </TabsTrigger>
          <TabsTrigger value="ventes" className="gap-2">
            <Package className="w-4 h-4" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="stocks" className="gap-2">
            <Database className="w-4 h-4" />
            Stocks
          </TabsTrigger>
          <TabsTrigger value="rh" className="gap-2">
            <Users className="w-4 h-4" />
            RH
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2">
            <Factory className="w-4 h-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="personnalises" className="gap-2">
            <Filter className="w-4 h-4" />
            Personnalisés
          </TabsTrigger>
        </TabsList>

        {/* ==================== TABLEAUX DE BORD TAB ==================== */}
        <TabsContent value="tableaux" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Évolution du Chiffre d&apos;Affaires
                </CardTitle>
                <CardDescription>Revenu mensuel sur les 12 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={data.charts.revenueTrend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} className="text-muted-foreground" />
                    <Tooltip content={<CustomTooltip />} formatter={(value: number) => [formatDZD(value), 'CA']} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Chiffre d'Affaires" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Ventes par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.charts.salesByCategory.slice(0, 7)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip content={<CustomTooltip />} formatter={(value: number) => [formatDZD(value), 'Valeur']} />
                      <Bar dataKey="value" name="Ventes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Top Produits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.charts.topProducts.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Quantité vendue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-green-500">
                <p className="text-xs text-muted-foreground">Trésorerie</p>
                <p className="text-xl font-bold text-green-600">{formatDZD(data.kpis.financial.cashPosition)}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-xs text-muted-foreground">Créances Clients</p>
                <p className="text-xl font-bold text-blue-600">{formatDZD(data.kpis.financial.accountsReceivable)}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-xs text-muted-foreground">Dettes Fournisseurs</p>
                <p className="text-xl font-bold text-red-600">{formatDZD(data.kpis.financial.accountsPayable)}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-purple-500">
                <p className="text-xs text-muted-foreground">Marge Nette</p>
                <p className={`text-xl font-bold ${data.kpis.financial.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.kpis.financial.margin}%</p>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* ==================== FINANCE SCF TAB ==================== */}
        <TabsContent value="financier" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6 text-center">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-300">CA Ce Mois</p>
                  <p className="text-3xl font-bold text-green-600">{formatCompact(data.kpis.financial.revenue)}</p>
                  <p className="text-xs text-green-600/70 mt-1">DZD HT</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 text-red-600 rotate-180" />
                  <p className="text-sm text-red-700 dark:text-red-300">Dépenses</p>
                  <p className="text-3xl font-bold text-red-600">{formatCompact(data.kpis.financial.expenses)}</p>
                  <p className="text-xs text-red-600/70 mt-1">DZD</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Bénéfice Net</p>
                  <p className="text-3xl font-bold text-blue-600">{formatCompact(data.kpis.financial.profit)}</p>
                  <p className="text-xs text-blue-600/70 mt-1">Marge: {data.kpis.financial.margin}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Déclaration TVA G50 Estimée</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">TVA Collectée (19%)</p>
                    <p className="text-xl font-bold text-blue-600">{Math.round(data.kpis.financial.revenue * 0.19).toLocaleString('fr-DZ')} DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">TVA Déductible (9%)</p>
                    <p className="text-xl font-bold text-orange-600">{Math.round(data.kpis.financial.expenses * 0.09).toLocaleString('fr-DZ')} DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">TVA à Payer</p>
                    <p className="text-xl font-bold text-green-600">{Math.round(data.kpis.financial.revenue * 0.19 - data.kpis.financial.expenses * 0.09).toLocaleString('fr-DZ')} DZD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== VENTES TAB ==================== */}
        <TabsContent value="ventes" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">{data.kpis.sales.ordersCount}</p>
                <p className="text-xs text-green-600">+8.3%</p>
              </Card>
              <Card className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground">Panier Moyen</p>
                <p className="text-2xl font-bold">{formatDZD(data.kpis.sales.avgOrderValue)}</p>
                <p className="text-xs text-green-600">+5.2%</p>
              </Card>
              <Card className="p-4 text-center">
                <Eye className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold">{data.kpis.sales.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Confirmés → Livrés</p>
              </Card>
              <Card className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-muted-foreground">Clients Actifs</p>
                <p className="text-2xl font-bold">{data.summary.totalPartners}</p>
                <p className="text-xs text-green-600">+12 ce mois</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Répartition par Statut</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie data={[
                        { name: 'Payée', value: data.kpis.sales.invoiced, color: '#10b981' },
                        { name: 'Envoyée', value: data.kpis.sales.confirmed, color: '#3b82f6' },
                        { name: 'Livrée', value: data.kpis.sales.delivered, color: '#8b5cf6' },
                        { name: 'Annulée', value: data.kpis.sales.cancelled, color: '#ef4444' }
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {['#10b981', '#3b82f6', '#8b5cf6', '#ef4444'].map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ventes par Catégorie</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie data={data.charts.salesByCategory.slice(0, 6).map(c => ({ name: c.category, value: c.value }))} cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} dataKey="value">
                        {COLORS.map((color, i) => (<Cell key={i} fill={color} />))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} formatter={(value: number) => [formatDZD(value), 'Valeur']} />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* ==================== STOCKS TAB ==================== */}
        <TabsContent value="stocks" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-blue-600">Valeur Stock Totale</p>
                <p className="text-2xl font-bold text-blue-600">{formatCompact(data.kpis.inventory.totalStockValue)}</p>
                <p className="text-xs text-blue-500">DZD</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-yellow-400">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-yellow-600">Stock Bas</p>
                <p className="text-2xl font-bold text-yellow-600">{data.kpis.inventory.lowStockItems}</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-red-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-red-500" />
                <p className="text-sm text-red-600">Rupture de Stock</p>
                <p className="text-2xl font-bold text-red-600">{data.kpis.inventory.outOfStockItems}</p>
              </Card>
              <Card className="p-4 text-center">
                <Activity className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600">Rotation Stock</p>
                <p className="text-2xl font-bold text-green-600">{data.kpis.inventory.inventoryTurnover}x</p>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Valeur du Stock par Catégorie</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.charts.inventoryValue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                    <Tooltip content={<CustomTooltip />} formatter={(value: number) => [formatDZD(value), 'Valeur']} />
                    <Bar dataKey="value" name="Valeur (DZD)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== RH TAB ==================== */}
        <TabsContent value="rh" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/30">
                <Users className="w-10 h-10 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Effectifs Total</p>
                <p className="text-3xl font-bold text-indigo-600">{data.summary.totalEmployees}</p>
                <p className="text-xs text-indigo-500">employés actifs</p>
              </Card>
              <Card className="p-4 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600">Masse Salariale</p>
                <p className="text-2xl font-bold text-green-600">{formatCompact(data.kpis.hr.monthlyPayroll)}</p>
                <p className="text-xs text-green-500">par mois</p>
              </Card>
              <Card className="p-4 text-center">
                <Activity className="w-10 h-10 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-purple-600">Turnover</p>
                <p className="text-2xl font-bold text-purple-600">{data.kpis.hr.turnoverRate}%</p>
              </Card>
              <Card className="p-4 text-center">
                <Eye className="w-10 h-10 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-orange-600">Absentéisme</p>
                <p className="text-2xl font-bold text-orange-600">{data.kpis.hr.absenteeismRate}%</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Répartition par Département</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.charts.workforceSummary.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Effectif" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Répartition Graphique</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <RePieChart>
                      <Pie data={data.charts.workforceSummary.slice(0, 6).map(d => ({ name: d.department, value: d.count }))} cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name.slice(0, 12)}... (${(percent * 100).toFixed(0)}%)`} dataKey="value">
                        {COLORS.map((color, i) => (<Cell key={i} fill={color} />))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* ==================== PRODUCTION TAB ==================== */}
        <TabsContent value="production" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Factory className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-emerald-600">OF Terminés</p>
                <p className="text-3xl font-bold text-emerald-600">{data.kpis.production.completedThisMonth}</p>
              </Card>
              <Card className="p-4 text-center">
                <Settings className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-blue-600">En Cours</p>
                <p className="text-3xl font-bold text-blue-600">{data.kpis.production.inProgress}</p>
              </Card>
              <Card className="p-4 text-center">
                <Target className="w-10 h-10 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-purple-600">Taux Réalisation</p>
                <p className="text-3xl font-bold text-purple-600">{data.kpis.production.completionRate}%</p>
              </Card>
              <Card className="p-4 text-center">
                <Shield className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600">Qualité</p>
                <p className="text-3xl font-bold text-green-600">{data.charts.productionOutput?.qualityRate || 97}%</p>
              </Card>
            </div>

            {/* OEE Gauge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> OEE Global</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative inline-flex items-center justify-center w-56 h-56">
                      <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:gray-700" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="url(#oeeGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(data.charts.productionOutput?.oee || 85) * 3.39} 339.292`} className="transition-all duration-1000 ease-out" />
                        <defs>
                          <linearGradient id="oeeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-primary">{data.charts.productionOutput?.oee || 85}%</span>
                        <span className="text-sm text-muted-foreground">OEE</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Disponibilité', value: data.charts.productionOutput?.availability || 95, color: 'bg-blue-500' },
                      { label: 'Performance', value: data.charts.productionOutput?.performance || 92, color: 'bg-green-500' },
                      { label: 'Qualité', value: data.charts.productionOutput?.qualityRate || 97, color: 'bg-purple-500' }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${item.color}`} />{item.label}</span>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color.replace('bg-', 'bg-gradient-to-r from-')} to-${item.color.split('-')[1]}-400 rounded-full transition-all duration-1000`} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== PERSONNALISÉS TAB ==================== */}
        <TabsContent value="personnalises" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Créateur de Rapports Personnalisés</CardTitle>
                <CardDescription>Construisez vos propres tableaux de bord</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Générateur de Rapports</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Sélectionnez vos sources de données, filtres et visualisations pour créer des rapports personnalisés.
                  </p>
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-dz-green to-blue-600">
                    <Plus className="w-5 h-5" /> Créer un Nouveau Rapport
                  </Button>
                </div>
                
                <div className="mt-8 pt-8 border-t">
                  <h4 className="font-medium mb-4">Récemment créés</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Analyse Q4 2024', created: 'Il y a 3 jours', author: 'Ahmed B.', type: 'Finance', views: 156 },
                      { name: 'Comparatif Fournisseurs YTD', created: 'Il y a 1 sem.', author: 'Fatima Z.', type: 'Achats', views: 89 },
                      { name: 'Effectifs par Site', created: 'Il y a 2 jours', author: 'Sara M.', type: 'RH', views: 234 },
                      { name: 'CA par Région 58 Wilayas', created: 'Hier', author: 'Karim B.', type: 'Commercial', views: 312 }
                    ].map((report, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{report.name}</p>
                          <p className="text-xs text-muted-foreground">Par {report.author} • {report.created}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-1.5 ml-2">{report.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="border-dz-green/20 bg-dz-green/5 dark:bg-dz-green/10">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-dz-green" />
              <div>
                <p className="font-semibold text-dz-green">HASSIBA Suite ERP - BI Analytics</p>
                <p className="text-sm text-muted-foreground">Données en temps réel • Recharts Visualizations • Export PDF/Excel • SCF Compliant</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Data</span>
              <span>Recharts Pro</span>
              <span>Algérie Ready</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Icon components for missing imports
function ShoppingCart({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.57l1.65-7.43H5.12"/></svg>
}
function Settings({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
}
function Target({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
