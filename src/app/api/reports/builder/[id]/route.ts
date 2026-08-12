// ============================================================
// HASSIBA SUITE ERP - Report Builder API
// Individual Report Operations: GET, PUT, DELETE
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  ReportConfig,
  ReportExecutionResult,
  ReportMetadata,
  ColumnMetadata,
  ReportDataRow,
  ReportSummary,
  DataSourceType,
  FieldType
} from '@/lib/types/report'
import { getDataSource } from '@/lib/report-templates'
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================================
// GET /api/reports/builder/[id] - Get report config
// ============================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params
    
    const report = await db.reportBuilderConfig.findUnique({
      where: { id }
    })
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...report,
        config: JSON.parse(report.config)
      }
    })
    
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du rapport' },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT /api/reports/builder/[id] - Update report
// ============================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Require appropriate role for updating reports
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const { id } = await params
    const body = await request.json()
    const { name, description, config, category, tags, isFavorite } = body
    
    // Check if report exists
    const existingReport = await db.reportBuilderConfig.findUnique({
      where: { id }
    })
    
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    // Update report
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (config !== undefined) updateData.config = JSON.stringify(config)
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = JSON.stringify(tags)
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    
    const report = await db.reportBuilderConfig.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ...report,
        config: JSON.parse(report.config)
      }
    })
    
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du rapport' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/reports/builder/[id] - Delete report
// ============================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Require appropriate role for deleting reports
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const { id } = await params
    
    // Check if report exists
    const existingReport = await db.reportBuilderConfig.findUnique({
      where: { id }
    })
    
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    // Delete report
    await db.reportBuilderConfig.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Rapport supprimé avec succès'
    })
    
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du rapport' },
      { status: 500 }
    )
  }
}
