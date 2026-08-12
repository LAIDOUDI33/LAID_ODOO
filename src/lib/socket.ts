// ============================================================
// HASSIBA Suite ERP - Socket.IO Client Configuration
// Real-time Notification Connection Setup
// ============================================================

import { io, Socket } from 'socket.io-client'

// ============================================================
// Configuration
// ============================================================

export const SOCKET_CONFIG = {
  // Never use PORT in the URL, always use XTransformPort for Caddy gateway
  url: '/?XTransformPort=3004',
  options: {
    transports: ['websocket', 'polling'] as const,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 10000,
    autoConnect: true,
  },
}

// ============================================================
// Event Types (matching server events)
// ============================================================

export enum SocketEvents {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECTED = 'connected',
  
  // Room Management
  JOIN = 'join',
  JOINED = 'joined',
  
  // Notifications
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_HISTORY = 'notifications:history',
  NOTIFICATION_UPDATED = 'notification:updated',
  NOTIFICATION_ALL_READ = 'notifications:all-read',
  NOTIFICATION_UNREAD_COUNT = 'notification:unread-count',
  
  // Actions
  MARK_READ = 'notification:mark-read',
  MARK_ALL_READ = 'notification:mark-all-read',
  GET_UNREAD = 'notification:get-unread',
  
  // Test
  TEST_NOTIFICATION = 'test-notification',
  TEST_SENT = 'test-sent',
  
  // Send (admin/internal)
  SEND_NOTIFICATION = 'notification:send',
  SENT = 'notification:sent',
}

// ============================================================
// Create Socket Instance
// ============================================================

let socketInstance: Socket | null = null

export function getSocket(): Socket | null {
  return socketInstance
}

export function createSocket(): Socket {
  if (socketInstance?.connected) {
    return socketInstance
  }

  socketInstance = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options)

  // Global error handling
  socketInstance.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message)
  })

  socketInstance.on('error', (error) => {
    console.error('[Socket] Error:', error)
  })

  return socketInstance
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

// ============================================================
// Notification-specific helpers
// ============================================================

export interface JoinRoomPayload {
  userId: string
  companyId: string
  userName?: string
}

export function joinNotificationRooms(
  socket: Socket, 
  payload: JoinRoomPayload
): void {
  socket.emit(SocketEvents.JOIN, payload)
}

export function markNotificationRead(
  socket: Socket,
  notificationId: string,
  userId: string
): void {
  socket.emit(SocketEvents.MARK_READ, { notificationId, userId })
}

export function markAllNotificationsRead(socket: Socket, userId: string): void {
  socket.emit(SocketEvents.MARK_ALL_READ, { userId })
}

export function requestUnreadCount(socket: Socket, userId: string): void {
  socket.emit(SocketEvents.GET_UNREAD, { userId })
}

export function sendTestNotification(
  socket: Socket,
  userId: string,
  companyId?: string
): void {
  socket.emit(SocketEvents.TEST_NOTIFICATION, { userId, companyId })
}
