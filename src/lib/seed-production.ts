// ============================================================
// PRODUCTION MODULE SEED DATA
// Sample data for Work Centers, BOMs, Routings, Work Orders, QC
// ============================================================

import { db } from '@/lib/db';

export async function seedProductionData() {
  try {
    console.log('🏭 Seeding Production Module...');
    
    // Get existing company
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return { success: false, error: 'No active company found' };
    }

    // Get or create a demo user
    let user = await db.user.findFirst({ where: { role: 'admin' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'admin@hassiba.dz',
          name: 'Admin Production',
          role: 'admin',
          companyId: company.id
        }
      });
    }

    // Get existing products to use in BOMs and Work Orders
    const products = await db.product.findMany({
      take: 10,
      where: { companyId: company.id, isActive: true }
    });

    if (products.length < 3) {
      return { success: false, error: 'Need at least 3 products to seed production data' };
    }

    // ============================================================
    // 1. CREATE WORK CENTERS (ATELIERS)
    // ============================================================
    console.log('  → Creating Work Centers...');
    
    const workCentersData = [
      {
        code: 'WC-ASM',
        name: 'Atelier Assemblage',
        nameAr: 'ورشة التجميع',
        type: 'assembly',
        status: 'available',
        capacityPerHour: 50,
        efficiency: 92,
        oeeTarget: 85,
        location: 'Bâtiment A, Zone 1',
        workingHours: JSON.stringify([
          { day: 'lundi', start: '08:00', end: '17:00' },
          { day: 'mardi', start: '08:00', end: '17:00' },
          { day: 'mercredi', start: '08:00', end: '17:00' },
          { day: 'jeudi', start: '08:00', end: '17:00' },
          { day: 'vendredi', start: '08:00', end: '13:00' }
        ]),
        setupTime: 15,
        hourlyCost: 2500,
        isActive: true,
        companyId: company.id
      },
      {
        code: 'WC-USN',
        name: 'Atelier Usinage CNC',
        nameAr: 'ورشة التشغيل',
        type: 'machine',
        status: 'available',
        capacityPerHour: 30,
        efficiency: 88,
        oeeTarget: 82,
        location: 'Bâtiment A, Zone 2',
        workingHours: JSON.stringify([
          { day: 'lundi', start: '06:00', end: '14:00' },
          { day: 'mardi', start: '06:00', end: '14:00' },
          { day: 'mercredi', start: '06:00', end: '14:00' },
          { day: 'jeudi', start: '06:00', end: '14:00' },
          { day: 'vendredi', start: '06:00', end: '12:00' }
        ]),
        setupTime: 30,
        hourlyCost: 4500,
        isActive: true,
        companyId: company.id
      },
      {
        code: 'WC-FIN',
        name: 'Atelier Finition',
        nameAr: 'ورشة التشطيب',
        type: 'assembly',
        status: 'busy',
        capacityPerHour: 40,
        efficiency: 95,
        oeeTarget: 90,
        location: 'Bâtiment A, Zone 3',
        setupTime: 10,
        hourlyCost: 2000,
        isActive: true,
        companyId: company.id
      },
      {
        code: 'WC-QLT',
        name: 'Contrôle Qualité',
        nameAr: 'مراقبة الجودة',
        type: 'quality',
        status: 'available',
        capacityPerHour: 100,
        efficiency: 98,
        oeeTarget: 95,
        location: 'Bâtiment B, Zone 1',
        setupTime: 5,
        hourlyCost: 1800,
        isActive: true,
        companyId: company.id
      },
      {
        code: 'WC-PKG',
        name: 'Atelier Conditionnement',
        nameAr: 'ورشة التعبئة',
        type: 'packaging',
        status: 'maintenance',
        capacityPerHour: 200,
        efficiency: 85,
        oeeTarget: 88,
        location: 'Bâtiment B, Zone 2',
        setupTime: 20,
        hourlyCost: 1500,
        isActive: true,
        companyId: company.id
      },
      {
        code: 'WLD-01',
        name: 'Poste Soudure TIG',
        nameAr: 'محطة اللحام',
        type: 'machine',
        status: 'available',
        capacityPerHour: 15,
        efficiency: 90,
        oeeTarget: 85,
        location: 'Bâtiment A, Zone 4',
        setupTime: 25,
        hourlyCost: 3500,
        isActive: true,
        companyId: company.id
      }
    ];

    const workCenters = [];
    for (const wc of workCentersData) {
      const existing = await db.workCenter.findUnique({ where: { code: wc.code } });
      if (!existing) {
        const created = await db.workCenter.create({ data: wc });
        workCenters.push(created);
      } else {
        workCenters.push(existing);
      }
    }

    // ============================================================
    // 2. CREATE BILLS OF MATERIALS (NOMENCLATURES)
    // ============================================================
    console.log('  → Creating Bills of Materials...');

    // Use first product as finished good, others as components
    const finishedProduct = products[0];
    const componentProducts = products.slice(1, Math.min(6, products.length));

    const bomsData = [
      {
        code: `BOM-${finishedProduct.code}-v1`,
        name: `Nomenclature ${finishedProduct.name}`,
        description: 'Nomenclature standard pour fabrication',
        productId: finishedProduct.id,
        version: 1,
        versionName: 'v1.0',
        outputQuantity: 1,
        unitOfMeasure: finishedProduct.unitOfMeasure || 'U',
        scrapPercentage: 2.5,
        isActive: true,
        isDefault: true,
        companyId: company.id,
        lines: componentProducts.map((comp, index) => ({
          componentId: comp.id,
          quantity: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
          unitOfMeasure: comp.unitOfMeasure || 'U',
          sequence: index,
          isOptional: false,
          isPhantom: false,
          scrapPercentage: Math.random() * 5,
          unitCost: comp.purchasePrice || comp.costPrice || 0,
          totalCost: (comp.purchasePrice || comp.costPrice || 0) * Math.round((Math.random() * 5 + 0.5) * 100) / 100
        }))
      }
    ];

    // Create second BOM for second product if available
    if (products.length >= 4) {
      const secondProduct = products[1];
      const components2 = products.slice(2, Math.min(7, products.length));
      
      bomsData.push({
        code: `BOM-${secondProduct.code}-v1`,
        name: `Nomenclature ${secondProduct.name}`,
        description: 'Nomenclature pour seconde gamme',
        productId: secondProduct.id,
        version: 1,
        versionName: 'v1.0',
        outputQuantity: 1,
        unitOfMeasure: secondProduct.unitOfMeasure || 'U',
        scrapPercentage: 1.8,
        isActive: true,
        isDefault: true,
        companyId: company.id,
        lines: components2.map((comp, index) => ({
          componentId: comp.id,
          quantity: Math.round((Math.random() * 3 + 0.3) * 100) / 100,
          unitOfMeasure: comp.unitOfMeasure || 'U',
          sequence: index,
          isOptional: index === components2.length - 1,
          isPhantom: false,
          scrapPercentage: Math.random() * 3,
          unitCost: comp.purchasePrice || comp.costPrice || 0,
          totalCost: (comp.purchasePrice || comp.costPrice || 0) * Math.round((Math.random() * 3 + 0.3) * 100) / 100
        }))
      });
    }

    const boms = [];
    for (const bom of bomsData) {
      const existing = await db.billOfMaterials.findUnique({ where: { code: bom.code } });
      if (!existing) {
        const { lines, ...bomData } = bom;
        const created = await db.billOfMaterials.create({
          data: {
            ...bomData,
            lines: { create: lines }
          },
          include: { lines: true }
        });
        boms.push(created);
      } else {
        const withLines = await db.billOfMaterials.findUnique({
          where: { id: existing.id },
          include: { lines: true }
        });
        boms.push(withLines!);
      }
    }

    // ============================================================
    // 3. CREATE ROUTINGS (GAMMES OPÉRATOIRES)
    // ============================================================
    console.log('  → Creating Routings...');

    const routingsData = [
      {
        code: `RTG-${finishedProduct.code}-v1`,
        name: `Gamme ${finishedProduct.name}`,
        description: 'Gamme opératoire standard',
        productId: finishedProduct.id,
        version: 1,
        totalTime: 45,
        setupTime: 15,
        isActive: true,
        isDefault: true,
        companyId: company.id,
        operations: [
          {
            sequence: 1,
            name: 'Préparation composants',
            operationType: 'setup',
            workCenterId: workCenters[0].id, // Assembly
            setupTime: 10,
            runTime: 2,
            waitTime: 0,
            moveTime: 5,
            workersRequired: 2,
            skillLevel: 'Opérateur confirmé',
            instructions: 'Vérifier la liste de colisage et préparer les composants'
          },
          {
            sequence: 2,
            name: 'Assemblage principal',
            operationType: 'processing',
            workCenterId: workCenters[0].id, // Assembly
            setupTime: 5,
            runTime: 15,
            waitTime: 2,
            moveTime: 3,
            workersRequired: 3,
            skillLevel: 'Technicien',
            instructions: 'Suivre les instructions du plan d\'assemblage'
          },
          {
            sequence: 3,
            name: 'Contrôle dimensionnel',
            operationType: 'inspection',
            workCenterId: workCenters[3].id, // Quality
            setupTime: 2,
            runTime: 5,
            waitTime: 0,
            moveTime: 2,
            workersRequired: 1,
            skillLevel: 'Contrôleur qualité',
            instructions: 'Vérifier les cotes critiques selon plan'
          },
          {
            sequence: 4,
            name: 'Finition et conditionnement',
            operationType: 'packaging',
            workCenterId: workCenters[4].id, // Packaging
            setupTime: 5,
            runTime: 3,
            waitTime: 0,
            moveTime: 2,
            workersRequired: 2,
            skillLevel: 'Opérateur',
            instructions: 'Emballer selon spécifications client'
          }
        ]
      }
    ];

    const routings = [];
    for (const routing of routingsData) {
      const existing = await db.routing.findUnique({ where: { code: routing.code } });
      if (!existing) {
        const { operations, ...routingData } = routing;
        const created = await db.routing.create({
          data: {
            ...routingData,
            operations: { create: operations }
          },
          include: { operations: true }
        });
        routings.push(created);
      } else {
        const withOps = await db.routing.findUnique({
          where: { id: existing.id },
          include: { operations: true }
        });
        routings.push(withOps!);
      }
    }

    // ============================================================
    // 4. CREATE WORK ORDERS (ORDRES DE FABRICATION)
    // ============================================================
    console.log('  → Creating Work Orders...');

    const now = new Date();
    const statuses: Array<'planned' | 'released' | 'in_progress' | 'paused' | 'completed'> = ['planned', 'released', 'in_progress', 'paused', 'completed'];
    const priorities: Array<'low' | 'normal' | 'high' | 'urgent' | 'critical'> = ['low', 'normal', 'high', 'urgent', 'critical'];

    const workOrdersData = [];
    
    // Generate 15 work orders with various statuses
    for (let i = 0; i < 15; i++) {
      const productIndex = i % Math.min(3, products.length);
      const product = products[productIndex];
      const bomIndex = i % boms.length;
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      
      const scheduledStart = new Date(now);
      scheduledStart.setDate(now.getDate() + (i - 7) * 1); // Spread around current date
      scheduledStart.setHours(8, 0, 0, 0);
      
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setDate(scheduledStart.getDate() + 3);
      scheduledEnd.setHours(17, 0, 0, 0);

      const quantityPlanned = Math.round((Math.random() * 500 + 50) * 10) / 10;
      const quantityProduced = status === 'completed' ? quantityPlanned :
                             status === 'in_progress' ? Math.round(quantityPlanned * (0.3 + Math.random() * 0.5) * 10) / 10 : 0;
      const quantityScrapped = quantityProduced > 0 ? Math.round(quantityProduced * Math.random() * 0.03 * 100) / 100 : 0;

      const year = scheduledStart.getFullYear();
      const month = String(scheduledStart.getMonth() + 1).padStart(2, '0');
      const seq = String(i + 1).padStart(4, '0');
      const reference = `OF-${year}-${month}-${seq}`;

      workOrdersData.push({
        reference,
        productId: product.id,
        bomId: boms[bomIndex]?.id,
        routingId: routings.length > 0 ? routings[0].id : null,
        workCenterId: workCenters[i % workCenters.length].id,
        assignedToId: user?.id,
        quantityPlanned,
        quantityProduced,
        quantityScrapped,
        quantityRemaining: Math.max(0, quantityPlanned - quantityProduced - quantityScrapped),
        priority,
        status,
        scheduledStart,
        scheduledEnd,
        actualStart: ['in_progress', 'completed'].includes(status) ? new Date(scheduledStart.getTime() + 3600000) : null,
        actualEnd: status === 'completed' ? new Date(scheduledEnd.getTime() - 3600000) : null,
        estimatedCost: Math.round(quantityPlanned * (product.costPrice || 100) * 1.3),
        actualCost: status === 'completed' ? Math.round(quantityProduced * (product.costPrice || 100) * 1.25) : 0,
        notes: status === 'paused' ? 'En attente de composants' : '',
        createdById: user?.id,
        companyId: company.id
      });
    }

    const workOrders = [];
    for (const wo of workOrdersData) {
      const existing = await db.workOrder.findUnique({ where: { reference: wo.reference } });
      if (!existing) {
        const { reference, ...woData } = wo; // Remove reference from data since it's used in findUnique
        const created = await db.workOrder.create({
          data: { ...woData, reference: wo.reference }, // Add it back for creation
          include: {
            product: { select: { id: true, name: true, code: true } },
            workCenter: { select: { id: true, name: true, type: true } },
            bom: { select: { id: true, code: true } }
          }
        });
        workOrders.push(created);
      } else {
        const withIncludes = await db.workOrder.findUnique({
          where: { id: existing.id },
          include: {
            product: { select: { id: true, name: true, code: true } },
            workCenter: { select: { id: true, name: true, type: true } },
            bom: { select: { id: true, code: true } }
          }
        });
        workOrders.push(withIncludes!);
      }
    }

    // ============================================================
    // 5. CREATE QUALITY CONTROLS
    // ============================================================
    console.log('  → Creating Quality Controls...');

    const qcTypes = ['incoming', 'in_process', 'final'];
    const qcStatuses = ['passed', 'passed', 'passed', 'failed', 'pending'];

    const qualityControls = [];
    
    // Create QC for completed and in-progress work orders
    const woWithQC = workOrders.filter(wo => ['completed', 'in_progress'].includes(wo.status));
    
    for (let i = 0; i < Math.min(woWithQC.length, 10); i++) {
      const wo = woWithQC[i];
      const qcType = qcTypes[i % qcTypes.length];
      const qcStatus = qcStatuses[i % qcStatuses.length];
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const seq = String(i + 1).padStart(4, '0');
      const reference = `QC-${year}-${month}-${seq}`;

      const qtyChecked = Math.round((Math.random() * 50 + 10) * 10) / 10;
      const qtyPassed = qcStatus === 'failed' ? Math.round(qtyChecked * 0.7 * 10) / 10 : 
                       qcStatus === 'passed' ? qtyChecked : Math.round(qtyChecked * 0.9 * 10) / 10;

      const existing = await db.qualityControl.findUnique({ where: { reference } });
      if (!existing) {
        const qc = await db.qualityControl.create({
          data: {
            reference,
            type: qcType as any,
            status: qcStatus as any,
            workOrderId: wo.id,
            productId: wo.productId,
            quantityChecked: qtyChecked,
            quantityPassed: qtyPassed,
            quantityFailed: Math.max(0, qtyChecked - qtyPassed),
            decision: qcStatus === 'passed' ? 'accept' : qcStatus === 'failed' ? 'reject' : undefined,
            decidedAt: ['passed', 'failed'].includes(qcStatus) ? new Date() : undefined,
            decidedBy: user?.name,
            companyId: company.id,
            createdById: user?.id,
            points: {
              create: [
                { specification: 'Dimension critique A', type: 'numeric', targetValue: 100, minValue: 98, maxValue: 102, unit: 'mm', sequence: 0, actualValue: qcStatus === 'failed' && i === 3 ? 95 : 100.5, isPassed: !(qcStatus === 'failed' && i === 3) },
                { specification: 'Finition surface', type: 'visual', sequence: 1, isPassed: qcStatus !== 'failed', textResult: qcStatus === 'failed' && i === 3 ? 'Rayure détectée' : 'Conforme' },
                { specification: 'Couleur/Pigmentation', type: 'visual', sequence: 2, isPassed: true, textResult: 'Conforme à l\'échantillon' },
                { specification: 'Poids net', type: 'numeric', targetValue: 500, minValue: 490, maxValue: 510, unit: 'g', sequence: 3, actualValue: 502, isPassed: true }
              ]
            }
          },
          include: {
            product: { select: { id: true, name: true, code: true } },
            workOrder: { select: { id: true, reference: true } },
            points: true
          }
        });
        qualityControls.push(qc);
      }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('✅ Production Module Seeded Successfully!');
    console.log(`   - Work Centers: ${workCenters.length}`);
    console.log(`   - BOMs: ${boms.length}`);
    console.log(`   - Routings: ${routings.length}`);
    console.log(`   - Work Orders: ${workOrders.length}`);
    console.log(`   - Quality Controls: ${qualityControls.length}`);

    return {
      success: true,
      message: 'Production module seeded successfully',
      data: {
        workCenters: workCenters.length,
        boms: boms.length,
        routings: routings.length,
        workOrders: workOrders.length,
        qualityControls: qualityControls.length
      }
    };

  } catch (error: any) {
    console.error('❌ Error seeding production data:', error);
    return { success: false, error: error.message };
  }
}
