'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { motion } from 'framer-motion'

// CA Evolution Data (12 months)
const caData = [
  { month: 'Jan', ca: 2850000, objectif: 3000000 },
  { month: 'Fév', ca: 3200000, objectif: 3100000 },
  { month: 'Mar', ca: 2950000, objectif: 3200000 },
  { month: 'Avr', ca: 3400000, objectif: 3300000 },
  { month: 'Mai', ca: 3800000, objectif: 3500000 },
  { month: 'Juin', ca: 4100000, objectif: 3700000 },
  { month: 'Juil', ca: 3650000, objectif: 3600000 },
  { month: 'Août', ca: 2900000, objectif: 3200000 },
  { month: 'Sep', ca: 4200000, objectif: 3900000 },
  { month: 'Oct', ca: 4500000, objectif: 4100000 },
  { month: 'Nov', ca: 4800000, objectif: 4300000 },
  { month: 'Déc', ca: 5200000, objectif: 4800000 },
]

// Sales by Category Data
const categoryData = [
  { name: 'Produits A', value: 35, color: '#006233' },
  { name: 'Services B', value: 25, color: '#D21034' },
  { name: 'Produits C', value: 20, color: '#008a47' },
  { name: 'Accessoires D', value: 12, color: '#e84057' },
  { name: 'Autres', value: 8, color: '#6b7280' },
]

// Monthly Expenses Data
const expensesData = [
  { month: 'Jan', salaires: 2500000, charges: 850000, achats: 1200000, autres: 350000 },
  { month: 'Fév', salaires: 2550000, charges: 880000, achats: 1350000, autres: 400000 },
  { month: 'Mar', salaires: 2600000, charges: 920000, achats: 1100000, autres: 380000 },
  { month: 'Avr', salaires: 2580000, charges: 890000, achats: 1450000, others: 420000 },
  { month: 'Mai', salaires: 2650000, charges: 950000, achats: 1600000, autres: 450000 },
  { month: 'Juin', salaires: 2700000, charges: 980000, achats: 1550000, autres: 500000 },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-DZ', {
    notation: 'compact',
    compactDisplay: 'short',
    currency: 'DZD',
    style: 'currency',
    minimumFractionDigits: 0,
  }).format(value)
}

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  delay?: number
}

function ChartCard({ title, description, children, delay = 0 }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function CaEvolutionChart() {
  return (
    <ChartCard 
      title="Évolution du Chiffre d'Affaires" 
      description="Comparaison CA réel vs Objectif mensuel"
      delay={0.1}
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={caData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="ca"
              name="CA Réel"
              stroke="#006233"
              strokeWidth={2.5}
              dot={{ fill: '#006233', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="objectif"
              name="Objectif"
              stroke="#D21034"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#D21034', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function SalesByCategoryChart() {
  return (
    <ChartCard 
      title="Répartition des Ventes par Catégorie"
      description="Distribution du CA par famille de produits"
      delay={0.2}
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value}%`, 'Part']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function MonthlyExpensesChart() {
  return (
    <ChartCard 
      title="Dépenses Mensuelles"
      description="Analyse des charges sur les 6 derniers mois"
      delay={0.3}
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expensesData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="salaires" name="Salaires" fill="#006233" radius={[4, 4, 0, 0]} />
            <Bar dataKey="charges" name="Charges" fill="#D21034" radius={[4, 4, 0, 0]} />
            <Bar dataKey="achats" name="Achats" fill="#008a47" radius={[4, 4, 0, 0]} />
            <Bar dataKey="autres" name="Autres" fill="#6b7280" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
