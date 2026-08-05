// ============================================================
// HASSIBA Suite ERP v2.0.0 - Seed for Auth, Audit & Workflow
// Initialisation des données de sécurité
// ============================================================

import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { WorkflowType } from '@prisma/client';

export async function seedAuthAndWorkflows() {
  console.log('🔐 Seeding Auth, Audit & Workflow data...');

  try {
    // ============================================================
    // 1. CREATE ADMIN USER
    // ============================================================
    const existingAdmin = await db.user.findFirst({ where: { role: 'admin' } });
    
    if (!existingAdmin) {
      const adminPassword = await hash('Admin@HASSIBA2024!', 12);
      
      const admin = await db.user.create({
        data: {
          email: 'admin@hassiba.dz',
          name: 'Administrateur HASSIBA',
          password: adminPassword,
          role: 'admin',
          phone: '+213 555 000 001',
          isActive: true,
        },
      });
      console.log('✅ Admin user created:', admin.email);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // ============================================================
    // 2. CREATE DEMO USERS (for testing)
    // ============================================================
    const demoUsers = [
      { email: 'comptable@hassiba.dz', name: 'Ahmed Benali', role: 'accountant', phone: '+213 555 000 002' },
      { email: 'rh@hassiba.dz', name: 'Fatima Zerhouni', role: 'hr_manager', phone: '+213 555 000 003' },
      { email: 'commercial@hassiba.dz', name: 'Karim Meziane', role: 'sales_manager', phone: '+213 555 000 004' },
      { email: 'employe@hassiba.dz', name: 'Amina Hadj', role: 'user', phone: '+213 555 000 005' },
    ];

    for (const userData of demoUsers) {
      const existing = await db.user.findUnique({ where: { email: userData.email } });
      if (!existing) {
        const password = await hash('Demo@2024!', 12);
        await db.user.create({
          data: {
            ...userData,
            password,
            isActive: true,
          },
        });
        console.log(`✅ Demo user created: ${userData.email}`);
      }
    }

    // ============================================================
    // 3. GET OR CREATE COMPANY
    // ============================================================
    let company = await db.company.findFirst();
    
    if (!company) {
      company = await db.company.create({
        data: {
          name: 'HASSIBA Entreprise SARL',
          nameAr: 'حسيبة للمقاولات',
          commercialName: 'HASSIBA',
          legalForm: 'SARL',
          capital: 10000000,
          currency: 'DZD',
          rc: '16B-1234567890',
          nif: '000012345678901',
          nis: '0000123456789012',
          ai: '1600000000001',
          taxRegime: 'reel',
          address: '123 Rue Didouche Mourad',
          city: 'Alger',
          wilayaCode: '16',
          phone: '+213 21 98 76 54',
          email: 'contact@hassiba.dz',
          website: 'www.hassiba.dz',
          fiscalYearStart: 1,
          language: 'fr',
          isActive: true,
        },
      });
      console.log('✅ Company created:', company.name);
    }

    // ============================================================
    // 4. CREATE WORKFLOW DEFINITIONS
    // ============================================================
    
    const workflowDefinitions = [
      {
        name: 'Approbation Facture Client',
        description: 'Circuit de validation pour les factures clients supérieures à 100,000 DZD',
        type: WorkflowType.invoice_approval as any,
        companyId: company.id,
        priority: 8,
        maxAmount: null,
        steps: [
          { sequenceOrder: 1, name: 'Validation Comptable', approverType: 'role', approverRole: 'accountant', requireComment: false, deadlineHours: 24 },
          { sequenceOrder: 2, name: 'Approbation Direction', approverType: 'role', approverRole: 'manager', requireComment: true, deadlineHours: 48 },
        ],
      },
      {
        name: 'Approbation Facture Fournisseur',
        description: 'Circuit de validation pour les factures fournisseurs',
        type: WorkflowType.bill_approval as any,
        companyId: company.id,
        priority: 7,
        maxAmount: null,
        steps: [
          { sequenceOrder: 1, name: 'Vérification Achat', approverType: 'role', approverRole: 'sales_manager', requireComment: false, deadlineHours: 24 },
          { sequenceOrder: 2, name: 'Validation Comptable', approverType: 'role', approverRole: 'accountant', requireComment: true, deadlineHours: 24 },
          { sequenceOrder: 3, name: 'Approbation Direction', approverType: 'role', approverRole: 'admin', requireComment: true, deadlineHours: 48 },
        ],
      },
      {
        name: 'Demande de Congés',
        description: 'Circuit d\'approbation pour les demandes de congés du personnel',
        type: WorkflowType.leave_request as any,
        companyId: company.id,
        priority: 6,
        maxAmount: null,
        steps: [
          { sequenceOrder: 1, name: 'Validation Manager Direct', approverType: 'manager', requireComment: false, deadlineHours: 24 },
          { sequenceOrder: 2, name: 'Validation RH', approverType: 'role', approverRole: 'hr_manager', requireComment: true, deadlineHours: 48 },
        ],
      },
      {
        name: 'Commande d\'Achat',
        description: 'Circuit d\'approbation pour les commandes d\'achat',
        type: WorkflowType.purchase_order as any,
        companyId: company.id,
        priority: 7,
        maxAmount: 500000,
        steps: [
          { sequenceOrder: 1, name: 'Validation Budget', approverType: 'role', approverRole: 'accountant', requireComment: false, deadlineHours: 24 },
          { sequenceOrder: 2, name: 'Approbation Direction', approverType: 'role', approverRole: 'manager', requireComment: true, deadlineHours: 48 },
        ],
      },
      {
        name: 'Validation Paie Mensuelle',
        description: 'Circuit de validation pour la paie mensuelle avant versement',
        type: WorkflowType.payroll_validation as any,
        companyId: company.id,
        priority: 9,
        maxAmount: null,
        steps: [
          { sequenceOrder: 1, name: 'Vérification RH', approverType: 'role', approverRole: 'hr_staff', requireComment: false, deadlineHours: 48 },
          { sequenceOrder: 2, name: 'Validation DRH', approverType: 'role', approverRole: 'hr_manager', requireComment: true, deadlineHours: 24 },
          { sequenceOrder: 3, name: 'Approbation DAF', approverType: 'role', approverRole: 'accountant', requireComment: true, deadlineHours: 24 },
          { sequenceOrder: 4, name: 'Validation DG', approverType: 'role', approverRole: 'admin', requireComment: true, deadlineHours: 48 },
        ],
      },
      {
        name: 'Déclaration Fiscale',
        description: 'Circuit d\'approbation pour les déclarations fiscales (TVA, TAP, IBS, IRG)',
        type: WorkflowType.tax_declaration as any,
        companyId: company.id,
        priority: 10,
        maxAmount: null,
        steps: [
          { sequenceOrder: 1, name: 'Préparation Comptable', approverType: 'role', approverRole: 'accountant', requireComment: false, deadlineHours: 72 },
          { sequenceOrder: 2, name: 'Révision DAF', approverType: 'role', approverRole: 'manager', requireComment: true, deadlineHours: 48 },
          { sequenceOrder: 3, name: 'Validation DG', approverType: 'role', approverRole: 'admin', requireComment: true, deadlineHours: 24 },
        ],
      },
    ];

    for (const wfDef of workflowDefinitions) {
      const existing = await db.workflowDefinition.findFirst({
        where: { 
          AND: [
            { name: wfDef.name },
            { companyId: wfDef.companyId }
          ]
        }
      });

      if (!existing) {
        await db.workflowDefinition.create({
          data: {
            ...wfDef,
            steps: {
              create: wfDef.steps.map(step => ({
                ...step,
                isOptional: step.isOptional || false,
                allowDelegation: step.allowDelegation !== false,
                autoApprove: step.autoApprove || false,
                onDeadlineExceeded: step.onDeadlineExceeded || 'escalate',
              }))
            }
          }
        });
        console.log(`✅ Workflow definition created: ${wfDef.name}`);
      } else {
        console.log(`ℹ️ Workflow already exists: ${wfDef.name}`);
      }
    }

    console.log('🎉 Auth, Audit & Workflow seeding completed!');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error seeding auth/workflows:', error);
    return { success: false, error };
  }
}

// Run if called directly
if (require.main === module) {
  seedAuthAndWorkflows()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
