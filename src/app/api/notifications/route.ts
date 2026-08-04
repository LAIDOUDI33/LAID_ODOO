// ============================================================
// HASSIBA Suite ERP v2.0.0 - Notifications API
// Système d'Alertes In-App
// ============================================================

import { NextResponse } from "next/server";
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  NotificationHelper,
} from "@/lib/notifications";

// GET /api/notifications - Récupérer les notifications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    // If no userId, return sample data for testing
    if (!userId) {
      // Return demo notifications for testing
      return NextResponse.json({
        success: true,
        data: [
          {
            id: "demo-1",
            title: "Bienvenue sur HASSIBA Suite ERP",
            message: "Votre système ERP est prêt à être utilisé.",
            type: "info",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "demo-2", 
            title: "Nouveau module disponible",
            message: "Le module Gestion de Projets est maintenant disponible.",
            type: "success",
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ],
        total: 2,
        unreadCount: 2,
      });
    }

    // Stats endpoint
    if (searchParams.get("stats") === "true") {
      const stats = await getNotificationStats(userId);
      return NextResponse.json({ success: true, data: stats });
    }

    // Preferences endpoint
    if (searchParams.get("preferences") === "true") {
      const { getOrCreatePreferences } = await import("@/lib/notifications");
      const prefs = await getOrCreatePreferences(userId);
      return NextResponse.json({ success: true, data: prefs });
    }

    // Get notifications with filters
    const result = await getUserNotifications({
      userId,
      isRead: searchParams.get("isRead") === "true" ? true 
                : searchParams.get("isRead") === "false" ? false 
                : undefined,
      type: searchParams.get("type") as any || undefined,
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Créer une notification ou action groupée
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Quick notification creation
    if (!action && data.userId && data.title) {
      const result = await createNotification(data);
      return NextResponse.json(result, result.success ? 201 : 400);
    }

    // Mark as read
    if (action === "mark_read" && data.notificationId && data.userId) {
      const result = await markAsRead(data.notificationId, data.userId);
      return NextResponse.json(result);
    }

    // Mark all as read
    if (action === "mark_all_read" && data.userId) {
      const result = await markAllAsRead(data.userId);
      return NextResponse.json(result);
    }

    // Delete notification
    if (action === "delete" && data.notificationId && data.userId) {
      const result = await deleteNotification(data.notificationId, data.userId);
      return NextResponse.json(result);
    }

    // Helper notifications
    if (action === "workflow_pending") {
      const result = await NotificationHelper.workflowPending(
        data.userId,
        data.workflowRef,
        data.workflowName
      );
      return NextResponse.json(result);
    }

    if (action === "workflow_approved") {
      const result = await NotificationHelper.workflowApproved(
        data.userId,
        data.workflowRef,
        data.workflowName
      );
      return NextResponse.json(result);
    }

    if (action === "invoice_due") {
      const result = await NotificationHelper.invoiceDue(
        data.userId,
        data.invoiceRef,
        data.amount,
        new Date(data.dueDate)
      );
      return NextResponse.json(result);
    }

    if (action === "payroll_ready") {
      const result = await NotificationHelper.payrollReady(
        data.userId,
        data.period,
        data.netAmount
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: "Invalid or missing action parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Notifications POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process notification request" },
      { status: 500 }
    );
  }
}
