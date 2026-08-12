import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require authentication for employee data (HIGHLY SENSITIVE PII)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        company: { select: { id: true, name: true } },
        _count: {
          select: {
            payrolls: true,
            leaves: true,
            subordinates: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Employee GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require HR role for employee modifications
  const authError = await requireRole(request, ['admin', 'manager', 'hr_manager', 'hr_staff']);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if employee exists
    const existingEmployee = await db.employee.findUnique({ where: { id } });
    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    // Basic info
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.firstNameAr !== undefined) updateData.firstNameAr = body.firstNameAr || null;
    if (body.lastNameAr !== undefined) updateData.lastNameAr = body.lastNameAr || null;
    if (body.gender !== undefined) updateData.gender = body.gender;

    // Personal info
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.placeOfBirth !== undefined) updateData.placeOfBirth = body.placeOfBirth || null;
    if (body.nationality !== undefined) updateData.nationality = body.nationality || 'DZ';

    // Identification
    if (body.cin !== undefined) updateData.cin = body.cin || null;
    if (body.cnasNumber !== undefined) updateData.cnasNumber = body.cnasNumber || null;
    if (body.casnosNumber !== undefined) updateData.casnosNumber = body.casnosNumber || null;

    // Contact
    if (body.personalEmail !== undefined) updateData.personalEmail = body.personalEmail || null;
    if (body.workEmail !== undefined) updateData.workEmail = body.workEmail || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.wilayaCode !== undefined) updateData.wilayaCode = body.wilayaCode || null;

    // Professional
    if (body.department !== undefined) updateData.department = body.department || null;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle || null;
    if (body.jobPosition !== undefined) updateData.jobPosition = body.jobPosition || null;
    if (body.managerId !== undefined) updateData.managerId = body.managerId || null;

    // Contract
    if (body.contractType !== undefined) updateData.contractType = body.contractType;
    if (body.contractStartDate !== undefined) {
      updateData.contractStartDate = new Date(body.contractStartDate);
    }
    if (body.contractEndDate !== undefined) {
      updateData.contractEndDate = body.contractEndDate ? new Date(body.contractEndDate) : null;
    }
    if (body.employeeStatus !== undefined) updateData.employeeStatus = body.employeeStatus;
    if (body.hireDate !== undefined) {
      updateData.hireDate = body.hireDate ? new Date(body.hireDate) : null;
    }

    // Salary
    if (body.baseSalary !== undefined) updateData.baseSalary = parseFloat(body.baseSalary) || 0;
    if (body.dailyRate !== undefined) updateData.dailyRate = parseFloat(body.dailyRate) || 0;
    if (body.hourlyRate !== undefined) updateData.hourlyRate = parseFloat(body.hourlyRate) || 0;

    // Bank
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;

    // Status
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const employee = await db.employee.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: employee,
      message: `Employee ${employee.matricule} updated successfully`
    });
  } catch (error) {
    console.error('Employee PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Terminate employee
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: Require Admin or HR Manager for employee termination
  const authError = await requireRole(request, ['admin', 'hr_manager']);
  if (authError) return authError;

  // Get user for audit logging
  const user = await getAuthenticatedUser();

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get optional termination details from query or will use defaults
    const terminationReason = searchParams.get('reason') || 'Not specified';

    // Check if employee exists
    const existingEmployee = await db.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payrolls: true,
            leaves: true,
            subordinates: true
          }
        }
      }
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if already terminated
    if (existingEmployee.employeeStatus === 'terminated') {
      return NextResponse.json(
        { success: false, error: 'Employee is already terminated' },
        { status: 400 }
      );
    }

    // Check for subordinates - warn if employee manages others
    const warnings: string[] = [];
    if (existingEmployee._count.subordinates > 0) {
      warnings.push(`Employee has ${existingEmployee._count.subordinates} subordinate(s). Please reassign them before termination.`);
    }

    // Check for pending payroll or leave requests
    if (existingEmployee._count.payrolls > 0) {
      warnings.push(`Employee has ${existingEmployee._count.payrolls} payroll record(s).`);
    }

    // Terminate employee (soft delete with status change)
    const terminationDate = new Date();
    const employee = await db.employee.update({
      where: { id },
      data: {
        employeeStatus: 'terminated',
        isActive: false,
        contractEndDate: existingEmployee.contractEndDate || terminationDate,
        // Store termination info in a way that's queryable
        terminationDate,
        terminationReason
      }
    });

    return NextResponse.json({
      success: true,
      data: employee,
      message: `Employee ${employee.matricule} terminated successfully`,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Employee DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate employee' },
      { status: 500 }
    );
  }
}
