// ============================================================
// HASSIBA Suite ERP v2.0.0 - Security Utilities
// Centralized security functions for API endpoints
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ============================================================
// Request Body Size Limit Configuration (H-05 FIX)
// ============================================================

const BODY_SIZE_LIMITS: Record<string, number> = {
  default: 1024 * 1024,        // 1MB default
  upload: 50 * 1024 * 1024,    // 50MB for file uploads
  document: 10 * 1024 * 1024,  // 10MB for documents
  import: 5 * 1024 * 1024,     // 5MB for data imports
};

/**
 * Validate request body size
 * Returns error response if body exceeds limit
 */
export function validateBodySize(
  request: Request, 
  category: keyof typeof BODY_SIZE_LIMITS = 'default'
): NextResponse | null {
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  const maxSize = BODY_SIZE_LIMITS[category] || BODY_SIZE_LIMITS.default;
  
  if (contentLength > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return NextResponse.json(
      {
        success: false,
        error: `Corps de la requête trop volumineux. Taille maximale: ${maxSizeMB}MB`,
        code: 'PAYLOAD_TOO_LARGE',
      },
      { status: 413 }
    );
  }
  
  return null;
}

/**
 * Read and validate request JSON with size limit
 */
export async function safeReadBody<T = any>(
  request: Request,
  category: keyof typeof BODY_SIZE_LIMITS = 'default'
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  // Check content length first
  const sizeError = validateBodySize(request, category);
  if (sizeError) {
    return { success: false, error: sizeError };
  }
  
  try {
    const data = await request.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'JSON invalide dans le corps de la requête',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      )
    };
  }
}

// ============================================================
// Security Headers Configuration
// ============================================================

export const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy (for API responses)
  'Content-Security-Policy': "default-src 'self'",
  
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * Add security headers to a response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

// ============================================================
// Rate Limiting Configuration
// ============================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  default: { windowMs: 15 * 60 * 1000, maxRequests: 100 },      // 100 requests per 15 minutes
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },          // 10 login attempts per 15 minutes
  sensitive: { windowMs: 60 * 60 * 1000, maxRequests: 50 },       // 50 requests per hour for sensitive operations
  upload: { windowMs: 60 * 60 * 1000, maxRequests: 10 },         // 10 uploads per hour
};

/**
 * Check rate limit for an IP address
 * Returns null if allowed, or a Response if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  category: keyof typeof RATE_LIMITS = 'default'
): NextResponse | null {
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  
  const config = RATE_LIMITS[category] || RATE_LIMITS.default;
  const now = Date.now();
  const record = rateLimitMap.get(`${ip}:${category}`);
  
  if (!record || now > record.resetTime) {
    // Create or reset record
    rateLimitMap.set(`${ip}:${category}`, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }
  
  if (record.count >= config.maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Trop de requêtes. Veuillez réessayer plus tard.',
        code: 'RATE_LIMITED',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.resetTime),
        },
      }
    );
  }
  
  record.count++;
  
  return null;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

// ============================================================
// Input Sanitization
// ============================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '')           // Remove HTML tags
    .replace(/javascript:/gi, '')   // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '')    // Remove event handlers
    .trim();
}

/**
 * Sanitize object by sanitizing all string values recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, any>)[key] = sanitizeInput(result[key]);
    } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      (result as Record<string, any>)[key] = sanitizeObject(result[key]);
    }
  }
  
  return result;
}

// ============================================================
// CSRF Protection (simplified)
// ============================================================

/**
 * Validate origin header for state-changing requests
 * In production, use proper CSRF tokens
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  
  // In development/same-origin, allow all
  if (!origin) return true;
  
  const host = request.headers.get('host') || '';
  
  // Allow same origin
  if (origin.includes(host)) return true;
  
  // Allow configured origins (for multi-domain setups)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  if (allowedOrigins.some(o => origin.includes(o.trim()))) return true;
  
  return false;
}

// ============================================================
// Error Response Helpers
// ============================================================

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      code: code || getErrorCode(status),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return addSecurityHeaders(response);
}

/**
 * Create a standardized success response
 */
export function successResponse(
  data: any,
  status: number = 200,
  message?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return addSecurityHeaders(response);
}

/**
 * Get error code from HTTP status
 */
function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  
  return codes[status] || 'ERROR';
}

// ============================================================
// Validation Error Helper
// ============================================================

/**
 * Format Zod validation errors for API response
 */
export function formatZodError(error: ZodError): {
  success: false;
  error: string;
  code: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    success: false,
    error: 'Erreur de validation des données',
    code: 'VALIDATION_ERROR',
    details: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

// ============================================================
// Safe Error Handler (H-04 FIX - Prevent Stack Trace Leaks)
// ============================================================

/**
 * Safe error handler that never exposes internal details
 * Use this in ALL catch blocks instead of returning error.message
 */
export function safeErrorHandler(error: unknown, context?: string): NextResponse {
  // Log the full error server-side for debugging (but don't expose to client)
  console.error(`[API Error${context ? ` - ${context}` : ''}]:`, error);
  
  // Determine if this is a known error type we can safely share
  let userMessage = 'Une erreur est survenue. Veuillez réessayer.';
  let statusCode = 500;
  
  if (error instanceof Error) {
    // Check for specific error types we can provide better messages for
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('not found') || errorMessage.includes('found')) {
      userMessage = 'Ressource non trouvée.';
      statusCode = 404;
    } else if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      userMessage = 'Cette entrée existe déjà.';
      statusCode = 409;
    } else if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      userMessage = 'Impossible de supprimer cette ressource car elle est utilisée ailleurs.';
      statusCode = 409;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      userMessage = 'Le serveur met trop temps à répondre. Veuillez réessayer.';
      statusCode = 504;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      userMessage = 'Données invalides. Veuillez vérifier votre saisie.';
      statusCode = 400;
    }
    
    // In development, include slightly more info but still no stack traces
    if (process.env.NODE_ENV === 'development' && statusCode === 500) {
      // Only show error name, not message (which might contain sensitive data)
      console.error(`[Debug] Error type: ${error.name}, Message preview: ${error.message.substring(0, 100)}`);
    }
  }
  
  return errorResponse(userMessage, statusCode);
}

/**
 * Wrap an async handler with standardized error handling
 * Usage: export const GET = withErrorHandler(async (request) => { ... });
 */
export function withErrorHandler(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse>,
  context?: string
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return safeErrorHandler(error, context);
    }
  };
}

/**
 * Create a not found response (standardized)
 */
export function notFoundResponse(resource: string = 'Ressource'): NextResponse {
  return errorResponse(`${resource} non trouvée.`, 404, 'NOT_FOUND');
}

/**
 * Create an unauthorized response (standardized)
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return errorResponse(message || 'Non autorisé. Veuillez vous connecter.', 401, 'UNAUTHORIZED');
}

/**
 * Create a forbidden response (standardized) 
 */
export function forbiddenResponse(message?: string): NextResponse {
  return errorResponse(message || 'Accès refusé. Permissions insuffisantes.', 403, 'FORBIDDEN');
}

/**
 * Create a validation error response (standardized)
 */
export function validationErrorResponse(details: Array<{ field: string; message: string }>): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Erreur de validation des données',
      code: 'VALIDATION_ERROR',
      details,
      timestamp: new Date().toISOString(),
    },
    { status: 422 }
  );
}
