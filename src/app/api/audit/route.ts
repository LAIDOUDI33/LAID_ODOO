// ============================================================
// HASSIBA Suite ERP v2.0.0 - Audit Trail API
// Journal des Actions - Conformité Fiscale DZ
// ============================================================

import { NextResponse } from "next/server";
import { getAuditLogs, getAuditLogById, getAuditStats, AuditLogger } from "@/lib/audit";
import { AuditAction, AuditModule } from "@prisma/client";

// GET /api/audit - Récupérer les logs d'audit
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get("action") as AuditAction | null;
    const module = searchParams.get("module") as AuditModule | null;
    const entityName = searchParams.get("entityName");
    const entityId = searchParams.get("entityId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    // Endpoint spécial pour les statistiques
    if (searchParams.get("stats") === "true") {
      const stats = await getAuditStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json({ success: true, data: stats });
    }

    // Récupérer les logs avec filtres
    const result = await getAuditLogs({
      action: action || undefined,
      module: module || undefined,
      entityName: entityName || undefined,
      entityId: entityId || undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
      search: search || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Audit GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

// POST /api/audit - Créer une entrée d'audit manuelle
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, module, entityName, entityId, description, oldValues, newValues } = body;

    if (!action || !module) {
      return NextResponse.json(
        { success: false, error: "Action and module are required" },
        { status: 400 }
      );
    }

    // Validation de l'action
    const validActions = Object.values(AuditAction);
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid action. Valid actions: ${validActions.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Validation du module
    const validModules = Object.values(AuditModule);
    if (!validModules.includes(module)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid module. Valid modules: ${validModules.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const result = await AuditLogger.logCreate(
      request,
      module as AuditModule,
      entityName || "Manual",
      entityId || "unknown",
      newValues || {},
      body.user || { id: "system", name: "System", email: "system@hassiba.dz" }
    );

    return NextResponse.json(result, result.success ? 201 : 500);
  } catch (error) {
    console.error("Audit POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}
