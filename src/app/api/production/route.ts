import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// HASSIBA Suite ERP v2.0.0 - Production API
// FIXES: H-20 (Costing Automation), H-21 (Labor Cost), 
//        H-22 (WIP Tracking), H-23 (BOM Explosion)
// M-11 FIX: WorkCenter.hourlyCost now applied in production cost calculations
// ============================================================

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
      { success: false, error: 'Erreur lors de la récupération des données de production', code: 'INTERNAL_ERROR' },
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
      { success: false, error: 'Erreur lors du traitement de la requête', code: 'INTERNAL_ERROR' },
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
    createdById,
    // H-23: Auto-populate from BOM if productId provided
    autoPopulateFromBom
  } = data;
  
  // Validate required fields
  if (!productId || !quantityPlanned) {
    return NextResponse.json(
      { success: false, error: 'Product and quantity are required' },
      { status: 400 }
    );
  }
  
  // Get company
  const company = await db.company.findFirst({ where: { isActive: true } });
  if (!company) {
    return NextResponse.json(
      { success: false, error: 'No active company configured' },
      { status: 400 }
    );
  }
  
  // ============================================================
  // H-23 FIX: BOM EXPLOSION TO WORK ORDER
  // Auto-populate WO lines from BOM when productId is specified
  // ============================================================
  let workOrderLines: any[] = data.lines || [];
  let effectiveBomId = bomId;
  
  if ((autoPopulateFromBom || !workOrderLines || workOrderLines.length === 0) && productId) {
    // Find the active BOM for this product
    const activeBom = await db.billOfMaterials.findFirst({
      where: {
        productId,
        isActive: true
      },
      include: {
        lines: {
          orderBy: { sequence: 'asc' },
          include: {
            component: {
              select: { id: true, name: true, code: true, costPrice: true, unitOfMeasure: true }
            }
          }
        },
        product: { select: { id: true, costPrice: true } }
      },
      orderBy: { version: 'desc' }
    });
    
    if (activeBom) {
      effectiveBomId = activeBom.id;
      
      // Calculate required quantities based on planned quantity and BOM output quantity
      const quantityMultiplier = parseFloat(quantityPlanned) / (activeBom.outputQuantity || 1);
      
      // Explode BOM lines to WO lines
      workOrderLines = activeBom.lines.map(bomLine => ({
        productId: bomLine.componentId,
        productName: bomLine.component?.name || '',
        quantityPlanned: bomLine.quantity * quantityMultiplier,
        unitOfMeasure: bomLine.unitOfMeasure || bomLine.component?.unitOfMeasure || 'U',
        type: 'component', // Consumption line
        unitCost: bomLine.unitCost || bomLine.component?.costPrice || 0,
        totalCost: (bomLine.quantity * quantityMultiplier) * (bomLine.unitCost || bomLine.component?.costPrice || 0),
        sequence: bomLine.sequence,
        isOptional: bomLine.isOptional || false,
        scrapPercentage: bomLine.scrapPercentage || 0
      }));
      
      console.log(`H-23: BOM exploded for WO - ${workOrderLines.length} components from BOM ${activeBom.code}`);
    }
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
  
  // H-20/H-22: Pre-calculate estimated cost from BOM components
  const estimatedMaterialCost = workOrderLines.reduce(
    (sum, line) => sum + (line.totalCost || 0), 0
  );
  
  // M-11 FIX: Get WorkCenter hourly cost for labor cost estimation
  let workCenterHourlyCost = 0;
  let estimatedLaborHours = 0; // Default or from routing
  let estimatedLaborCost = 0;
  
  if (workCenterId) {
    try {
      const workCenter = await db.workCenter.findUnique({
        where: { id: workCenterId },
        select: { id: true, name: true, hourlyCost: true, hourlyRate: true }
      });
      
      if (workCenter) {
        // Use hourlyCost field (primary) or fallback to hourlyRate
        workCenterHourlyCost = workCenter.hourlyCost || workCenter.hourlyRate || 0;
        
        // Estimate labor hours based on quantity and standard cycle time
        // This is a simplified estimation - in production, this would come from routing operations
        estimatedLaborHours = parseFloat(quantityPlanned) * 0.5; // Default: 0.5 hrs per unit
        estimatedLaborCost = estimatedLaborHours * workCenterHourlyCost;
        
        console.log(`[M-11] Using WorkCenter ${workCenter.name} hourly cost: ${workCenterHourlyCost} DZD/hr for WO cost estimation`);
      }
    } catch (e) {
      console.warn('[M-11] Could not fetch WorkCenter for hourly cost, using defaults');
    }
  }
  
  // Create work order with lines
  const workOrderData: any = {
    reference,
    productId,
    quantityPlanned: parseFloat(quantityPlanned),
    quantityRemaining: parseFloat(quantityPlanned),
    priority: priority || 'normal',
    scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
    workCenterId: workCenterId || null,
    bomId: effectiveBomId || null,
    routingId: routingId || null,
    assignedToId: assignedToId || null,
    createdById: createdById || null,
    companyId: company.id,
    notes: notes || '',
    status: 'planned',
    // H-20: Set initial estimated cost (material + labor estimate)
    estimatedCost: estimatedMaterialCost + estimatedLaborCost,
    // M-11 FIX: Store labor cost estimate separately for tracking
    estimatedLaborCost: estimatedLaborCost,
    // H-22: Initial WIP value is 0 (no work started)
    wipValue: 0,
    completionPercentage: 0
  };
  
  // Include lines if we have them from BOM explosion
  if (workOrderLines.length > 0) {
    workOrderData.lines = {
      create: workOrderLines.map((line: any, index: number) => ({
        productId: line.productId,
        productName: line.productName || '',
        quantityPlanned: line.quantityPlanned,
        quantityIssued: 0,
        quantityConsumed: 0,
        unitOfMeasure: line.unitOfMeasure || 'U',
        type: line.type || 'component',
        unitCost: line.unitCost || 0,
        totalCost: line.totalCost || 0,
        sequence: line.sequence ?? index,
        notes: `From BOM explosion${line.isOptional ? ' (optional)' : ''}`
      }))
    };
  }
  
  const workOrder = await db.workOrder.create({
    data: workOrderData,
    include: {
      product: true,
      workCenter: true,
      assignedTo: { select: { id: true, name: true } },
      ...(workOrderLines.length > 0 ? { lines: { include: { product: true } } } : {})
    }
  });
  
  return NextResponse.json({
    success: true,
    data: workOrder,
    message: `Ordre de fabrication ${reference} créé avec succès${workOrderLines.length > 0 ? ` (${workOrderLines.length} composants depuis nomenclature)` : ''}`
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
  const { 
    id, 
    quantityProduced, 
    quantityScrapped, 
    status,
    // H-21 FIX: Labor time and cost capture
    laborTime,       // Hours worked
    laborCost,       // Total labor cost (if known)
    laborRate,       // Hourly rate (to calculate cost if laborTime provided)
    operationsCompleted, // Number of operations completed (for WIP calculation)
    totalOperations      // Total number of operations (for WIP % calculation)
  } = data;
  
  const workOrder = await db.workOrder.findUnique({ 
    where: { id },
    include: { lines: true, product: true }
  });
  
  if (!workOrder) {
    return NextResponse.json(
      { success: false, error: 'Work order not found' },
      { status: 404 }
    );
  }
  
  const updateData: any = {};
  
  // H-21 FIX: Capture labor time and calculate cost
  if (laborTime !== undefined) {
    updateData.laborTime = laborTime;
    // If laborRate provided but no laborCost, calculate it
    if (laborRate && laborCost === undefined) {
      updateData.laborCost = laborTime * laborRate;
    } else if (laborCost !== undefined) {
      updateData.laborCost = laborCost;
    }
  } else if (laborCost !== undefined) {
    updateData.laborCost = laborCost;
  }
  
  // M-11 FIX: Fetch WorkCenter hourly cost for fallback labor cost calculation
  let wcHourlyCost = 0;
  if (workOrder.workCenterId && (!laborCost || laborCost === 0)) {
    try {
      const wc = await db.workCenter.findUnique({
        where: { id: workOrder.workCenterId },
        select: { hourlyCost: true, hourlyRate: true }
      });
      if (wc) {
        wcHourlyCost = wc.hourlyCost || wc.hourlyRate || 0;
      }
    } catch (e) {
      console.warn('[M-11] Could not fetch WorkCenter hourly cost for WO progress update');
    }
  }
  
  if (quantityProduced !== undefined) {
    updateData.quantityProduced = quantityProduced;
    updateData.quantityRemaining = workOrder.quantityPlanned - quantityProduced - (quantityScrapped || workOrder.quantityScrapped || 0);
    
    // H-22 FIX: Calculate completion percentage for WIP valuation
    const completionPct = Math.min(100, (quantityProduced / workOrder.quantityPlanned) * 100);
    updateData.completionPercentage = Math.round(completionPct * 100) / 100;
  }
  
  if (quantityScrapped !== undefined) {
    updateData.quantityScrapped = quantityScrapped;
  }
  
  // H-22 FIX: Track operations completed for WIP calculation
  if (operationsCompleted !== undefined) {
    updateData.operationsCompleted = operationsCompleted;
    // Calculate % based on operations if provided
    if (totalOperations && totalOperations > 0) {
      updateData.completionPercentage = Math.round((operationsCompleted / totalOperations) * 10000) / 100;
    }
  }
  
  if (status) {
    updateData.status = status;
    if (status === 'in_progress' && !workOrder.actualStart) {
      updateData.actualStart = new Date();
    }
    if (status === 'completed') {
      updateData.actualEnd = new Date();
      
      // ============================================================
      // H-20 FIX: PRODUCTION COSTING AUTOMATION ON COMPLETION
      // Calculate actual cost when WO is completed
      // ============================================================
      const finalQuantityProduced = quantityProduced || workOrder.quantityProduced || workOrder.quantityPlanned;
      
      // 1. Material cost from consumed components
      const materialCost = workOrder.lines
        ?.filter(l => l.type === 'consumption' || l.type === 'component')
        ?.reduce((sum, line) => sum + (line.totalCost || (line.quantityConsumed || line.quantityPlanned || 0) * (line.unitCost || 0)), 0) || 0;
      
      // 2. Labor cost (from captured data or estimate using WorkCenter hourlyCost)
      let actualLaborCost = laborCost || workOrder.laborCost || 0;
      
      // M-11 FIX: Fallback to WorkCenter hourlyCost if no labor cost captured
      if (actualLaborCost === 0 && wcHourlyCost > 0) {
        const estimatedHours = laborTime || (finalQuantityProduced * 0.5); // Use actual or estimate
        actualLaborCost = estimatedHours * wcHourlyCost;
        console.log(`[M-11] Using WorkCenter hourly cost (${wcHourlyCost} DZD/hr) as fallback for labor cost calculation`);
      }
      
      // 3. Overhead (simplified: 20% of labor cost)
      const overheadCost = actualLaborCost * 0.20;
      
      // 4. Total actual cost
      const totalActualCost = materialCost + actualLaborCost + overheadCost;
      
      // 5. Unit cost
      const unitCost = finalQuantityProduced > 0 ? totalActualCost / finalQuantityProduced : 0;
      
      updateData.actualCost = totalActualCost;
      updateData.materialCost = materialCost;
      updateData.overheadCost = overheadCost;
      updateData.unitCost = unitCost;
      updateData.quantityProduced = finalQuantityProduced;
      updateData.completionPercentage = 100;
      updateData.wipValue = 0; // WIP becomes finished goods on completion
      
      console.log(`H-20: Cost calculated for WO ${workOrder.reference}: Material=${materialCost}, Labor=${actualLaborCost}, Overhead=${overheadCost}, Total=${totalActualCost}`);
    }
  }
  
  // H-22 FIX: Recalculate WIP value on every progress update
  if (updateData.completionPercentage !== undefined || updateData.quantityProduced !== undefined) {
    const currentCompletion = updateData.completionPercentage || workOrder.completionPercentage || 0;
    const estimatedTotalCost = workOrder.estimatedCost || 0;
    
    // WIP Value = Estimated Cost × Completion %
    // This represents the value of partially-completed work
    updateData.wipValue = Math.round((estimatedTotalCost * currentCompletion / 100) * 100) / 100;
  }
  
  const updated = await db.workOrder.update({
    where: { id },
    data: updateData,
    include: {
      product: { select: { id: true, name: true } },
      workCenter: { select: { id: true, name: true } },
      lines: true
    }
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Progression mise à jour' + (updateData.wipValue !== undefined ? ` (WIP: ${updated.wipValue} DZD)` : '')
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
  
  // Fetch work order with lines for stock operations
  const workOrder = await db.workOrder.findUnique({ 
    where: { id },
    include: {
      lines: true,
      product: true
    }
  });
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
  
  // ============================================================
  // C-13 & C-14: STOCK INTEGRATION WITH TRANSACTION
  // ============================================================
  // Use transaction for atomic stock operations
  const updated = await db.$transaction(async (tx) => {
    // Update work order status first
    const updatedWO = await tx.workOrder.update({
      where: { id },
      data: updateData
    });
    
    // C-13: RESERVE COMPONENTS when WO is released or started
    if ((status === 'released' || status === 'in_progress') && workOrder.warehouseId) {
      const componentLines = workOrder.lines.filter(
        line => line.type === 'consumption' || line.type === 'component'
      );
      
      for (const line of componentLines) {
        if (line.quantityPlanned <= 0) continue;
        
        // Reserve stock: move from available to reserved
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            productId: line.productId,
            warehouseId: workOrder.warehouseId!
          }
        });
        
        if (stockLevel) {
          // Check sufficient available stock
          if (stockLevel.availableQty < line.quantityPlanned) {
            throw new Error(
              `Stock insuffisant pour le composant ${line.productId}. ` +
              `Disponible: ${stockLevel.availableQty}, Requis: ${line.quantityPlanned}`
            );
          }
          
          // Reserve the quantity
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              availableQty: { decrement: line.quantityPlanned },
              reservedQty: { increment: line.quantityPlanned }
            }
          });
          
          // Create reservation movement record
          const reservationRef = `WO-RESERVE-${workOrder.reference}-${Date.now()}`;
          await tx.stockMovement.create({
            data: {
              reference: reservationRef,
              date: new Date(),
              type: 'out_consumption', // Using consumption type for reservation tracking
              quantity: line.quantityPlanned,
              notes: `Réservation composants pour OF ${workOrder.reference}`,
              productId: line.productId,
              warehouseId: workOrder.warehouseId!,
              sourceDoc: 'WORK_ORDER',
              sourceId: workOrder.id,
              stockLevelId: stockLevel.id
            }
          });
        }
      }
    }
    
    // C-14: RECEIVE FINISHED GOODS & CONSUME RESERVED STOCK on completion
    if (status === 'completed' && workOrder.warehouseId) {
      const producedQuantity = workOrder.quantityProduced || workOrder.quantityPlanned;
      
      // 1. Consume reserved components (move from reserved to actual consumption)
      const componentLines = workOrder.lines.filter(
        line => line.type === 'consumption' || line.type === 'component'
      );
      
      for (const line of componentLines) {
        if (line.quantityPlanned <= 0) continue;
        
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            productId: line.productId,
            warehouseId: workOrder.warehouseId!
          }
        });
        
        if (stockLevel && stockLevel.reservedQty >= line.quantityPlanned) {
          // Consume from reserved stock
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              quantity: { decrement: line.quantityPlanned },
              reservedQty: { decrement: line.quantityPlanned }
            }
          });
          
          // Create consumption movement
          const consumptionRef = `WO-CONSUME-${workOrder.reference}-${Date.now()}`;
          await tx.stockMovement.create({
            data: {
              reference: consumptionRef,
              date: new Date(),
              type: 'out_consumption',
              quantity: line.quantityPlanned,
              notes: `Consommation composants pour OF ${workOrder.reference}`,
              productId: line.productId,
              warehouseId: workOrder.warehouseId!,
              sourceDoc: 'WORK_ORDER',
              sourceId: workOrder.id,
              stockLevelId: stockLevel.id
            }
          });
        }
      }
      
      // 2. Receive finished goods into inventory
      const fgStockLevel = await tx.stockLevel.findFirst({
        where: {
          productId: workOrder.productId,
          warehouseId: workOrder.warehouseId!
        }
      });
      
      if (fgStockLevel) {
        // Update existing stock level
        await tx.stockLevel.update({
          where: { id: fgStockLevel.id },
          data: {
            quantity: { increment: producedQuantity },
            availableQty: { increment: producedQuantity }
          }
        });
        
        // Create receipt movement
        const receiptRef = `WO-FG-${workOrder.reference}-${Date.now()}`;
        await tx.stockMovement.create({
          data: {
            reference: receiptRef,
            date: new Date(),
            type: 'in_adjustment', // Production receipt as positive adjustment
            quantity: producedQuantity,
            notes: `Réception produit fini pour OF ${workOrder.reference}`,
            productId: workOrder.productId,
            warehouseId: workOrder.warehouseId!,
            sourceDoc: 'WORK_ORDER',
            sourceId: workOrder.id,
            stockLevelId: fgStockLevel.id
          }
        });
      } else {
        // Create new stock level for finished goods
        const newStockLevel = await tx.stockLevel.create({
          data: {
            productId: workOrder.productId,
            warehouseId: workOrder.warehouseId!,
            quantity: producedQuantity,
            availableQty: producedQuantity,
            reservedQty: 0
          }
        });
        
        // Create receipt movement
        const receiptRef = `WO-FG-${workOrder.reference}-${Date.now()}`;
        await tx.stockMovement.create({
          data: {
            reference: receiptRef,
            date: new Date(),
            type: 'in_adjustment',
            quantity: producedQuantity,
            notes: `Réception produit fini pour OF ${workOrder.reference}`,
            productId: workOrder.productId,
            warehouseId: workOrder.warehouseId!,
            sourceDoc: 'WORK_ORDER',
            sourceId: workOrder.id,
            stockLevelId: newStockLevel.id
          }
        });
      }
    }
    
    return updatedWO;
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: `Statut changé vers ${status}${(status === 'released' || status === 'in_progress') ? ' (composants réservés)' : ''}${status === 'completed' ? ' (produit fini reçu en stock)' : ''}`
  });
}
