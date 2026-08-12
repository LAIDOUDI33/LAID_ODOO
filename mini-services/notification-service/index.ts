// ============================================================
// HASSIBA Suite ERP - Real-time Notification Service
// WebSocket/Socket.IO Server for Real-time Notifications
// Port: 3004
// ============================================================

import { createServer } from 'http'
import { Server } from 'socket.io'
import { randomUUID } from 'crypto'

// ============================================================
// Types
// ============================================================

export type NotificationType = 
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

export interface NotificationPayload {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  createdAt: Date
  userId: string
  companyId: string
  priority: number
  metadata?: Record<string, unknown>
}

export interface SocketUser {
  id: string
  name: string
  email: string
  companyId: string
  socketId: string
}

interface JoinRoomData {
  userId: string
  companyId: string
  userName?: string
}

interface SendNotificationData {
  userId?: string
  companyId?: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  priority?: number
  metadata?: Record<string, unknown>
}

// ============================================================
// In-Memory Storage
// ============================================================

const notificationsStore = new Map<string, NotificationPayload>()
const onlineUsers = new Map<string, SocketUser>() // userId -> SocketUser
const MAX_NOTIFICATIONS_PER_USER = 100
const NOTIFICATION_RETENTION_MS = 24 * 60 * 60 * 1000 // 24 hours

// ============================================================
// Helper Functions
// ============================================================

function generateNotificationId(): string {
  return `notif_${randomUUID().replace(/-/g, '').substring(0, 16)}`
}

function cleanupOldNotifications(): void {
  const now = Date.now()
  for (const [id, notification] of notificationsStore.entries()) {
    const notificationTime = new Date(notification.createdAt).getTime()
    if (now - notificationTime > NOTIFICATION_RETENTION_MS) {
      notificationsStore.delete(id)
    }
  }
}

function getUserNotifications(userId: string): NotificationPayload[] {
  const userNotifications: NotificationPayload[] = []
  for (const notification of notificationsStore.values()) {
    if (notification.userId === userId) {
      userNotifications.push(notification)
    }
  }
  return userNotifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function getUnreadCount(userId: string): number {
  let count = 0
  for (const notification of notificationsStore.values()) {
    if (notification.userId === userId && !notification.read) {
      count++
    }
  }
  return count
}

function createNotification(data: SendNotificationData, targetUserId: string): NotificationPayload {
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: data.type,
    title: data.title,
    message: data.message,
    read: false,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    createdAt: new Date(),
    userId: targetUserId,
    companyId: data.companyId || '',
    priority: data.priority || 5,
    metadata: data.metadata,
  }

  // Store notification (limit per user)
  const userNotifs = getUserNotifications(targetUserId)
  if (userNotifs.length >= MAX_NOTIFICATIONS_PER_USER) {
    // Remove oldest notification for this user
    const oldest = userNotifs[userNotifs.length - 1]
    if (oldest) {
      notificationsStore.delete(oldest.id)
    }
  }

  notificationsStore.set(notification.id, notification)
  return notification
}

// ============================================================
// HTTP & Socket.IO Server Setup
// ============================================================

const httpServer = createServer()

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
})

// ============================================================
// Socket Event Handlers
// ============================================================

