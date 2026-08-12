import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// GET /api/production - Production Dashboard & KPIs
// ============================================================
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    
    if (type === 'kpis') {
      return await getProductionKPIs();
    }
    
    if (type === 'work-orders') {
      return await getWorkOrders(searchParams);
    }
    
    if (type === 'work-centers') {
      return await getWorkCenters();
    }
    
    if (type === 'boms') {
      return await getBOMs(searchParams);
    }
    
    // Default: Full dashboard
    return await getDashboardData();
    
  } catch (error: any) {
    console.error('Production API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch production data' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/production - Create Work Order
// ============================================================
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for production operations
    const authError = await requireRole(request, ['admin', 'manager', 'production_manager', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const body = await request.json();
    const { action, ...data } = body;
    
    if (action === 'create-work-order') {
      return await createWorkOrder(data);
    }
    
    if (action === 'create-bom') {
      return await createBOM(data);
    }
    
    if (action === 'update-progress') {
      return await updateWorkOrderProgress(data);
    }
    
    if (action === 'change-status') {
      return await changeWorkOrderStatus(data);
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Production POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getProductionKPIs() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get work order statistics
  const [
    totalOrders,
    inProgressOrders,
    completedOrders,
    plannedOrders,
    pausedOrders,
    ordersThisMonth
  ] = await Promise.all([
    db.workOrder.count(),
    db.workOrder.count({ where: { status: 'in_progress' } }),
    db.workOrder.count({ where: { status: 'completed' } }),
    db.workOrder.count({ where: { status: 'planned' } }),
    db.workOrder.count({ where: { status: 'paused' } }),
    db.workOrder.count({
      where: { scheduledStart: { gte: startOfMonth } }
    })
  ]);
  
  // Calculate quantities
  const quantityAggregates = await db.workOrder.aggregate({
    _sum: { quantityPlanned: true, quantityProduced: true, quantityScrapped: true },
    where: { status: { in: ['in_progress', 'completed'] } }
  });
  
  // Quality metrics
  const qualityStats = await db.qualityControl.groupBy({
    by: ['status'],
    _count: true
  });
  
  const passedQC = qualityStats.find(s => s.status === 'passed')?._count || 0;
  const failedQC = qualityStats.find(s => s.status === 'failed')?._count || 0;
  const totalQC = passedQC + failedQC;
  
  // OEE Calculation (simplified)
  const workCenters = await db.workCenter.findMany({
    where: { isActive: true },
    select: { efficiency: true, oeeTarget: true }
  });
  const avgEfficiency = workCenters.length > 0 
    ? workCenters.reduce((sum, wc) => sum + wc.efficiency, 0) / workCenters.length 
    : 0;
  
  // Scrap rate
  const totalProduced = quantityAggregates._sum.quantityProduced || 0;
  const totalScrapped = quantityAggregates._sum.quantityScrapped || 0;
  const scrapRate = totalProduced > 0 ? (totalScrapped / totalProduced) * 100 : 0;
  
  return NextResponse.json({
    success: true,
    data: {
      workOrders: {
        total: totalOrders,
        inProgress: inProgressOrders,
        completed: completedOrders,
        planned: plannedOrders,
        paused: pausedOrders,
        thisMonth: ordersThisMonth
      },
      quantities: {
        planned: Math.round(quantityAggregates._sum.quantityPlanned || 0),
        produced: Math.round(quantityAggregates._sum.quantityProduced || 0),
        scrapped: Math.round(totalScrapped)
      },
      quality: {
        total: totalQC,
        passed: passedQC,
        failed: failedQC,
        passRate: totalQC > 0 ? Math.round((passedQC / totalQC) * 100) : 100
      },
      oee: {
        efficiency: Math.round(avgEfficiency),
        availability: 95, // Simplified
        performance: 92, // Simplified
        quality: Math.round(100 - scrapRate),
        overall: Math.round(avgEfficiency * 0.95 * 0.92 / 100) // Simplified OEE
      },
      scrapRate: Math.round(scrapRate * 100) / 100
    }
  });
}

async function getWorkOrders(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const whereClause: any = {};
  if (status && status !== 'all') {
    whereClause.status = status;
  }
  
  const [orders, total] = await Promise.all([
    db.workOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: { select: { id: true, name: true, code: true } },
        workCenter: { select: { id: true, name: true, type: true } },
        assignedTo: { select: { id: true, name: true } },
        bom: { select: { id: true, code: true, version: true } },
        _count: { select: { lines: true, qualityControls: true } }
      }
    }),
    db.workOrder.count({ where: whereClause })
  ]);
  
  return NextResponse.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

async function getWorkCenters() {
  const workCenters = await db.workCenter.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { workOrders: true }
      }
    },
    orderBy: { code: 'asc' }
  });
  
  // Add current status based on active work orders
  const enrichedWorkCenters = await Promise.all(workCenters.map(async (wc) => {
    const activeOrders = await db.workOrder.count({
      where: { workCenterId: wc.id, status: 'in_progress' }
    });
    return {
      ...wc,
      activeOrders,
      status: activeOrders > 0 ? 'busy' : wc.status
    };
  }));
  
  return NextResponse.json({ success: true, data: enrichedWorkCenters });
}

