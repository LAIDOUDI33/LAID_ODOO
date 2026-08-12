// ============================================================
// HASSIBA Suite ERP - Notification Center Components
// Real-time notification UI with dropdown, bell, and settings
// ============================================================

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Settings, 
  Volume2, 
  VolumeX,
  X,
  ExternalLink,
  Trash2,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  useNotifications, 
  formatRelativeTime, 
  getNotificationConfig,
  type RealtimeNotification,
  type RealtimeNotificationType
} from '@/hooks/use-notifications'

// ============================================================
// Animation Variants
// ============================================================

const dropdownVariants = {
  hidden: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
}

const notificationItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0,
    transition: { delay: i * 0.05, duration: 0.2 }
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } }
}

const bellVariants = {
  idle: { rotate: 0 },
  ring: { 
    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
    transition: { duration: 0.5, ease: 'easeInOut' }
  }
}

// ============================================================
// Notification Item Component
// ============================================================

interface NotificationItemProps {
  notification: RealtimeNotification
  index: number
  onMarkAsRead: (id: string) => void
}

function NotificationItem({ notification, index, onMarkAsRead }: NotificationItemProps) {
  const config = getNotificationConfig(notification.type)
  const [isExiting, setIsExiting] = useState(false)

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <motion.div
      custom={index}
      variants={notificationItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${!notification.read 
          ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' 
          : 'hover:bg-muted/50 opacity-80'
        }
      `}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm ${config.bgColor}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </p>
          
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleMarkAsRead}
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground/70">
            {formatRelativeTime(notification.createdAt)}
          </span>
          
          {notification.actionLabel && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-primary flex items-center gap-0.5">
                {notification.actionLabel}
                <ExternalLink className="w-3 h-3" />
              </span>
            </>
          )}

          {!notification.read && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </>
          )}
        </div>
      </div>

      {/* Type Badge */}
      <Badge 
        variant="secondary" 
        className={`shrink-0 text-[10px] px-1.5 h-5 ${config.color} bg-transparent border`}
      >
        {config.label}
      </Badge>
    </motion.div>
  )
}

// ============================================================
// Empty State Component
// ============================================================

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="font-medium text-muted-foreground">Aucune notification</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Vous êtes à jour! Les nouvelles notifications apparaîtront ici.
      </p>
    </motion.div>
  )
}

// ============================================================
// Settings Panel Component
// ============================================================

interface SettingsPanelProps {
  soundEnabled: boolean
  onToggleSound: () => void
  isConnected: boolean
  onSendTest: () => void
}

function SettingsPanel({ soundEnabled, onToggleSound, isConnected, onSendTest }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <Label htmlFor="sound-toggle" className="text-sm">Son de notification</Label>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={onToggleSound}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              {isConnected ? 'Connecté en temps réel' : 'Déconnecté'}
            </span>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            {isConnected ? 'En ligne' : 'Hors ligne'}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onSendTest}
          disabled={!isConnected}
        >
          <BellRing className="w-4 h-4" />
          Envoyer une notification de test
        </Button>
      </div>
    </motion.div>
  )
}

// ============================================================
// Main Notification Bell Component
// ============================================================

interface NotificationCenterProps {
  userId?: string
  companyId?: string
  userName?: string
}

export function NotificationCenter({ 
  userId = 'demo-user', 
  companyId = 'demo-company',
  userName = 'Utilisateur'
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bellAnimationKey, setBellAnimationKey] = useState(0)
  const prevUnreadCountRef = useRef(0)

  const {
    notifications,
    unreadCount,
    isConnected,
    isConnecting,
    markAsRead,
    markAllAsRead,
    sendTest,
    clearNotifications,
    soundEnabled,
    toggleSound,
  } = useNotifications({
    userId,
    companyId,
    userName,
    autoConnect: true,
    enableSound: true,
  })

  // Detect new notifications for bell animation - use event handler pattern
  const handleBellAnimationTrigger = useCallback(() => {
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
      setBellAnimationKey(k => k + 1)
      // Auto-reset after animation completes
      setTimeout(() => {
        setBellAnimationKey(k => k + 1)
      }, 1000)
    }
    prevUnreadCountRef.current = unreadCount
  }, [unreadCount])

  // Use layout effect to trigger bell animation when unread count changes
  // This is acceptable as it's synchronizing with DOM updates
  React.useLayoutEffect(() => {
    handleBellAnimationTrigger()
  }, [unreadCount, handleBellAnimationTrigger])

  // Determine if bell should be animating based on key parity
  const shouldAnimateBell = bellAnimationKey % 2 === 1

  // Display notifications (limit to 20 in dropdown)
  const displayNotifications = notifications.slice(0, 20)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative data-[state=open]:bg-accent"
        >
          <motion.div
            variants={bellVariants}
            animate={shouldAnimateBell ? 'ring' : 'idle'}
          >
            {unreadCount > 0 ? (
              <BellRing className="w-5 h-5 text-primary" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </motion.div>

          {/* Unread Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center"
              >
                <Badge
                  variant="destructive"
                  className="px-1.5 text-[10px] font-bold h-auto"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connection Indicator */}
          {!isConnecting && !isConnected && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-red-500" />
          )}
          {isConnecting && (
            <Loader2 className="absolute bottom-0 right-0 w-2 h-2 animate-spin text-yellow-500" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="end" 
        className="w-[380px] p-0 overflow-hidden"
        sideOffset={8}
      >
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col max-h-[480px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1.5 text-xs text-primary gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    markAllAsRead()
                  }}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout lire
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 p-1.5 ${showSettings ? 'bg-accent' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings(!showSettings)
                }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                isConnected={isConnected}
                onSendTest={() => sendTest()}
              />
            )}
          </AnimatePresence>

          {/* Notifications List */}
          <ScrollArea className="flex-1 max-h-[340px]">
            {displayNotifications.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="p-2 space-y-1">
                <AnimatePresence mode="popLayout">
                  {displayNotifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      index={index}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-destructive gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearNotifications()
                    setIsOpen(false)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Effacer tout
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Export individual components for custom usage
// ============================================================

export { NotificationItem, EmptyState, SettingsPanel }
export type { NotificationItemProps, SettingsPanelProps }
