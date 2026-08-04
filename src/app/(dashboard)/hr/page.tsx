'use client'

import React from 'react'
import { 
  Users, 
  UserPlus, 
  Calendar,
  Award,
  Plus,
  Search,
  Phone,
  Mail,
  Briefcase,
  Building2,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion } from 'framer-motion'

// Enterprise HR KPIs - Scaled for 25,000 employees
const hrKpis = [
  {
    title: "Effectif Total",
    value: 25000,
    change: 4.2,
    icon: Users,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "Masse Salariale (DZD)",
    value: 2650000000,
    change: 2.5,
    icon: Calendar,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Nouvelles Recrues (Mois)",
    value: 156,
    change: null,
    icon: UserPlus,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    format: "number" as const
  },
  {
    title: "Taux d'Absentéisme",
    value: 2.8,
    change: -0.5,
    icon: Calendar,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    format: "percentage" as const
  },
]

// Sample employees data (showing enterprise scale)
const employees = [
  { id: 'EMP-25001', name: 'Ahmed Benali', role: 'Directeur Général', dept: 'Direction Générale', status: 'présent', phone: '0555 12 34 56', email: 'a.benali@hassiba.dz', salary: 850000, site: 'Siège Alger' },
  { id: 'EMP-25002', name: 'Fatima Zerhouni', role: 'DRH', dept: 'Ressources Humaines', status: 'présent', phone: '0661 23 45 67', email: 'f.zerhouni@hassiba.dz', salary: 450000, site: 'Siège Alger' },
  { id: 'EMP-25003', name: 'Karim Boudiaf', role: 'Directeur Commercial', dept: 'Commercial', status: 'en déplacement', phone: '0550 98 76 54', email: 'k.boudiaf@hassiba.dz', salary: 380000, site: 'Région Centre' },
  { id: 'EMP-25004', name: 'Amina Hadj', role: 'DCF', dept: 'Finance', status: 'présent', phone: '0770 11 22 33', email: 'a.hadj@hassiba.dz', salary: 420000, site: 'Siège Alger' },
  { id: 'EMP-25005', name: 'Mohamed Charef', role: 'DSI', dept: 'Informatique', status: 'présent', phone: '0666 44 55 66', email: 'm.charef@hassiba.dz', salary: 400000, site: 'Siège Alger' },
  { id: 'EMP-25006', name: 'Sara Mansouri', role: 'Responsable Paie', dept: 'Ressources Humaines', status: 'présent', phone: '0551 77 88 99', email: 's.mansouri@hassiba.dz', salary: 180000, site: 'Siège Alger' },
]

// Department stats scaled for 25K employees
const departments = [
  { name: 'Direction Générale', count: 125, color: '#006233', percentage: 0.5 },
  { name: 'Commercial & Ventes', count: 5500, color: '#D21034', percentage: 22.0 },
  { name: 'Production & Opérations', count: 9500, color: '#008a47', percentage: 38.0 },
  { name: 'Finance & Comptabilité', count: 450, color: '#e84057', percentage: 1.8 },
  { name: 'Ressources Humaines', count: 320, color: '#6b7280', percentage: 1.3 },
  { name: 'IT & Systèmes', count: 280, color: '#2563eb', percentage: 1.1 },
  { name: 'Logistique & Supply Chain', count: 1800, color: '#ca8a04', percentage: 7.2 },
  { name: 'Autres Départements', count: 7025, color: '#94a3b8', percentage: 28.1 },
]

// Sites/locations
const sites = [
  { name: 'Siège - Alger', employees: 8500, active: true },
  { name: 'Usine - Oran', employees: 6500, active: true },
  { name: 'Centre - Constantine', employees: 4200, active: true },
  { name: 'Annexe - Béjaïa', employees: 2800, active: true },
  { name: 'Antenne - Tlemcen', employees: 1800, active: true },
  { name: 'Autres Sites', employees: 1200, active: true },
]

function getEmployeeStatus(status: string) {
  const variants: Record<string, string> = {
    'présent': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'en déplacement': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'congé': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'absent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'télétravail': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status}
    </Badge>
  )
}

