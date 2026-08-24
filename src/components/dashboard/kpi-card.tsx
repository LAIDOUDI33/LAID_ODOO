'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface KpiCardProps {
  title: string
  value: string | number
  change?: number | null
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  format?: 'currency' | 'number' | 'percentage'
  delay?: number
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = 'vs mois dernier',
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  format = 'number',
  delay = 0
}: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0
  
  const formattedValue = (() => {
    if (typeof value === 'string') return value
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-DZ', {
          style: 'currency',
          currency: 'DZD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      case 'percentage':
        return `${value}%`
      default:
        return new Intl.NumberFormat('fr-DZ').format(value)
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('p-2.5 rounded-lg', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {formattedValue}
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                'flex items-center text-xs font-medium',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </CardContent>
        
        {/* Decorative gradient */}
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-full -z-0" />
      </Card>
    </motion.div>
  )
}
