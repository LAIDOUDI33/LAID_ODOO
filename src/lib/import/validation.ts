// ============================================================
// Data Import System - Validation Engine
// Comprehensive validation for all import modules
// ============================================================

import { 
  ImportModule, 
  ImportColumnDef, 
  FieldValidationRule,
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ValidationContext,
  ImportRowData
} from './types';

/**
 * Main validation engine - validates a row against module rules
 */
export async function validateRow(
  row: ImportRowData,
  module: ImportModule,
  columns: ImportColumnDef[],
  rules: Record<string, FieldValidationRule[]>,
  context: ValidationContext
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const data = { ...row.mappedData || row.rawData };
  
  // Validate each field
  for (const column of columns) {
    const value = data[column.key];
    const fieldRules = rules[column.key] || [];
    
    for (const rule of fieldRules) {
      const result = await executeRule(rule, column, value, data, context);
      
      if (typeof result === 'string') {
        errors.push({
          field: column.key,
          message: result,
          row: row.rowIndex,
          value,
          code: rule.type
        });
      } else if (result === false) {
        errors.push({
          field: column.key,
          message: rule.message,
          row: row.rowIndex,
          value,
          code: rule.type
        });
      }
      // true = pass, no error
    }
    
    // Type-specific validation
    const typeError = validateFieldType(column, value, row.rowIndex);
    if (typeError) {
      errors.push(typeError);
    }
    
    // Format warnings
    const formatWarning = checkFormatWarnings(column, value, row.rowIndex);
    if (formatWarning) {
      warnings.push(formatWarning);
    }
  }
  
  // Cross-field validation
  const crossErrors = await validateCrossFields(row, module, data, context);
  errors.push(...crossErrors);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data
  };
}

/**
 * Execute a single validation rule
 */
async function executeRule(
  rule: FieldValidationRule,
  column: ImportColumnDef,
  value: any,
  rowData: Record<string, any>,
  context: ValidationContext
): Promise<boolean | string> {
  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || String(value).trim() === '') {
        return rule.message;
      }
      return true;
      
    case 'unique':
      return await checkUnique(column.key, value, context);
      
    case 'format':
      if (!value) return true; // Skip empty values for format checks
      return checkFormat(value, rule.params?.pattern, rule.message);
      
    case 'range':
      if (value === undefined || value === null) return true;
      return checkRange(value, rule.params?.min, rule.params?.max, rule.message);
      
    case 'enum':
      if (!value) return true;
      return checkEnum(value, rule.params?.values, rule.message);
      
    case 'reference':
      return await checkReference(value, rule.params?.model, rule.params?.field, context);
      
    case 'custom':
      if (rule.validator) {
        return rule.validator(value, rowData, context);
      }
      return true;
      
    default:
      return true;
  }
}

/**
 * Validate field type and convert if necessary
 */
function validateFieldType(
  column: ImportColumnDef,
  value: any,
  rowIndex: number
): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    if (column.required) {
      return {
        field: column.key,
        message: `${column.label} is required`,
        row: rowIndex,
        value,
        code: 'REQUIRED'
      };
    }
    return null;
  }
  
  const strValue = String(value).trim();
  
  switch (column.type) {
    case 'number':
      if (isNaN(Number(strValue))) {
        return {
          field: column.key,
          message: `${column.label} must be a valid number`,
          row: rowIndex,
          value,
          code: 'INVALID_FORMAT'
        };
      }
      break;
      
    case 'date':
      if (!isValidDate(strValue)) {
        return {
          field: column.key,
          message: `${column.label} must be a valid date (YYYY-MM-DD or DD/MM/YYYY)`,
          row: rowIndex,
          value,
          code: 'INVALID_DATE'
        };
      }
      break;
      
    case 'email':
      if (!isValidEmail(strValue)) {
        return {
          field: column.key,
          message: `${column.label} must be a valid email address`,
          row: rowIndex,
          value,
          code: 'INVALID_EMAIL'
        };
      }
      break;
      
    case 'phone':
      if (!isValidPhone(strValue)) {
        return {
          field: column.key,
          message: `${column.label} must be a valid phone number`,
          row: rowIndex,
          value,
          code: 'INVALID_PHONE'
        };
      }
      break;
      
    case 'boolean':
      if (!['true', 'false', '1', '0', 'yes', 'no', 'oui', 'non'].includes(strValue.toLowerCase())) {
        return {
          field: column.key,
          message: `${column.label} must be true/false, yes/no, or 1/0`,
          row: rowIndex,
          value,
          code: 'INVALID_BOOLEAN'
        };
      }
      break;
  }
  
  // Check max length
  if (column.maxLength && strValue.length > column.maxLength) {
    return {
      field: column.key,
      message: `${column.label} exceeds maximum length of ${column.maxLength} characters`,
      row: rowIndex,
      value,
      code: 'MAX_LENGTH'
    };
  }
  
  // Check min length
  if (column.minLength && strValue.length < column.minLength) {
    return {
      field: column.key,
      message: `${column.label} must be at least ${column.minLength} characters`,
      row: rowIndex,
      value,
      code: 'MIN_LENGTH'
    };
  }
  
  return null;
}

