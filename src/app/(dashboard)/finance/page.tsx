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
  Filter,
  Shield,
  Calculator
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

// Enterprise Finance KPIs
const financeKpis = [
  {
    title: "Chiffre d'Affaires TTC",
    value: 6240000000,
    change: 12.5,
    icon: TrendingUp,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "currency" as const
  },
  {
    title: "Créances Clients",
    value: 1850000000,
    change: -5.2,
    icon: Wallet,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Dettes Fournisseurs",
    value: 920000000,
    change: 8.1,
    icon: Receipt,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "currency" as const
  },
  {
    title: "Trésorerie Disponible",
    value: 3470000000,
    change: 15.3,
    icon: Wallet,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "currency" as const
  },
]

// Recent invoices data (enterprise scale)
const recentInvoices = [
  { id: 'FAC-2024-1847', client: 'SARL Algeria Tech Group', amount: 45000000, status: 'payée', date: '04/01/2024', type: 'facture' },
  { id: 'FAC-2024-1846', client: 'EURL Services Pro', amount: 12500000, status: 'envoyée', date: '03/01/2024', type: 'facture' },
  { id: 'FAC-2024-1845', client: 'Entreprise DZ National', amount: 89000000, status: 'en attente', date: '02/01/2024', type: 'facture' },
  { id: 'FAC-2024-1844', client: 'Société ABC Holding', amount: 34000000, status: 'payée', date: '01/01/2024', type: 'avoir' },
  { id: 'FAC-2024-1843', client: 'DZ Commerce SARL', amount: 67500000, status: 'en retard', date: '30/12/2023', type: 'facture' },
]

