// ============================================================
// HASSIBA Suite ERP v2.0.0 - User Registration API
// Inscription Utilisateur
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, checkPasswordStrength, ROLES } from "@/lib/auth";
import { AuditLogger, AuditModule } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, phone, companyId } = body;

    // Validation des champs requis
    if (!email || !name || !password) {
      return NextResponse.json(
        { success: false, error: "Email, nom et mot de passe sont requis" },
        { status: 400 }
      );
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Cet email est déjà utilisé" },
        { status: 409 }
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
        { status: 400 }
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
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}

// GET /api/auth/register - Vérifier si un email est disponible
export async function GET(request: Request) {
  try {
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

    return NextResponse.json({
      success: true,
      available: !existingUser,
      message: existingUser ? "Email déjà utilisé" : "Email disponible",
    });
  } catch (error) {
    console.error("Email Check Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
