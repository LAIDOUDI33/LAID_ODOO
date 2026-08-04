'use client'

import React from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart,
  Download,
  Calendar,
  Filter,
  FileText,
  Activity,
  Plus
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

// Report categories
const reportCategories = [
  {
    title: 'Rapports Financiers',
    icon: BarChart3,
    color: '#006233',
    reports: [
      { name: 'Bilan Comptable', desc: 'Situation patrimoniale complète', frequency: 'Mensuel' },
      { name: 'Compte de Résultat', desc: 'Analyse des charges et produits', frequency: 'Mensuel' },
      { name: 'Trésorerie', desc: 'État des flux de trésorerie', frequency: 'Hebdomadaire' },
      { name: 'Analyse de Rentabilité', desc: 'Marges et ratios financiers', frequency: 'Mensuel' },
    ]
  },
  {
    title: 'Rapports Commerciaux',
    icon: TrendingUp,
    color: '#D21034',
    reports: [
      { name: 'Ventes par Période', desc: 'Évolution du CA dans le temps', frequency: 'Hebdomadaire' },
      { name: 'Performance Commerciale', desc: 'KPIs des équipes commerciales', frequency: 'Mensuel' },
      { name: 'Analyse Clientèle', desc: 'Segmentation et comportement clients', frequency: 'Trimestriel' },
      { name: 'Pipeline des Ventes', desc: 'Suivi des opportunités', frequency: 'Hebdomadaire' },
    ]
  },
  {
    title: 'Rapports Stocks',
    icon: PieChart,
    color: '#008a47',
    reports: [
      { name: 'État des Stocks', desc: 'Valorisation et rotation', frequency: 'Mensuel' },
      { name: 'Alertes Stock', desc: 'Produits en rupture ou surstock', frequency: 'Quotidien' },
      { name: 'Inventaire', desc: 'Écarts inventaire/ théorique', frequency: 'Trimestriel' },
      { name: 'Fournisseurs', desc: 'Performance et délais', frequency: 'Mensuel' },
    ]
  },
  {
    title: 'Rapports RH',
    icon: Activity,
    color: '#6b7280',
    reports: [
      { name: 'Effectifs', desc: 'Statistiques du personnel', frequency: 'Mensuel' },
      { name: 'Masse Salariale', desc: 'Analyse des coûts salariaux', frequency: 'Mensuel' },
      { name: 'Absentéisme', desc: 'Taux et motifs d\'absence', frequency: 'Mensuel' },
      { name: 'Congés', desc: 'Solde et planning', frequency: 'Mensuel' },
    ]
  }
]

// Quick stats for BI dashboard
const quickStats = [
  { label: 'Rapports disponibles', value: '24+', icon: FileText },
  { label: 'Données actualisées', value: 'Aujourd\'hui', icon: Calendar },
  { label: 'Export ce mois', value: '156', icon: Download },
]

export default function BiPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Tableaux de bord analytiques et rapports personnalisés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="mois">
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jour">Aujourd'hui</SelectItem>
              <SelectItem value="semaine">Cette semaine</SelectItem>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="trimestre">Ce trimestre</SelectItem>
              <SelectItem value="année">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rapports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
          <TabsTrigger value="tableaux">Tableaux de Bord</TabsTrigger>
          <TabsTrigger value="kpi">Indicateurs</TabsTrigger>
          <TabsTrigger value="personnalises">Personnalisés</TabsTrigger>
        </TabsList>

        {/* Rapports Tab */}
        <TabsContent value="rapports" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {reportCategories.map((category, catIndex) => (
              <div key={catIndex}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <category.icon className="w-5 h-5" style={{ color: category.color }} />
                  {category.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {category.reports.map((report, repIndex) => (
                    <Card key={repIndex} className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="outline" className="text-xs">
                            {report.frequency}
                          </Badge>
                          <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {report.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {report.desc}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto text-primary">
                          Générer →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Tableaux de Bord Tab */}
        <TabsContent value="tableaux">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  title: 'Executive Summary', 
                  desc: 'Vue globale de l\'entreprise',
                  preview: 'CA, marge, trésorerie, effectif',
                  users: 'Direction Générale'
                },
                { 
                  title: 'Commercial Dashboard', 
                  desc: 'Performance des ventes',
                  preview: 'Commandes, CA, pipeline, objectifs',
                  users: 'Équipe Commerciale'
                },
                { 
                  title: 'Finance Dashboard', 
                  desc: 'Suivi financier complet',
                  preview: 'Trésorerie, créances, dettes, fiscal',
                  users: 'DFO / Comptabilité'
                },
                { 
                  title: 'Stock Dashboard', 
                  desc: 'Gestion des stocks',
                  preview: 'Niveaux, rotations, alertes, entrepôts',
                  users: 'Logistique'
                },
                { 
                  title: 'RH Dashboard', 
                  desc: 'Gestion humaine',
                  preview: 'Effectifs, paie, congés, recrutement',
                  users: 'DRH'
                },
                { 
                  title: 'Production Dashboard', 
                  desc: 'Suivi de production',
                  preview: 'OF, rendements, qualité, coûts',
                  users: 'Production'
                },
              ].map((dashboard, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                  <div 
                    className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${['#00623315', '#D2103415', '#008a4715', '#6b728015'][index % 4]} 0%, ${['#00623305', '#D2103405', '#008a4705', '#6b728005'][index % 4]} 100%)`
                    }}
                  >
                    <BarChart3 className="w-12 h-12 text-primary/30" />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg">{dashboard.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{dashboard.desc}</p>
                    <div className="mt-3 p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                      <span className="font-medium">Contenu:</span> {dashboard.preview}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {dashboard.users}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-primary">
                        Ouvrir →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* KPI Tab */}
        <TabsContent value="kpi">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Indicateurs Clés de Performance (KPIs)</CardTitle>
                <CardDescription>Suivi en temps réel des métriques importantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { category: 'Financier', kpis: ['CA Mensuel', 'Marge Brute', 'Trésorerie', 'DSO'] },
                    { category: 'Commercial', kpis: ['Nombre de Commandes', 'Panier Moyen', 'Taux Conversion', 'CA/Commercial'] },
                    { category: 'Operationnel', kpis: ['Rotation Stock', 'Taux Service', 'Délai Livraison', 'Qualité'] },
                    { category: 'RH', kpis: ['Turnover', 'Absentéisme', 'Coût Salarié', 'Productivité'] },
                  ].map((group, index) => (
                    <Card key={index} className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">KPIs {group.category}s</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {group.kpis.map((kpi, kpiIndex) => (
                            <li key={kpiIndex} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                              <span className="text-sm">{kpi}</span>
                              <Badge variant="outline" className="text-xs">Actif</Badge>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
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
                <CardTitle>Rapports Personnalisés</CardTitle>
                <CardDescription>Créez vos propres rapports et tableaux de bord</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-2">Créateur de Rapports</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Construisez des rapports sur mesure en sélectionnant vos données, 
                    filtres et visualisations préférées.
                  </p>
                  <Button size="lg" className="gap-2">
                    <Plus className="w-5 h-5" />
                    Créer un Nouveau Rapport
                  </Button>
                </div>
                
                {/* Recent custom reports */}
                <div className="mt-8 pt-8 border-t border-border">
                  <h4 className="font-medium mb-4">Récemment créés</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Analyse Q4 2023', created: 'Il y a 3 jours', author: 'Ahmed B.' },
                      { name: 'Comparatif Fournisseurs', created: 'Il y a 1 semaine', author: 'Fatima Z.' },
                    ].map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-xs text-muted-foreground">Par {report.author} • {report.created}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Ouvrir</Button>
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
