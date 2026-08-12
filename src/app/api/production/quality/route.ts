import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// ============================================================
// GET /api/production/quality - Quality Control
// ============================================================
export async function GET(request: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'list';
    const workOrderId = searchParams.get('workOrderId');
    
    if (type === 'stats') {
      return await getQualityStats();
    }
    
    if (type === 'detail' && workOrderId) {
      return await getQualityByWorkOrder(workOrderId);
    }
    
    // Default: List quality controls
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    
    const whereClause: any = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (workOrderId) {
      whereClause.workOrderId = workOrderId;
    }
    
    const [controls, total] = await Promise.all([
      db.qualityControl.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, name: true, code: true } },
          workOrder: { select: { id: true, reference: true } },
          createdBy: { select: { id: true, name: true } },
          points: true
        }
      }),
      db.qualityControl.count({ where: whereClause })
    ]);
    
    return NextResponse.json({
      success: true,
      data: controls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
    
  } catch (error: any) {
    console.error('Quality Control API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch quality data' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/production/quality - Create/Update QC
// ============================================================
export async function POST(request: Request) {
  try {
    // SECURITY: Require appropriate role for quality control operations
    const authError = await requireRole(request, ['admin', 'manager', 'production_manager', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const body = await request.json();
    const { action, ...data } = body;
    
    if (action === 'create') {
      return await createQualityControl(data);
    }
    
    if (action === 'complete') {
      return await completeQualityControl(data);
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Quality Control POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getQualityStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Overall stats
  const [total, passed, failed, pending, conditional] = await Promise.all([
    db.qualityControl.count(),
    db.qualityControl.count({ where: { status: 'passed' } }),
    db.qualityControl.count({ where: { status: 'failed' } }),
    db.qualityControl.count({ where: { status: 'pending' } }),
    db.qualityControl.count({ where: { status: 'conditional' } })
  ]);
  
  // This month stats
  const thisMonthTotal = await db.qualityControl.count({
    where: { createdAt: { gte: startOfMonth } }
  });
  
  const thisMonthPassed = await db.qualityControl.count({
    where: { 
      createdAt: { gte: startOfMonth },
      status: 'passed'
    }
  });
  
  // By type
  const byType = await db.qualityControl.groupBy({
    by: ['type'],
    _count: true
  });
  
  // Recent failures for attention
  const recentFailures = await db.qualityControl.findMany({
    where: { status: 'failed' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { name: true } },
      workOrder: { select: { reference: true } }
    }
  });
  
  return NextResponse.json({
    success: true,
    data: {
      overall: {
        total,
        passed,
        failed,
        pending,
        conditional,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 100
      },
      thisMonth: {
        total: thisMonthTotal,
        passed: thisMonthPassed,
        passRate: thisMonthTotal > 0 ? Math.round((thisMonthPassed / thisMonthTotal) * 100) : 100
      },
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      recentFailures
    }
  });
}

async function getQualityByWorkOrder(workOrderId: string) {
  const controls = await db.qualityControl.findMany({
    where: { workOrderId },
    include: {
      product: { select: { id: true, name: true, code: true } },
      points: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Summary
  const total = controls.length;
  const passed = controls.filter(c => c.status === 'passed').length;
  const failed = controls.filter(c => c.status === 'failed').length;
  
  return NextResponse.json({
    success: true,
    data: {
      controls,
      summary: { total, passed, failed, passRate: total > 0 ? Math.round((passed / total) * 100) : 100 }
    }
  });
}

async function createQualityControl(data: any) {
  const {
    productId,
    type,
    workOrderId,
    quantityChecked,
    lotNumber,
    serialNumber,
    points,
    createdById
  } = data;
  
  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'Product is required' },
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
  
  const qcCount = await db.qualityControl.count({
    where: { reference: { startsWith: `QC-${year}-${month}` } }
  });
  const sequence = String(qcCount + 1).padStart(4, '0');
  const reference = `QC-${year}-${month}-${sequence}`;
  
  // Create quality control with points
  const qc = await db.qualityControl.create({
    data: {
      reference,
      type: type || 'in_process',
      productId,
      workOrderId: workOrderId || null,
      quantityChecked: quantityChecked || 1,
      quantityPassed: 0,
      quantityFailed: 0,
      lotNumber: lotNumber || null,
      serialNumber: serialNumber || null,
      status: 'pending',
      companyId: company.id,
      createdById: createdById || null,
      points: points ? {
        create: points.map((point: any, index: number) => ({
          specification: point.specification,
          specificationAr: point.specificationAr,
          type: point.type || 'numeric',
          targetValue: point.targetValue,
          minValue: point.minValue,
          maxValue: point.maxValue,
          unit: point.unit,
          sequence: index
        }))
      } : undefined
    },
    include: {
      product: { select: { id: true, name: true, code: true } },
      workOrder: { select: { id: true, reference: true } },
      points: true
    }
  });
  
  return NextResponse.json({
    success: true,
    data: qc,
    message: `Contrôle qualité ${reference} créé`
  }, { status: 201 });
}

async function completeQualityControl(data: any) {
  const { id, decision, notes, points: pointsResults, decidedBy } = data;
  
  const qc = await db.qualityControl.findUnique({
    where: { id },
    include: { points: true }
  });
  
  if (!qc) {
    return NextResponse.json(
      { success: false, error: 'Quality control not found' },
      { status: 404 }
    );
  }
  
  // Update points results
  if (pointsResults && pointsResults.length > 0) {
    for (const pointResult of pointsResults) {
      await db.qCPoint.update({
        where: { id: pointResult.id },
        data: {
          actualValue: pointResult.actualValue,
          textResult: pointResult.textResult,
          isPassed: pointResult.isPassed,
          notes: pointResult.notes
        }
      });
    }
  }
  
  // Determine overall status based on points
  let finalStatus: string = decision || 'passed';
  if (!decision) {
    const updatedPoints = await db.qCPoint.findMany({ where: { qualityControlId: id } });
    const allPassed = updatedPoints.every(p => p.isPassed === true);
    const anyFailed = updatedPoints.some(p => p.isPassed === false);
    finalStatus = allPassed ? 'passed' : (anyFailed ? 'failed' : 'conditional');
  }
  
  // Calculate quantities
  const passedCount = qc.quantityChecked; // Simplified
  const failedCount = finalStatus === 'failed' ? qc.quantityChecked : 0;
  
  // Update the QC record
  const updated = await db.qualityControl.update({
    where: { id },
    data: {
      status: finalStatus,
      quantityPassed: passedCount,
      quantityFailed: failedCount,
      decision: finalStatus === 'passed' ? 'accept' : (finalStatus === 'failed' ? 'reject' : 'use_as_is'),
      decidedBy: decidedBy || null,
      decidedAt: new Date(),
      resultNotes: notes
    },
    include: {
      product: true,
      points: true
    }
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: `Contrôle qualité terminé: ${finalStatus}`
  });
}
