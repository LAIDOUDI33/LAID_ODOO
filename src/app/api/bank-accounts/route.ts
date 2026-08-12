import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/bank-accounts - List bank accounts with treasury info
export async function GET(request: Request) {
  // SECURITY: Require authentication for banking data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    const whereClause: any = { isActive: true };

    const accounts = await db.bankAccount.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: includeStats ? {
        payments: {
          select: { amount: true, date: true, type: true },
          orderBy: { date: 'desc' },
          take: 50
        },
        cashFlows: {
          orderBy: { date: 'desc' },
          take: 50
        }
      } : undefined
    });

    // Calculate treasury statistics if requested
    let stats = null;
    if (includeStats && accounts.length > 0) {
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      // Get recent incoming/outgoing amounts (simplified)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Count all payments for summary
      const allPayments = await db.payment.findMany({
        where: {
          bankAccountId: { in: accounts.map(a => a.id) },
          date: { gte: thirtyDaysAgo }
        },
        select: { amount: true, type: true }
      });
      
      const incoming = allPayments
        .filter(p => p.type === 'incoming')
        .reduce((sum, p) => sum + p.amount, 0);
        
      const outgoing = allPayments
        .filter(p => p.type === 'outgoing')
        .reduce((sum, p) => sum + p.amount, 0);

      stats = {
        totalBalance,
        totalAccounts: accounts.length,
        recentIncoming: incoming,
        recentOutgoing: outgoing,
        netCashFlow: incoming - outgoing
      };
    }

    return NextResponse.json({ 
      success: true, 
      data: accounts,
      stats
    });
  } catch (error) {
    console.error('Bank Accounts GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

// POST /api/bank-accounts - Create bank account
export async function POST(request: Request) {
  // SECURITY: Require Admin or Accountant role for bank account creation
  const authError = await requireRole(request, ['admin', 'manager', 'accountant']);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    
    if (!body.name || !body.bankName || !body.accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Name, bank name, and account number are required' },
        { status: 400 }
      );
    }

    // Check for duplicate account number
    const existing = await db.bankAccount.findUnique({
      where: { accountNumber: body.accountNumber }
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 409 }
      );
    }

    // Get company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No company found. Please create a company first.' },
        { status: 400 }
      );
    }

    const account = await db.bankAccount.create({
      data: {
        name: body.name,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        rib: body.rib || null,
        currency: body.currency || 'DZD',
        accountType: body.accountType || 'current',
        balance: parseFloat(body.balance) || 0,
        minBalance: parseFloat(body.minBalance) || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
        companyId: company.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: account,
      message: `Bank account ${body.name} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Bank Accounts POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
