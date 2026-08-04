'use client'

import React from 'react'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  Eye,
  Building2,
  Shield,
  Zap
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { CaEvolutionChart, SalesByCategoryChart, MonthlyExpensesChart } from '@/components/dashboard/charts'
import { RecentInvoices, RecentPayments, PendingTasks } from '@/components/dashboard/activity-feed'
import { FiscalCalendar } from '@/components/dashboard/fiscal-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Enterprise KPIs - Scaled for 25,000 employees
const kpiData = [
  {
    title: "Chiffre d'Affaires du Jour",
    value: 28500000,
    change: 12.5,
    icon: DollarSign,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "currency" as const
  },
  {
    title: "CA Mensuel",
    value: 520000000,
    change: 8.3,
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Commandes du Mois",
    value: 1847,
    change: -3.2,
    icon: ShoppingCart,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "number" as const
  },
  {
    title: "Effectif Total",
    value: 25000,
    change: 4.2,
    icon: Users,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
  {
    title: "Marge Brute",
    value: 34.8,
    change: 2.1,
    icon: TrendingUp,
    iconColor: "text-green-600",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    format: "percentage" as const
  },
]

// Quick stats for bottom row
const quickStats = [
  { label: "Factures en attente", value: 342, color: "text-yellow-600" },
  { label: "Paiements à recevoir", value: "125.5M DZD", color: "text-blue-600" },
  { label: "Produits en stock bas", value: 28, color: "text-red-600" },
  { label: "Tâches urgentes", value: 15, color: "text-red-600" },
]

export default function DashboardPage() {
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
                Plateforme de Gestion Intégré • Déployée pour <strong>25,000</strong> employés • Production Ready
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
            Bienvenue! Vue globale de votre entreprise • Dernière synchro: {new Date().toLocaleString('fr-DZ')}
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiData.map((kpi, index) => (
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
                  Optimisé pour 25,000+ employés • SCF Compliant • TVA/TAP/IRG Ready • CNAS/CASNOS Integrated
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
