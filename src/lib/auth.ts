// ============================================================
// HASSIBA Suite ERP v2.0.0 - Authentication Library
// NextAuth.js v4 Configuration with RBAC
// ============================================================

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";

// ============================================================
// Account Lockout Configuration (H-08 FIX)
// ============================================================

interface LoginAttempt {
  count: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

// In-memory store for login attempts (production should use Redis)
const loginAttempts = new Map<string, LoginAttempt>();

const LOCKOUT_CONFIG = {
  maxAttempts: 5,           // Max failed attempts before lockout
  lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
  attemptWindow: 15 * 60 * 1000,   // 15 minutes window for counting attempts
};

/**
 * Check if account is locked out
 */
export function isAccountLocked(email: string): { locked: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(email.toLowerCase());
  
  if (!attempts?.lockedUntil) return { locked: false };
  
  if (new Date() < attempts.lockedUntil) {
    const remainingMs = attempts.lockedUntil.getTime() - Date.now();
    return { 
      locked: true, 
      remainingTime: Math.ceil(remainingMs / 1000) // seconds remaining
    };
  }
  
  // Lockout expired, reset
  loginAttempts.delete(email.toLowerCase());
  return { locked: false };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): { attemptsRemaining: number; locked: boolean } {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();
  const attempts = loginAttempts.get(normalizedEmail);
  
  if (!attempts || now.getTime() - attempts.lastAttempt.getTime() > LOCKOUT_CONFIG.attemptWindow) {
    // Reset window or first attempt
    loginAttempts.set(normalizedEmail, {
      count: 1,
      lastAttempt: now,
    });
    
    return { 
      attemptsRemaining: LOCKOUT_CONFIG.maxAttempts - 1, 
      locked: false 
    };
  }
  
  // Increment attempts
  const newCount = attempts.count + 1;
  attempts.count = newCount;
  attempts.lastAttempt = now;
  
  if (newCount >= LOCKOUT_CONFIG.maxAttempts) {
    // Lock the account
    const lockUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration);
    attempts.lockedUntil = lockUntil;
    
    return { 
      attemptsRemaining: 0, 
      locked: true 
    };
  }
  
  return { 
    attemptsRemaining: LOCKOUT_CONFIG.maxAttempts - newCount, 
    locked: false 
  };
}

/**
 * Clear login attempts after successful login
 */
export function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

/**
 * Get current login attempt status (for UI feedback)
 */
export function getLoginStatus(email: string): { attempts: number; maxAttempts: number; locked: boolean; lockedUntil?: Date } {
  const attempts = loginAttempts.get(email.toLowerCase());
  const lockCheck = isAccountLocked(email);
  
  return {
    attempts: attempts?.count || 0,
    maxAttempts: LOCKOUT_CONFIG.maxAttempts,
    locked: lockCheck.locked,
    lockedUntil: attempts?.lockedUntil,
  };
}

export const authOptions: NextAuthOptions = {
  // Configuration de base
  // CRITICAL: NEXTAUTH_SECRET must be set in environment variables
  // The application will fail to start if not configured properly
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes (sécurité renforcée)
    updateAge: 5 * 60, // Update every 5 minutes
  },
  
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
    newUser: "/register", // Nouveaux utilisateurs
  },

  // Providers
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const email = credentials.email.toLowerCase();

        // H-08: Check if account is locked out
        const lockStatus = isAccountLocked(email);
        if (lockStatus.locked) {
          throw new Error(`Compte temporairement bloqué. Réessayez dans ${lockStatus.remainingTime} secondes ou contactez l'administrateur.`);
        }

        // Rechercher l'utilisateur
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { company: true }
        });

        if (!user) {
          // Record failed attempt for security (don't reveal if email exists)
          const attemptStatus = recordFailedAttempt(credentials.email);
          throw new Error(`Email ou mot de passe incorrect. ${attemptStatus.attemptsRemaining > 0 ? `${attemptStatus.attemptsRemaining} tentative(s) restante(s).` : 'Compte temporairement bloqué.'}`);
        }

        if (!user.isActive) {
          throw new Error("Compte désactivé. Contactez l'administrateur");
        }

        // Vérifier le mot de passe
        if (user.password) {
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // H-08: Record failed attempt
            const attemptStatus = recordFailedAttempt(credentials.email);
            throw new Error(`Mot de passe incorrect. ${attemptStatus.attemptsRemaining > 0 ? `${attemptStatus.attemptsRemaining} tentative(s) restante(s).` : 'Compte temporairement bloqué.'}`);
          }
        } else {
          // Pour les utilisateurs sans mot de passe (OAuth)
          throw new Error("Veuillez vous connecter via un autre méthode");
        }

        // H-08: Clear login attempts on successful login
        clearLoginAttempts(credentials.email);

        // Mettre à jour lastLoginAt
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        // Retourner les données utilisateur
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name,
          image: user.avatar,
        };
      },
    }),
  ],

  // Callbacks
  callbacks: {
    async jwt({ token, user }) {
      // Premier login - ajouter les infos utilisateur au token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },

    async session({ session, token }) {
      // Ajouter les infos du token à la session
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).companyName = token.companyName;
      }
      return session;
    },
  },

  // Events pour logging
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ token }) {
      console.log(`User signed out: ${(token as any)?.email}`);
    },
  },
};

