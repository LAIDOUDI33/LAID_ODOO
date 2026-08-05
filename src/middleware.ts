// HASSIBA Suite ERP - Security Middleware
import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_MAP = new Map();
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = 100;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Rate limiting for API
  if (pathname.startsWith('/api/')) {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const record = RATE_LIMIT_MAP.get(ip);
    
    if (record && now < record.resetTime) {
      if (record.count >= RATE_MAX) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
      record.count++;
    } else {
      RATE_LIMIT_MAP.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    }
    
    response.headers.set('X-RateLimit-Limit', String(RATE_MAX));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_MAX - (record?.count || 1))));
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
