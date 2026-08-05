// ============================================================
// HASSIBA Suite ERP v2.0.0 - Notifications Library
// Système d'Alertes In-App/Email/SMS
// ============================================================

import { db } from "@/lib/db";
import { NotificationType, NotificationChannel } from "@prisma/client";

// ============================================================
// Types
// ============================================================

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel?: NotificationChannel;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  priority?: number;
  expiresAt?: Date;
}

export interface NotificationQuery {
  userId: string;
  isRead?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

// ============================================================
// CREATE NOTIFICATIONS
// ============================================================

export async function createNotification(input: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      channel: input.channel || NotificationChannel.in_app,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      priority: input.priority || 5,
      expiresAt: input.expiresAt,
    },
  });

  return { success: true, data: notification };
}

// ============================================================
// HELPER FUNCTIONS FOR COMMON NOTIFICATIONS
// ============================================================

export class NotificationHelper {
  // Workflow notifications
  static async workflowPending(userId: string, workflowRef: string, workflowName: string) {
    return createNotification({
      userId,
      title: "Approbation requise",
      message: `Une validation est requise pour: ${workflowName}`,
      type: NotificationType.workflow_pending,
      actionUrl: `/workflow?ref=${workflowRef}`,
      actionLabel: "Voir",
      entityType: "WorkflowInstance",
      entityId: workflowRef,
      priority: 7,
    });
  }

  static async workflowApproved(userId: string, workflowRef: string, workflowName: string) {
    return createNotification({
      userId,
      title: "Approuvé ✓",
      message: `${workflowName} a été approuvé`,
      type: NotificationType.workflow_approved,
      actionUrl: `/workflow?ref=${workflowRef}`,
      actionLabel: "Voir",
      entityType: "WorkflowInstance",
      entityId: workflowRef,
      priority: 6,
    });
  }

  static async workflowRejected(userId: string, workflowRef: string, workflowName: string, reason?: string) {
    return createNotification({
      userId,
      title: "Rejeté ✗",
      message: `${workflowName} a été rejeté${reason ? `: ${reason}` : ""}`,
      type: NotificationType.workflow_rejected,
      actionUrl: `/workflow?ref=${workflowRef}`,
      actionLabel: "Voir",
      entityType: "WorkflowInstance",
      entityId: workflowRef,
      priority: 8,
    });
  }

  // Invoice notifications
  static async invoiceDue(userId: string, invoiceRef: string, amount: number, dueDate: Date) {
    return createNotification({
      userId,
      title: "Échéance facture",
      message: `Facture ${invoiceRef} de ${amount.toLocaleString("fr-DZ")} DZD arrive à échéance le ${dueDate.toLocaleDateString("fr-DZ")}`,
      type: NotificationType.invoice_due,
      actionUrl: `/invoices/${invoiceRef}`,
      actionLabel: "Voir facture",
      entityType: "Invoice",
      entityId: invoiceRef,
      priority: 7,
      expiresAt: dueDate,
    });
  }

  static async paymentReceived(userId: string, paymentRef: string, amount: number, clientName: string) {
    return createNotification({
      userId,
      title: "Paiement reçu 💰",
      message: `${clientName} a payé ${amount.toLocaleString("fr-DZ")} DZD`,
      type: NotificationType.payment_received,
      actionUrl: `/payments/${paymentRef}`,
      actionLabel: "Voir",
      entityType: "Payment",
      entityId: paymentRef,
      priority: 5,
    });
  }

  // Leave notifications
  static async leaveApproved(userId: string, leaveId: string, dates: string) {
    return createNotification({
      userId,
      title: "Congé approuvé 🏖️",
      message: `Votre demande de congé (${dates}) a été approuvée`,
      type: NotificationType.leave_approved,
      actionUrl: `/leaves/${leaveId}`,
      actionLabel: "Voir",
      entityType: "LeaveRequest",
      entityId: leaveId,
      priority: 4,
    });
  }

