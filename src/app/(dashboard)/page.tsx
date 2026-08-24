// ============================================================
// HASSIBA Suite ERP v2.0.0 - Main Dashboard
// Enterprise Dashboard with KPIs, Charts & Algerian Features
// ============================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  ShoppingCart,
  FileText,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Plus,
  CalendarDays,
  Shield,
  Bot,
  Bell,
  ChevronRight,
  Activity,
  Target,
  BarChart3,
  Zap,
  Globe,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts'
import HassibaAIAssistant from '@/components/ai/assistant'
import { NotificationCenter } from '@/components/notifications/notification-center'

// ============================================================
// Types
// ============================================================

interface KPIData {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ReactNode
  color: string
}

interface DashboardData {
  kpis: KPIData[]
  revenueData: { month: string; ca: number; objectif: number }[]
  categoryData: { name: string; value: number; color: string }[]
  pendingTasks: { id: string; title: string; type: string; priority: string }[]
}

interface APIDashboardResponse {
  success: boolean
  data?: {
    company: any
    kpis: {
      caToday: number
      caMonth: number
      caYear: number
      invoiceCountToday: number
      invoiceCountMonth: number
      invoiceCountYear: number
      paidInvoiceCount: number
      unpaidInvoiceCount: number
      unpaidAmount: number
      employeeCount: number
      productCount: number
      partnerCount: number
    }
    charts: {
      monthlyRevenue: { month: string; revenue: number; count: number }[]
      salesByCategory: { category: string; value: number; percentage: number; count: number }[]
      expensesByMonth: { month: string; expenses: number; count: number }[]
    }
    recentActivity: {
      invoices: any[]
      lowStockAlerts: any[]
    }
    taxDeadlines: Array<{
      type: string
      description: string
      deadline: number
      daysUntil: number
      isUrgent: boolean
      isOverdue: boolean
    }>
    currentDate: string
  }
  error?: string
}

// ============================================================
// Color palette for charts
// ============================================================

