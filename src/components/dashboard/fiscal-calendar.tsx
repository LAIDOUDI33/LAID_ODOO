'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface TaxDeadline {
  id: string
  name: string
  code: string
  deadline: number // day of month
  description: string
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed'
}

const currentMonth = new Date().getMonth() + 1
const currentDay = new Date().getDate()

function getTaxDeadlines(): TaxDeadline[] {
  const deadlines: TaxDeadline[] = [
    {
      id: 'tva',
      name: 'Déclaration TVA (G50)',
      code: 'G50',
      deadline: 20,
      description: 'Taxe sur la Valeur Ajoutée mensuelle',
      status: getDeadlineStatus(20)
    },
    {
      id: 'tap',
      name: 'Taxe sur l\'Activité Professionnelle (G2)',
      code: 'G2',
      deadline: 20,
      description: 'TAP - Impôt sur les bénéfices professionnels',
      status: getDeadlineStatus(20)
    },
    {
      id: 'irg',
      name: 'IRG Salaires',
      code: 'IRG',
      deadline: 15,
      description: 'Impôt sur le Revenu Global - Retenue à la source',
      status: getDeadlineStatus(15)
    },
    {
      id: 'cnas',
      name: 'Cotisations CNAS',
      code: 'CNAS',
      deadline: 15,
      description: 'Cotisations sociales employeurs/employés',
      status: getDeadlineStatus(15)
    },
    {
      id: 'rg',
      name: 'Retraite (CASNOS)',
      code: 'RG',
      deadline: 20,
      description: 'Cotisation retraite des salariés',
      status: getDeadlineStatus(20)
    },
  ]
  
  return deadlines.sort((a, b) => a.deadline - b.deadline)
}

function getDeadlineStatus(deadlineDay: number): TaxDeadline['status'] {
  if (currentDay > deadlineDay) return 'overdue'
  if (deadlineDay - currentDay <= 5) return 'due-soon'
  return 'upcoming'
}

function getStatusIcon(status: TaxDeadline['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'due-soon':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    case 'overdue':
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    default:
      return <Clock className="w-4 h-4 text-blue-500" />
  }
}

function getStatusBadge(status: TaxDeadline['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Soumis</Badge>
    case 'due-soon':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Bientôt</Badge>
    case 'overdue':
      return <Badge variant="destructive">En retard</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">À venir</Badge>
  }
}

function getDaysRemaining(deadlineDay: number): number {
  return deadlineDay - currentDay
}

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function FiscalCalendar() {
  const deadlines = getTaxDeadlines()
  const overdueCount = deadlines.filter(d => d.status === 'overdue').length
  const dueSoonCount = deadlines.filter(d => d.status === 'due-soon').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-primary" />
              Calendrier Fiscal Algérien
            </CardTitle>
            {(overdueCount > 0 || dueSoonCount > 0) && (
              <Badge variant={overdueCount > 0 ? "destructive" : "outline"} 
                     className={overdueCount > 0 ? "" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}>
                {overdueCount > 0 ? `${overdueCount} en retard` : `${dueSoonCount} à venir`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {months[currentMonth - 1]} {new Date().getFullYear()}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {deadlines.map((item) => {
              const daysRemaining = getDaysRemaining(item.deadline)
              
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.status === 'overdue' 
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' :
                    item.status === 'due-soon'
                      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30' :
                      'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className={`font-medium text-sm ${
                          item.status === 'overdue' ? 'text-destructive' : ''
                        }`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-xs font-mono bg-muted rounded">
                          {item.code}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(item.status)}
                      <span className={`text-xs font-medium ${
                        daysRemaining < 0 ? 'text-red-600' :
                        daysRemaining <= 5 ? 'text-yellow-600' :
                        'text-muted-foreground'
                      }`}>
                        {daysRemaining < 0 
                          ? `${Math.abs(daysRemaining)}j en retard`
                          : `Échéance: ${item.deadline}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-border">
            <button className="w-full py-2 px-4 rounded-lg bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors">
              Accéder au module Fiscal
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
