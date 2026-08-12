import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';
import { seedAuthAndWorkflows } from '@/lib/seed-auth-workflow';
import { seedProductionData } from '@/lib/seed-production';
import { seedMaintenanceData } from '@/lib/seed-maintenance';
import { seedAnalyticsData } from '@/lib/seed-analytics';
import { requireAuth, requireRole } from '@/lib/auth-utils';

// POST /api/seed - Seed the database with demo data
// PROTECTED: Requires admin role + development mode
export async function POST(request: Request) {
  try {
    // SECURITY: Only allow in development or with admin auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Seed endpoint disabled in production' },
        { status: 403 }
      );
    }

    // Require authentication and admin role
    const authError = await requireRole(request, ['admin', 'super_admin']);
    if (authError) return authError;
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'auth' || type === 'workflow') {
      const result = await seedAuthAndWorkflows();
      return NextResponse.json(result);
    }
    
    if (type === 'production') {
      const result = await seedProductionData();
      return NextResponse.json(result);
    }
    
    if (type === 'maintenance') {
      const result = await seedMaintenanceData();
      return NextResponse.json(result);
    }
    
    if (type === 'analytics') {
      const result = await seedAnalyticsData();
      return NextResponse.json(result);
    }
    
    // Default: seed all data
    const [mainResult, authResult, productionResult, maintenanceResult] = await Promise.all([
      seedDatabase(),
      seedAuthAndWorkflows(),
      seedProductionData(),
      seedMaintenanceData()
    ]);
    
    return NextResponse.json({
      success: mainResult.success && authResult.success && productionResult.success && maintenanceResult.success,
      message: 'All data seeded successfully',
      details: { main: mainResult, auth: authResult, production: productionResult, maintenance: maintenanceResult }
    });
  } catch (error) {
    console.error('Seed API Error:', error);
    // Don't expose internal error details
    return NextResponse.json(
      { success: false, error: 'Failed to seed database. Check server logs.' },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check if database has data
export async function GET(request: Request) {
  try {
    // Allow GET without auth for health check purposes
    const { db } = await import('@/lib/db');
    
    const [companyCount, accountCount, productCount, userCount, workflowCount] = await Promise.all([
      db.company.count(),
      db.chartOfAccount.count(),
      db.product.count(),
      db.user.count(),
      db.workflowDefinition.count()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        companies: companyCount,
        accounts: accountCount,
        products: productCount,
        users: userCount,
        workflows: workflowCount,
        isSeeded: companyCount > 0 && accountCount > 0
      },
      message: companyCount > 0 ? 'Database is seeded' : 'Database needs seeding'
    });
  } catch (error) {
    console.error('Seed GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}
