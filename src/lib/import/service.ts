// ============================================================
// Data Import System - Main Import Service
// Orchestrates file parsing, validation, and data import
// ============================================================

import { db } from '@/lib/db';
import { 
  ImportModule, 
  ImportOptions, 
  ImportJobStatusType,
  RowStatusType,
  ImportRowData,
  ImportProgress,
  ColumnMapping,
  ValidationResult
} from './types';
import { parseImportFile } from './file-parser';
import { validateRow, convertFieldValue } from './validation';
import { importRow, createSnapshot, rollbackImport } from './mappers';
import { getModuleTemplate } from './templates';

// In-memory progress tracking for active imports
const activeImports = new Map<string, {
  status: ImportJobStatusType;
  progress: number;
  currentRow: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
  message?: string;
}>();

/**
 * Main import function - orchestrates the complete import process
 */
export async function executeImport(
  jobId: string,
  companyId: string,
  options: ImportOptions = {}
): Promise<void> {
  // Get job from database
  const job = await db.importJob.findUnique({
    where: { id: jobId },
    include: { rows: true }
  });
  
  if (!job) {
    throw new Error('Import job not found');
  }
  
  if (job.status !== 'pending' && job.status !== 'validated') {
    throw new Error(`Cannot import job with status: ${job.status}`);
  }
  
  try {
    // Update status to processing
    await updateJobProgress(jobId, 'processing', 0);
    
    // Get module template for validation rules
    const template = getModuleTemplate(job.module as ImportModule);
    
    // Parse column mapping if provided
    const columnMapping: ColumnMapping = job.columnMapping 
      ? JSON.parse(job.columnMapping) 
      : {};
    
    // Apply column mapping and validate all rows first (if not already validated)
    let rows = job.rows;
    
    if (job.status === 'pending') {
      // Validation phase
      await updateJobProgress(jobId, 'validating', 0);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Apply column mapping
        if (Object.keys(columnMapping).length > 0) {
          const mappedData: Record<string, any> = {};
          for (const [sourceKey, targetField] of Object.entries(columnMapping)) {
            mappedData[targetField] = row.rawData[sourceKey];
          }
          row.mappedData = mappedData;
          await db.importRow.update({
            where: { id: row.id },
            data: { 
              mappedData: JSON.stringify(mappedData),
              rowStatus: 'validating'
            }
          });
        }
        
        // Validate row
        const validation = await validateRow(
          { ...row, mappedData: row.mappedData ? JSON.parse(row.mappedData) : undefined },
          job.module as ImportModule,
          template.columns,
          template.validationRules,
          { companyId, module: job.module as ImportModule, db }
        );
        
        // Update row with validation results
        const rowStatus: RowStatusType = validation.isValid 
          ? (validation.warnings.length > 0 ? 'warning' : 'valid')
          : 'error';
        
        await db.importRow.update({
          where: { id: row.id },
          data: {
            rowStatus,
            validations: JSON.stringify(validation),
            errors: validation.errors.length > 0 
              ? JSON.stringify(validation.errors.map(e => e.message))
              : null,
            warnings: validation.warnings.length > 0
              ? JSON.stringify(validation.warnings.map(w => w.message))
              : null
          }
        });
        
        // Update progress
        const progress = Math.round(((i + 1) / rows.length) * 50); // Validation is 50% of progress
        await updateJobProgress(jobId, 'validating', progress, i + 1, rows.length);
      }
      
      // Check if we should stop at validation
      if (options.validateOnly) {
        await updateJobProgress(jobId, 'validated', 100);
        
        // Count errors
        const errorCount = await db.importRow.count({
          where: { jobId, rowStatus: 'error' }
        });
        
        await db.importJob.update({
          where: { id: jobId },
          data: {
            status: errorCount > 0 ? 'partially_completed' : 'validated',
            errorCount,
            hasErrors: errorCount > 0
          }
        });
        
        return;
      }
      
      // Reload rows after validation
      rows = await db.importRow.findMany({ where: { jobId } });
    }
    
    // Create snapshot before import (for rollback)
    const snapshotData = options.dryRun ? null : await createSnapshot(
      job.module as ImportModule,
      companyId
    );
    
    if (snapshotData) {
      await db.importJob.update({
        where: { id: jobId },
        data: { snapshotData }
      });
    }
    
    // Processing phase - import valid rows
    await updateJobProgress(jobId, 'processing', 50);
    
    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    
    const validRows = rows.filter(r => r.rowStatus === 'valid' || r.rowStatus === 'warning');
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowData = row.mappedData ? JSON.parse(row.mappedData) : row.rawData;
      
      // Skip in dry run mode
      if (!options.dryRun) {
        const result = await importRow(
          { ...row, mappedData: rowData },
          job.module as ImportModule,
          companyId,
          options
        );
        
        // Update row with result
        await db.importRow.update({
          where: { id: row.id },
          data: {
            entityId: result.entityId,
            entityType: result.entityType,
            action: result.action,
            rowStatus: result.success ? 'imported' : 'failed',
            errors: result.error ? JSON.stringify([result.error]) : null,
            warnings: result.warnings ? JSON.stringify(result.warnings) : null,
            processedAt: new Date()
          }
        });
        
        // Count results
        switch (result.action) {
          case 'created':
          case 'updated':
            successCount++;
            break;
          case 'skipped':
            skippedCount++;
            if (result.warnings?.some(w => w.includes('already exists'))) {
              duplicateCount++;
            }
            break;
          case 'error':
            errorCount++;
            break;
        }
        
        if (result.warnings?.length > 0) {
          warningCount++;
        }
        
        // Stop on error if configured
        if (!result.success && !options.continueOnError) {
          throw new Error(`Import failed at row ${row.rowIndex}: ${result.error}`);
        }
      } else {
        successCount++; // In dry run, count all as success
      }
      
      // Update progress (50-100% for processing)
      const progress = 50 + Math.round(((i + 1) / validRows.length) * 50);
      await updateJobProgress(
        jobId, 
        'processing', 
        progress, 
        i + 1, 
        validRows.length,
        successCount,
        errorCount
      );
    }
    
    // Finalize job
    const finalStatus: ImportJobStatusType = errorCount > 0 
      ? (successCount > 0 ? 'partially_completed' : 'failed')
      : 'completed';
    
    const completedAt = new Date();
    const durationMs = job.startedAt ? completedAt.getTime() - new Date(job.startedAt).getTime() : undefined;
    
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        totalRows: rows.length,
        successCount,
        errorCount,
        warningCount,
        skippedCount,
        duplicateCount,
        progress: 100,
        completedAt,
        durationMs,
        processedAt: options.dryRun ? null : new Date(),
        hasErrors: errorCount > 0
      }
    });
    
    // Clear active import tracking
    activeImports.delete(jobId);
    
  } catch (error) {
    // Mark job as failed
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        hasErrors: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    });
    
    activeImports.delete(jobId);
    throw error;
  }
}

