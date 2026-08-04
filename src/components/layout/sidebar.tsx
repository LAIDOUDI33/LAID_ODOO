'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Package,
  Users,
  Factory,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  {
    title: 'Tableau de Bord',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Finance & Comptabilité',
    href: '/finance',
    icon: Wallet,
    badge: 3,
  },
  {
    title: 'Ventes & CRM',
    href: '/sales',
    icon: ShoppingCart,
    badge: 5,
  },
  {
    title: 'Achats',
    href: '/purchases',
    icon: Package,
  },
  {
    title: 'Stocks & Inventaire',
    href: '/inventory',
    icon: Package,
  },
  {
    title: 'RH & Paie',
    href: '/hr',
    icon: Users,
  },
  {
    title: 'Production',
    href: '/production',
    icon: Factory,
  },
  {
    title: 'Business Intelligence',
    href: '/bi',
    icon: BarChart3,
  },
  {
    title: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
          collapsed ? 'w-[70px]' : 'w-[280px]'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-dz-green to-dz-green-light flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-sidebar-foreground leading-tight">
                  ERP-DZ
                </h1>
                <p className="text-xs text-muted-foreground">Gestion Algérienne</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center justify-center w-full h-10 rounded-lg transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover text-popover-foreground">
                        {item.title}
                        {item.badge && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className={cn(
                        'w-5 h-5 flex-shrink-0 transition-transform',
                        !isActive && 'group-hover:scale-110'
                      )} />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.badge && (
                        <span className={cn(
                          'ml-auto flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-destructive/10 text-destructive'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span>Réduire</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