// ============================================================
// RBAC - Role-Based Access Control
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

// Permissions par rôle
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: [
    "*"
  ], // Tous les droits
  
  [ROLES.ADMIN]: [
    "*"
  ], // Tous les droits sauf super admin
  
  [ROLES.MANAGER]: [
    "dashboard:view",
    "finance:view", "finance:create", "finance:edit",
    "invoices:view", "invoices:create", "invoices:approve",
    "bills:view", "bills:create", "bills:approve",
    "reports:view", "reports:export",
    "employees:view", "employees:edit",
    "products:view", "products:edit",
    "partners:view", "partners:create", "partners:edit",
    "inventory:view",
    "workflow:approve",
    "audit:view",
  ],
  
  [ROLES.ACCOUNTANT]: [
    "dashboard:view",
    "finance:view", "finance:create", "finance:edit",
    "invoices:view", "invoices:create", "invoices:edit",
    "bills:view", "bills:create", "bills:edit",
    "payments:view", "payments:create", "payments:edit",
    "taxes:view", "taxes:create", "taxes:submit",
    "journal:view", "journal:create", "journal:edit",
    "reports:view", "reports:export",
    "audit:view",
  ],
  
  [ROLES.HR_MANAGER]: [
    "dashboard:view",
    "employees:view", "employees:create", "employees:edit",
    "payroll:view", "payroll:create", "payroll:validate",
    "leaves:view", "leaves:approve", "leaves:manage",
    "attendance:view", "attendance:edit",
    "reports:view", "reports:export:hr",
    "workflow:approve:hr",
  ],
  
  [ROLES.HR_STAFF]: [
    "dashboard:view",
    "employees:view",
    "payroll:view",
    "leaves:view", "leaves:create",
    "attendance:view",
  ],
  
  [ROLES.SALES_MANAGER]: [
    "dashboard:view",
    "sales:view", "sales:create", "sales:edit", "sales:approve",
    "partners:view", "partners:create", "partners:edit",
    "products:view", "products:edit",
    "invoices:view", "invoices:create",
    "reports:view", "reports:export:sales",
    "workflow:approve:sales",
  ],
  
  [ROLES.SALESPERSON]: [
    "dashboard:view",
    "sales:view", "sales:create",
    "partners:view",
    "products:view",
    "invoices:view", "invoices:create",
  ],
  
  [ROLES.WAREHOUSE_MANAGER]: [
    "dashboard:view",
    "inventory:view", "inventory:create", "inventory:edit",
    "products:view", "products:edit",
    "purchases:view", "purchases:create", "purchases:approve",
    "reports:view", "reports:export:inventory",
  ],
  
  [ROLES.EMPLOYEE]: [
    "dashboard:view",
    "profile:view", "profile:edit",
    "leaves:view", "leaves:create",
    "payslips:view:own",
    "documents:view:own",
  ],
};

// Vérifier si un rôle a une permission spécifique
export function hasPermission(userRole: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  // Super admin a tous les droits
  if (permissions.includes("*")) return true;
  
  // Permission exacte
  if (permissions.includes(permission)) return true;
  
  // Permission générique (ex: "invoices:*")
  const [resource] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;
  
  return false;
}

// Middleware de vérification des permissions
export function requirePermission(permission: string) {
  return (userRole: string): boolean => {
    return hasPermission(userRole, permission);
  };
}

// Vérifier plusieurs permissions (OR logic)
export function hasAnyPermission(userRole: string, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(userRole, p));
}

// Vérifier toutes les permissions (AND logic)
export function hasAllPermissions(userRole: string, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(userRole, p));
}

// ============================================================
// Password Utilities
// ============================================================

import { hash } from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// Validation de force du mot de passe
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push("Au moins 8 caractères");
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push("Au moins une lettre minuscule");
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push("Au moins une lettre majuscule");
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    feedback.push("Au moins un chiffre");
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push("Au moins un caractère spécial");
  } else {
    score++;
  }

  return {
    isValid: score >= 4 && password.length >= 8,
    score,
    feedback,
  };
}

// ============================================================
// Session Helpers
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  companyName?: string;
  image?: string | null;
}

export function getSessionUser(session: any): AuthUser | null {
  if (!session?.user) return null;
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    companyId: session.user.companyId,
    companyName: session.user.companyName,
    image: session.user.image,
  };
}

export function isAdmin(userRole: string): boolean {
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(userRole as Role);
}

export function canApproveWorkflows(userRole: string): boolean {
  return hasAnyPermission(userRole, ["workflow:approve"]);
}