// Tax declarations - Algerian fiscal compliance
const taxDeclarations = [
  { type: 'TVA (G50)', period: 'Décembre 2023', status: 'Soumise', deadline: '20/01/2024', amount: '124.5M DZD' },
  { type: 'TAP (G2)', period: 'Q4 2023', status: 'En cours', deadline: '20/01/2024', amount: '45.2M DZD' },
  { type: 'IRG Salaires (G1)', period: 'Décembre 2023', status: 'Soumise', deadline: '15/01/2024', amount: '189.3M DZD' },
  { type: 'CNAS', period: 'Décembre 2023', status: 'En retard', deadline: '15/01/2024', amount: '265M DZD' },
  { type: 'CASNOS', period: 'Décembre 2023', status: 'En cours', deadline: '20/01/2024', amount: '530M DZD' },
  { type: 'IBS (G4)', period: 'Année 2023', status: 'À venir', deadline: '30/04/2024', amount: 'Estimation' },
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
    'À venir': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
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
            Finance & Comptabilité SCF
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion financière enterprise • Plan comptable SCF • Déclarations fiscales algériennes
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

      {/* SCF Compliance Banner */}
      <div className="rounded-lg bg-gradient-to-r from-dz-green/10 to-dz-green/5 border border-dz-green/20 p-4 flex items-center gap-3">
        <Shield className="w-6 h-6 text-dz-green flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-dz-green">Conformité SCF Activée</p>
          <p className="text-sm text-muted-foreground">
            Plan comptable algérien • TVA 19%/9% • TAP par zone • IRG barème progressif • IBS 19%
          </p>
        </div>
        <Badge className="bg-dz-green text-white">SCF Ready</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financeKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="factures" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal DZ</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
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
                  <div className="flex items-center gap-3">
                    <CardTitle>Dernières Factures</CardTitle>
                    <Badge variant="secondary">1,847 ce mois</Badge>
                  </div>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium font-mono">{invoice.id}</TableCell>
                        <TableCell>{invoice.client}</TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(invoice.amount)}</TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell><Badge variant="outline">{invoice.type}</Badge></TableCell>
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
                <CardTitle>Suivi des Dépenses Enterprise</CardTitle>
                <CardDescription>Analyse des charges par catégorie et centre de coût</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-muted-foreground">Dépenses du Mois</p>
                    <p className="text-2xl font-bold text-red-600">892M DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-sm text-muted-foreground">Budget Restant</p>
                    <p className="text-2xl font-bold text-yellow-600">108M DZD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-sm text-muted-foreground">Économies YTD</p>
                    <p className="text-2xl font-bold text-green-600">+12.5%</p>
                  </div>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Graphique détaillé des dépenses</p>
                  <p className="text-sm">Analyse par centre de coût disponible</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Fiscal Tab - Algerian Tax System */}
        <TabsContent value="fiscal" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Déclarations Fiscales Algériennes</CardTitle>
                    <CardDescription>Gestion complète des obligations fiscales DZ</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de Déclaration</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date Limite</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxDeclarations.map((tax, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{tax.type}</TableCell>
                        <TableCell>{tax.period}</TableCell>
                        <TableCell className="font-mono">{tax.amount}</TableCell>
                        <TableCell>{getStatusBadge(tax.status)}</TableCell>
                        <TableCell>{tax.deadline}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Tax Summary */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-4">Résumé des Obligations Fiscales - Janvier 2024</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">TVA à payer</p>
                      <p className="text-xl font-bold text-red-600">124.5M DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">TAP</p>
                      <p className="text-xl font-bold text-orange-600">45.2M DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IRG Retenu</p>
                      <p className="text-xl font-bold text-blue-600">189.3M DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Charges Sociales</p>
                      <p className="text-xl font-bold text-purple-600">795M DZD</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Trésorerie Tab */}
        <TabsContent value="tresorerie">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Gestion de la Trésorerie</CardTitle>
                <CardDescription>Suivi des flux de trésorerie en temps réel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                    <TrendingUp className="w-10 h-10 mx-auto text-green-600 mb-2" />
                    <p className="text-3xl font-bold text-green-600">3.47B</p>
                    <p className="text-sm text-muted-foreground">Disponible (DZD)</p>
                  </div>
                  <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <Wallet className="w-10 h-10 mx-auto text-blue-600 mb-2" />
                    <p className="text-3xl font-bold text-blue-600">1.85B</p>
                    <p className="text-sm text-muted-foreground">Encaissements prévus</p>
                  </div>
                  <div className="p-6 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
                    <Receipt className="w-10 h-10 mx-auto text-orange-600 mb-2" />
                    <p className="text-3xl font-bold text-orange-600">920M</p>
                    <p className="text-sm text-muted-foreground">Décaissements prévus</p>
                  </div>
                </div>
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
                { title: 'Bilan Comptable SCF', desc: 'Situation patrimoniale algérienne', icon: FileText, badge: 'SCF' },
                { title: 'Compte de Résultat', desc: 'Performance financière', icon: TrendingUp, badge: 'Mensuel' },
                { title: 'État des Créances', desc: 'Suivi clients (aging)', icon: Wallet, badge: '1,247 factures' },
                { title: 'Journal des Opérations', desc: 'Écritures comptables', icon: Receipt, badge: 'SCF' },
                { title: 'Balance Générale', desc: 'Soldes des comptes SCF', icon: FileText, badge: 'Classe 1-9' },
                { title: 'Déclaration TVA G50', desc: 'Rapport TVA mensuel', icon: TrendingDown, badge: 'Automatisé' },
                { title: 'Grand Livre', desc: 'Détail des mouvements', icon: FileText, badge: 'SCF' },
                { title: 'État IBS G4', desc: 'Déclaration bénéfice', icon: Calculator, badge: 'Annuel' },
                { title: 'Journal d\'Achat-Vente', desc: 'Opérations commerciales', icon: Receipt, badge: 'TTC/HT' },
              ].map((report, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <report.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{report.title}</h3>
                          <Badge variant="secondary" className="text-xs">{report.badge}</Badge>
                        </div>
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