export default function HrPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            RH & Paie Enterprise
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des ressources humaines pour 25,000 employés • CNAS/CASNOS Compliant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Award className="w-4 h-4" />
            Congés
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Masses Salariales
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nouvel Employé
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hrKpis.map((kpi, index) => (
          <KpiCard key={kpi.title} {...kpi} delay={index * 0.05} />
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="employes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="paie">Paie</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="recrutement">Recrutement</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
        </TabsList>

        {/* Employés Tab */}
        <TabsContent value="employes" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>Annuaire des Employés</CardTitle>
                    <Badge variant="secondary" className="bg-dz-green/10 text-dz-green">
                      25,000+ employés
                    </Badge>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher parmi 25,000 employés..." className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Employé</TableHead>
                      <TableHead>Employé</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Département</TableHead>
                      <TableHead>Salaire (DZD)</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono text-xs">{emp.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {emp.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.role}</TableCell>
                        <TableCell><Badge variant="secondary">{emp.dept}</Badge></TableCell>
                        <TableCell>{new Intl.NumberFormat('fr-DZ').format(emp.salary)}</TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{emp.site}</span></TableCell>
                        <TableCell>{getEmployeeStatus(emp.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    Affichage de 6 sur 25,000+ employés • Pagination activée pour performance
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Répartition par Département
                  </CardTitle>
                  <CardDescription>Distribution des 25,000 employés</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {departments.map((dept) => (
                      <div key={dept.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{dept.name}</span>
                          <span className="text-muted-foreground">
                            {new Intl.NumberFormat('fr-DZ').format(dept.count)} ({dept.percentage}%)
                          </span>
                        </div>
                        <Progress 
                          value={dept.percentage} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Effectifs Présents Aujourd'hui</CardTitle>
                  <CardDescription>Temps réel - Dernière mise à jour: {new Date().toLocaleTimeString('fr-DZ')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-6xl font-bold text-primary mb-2">
                      {Math.round(25000 * 0.92).toLocaleString('fr-DZ')}
                    </div>
                    <p className="text-muted-foreground">sur 25,000 employés présents (92%)</p>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium">Présents</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">22,450</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="text-sm font-medium">Télétravail</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">1,550</p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          <span className="text-sm font-medium">En congé</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">680</p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          <span className="text-sm font-medium">Déplacement</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">320</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Paie Tab */}
        <TabsContent value="paie">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Gestion de la Paie Enterprise</CardTitle>
                <CardDescription>Traitement des salaires pour 25,000 employés • IRG/CNAS/CASNOS automatique</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Calendar className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Bulletins de Paie</h3>
                    <p className="text-sm text-muted-foreground mt-1">Générer 25,000 bulletins</p>
                    <p className="text-xs text-dz-green mt-2">✓ Automatisé</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Briefcase className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Déclarations CNAS</h3>
                    <p className="text-sm text-muted-foreground mt-1">Cotisations sociales (10%)</p>
                    <p className="text-xs text-dz-green mt-2">✓ Intégré</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Award className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Déclarations CASNOS</h3>
                    <p className="text-sm text-muted-foreground mt-1">Retraite (12.5%+7.5%)</p>
                    <p className="text-xs text-dz-green mt-2">✓ Intégré</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <TrendingUp className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">IRG Barème</h3>
                    <p className="text-sm text-muted-foreground mt-1">Calcul automatique IRG</p>
                    <p className="text-xs text-dz-green mt-2">✓ SCF Ready</p>
                  </div>
                </div>

                {/* Payroll Summary */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-4">Résumé Masse Salariale Mensuelle</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Brut Total</p>
                      <p className="text-xl font-bold">2.65B DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CNAS</p>
                      <p className="text-xl font-bold text-red-600">265M DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CASNOS</p>
                      <p className="text-xl font-bold text-red-600">530M DZD</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net à Payer</p>
                      <p className="text-xl font-bold text-green-600">1.85B DZD</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Congés Tab */}
        <TabsContent value="conges">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Congés</CardTitle>
                <CardDescription>Suivi des congés pour 25,000 employés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-4xl font-bold text-yellow-600">680</p>
                    <p className="text-sm text-muted-foreground mt-1">En congé aujourd'hui</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-4xl font-bold text-blue-600">245</p>
                    <p className="text-sm text-muted-foreground mt-1">Demandes en attente</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center">
                    <p className="text-4xl font-bold text-green-600">30j</p>
                    <p className="text-sm text-muted-foreground mt-1">Congés moyens/employé</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Recrutement Tab */}
        <TabsContent value="recrutement">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recrutement Enterprise</CardTitle>
                <CardDescription>Pipeline de recrutement multi-sites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <UserPlus className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-sm text-muted-foreground">Postes ouverts</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-center">
                    <Search className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                    <p className="text-2xl font-bold">1,234</p>
                    <p className="text-sm text-muted-foreground">Candidatures</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">89</p>
                    <p className="text-sm text-muted-foreground">Entretiens prévus</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                    <Award className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-sm text-muted-foreground">Intégrations mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Sites Tab */}
        <TabsContent value="sites">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Site</CardTitle>
                <CardDescription>6 sites à travers l'Algérie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sites.map((site) => (
                    <div key={site.name} className={`p-4 rounded-lg border ${site.active ? 'border-dz-green/30 bg-dz-green/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{site.name}</h4>
                        {site.active && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                      </div>
                      <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-DZ').format(site.employees)}</p>
                      <p className="text-sm text-muted-foreground">employés</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