const CHART_COLORS = ['#059669', '#dc2626', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308']

// ============================================================
// Loading Skeleton Component
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        {/* Banner Skeleton */}
        <Skeleton className="h-24 w-full rounded-lg" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="h-8 w-12 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Error Component
// ============================================================

function DashboardError({ onRetry, isTimeout }: { onRetry: () => void; isTimeout?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isTimeout ? 'Délai d\'attente dépassé' : 'Erreur de chargement'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isTimeout 
                ? 'Le serveur met trop de temps à répondre. Cela peut être dû à une connexion lente ou un problème serveur. Veuillez réessayer.'
                : 'Impossible de charger les données du tableau de bord. Vérifiez votre connexion et réessayez.'
              }
            </p>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Format currency helper
// ============================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M DZD`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K DZD`
  return `${value.toLocaleString('fr-DZ')} DZD`
}

function formatNumber(value: number): string {
  return value.toLocaleString('fr-DZ')
}

// ============================================================
// Main Component
// ============================================================

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState(new Date())
  const [timeoutError, setTimeoutError] = useState(false)

  // Fetch dashboard data from API
  // FIX: Added 10-second timeout with AbortController to prevent infinite loading
  const fetchDashboardData = useCallback(async () => {
    // Create abort controller for timeout (10 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    try {
      setLoading(true)
      setError(null)
      setTimeoutError(false)
      
      const response = await fetch('/api/dashboard', {
        signal: controller.signal,
        cache: 'no-store' // Always fetch fresh data
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: APIDashboardResponse = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load dashboard data')
      }
      
      const apiData = result.data
      
      // Transform API data to UI format
      const transformedData: DashboardData = {
        kpis: [
          {
            title: "Chiffre d'Affaires du jour",
            value: formatCurrency(apiData.kpis.caToday),
            change: apiData.kpis.caMonth > 0 ? Math.round((apiData.kpis.caToday / apiData.kpis.caMonth) * 100) : 0,
            changeLabel: "vs hier",
            icon: <DollarSign className="w-5 h-5" />,
            color: "text-emerald-600"
          },
          {
            title: "CA Mensuel",
            value: formatCurrency(apiData.kpis.caMonth),
            change: 0, // Would need previous month data for accurate calculation
            changeLabel: "vs mois dernier",
            icon: <TrendingUp className="w-5 h-5" />,
            color: "text-blue-600"
          },
          {
            title: "Factures du Mois",
            value: formatNumber(apiData.kpis.invoiceCountMonth),
            change: 0,
            changeLabel: "vs mois dernier",
            icon: <FileText className="w-5 h-5" />,
            color: "text-orange-600"
          },
          {
            title: "Effectif Total",
            value: formatNumber(apiData.kpis.employeeCount),
            change: 0,
            changeLabel: "employés actifs",
            icon: <Users className="w-5 h-5" />,
            color: "text-purple-600"
          },
          {
            title: "Montant à Recevoir",
            value: formatCurrency(apiData.kpis.unpaidAmount),
            change: 0,
            changeLabel: "factures impayées",
            icon: <ArrowUpRight className="w-5 h-5" />,
            color: "text-green-600"
          }
        ],
        revenueData: apiData.charts.monthlyRevenue.map(item => ({
          month: item.month,
          ca: item.revenue,
          objectif: item.revenue * 0.9 // Target is 90% of actual for demo
        })),
        categoryData: apiData.charts.salesByCategory.map((item, index) => ({
          name: item.category,
          value: item.percentage,
          color: CHART_COLORS[index % CHART_COLORS.length]
        })),
        pendingTasks: [
          ...(apiData.kpis.unpaidInvoiceCount > 0 ? [{
            id: '1',
            title: `Factures en attente (${apiData.kpis.unpaidInvoiceCount})`,
            type: 'finance',
            priority: 'high' as string
          }] : []),
          ...(apiData.kpis.unpaidAmount > 0 ? [{
            id: '2',
            title: `Paiements à recevoir: ${formatCurrency(apiData.kpis.unpaidAmount)}`,
            type: 'finance',
            priority: 'medium' as string
          }] : []),
          ...apiData.recentActivity.lowStockAlerts.slice(0, 3).map((alert, idx) => ({
            id: `stock-${idx}`,
            title: `Stock bas: ${alert.product?.name || 'Produit inconnu'}`,
            type: 'inventory',
            priority: 'high' as string
          }))
        ]
      }
      
      setData(transformedData)
      setLastSync(new Date())
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      
      // FIX: Handle timeout/abort errors specifically
      if (err instanceof DOMException && err.name === 'AbortError') {
        setTimeoutError(true)
        setError('Le chargement prend trop de temps. Vérifiez votre connexion ou réessayez.')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleRefresh = async () => {
    await fetchDashboardData()
  }

  // Show loading skeleton
  if (loading && !data) {
    return <DashboardSkeleton />
  }

  // Show error state
  if (error && !data) {
    return <DashboardError onRetry={handleRefresh} isTimeout={timeoutError} />
  }

  // Should not happen, but just in case
  if (!data) {
    return <DashboardError onRetry={handleRefresh} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* AI Assistant */}
      <HassibaAIAssistant />
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Tableau de Bord Enterprise
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue ! Vue globale de votre entreprise • Dernière synchro:{' '}
              {lastSync.toLocaleTimeString('fr-DZ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bi">
                <BarChart3 className="w-4 h-4 mr-2" />
                Vue Rapport
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sales">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Facture
              </Link>
            </Button>
          </div>
        </div>

        {/* Enterprise Banner */}
        <Card className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">HASSIBA Suite ERP</h2>
                <p className="text-white/90 text-sm">Plateforme de Gestion Intégré • Production Ready</p>
              </div>
              <Badge variant="secondary" className="bg-white text-emerald-700 font-semibold hidden md:flex">
                <Shield className="w-3 h-3 mr-1" />
                Entreprise
              </Badge>
              <Button variant="secondary" size="sm" className="bg-white text-emerald-700 hover:bg-white/90 hidden md:flex">
                <Download className="w-4 h-4 mr-2" />
                Rapport Express
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.kpis.map((kpi, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground text-sm">{kpi.title}</span>
                  <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                </div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className={`flex items-center text-xs mt-2 ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(kpi.change)}% {kpi.changeLabel}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Factures en attente</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">0</p>
              </div>
              <Badge variant="outline" className="border-orange-500 text-orange-600">⏰</Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">Paiements à recevoir</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">0 DA</p>
              </div>
              <Badge variant="outline" className="border-blue-500 text-blue-600">💰</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">Produits en stock bas</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">0</p>
              </div>
              <Badge variant="outline" className="border-red-500 text-red-600">📦</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Partenaires actifs</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">12</p>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-600">🤝</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-2" />Aperçu</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-2" />Analytiques</TabsTrigger>
            <TabsTrigger value="tasks"><Target className="w-4 h-4 mr-2" />Tâches</TabsTrigger>
            <TabsTrigger value="ai"><Bot className="w-4 h-4 mr-2" />IA Assistant</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Fiscal Deadlines Alert */}
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  Échéances Fiscales Imminentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-yellow-200">
                    <p className="font-semibold text-yellow-900">IRG Salaires</p>
                    <p className="text-sm text-yellow-700">Retenue IRG sur salaires</p>
                    <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-700">3 jour(s)</Badge>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-yellow-200">
                    <p className="font-semibold text-yellow-900">CNAS/CASNOS</p>
                    <p className="text-sm text-yellow-700">Cotisations sociales</p>
                    <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-700">3 jour(s)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Évolution du Chiffre d&apos;Affaires</CardTitle>
                  <CardDescription>Comparaison CA réel vs Objectif mensuel</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000000}M`} />
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="ca" stroke="#059669" fill="#059669" fillOpacity={0.3} name="CA Réel" strokeWidth={2} />
                      <Area type="monotone" dataKey="objectif" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} name="Objectif" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des Ventes par Catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Dépenses Mensuelles</CardTitle>
                <CardDescription>Analyse des charges sur les 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={[
                    { month: 'Juin', depenses: 2800000 },
                    { month: 'Juil', depenses: 3100000 },
                    { month: 'Août', depenses: 2950000 },
                    { month: 'Sept', depenses: 3300000 },
                    { month: 'Oct', depenses: 3400000 },
                    { month: 'Nov', depenses: 3600000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v / 1000000}M`} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="depenses" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytiques Avancées</CardTitle>
                <CardDescription>Voir le module Business Intelligence pour des analyses détaillées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto py-6 flex-col" asChild>
                    <Link href="/bi">
                      <BarChart3 className="w-8 h-8 mb-2" />
                      <span>BI Analytics</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-6 flex-col" asChild>
                    <Link href="/bi?tab=reports">
                      <FileText className="w-8 h-8 mb-2" />
                      <span>Rapports Financiers</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-6 flex-col" asChild>
                    <Link href="/bi?tab=builder">
                      <Zap className="w-8 h-8 mb-2" />
                      <span>Report Builder</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Tâches et Actions Requises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.pendingTasks.length > 0 ? (
                    data.pendingTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                            {task.priority === 'high' ? 'Urgent' : 'Normal'}
                          </Badge>
                          <span>{task.title}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          Voir <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                      <p>Aucune tâche en attente</p>
                      <p className="text-sm">Tout est à jour !</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  HASSIBA AI Assistant
                </CardTitle>
                <CardDescription>
                  Posez vos questions en langage naturel pour obtenir des insights instantanés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-primary" />
                  <p className="font-medium mb-2">Assistant IA Intégré</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cliquez sur le bouton chat en bas à droite pour interagir avec l&apos;IA
                  </p>
                  <Button onClick={() => (document.querySelector('[data-chatbot-toggle]') as HTMLElement)?.click()}>
                    Ouvrir l&apos;Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>© 2024 <strong>HASSIBA Suite ERP</strong> - Plateforme Enterprise Algérienne</p>
          <p className="mt-1">v2.0.0 Enterprise • 🇩🇿 Fait avec ❤️ en Algérie • ✅ Production Ready</p>
        </footer>
      </div>
    </div>
  )
}

// CheckCircle icon for empty state
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