/**
 * Rollback an import job
 */
export async function rollbackImportJob(jobId: string): Promise<void> {
  const job = await db.importJob.findUnique({
    where: { id: jobId }
  });
  
  if (!job) {
    throw new Error('Import job not found');
  }
  
  if (!job.snapshotData) {
    throw new Error('No snapshot available for rollback');
  }
  
  if (job.isRolledBack) {
    throw new Error('Import has already been rolled back');
  }
  
  await updateJobProgress(jobId, 'rolling_back', 0);
  
  try {
    const result = await rollbackImport(
      job.snapshotData,
      job.module as ImportModule,
      job.companyId
    );
    
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'rolled_back',
        isRolledBack: true,
        rolledBackAt: new Date()
      }
    });
    
    activeImports.delete(jobId);
    
  } catch (error) {
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    });
    
    throw error;
  }
}

/**
 * Get current import progress
 */
export function getImportProgress(jobId: string): ImportProgress | null {
  const progress = activeImports.get(jobId);
  return progress || null;
}

/**
 * Create a new import job from uploaded file
 */
export async function createImportJob(
  companyId: string,
  moduleName: ImportModule,
  fileName: string,
  fileType: string,
  fileSize: number,
  fileBuffer: Buffer,
  jobName?: string,
  options?: ImportOptions,
  columnMapping?: ColumnMapping
): Promise<string> {
  // Parse the file
  const parsedFile = await parseImportFile(fileBuffer, fileName, options);
  
  if (parsedFile.errors.length > 0 && parsedFile.rows.length === 0) {
    throw new Error(`Failed to parse file: ${parsedFile.errors[0].message}`);
  }
  
  // Create import job
  const job = await db.importJob.create({
    data: {
      companyId,
      jobName: jobName || `${moduleName}_${new Date().toISOString().split('T')[0]}`,
      module: moduleName,
      fileName,
      fileType,
      fileSize,
      originalName: fileName,
      status: 'pending',
      totalRows: parsedFile.totalRows,
      options: options ? JSON.stringify(options) : null,
      columnMapping: columnMapping ? JSON.stringify(columnMapping) : null,
      createdBy: 'system'
    }
  });
  
  // Create import rows
  if (parsedFile.rows.length > 0) {
    await db.importRow.createMany({
      data: parsedFile.rows.map(row => ({
        jobId: job.id,
        rowIndex: row.rowIndex,
        rawData: JSON.stringify(row.rawData),
        rowStatus: 'pending'
      }))
    });
  }
  
  return job.id;
}

