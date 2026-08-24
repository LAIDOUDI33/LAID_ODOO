'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Bell, Globe, User, Search, Menu, Download, Wifi, WifiOff, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { usePWA } from '@/hooks/use-pwa'
import Link from 'next/link'

// ============================================================
// Types
// ============================================================

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  success: boolean
  data?: Notification[]
  unreadCount?: number
  total?: number
  error?: string
}

interface HeaderProps {
  onMobileMenuToggle: () => void
}

// ============================================================
// Main Component
// ============================================================

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { data: session, status } = useSession()
  const [language, setLanguage] = React.useState<'fr' | 'ar'>('fr')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const { isOffline, canInstall, isInstalled } = usePWA()

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (status !== 'authenticated') return
    
    try {
      setNotificationsLoading(true)
      const response = await fetch('/api/notifications')
      
      if (response.ok) {
        const result: NotificationsResponse = await response.json()
        if (result.success && result.data) {
          setNotifications(result.data)
          setUnreadCount(result.unreadCount || result.data.filter(n => !n.isRead).length)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setNotificationsLoading(false)
    }
  }, [status])

  // Fetch notifications on mount and when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications()
    }
  }, [status, fetchNotifications])

  // Get user display name from session
  const getUserDisplayName = () => {
    if (status === 'loading') return 'Chargement...'
    if (!session?.user) return 'Utilisateur'
    
    return session.user.name || session.user.email || 'Utilisateur'
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!session?.user) return 'U'
    
    const name = session.user.name || ''
    if (name.includes(' ')) {
      const parts = name.split(' ')
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get user role/position from session
  const getUserRole = () => {
    if (!session?.user) return ''
    
    // Check for role in various possible locations
    const role = (session as any)?.user?.role || 
                 (session as any)?.role ||
                 session?.user?.name?.includes('Admin') ? 'Administrateur' : 'Utilisateur'
    
    return typeof role === 'string' ? role : 'Utilisateur'
  }

  // Get company name from session
  const getCompanyName = () => {
    return (session as any)?.company?.name || 
           (session as any)?.user?.company?.name || 
           'HASSIBA Suite'
  }

  // Format notification time
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const userId = (session as any)?.user?.id
      if (!userId) return

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', userId })
      })

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-[44px] min-w-[44px]"
            onClick={onMobileMenuToggle}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher... clients, produits, factures..."
              className="pl-10 w-[300px] lg:w-[400px] bg-muted/50"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "hidden sm:flex items-center gap-1.5 text-xs",
              isOffline ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Hors ligne</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>En ligne</span>
              </>
            )}
          </Button>

          {/* PWA Install Button - Only show if can install and not installed */}
          {!isInstalled && canInstall && (
            <InstallPrompt variant="button" />
          )}

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 min-h-[44px]">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Français' : 'العربية'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('fr')}>
                🇫🇷 Français
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ar')} dir="rtl">
                🇩🇿 العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications - Real data from API */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs animate-pulse"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications ({unreadCount} non lues)</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-0 text-xs text-primary"
                    onClick={handleMarkAllAsRead}
                  >
                    Tout marquer comme lu
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationsLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Chargement...
                </div>
              ) : notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.isRead && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/70">{formatNotificationTime(notification.createdAt)}</p>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Aucune notification
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary font-medium" asChild>
                <Link href="/settings?tab=notifications">Voir toutes les notifications</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile - Real session data */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3 min-h-[44px]">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || '/avatar.png'} alt={getUserDisplayName()} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground">{getUserRole()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{getUserDisplayName()}</span>
                  <span className="text-xs font-normal text-muted-foreground">{session?.user?.email}</span>
                  <span className="text-xs font-normal text-muted-foreground">{getCompanyName()}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=profile">
                  <User className="mr-2 w-4 h-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 w-4 h-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 w-4 h-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// Utility for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
