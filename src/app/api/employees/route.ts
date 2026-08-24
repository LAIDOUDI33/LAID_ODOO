import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';

// Sensitive PII fields that should only be accessible to authorized roles
const SENSITIVE_PII_FIELDS = [
  'cin',
  'nif', 
  'nir',
  'cnasNumber',
  'casnosNumber',
  'address',
  'city',
  'wilayaCode',
  'phone',
  'personalEmail',
  'workEmail',
  'bankName',
  'bankAccount',
  'dateOfBirth',
  'placeOfBirth'
];

// Roles that can view full employee PII
const AUTHORIZED_PII_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR];

// GET /api/employees - List employees
export async function GET(request: Request) {
  // SECURITY FIX C-07: IDOR Vulnerability - Employee PII Exposure Protection
  // CVSS 9.1 - CRITICAL: Any user could previously access sensitive PII (CIN, SSN, addresses, phones)
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  // Get user for role-based field filtering
  const user = await getAuthenticatedUser();
  const userRole = user?.role || ROLES.USER;
  const canViewFullPII = AUTHORIZED_PII_ROLES.includes(userRole);
  
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const contractType = searchParams.get('contractType');
    const search = searchParams.get('search');

    const whereClause: any = {};
    
    if (department) {
      whereClause.department = department;
    }

    if (status && status !== 'all') {
      whereClause.employeeStatus = status;
    }

    if (contractType) {
      whereClause.contractType = contractType;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { matricule: { contains: search } }
      ];
    }

    const employees = await db.employee.findMany({
      where: whereClause,
      orderBy: { firstName: 'asc' },
      include: {
        manager: { select: { firstName: true, lastName: true, matricule: true } },
        _count: {
          select: {
            payrolls: true,
            leaves: true
          }
        }
      }
    });

    // SECURITY FIX C-07: Filter sensitive PII fields based on user role
    // Non-authorized users (sales, regular users) cannot see sensitive personal data
    let sanitizedEmployees = employees;
    if (!canViewFullPII) {
      sanitizedEmployees = employees.map((emp: Record<string, any>) => {
        const sanitized = { ...emp };
        // Remove all sensitive PII fields for unauthorized users
        SENSITIVE_PII_FIELDS.forEach((field) => {
          if (field in sanitized) {
            delete sanitized[field];
          }
        });
        return sanitized;
      });
    }

    return NextResponse.json({ success: true, data: sanitizedEmployees });
  } catch (error) {
    console.error('Employees GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create employee
export async function POST(request: Request) {
  // SECURITY: Require HR or Admin role to create employees
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body = await request.json();
    
    if (!body.firstName || !body.lastName || !body.contractStartDate) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and contract start date are required' },
        { status: 400 }
      );
    }

    // Generate matricule if not provided
    let matricule = body.matricule;
    if (!matricule) {
      const count = await db.employee.count();
      matricule = `EMP-${String(count + 1).padStart(4, '0')}`;
    }

    // Get default company from user context (M-03 FIX)
    // Previously used findFirst which could return wrong company in multi-tenant setup
    let companyId = user?.companyId;
    
    if (!companyId) {
      // Fallback for super admins or users without company context
      const defaultCompany = await db.company.findFirst({ where: { isActive: true } });
      companyId = defaultCompany?.id;
    }
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'No company found' },
        { status: 400 }
      );
    }

    const employee = await db.employee.create({
      data: {
        matricule,
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameAr: body.firstNameAr || null,
        lastNameAr: body.lastNameAr || null,
        gender: body.gender || 'M',
        
        // Personal info
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        placeOfBirth: body.placeOfBirth || null,
        nationality: body.nationality || 'DZ',
        
        // Identification
        cin: body.cin || null,
        cnasNumber: body.cnasNumber || null,
        casnosNumber: body.casnosNumber || null,
        
        // Contact
        personalEmail: body.personalEmail || null,
        workEmail: body.workEmail || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        wilayaCode: body.wilayaCode || null,
        
        // Professional
        department: body.department || null,
        jobTitle: body.jobTitle || null,
        jobPosition: body.jobPosition || null,
        managerId: body.managerId || null,
        
        // Contract
        contractType: body.contractType || 'cdi',
        contractStartDate: new Date(body.contractStartDate),
        contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : null,
        employeeStatus: body.employeeStatus || 'active',
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        
        // Salary
        baseSalary: parseFloat(body.baseSalary) || 0,
        dailyRate: parseFloat(body.dailyRate) || 0,
        hourlyRate: parseFloat(body.hourlyRate) || 0,
        
        // Bank
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        
        isActive: body.isActive !== undefined ? body.isActive : true,
        
        companyId: companyId
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: employee,
      message: `Employee ${matricule} created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Employees POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