/**
 * Get import job details with rows
 */
export async function getImportJobDetails(jobId: string) {
  const job = await db.importJob.findUnique({
    where: { id: jobId },
    include: {
      rows: {
        orderBy: { rowIndex: 'asc' },
        take: 100 // Limit preview rows
      }
    }
  });
  
  if (!job) return null;
  
  // Parse JSON fields
  return {
    ...job,
    options: job.options ? JSON.parse(job.options) : null,
    columnMapping: job.columnMapping ? JSON.parse(job.columnMapping) : null,
    errorSummary: job.errorSummary ? JSON.parse(job.errorSummary) : null,
    validationReport: job.validationReport ? JSON.parse(job.validationReport) : null,
    rows: job.rows.map(row => ({
      ...row,
      rawData: JSON.parse(row.rawData),
      mappedData: row.mappedData ? JSON.parse(row.mappedData) : null,
      validations: row.validations ? JSON.parse(row.validations) : null,
      errors: row.errors ? JSON.parse(row.errors) : null,
      warnings: row.warnings ? JSON.parse(row.warnings) : null
    }))
  };
}

/**
 * List import jobs for a company
 */
export async function listImportJobs(companyId: string, limit = 20, offset = 0) {
  const [jobs, total] = await Promise.all([
    db.importJob.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    db.importJob.count({ where: { companyId } })
  ]);
  
  return { jobs, total };
}

/**
 * Delete an import job and its rows
 */
export async function deleteImportJob(jobId: string): Promise<void> {
  // Only allow deletion of non-completed jobs or completed jobs older than 30 days
  const job = await db.importJob.findUnique({ where: { id: jobId } });
  
  if (!job) {
    throw new Error('Import job not found');
  }
  
  if (['processing', 'rolling_back'].includes(job.status)) {
    throw new Error('Cannot delete a job that is currently being processed');
  }
  
  await db.importRow.deleteMany({ where: { jobId } });
  await db.importJob.delete({ where: { id: jobId } });
}

/**
 * Cancel an active import job
 */
export async function cancelImportJob(jobId: string): Promise<void> {
  const job = await db.importJob.findUnique({ where: { id: jobId } });
  
  if (!job) {
    throw new Error('Import job not found');
  }
  
  if (!['pending', 'validating', 'validated', 'previewing'].includes(job.status)) {
    throw new Error(`Cannot cancel job with status: ${job.status}`);
  }
  
  await db.importJob.update({
    where: { id: jobId },
    data: { status: 'cancelled' }
  });
  
  activeImports.delete(jobId);
}

// Helper functions

async function updateJobProgress(
  jobId: string,
  status: ImportJobStatusType,
  progress: number,
  currentRow?: number,
  totalRows?: number,
  successCount?: number,
  errorCount?: number,
  message?: string
): Promise<void> {
  // Update database
  await db.importJob.update({
    where: { id: jobId },
    data: {
      status,
      progress,
      ...(currentRow !== undefined && { currentRow }),
      ...(totalRows !== undefined && { totalRows }),
      ...(successCount !== undefined && { successCount }),
      ...(errorCount !== undefined && { errorCount }),
      ...(status === 'processing' && !currentRow && { startedAt: new Date() })
    }
  });
  
  // Update in-memory progress
  activeImports.set(jobId, {
    status,
    progress,
    currentRow: currentRow || 0,
    totalRows: totalRows || 0,
    successCount: successCount || 0,
    errorCount: errorCount || 0,
    message
  });
}
