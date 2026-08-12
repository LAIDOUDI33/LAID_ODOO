// ============================================================
// MAINTENANCE MODULE SEED DATA
// Sample data for Equipment, MOs, Plans, Spare Parts, OEE
// ============================================================

import { db } from '@/lib/db';

export async function seedMaintenanceData() {
  try {
    console.log('🔧 Seeding Maintenance Module...');
    
    // Get existing company and user
    const company = await db.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return { success: false, error: 'No active company found' };
    }

    let user = await db.user.findFirst({ where: { role: 'admin' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'maintenance@hassiba.dz',
          name: 'Technicien Maintenance',
          role: 'admin',
          companyId: company.id
        }
      });
    }

    // Get work centers for linking equipment
    const workCenters = await db.workCenter.findMany({
      where: { companyId: company.id },
      take: 6
    });

    // ============================================================
    // 1. CREATE EQUIPMENT
    // ============================================================
    console.log('  → Creating Equipment...');
    
    const equipmentData = [
      // Machines de production
      {
        code: 'MCH-CNC-001',
        name: 'Tour CNC Haas VF-2',
        category: 'production',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'HA-VF2-2023-0142',
        status: 'operational',
        location: 'Zone A - Atelier Usinage',
        purchasePrice: 45000000,
        operatingHours: 4250,
        lastMaintenanceAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        nextMaintenanceAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        workCenterId: workCenters[1]?.id, // Usinage CNC
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'MCH-CNC-002',
        name: 'Centre d\'usinage DMG Mori',
        category: 'production',
        manufacturer: 'DMG Mori',
        model: 'CMX 600 V',
        serialNumber: 'DMG-CMX-2022-089',
        status: 'in_operation',
        location: 'Zone A - Atelier Usinage',
        purchasePrice: 68000000,
        operatingHours: 3800,
        lastMaintenanceAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        workCenterId: workCenters[1]?.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'MCH-PRES-001',
        name: 'Presse Hydraulique 200T',
        category: 'production',
        manufacturer: 'Schuler',
        model: 'PHC 200',
        serialNumber: 'SCH-PHC-2021-033',
        status: 'under_maintenance',
        location: 'Zone B - Formage',
        purchasePrice: 32000000,
        operatingHours: 6100,
        lastMaintenanceAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'MCH-ROB-001',
        name: 'Robot KUKA KR10 R1100',
        category: 'production',
        manufacturer: 'KUKA',
        model: 'KR10 R1100 sixx',
        serialNumber: 'KUKA-KR10-2023-007',
        status: 'operational',
        location: 'Zone C - Assemblage',
        purchasePrice: 28000000,
        operatingHours: 2100,
        lastMaintenanceAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        workCenterId: workCenters[0]?.id, // Assemblage
        companyId: company.id,
        createdById: user.id
      },
      // Équipements auxiliaires
      {
        code: 'EQP-COMP-001',
        name: 'Compresseur à Vis Atlas Copco',
        category: 'auxiliary',
        manufacturer: 'Atlas Copco',
        model: 'GA 37 VSD+',
        serialNumber: 'ATL-GA37-2020-156',
        status: 'operational',
        location: 'Salle Utilitaire',
        purchasePrice: 8500000,
        operatingHours: 18000,
        lastMaintenanceAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'EQP-GEN-001',
        name: 'Groupe Électrogène 500kVA',
        category: 'utility',
        manufacturer: 'Caterpillar',
        model: 'C18',
        serialNumber: 'CAT-C18-2019-042',
        status: 'standby',
        location: 'Salle Electrique',
        purchasePrice: 15000000,
        operatingHours: 1200,
        lastMaintenanceAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'EQP-CLIM-001',
        name: 'Centrale de Traitement d\'Air CTA',
        category: 'utility',
        manufacturer: 'Carrier',
        model: 'CTA 40000 m³/h',
        serialNumber: 'CAR-CTA-2021-078',
        status: 'broken',
        location: 'Toiture Bâtiment A',
        purchasePrice: 4200000,
        operatingHours: 24000,
        lastMaintenanceAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: null,
        companyId: company.id,
        createdById: user.id
      },
      // Équipements de mesure
      {
        code: 'EQP-MES-001',
        name: 'Machine de Mesure Tridimensionnelle',
        category: 'measurement',
        manufacturer: 'Zeiss',
        model: 'CONTURA 7/7/6',
        serialNumber: 'ZIE-CON-2022-012',
        status: 'operational',
        location: 'Laboratoire Métrologie',
        purchasePrice: 22000000,
        operatingHours: 3200,
        lastMaintenanceAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        workCenterId: workCenters[3]?.id, // Contrôle Qualité
        companyId: company.id,
        createdById: user.id
      },
      // Manutention
      {
        code: 'EQP-CHAR-001',
        name: 'Chariot Élévateur Toyota 2.5T',
        category: 'transport',
        manufacturer: 'Toyota',
        model: '8FBMT25',
        serialNumber: 'TOY-8FBM-2023-056',
        status: 'in_operation',
        location: 'Parc Chariots',
        purchasePrice: 3500000,
        operatingHours: 1450,
        lastMaintenanceAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'EQP-PONT-001',
        name: 'Pont Roulant 10T Demag',
        category: 'transport',
        manufacturer: 'Demag',
        model: 'EKP 100',
        serialNumber: 'DEM-EKP-2020-008',
        status: 'operational',
        location: 'Hall Principal',
        purchasePrice: 5500000,
        operatingHours: 5200,
        lastMaintenanceAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      },
      // IT
      {
        code: 'EQP-SERV-001',
        name: 'Serveur Principal Dell PowerEdge',
        category: 'it',
        manufacturer: 'Dell EMC',
        model: 'PowerEdge R750xs',
        serialNumber: 'DELL-R750-2024-001',
        status: 'operational',
        location: 'Serveur Room',
        purchasePrice: 2800000,
        operatingHours: 8760, // 1 year continuous
        lastMaintenanceAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        nextMaintenanceAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        createdById: user.id
      }
    ];

    const equipmentList = [];
    for (const eq of equipmentData) {
      const existing = await db.equipment.findUnique({ where: { code: eq.code } });
      if (!existing) {
        const created = await db.equipment.create({ data: eq });
        equipmentList.push(created);
      } else {
        equipmentList.push(existing);
      }
    }

    // ============================================================
    // 2. CREATE MAINTENANCE PLANS (PM)
    // ============================================================
    console.log('  → Creating Maintenance Plans...');
    
    const plansData = [
      {
        code: 'PM-CNC-01',
        name: 'Maintenance Préventive Tour CNC',
        description: JSON.stringify([
          'Vérifier niveau huile de coupe',
          'Contrôler pression hydraulique',
          'Inspecter broche et guidages',
          'Nettoyer convoyeur de copeaux',
          'Calibrer outils automatiques'
        ]),
        type: 'preventive',
        frequency: 'monthly',
        intervalValue: 1,
        durationEstimated: 240, // 4 hours
        equipmentId: equipmentList[0].id,
        nextDueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isActive: true,
        companyId: company.id
      },
      {
        code: 'PM-CNC-02',
        name: 'Maintenance Préventive Centre DMG',
        description: JSON.stringify([
          'Vérifier lubrification axes',
          'Contrôler système refroidissement',
          'Inspecter changeur d\'outils',
          'Tester palpeur 3D'
        ]),
        type: 'preventive',
        frequency: 'monthly',
        intervalValue: 1,
        durationEstimated: 300,
        equipmentId: equipmentList[1].id,
        nextDueAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        isActive: true,
        companyId: company.id
      },
      {
        code: 'PM-ROB-01',
        name: 'Maintenance Robot KUKA',
        description: JSON.stringify([
          'Vérifier état câbles data/power',
          'Graisser articulations',
          'Calibrer axe zéro',
          'Tester effecteurs finaux',
          'Sauvegarder programme'
        ]),
        type: 'preventive',
        frequency: 'quarterly',
        intervalValue: 1,
        durationEstimated: 480,
        equipmentId: equipmentList[3].id,
        nextDueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        isActive: true,
        companyId: company.id
      },
      {
        code: 'PM-COMP-01',
        name: 'Entretien Compresseur',
        description: JSON.stringify([
          'Vérifier niveau d\'huile',
          'Contrôler filtres air',
          'Purger condensats',
          'Test sécurité surpression'
        ]),
        type: 'preventive',
        frequency: 'biweekly',
        intervalValue: 2,
        durationEstimated: 60,
        equipmentId: equipmentList[4].id,
        nextDueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isActive: true,
        companyId: company.id
      },
      {
        code: 'PM-GEN-01',
        name: 'Test Groupe Électrogène',
        description: JSON.stringify([
          'Démarrer moteur (test)',
          'Vérifier niveau carburant',
          'Contrôler batterie',
          'Tester transfert automatique'
        ]),
        type: 'preventive',
        frequency: 'weekly',
        intervalValue: 1,
        durationEstimated: 60,
        equipmentId: equipmentList[5].id,
        nextDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        companyId: company.id
      },
      {
        // Overdue plan!
        code: 'PM-CLIM-01',
        name: 'Maintenance CTA Climatisation',
        description: JSON.stringify([
          'Nettoyer filtres',
          'Vérifier circuit frigorifique',
          'Contrôler ventilateurs',
          'Tester régulation'
        ]),
        type: 'preventive',
        frequency: 'quarterly',
        intervalValue: 1,
        durationEstimated: 240,
        equipmentId: equipmentList[6].id, // Broken equipment
        nextDueAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // OVERDUE!
        isActive: true,
        companyId: company.id
      }
    ];

    const plansList = [];
    for (const plan of plansData) {
      const existing = await db.maintenancePlan.findUnique({ where: { code: plan.code } });
      if (!existing) {
        const created = await db.maintenancePlan.create({
          data: plan,
          include: { equipment: { select: { id: true, name: true, code: true } } }
        });
        plansList.push(created);
      } else {
        const withEquip = await db.maintenancePlan.findUnique({
          where: { id: existing.id },
          include: { equipment: { select: { id: true, name: true, code: true } } }
        });
        plansList.push(withEquip!);
      }
    }

    // ============================================================
    // 3. CREATE MAINTENANCE ORDERS (OT)
    // ============================================================
    console.log('  → Creating Maintenance Orders...');
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const moTypes = ['corrective', 'preventive', 'predictive', 'improvement'];
    const moStatuses = ['draft', 'planned', 'released', 'ready', 'in_progress', 'paused', 'completed', 'cancelled'];
    const moPriorities = ['low', 'normal', 'high', 'critical', 'emergency'];
    
    const ordersData = [
      {
        reference: `OM-${year}-${month}-0001`,
        title: 'Réparation presse hydraulique - Fuite vérin principal',
        description: 'Fuite d\'huile détectée sur le vérin principal. Remplacement joint spi nécessaire.',
        type: 'corrective',
        priority: 'critical',
        status: 'in_progress',
        equipmentId: equipmentList[2].id, // Presse en panne
        requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        estimatedDuration: 480,
        downtimeHours: 48,
        laborCost: 45000,
        partsCost: 125000,
        totalCost: 170000,
        assignedToId: user.id,
        planId: null,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0002`,
        title: 'Intervention CTA climatisation en panne',
        description: 'Unité hors service. Compresseur HS probable. Diagnostic complet requis.',
        type: 'corrective',
        priority: 'emergency',
        status: 'planned',
        equipmentId: equipmentList[6].id, // CTA broken
        requestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        estimatedDuration: 360,
        downtimeHours: 720, // 30 days so far
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        assignedToId: user.id,
        planId: plansList[5]?.id, // PM-CLIM-01 overdue
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0003`,
        title: 'MP Mensuelle Tour CNC Haas',
        description: 'Maintenance préventive mensuelle selon check-list standard.',
        type: 'preventive',
        priority: 'normal',
        status: 'completed',
        equipmentId: equipmentList[0].id,
        requestedDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        actualEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        estimatedDuration: 240,
        downtimeHours: 4,
        laborCost: 16000,
        partsCost: 3500,
        totalCost: 19500,
        workPerformed: 'Remplacement filtre hydraulique, calibration broche, nettoyage général',
        rootCause: 'Usure normale',
        correctiveAction: 'Effectué selon planning',
        validatedBy: user.name,
        validatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        assignedToId: user.id,
        planId: plansList[0]?.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0004`,
        title: 'Amélioration carter de protection robot',
        description: 'Installation carter de protection supplémentaire zone articulation 4.',
        type: 'improvement',
        priority: 'low',
        status: 'completed',
        equipmentId: equipmentList[3].id, // Robot
        requestedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        actualEnd: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
        estimatedDuration: 480,
        downtimeHours: 8,
        laborCost: 24000,
        partsCost: 45000,
        totalCost: 69000,
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0005`,
        title: 'Diagnostic vibration centre DMG',
        description: 'Analyse vibratoire suite bruit anormal sur broche. Collecte données pour analyse.',
        type: 'predictive',
        priority: 'high',
        status: 'in_progress',
        equipmentId: equipmentList[1].id, // DMG Mori
        requestedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now()),
        actualStart: new Date(),
        estimatedDuration: 120,
        downtimeHours: 2,
        laborCost: 8000,
        partsCost: 0,
        totalCost: 8000,
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0006`,
        title: 'MP Hebdomadaire Groupe Électrogène',
        description: 'Test de démarrage et contrôle niveaux.',
        type: 'preventive',
        priority: 'normal',
        status: 'completed',
        equipmentId: equipmentList[5].id, // Générateur
        requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        actualEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        estimatedDuration: 60,
        downtimeHours: 1,
        laborCost: 2500,
        partsCost: 0,
        totalCost: 2500,
        workPerformed: 'Démarrage OK, niveaux OK, batterie chargée',
        assignedToId: user.id,
        planId: plansList[4]?.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0007`,
        title: 'Remplacement roulement pont roulant',
        description: 'Bruit anormal sur galet de translation. Inspection et remplacement préventif.',
        type: 'corrective',
        priority: 'high',
        status: 'planned',
        equipmentId: equipmentList[9].id, // Pont roulant
        requestedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        estimatedDuration: 360,
        downtimeHours: 0,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0008`,
        title: 'Calibration MMT Zeiss annuelle',
        description: 'Calibration complète avec artefact céramique certifié COFRAC.',
        type: 'preventive',
        priority: 'normal',
        status: 'released',
        equipmentId: equipmentList[7].id, // MMT
        requestedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        estimatedDuration: 480,
        downtimeHours: 0,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        externalCost: 150000, // Prestataire externe
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0009`,
        title: 'Entretien chariot élévateur',
        description: 'Vidange, contrôle freins, inspection fourches.',
        type: 'preventive',
        priority: 'normal',
        status: 'completed',
        equipmentId: equipmentList[8].id, // Chariot
        requestedDate: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        actualEnd: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        estimatedDuration: 120,
        downtimeHours: 2,
        laborCost: 6500,
        partsCost: 12000,
        totalCost: 18500,
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0010`,
        title: 'Mise à jour BIOS et firmware serveur Dell',
        description: 'Application des dernières mises à jour de sécurité Dell EMC.',
        type: 'improvement',
        priority: 'low',
        status: 'draft',
        equipmentId: equipmentList[10].id, // Serveur
        requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedDuration: 120,
        downtimeHours: 0,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        assignedToId: user.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0011`,
        title: 'Inspection compresseur - anomalie bruit',
        description: 'Opérateur signale bruit inhabituel en fin de cycle. Diagnostic requis.',
        type: 'corrective',
        priority: 'normal',
        status: 'paused',
        equipmentId: equipmentList[4].id, // Compresseur
        requestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedDuration: 120,
        downtimeHours: 0,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        symptoms: 'Bruit inhabituel en fin de cycle',
        assignedToId: user.id,
        planId: plansList[3]?.id,
        companyId: company.id,
        createdById: user.id
      },
      {
        reference: `OM-${year}-${month}-0012`,
        title: 'MP Compresseur bimensuelle',
        description: 'Entretien standard selon check-list constructeur.',
        type: 'preventive',
        priority: 'normal',
        status: 'completed',
        equipmentId: equipmentList[4].id,
        requestedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        scheduledStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        actualStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        actualEnd: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        estimatedDuration: 60,
        downtimeHours: 1,
        laborCost: 2500,
        partsCost: 1800,
        totalCost: 4300,
        assignedToId: user.id,
        planId: plansList[3]?.id,
        companyId: company.id,
        createdById: user.id
      }
    ];

    const ordersList = [];
    for (const order of ordersData) {
      const existing = await db.maintenanceOrder.findUnique({ where: { reference: order.reference } });
      if (!existing) {
        const created = await db.maintenanceOrder.create({
          data: order,
          include: {
            equipment: { select: { id: true, name: true, code: true, category: true } },
            assignedTo: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true } }
          }
        });
        ordersList.push(created);
      } else {
        const withIncludes = await db.maintenanceOrder.findUnique({
          where: { id: existing.id },
          include: {
            equipment: { select: { id: true, name: true, code: true, category: true } },
            assignedTo: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true } }
          }
        });
        ordersList.push(withIncludes!);
      }
    }

    // ============================================================
    // 4. CREATE SPARE PARTS
    // ============================================================
    console.log('  → Creating Spare Parts...');
    
    const sparePartsData = [
      {
        code: 'SP-JOINT-001',
        name: 'Joint Spi Hydraulique 80x95x12',
        category: 'mechanical',
        supplier: 'Spécialités Jointures France',
        supplierRef: 'SJF-HS-809512',
        minStock: 5,
        maxStock: 25,
        reorderPoint: 10,
        currentStock: 12,
        reservedStock: 3,
        unitOfMeasure: 'U',
        purchasePrice: 2500,
        currency: 'DZD',
        leadTimeDays: 14,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[0].id, equipmentList[1].id, equipmentList[2].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-FILTRE-001',
        name: 'Filtre Hydraulique Pall HC9600',
        category: 'mechanical',
        supplier: 'Pall Corporation',
        supplierRef: 'PAL-HC9600FKS',
        minStock: 10,
        maxStock: 50,
        reorderPoint: 20,
        currentStock: 28,
        reservedStock: 5,
        unitOfMeasure: 'U',
        purchasePrice: 8500,
        currency: 'DZD',
        leadTimeDays: 21,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[0].id, equipmentList[1].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-COURR-001',
        name: 'Courroie Trapézoïdale SPZ 1320',
        category: 'mechanical',
        supplier: 'Optibelt',
        supplierRef: 'OPT-SPZ1320',
        minStock: 8,
        maxStock: 30,
        reorderPoint: 15,
        currentStock: 4, // LOW STOCK!
        reservedStock: 2,
        unitOfMeasure: 'U',
        purchasePrice: 1800,
        currency: 'DZD',
        leadTimeDays: 7,
        isCritical: false,
        compatibleWith: JSON.stringify([equipmentList[4].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-GRAISSE-001',
        name: 'Graisse Klüberplex UH1 84 KG',
        category: 'consumable',
        supplier: 'Klüber Lubrication',
        supplierRef: 'KLÜ-UH1-84KG',
        minStock: 2,
        maxStock: 10,
        reorderPoint: 4,
        currentStock: 6,
        reservedStock: 1,
        unitOfMeasure: 'Kit',
        purchasePrice: 12500,
        currency: 'DZD',
        leadTimeDays: 30,
        isCritical: false,
        compatibleWith: JSON.stringify([equipmentList[3].id, equipmentList[8].id, equipmentList[9].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-FUSIBLE-001',
        name: 'Fusible NH00 63A Siemens',
        category: 'electrical',
        supplier: 'Siemens',
        supplierRef: 'SIE-5SJ4-NH00-63A',
        minStock: 20,
        maxStock: 100,
        reorderPoint: 40,
        currentStock: 45,
        reservedStock: 10,
        unitOfMeasure: 'U',
        purchasePrice: 850,
        currency: 'DZD',
        leadTimeDays: 5,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[5].id, equipmentList[10].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-ROUL-001',
        name: 'Roulement SKF NU 2210 ECP',
        category: 'mechanical',
        supplier: 'SKF',
        supplierRef: 'SKF-NU2210-ECP',
        minStock: 4,
        maxStock: 16,
        reorderPoint: 6,
        currentStock: 0, // OUT OF STOCK!
        reservedStock: 0,
        unitOfMeasure: 'U',
        purchasePrice: 18500,
        currency: 'DZD',
        leadTimeDays: 21,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[9].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-VERIN-001',
        name: 'Kit Réparation Vérin Hydraulique 200T',
        category: 'hydraulic',
        supplier: 'Hydromotion',
        supplierRef: 'HYD-KIT-VRN-200T',
        minStock: 1,
        maxStock: 3,
        reorderPoint: 1,
        currentStock: 1,
        reservedStock: 1, // All reserved for current repair!
        unitOfMeasure: 'Kit',
        purchasePrice: 85000,
        currency: 'DZD',
        leadTimeDays: 45,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[2].id]),
        companyId: company.id,
        createdById: user.id
      },
      {
        code: 'SP-COMPRES-001',
        name: 'Compresseur Climatisation Scroll Copeland',
        category: 'electronic',
        supplier: 'Copeland',
        supplierRef: 'COP-ZR72KC-TFD',
        minStock: 0,
        maxStock: 1,
        reorderPoint: 0,
        currentStock: 0,
        reservedStock: 0,
        unitOfMeasure: 'U',
        purchasePrice: 450000,
        currency: 'DZD',
        leadTimeDays: 90,
        isCritical: true,
        compatibleWith: JSON.stringify([equipmentList[6].id]),
        companyId: company.id,
        createdById: user.id
      }
    ];

    const sparePartsList = [];
    for (const sp of sparePartsData) {
      const existing = await db.sparePart.findUnique({ where: { code: sp.code } });
      if (!existing) {
        const created = await db.sparePart.create({ data: sp });
        sparePartsList.push(created);
      } else {
        sparePartsList.push(existing);
      }
    }

    // ============================================================
    // 5. CREATE OEE RECORDS
    // ============================================================
    console.log('  → Creating OEE Records...');
    
    const shifts = ['Matin', 'Après-midi', 'Nuit'];
    const oeeRecords = [];

    // Generate OEE records for the last 30 days for main equipment
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const recordDate = new Date();
      recordDate.setDate(recordDate.getDate() - dayOffset);
      recordDate.setHours(17, 0, 0, 0); // End of day

      // Only weekdays
      if (recordDate.getDay() === 0 || recordDate.getDay() === 6) continue;

      // Record for CNC machine (equipmentList[0])
      if (dayOffset % 2 === 0 || dayOffset < 7) {
        const plannedTime = 480; // 8 hours
        const randomFactor = Math.random();
        
        let operatingTime, idleTime, downtime, setupTime;
        
        if (randomFactor > 0.85) {
          // Bad day - some issues
          operatingTime = 380 + Math.random() * 50;
          idleTime = 20 + Math.random() * 30;
          downtime = 20 + Math.random() * 50;
          setupTime = 20;
        } else {
          // Normal/good day
          operatingTime = 420 + Math.random() * 50;
          idleTime = 5 + Math.random() * 15;
          downtime = Math.random() * 15;
          setupTime = 15;
        }

        const totalProduced = Math.floor(operatingTime / 8); // ~1 per 8 min
        const goodQuantity = Math.floor(totalProduced * (0.95 + Math.random() * 0.04));
        const defectiveQty = totalProduced - goodQuantity;

        const availability = (operatingTime / plannedTime) * 100;
        const performance = ((1 * totalProduced) / (operatingTime)) * 100;
        const quality = totalProduced > 0 ? (goodQuantity / totalProduced) * 100 : 100;
        const oee = (availability * performance * quality) / 10000;

        oeeRecords.push({
          recordDate,
          shift: 'Matin',
          periodStart: new Date(recordDate.getTime() - 8 * 60 * 60 * 1000),
          periodEnd: recordDate,
          equipmentId: equipmentList[0].id,
          plannedTime,
          operatingTime,
          idleTime,
          downtime,
          setupTime,
          totalProduced,
          goodQuantity,
          defectiveQty,
          idealCycleTime: 1,
          availability: Math.min(availability, 100),
          performance: Math.min(performance, 150),
          quality: Math.min(quality, 100),
          oee: Math.min(oee, 100),
          operatorName: 'Operateur CNC-1',
          notes: '',
          companyId: company.id,
          createdById: user.id
        });
      }

      // Record for Robot (equipmentList[3]) - less frequent
      if (dayOffset % 3 === 0) {
        const plannedTime = 480;
        const operatingTime = 450 + Math.random() * 30;
        const totalProduced = Math.floor(operatingTime / 2);
        const goodQuantity = Math.floor(totalProduced * 0.99);
        const defectiveQty = totalProduced - goodQuantity;

        oeeRecords.push({
          recordDate,
          shift: 'Matin',
          periodStart: new Date(recordDate.getTime() - 8 * 60 * 60 * 1000),
          periodEnd: recordDate,
          equipmentId: equipmentList[3].id,
          plannedTime,
          operatingTime,
          idleTime: 5,
          downtime: Math.random() * 10,
          setupTime: 15,
          totalProduced,
          goodQuantity,
          defectiveQty,
          idealCycleTime: 2,
          availability: (operatingTime / plannedTime) * 100,
          performance: ((2 * totalProduced) / operatingTime) * 100,
          quality: (goodQuantity / totalProduced) * 100,
          oee: 0, // Will be calculated
          operatorName: 'Roboticien-1',
          companyId: company.id,
          createdById: user.id
        });
      }
    }

    // Calculate OEE for each record and batch insert
    for (const record of oeeRecords) {
      if (!record.oee && record.availability && record.performance && record.quality) {
        record.oee = (record.availability * record.performance * record.quality) / 10000;
      }
      
      await db.oEERecord.create({ data: record });
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('✅ Maintenance Module Seeded Successfully!');
    console.log(`   - Equipment: ${equipmentList.length}`);
    console.log(`   - Maintenance Plans: ${plansList.length}`);
    console.log(`   - Maintenance Orders: ${ordersList.length}`);
    console.log(`   - Spare Parts: ${sparePartsList.length}`);
    console.log(`   - OEE Records: ${oeeRecords.length}`);

    return {
      success: true,
      message: 'Maintenance module seeded successfully',
      data: {
        equipment: equipmentList.length,
        plans: plansList.length,
        orders: ordersList.length,
        spareParts: sparePartsList.length,
        oeeRecords: oeeRecords.length
      }
    };

  } catch (error: any) {
    console.error('❌ Error seeding maintenance data:', error);
    return { success: false, error: error.message };
  }
}
