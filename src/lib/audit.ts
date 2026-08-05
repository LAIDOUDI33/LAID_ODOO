// ============================================================
// HASSIBA Suite ERP v2.0.0 - Audit Trail Library
// Journal des Actions - Conformité Fiscale Algérienne
// ============================================================

import { db } from "./db";
import { AuditAction, AuditModule } from "@prisma/client";

// ============================================================
// Types
// ============================================================

export interface AuditLogEntry {
  action: AuditAction;
  module: AuditModule;
  entityName?: string;
  entityId?: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  module?: AuditModule;
  action?: AuditAction;
  entityName?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  search?: string; // Recherche dans description
}

// ============================================================
// Fonctions principales
// ============================================================

/**
 * Créer une entrée dans le journal d'audit
 * Utilisé automatiquement par les API routes
 */
export async function createAuditLog(entry: AuditLogEntry) {
  try {
    const auditLog = await db.auditLog.create({
      data: {
        action: entry.action,
        module: entry.module,
        entityName: entry.entityName,
        entityId: entry.entityId,
        description: entry.description,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        method: entry.method,
        endpoint: entry.endpoint,
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail,
      },
    });

    return { success: true, data: auditLog };
  } catch (error) {
    console.error("Audit Log Error:", error);
    // Ne pas bloquer l'opération principale si l'audit échoue
    return { success: false, error: "Failed to create audit log" };
  }
}

/**
 * Récupérer les logs d'audit avec filtres
 */
export async function getAuditLogs(options: AuditQueryOptions = {}) {
  const where: any = {};

  if (options.userId) where.userId = options.userId;
  if (options.module) where.module = options.module;
  if (options.action) where.action = options.action;
  if (options.entityName) where.entityName = options.entityName;
  if (options.entityId) where.entityId = options.entityId;

  // Filtre de dates
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  // Recherche textuelle
  if (options.search) {
    where.description = { contains: options.search };
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    success: true,
    data: logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    })),
    total,
    limit: options.limit || 50,
    offset: options.offset || 0,
  };
}

/**
 * Récupérer un log d'audit par ID
 */
export async function getAuditLogById(id: string) {
  const log = await db.auditLog.findUnique({ where: { id } });

  if (!log) {
    return { success: false, error: "Audit log not found" };
  }

  return {
    success: true,
    data: {
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    },
  };
}

// ============================================================
// Helpers pour les actions courantes
// ============================================================

export class AuditLogger {
  private static extractRequestInfo(request: Request): {
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    endpoint?: string;
  } {
    return {
      ipAddress: request.headers.get("x-forwarded-for") || 
                 request.headers.get("x-real-ip") || 
                 "unknown",
      userAgent: request.headers.get("user-agent") || undefined,
      method: request.method,
      endpoint: request.url,
    };
  }

