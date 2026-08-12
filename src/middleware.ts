// HASSIBA Suite ERP v2.0.0 - Enhanced Security Middleware
// Provides security headers, rate limiting, and basic protection
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Configuration
// ============================================================

const RATE_LIMIT_MAP = new Map<string, { count: number; resetTime: number }>();
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = process.env.NODE_ENV === 'development' ? 10000 : 1000; // Higher limit for dev

// Paths that should NOT be rate limited (or have custom limits)
const EXEMPT_PATHS = ['/api/health', '/api/auth/', '/api/seed'];
const SENSITIVE_PATHS = ['/api/payroll', '/api/invoices', '/api/accounting', '/api/bank-accounts'];

// ============================================================
// Security Headers
// ============================================================

function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // Clickjacking protection
    'X-Frame-Options': 'DENY',
    
    // MIME sniffing protection
    'X-Content-Type-Options': 'nosniff',
    
    // XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy for API responses
    'Content-Security-Policy': "default-src 'self'",
    
    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  
  // HSTS in production only
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  return headers;
}

// ============================================================
// Rate Limiting Function
// ============================================================

function checkRateLimit(ip: string, pathname: string): 
  | { allowed: true; remaining: number }
  | { allowed: false; response: NextResponse } {
  
  const now = Date.now();
  const record = RATE_LIMIT_MAP.get(ip);
  
  // Determine max requests based on path sensitivity
  let maxRequests = RATE_MAX;
  if (SENSITIVE_PATHS.some(p => pathname.startsWith(p))) {
    maxRequests = Math.floor(RATE_MAX / 2); // Half the limit for sensitive endpoints
  }
  
  if (!record || now > record.resetTime) {
    // Create or reset record
    RATE_LIMIT_MAP.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (record.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Trop de requêtes. Veuillez réessayer plus tard.',
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSeconds,
          retryAfterDate: new Date(record.resetTime).toISOString(),
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
          },
        }
      ),
    };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// ============================================================
// Main Middleware
// ============================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get client IP (considering proxy headers)
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  // Create base response with security headers
  const response = NextResponse.next();
  
  // Add security headers to all responses
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Check if path is exempt from rate limiting
    const isExempt = EXEMPT_PATHS.some(exemptPath => pathname.startsWith(exemptPath));
    
    if (!isExempt) {
      const rateLimitResult = checkRateLimit(ip, pathname);
      
      if (!rateLimitResult.allowed) {
        return rateLimitResult.response;
      }
      
      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Limit', String(
        SENSITIVE_PATHS.some(p => pathname.startsWith(p)) ? Math.floor(RATE_MAX / 2) : RATE_MAX
      ));
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    }
  }
  
  // Prevent access to sensitive files
  const blockedPatterns = [
    /\.env$/,
    /\.git/,
    /package-lock\.json/,
    /prisma\/schema\.sql$/,  // Don't expose raw schema
  ];
  
  if (blockedPatterns.some(pattern => pattern.test(pathname))) {
    return new NextResponse(null, { status: 403 });
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)'],
};
