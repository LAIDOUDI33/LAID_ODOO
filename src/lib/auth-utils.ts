// ============================================================
// HASSIBA Suite ERP - Authentication Utilities
// Centralized auth checks for API routes
// ============================================================

import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

// ============================================================
// Types
// ============================================================

interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  companyId?: string
}

interface AuthResult {
  user?: AuthUser
  error?: NextResponse
}

// ============================================================
// Get Current Session
// ============================================================

export async function getSession() {
  return await getServerSession(authOptions)
}

// ============================================================
// Require Authentication (returns error if not authenticated)
// Usage: const authError = await requireAuth(request); if (authError) return authError;
// ============================================================

export async function requireAuth(request?: Request): Promise<NextResponse | null> {
  const session = await getSession()
  
  if (!session?.user) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Non autorisé. Veuillez vous connecter.",
        code: "UNAUTHORIZED" 
      },
      { status: 401 }
    )
  }
  
  return null // Authenticated successfully
}

// ============================================================
// Require Specific Role (RBAC)
// Usage: const authError = await requireRole(request, ['admin', 'manager']); if (authError) return authError;
// ============================================================

export async function requireRole(
  request: Request, 
  allowedRoles: string[]
): Promise<NextResponse | null> {
  // First check authentication
  const authError = await requireAuth(request)
  if (authError) return authError
  
  const session = await getSession()
  const userRole = session?.user?.role || 'user'
  
  if (!allowedRoles.includes(userRole)) {
    // L-01 FIX: Removed requiredRoles and currentRole from error response
    // to prevent information disclosure about valid roles and user's actual role
    return NextResponse.json(
      { 
        success: false, 
        error: "Accès refusé. Permissions insuffisantes.",
        code: "FORBIDDEN"
      },
      { status: 403 }
    )
  }
  
  return null // Authorized with correct role
}

// ============================================================
// Get Authenticated User (for use in API handlers)
// ============================================================

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const session = await getSession()
  
  if (!session?.user) {
    return null
  }
  
  return {
    id: session.user.id as string,
    email: session.user.email as string,
    name: session.user.name as string,
    role: (session.user.role as string) || 'user',
    companyId: session.user.companyId as string | undefined
  }
}

// ============================================================
// Role Constants (MUST match auth.ts exactly)
// H-02 FIX: Unified role definitions across the application
// ============================================================

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  HR_MANAGER: "hr_manager",
  HR_STAFF: "hr_staff",
  SALES_MANAGER: "sales_manager",
  SALESPERSON: "salesperson",
  WAREHOUSE_MANAGER: "warehouse_manager",
  EMPLOYEE: "user",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Role hierarchy for permission level comparisons (higher = more permissions)
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 90,
  [ROLES.MANAGER]: 80,
  [ROLES.ACCOUNTANT]: 70,
  [ROLES.HR_MANAGER]: 65,
  [ROLES.WAREHOUSE_MANAGER]: 65,
  [ROLES.SALES_MANAGER]: 60,
  [ROLES.HR_STAFF]: 45,
  [ROLES.SALESPERSON]: 40,
  [ROLES.EMPLOYEE]: 20,
} as const;

// ============================================================
// Check if user has at least the specified role level
// ============================================================

export function hasMinimumRole(userRole: string, minimumRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0
  const requiredLevel = ROLE_HIERARCHY[minimumRole as keyof typeof ROLE_HIERARCHY] || 0
  return userLevel >= requiredLevel
}

// ============================================================
// Company Access Check (multi-tenant)
// ============================================================

export async function requireCompanyAccess(
  request: Request,
  companyId?: string
): Promise<NextResponse | null> {
  const authError = await requireAuth(request)
  if (authError) return authError
  
  const user = await getAuthenticatedUser()
  
  // Super admins can access everything
  if (user?.role === ROLES.SUPER_ADMIN) {
    return null
  }
  
  // If specific company requested, check access
  if (companyId && user?.companyId !== companyId) {
    // Admins can access their company
    if (user?.role !== ROLES.ADMIN) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Accès à cette entreprise non autorisé.",
          code: "COMPANY_FORBIDDEN" 
        },
        { status: 403 }
      )
    }
  }
  
  return null
}
