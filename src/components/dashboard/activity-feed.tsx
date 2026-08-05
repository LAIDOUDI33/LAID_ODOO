'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  UserPlus
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ActivityItem {
  id: string
  type: 'invoice' | 'payment' | 'task' | 'employee' | 'alert'
  title: string
  description: string
  time: string
  status?: 'completed' | 'pending' | 'urgent'
}

const recentInvoices: ActivityItem[] = [
  {
    id: 'inv-1',
    type: 'invoice',
    title: 'Facture #FAC-2024-0142',
    description: 'Client: SARL Algeria Tech - 450,000 DZD',
    time: 'Il y a 15 min',
    status: 'pending'
  },
  {
    id: 'inv-2',
    type: 'invoice',
    title: 'Facture #FAC-2024-0141',
    description: 'Client: EURL Services Pro - 125,000 DZD',
    time: 'Il y a 2h',
    status: 'completed'
  },
  {
    id: 'inv-3',
    type: 'invoice',
    title: 'Facture #FAC-2024-0140',
    description: 'Client: Entreprise DZ - 890,000 DZD',
    time: 'Hier',
    status: 'completed'
  },
]

const recentPayments: ActivityItem[] = [
  {
    id: 'pay-1',
    type: 'payment',
    title: 'Paiement reçu',
    description: 'SARL Algeria Tech - 450,000 DZD (Virement)',
    time: 'Il y a 30 min',
    status: 'completed'
  },
  {
    id: 'pay-2',
    type: 'payment',
    title: 'Paiement envoyé',
    description: 'Fournisseur ABC - 280,000 DZD (Chèque)',
    time: 'Il y a 3h',
    status: 'completed'
  },
  {
    id: 'pay-3',
    type: 'payment',
    title: 'Paiement en attente',
    description: 'EURL Services Pro - 125,000 DZD',
    time: 'Il y a 5h',
    status: 'pending'
  },
]

const pendingTasks: ActivityItem[] = [
  {
    id: 'task-1',
    type: 'task',
    title: 'Déclaration TVA G50',
    description: 'Période: Janvier 2024 - Échéance: 20/02',
    time: 'Dans 3 jours',
    status: 'urgent'
  },
  {
    id: 'task-2',
    type: 'task',
    title: 'Validation des fiches de paie',
    description: 'Mois de Janvier - 24 employés',
    time: 'Demain',
    status: 'pending'
  },
  {
    id: 'task-3',
    type: 'task',
    title: 'Inventaire stock',
    description: 'Entrepôt Principal - Zone A',
    time: 'Cette semaine',
    status: 'pending'
  },
  {
    id: 'task-4',
    type: 'employee',
    title: 'Nouvel employé',
    description: 'Karim B. - Département Commercial',
    time: "Aujourd'hui",
    status: 'completed'
  },
]

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'invoice':
      return <FileText className="w-4 h-4" />
    case 'payment':
      return <CreditCard className="w-4 h-4" />
    case 'task':
      return <Clock className="w-4 h-4" />
    case 'employee':
      return <UserPlus className="w-4 h-4" />
    case 'alert':
      return <AlertCircle className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

function getStatusBadge(status?: ActivityItem['status']) {
  if (!status) return null
  
  const variants = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const labels = {
    completed: 'Terminé',
    pending: 'En attente',
    urgent: 'Urgent',
  }

  return (
    <Badge variant="outline" className={variants[status]}>
      {labels[status]}
    </Badge>
  )
}

interface ActivityFeedProps {
  items: ActivityItem[]
  title: string
  delay?: number
}

export function ActivityFeed({ items, title, delay = 0 }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <button className="text-sm text-primary hover:underline">
              Voir tout
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  item.status === 'urgent' ? 'bg-destructive/10 text-destructive' :
                  item.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-primary/10 text-primary'
                }`}>
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {getStatusBadge(item.status)}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Pre-configured feed components
export function RecentInvoices() {
  return <ActivityFeed items={recentInvoices} title="Dernières Factures" delay={0.4} />
}

export function RecentPayments() {
  return <ActivityFeed items={recentPayments} title="Paiements Récents" delay={0.5} />
}

export function PendingTasks() {
  return <ActivityFeed items={pendingTasks} title="Tâches en Cours" delay={0.6} />
}
