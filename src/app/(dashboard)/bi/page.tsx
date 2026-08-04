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
  Plus,
  Brain,
  Database,
  Shield
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

// Report categories - Enterprise
const reportCategories = [
  {
    title: 'Rapports Financiers',
    icon: BarChart3,
    color: '#006233',
    reports: [
      { name: 'Bilan Comptable SCF', desc: 'Situation patrimoniale complète', frequency: 'Mensuel' },
      { name: 'Compte de Résultat', desc: 'Analyse des charges et produits', frequency: 'Mensuel' },
      { name: 'Trésorerie (3 flux)', desc: 'État des flux de trésorerie', frequency: 'Hebdomadaire' },
      { name: 'Analyse de Rentabilité', desc: 'Marges et ratios financiers', frequency: 'Mensuel' },
      { name: 'Déclaration TVA G50', desc: 'Rapport TVA mensuel automatisé', frequency: 'Mensuel' },
    ]
  },
  {
    title: 'Rapports Commerciaux',
    icon: TrendingUp,
    color: '#D21034',
    reports: [
      { name: 'Ventes par Période', desc: 'Évolution du CA dans le temps', frequency: 'Hebdomadaire' },
      { name: 'Performance Commerciale', desc: 'KPIs des équipes commerciales', frequency: 'Mensuel' },
      { name: 'Analyse Clientèle 25K+', desc: 'Segmentation et comportement clients', frequency: 'Trimestriel' },
      { name: 'Pipeline des Ventes', desc: 'Suivi des opportunités', frequency: 'Hebdomadaire' },
      { name: 'CA par Wilaya (58)', desc: 'Répartition géographique du CA', frequency: 'Mensuel' },
    ]
  },
  {
    title: 'Rapports Stocks',
    icon: PieChart,
    color: '#008a47',
    reports: [
      { name: 'État des Stocks Multi-sites', desc: 'Valorisation et rotation', frequency: 'Mensuel' },
      { name: 'Alertes Stock Critique', desc: 'Produits en rupture ou surstock', frequency: 'Quotidien' },
      { name: 'Inventaire Tournant', desc: 'Écarts inventaire/théorique', frequency: 'Trimestriel' },
      { name: 'Performance Fournisseurs', desc: 'Performance et délais', frequency: 'Mensuel' },
      { name: 'Rotation par Catégorie', desc: 'Analyse ABC/XYZ', frequency: 'Mensuel' },
    ]
  },
  {
    title: 'Rapports RH Enterprise',
    icon: Activity,
    color: '#6b7280',
    reports: [
      { name: 'Effectifs 25K+ Employés', desc: 'Statistiques du personnel', frequency: 'Mensuel' },
      { name: 'Masse Salariale 2.6B', desc: 'Analyse des coûts salariaux', frequency: 'Mensuel' },
      { name: 'Absentéisme & Turnover', desc: 'Taux et motifs d\'absence', frequency: 'Mensuel' },
      { name: 'Congés & Absences', desc: 'Solde et planning', frequency: 'Mensuel' },
      { name: 'Déclarations CNAS/CASNOS', desc: 'Rapport cotisations sociales', frequency: 'Mensuel' },
    ]
  }
]

// Quick stats for BI dashboard
const quickStats = [
  { label: 'Rapports disponibles', value: '50+', icon: FileText },
  { label: 'Données actualisées', value: "Temps réel", icon: Calendar },
  { label: 'Export ce mois', value: '1,256', icon: Download },
  { label: 'Utilisateurs actifs', value: '2,450', icon: Users },
]

