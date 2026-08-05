import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/companies - List companies
export async function GET() {
  try {
    const companies = await db.company.findMany({
      where: { isActive: true },
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

    return NextResponse.json({ success: true, data: companies });
  } catch (error) {
    console.error('Companies GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create company
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Validate Algerian identifiers format if provided
    if (body.nif && !/^\d{15}$/.test(body.nif)) {
      return NextResponse.json(
        { success: false, error: 'NIF must be 15 digits' },
        { status: 400 }
      );
    }

    if (body.nis && !/^\d{10}$/.test(body.nis)) {
      return NextResponse.json(
        { success: false, error: 'NIS must be 10 digits' },
        { status: 400 }
      );
    }

    // Check for unique NIF
    if (body.nif) {
      const existing = await db.company.findFirst({ where: { nif: body.nif } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A company with this NIF already exists' },
          { status: 409 }
        );
      }
    }

    const company = await db.company.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || null,
        commercialName: body.commercialName || null,
        legalForm: body.legalForm || 'SARL',
        capital: parseFloat(body.capital) || 0,
        currency: body.currency || 'DZD',
        
        // Algerian Identifiers
        rc: body.rc || null,
        nif: body.nif || null,
        nis: body.nis || null,
        ai: body.ai || null,
        taxRegime: body.taxRegime || 'reel',
        
        // Contact
        address: body.address || null,
        addressAr: body.addressAr || null,
        postalCode: body.postalCode || null,
        city: body.city || null,
        wilayaCode: body.wilayaCode || null,
        phone: body.phone || null,
        fax: body.fax || null,
        email: body.email || null,
        website: body.website || null,
        
        // Configuration
        fiscalYearStart: parseInt(body.fiscalYearStart) || 1,
        language: body.language || 'fr',
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: company,
      message: 'Company created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Companies POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