async function getBOMs(searchParams: URLSearchParams) {
  const productId = searchParams.get('productId');
  
  const whereClause: any = { isActive: true };
  if (productId) {
    whereClause.productId = productId;
  }
  
  const boms = await db.billOfMaterials.findMany({
    where: whereClause,
    include: {
      product: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          component: { select: { id: true, name: true, code: true, unitOfMeasure: true } }
        },
        orderBy: { sequence: 'asc' }
      },
      _count: { select: { lines: true, workOrders: true } }
    },
    orderBy: { version: 'desc' }
  });
  
  return NextResponse.json({ success: true, data: boms });
}

async function getDashboardData() {
  const [kpisRes, recentOrders, workCenters] = await Promise.all([
    getProductionKPIs(),
    db.workOrder.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, code: true } },
        workCenter: { select: { id: true, name: true } }
      }
    }),
    getWorkCenters()
  ]);
  
  const kpis = await kpisRes.json();
  
  return NextResponse.json({
    success: true,
    data: {
      kpis: kpis.data,
      recentOrders: recentOrders.data || recentOrders,
      workCenters: (await workCenters.json()).data
    }
  });
}

async function createWorkOrder(data: any) {
  const {
    productId,
    quantityPlanned,
    priority,
    scheduledStart,
    scheduledEnd,
    workCenterId,
    notes,
    bomId,
    routingId,
    assignedToId,
    createdById
  } = data;
  
  // Validate required fields
  if (!productId || !quantityPlanned) {
    return NextResponse.json(
      { success: false, error: 'Product and quantity are required' },
      { status: 400 }
    );
  }
  
  // Generate reference
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const orderCount = await db.workOrder.count({
    where: { reference: { startsWith: `OF-${year}-${month}` } }
  });
  const sequence = String(orderCount + 1).padStart(4, '0');
  const reference = `OF-${year}-${month}-${sequence}`;
  
  // Get company
  const company = await db.company.findFirst({ where: { isActive: true } });
  if (!company) {
    return NextResponse.json(
      { success: false, error: 'No active company configured' },
      { status: 400 }
    );
  }
  
  // Create work order
  const workOrder = await db.workOrder.create({
    data: {
      reference,
      productId,
      quantityPlanned: parseFloat(quantityPlanned),
      quantityRemaining: parseFloat(quantityPlanned),
      priority: priority || 'normal',
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      workCenterId: workCenterId || null,
      bomId: bomId || null,
      routingId: routingId || null,
      assignedToId: assignedToId || null,
      createdById: createdById || null,
      companyId: company.id,
      notes: notes || '',
      status: 'planned'
    },
    include: {
      product: true,
      workCenter: true,
      assignedTo: { select: { id: true, name: true } }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: workOrder,
    message: `Ordre de fabrication ${reference} créé avec succès`
  }, { status: 201 });
}

async function createBOM(data: any) {
  const { productId, name, description, lines, versionName, outputQuantity } = data;
  
  if (!productId || !lines || lines.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Product and BOM lines are required' },
      { status: 400 }
    );
  }
  
  const company = await db.company.findFirst({ where: { isActive: true } });
  if (!company) {
    return NextResponse.json(
      { success: false, error: 'No active company configured' },
      { status: 400 }
    );
  }
  
  // Check existing BOM versions
  const existingBOMs = await db.billOfMaterials.count({ where: { productId } });
  const version = existingBOMs + 1;
  
  const code = `BOM-${productId.toUpperCase().slice(0, 8)}-v${version}`;
  
  // Create BOM with lines
  const bom = await db.billOfMaterials.create({
    data: {
      code,
      name: name || `Nomenclature v${version}`,
      description,
      productId,
      version,
      versionName: versionName || `v${version}`,
      outputQuantity: outputQuantity || 1,
      companyId: company.id,
      lines: {
        create: lines.map((line: any, index: number) => ({
          componentId: line.componentId,
          quantity: line.quantity || 1,
          unitOfMeasure: line.unitOfMeasure || 'U',
          sequence: index,
          isOptional: line.isOptional || false,
          isPhantom: line.isPhantom || false,
          scrapPercentage: line.scrapPercentage || 0,
          unitCost: line.unitCost || 0,
          totalCost: (line.quantity || 1) * (line.unitCost || 0)
        }))
      }
    },
    include: {
      product: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          component: { select: { id: true, name: true, code: true } }
        }
      }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: bom,
    message: `Nomenclature ${code} créée avec ${lines.length} composants`
  }, { status: 201 });
}