export default function BiPage() {
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
            Analytics avancés pour 25,000 employés • Tableaux de bord temps réel
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

      {/* AI Analytics Banner */}
      <div className="rounded-xl bg-gradient-to-r from-dz-green/10 via-blue-50 to-purple-50 border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-dz-green to-blue-600">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold">HASSIBA AI Analytics</p>
            <p className="text-sm text-muted-foreground">
              Intelligence artificielle pour prévisions et recommandations
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
                  <Badge variant="secondary" className="text-xs">{category.reports.length} rapports</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                  {category.reports.map((report, repIndex) => (
                    <Card key={repIndex} className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="outline" className="text-xs">
                            {report.frequency}
                          </Badge>
                          <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                          {report.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {report.desc}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto text-primary text-xs">
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
                  preview: 'CA 5.2B, marge 35%, trésorerie 3.4B, effectif 25K',
                  users: 'Direction Générale',
                  badge: 'CEO'
                },
                { 
                  title: 'Commercial Dashboard', 
                  desc: 'Performance des ventes',
                  preview: '1,847 commandes, CA 5.2B, pipeline 850M',
                  users: 'Équipe Commerciale',
                  badge: 'Sales'
                },
                { 
                  title: 'Finance Dashboard SCF', 
                  desc: 'Suivi financier complet',
                  preview: 'Trésorerie, créances 1.8B, dettes 920M, fiscal',
                  users: 'DFO / Comptabilité',
                  badge: 'CFO'
                },
                { 
                  title: 'Stock Multi-sites', 
                  desc: 'Gestion des stocks enterprise',
                  preview: '6 sites, rotation, alertes, entrepôts',
                  users: 'Logistique',
                  badge: 'Supply'
                },
                { 
                  title: 'RH Dashboard 25K', 
                  desc: 'Gestion humaine enterprise',
                  preview: '25K employés, masse 2.6B, CNAS/CASNOS',
                  users: 'DRH',
                  badge: 'HR'
                },
                { 
                  title: 'Production Dashboard', 
                  desc: 'Suivi de production',
                  preview: 'OF, rendements, qualité, coûts',
                  users: 'Production',
                  badge: 'Ops'
                },
                { 
                  title: 'Fiscal Algérie', 
                  desc: 'Déclarations fiscales DZ',
                  preview: 'TVA G50, IRG G1, TAP G2, IBS G4',
                  users: 'Fiscalité',
                  badge: 'Tax'
                },
                { 
                  title: 'Analytics IA', 
                  desc: 'Prédictions & insights',
                  preview: 'ML forecasts, anomalies, recommandations',
                  users: 'Data Team',
                  badge: 'AI'
                },
                { 
                  title: 'Audit Trail', 
                  desc: 'Traçabilité complète',
                  preview: 'Logs, modifications, accès, conformité',
                  users: 'Audit / Compliance',
                  badge: 'Security'
                },
              ].map((dashboard, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group">
                  <div 
                    className="h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${['#00623315', '#D2103415', '#008a4715', '#6b728015', '#2563eb15'][index % 5]} 0%, ${['#00623305', '#D2103405', '#008a4705', '#6b728005', '#2563eb05'][index % 5]} 100%)`
                    }}
                  >
                    <BarChart3 className={`w-12 h-12 text-primary/30 group-hover:text-primary/60 transition-all duration-300 ${group ? 'scale-110' : ''}`} />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base">{dashboard.title}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5">{dashboard.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{dashboard.desc}</p>
                    <div className="mt-3 p-2 rounded bg-muted/50 text-[11px] text-muted-foreground">
                      {dashboard.preview}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {dashboard.users}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-primary text-xs h-auto py-1">
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
                <CardTitle>Indicateurs Clés de Performance (KPIs) Enterprise</CardTitle>
                <CardDescription>Suivi en temps réel des métriques importantes - 25K employés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { category: 'Financier', kpis: ['CA Mensuel 5.2B', 'Marge Brute 35%', 'Trésorerie 3.4B', 'DSO 45 jours'], color: 'text-green-600' },
                    { category: 'Commercial', kpis: ['Commandes 1,847/mois', 'Panier Moyen 2.8M', 'Taux Conversion 78%', 'CA/Commercial 12M'], color: 'text-blue-600' },
                    { category: 'Operationnel', kpis: ['Rotation Stock 8x', 'Taux Service 98%', 'Délai Livraison 24h', 'Qualité 99.5%'], color: 'text-orange-600' },
                    { category: 'RH', kpis: ['Turnover 4%', 'Absentéisme 2.8%', 'Coût Salarié 106K', 'Productivité +8%'], color: 'text-purple-600' },
                    { category: 'Fiscal DZ', kpis: ['TVA Collectée 124M', 'IRG Retenu 189M', 'CNAS 265M', 'CASNOS 530M'], color: 'text-red-600' },
                    { category: 'Système', kpis: ['Uptime 99.9%', 'Latence <100ms', 'Users Actifs 2450', 'API Calls/s 10K'], color: 'text-cyan-600' },
                  ].map((group, index) => (
                    <Card key={index} className="border-dashed hover:border-solid transition-all">
                      <CardHeader className="pb-3">
                        <CardTitle className={`text-base ${group.color}`}>KPIs {group.category}s</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {group.kpis.map((kpi, kpiIndex) => (
                            <li key={kpiIndex} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                              <span className="text-sm">{kpi.split(' ').slice(0, -1).join(' ')}</span>
                              <Badge variant="outline" className="text-xs font-mono">{kpi.split(' ').pop()}</Badge>
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
                <CardDescription>Créez vos propres rapports et tableaux de bord avec le générateur avancé</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-2">Créateur de Rapports Enterprise</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Construisez des rapports sur mesure en sélectionnant vos données sources, 
                    filtres, visualisations et planification d&apos;envoi automatique.
                  </p>
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-dz-green to-blue-600 hover:from-dz-green/90 hover:to-blue-600/90">
                    <Plus className="w-5 h-5" />
                    Créer un Nouveau Rapport
                  </Button>
                </div>
                
                {/* Recent custom reports */}
                <div className="mt-8 pt-8 border-t border-border">
                  <h4 className="font-medium mb-4">Récemment créés</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Analyse Q4 2023 - Consolidated', created: 'Il y a 3 jours', author: 'Ahmed B.', type: 'Finance', views: 156 },
                      { name: 'Comparatif Fournisseurs YTD', created: 'Il y a 1 semaine', author: 'Fatima Z.', type: 'Achats', views: 89 },
                      { name: 'Effectifs par Site - Janvier', created: 'Il y a 2 jours', author: 'Sara M.', type: 'RH', views: 234 },
                      { name: 'CA par Région 58 Wilayas', created: 'Il y a 5 jours', author: 'Karim B.', type: 'Commercial', views: 312 },
                      { name: 'Prévisions ML Q1 2024', created: 'Hier', author: 'AI System', type: 'Analytics', views: 445 },
                      { name: 'Audit Sécurité - Décembre', created: 'Il y a 1 semaine', author: 'Mohamed C.', type: 'IT', views: 67 },
                    ].map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{report.name}</p>
                            <p className="text-xs text-muted-foreground">Par {report.author} • {report.created}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{report.type}</Badge>
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

// Import Users icon
function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
