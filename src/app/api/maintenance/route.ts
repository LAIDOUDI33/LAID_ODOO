import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// GET /api/maintenance - Maintenance Dashboard & Data
// ============================================================
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    
    if (type === 'kpis') {
      return await getMaintenanceKPIs();
    }
    
    if (type === 'equipment') {
      return await getEquipment(searchParams);
    }
    
    if (type === 'orders') {
      return await getMaintenanceOrders(searchParams);
    }
    
    if (type === 'plans') {
      return await getMaintenancePlans();
    }
    
    if (type === 'spare-parts') {
      return await getSpareParts();
    }
    
    if (type === 'oee') {
      return await getOEERecords(searchParams);
    }
    
    // Default: Full dashboard
    return await getDashboardData();
    
  } catch (error: any) {
    console.error('Maintenance API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch maintenance data' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/maintenance - Create/Update Records
// ============================================================
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for maintenance operations
    const authError = await requireRole(request, ['admin', 'manager', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const body = await request.json();
    const { action, ...data } = body;
    
    if (action === 'create-equipment') {
      return await createEquipment(data);
    }
    
    if (action === 'create-order') {
      return await createMaintenanceOrder(data);
    }
    
    if (action === 'complete-order') {
      return await completeMaintenanceOrder(data);
    }
    
    if (action === 'create-plan') {
      return await createMaintenancePlan(data);
    }
    
    if (action === 'record-oee') {
      return await recordOEE(data);
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Maintenance POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getMaintenanceKPIs() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  
  // Equipment stats
  const [totalEquipment, operationalEquipment, brokenEquipment, underMaintenance] = await Promise.all([
    db.equipment.count(),
    db.equipment.count({ where: { status: { in: ['operational', 'in_operation'] } } }),
    db.equipment.count({ where: { status: 'broken' } }),
    db.equipment.count({ where: { status: 'under_maintenance' } })
  ]);
  
  // Orders stats
  const [totalOrders, openOrders, inProgressOrders, completedThisMonth, emergencyOrders] = await Promise.all([
    db.maintenanceOrder.count(),
    db.maintenanceOrder.count({ where: { status: { in: ['draft', 'planned', 'released', 'ready'] } } }),
    db.maintenanceOrder.count({ where: { status: 'in_progress' } }),
    db.maintenanceOrder.count({ 
      where: { 
        status: 'completed',
        actualEnd: { gte: startOfMonth }
      }
    }),
    db.maintenanceOrder.count({ where: { priority: { in: ['emergency', 'critical'] }, status: { notIn: ['completed', 'cancelled'] } } })
  ]);
  
  // Costs this month
  const costAggregates = await db.maintenanceOrder.aggregate({
    where: { actualEnd: { gte: startOfMonth } },
    _sum: { totalCost: true, laborCost: true, partsCost: true }
  });
  
  // MTTR and MTBF calculations (simplified)
  const completedOrders = await db.maintenanceOrder.findMany({
    where: { status: 'completed', type: 'corrective' },
    take: 50,
    orderBy: { actualEnd: 'desc' },
    select: { downtimeHours: true, actualStart: true, actualEnd: true }
  });
  
  const totalDowntime = completedOrders.reduce((sum, o) => sum + (o.downtimeHours || 0), 0);
  const avgMTTR = completedOrders.length > 0 ? totalDowntime / completedOrders.length : 0; // Mean Time To Repair
  
  // Overdue plans
  const overduePlans = await db.maintenancePlan.count({
    where: {
      isActive: true,
      nextDueAt: { lt: now }
    }
  });
  
  // Spare parts alerts
  const criticalStock = await db.sparePart.count({
    where: {
      isCritical: true,
      availableStock: { lte: 0 }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: {
      equipment: {
        total: totalEquipment,
        operational: operationalEquipment,
        broken: brokenEquipment,
        underMaintenance: underMaintenance,
        availabilityRate: totalEquipment > 0 ? Math.round((operationalEquipment / totalEquipment) * 100) : 100
      },
      orders: {
        total: totalOrders,
        open: openOrders,
        inProgress: inProgressOrders,
        completedThisMonth,
        emergency: emergencyOrders
      },
      costs: {
        thisMonthTotal: Math.round((costAggregates._sum.totalCost || 0)),
        thisMonthLabor: Math.round((costAggregates._sum.laborCost || 0)),
        thisMonthParts: Math.round((costAggregates._sum.partsCost || 0))
      },
      metrics: {
        mttr: Math.round(avgMTTR * 10) / 10, // Mean Time To Repair (hours)
        mtbf: 168, // Simplified: Mean Time Between Failures (hours)
        plannedCompletion: openOrders > 0 ? Math.round((completedThisMonth / (completedThisMonth + openOrders)) * 100) : 100
      },
      alerts: {
        overduePlans,
        criticalStockShortage: criticalStock,
        brokenEquipment
      }
    }
  });
}

async function getEquipment(searchParams: URLSearchParams) {
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const whereClause: any = {};
  if (category && category !== 'all') {
    whereClause.category = category;
  }
  if (status && status !== 'all') {
    whereClause.status = status;
  }
  
  const [equipment, total] = await Promise.all([
    db.equipment.findMany({
      where: whereClause,
      orderBy: { code: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        workCenter: { select: { id: true, name: true } },
        _count: { select: { maintenanceOrders: true, oeeLogs: true } }
      }
    }),
    db.equipment.count({ where: whereClause })
  ]);
  
  return NextResponse.json({
    success: true,
    data: equipment,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

async function getMaintenanceOrders(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const equipmentId = searchParams.get('equipmentId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const whereClause: any = {};
  if (status && status !== 'all') {
    whereClause.status = status;
  }
  if (equipmentId) {
    whereClause.equipmentId = equipmentId;
  }
  
  const [orders, total] = await Promise.all([
    db.maintenanceOrder.findMany({
      where: whereClause,
      orderBy: [{ priority: 'desc' }, { requestedDate: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        equipment: { select: { id: true, name: true, code: true, category: true } },
        assignedTo: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, frequency: true } },
        createdBy: { select: { id: true, name: true } }
      }
    }),
    db.maintenanceOrder.count({ where: whereClause })
  ]);
  
  return NextResponse.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

async function getMaintenancePlans() {
  const plans = await db.maintenancePlan.findMany({
    where: { isActive: true },
    include: {
      equipment: { select: { id: true, name: true, code: true, status: true } },
      _count: { select: { orders: true } }
    },
    orderBy: { nextDueAt: 'asc' },
    take: 50
  });
  
  // Check which are overdue
  const now = new Date();
  const enrichedPlans = plans.map(plan => ({
    ...plan,
    isOverdue: plan.nextDueAt && new Date(plan.nextDueAt) < now,
    daysUntilDue: plan.nextDueAt ? Math.ceil((new Date(plan.nextDueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
  }));
  
  return NextResponse.json({ success: true, data: enrichedPlans });
}

async function getSpareParts() {
  const spareParts = await db.sparePart.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { assignments: true } }
    },
    orderBy: { code: 'asc' }
  });
  
  // Calculate availability and check stock alerts
  const enrichedParts = spareParts.map(part => ({
    ...part,
    availableStock: part.currentStock - part.reservedStock,
    isLowStock: part.currentStock <= part.minStock,
    isOutOfStock: part.currentStock <= 0,
    needsReorder: part.currentStock <= part.reorderPoint
  }));
  
  return NextResponse.json({ success: true, data: enrichedParts });
}

async function getOEERecords(searchParams: URLSearchParams) {
  const equipmentId = searchParams.get('equipmentId');
  const days = parseInt(searchParams.get('days') || '30');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const whereClause: any = { recordDate: { gte: startDate } };
  if (equipmentId) {
    whereClause.equipmentId = equipmentId;
  }
  
  const records = await db.oEERecord.findMany({
    where: whereClause,
    include: {
      equipment: { select: { id: true, name: true, code: true } }
    },
    orderBy: { recordDate: 'desc' },
    take: 100
  });
  
  // Calculate averages
  const avgOEE = records.length > 0 
    ? records.reduce((sum, r) => sum + (r.oee || 0), 0) / records.length 
    : 0;
  
  return NextResponse.json({
    success: true,
    data: records,
    summary: {
      totalRecords: records.length,
      averageOEE: Math.round(avgOEE * 10) / 10,
      dateRange: `${days} days`
    }
  });
}

async function getDashboardData() {
  const [kpisRes, recentOrders, equipmentList, overduePlans, lowStockParts] = await Promise.all([
    getMaintenanceKPIs(),
    db.maintenanceOrder.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    }),
    db.equipment.findMany({
      take: 10,
      orderBy: { code: 'asc' },
      include: { workCenter: { select: { id: true, name: true } } }
    }),
    getMaintenancePlans(),
    getSpareParts()
  ]);
  
  const kpis = await kpisRes.json();
  const plans = await overduePlans.json();
  const parts = await lowStockParts.json();
  
  return NextResponse.json({
    success: true,
    data: {
      kpis: kpis.data,
      recentOrders,
      equipment: equipmentList,
      overduePlans: plans.data.filter((p: any) => p.isOverdue),
      lowStockParts: parts.data.filter((p: any) => p.isLowStock || p.isOutOfStock)
    }
  });
}

// ============================================================
// CREATE FUNCTIONS
// ============================================================

async function createEquipment(data: any) {
  const { code, name, category, manufacturer, model, serialNumber, location, workCenterId, purchasePrice, createdById } = data;
  
  if (!code || !name) {
    return NextResponse.json(
      { success: false, error: 'Code and name are required' },
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
  
  // Check if code exists
  const existing = await db.equipment.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Equipment code already exists' },
      { status: 409 }
    );
  }
  
  const equipment = await db.equipment.create({
    data: {
      code,
      name,
      category: category || 'production',
      manufacturer,
      model,
      serialNumber,
      location,
      workCenterId,
      purchasePrice: purchasePrice || 0,
      companyId: company.id,
      createdById: createdById || null
    }
  });
  
  return NextResponse.json({
    success: true,
    data: equipment,
    message: `Équipement ${code} créé avec succès`
  }, { status: 201 });
}

async function createMaintenanceOrder(data: any) {
  const { equipmentId, type, title, description, priority, scheduledStart, estimatedDuration, assignedToId, createdById } = data;
  
  if (!equipmentId || !title) {
    return NextResponse.json(
      { success: false, error: 'Equipment and title are required' },
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
  
  // Generate reference
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const orderCount = await db.maintenanceOrder.count({
    where: { reference: { startsWith: `OM-${year}-${month}` } }
  });
  const sequence = String(orderCount + 1).padStart(4, '0');
  const reference = `OM-${year}-${month}-${sequence}`;
  
  const order = await db.maintenanceOrder.create({
    data: {
      reference,
      type: type || 'corrective',
      priority: priority || 'normal',
      status: 'draft',
      title,
      description,
      equipmentId,
      requestedDate: new Date(),
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      estimatedDuration: estimatedDuration || 60,
      assignedToId: assignedToId || null,
      companyId: company.id,
      createdById: createdById || null
    },
    include: {
      equipment: { select: { id: true, name: true, code: true } },
      assignedTo: { select: { id: true, name: true } }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: order,
    message: `Ordre de maintenance ${reference} créé avec succès`
  }, { status: 201 });
}

async function completeMaintenanceOrder(data: any) {
  const { id, workPerformed, rootCause, correctiveAction, recommendations, laborCost, partsCost, validatedBy } = data;
  
  const order = await db.maintenanceOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Maintenance order not found' },
      { status: 404 }
    );
  }
  
  const totalCost = (laborCost || 0) + (partsCost || 0) + (order.externalCost || 0);
  
  const updated = await db.maintenanceOrder.update({
    where: { id },
    data: {
      status: 'completed',
      actualEnd: new Date(),
      workPerformed,
      rootCause,
      correctiveAction,
      recommendations,
      laborCost: laborCost || 0,
      partsCost: partsCost || 0,
      totalCost,
      validatedBy: validatedBy || null,
      validatedAt: new Date()
    },
    include: {
      equipment: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } }
    }
  });
  
  // Update equipment last maintenance date
  await db.equipment.update({
    where: { id: order.equipmentId },
    data: { lastMaintenanceAt: new Date(), status: 'operational' }
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: `Ordre ${order.reference} terminé avec succès`
  });
}

async function createMaintenancePlan(data: any) {
  const { equipmentId, name, type, frequency, intervalValue, durationEstimated, tasks, createdById } = data;
  
  if (!equipmentId || !name) {
    return NextResponse.json(
      { success: false, error: 'Equipment and name are required' },
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
  
  // Generate code
  const equip = await db.equipment.findUnique({ where: { id: equipmentId } });
  const existingPlans = await db.maintenancePlan.count({ where: { equipmentId } });
  const code = `PM-${equip?.code || 'EQP'}-${existingPlans + 1}`;
  
  // Calculate next due date based on frequency
  const nextDueAt = calculateNextDueDate(frequency || 'monthly', intervalValue);
  
  const plan = await db.maintenancePlan.create({
    data: {
      code,
      name,
      description: tasks ? JSON.stringify(tasks) : undefined,
      equipmentId,
      type: type || 'preventive',
      frequency: frequency || 'monthly',
      intervalValue,
      durationEstimated,
      nextDueAt,
      isActive: true,
      companyId: company.id
    },
    include: {
      equipment: { select: { id: true, name: true, code: true } }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: plan,
    message: `Plan de maintenance ${code} créé avec succès`
  }, { status: 201 });
}

function calculateNextDueDate(frequency: string, intervalValue?: number): Date {
  const now = new Date();
  const interval = intervalValue || 1;
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + (7 * interval));
      break;
    case 'biweekly':
      now.setDate(now.getDate() + (14 * interval));
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + interval);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + (3 * interval));
      break;
    case 'semi_annually':
      now.setMonth(now.getMonth() + (6 * interval));
      break;
    case 'annually':
      now.setFullYear(now.getFullYear() + interval);
      break;
    default:
      now.setMonth(now.getMonth() + 1);
  }
  
  return now;
}

async function recordOEE(data: any) {
  const { equipmentId, shift, plannedTime, operatingTime, idleTime, downtime, setupTime, totalProduced, goodQuantity, defectiveQty, idealCycleTime, notes, operatorName, createdById } = data;
  
  if (!equipmentId) {
    return NextResponse.json(
      { success: false, error: 'Equipment ID is required' },
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
  
  const now = new Date();
  const periodEnd = new Date();
  
  // Calculate OEE metrics
  const avail = plannedTime > 0 ? (operatingTime / plannedTime) * 100 : 0;
  const perf = (idealCycleTime || 1) > 0 && operatingTime > 0 
    ? ((idealCycleTime * (totalProduced || 0)) / (operatingTime * 60)) * 100 
    : 0;
  const qual = (totalProduced || 0) > 0 ? ((goodQuantity || 0) / totalProduced) * 100 : 0;
  const oee = (avail * perf * qual) / 10000; // OEE as percentage
  
  const record = await db.oEERecord.create({
    data: {
      recordDate: now,
      shift: shift || 'Matin',
      periodStart: now,
      periodEnd,
      equipmentId,
      plannedTime: plannedTime || 480,
      operatingTime: operatingTime || 0,
      idleTime: idleTime || 0,
      downtime: downtime || 0,
      setupTime: setupTime || 0,
      totalProduced: totalProduced || 0,
      goodQuantity: goodQuantity || 0,
      defectiveQty: defectiveQty || 0,
      idealCycleTime: idealCycleTime || 1,
      availability: Math.min(avail, 100),
      performance: Math.min(perf, 150),
      quality: Math.min(qual, 100),
      oee: Math.min(oee, 100),
      notes,
      operatorName,
      companyId: company.id,
      createdById: createdById || null
    },
    include: {
      equipment: { select: { id: true, name: true, code: true } }
    }
  });
  
  // Update equipment operating hours
  if (operatingTime) {
    await db.equipment.update({
      where: { id: equipmentId },
      data: { operatingHours: { increment: operatingTime / 60 } }
    });
  }
  
  return NextResponse.json({
    success: true,
    data: record,
    message: 'Enregistrement OEE créé avec succès'
  }, { status: 201 });
}