/**
 * Check format warnings (non-blocking)
 */
function checkFormatWarnings(
  column: ImportColumnDef,
  value: any,
  rowIndex: number
): ValidationWarning | null {
  if (!value) return null;
  
  const strValue = String(value).trim();
  
  switch (column.type) {
    case 'email':
      if (strValue.includes('..') || strValue.startsWith('.') || strValue.endsWith('.')) {
        return {
          field: column.key,
          message: `${column.label} has unusual email format`,
          row: rowIndex,
          value,
          code: 'UNUSUAL_FORMAT'
        };
      }
      break;
      
    case 'phone':
      if (strValue.length < 8) {
        return {
          field: column.key,
          message: `${column.label} seems short for a phone number`,
          row: rowIndex,
          value,
          code: 'SHORT_VALUE'
        };
      }
      break;
  }
  
  return null;
}

/**
 * Cross-field validations specific to each module
 */
async function validateCrossFields(
  row: ImportRowData,
  module: ImportModule,
  data: Record<string, any>,
  context: ValidationContext
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  switch (module) {
    case 'employees':
      // Hire date should not be in the future
      if (data.hireDate) {
        const hireDate = new Date(data.hireDate);
        if (hireDate > new Date()) {
          errors.push({
            field: 'hireDate',
            message: 'Hire date cannot be in the future',
            row: row.rowIndex,
            value: data.hireDate,
            code: 'FUTURE_DATE'
          });
        }
      }
      // Birth date should be before hire date
      if (data.birthDate && data.hireDate) {
        const birth = new Date(data.birthDate);
        const hire = new Date(data.hireDate);
        if (birth > hire) {
          errors.push({
            field: 'birthDate',
            message: 'Birth date must be before hire date',
            row: row.rowIndex,
            value: data.birthDate,
            code: 'DATE_CONFLICT'
          });
        }
      }
      break;
      
    case 'invoices':
    case 'bills':
      // Due date should be after invoice/bill date
      if (data.date && data.dueDate) {
        const docDate = new Date(data.date);
        const dueDate = new Date(data.dueDate);
        if (dueDate < docDate) {
          errors.push({
            field: 'dueDate',
            message: 'Due date must be after document date',
            row: row.rowIndex,
            value: data.dueDate,
            code: 'DATE_CONFLICT'
          });
        }
      }
      // Items array validation
      if (data.items && Array.isArray(data.items)) {
        if (data.items.length === 0) {
          errors.push({
            field: 'items',
            message: 'At least one item line is required',
            row: row.rowIndex,
            code: 'REQUIRED'
          });
        }
      }
      break;
      
    case 'journal_entries':
      // Debit/Credit balance check
      if (data.lines && Array.isArray(data.lines)) {
        let totalDebit = 0;
        let totalCredit = 0;
        data.lines.forEach((line: any, idx: number) => {
          totalDebit += Number(line.debit) || 0;
          totalCredit += Number(line.credit) || 0;
        });
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          errors.push({
            field: 'lines',
            message: `Journal entry not balanced: Debit=${totalDebit}, Credit=${totalCredit}`,
            row: row.rowIndex,
            code: 'UNBALANCED_ENTRY'
          });
        }
      }
      break;
      
    case 'chart_of_accounts':
      // Account code uniqueness will be checked by unique rule
      // Parent account should exist if specified
      if (data.parentCode) {
        // Will be validated by reference rule
      }
      break;
      
    case 'attendance':
      // Check out should be after check in
      if (data.checkIn && data.checkOut) {
        const [inH, inM] = data.checkIn.split(':').map(Number);
        const [outH, outM] = data.checkOut.split(':').map(Number);
        const inMinutes = inH * 60 + inM;
        const outMinutes = outH * 60 + outM;
        
        if (outMinutes <= inMinutes) {
          errors.push({
            field: 'checkOut',
            message: 'Check-out time must be after check-in time',
            row: row.rowIndex,
            value: data.checkOut,
            code: 'TIME_CONFLICT'
          });
        }
      }
      break;
  }
  
  return errors;
}

