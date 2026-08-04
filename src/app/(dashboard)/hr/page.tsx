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
  Briefcase
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

// HR KPIs
const hrKpis = [
  {
    title: "Effectif Total",
    value: 24,
    change: 4.2,
    icon: Users,
    iconColor: "text-dz-green",
    iconBg: "bg-dz-green/10",
    format: "number" as const
  },
  {
    title: "Masse Salariale (DZD)",
    value: 2650000,
    change: 2.5,
    icon: Calendar,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    format: "currency" as const
  },
  {
    title: "Nouvelles Recrues (Mois)",
    value: 3,
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

// Employees data
const employees = [
  { id: 1, name: 'Ahmed Benali', role: 'Directeur Général', dept: 'Direction', status: 'présent', phone: '0555 12 34 56', email: 'a.benali@erp-dz.dz', salary: 450000 },
  { id: 2, name: 'Fatima Zerhouni', role: 'Responsable RH', dept: 'Ressources Humaines', status: 'présent', phone: '0661 23 45 67', email: 'f.zerhouni@erp-dz.dz', salary: 180000 },
  { id: 3, name: 'Karim Boudiaf', role: 'Commercial', dept: 'Commercial', status: 'en déplacement', phone: '0550 98 76 54', email: 'k.boudiaf@erp-dz.dz', salary: 95000 },
  { id: 4, name: 'Amina Hadj', role: 'Comptable', dept: 'Finance', status: 'congé', phone: '0770 11 22 33', email: 'a.hadj@erp-dz.dz', salary: 120000 },
  { id: 5, name: 'Mohamed Charef', role: 'Technicien IT', dept: 'Informatique', status: 'présent', phone: '0666 44 55 66', email: 'm.charef@erp-dz.dz', salary: 85000 },
  { id: 6, name: 'Sara Mansouri', role: 'Assistante Commerciale', dept: 'Commercial', status: 'présent', phone: '0551 77 88 99', email: 's.mansouri@erp-dz.dz', salary: 65000 },
]

// Departments stats
const departments = [
  { name: 'Direction', count: 2, color: '#006233' },
  { name: 'Commercial', count: 8, color: '#D21034' },
  { name: 'Finance', count: 4, color: '#008a47' },
  { name: 'Production', count: 7, color: '#e84057' },
  { name: 'Informatique', count: 3, color: '#6b7280' },
]

function getEmployeeStatus(status: string) {
  const variants: Record<string, string> = {
    'présent': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'en déplacement': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'congé': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'absent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
            RH & Paie
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des ressources humaines et des salaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Award className="w-4 h-4" />
            Congés
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="paie">Paie</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="recrutement">Recrutement</TabsTrigger>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Annuaire des Employés</CardTitle>
                  <div className="relative w-64 hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher un employé..." className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Département</TableHead>
                      <TableHead>Salaire (DZD)</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
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
                        <TableCell>{getEmployeeStatus(emp.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par Département</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departments.map((dept) => (
                      <div key={dept.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{dept.name}</span>
                          <span className="text-muted-foreground">{dept.count} personnes</span>
                        </div>
                        <Progress 
                          value={(dept.count / employees.length) * 100} 
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
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {employees.filter(e => e.status === 'présent').length}
                    </div>
                    <p className="text-muted-foreground">sur {employees.length} employés</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          Présents
                        </span>
                        <span>{employees.filter(e => e.status === 'présent').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          En déplacement
                        </span>
                        <span>{employees.filter(e => e.status === 'en déplacement').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          En congé
                        </span>
                        <span>{employees.filter(e => e.status === 'congé').length}</span>
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
                <CardTitle>Gestion de la Paie</CardTitle>
                <CardDescription>Traitement des salaires et déclarations sociales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Calendar className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold">Bulletins de Paie</h3>
                    <p className="text-sm text-muted-foreground mt-1">Générer les bulletins du mois</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Briefcase className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold">Déclarations CNAS</h3>
                    <p className="text-sm text-muted-foreground mt-1">Cotisations sociales</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Award className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold">Primes & Avantages</h3>
                    <p className="text-sm text-muted-foreground mt-1">Gestion des primes</p>
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
                <CardDescription>Demandes et solde de congés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Calendrier des congés à venir</p>
                  <p className="text-sm">Module en développement</p>
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
                <CardTitle>Recrutement</CardTitle>
                <CardDescription>Offres d'emploi et candidatures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Pipeline de recrutement à venir</p>
                  <p className="text-sm">Module en développement</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
