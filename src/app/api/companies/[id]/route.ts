import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/companies/[id] - Get single company
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const company = await db.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            partners: true,
            products: true,
            invoices: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error('Company GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update company
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if company exists
    const existingCompany = await db.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Validate NIF format if provided
    if (body.nif && !/^\d{15}$/.test(body.nif)) {
      return NextResponse.json(
        { success: false, error: 'NIF must be 15 digits' },
        { status: 400 }
      );
    }

    // Validate NIS format if provided
    if (body.nis && !/^\d{10}$/.test(body.nis)) {
      return NextResponse.json(
        { success: false, error: 'NIS must be 10 digits' },
        { status: 400 }
      );
    }

    // Check for unique NIF if changing
    if (body.nif && body.nif !== existingCompany.nif) {
      const existingNif = await db.company.findFirst({
        where: { nif: body.nif, NOT: { id } }
      });
      if (existingNif) {
        return NextResponse.json(
          { success: false, error: 'A company with this NIF already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    // Basic info
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr || null;
    if (body.commercialName !== undefined) updateData.commercialName = body.commercialName || null;
    if (body.legalForm !== undefined) updateData.legalForm = body.legalForm;
    if (body.capital !== undefined) updateData.capital = parseFloat(body.capital) || 0;
    if (body.currency !== undefined) updateData.currency = body.currency || 'DZD';

    // Algerian Identifiers
    if (body.rc !== undefined) updateData.rc = body.rc || null;
    if (body.nif !== undefined) updateData.nif = body.nif || null;
    if (body.nis !== undefined) updateData.nis = body.nis || null;
    if (body.ai !== undefined) updateData.ai = body.ai || null;
    if (body.taxRegime !== undefined) updateData.taxRegime = body.taxRegime;

    // Contact
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.addressAr !== undefined) updateData.addressAr = body.addressAr || null;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode || null;
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.wilayaCode !== undefined) updateData.wilayaCode = body.wilayaCode || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.fax !== undefined) updateData.fax = body.fax || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.website !== undefined) updateData.website = body.website || null;

    // Configuration
    if (body.fiscalYearStart !== undefined) updateData.fiscalYearStart = parseInt(body.fiscalYearStart) || 1;
    if (body.language !== undefined) updateData.language = body.language || 'fr';

    // Status (activate/deactivate handled through DELETE)
    if (body.isActive !== undefined && existingCompany.isActive !== body.isActive) {
      updateData.isActive = body.isActive;
    }

    const company = await db.company.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: company,
      message: 'Company updated successfully'
    });
  } catch (error) {
    console.error('Company PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Deactivate company
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            partners: true,
            products: true,
            invoices: true
          }
        }
      }
    });

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if already inactive
    if (!existingCompany.isActive) {
      return NextResponse.json(
        { success: false, error: 'Company is already deactivated' },
        { status: 400 }
      );
    }

    // Count total active companies
    const activeCompaniesCount = await db.company.count({
      where: { isActive: true }
    });

    // Prevent deactivation if this is the only active company
    if (activeCompaniesCount <= 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot deactivate the only active company. Please create another company first.' 
        },
        { status: 400 }
      );
    }

    // Gather dependency information for warning
    const dependencies: string[] = [];
    if (existingCompany._count.employees > 0) {
      dependencies.push(`${existingCompany._count.employees} employee(s)`);
    }
    if (existingCompany._count.partners > 0) {
      dependencies.push(`${existingCompany._count.partners} partner(s)`);
    }
    if (existingCompany._count.products > 0) {
      dependencies.push(`${existingCompany._count.products} product(s)`);
    }
    if (existingCompany._count.invoices > 0) {
      dependencies.push(`${existingCompany._count.invoices} invoice(s)`);
    }

    // Deactivate company (soft delete)
    const company = await db.company.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      data: company,
      message: dependencies.length > 0
        ? `Company deactivated. Warning: Company has ${dependencies.join(', ')}. These records will remain but won't be associated with an active company.`
        : 'Company deactivated successfully'
    });
  } catch (error) {
    console.error('Company DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate company' },
      { status: 500 }
    );
  }
}
