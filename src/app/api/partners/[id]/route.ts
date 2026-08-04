import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/partners/[id] - Get single partner
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        _count: {
          select: {
            invoicesAsCustomer: true,
            invoicesAsSupplier: true,
            quotes: true
          }
        }
      }
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: partner });
  } catch (error) {
    console.error('Partner GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

// PUT /api/partners/[id] - Update partner
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if partner exists
    const existingPartner = await db.partner.findUnique({ where: { id } });
    if (!existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Validate NIF format if provided and is tax payer
    if (body.isTaxPayer && body.nif && !/^\d{15}$/.test(body.nif)) {
      return NextResponse.json(
        { success: false, error: 'NIF must be 15 digits for tax payers' },
        { status: 400 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    // Basic info
    if (body.name !== undefined) updateData.name = body.name;
    if (body.displayName !== undefined) updateData.displayName = body.displayName || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.isCompany !== undefined) updateData.isCompany = body.isCompany;
    if (body.isTaxPayer !== undefined) updateData.isTaxPayer = body.isTaxPayer;

    // Algerian Identifiers
    if (body.rc !== undefined) updateData.rc = body.rc || null;
    if (body.nif !== undefined) updateData.nif = body.nif || null;
    if (body.nis !== undefined) updateData.nis = body.nis || null;
    if (body.ai !== undefined) updateData.ai = body.ai || null;

    // Contact
    if (body.contactName !== undefined) updateData.contactName = body.contactName || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.mobile !== undefined) updateData.mobile = body.mobile || null;
    if (body.website !== undefined) updateData.website = body.website || null;

    // Address
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.addressAr !== undefined) updateData.addressAr = body.addressAr || null;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode || null;
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.wilayaCode !== undefined) updateData.wilayaCode = body.wilayaCode || null;

    // Financial
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
    if (body.paymentMode !== undefined) updateData.paymentMode = body.paymentMode || null;
    if (body.creditLimit !== undefined) updateData.creditLimit = parseFloat(body.creditLimit) || 0;
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;

    // Categorization
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.priceList !== undefined) updateData.priceList = body.priceList || null;

    // Company assignment
    if (body.companyId !== undefined) updateData.companyId = body.companyId;

    const partner = await db.partner.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: partner,
      message: 'Partner updated successfully'
    });
  } catch (error) {
    console.error('Partner PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

// DELETE /api/partners/[id] - Soft delete partner
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if partner exists
    const existingPartner = await db.partner.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoicesAsCustomer: true,
            invoicesAsSupplier: true,
            quotes: true
          }
        }
      }
    });

    if (!existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Check if already inactive
    if (!existingPartner.isActive) {
      return NextResponse.json(
        { success: false, error: 'Partner is already deactivated' },
        { status: 400 }
      );
    }

    // Check for dependencies (active records)
    const dependencies: string[] = [];
    if (existingPartner._count.invoicesAsCustomer > 0) {
      dependencies.push(`${existingPartner._count.invoicesAsCustomer} invoice(s) as customer`);
    }
    if (existingPartner._count.invoicesAsSupplier > 0) {
      dependencies.push(`${existingPartner._count.invoicesAsSupplier} invoice(s) as supplier`);
    }
    if (existingPartner._count.quotes > 0) {
      dependencies.push(`${existingPartner._count.quotes} quote(s)`);
    }

    // If there are active dependencies, warn but still allow soft delete
    const hasDependencies = dependencies.length > 0;

    // Perform soft delete
    const partner = await db.partner.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      data: partner,
      message: hasDependencies
        ? `Partner deactivated. Warning: Partner has ${dependencies.join(', ')}. Consider archiving related records.`
        : 'Partner deactivated successfully'
    });
  } catch (error) {
    console.error('Partner DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate partner' },
      { status: 500 }
    );
  }
}