  /**
   * Logger une connexion utilisateur
   */
  static async logLogin(
    request: Request,
    userId: string,
    userName: string,
    userEmail: string
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "login",
      module: "auth",
      description: `Connexion de ${userName} (${userEmail})`,
      userId,
      userName,
      userEmail,
      ...reqInfo,
    });
  }

  /**
   * Logger une déconnexion
   */
  static async logLogout(
    request: Request,
    userId: string,
    userName: string
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "logout",
      module: "auth",
      description: `Déconnexion de ${userName}`,
      userId,
      userName,
      ...reqInfo,
    });
  }

  /**
   * Logger la création d'une entité
   */
  static async logCreate(
    request: Request,
    module: AuditModule,
    entityName: string,
    entityId: string,
    newData: Record<string, any>,
    user: { id: string; name: string; email: string }
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "create",
      module,
      entityName,
      entityId,
      description: `Création ${entityName} #${entityId}`,
      newValues: newData,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...reqInfo,
    });
  }

  /**
   * Logger la modification d'une entité
   */
  static async logUpdate(
    request: Request,
    module: AuditModule,
    entityName: string,
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    user: { id: string; name: string; email: string }
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "update",
      module,
      entityName,
      entityId,
      description: `Modification ${entityName} #${entityId}`,
      oldValues: oldData,
      newValues: newData,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...reqInfo,
    });
  }

  /**
   * Logger la suppression d'une entité
   */
  static async logDelete(
    request: Request,
    module: AuditModule,
    entityName: string,
    entityId: string,
    deletedData: Record<string, any>,
    user: { id: string; name: string; email: string }
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "delete",
      module,
      entityName,
      entityId,
      description: `Suppression ${entityName} #${entityId}`,
      oldValues: deletedData,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...reqInfo,
    });
  }

  /**
   * Logger une approbation/rejet workflow
   */
  static async logApproval(
    request: Request,
    action: "approve" | "reject",
    entityType: string,
    entityId: string,
    comment?: string,
    user?: { id: string; name: string; email: string }
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: action === "approve" ? "approve" : "reject",
      module: "workflow",
      entityName: entityType,
      entityId,
      description: `${action === "approve" ? "Approbation" : "Rejet"} ${entityType} #${entityId}${comment ? ` - ${comment}` : ""}`,
      newValues: { comment },
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      ...reqInfo,
    });
  }

  /**
   * Logger un export de données
   */
  static async logExport(
    request: Request,
    module: AuditModule,
    format: string,
    filters?: Record<string, any>,
    user?: { id: string; name: string; email: string }
  ) {
    const reqInfo = this.extractRequestInfo(request);
    
    return createAuditLog({
      action: "export",
      module,
      description: `Export ${module} au format ${format}`,
      newValues: { format, filters },
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      ...reqInfo,
    });
  }
}

// ============================================================
// Middleware Express/Next.js pour logging automatique
// ============================================================

/**
 * Extraire les infos utilisateur depuis la session NextAuth
 */
export function getUserFromHeaders(headers: Headers): {
  userId?: string;
  userName?: string;
  userEmail?: string;
} | null {
  // Ces infos sont normalement extraites du token JWT côté serveur
  // Cette fonction est un helper pour les cas spéciaux
  const userId = headers.get("x-user-id");
  const userName = headers.get("x-user-name");
  const userEmail = headers.get("x-user-email");

  if (!userId) return null;

  return { userId, userName: userName || undefined, userEmail: userEmail || undefined };
}

// ============================================================
// Statistiques d'Audit
// ============================================================

export interface AuditStats {
  totalLogs: number;
  actionsByType: Record<string, number>;
  actionsByModule: Record<string, number>;
  logsByDay: Array<{ date: string; count: number }>;
  topUsers: Array<{ userName: string; count: number }>;
  failedLogins: number;
}

export async function getAuditStats(startDate?: Date, endDate?: Date) {
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = startDate;
    if (endDate) dateFilter.createdAt.lte = endDate;
  }

  // Récupérer tous les logs pour la période
  const logs = await db.auditLog.findMany({
    where: dateFilter,
    orderBy: { createdAt: "desc" },
    take: 10000, // Limite pour éviter surcharge mémoire
  });

  // Calculer les statistiques
  const stats: AuditStats = {
    totalLogs: logs.length,
    actionsByType: {},
    actionsByModule: {},
    logsByDay: [],
    topUsers: [],
    failedLogins: 0,
  };

  // Compter par type d'action
  for (const log of logs) {
    // Par type
    stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
    
    // Par module
    stats.actionsByModule[log.module] = (stats.actionsByModule[log.module] || 0) + 1;
    
    // Connexions échouées
    if (log.action === "login" && log.description?.includes("échouée")) {
      stats.failedLogins++;
    }
  }

  // Top utilisateurs
  const userCounts: Record<string, { name: string; count: number }> = {};
  for (const log of logs) {
    if (log.userName) {
      if (!userCounts[log.userId || ""]) {
        userCounts[log.userId || ""] = { name: log.userName, count: 0 };
      }
      userCounts[log.userId || ""].count++;
    }
  }
  stats.topUsers = Object.values(userCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Logs par jour (derniers 30 jours)
  const dayCounts: Record<string, number> = {};
  for (const log of logs) {
    const day = log.createdAt.toISOString().split("T")[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  stats.logsByDay = Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return stats;
}
