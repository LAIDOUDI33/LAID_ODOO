// ============================================================
// HASSIBA SUITE ERP - Report Builder API
// Advanced Drag-and-Drop Report Builder Endpoints
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  ReportConfig, 
  ReportExecutionResult,
  ReportMetadata,
  ColumnMetadata,
  ReportDataRow,
  ReportSummary
} from '@/lib/types/report'
import { 
  REPORT_TEMPLATES, 
  getReportTemplate,
  DATA_SOURCES,
  getDataSource 
} from '@/lib/report-templates'
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils'

// ============================================================
// GET /api/reports/builder - List saved reports
// GET /api/reports/builder?templates=true - Get templates
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url)
    const templatesParam = searchParams.get('templates')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    // Return predefined templates if requested
    if (templatesParam === 'true') {
      let templates = [...REPORT_TEMPLATES]
      
      // Filter by category if provided
      if (category) {
        templates = templates.filter(t => t.category === category)
      }
      
      // Search if query provided
      if (search) {
        const lowerSearch = search.toLowerCase()
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(lowerSearch) ||
          t.description.toLowerCase().includes(lowerSearch) ||
          t.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
        )
      }
      
      return NextResponse.json({
        success: true,
        data: templates,
        count: templates.length
      })
    }
    
    // List saved reports
    const reports = await db.reportBuilderConfig.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50
    })
    
    // Parse config JSON for each report
    const reportsWithConfig = reports.map(report => ({
      ...report,
      config: JSON.parse(report.config)
    }))
    
    return NextResponse.json({
      success: true,
      data: reportsWithConfig,
      count: reportsWithConfig.length
    })
    
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des rapports' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/reports/builder - Save new report
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require appropriate role for creating reports
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const body = await request.json()
    const { name, description, config, category, tags } = body
    
    // Validate required fields
    if (!name || !config) {
      return NextResponse.json(
        { success: false, error: 'Le nom et la configuration sont requis' },
        { status: 400 }
      )
    }
    
    // Create new report configuration
    const report = await db.reportBuilderConfig.create({
      data: {
        name,
        description: description || null,
        config: JSON.stringify(config),
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        createdBy: body.createdBy || 'system',
        companyId: body.companyId || 'default-company'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ...report,
        config: JSON.parse(report.config)
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du rapport' },
      { status: 500 }
    )
  }
}
