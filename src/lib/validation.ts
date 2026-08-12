// ============================================================
// HASSIBA Suite ERP v2.0.0 - Input Validation Utilities
// Centralized validation for API endpoints
// ============================================================

import { z } from 'zod';

// ============================================================
// Common Validation Schemas
// ============================================================

// Algerian NIF (Numéro Identification Fiscale) - 15 digits
export const nifSchema = z.string()
  .regex(/^\d{15}$/, 'NIF doit contenir 15 chiffres')
  .optional();

// Algerian NIS (Numéro Identification Statistique) - 10 digits
export const nisSchema = z.string()
  .regex(/^\d{10}$/, 'NIS doit contenir 10 chiffres')
  .optional();

// RC (Registre de Commerce) - variable format
export const rcSchema = z.string()
  .min(3, 'RC invalide')
  .max(20, 'RC trop long')
  .optional();

// AI (Article d'Imposition)
export const aiSchema = z.string()
  .min(1, 'AI requis')
  .max(10, 'AI invalide')
  .optional();

// Algerian Phone number
export const algerianPhoneSchema = z.string()
  .regex(/^(?:\+213|0)(5|6|7)\d{8}$/, 'Numéro de téléphone algérien invalide')
  .optional();

// Email validation
export const emailSchema = z.string()
  .email('Email invalide')
  .optional();

// Amount validation (positive numbers for DZD)
export const amountSchema = z.number({
  invalid_type_error: 'Montant invalide',
})
  .nonnegative('Le montant ne peut être négatif')
  .max(999999999999.99, 'Montant trop élevé');

// Quantity validation
export const quantitySchema = z.number({
  invalid_type_error: 'Quantité invalide',
})
  .nonnegative('La quantité ne peut être négative')
  .int('La quantité doit être un entier');

// Percentage validation (0-100)
export const percentageSchema = z.number({
  invalid_type_error: 'Pourcentage invalide',
})
  .min(0, 'Le pourcentage doit être entre 0 et 100')
  .max(100, 'Le pourcentage doit être entre 0 et 100');

// TVA Rate validation (Algerian rates: 0, 9, 19)
export const tvaRateSchema = z.number({
  invalid_type_error: 'Taux TVA invalide',
})
  .ref((val) => [0, 9, 19].includes(val), {
  message: 'Taux TVA doit être 0%, 9% ou 19%',
});

// Date validation
export const dateSchema = z.coerce.date({
  invalid_type_error: 'Date invalide',
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ID validation (cuid format)
export const idSchema = z.string()
  .min(1, 'ID requis')
  .max(50, 'ID invalide')
  .ref((val) => /^[a-zA-Z0-9_-]+$/.test(val), {
    message: 'Format d\'ID invalide',
  });

// ============================================================
// Partner (Customer/Supplier) Validation
// ============================================================

export const partnerCreateSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)').max(200),
  displayName: z.string().max(200).optional(),
  type: z.enum(['customer', 'supplier', 'both']).default('customer'),
  isCompany: z.boolean().default(true),
  isTaxPayer: z.boolean().default(true),
  
  // Algerian identifiers
  rc: rcSchema,
  nif: nifSchema,
  nis: nisSchema,
  ai: aiSchema,
  
  // Contact
  contactName: z.string().max(200).optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: algerianPhoneSchema,
  mobile: algerianPhoneSchema,
  website: z.string().url('URL invalide').optional().or(z.literal('')),
  
  // Address
  address: z.string().max(500).optional(),
  addressAr: z.string().max(500).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)').optional(),
  city: z.string().max(100).optional(),
  wilayaCode: z.string().regex(/^\d{2}$/, 'Code wilaya invalide (2 chiffres)').optional(),
  
  // Financial
  paymentTerms: z.string().default('30'),
  paymentMode: z.enum(['virement', 'cheque', 'espece', 'traite']).optional(),
  creditLimit: z.number().nonnegative().default(0),
  bankAccount: z.string().optional(),
  
  // Categorization
  category: z.string().max(100).optional(),
  priceList: z.string().optional(),
});

// ============================================================
// Product Validation
// ============================================================

