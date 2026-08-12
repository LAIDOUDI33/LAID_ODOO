// ============================================================
// HASSIBA Suite ERP v2.0.0 - Login Status API
// Check account lockout status without authenticating
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isAccountLocked, getLoginStatus, LOCKOUT_CONFIG } from '@/lib/auth';

/**
 * GET /api/auth/login-status?email=user@example.com
 * Returns login attempt status for UI feedback (lockout warning)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter required',
          code: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }
    
    // Check lockout status
    const lockStatus = isAccountLocked(email);
    const loginStatus = getLoginStatus(email);
    
    return NextResponse.json({
      success: true,
      data: {
        locked: lockStatus.locked,
        remainingTime: lockStatus.remainingTime || null,
        attempts: loginStatus.attempts,
        maxAttempts: LOCKOUT_CONFIG.maxAttempts,
        attemptsRemaining: Math.max(0, LOCKOUT_CONFIG.maxAttempts - loginStatus.attempts),
        lockedUntil: loginStatus.lockedUntil?.toISOString() || null,
      }
    });
  } catch (error) {
    console.error('Login Status Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la vérification du statut',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
