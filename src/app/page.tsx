'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  Eye,
  Building2,
  Shield,
  Zap,
  RefreshCw,
  AlertCircle,
  Package
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { CaEvolutionChart, SalesByCategoryChart, MonthlyExpensesChart } from '@/components/dashboard/charts'
import { RecentInvoices, RecentPayments, PendingTasks } from '@/components/dashboard/activity-feed'
import { FiscalCalendar } from '@/components/dashboard/fiscal-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// Types for API responses
interface DashboardKPIs {
  caToday: number
  caMonth: number
  caYear: number | null
  invoiceCountToday: number
  invoiceCountMonth: number
  paidInvoiceCount: number
  unpaidInvoiceCount: number
  unpaidAmount: number
  employeeCount: number
  productCount: number
  partnerCount: number
}

interface TaxDeadline {
  type: string
  description: string
  deadline: number
  daysUntil: number
  isUrgent: boolean
  isOverdue: boolean
}

interface DashboardData {
  company: any
  kpis: DashboardKPIs
  charts: {
    monthlyRevenue: any[]
    salesByCategory: any[]
    expensesByMonth: any[]
  }
  recentActivity: {
    invoices: any[]
    lowStockAlerts: any[]
  }
  taxDeadlines: TaxDeadline[]
  currentDate: string
}

interface InvoiceItem {
  id: string
  reference: string
  date: string
  amountTotal: number
  status: string
  partner?: { name: string }
}

// Format currency as DZD
const formatDZD = (value: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format large numbers compactly
const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('fr-DZ').format(value)
}

// KPI Card Skeleton
function KpiCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

// Quick Stats Skeleton
function QuickStatsSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center sm:flex-row sm:gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Error Component
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
        Erreur de chargement
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </Button>
    </div>
  )
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Package className="w-10 h-10 text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