export const productCreateSchema = z.object({
  code: z.string().min(1, 'Code produit requis').max(50),
  name: z.string().min(1, 'Nom produit requis').max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['stockable', 'consumable', 'service', 'kit', 'digital']).default('stockable'),
  
  // Pricing
  salePrice: z.number().nonnegative().default(0),
  purchasePrice: z.number().nonnegative().default(0),
  costPrice: z.number().nonnegative().default(0),
  tvaRate: tvaRateSchema.default(19),
  
  // Stock settings
  trackStock: z.boolean().default(true),
  useSerials: z.boolean().default(false),
  useLots: z.boolean().default(false),
  unitOfMeasure: z.string().max(10).default('U'),
  
  categoryId: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
  canBeSold: z.boolean().default(true),
  canBePurchased: z.boolean().default(true),
});

// ============================================================
// Invoice Validation
// ============================================================

export const invoiceLineSchema = z.object({
  productId: z.string().min(1),
  label: z.string().max(500).optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
  discountRate: z.number().min(0).max(100).default(0),
  tvaRate: tvaRateSchema.default(19),
});

export const invoiceCreateSchema = z.object({
  partnerId: z.string().min(1, 'Partenaire requis'),
  lines: z.array(invoiceLineSchema).min(1, 'Au moins une ligne requise'),
  type: z.enum(['invoice', 'credit_note', 'proforma', 'deposit']).default('invoice'),
  dueDate: dateSchema.optional(),
  paymentTerms: z.string().default('30'),
  paymentMode: z.enum(['virement', 'cheque', 'espece', 'traite']).optional(),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
});

// ============================================================
// Employee Validation
// ============================================================

export const employeeCreateSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  firstNameAr: z.string().max(100).optional(),
  lastNameAr: z.string().max(100).optional(),
  gender: z.enum(['M', 'F']).default('M'),
  
  // Personal info
  dateOfBirth: dateSchema.optional(),
  placeOfBirth: z.string().max(100).optional(),
  nationality: z.string().default('DZ'),
  
  // Identification
  cin: z.string().regex(/^\d{18}$/, 'CIN invalide (18 chiffres)').optional(),  // Algerian National ID
  cnasNumber: z.string().max(50).optional(),
  casnosNumber: z.string().max(50).optional(),
  
  // Contact
  personalEmail: z.string().email().optional().or(z.literal('')),
  workEmail: z.string().email().optional().or(z.literal('')),
  phone: algerianPhoneSchema,
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  wilayaCode: z.string().regex(/^\d{2}$/).optional(),
  
  // Professional
  department: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  jobPosition: z.string().max(100).optional(),
  managerId: z.string().optional(),
  
  // Contract
  contractType: z.enum(['cdi', 'cdd', 'stage', 'temporaire']).default('cdi'),
  contractStartDate: dateSchema,
  contractEndDate: dateSchema.optional(),
  employeeStatus: z.enum(['active', 'on_leave', 'resigned', 'terminated']).default('active'),
  hireDate: dateSchema.optional(),
  
  // Salary
  baseSalary: z.number().nonnegative().default(0),
  dailyRate: z.number().nonnegative().default(0),
  hourlyRate: z.number().nonnegative().default(0),
  
  // Bank
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  
  isActive: z.boolean().default(true),
});

// ============================================================
// Validation Helper Functions
// ============================================================

/**
 * Validate request body against a schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateBody<T>(schema: z.Schema<T>, data: unknown): 
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodError['issues'] } {
  
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: result.error.errors[0]?.message || 'Validation failed',
    details: result.error.errors,
  };
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T>(schema: z.Schema<T>, searchParams: URLSearchParams):
  | { success: true; data: T }
  | { success: false; error: string } {
  
  const obj: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  
  return validateBody(schema, obj);
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim();
}

/**
 * Check if a value is a valid positive integer
 */
export function isValidPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && typeof value === 'number' && value > 0;
}

/**
 * Format validation error for API response
 */
export function formatValidationError(error: string | z.ZodError['issues']): {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR';
  details?: any;
} {
  if (Array.isArray(error)) {
    return {
      success: false,
      error: 'Erreur de validation',
      code: 'VALIDATION_ERROR',
      details: error.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }
  
  return {
    success: false,
    error: String(error),
    code: 'VALIDATION_ERROR',
  };
}
