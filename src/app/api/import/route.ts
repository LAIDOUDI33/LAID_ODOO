// ============================================================
// Data Import API - Main Import Endpoint
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  createImportJob, 
  executeImport, 
  getImportJobDetails,
  listImportJobs,
  deleteImportJob,
  cancelImportJob,
  rollbackImportJob,
  getImportProgress
} from '@/lib/import/service';
import { getModuleTemplate, getAvailableModules, getRecommendedImportOrder } from '@/lib/import/templates';
import { generateExcelTemplate, exportToCSV } from '@/lib/import/file-parser';
import { ImportModule, ImportOptions, ColumnMapping } from '@/lib/import/types';

// GET /api/import - List import jobs or get available modules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const companyId = searchParams.get('companyId');
    
    // Get available import modules
    if (action === 'modules') {
      return NextResponse.json({
        success: true,
        modules: getAvailableModules(),
        recommendedOrder: getRecommendedImportOrder()
      });
    }
    
    // Get module template
    if (action === 'template') {
      const importModule = searchParams.get('module') as ImportModule;
      if (!importModule) {
        return NextResponse.json({ success: false, error: 'Module parameter required' }, { status: 400 });
      }
      
      const template = getModuleTemplate(importModule);
      return NextResponse.json({ success: true, template });
    }
    
    // Download template file
    if (action === 'download-template') {
      const importModule = searchParams.get('module') as ImportModule;
      const format = searchParams.get('format') || 'csv';
      
      if (!importModule) {
        return NextResponse.json({ success: false, error: 'Module parameter required' }, { status: 400 });
      }
      
      const template = getModuleTemplate(importModule);
      
      if (format === 'xlsx') {
        const buffer = await generateExcelTemplate(template.columns, template.sampleData);
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${module}_template.xlsx"`
          }
        });
      } else {
        // CSV format
        const headers = template.columns.map(c => c.label);
        const csvContent = exportToCSV(headers, template.sampleData || []);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${module}_template.csv"`
          }
        });
      }
    }
    
    // Get import progress
    if (action === 'progress') {
      const jobId = searchParams.get('jobId');
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }
      
      const progress = getImportProgress(jobId);
      return NextResponse.json({ success: true, progress });
    }
    
    // Get job details
    if (action === 'details') {
      const jobId = searchParams.get('jobId');
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }
      
      const job = await getImportJobDetails(jobId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, job });
    }
    
    // List jobs (default)
    if (companyId) {
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      const result = await listImportJobs(companyId, limit, offset);
      return NextResponse.json({ success: true, ...result });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Missing companyId parameter',
      actions: ['modules', 'template', 'download-template', 'progress', 'details']
    });
    
  } catch (error) {
    console.error('Import GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/import - Create and execute import job
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    // Upload file and create import job
    if (action === 'upload' || !action) {
      const file = formData.get('file') as File;
      const companyId = formData.get('companyId') as string;
      const moduleName = formData.get('module') as ImportModule;
      const jobName = formData.get('jobName') as string;
      const optionsStr = formData.get('options') as string;
      const mappingStr = formData.get('columnMapping') as string;
      
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }
      
      if (!companyId || !moduleName) {
        return NextResponse.json(
          { success: false, error: 'CompanyId and module are required' },
          { status: 400 }
        );
      }
      
      // Parse options
      let options: ImportOptions = {};
      if (optionsStr) {
        try {
          options = JSON.parse(optionsStr);
        } catch {
          // Use defaults
        }
      }
      
      // Parse column mapping
      let columnMapping: ColumnMapping | undefined;
      if (mappingStr) {
        try {
          columnMapping = JSON.parse(mappingStr);
        } catch {
          // No mapping
        }
      }
      
      // Create buffer from file
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create import job
      const jobId = await createImportJob(
        companyId,
        moduleName,
        file.name,
        file.type.split('/').pop() || 'unknown',
        file.size,
        buffer,
        jobName,
        options,
        columnMapping
      );
      
      return NextResponse.json({
        success: true,
        jobId,
        message: 'File uploaded successfully. Ready for validation.'
      });
    }
    
    // Start/execute import
    if (action === 'start') {
      const body = await request.json();
      const { jobId, options } = body;
      
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }
      
      // Execute import asynchronously (don't await)
      executeImport(jobId, '', options).catch(error => {
        console.error('Import execution error:', error);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Import started successfully',
        jobId
      });
    }
    
    // Validate only (dry run validation)
    if (action === 'validate') {
      const body = await request.json();
      const { jobId, columnMapping } = body;
      
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }
      
      // Update column mapping if provided
      if (columnMapping) {
        await db.importJob.update({
          where: { id: jobId },
          data: { columnMapping: JSON.stringify(columnMapping) }
        });
      }
      
      // Execute validation only
      executeImport(jobId, '', { validateOnly: true }).catch(error => {
        console.error('Validation error:', error);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Validation started'
      });
    }
    
    // Preview (get sample of validated rows)
    if (action === 'preview') {
      const { jobId } = await request.json();
      
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }
      
      const rows = await db.importRow.findMany({
        where: { jobId },
        take: 20,
        orderBy: { rowIndex: 'asc' }
      });
      
      return NextResponse.json({
        success: true,
        rows: rows.map(row => ({
          ...row,
          rawData: JSON.parse(row.rawData),
          mappedData: row.mappedData ? JSON.parse(row.mappedData) : null,
          validations: row.validations ? JSON.parse(row.validations) : null
        })),
        total: await db.importRow.count({ where: { jobId } })
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: upload, start, validate, preview' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Import POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/import - Delete or rollback import job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const action = searchParams.get('action');
    
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
    }
    
    // Rollback import
    if (action === 'rollback') {
      await rollbackImportJob(jobId);
      return NextResponse.json({
        success: true,
        message: 'Import rolled back successfully'
      });
    }
    
    // Cancel import
    if (action === 'cancel') {
      await cancelImportJob(jobId);
      return NextResponse.json({
        success: true,
        message: 'Import cancelled'
      });
    }
    
    // Delete job
    await deleteImportJob(jobId);
    return NextResponse.json({
      success: true,
      message: 'Import job deleted'
    });
    
  } catch (error) {
    console.error('Import DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