io.on('connection', (socket) => {
  console.log(`[NotificationService] Client connected: ${socket.id}`)

  // ----------------------------------------------------------
  // User joins their personal room and company room
  // ----------------------------------------------------------
  socket.on('join', (data: JoinRoomData) => {
    const { userId, companyId, userName } = data
    
    // Join personal room
    socket.join(`user:${userId}`)
    
    // Join company room
    if (companyId) {
      socket.join(`company:${companyId}`)
    }

    // Track online user
    const user: SocketUser = {
      id: userId,
      name: userName || userId,
      email: '',
      companyId: companyId || '',
      socketId: socket.id,
    }
    onlineUsers.set(userId, user)

    console.log(`[NotificationService] User ${userName || userId} joined rooms`)

    // Send recent notifications to user
    const recentNotifications = getUserNotifications(userId)
    socket.emit('notifications:history', {
      notifications: recentNotifications.slice(0, 20),
      unreadCount: getUnreadCount(userId),
    })

    // Confirm join
    socket.emit('joined', {
      success: true,
      userId,
      companyId,
    })
  })

  // ----------------------------------------------------------
  // Mark notification as read
  // ----------------------------------------------------------
  socket.on('notification:mark-read', (data: { notificationId: string; userId: string }) => {
    const notification = notificationsStore.get(data.notificationId)
    if (notification && notification.userId === data.userId) {
      notification.read = true
      notificationsStore.set(data.notificationId, notification)
      
      socket.emit('notification:updated', {
        notificationId: data.notificationId,
        read: true,
        unreadCount: getUnreadCount(data.userId),
      })
    }
  })

  // ----------------------------------------------------------
  // Mark all notifications as read
  // ----------------------------------------------------------
  socket.on('notification:mark-all-read', (data: { userId: string }) => {
    for (const notification of notificationsStore.values()) {
      if (notification.userId === data.userId && !notification.read) {
        notification.read = true
        notificationsStore.set(notification.id, notification)
      }
    }
    
    socket.emit('notifications:all-read', {
      success: true,
      unreadCount: 0,
    })
  })

  // ----------------------------------------------------------
  // Get unread count
  // ----------------------------------------------------------
  socket.on('notification:get-unread', (data: { userId: string }) => {
    socket.emit('notification:unread-count', {
      count: getUnreadCount(data.userId),
    })
  })

  // ----------------------------------------------------------
  // Send notification (internal/API use)
  // ----------------------------------------------------------
  socket.on('notification:send', (data: SendNotificationData) => {
    console.log(`[NotificationService] Sending notification: ${data.type} - ${data.title}`)

    // Send to specific user
    if (data.userId) {
      const notification = createNotification(data, data.userId)
      
      // Emit to user's personal room
      io.to(`user:${data.userId}`).emit('notification:new', notification)
      
      // Update unread count for user
      io.to(`user:${data.userId}`).emit('notification:unread-count', {
        count: getUnreadCount(data.userId),
      })
    }

    // Broadcast to company
    if (data.companyId && !data.userId) {
      // Get all users in this company (from online users)
      const companyUsers = Array.from(onlineUsers.values()).filter(
        (u) => u.companyId === data.companyId
      )

      for (const user of companyUsers) {
        const notification = createNotification(data, user.id)
        io.to(`user:${user.id}`).emit('notification:new', notification)
        io.to(`user:${user.id}`).emit('notification:unread-count', {
          count: getUnreadCount(user.id),
        })
      }
    }

    // Acknowledge
    socket.emit('notification:sent', { success: true })
  })

  // ----------------------------------------------------------
  // Test notification (for development)
  // ----------------------------------------------------------
  socket.on('test-notification', (data: { userId: string; companyId?: string }) => {
    const testTypes: NotificationType[] = [
      'invoice_created',
      'payment_received',
      'stock_alert',
      'approval_needed',
      'system',
    ]
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)]

    const testData: SendNotificationData = {
      userId: data.userId,
      companyId: data.companyId,
      type: randomType,
      title: 'Notification de Test',
      message: 'Ceci est une notification de test en temps réel',
      actionUrl: '/dashboard',
      actionLabel: 'Voir',
      priority: 5,
    }

    const notification = createNotification(testData, data.userId)
    io.to(`user:${data.userId}`).emit('notification:new', notification)
    io.to(`user:${data.userId}`).emit('notification:unread-count', {
      count: getUnreadCount(data.userId),
    })

    socket.emit('test-sent', { success: true, notification })
  })

  // ----------------------------------------------------------
  // Disconnect handler
  // ----------------------------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(`[NotificationService] Client disconnected: ${socket.id}, reason: ${reason}`)
    
    // Remove from online users
    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }
  })

  // Error handler
  socket.on('error', (error) => {
    console.error(`[NotificationService] Socket error (${socket.id}):`, error)
  })

  // Send connection confirmation
  socket.emit('connected', {
    service: 'HASSIBA Notification Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// ============================================================
// Cleanup Interval (every 30 minutes)
// ============================================================
setInterval(cleanupOldNotifications, 30 * 60 * 1000)

// ============================================================
// Start Server
// ============================================================

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════════╗`)
  console.log(`║  HASSIBA Notification Service                    ║`)
  console.log(`║  Real-time WebSocket Server                      ║`)
  console.log(`║                                                  ║`)
  console.log(`║  Port:     ${PORT.toString().padEnd(36)}║`)
  console.log(`║  Status:   Running                                ║`)
  console.log(`║  Retention: 24 hours                              ║`)
  console.log(`╚══════════════════════════════════════════════════╝`)
})

// ============================================================
// Graceful Shutdown
// ============================================================

process.on('SIGTERM', () => {
  console.log('[NotificationService] Received SIGTERM, shutting down...')
  io.close(() => {
    httpServer.close(() => {
      console.log('[NotificationService] Server closed')
      process.exit(0)
    })
  })
})

process.on('SIGINT', () => {
  console.log('[NotificationService] Received SIGINT, shutting down...')
  io.close(() => {
    httpServer.close(() => {
      console.log('[NotificationService] Server closed')
      process.exit(0)
    })
  })
})