async function updateWorkOrderProgress(data: any) {
  const { id, quantityProduced, quantityScrapped, status } = data;
  
  const workOrder = await db.workOrder.findUnique({ where: { id } });
  if (!workOrder) {
    return NextResponse.json(
      { success: false, error: 'Work order not found' },
      { status: 404 }
    );
  }
  
  const updateData: any = {};
  if (quantityProduced !== undefined) {
    updateData.quantityProduced = quantityProduced;
    updateData.quantityRemaining = workOrder.quantityPlanned - quantityProduced - (quantityScrapped || 0);
  }
  if (quantityScrapped !== undefined) {
    updateData.quantityScrapped = quantityScrapped;
  }
  if (status) {
    updateData.status = status;
    if (status === 'in_progress' && !workOrder.actualStart) {
      updateData.actualStart = new Date();
    }
    if (status === 'completed') {
      updateData.actualEnd = new Date();
    }
  }
  
  const updated = await db.workOrder.update({
    where: { id },
    data: updateData,
    include: {
      product: { select: { id: true, name: true } },
      workCenter: { select: { id: true, name: true } }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Progression mise à jour'
  });
}

async function changeWorkOrderStatus(data: any) {
  const { id, status, notes } = data;
  
  const validTransitions: Record<string, string[]> = {
    draft: ['planned', 'cancelled'],
    planned: ['released', 'cancelled'],
    released: ['in_progress', 'cancelled'],
    in_progress: ['paused', 'completed', 'cancelled'],
    paused: ['in_progress', 'cancelled'],
    completed: [],
    cancelled: []
  };
  
  const workOrder = await db.workOrder.findUnique({ where: { id } });
  if (!workOrder) {
    return NextResponse.json(
      { success: false, error: 'Work order not found' },
      { status: 404 }
    );
  }
  
  const allowedTransitions = validTransitions[workOrder.status] || [];
  if (!allowedTransitions.includes(status)) {
    return NextResponse.json(
      { success: false, error: `Cannot transition from ${workOrder.status} to ${status}` },
      { status: 400 }
    );
  }
  
  const updateData: any = { status };
  if (status === 'in_progress' && !workOrder.actualStart) {
    updateData.actualStart = new Date();
  }
  if (status === 'completed') {
    updateData.actualEnd = new Date();
    updateData.quantityProduced = workOrder.quantityProduced || workOrder.quantityPlanned;
  }
  if (notes) {
    updateData.notes = notes;
  }
  
  const updated = await db.workOrder.update({
    where: { id },
    data: updateData
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: `Statut changé vers ${status}`
  });
}
