import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

// POST /api/seed - Seed the database with demo data
export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Seed API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check if database has data
export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    
    const [companyCount, accountCount, productCount] = await Promise.all([
      db.company.count(),
      db.chartOfAccount.count(),
      db.product.count()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        companies: companyCount,
        accounts: accountCount,
        products: productCount,
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
