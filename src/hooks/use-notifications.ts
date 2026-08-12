// ============================================================
// HASSIBA Suite ERP - useNotifications Hook
// React hook for real-time notification management
// ============================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Socket, io } from 'socket.io-client'
import { 
  SOCKET_CONFIG, 
  SocketEvents,
  createSocket,
  disconnectSocket,
  joinNotificationRooms,
  markNotificationRead as socketMarkRead,
  markAllNotificationsRead as socketMarkAllRead,
  requestUnreadCount,
  sendTestNotification,
} from '@/lib/socket'

// ============================================================
// Types
// ============================================================

export type RealtimeNotificationType = 
  | 'invoice_created'
  | 'payment_received' 
  | 'stock_alert'
  | 'approval_needed'
  | 'approval_completed'
  | 'system'
  | 'hr_leave'
  | 'hr_payroll'
  | 'production_order'
  | 'maintenance_alert'

export interface RealtimeNotification {
  id: string
  type: RealtimeNotificationType
  title: string
  message: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  createdAt: Date | string
  userId: string
  companyId: string
  priority: number
  metadata?: Record<string, unknown>
}

export interface UseNotificationsOptions {
  userId?: string
  companyId?: string
  userName?: string
  autoConnect?: boolean
  enableSound?: boolean
}

export interface UseNotificationsReturn {
  // State
  notifications: RealtimeNotification[]
  unreadCount: number
  isConnected: boolean
  isConnecting: boolean
  
  // Actions
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  sendTest: () => void
  clearNotifications: () => void
  
  // Sound
  soundEnabled: boolean
  toggleSound: () => void
}

// ============================================================
// Notification Type Configuration
// ============================================================

export const NOTIFICATION_CONFIG: Record<RealtimeNotificationType, {
  icon: string
  color: string
  bgColor: string
  label: string
}> = {
  invoice_created: {
    icon: '📄',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Facture',
  },
  payment_received: {
    icon: '💰',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Paiement',
  },
  stock_alert: {
    icon: '📦',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Stock',
  },
  approval_needed: {
    icon: '✅',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Approbation',
  },
  approval_completed: {
    icon: '✨',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    label: 'Approuvé',
  },
  system: {
    icon: '⚙️',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    label: 'Système',
  },
  hr_leave: {
    icon: '🏖️',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'Congé',
  },
  hr_payroll: {
    icon: '💵',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Paie',
  },
  production_order: {
    icon: '🏭',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Production',
  },
  maintenance_alert: {
    icon: '🔧',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Maintenance',
  },
}

// ============================================================
// Audio Context for Notification Sounds
// ============================================================

function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Silently fail if audio is not supported
  }
}

// ============================================================
// Main Hook
// ============================================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    userId,
    companyId,
    userName,
    autoConnect = true,
    enableSound: initialEnableSound = true,
  } = options

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(() => !!(autoConnect && userId))
  const [soundEnabled, setSoundEnabled] = useState<boolean>(initialEnableSound)
  
  const socketRef = useRef<Socket | null>(null)
  const soundEnabledRef = useRef(soundEnabled)

  // Keep ref in sync
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // ----------------------------------------------------------
  // Handle new notification
  // ----------------------------------------------------------
  const handleNewNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications((prev) => [notification, ...prev])
    
    // Play sound if enabled and notification is unread
    if (!notification.read && soundEnabledRef.current) {
      playNotificationSound()
    }
  }, [])

  // ----------------------------------------------------------
  // Handle notification history
  // ----------------------------------------------------------
  const handleHistory = useCallback((data: { notifications: RealtimeNotification[]; unreadCount: number }) => {
    setNotifications(data.notifications.map(n => ({
      ...n,
      createdAt: typeof n.createdAt === 'string' ? new Date(n.createdAt) : n.createdAt,
    })))
    setUnreadCount(data.unreadCount)
  }, [])

  // ----------------------------------------------------------
  // Handle notification updated (mark as read)
  // ----------------------------------------------------------
  const handleNotificationUpdated = useCallback((data: { notificationId: string; read: boolean; unreadCount: number }) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === data.notificationId ? { ...n, read: data.read } : n))
    )
    setUnreadCount(data.unreadCount)
  }, [])

  // ----------------------------------------------------------
  // Handle all read
  // ----------------------------------------------------------
  const handleAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // ----------------------------------------------------------
  // Handle unread count update
  // ----------------------------------------------------------
  const handleUnreadCount = useCallback((data: { count: number }) => {
    setUnreadCount(data.count)
  }, [])

  // ----------------------------------------------------------
  // Socket connection & event listeners
  // ----------------------------------------------------------
  useEffect(() => {
    if (!autoConnect || !userId) return

    // Create socket connection
    const socket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG.options,
      forceNew: true,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('[useNotifications] Connected to notification service')
      setIsConnected(true)
      setIsConnecting(false)

      // Join rooms after connection
      if (userId && companyId) {
        joinNotificationRooms(socket, { userId, companyId, userName })
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[useNotifications] Disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[useNotifications] Connection error:', error.message)
      setIsConnecting(false)
      setIsConnected(false)
    })

    // Notification events
    socket.on(SocketEvents.NOTIFICATION_NEW, handleNewNotification)
    socket.on(SocketEvents.NOTIFICATION_HISTORY, handleHistory)
    socket.on(SocketEvents.NOTIFICATION_UPDATED, handleNotificationUpdated)
    socket.on(SocketEvents.NOTIFICATION_ALL_READ, handleAllRead)
    socket.on(SocketEvents.NOTIFICATION_UNREAD_COUNT, handleUnreadCount)

    // Cleanup on unmount
    return () => {
      socket.off(SocketEvents.NOTIFICATION_NEW, handleNewNotification)
      socket.off(SocketEvents.NOTIFICATION_HISTORY, handleHistory)
      socket.off(SocketEvents.NOTIFICATION_UPDATED, handleNotificationUpdated)
      socket.off(SocketEvents.NOTIFICATION_ALL_READ, handleAllRead)
      socket.off(SocketEvents.NOTIFICATION_UNREAD_COUNT, handleUnreadCount)
      
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, companyId, userName, autoConnect, handleNewNotification, handleHistory, handleNotificationUpdated, handleAllRead, handleUnreadCount])

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  const markAsRead = useCallback((notificationId: string) => {
    if (socketRef.current && userId) {
      socketMarkRead(socketRef.current, notificationId, userId)
      
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }, [userId])

  const markAllAsRead = useCallback(() => {
    if (socketRef.current && userId) {
      socketMarkAllRead(socketRef.current, userId)
      
      // Optimistic update
      handleAllRead()
    }
  }, [userId, handleAllRead])

  const sendTest = useCallback(() => {
    if (socketRef.current && userId) {
      sendTestNotification(socketRef.current, userId, companyId)
    }
  }, [userId, companyId])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev)
  }, [])

  return {
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
  }
}

// ============================================================
// Utility Functions
// ============================================================

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "À l'instant"
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  } else if (diffDays === 1) {
    return "Hier"
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`
  } else {
    return targetDate.toLocaleDateString('fr-DZ', {
      day: 'numeric',
      month: 'short',
      year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

export function getNotificationConfig(type: RealtimeNotificationType) {
  return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system
}
