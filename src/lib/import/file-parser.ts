// ============================================================
// Data Import System - File Parser Service
// Handles CSV and Excel file parsing with validation
// ============================================================

import { ImportOptions, ImportRowData } from './types';

export interface ParsedFileResult {
  headers: string[];
  rows: ImportRowData[];
  totalRows: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  errors: ParseError[];
}

export interface ParseError {
  row?: number;
  column?: string;
  message: string;
  value?: any;
}

/**
 * Parse uploaded file (CSV or Excel) into structured data
 */
export async function parseImportFile(
  file: File | Buffer,
  fileName: string,
  options: ImportOptions = {}
): Promise<ParsedFileResult> {
  const fileType = getFileType(fileName);
  const fileSize = file instanceof File ? file.size : file.length;
  
  let buffer: Buffer;
  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    buffer = file;
  }
  
  switch (fileType) {
    case 'csv':
      return parseCSV(buffer, fileName, options);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer, fileName, options);
    default:
      throw new Error(`Unsupported file type: ${fileType}. Please use CSV or Excel files.`);
  }
}

function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  return 'unknown';
}

/**
 * Parse CSV file
 */
function parseCSV(
  buffer: Buffer,
  fileName: string,
  options: ImportOptions
): ParsedFileResult {
  const content = buffer.toString(options.encoding || 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  const skipRows = options.skipRows || 0;
  
  if (lines.length <= skipRows) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileName,
      fileType: 'csv',
      fileSize: buffer.length,
      errors: [{ message: 'File is empty or contains only headers' }]
    };
  }
  
  // Parse header row
  const headerLine = lines[skipRows];
  const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Validate headers are unique
  const headerCounts = new Map<string, number>();
  headers.forEach(h => headerCounts.set(h, (headerCounts.get(h) || 0) + 1));
  const duplicateHeaders = Array.from(headerCounts.entries()).filter(([, count]) => count > 1).map(([h]) => h);
  
  const errors: ParseError[] = [];
  duplicateHeaders.forEach(h => {
    errors.push({ column: h, message: `Duplicate column header: "${h}"` });
  });
  
  // Parse data rows
  const rows: ImportRowData[] = [];
  let rowIndex = 0;
  
  for (let i = skipRows + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    rowIndex++;
    const values = parseCSVLine(line);
    
    // Build raw data object
    const rawData: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rawData[header] = values[idx] !== undefined ? values[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    
    rows.push({
      rowIndex,
      rawData,
      status: 'pending'
    });
  }
  
  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileType: 'csv',
    fileSize: buffer.length,
    errors
  };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // Last field
  return result;
}

/**
 * Parse Excel file using xlsx library
 */
async function parseExcel(
  buffer: Buffer,
  fileName: string,
  options: ImportOptions
): Promise<ParsedFileResult> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    throw new Error('Excel file contains no sheets');
  }
  
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
    defval: '',
    dateNF: options.dateFormat || 'yyyy-mm-dd'
  });
  
  if (jsonData.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileName,
      fileType: 'xlsx',
      fileSize: buffer.length,
      errors: [{ message: 'Excel sheet is empty' }]
    };
  }
  
  // Get headers from first row keys
  const headers = Object.keys(jsonData[0]);
  
  const rows: ImportRowData[] = jsonData.map((row, idx) => ({
    rowIndex: idx + 1,
    rawData: row,
    status: 'pending'
  }));
  
  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileType: 'xlsx',
    fileSize: buffer.length,
    errors: []
  };
}

/**
 * Convert parsed data back to CSV format (for download)
 */
export function exportToCSV(
  headers: string[],
  rows: Record<string, any>[],
  delimiter: string = ','
): string {
  const csvRows: string[] = [];
  
  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(delimiter));
  
  // Data rows
  rows.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) value = '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvRows.push(values.join(delimiter));
  });
  
  return csvRows.join('\n');
}

/**
 * Generate Excel template from column definitions
 */
export async function generateExcelTemplate(
  columns: { key: string; label: string; type: string; example?: string; required?: boolean }[],
  sampleData?: Record<string, any>[]
): Promise<Buffer> {
  const XLSX = await import('xlsx');
  
  // Create worksheet with headers
  const headers = columns.map(col => col.label);
  const wsData: any[][] = [headers];
  
  // Add example row if provided
  if (sampleData && sampleData.length > 0) {
    sampleData.forEach(row => {
      const values = columns.map(col => row[col.key] ?? '');
      wsData.push(values);
    });
  } else {
    // Add example row from column examples
    const exampleRow = columns.map(col => col.example || '');
    wsData.push(exampleRow);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  worksheet['!cols'] = columns.map(col => ({
    wch: Math.max(col.label.length, col.example?.length || 10) + 2
  }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Template');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