  static async leaveRejected(userId: string, leaveId: string, reason?: string) {
    return createNotification({
      userId,
      title: "Congé refusé",
      message: `Votre demande de congé a été refusée${reason ? `: ${reason}` : ""}`,
      type: NotificationType.leave_rejected,
      actionUrl: `/leaves/${leaveId}`,
      actionLabel: "Voir",
      entityType: "LeaveRequest",
      entityId: leaveId,
      priority: 6,
    });
  }

  // Payroll notification
  static async payrollReady(userId: string, period: string, netAmount: number) {
    return createNotification({
      userId,
      title: "Bulletin de paie disponible 📄",
      message: `Votre bulletin de paie pour ${period} est disponible. Net: ${netAmount.toLocaleString("fr-DZ")} DZD`,
      type: NotificationType.payroll_ready,
      actionUrl: `/payslips/${period}`,
      actionLabel: "Voir bulletin",
      entityType: "Payroll",
      entityId: period,
      priority: 8,
    });
  }

  // Stock alert
  static async lowStock(userId: string, productName: string, currentQty: number, minQty: number) {
    return createNotification({
      userId,
      title: "Stock bas ⚠️",
      message: `${productName}: stock actuel (${currentQty}) inférieur au minimum (${minQty})`,
      type: NotificationType.low_stock,
      actionUrl: `/inventory?product=${productName}`,
      actionLabel: "Voir stock",
      entityType: "Product",
      priority: 9,
    });
  }

  // System alert
  static async systemAlert(userId: string, title: string, message: string, metadata?: Record<string, any>) {
    return createNotification({
      userId,
      title: `🔔 Système: ${title}`,
      message,
      type: NotificationType.system_alert,
      metadata,
      priority: 10,
    });
  }
}

// ============================================================
// GET NOTIFICATIONS
// ============================================================

export async function getUserNotifications(query: NotificationQuery) {
  const where: any = { userId: query.userId };
  
  if (query.isRead !== undefined) {
    where.isRead = query.isRead;
  }
  
  if (query.type) {
    where.type = query.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit || 50,
      skip: query.offset || 0,
    }),
    db.notification.count({ where }),
    db.notification.count({ 
      where: { ...where, isRead: false } 
    }),
  ]);

  return {
    success: true,
    data: notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    })),
    total,
    unreadCount,
    limit: query.limit || 50,
    offset: query.offset || 0,
  };
}

// ============================================================
// MARK AS READ
// ============================================================

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return { success: false, error: "Notification not found" };
  }

  const updated = await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return { success: true, data: updated };
}

export async function markAllAsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { success: true, count: result.count };
}

// ============================================================
// DELETE NOTIFICATION
// ============================================================

export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return { success: false, error: "Notification not found" };
  }

  await db.notification.delete({ where: { id: notificationId } });

  return { success: true };
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export async function getOrCreatePreferences(userId: string) {
  let prefs = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await db.notificationPreference.create({
      data: { userId },
    });
  }

  return prefs;
}

export async function updatePreferences(userId: string, preferences: Partial<{
  workflowEnabled: boolean;
  invoiceEnabled: boolean;
  paymentEnabled: boolean;
  leaveEnabled: boolean;
  payrollEnabled: boolean;
  stockEnabled: boolean;
  systemEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  emailNotification: string;
}>) {
  const prefs = await getOrCreatePreferences(userId);

  const updated = await db.notificationPreference.update({
    where: { userId },
    data: preferences,
  });

  return { success: true, data: updated };
}

// ============================================================
// NOTIFICATION STATS
// ============================================================

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recent: Array<{ id: string; title: string; type: string; createdAt: Date; isRead: boolean }>;
}

export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  const [total, unread, byTypeResult, recent] = await Promise.all([
    db.notification.count({ where: { userId } }),
    db.notification.count({ where: { userId, isRead: false } }),
    db.notification.groupBy({
      by: ["type"],
      where: { userId },
      _count: true,
      orderBy: { _count: { type: "desc" } },
      take: 10,
    }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, createdAt: true, isRead: true },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const item of byTypeResult) {
    byType[item.type] = item._count;
  }

  return { total, unread, byType, recent };
}
