'use client'

import React from 'react'
import { 
  Wallet, 
  FileText, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  Plus,
  Download,
  Filter
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
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion } from 'framer-motion'

// Finance KPIs
const financeKpis = [
  {
    title: "Chiffre d'Affaires TTC",
    value: 6240000,
    change: 12.5,
    icon: TrendingUp,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "currency" as const
  },
  {
    title: "Créances Clients",
    value: 1850000,
    change: -5.2,
    icon: Wallet,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Dettes Fournisseurs",
    value: 920000,
    change: 8.1,
    icon: Receipt,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "currency" as const
  },
  {
    title: "Trésorerie Disponible",
    value: 3470000,
    change: 15.3,
    icon: Wallet,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "currency" as const
  },
]

// Recent invoices data
const recentInvoices = [
  { id: 'FAC-2024-0142', client: 'SARL Algeria Tech', amount: 450000, status: 'payée', date: '04/01/2024' },
  { id: 'FAC-2024-0141', client: 'EURL Services Pro', amount: 125000, status: 'envoyée', date: '03/01/2024' },
  { id: 'FAC-2024-0140', client: 'Entreprise DZ', amount: 890000, status: 'en attente', date: '02/01/2024' },
  { id: 'FAC-2024-0139', client: 'Société ABC', amount: 340000, status: 'payée', date: '01/01/2024' },
  { id: 'FAC-2024-0138', client: 'DZ Commerce', amount: 675000, status: 'en retard', date: '30/12/2023' },
]

// Tax declarations
const taxDeclarations = [
  { type: 'TVA (G50)', period: 'Décembre 2023', status: 'Soumise', deadline: '20/01/2024' },
  { type: 'TAP (G2)', period: 'Q4 2023', status: 'En cours', deadline: '20/01/2024' },
  { type: 'IRG Salaires', period: 'Décembre 2023', status: 'Soumise', deadline: '15/01/2024' },
  { type: 'CNAS', period: 'Décembre 2023', status: 'En retard', deadline: '15/01/2024' },
]

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    'payée': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'envoyée': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'en attente': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'en retard': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Soumise': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'En cours': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'En retard': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  )
}

export default function FinancePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            Finance & Comptabilité
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion financière, facturation et déclarations fiscales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financeKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="factures" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
        </TabsList>

        {/* Factures Tab */}
        <TabsContent value="factures" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Dernières Factures</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="w-4 h-4" />
                      Filtrer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant (DZD)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.client}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(invoice.amount)}</TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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

        {/* Dépenses Tab */}
        <TabsContent value="depenses">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Suivi des Dépenses</CardTitle>
                <CardDescription>Analyse des charges par catégorie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Graphique des dépenses à venir</p>
                  <p className="text-sm">Module en développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Déclarations Fiscales</CardTitle>
                <CardDescription>Gestion des obligations fiscales algériennes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de Déclaration</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date Limite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxDeclarations.map((tax, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{tax.type}</TableCell>
                        <TableCell>{tax.period}</TableCell>
                        <TableCell>{getStatusBadge(tax.status)}</TableCell>
                        <TableCell>{tax.deadline}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Rapports Tab */}
        <TabsContent value="rapports">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Bilan Comptable', desc: 'Situation patrimoniale', icon: FileText },
                { title: 'Compte de Résultat', desc: 'Performance financière', icon: TrendingUp },
                { title: 'État des Créances', desc: 'Suivi clients', icon: Wallet },
                { title: 'Journal des Opérations', desc: 'Écritures comptables', icon: Receipt },
                { title: 'Balance Générale', desc: 'Soldes des comptes', icon: FileText },
                { title: 'Déclaration TVA', desc: 'Rapport G50 mensuel', icon: TrendingDown },
              ].map((report, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <report.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">{report.desc}</p>
                        <Button variant="link" className="p-0 h-auto mt-2">
                          Générer →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
