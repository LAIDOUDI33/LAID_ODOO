'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  Building2,
  CalendarDays,
  FileText,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useIsMobile } from '@/hooks/use-mobile'

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
    title: 'Calendrier',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
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

// Main navigation items for bottom nav (mobile)
const mainNavItems: NavItem[] = [
  {
    title: 'Accueil',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: Wallet,
  },
  {
    title: 'Ventes',
    href: '/sales',
    icon: ShoppingCart,
  },
  {
    title: 'Stocks',
    href: '/inventory',
    icon: Package,
  },
  {
    title: 'Plus',
    href: '#more',
    icon: Settings,
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, onToggle, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const sidebarRef = useRef<HTMLElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Touch/Swipe gesture handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
  }

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    
    // Swipe right to close (if open on mobile)
    if (isMobile && Math.abs(swipeDistance) > 100 && swipeDistance < 0) {
      onClose?.()
    }
    
    // Reset values
    touchStartX.current = 0
    touchEndX.current = 0
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
          collapsed ? 'w-[70px]' : 'w-[280px]',
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0',
          isMobile ? 'shadow-2xl' : ''
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border min-h-[64px]">
          <Link 
            href="/" 
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => isMobile && onClose?.()}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-dz-green via-dz-green-light to-dz-red flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-sidebar-foreground leading-tight flex items-center gap-1">
                  <span className="bg-gradient-to-r from-dz-green to-dz-red bg-clip-text text-transparent">HASSIBA</span>
                  <span className="text-xs font-normal text-muted-foreground">Suite</span>
                </h1>
                <p className="text-xs text-muted-foreground">ERP Enterprise v2.0</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-dz-green/10 text-dz-green rounded-full">25K Users Ready</span>
              </div>
            )}
          </Link>
          
          {/* Close button for mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-auto lg:hidden h-11 w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" role="navigation" aria-label="Navigation principale">
          <ul className="space-y-1" role="list">
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
                          onClick={() => isMobile && onClose?.()}
                          className={cn(
                            'flex items-center justify-center w-full rounded-lg transition-colors min-h-[44px]',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                          aria-label={item.title}
                          aria-current={isActive ? 'page' : undefined}
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
                      onClick={() => isMobile && onClose?.()}
                      className={cn(
                        'flex items-center gap-3 px-3 rounded-lg transition-all duration-200 group relative min-h-[44px]',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98]'
                      )}
                      aria-current={isActive ? 'page' : undefined}
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
                      
                      {/* Touch feedback ripple effect */}
                      <span className="absolute inset-0 rounded-lg opacity-0 group-active:bg-white/10 transition-opacity pointer-events-none" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse Toggle - Hidden on mobile */}
        {!isMobile && (
          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground min-h-[44px]"
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
        )}

        {/* Mobile bottom area */}
        {isMobile && (
          <div className="p-3 border-t border-sidebar-border safe-area-inset-bottom">
            <p className="text-xs text-center text-muted-foreground">
              HASSIBA Suite ERP v2.0
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

// Mobile Bottom Navigation Component
interface BottomNavProps {
  onMenuClick?: () => void
}

export function MobileBottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t border-border md:hidden safe-area-inset-bottom"
        role="navigation"
        aria-label="Navigation inférieure"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {mainNavItems.map((item) => {
            const isActive = item.href === '#' 
              ? false 
              : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            
            const Icon = item.icon
            
            // Special handling for "More" button
            if (item.href === '#more') {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={cn(
                    'flex flex-col items-center justify-center w-16 h-full transition-colors active:scale-95',
                    showMoreMenu ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-expanded={showMoreMenu}
                  aria-label="Plus d'options"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    showMoreMenu ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] mt-1">{item.title}</span>
                </button>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center w-16 h-full transition-all duration-200 active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  isActive && 'bg-primary/10'
                )}>
                  <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                
                <span className={cn(
                  'text-[10px] mt-0.5 font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.title}
                </span>
              </Link>
            )
          })}
        </div>
        
        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </nav>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setShowMoreMenu(false)} 
          />
          <div className="fixed bottom-20 left-4 right-4 z-50 bg-background rounded-2xl shadow-xl border p-4 animate-in slide-in-from-bottom-5 fade-in duration-200 md:hidden">
            <h3 className="font-semibold text-sm mb-3 text-foreground">Autres modules</h3>
            <div className="grid grid-cols-2 gap-2">
              {navItems.filter(item => !mainNavItems.some(main => main.href === item.href)).map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors min-h-[48px]"
                  >
                    <Icon className="w-5 h-5 text-dz-green flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{item.title}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto text-[10px] px-1.5">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowMoreMenu(false)}
              className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Fermer
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default Sidebar
