// ============================================================
// HASSIBA Suite ERP v2.0.0 - Reports & Documents API
// Gestion des Rapports & Génération de Documents
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ReportType, ReportFormat, ReportStatus } from "@prisma/client";
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/reports - Récupérer rapports et templates
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // reports, templates, stats
    const reportType = searchParams.get("reportType") as ReportType | null;
    const status = searchParams.get("status") as ReportStatus | null;
    const companyId = searchParams.get("companyId");

    // Stats endpoint
    if (type === "stats") {
      const [totalReports, reportsByType, reportsByStatus, recentReports] = await Promise.all([
        db.report.count({ where: { companyId: companyId || undefined } }),
        db.report.groupBy({
          by: ["type"],
          _count: true,
          where: { companyId: companyId || undefined },
        }),
        db.report.groupBy({
          by: ["status"],
          _count: true,
          where: { companyId: companyId || undefined },
        }),
        db.report.findMany({
          where: { companyId: companyId || undefined },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, type: true, status: true, createdAt: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalReports,
            byType: reportsByType,
            byStatus: reportsByStatus,
          },
          recentReports,
        },
      });
    }

    // Get reports
    if (!type || type === "reports") {
      const where: any = {};
      if (reportType) where.type = reportType;
      if (status) where.status = status;
      if (companyId) where.companyId = companyId;

      const reports = await db.report.findMany({
        where,
        include: {
          generator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({
        success: true,
        data: reports,
        total: reports.length,
      });
    }

    // Get report templates
    if (type === "templates") {
      const templates = await db.reportTemplate.findMany({
        where: companyId ? { companyId } : {},
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        take: 50,
      });

      return NextResponse.json({
        success: true,
        data: templates,
        total: templates.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Specify type=reports or type=templates or type=stats" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Reports GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reports data" },
      { status: 500 }
    );
  }
}

// POST /api/reports - Créer rapport ou template
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for write operations
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();
    const { action, ...data } = body;

    // Generate new report
    if (action === "generate" || action === "create_report" || (!action && data.name)) {
      const report = await db.report.create({
        data: {
          name: data.name,
          description: data.description || null,
          type: data.type || ReportType.custom,
          format: data.format || ReportFormat.pdf,
          status: ReportStatus.generating,
          parameters: data.parameters ? JSON.stringify(data.parameters) : null,
          dateStart: data.dateStart ? new Date(data.dateStart) : null,
          dateEnd: data.dateEnd ? new Date(data.dateEnd) : null,
          generatedBy: data.generatedBy,
          companyId: data.companyId,
        },
        include: {
          generator: { select: { id: true, name: true, email: true } },
        },
      });

      // Simulate report generation (in production, this would be a background job)
      setTimeout(async () => {
        try {
          await db.report.update({
            where: { id: report.id },
            data: {
              status: ReportStatus.completed,
              fileUrl: `/reports/${report.id}.${data.format || 'pdf'}`,
              fileName: `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.${data.format || 'pdf'}`,
              fileSize: Math.floor(Math.random() * 5000000) + 100000, // Random size for demo
              generationTimeMs: Math.floor(Math.random() * 10000) + 1000,
              recordCount: Math.floor(Math.random() * 1000) + 10,
              completedAt: new Date(),
            },
          });
        } catch (e) {
          console.error("Report generation failed:", e);
          await db.report.update({
            where: { id: report.id },
            data: {
              status: ReportStatus.failed,
              errorMessage: "Report generation failed",
            },
          });
        }
      }, 3000);

      return NextResponse.json({ success: true, data: report }, 201);
    }

    // Create report template
    if (action === "create_template") {
      const template = await db.reportTemplate.create({
        data: {
          name: data.name,
          description: data.description || null,
          type: data.type || ReportType.custom,
          isDefault: data.isDefault || false,
          templateConfig: data.templateConfig ? JSON.stringify(data.templateConfig) : null,
          headerTemplate: data.headerTemplate || null,
          footerTemplate: data.footerTemplate || null,
          logoIncluded: data.logoIncluded !== false,
          columns: data.columns ? JSON.stringify(data.columns) : null,
          availableFilters: data.availableFilters ? JSON.stringify(data.availableFilters) : null,
          defaultSort: data.defaultSort || null,
          defaultSortOrder: data.defaultSortOrder || "asc",
          companyId: data.companyId || null,
          createdBy: data.createdBy || null,
        },
      });

      return NextResponse.json({ success: true, data: template }, 201);
    }

    // Delete report
    if (action === "delete" && data.id) {
      await db.report.delete({ where: { id: data.id } });
      return NextResponse.json({ success: true, message: "Report deleted" });
    }

    return NextResponse.json(
      { success: false, error: "Invalid or missing action parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Reports POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process reports request" },
      { status: 500 }
    );
  }
}
