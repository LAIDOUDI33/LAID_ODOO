// ============================================================
// HASSIBA Suite ERP v2.0.0 - Security Utilities
// Centralized security functions for API endpoints
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

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
