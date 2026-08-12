// ============================================================
// HASSIBA Suite ERP v2.0.0 - CRM Pipeline API
// Opportunités & Activités Commerciales
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadStatus, LeadSource, LeadRating, ActivityType } from "@prisma/client";
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/crm - Récupérer opportunités/activités
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // opportunities or activities
    const status = searchParams.get("status") as LeadStatus | null;
    const assignedTo = searchParams.get("assignedTo");
    const stage = searchParams.get("stage");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Stats endpoint
    if (searchParams.get("stats") === "true") {
      const [totalByStatus, totalByStage, totalByRating, totalValue] = await Promise.all([
        db.opportunity.groupBy({
          by: ["status"],
          _count: true,
        }),
        db.opportunity.groupBy({
          by: ["stage"],
          _count: true,
        }),
        db.opportunity.groupBy({
          by: ["rating"],
          _count: true,
        }),
        db.opportunity.aggregate({
          _sum: { expectedRevenue: true },
          where: { status: { notIn: ["lost_lost", "cancelled"] } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          byStatus: totalByStatus,
          byStage: totalByStage,
          byRating: totalByRating,
          totalPipeline: totalValue._sum.expectedRevenue || 0,
        },
      });
    }

    // Get opportunities
    if (!type || type === "opportunities") {
      const where: any = {};
      
      if (status) where.status = status;
      if (assignedTo) where.assignedToId = assignedTo;
      if (stage) where.stage = parseInt(stage);

      const [opportunities, total] = await Promise.all([
        db.opportunity.findMany({
          where,
          include: {
            partner: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            _count: { select: { activities: true } },
          },
          orderBy: [{ expectedCloseDate: "asc" }, { createdAt: "desc" }],
          take: limit,
          skip: offset,
        }),
        db.opportunity.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: opportunities,
        total,
        limit,
        offset,
      });
    }

    // Get activities
    if (type === "activities") {
      const userId = searchParams.get("userId");
      const opportunityId = searchParams.get("opportunityId");
      const activityType = searchParams.get("activityType") as ActivityType | null;

      const where: any = {};
      
      if (userId) where.userId = userId;
      if (opportunityId) where.opportunityId = opportunityId;
      if (activityType) where.type = activityType;

      const activities = await db.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          opportunity: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "desc" },
        take: limit,
        skip: offset,
      });

      return NextResponse.json({
        success: true,
        data: activities,
      });
    }

    return NextResponse.json(
      { success: false, error: "Specify type=opportunities or type=activities" },
      { status: 400 }
    );
  } catch (error) {
    console.error("CRM GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch CRM data" },
      { status: 500 }
    );
  }
}

// POST /api/crm - Créer opportunité ou activité
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for CRM operations
    const authError = await requireRole(request, ['admin', 'manager', 'sales']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json();
    const { action, ...data } = body;

    // Create new opportunity
    if (action === "create_opportunity" || (!action && data.name)) {
      // Generate reference
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 7).replace("-", "");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const reference = `OPP-${dateStr}-${random}`;

      // Calculate weighted value
      const weightedValue = (data.expectedRevenue || 0) * ((data.probability || 10) / 100);

      const opportunity = await db.opportunity.create({
        data: {
          reference,
          name: data.name,
          partnerId: data.partnerId || null,
          contactName: data.contactName || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          status: data.status || LeadStatus.new,
          stage: data.stage || 1,
          source: data.source || LeadSource.other,
          rating: data.rating || LeadRating.cold,
          expectedRevenue: data.expectedRevenue || 0,
          probability: data.probability || 10,
          weightedValue,
          productName: data.productName || null,
          productDescription: data.productDescription || null,
          quantity: data.quantity || 1,
          unitPrice: data.unitPrice || 0,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
          nextAction: data.nextAction || null,
          nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
          notes: data.notes || null,
          assignedToId: data.assignedToId || null,
          companyId: data.companyId,
        },
        include: {
          partner: true,
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      return NextResponse.json({ success: true, data: opportunity }, 201);
    }

    // Create activity
    if (action === "create_activity" || action === "add_activity") {
      const activity = await db.activity.create({
        data: {
          type: data.type || ActivityType.note,
          subject: data.subject,
          description: data.description || null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          durationMinutes: data.durationMinutes || null,
          userId: data.userId,
          opportunityId: data.opportunityId || null,
          partnerId: data.partnerId || null,
          result: data.result || null,
          nextStep: data.nextStep || null,
        },
        });

      // Update opportunity lastActivityAt
      if (activity.opportunityId) {
        await db.opportunity.update({
          where: { id: activity.opportunityId },
          data: { lastActivityAt: new Date() },
        });
      }

      return NextResponse.json({ success: true, data: activity }, 201);
    }

    // Update opportunity status
    if (action === "update_status" && data.id && data.status) {
      const updateData: any = { 
        status: data.status,
        actualCloseDate: ["won_won", "lost_lost"].includes(data.status) ? new Date() : undefined,
      };

      if (data.lostReason) updateData.lostReason = data.lostReason;
      if (data.convertedInvoiceId) updateData.convertedInvoiceId = data.convertedInvoiceId;

      const opportunity = await db.opportunity.update({
        where: { id: data.id },
        data: updateData,
      });

      return NextResponse.json({ success: true, data: opportunity });
    }

    // Move to next stage
    if (action === "next_stage" && data.id) {
      const current = await db.opportunity.findUnique({ where: { id: data.id } });
      if (!current) {
        return NextResponse.json({ success: false, error: "Opportunity not found" }, { status: 404 });
      }

      const nextStage = Math.min(current.stage + 1, 5);
      
      // Auto-update status based on stage
      let status = current.status;
      if (nextStage >= 4 && current.status === LeadStatus.new) {
        status = LeadStatus.negotiation;
      }

      const opportunity = await db.opportunity.update({
        where: { id: data.id },
        data: { stage: nextStage, status, lastActivityAt: new Date() },
      });

      // Create activity for this action
      await db.activity.create({
        data: {
          type: ActivityType.follow_up,
          subject: `Avancement à l'étape ${nextStage}`,
          userId: data.userId || "",
          opportunityId: data.id,
        },
      });

      return NextResponse.json({ success: true, data: opportunity });
    }

    return NextResponse.json(
      { success: false, error: "Invalid or missing action parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("CRM POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process CRM request" },
      { status: 500 }
    );
  }
}
