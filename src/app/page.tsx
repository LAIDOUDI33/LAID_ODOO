'use client'

import React from 'react'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  Eye
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { CaEvolutionChart, SalesByCategoryChart, MonthlyExpensesChart } from '@/components/dashboard/charts'
import { RecentInvoices, RecentPayments, PendingTasks } from '@/components/dashboard/activity-feed'
import { FiscalCalendar } from '@/components/dashboard/fiscal-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data for KPIs
const kpiData = [
  {
    title: "Chiffre d'Affaires du Jour",
    value: 285000,
    change: 12.5,
    icon: DollarSign,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "currency" as const
  },
  {
    title: "CA Mensuel",
    value: 5200000,
    change: 8.3,
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Commandes du Mois",
    value: 147,
    change: -3.2,
    icon: ShoppingCart,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "number" as const
  },
  {
    title: "Effectif Employés",
    value: 24,
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
  { label: "Factures en attente", value: 12, color: "text-yellow-600" },
  { label: "Paiements à recevoir", value: "1.2M DZD", color: "text-blue-600" },
  { label: "Produits en stock bas", value: 5, color: "text-red-600" },
  { label: "Tâches urgentes", value: 3, color: "text-red-600" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Tableau de Bord
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue! Voici un aperçu de votre entreprise.
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

      {/* Footer Info */}
      <div className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-8">
        <p>
          Données mises à jour en temps réel • Dernière synchronisation:{" "}
          {new Date().toLocaleString('fr-DZ', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </div>
  )
}