// ============================================================
// Helper Functions
// ============================================================

async function checkUnique(
  field: string,
  value: any,
  context: ValidationContext
): Promise<boolean | string> {
  try {
    // Check based on module
    const existing = await getExistingRecord(context.module, field, value, context.db, context.companyId);
    if (existing) {
      return `A record with this ${field} already exists`;
    }
    return true;
  } catch (error) {
    return true; // Allow on error, don't block import
  }
}

async function getExistingRecord(
  module: ImportModule,
  field: string,
  value: any,
  db: any,
  companyId: string
): Promise<any> {
  const where: any = { companyId, [field]: value };
  
  switch (module) {
    case 'employees':
      return db.employee.findFirst({ where });
    case 'products':
      return db.product.findFirst({ where: { companyId, OR: [{ sku: value }, { barcode: value }] } });
    case 'partners':
      return db.partner.findFirst({ where });
    case 'chart_of_accounts':
      return db.chartOfAccount.findFirst({ where: { companyId, code: value } });
    default:
      return null;
  }
}

function checkFormat(
  value: string,
  pattern?: string,
  errorMessage?: string
): boolean | string {
  if (!pattern) return true;
  const regex = new RegExp(pattern);
  if (!regex.test(String(value))) {
    return errorMessage || `Invalid format for ${value}`;
  }
  return true;
}

function checkRange(
  value: any,
  min?: number,
  max?: number,
  errorMessage?: string
): boolean | string {
  const num = Number(value);
  if (min !== undefined && num < min) {
    return errorMessage || `Value must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return errorMessage || `Value must be at most ${max}`;
  }
  return true;
}

function checkEnum(
  value: any,
  allowedValues?: string[],
  errorMessage?: string
): boolean | string {
  if (!allowedValues || allowedValues.length === 0) return true;
  if (!allowedValues.includes(String(value))) {
    return errorMessage || `Value must be one of: ${allowedValues.join(', ')}`;
  }
  return true;
}

async function checkReference(
  value: any,
  model?: string,
  field?: string,
  context?: ValidationContext
): Promise<boolean | string> {
  if (!model || !field || !context) return true;
  
  try {
    const where: any = { [field]: value, companyId: context.companyId };
    const exists = await (context.db as any)[model].findFirst({ where });
    if (!exists) {
      return `Referenced ${field} "${value}" does not exist`;
    }
    return true;
  } catch {
    return true;
  }
}

function isValidDate(dateString: string): boolean {
  // Try YYYY-MM-DD first
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(`${year}-${month}-${day}`);
    return !isNaN(date.getTime());
  }
  
  // Try DD/MM/YYYY
  const dmyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(`${year}-${month}-${day}`);
    return !isNaN(date.getTime());
  }
  
  // Try DD-MM-YYYY
  const dmyMatch2 = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch2) {
    const [, day, month, year] = dmyMatch2;
    const date = new Date(`${year}-${month}-${day}`);
    return !isNaN(date.getTime());
  }
  
  return false;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Accept various phone formats including Algerian numbers
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  return /^\d{8,15}$/.test(cleaned);
}

/**
 * Convert value to proper type based on column definition
 */
export function convertFieldValue(
  value: any,
  column: ImportColumnDef
): any {
  if (value === undefined || value === null || value === '') {
    return column.defaultValue ?? null;
  }
  
  switch (column.type) {
    case 'number':
      const num = Number(String(value).replace(/[,\s]/g, ''));
      return isNaN(num) ? null : num;
      
    case 'date':
      if (value instanceof Date) return value.toISOString().split('T')[0];
      if (isValidDate(String(value))) {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) return value;
        const dmyMatch = String(value).match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
        if (dmyMatch) {
          return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        }
      }
      return value;
      
    case 'boolean':
      const boolStr = String(value).toLowerCase();
      return ['true', '1', 'yes', 'oui'].includes(boolStr);
      
    default:
      return String(value).trim();
  }
}