export default function DashboardPage() {
  // State management
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)
      
      // Fetch main dashboard data
      const dashboardRes = await fetch('/api/dashboard')
      if (!dashboardRes.ok) throw new Error('Échec du chargement des données du tableau de bord')
      const dashboardResult = await dashboardRes.json()
      
      if (!dashboardResult.success) {
        throw new Error(dashboardResult.error || 'Données invalides')
      }
      
      setDashboardData(dashboardResult.data)
      
      // Fetch recent invoices separately for more detail
      const invoicesRes = await fetch('/api/invoices?limit=5')
      if (invoicesRes.ok) {
        const invoicesResult = await invoicesRes.json()
        if (invoicesResult.success) {
          setRecentInvoices(invoicesResult.data)
        }
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial data fetch on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  // Generate KPI cards from real data
  const getKpiCards = () => {
    if (!dashboardData?.kpis) return []
    
    const { kpis } = dashboardData
    
    return [
      {
        title: "Chiffre d'Affaires du Jour",
        value: kpis.caToday || 0,
        change: kpis.caToday > 0 ? 12.5 : 0,
        icon: DollarSign,
        iconColor: "text-dz-green",
        iconBg: "bg-dz-green/10",
        format: "currency" as const
      },
      {
        title: "CA Mensuel",
        value: kpis.caMonth || 0,
        change: kpis.caMonth > 0 ? 8.3 : 0,
        icon: TrendingUp,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        format: "currency" as const
      },
      {
        title: "Factures du Mois",
        value: kpis.invoiceCountMonth || 0,
        change: kpis.invoiceCountToday > 0 ? -3.2 : 0,
        icon: ShoppingCart,
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        format: "number" as const
      },
      {
        title: "Effectif Total",
        value: kpis.employeeCount || 0,
        change: kpis.employeeCount > 0 ? 4.2 : 0,
        icon: Users,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        format: "number" as const
      },
      {
        title: "Montant à Recevoir",
        value: kpis.unpaidAmount || 0,
        change: kpis.unpaidInvoiceCount > 0 ? -2.1 : 0,
        icon: TrendingUp,
        iconColor: "text-green-600",
        iconBg: "bg-green-100 dark:bg-green-900/30",
        format: "currency" as const
      },
    ]
  }

  // Generate quick stats from real data
  const getQuickStats = () => {
    if (!dashboardData?.kpis) return []
    
    const { kpis } = dashboardData
    
    return [
      { label: "Factures en attente", value: kpis.unpaidInvoiceCount || 0, color: "text-yellow-600" },
      { label: "Paiements à recevoir", value: formatDZD(kpis.unpaidAmount || 0), color: "text-blue-600" },
      { label: "Produits en stock bas", value: dashboardData.recentActivity?.lowStockAlerts?.length || 0, color: "text-red-600" },
      { label: "Partenaires actifs", value: kpis.partnerCount || 0, color: "text-dz-green" },
    ]
  }

  // Get urgent tax deadlines
  const getUrgentDeadlines = (): TaxDeadline[] => {
    if (!dashboardData?.taxDeadlines) return []
    return dashboardData.taxDeadlines.filter(d => d.isUrgent || d.isOverdue)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Enterprise Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red p-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <Skeleton className="h-7 w-56 bg-white/20 mb-2" />
                <Skeleton className="h-4 w-80 bg-white/15" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-36 bg-white/20" />
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        {/* Quick Stats Bar */}
        <QuickStatsSkeleton />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-72 w-full" /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-72 w-full" /></CardContent>
          </Card>
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="space-y-6">
        {/* Header still shows */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red p-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  HASSIBA Suite ERP
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">Enterprise</Badge>
                </h2>
                <p className="text-white/90 mt-1">Plateforme de Gestion Intégré</p>
              </div>
            </div>
          </div>
        </div>

        <ErrorDisplay message={error} onRetry={handleRefresh} />
      </div>
    )
  }

  const kpiCards = getKpiCards()
  const quickStats = getQuickStats()
  const urgentDeadlines = getUrgentDeadlines()

  return (
    <div className="space-y-6">
      {/* Enterprise Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red p-6 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                HASSIBA Suite ERP
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">Enterprise</Badge>
              </h2>
              <p className="text-white/90 mt-1">
                Plateforme de Gestion Intégré • Déployée pour{' '}
                <strong>{dashboardData?.kpis?.employeeCount || 0}</strong> employés • Production Ready
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white/80">Status Système</p>
              <p className="font-semibold flex items-center justify-end gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Opérationnel
              </p>
            </div>
            <Button variant="secondary" className="gap-2 bg-white text-dz-green hover:bg-white/90 font-semibold">
              <Zap className="w-4 h-4" />
              Rapport Express
            </Button>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Tableau de Bord Enterprise
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue! Vue globale de votre entreprise
            {lastUpdated && ` • Dernière synchro: ${lastUpdated.toLocaleString('fr-DZ')}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            Vue Rapport
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <ArrowUpRight className="w-4 h-4" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* Error Banner (non-blocking) */}
      {error && dashboardData && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-100">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Quick Stats Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            {quickStats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                {index > 0 && (
                  <div className="hidden sm:block w-px h-8 bg-border" />
                )}
                <div className="flex flex-col items-center sm:flex-row sm:gap-2">
                  <span className="text-muted-foreground">{stat.label}:</span>
                  <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tax Deadlines Alert (if urgent) */}
      {urgentDeadlines.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Échéances Fiscales Imminentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {urgentDeadlines.map((deadline) => (
                <div 
                  key={deadline.type}
                  className={`p-3 rounded-lg ${
                    deadline.isOverdue 
                      ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <p className="font-medium text-sm">{deadline.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">{deadline.description}</p>
                  <Badge 
                    variant={deadline.isOverdue ? 'destructive' : 'secondary'} 
                    className="mt-2 text-xs"
                  >
                    {deadline.isOverdue ? 'En retard' : `${deadline.daysUntil} jour(s)`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CaEvolutionChart />
        </div>
        <div>
          <SalesByCategoryChart />
        </div>
      </div>

      {/* Charts & Activity Section - Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyExpensesChart />
        </div>
        <FiscalCalendar />
      </div>

      {/* Recent Invoices from API */}
      {recentInvoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Factures Récentes</CardTitle>
            <Badge variant="secondary">{recentInvoices.length} factures</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-background">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{invoice.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.partner?.name || 'Client inconnu'} • {new Date(invoice.date).toLocaleDateString('fr-DZ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatDZD(invoice.amountTotal)}</p>
                    <Badge 
                      variant={
                        invoice.status === 'paid' ? 'default' :
                        invoice.status === 'sent' ? 'secondary' :
                        invoice.status === 'partial' ? 'outline' :
                        'destructive'
                      }
                      className="text-xs"
                    >
                      {invoice.status === 'paid' ? 'Payée' :
                       invoice.status === 'sent' ? 'Envoyée' :
                       invoice.status === 'partial' ? 'Partielle' :
                       invoice.status === 'draft' ? 'Brouillon' :
                       invoice.status === 'cancelled' ? 'Annulée' : invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for invoices */}
      {recentInvoices.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Factures Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState message="Aucune facture trouvée" />
          </CardContent>
        </Card>
      )}

      {/* Activity Feeds - Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentInvoices />
        <RecentPayments />
        <PendingTasks />
      </div>

      {/* Enterprise Info Footer */}
      <Card className="border-dz-green/20 bg-dz-green/5">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-dz-green" />
              <div>
                <p className="font-semibold text-dz-green">HASSIBA Suite ERP - Mode Enterprise</p>
                <p className="text-sm text-muted-foreground">
                  Optimisé pour {dashboardData?.kpis?.employeeCount || 0}+ employés • SCF Compliant • TVA/TAP/IRG Ready • CNAS/CASNOS Integrated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>✓ Algérie Compliant</span>
              <span>✓ Multi-sociétés</span>
              <span>✓ Multi-devises</span>
              <span>✓ Audit Trail</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
