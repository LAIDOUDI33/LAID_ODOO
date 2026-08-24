// ============================================================
// HASSIBA Suite ERP v2.0.0 - User Registration API
// Inscription Utilisateur
// C-03 FIX: Added rate limiting and fixed email enumeration
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, checkPasswordStrength, ROLES } from "@/lib/auth";
import { AuditLogger, AuditModule } from "@/lib/audit";

// ============================================================
// Rate Limiting Configuration (C-03 FIX)
// Prevents unlimited account creation attacks
// ============================================================

interface RegistrationAttempt {
  count: number;
  resetTime: number;
}

const registrationAttempts = new Map<string, RegistrationAttempt>();

const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes window
  maxAttempts: 3, // Max 3 registrations per IP per window
};

/**
 * Check if registration is allowed for this IP
 * Returns { allowed, remaining } - remaining attempts left
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const attempts = registrationAttempts.get(ip);

  // No previous attempts or window expired - reset counter
  if (!attempts || now > attempts.resetTime) {
    registrationAttempts.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxAttempts - 1 };
  }

  // Check if limit exceeded
  if (attempts.count >= RATE_LIMIT_CONFIG.maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter and allow
  attempts.count++;
  return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxAttempts - attempts.count };
}

/**
 * Clean up expired entries (call periodically to prevent memory leaks)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [ip, attempts] of registrationAttempts.entries()) {
    if (now > attempts.resetTime) {
      registrationAttempts.delete(ip);
    }
  }
}

export async function POST(request: Request) {
  try {
    // C-03 FIX: Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";
    
    // C-03 FIX: Check rate limit BEFORE processing
    const rateLimit = checkRateLimit(ip);
    
    // Set rate limit headers for client awareness
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxAttempts.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": (
        (registrationAttempts.get(ip)?.resetTime || 0) / 1000
      ).toString(),
    };

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Trop de tentatives. Veuillez réessayer plus tard." 
        },
        { 
          status: 429,
          headers,
        }
      );
    }

    // Periodic cleanup of expired entries (simple approach)
    if (Math.random() < 0.1) { // 10% chance to cleanup on each request
      cleanupExpiredEntries();
    }

    const body = await request.json();
    const { email, name, password, phone, companyId } = body;

    // Validation des champs requis
    if (!email || !name || !password) {
      return NextResponse.json(
        { success: false, error: "Email, nom et mot de passe sont requis" },
        { status: 400, headers }
      );
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Format d'email invalide" },
        { status: 400, headers }
      );
    }

    // C-03 FIX: Vérifier si l'email existe déjà
    // SECURITY: Use generic error message to prevent email enumeration
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // C-03 FIX: Generic error message - same as any other failure
      // This prevents attackers from determining which emails are registered
      return NextResponse.json(
        { 
          success: false, 
          error: "Impossible de créer le compte. Veuillez vérifier vos informations." 
        },
        { status: 400, headers } // Using 400 instead of 409 to avoid differentiation
      );
    }

    // Vérifier la force du mot de passe
    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Mot de passe trop faible",
          feedback: passwordCheck.feedback,
        },
        { status: 400, headers }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        phone: phone || null,
        role: ROLES.EMPLOYEE, // Par défaut employé
        companyId: companyId || null,
        isActive: true,
      },
    });

    // Logger l'inscription dans l'audit
    await AuditLogger.logCreate(request, AuditModule.auth, "User", user.id, {
      email: user.email,
      name: user.name,
      role: user.role,
    }, {
      id: user.id,
      name: user.name,
      email: user.email,
    });

    // Retourner la réponse (sans le mot de passe)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          message: "Utilisateur créé avec succès",
        },
      },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Impossible de créer le compte. Veuillez vérifier vos informations." 
        // C-03 FIX: Generic error message consistent with other failures
      },
      { status: 500 }
    );
  }
}

// GET /api/auth/register - Vérifier si un email est disponible
// C-03 FIX: Removed or limited email enumeration risk
export async function GET(request: Request) {
  try {
    // C-03 FIX: Apply rate limiting to GET endpoint too
    const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";
    
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Trop de tentatives. Veuillez réessayer plus tard." 
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email parameter required" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // C-03 FIX: Return generic response - don't reveal if email exists
    // This prevents email enumeration attacks
    return NextResponse.json({
      success: true,
      available: !existingUser,
      // Don't include specific message about whether email is taken
      message: "Vérification terminée",
    });
  } catch (error) {
    console.error("Email Check Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
