// ============================================================
// ERP-DZ - DATABASE SEED SCRIPT
// Script d'initialisation des données de démonstration
// ============================================================

import { db } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// SCF CHART OF ACCOUNTS - PLAN COMPTABLE ALGÉRIEN
// ============================================================
const SCF_ACCOUNTS = [
  // CLASSE 1: COMPTES DE CAPITAUX
  { code: '10', name: 'Capital, réserves et assimilés', type: 'equity', class: '1', nature: 'header' },
  { code: '101', name: 'Capital social', type: 'equity', class: '1', nature: 'detail' },
  { code: '1011', name: 'Capital souscrit - non appelé', type: 'equity', class: '1', nature: 'detail' },
  { code: '1013', name: 'Capital souscrit - appelé, non versé', type: 'equity', class: '1', nature: 'detail' },
  { code: '102', name: 'Capital par dotation', type: 'equity', class: '1', nature: 'detail' },
  { code: '105', name: 'Primes liées au capital social', type: 'equity', class: '1', nature: 'detail' },
  { code: '106', name: 'Réserve légale', type: 'equity', class: '1', nature: 'detail' },
  { code: '1061', name: 'Réserve légale', type: 'equity', class: '1', nature: 'detail' },
  { code: '11', name: 'Report à nouveau', type: 'equity', class: '1', nature: 'header' },
  { code: '110', name: 'Report à nouveau créditeur', type: 'equity', class: '1', nature: 'detail' },
  { code: '119', name: 'Report à nouveau débiteur', type: 'equity', class: '1', nature: 'detail' },
  { code: '12', name: 'Résultat de l\'exercice', type: 'equity', class: '1', nature: 'header' },
  { code: '120', name: 'Résultat bénéfice', type: 'revenue', class: '1', nature: 'detail' },
  { code: '129', name: 'Résultat perte', type: 'expense', class: '1', nature: 'detail' },
  { code: '13', name: 'Subventions d\'investissement', type: 'equity', class: '1', nature: 'header' },
  { code: '131', name: 'Subventions d\'équipement', type: 'equity', class: '1', nature: 'detail' },
  { code: '139', name: 'Subventions d\'investissement inscrites au CR', type: 'equity', class: '1', nature: 'detail' },
  { code: '14', name: 'Provisions réglementées', type: 'liability', class: '1', nature: 'header' },
  { code: '142', name: 'Provisions pour investissements', type: 'liability', class: '1', nature: 'detail' },
  { code: '16', name: 'Emprunts et dettes assimilées', type: 'liability', class: '1', nature: 'header' },
  { code: '161', name: 'Emprunts obligataires', type: 'liability', class: '1', nature: 'detail' },
  { code: '163', name: 'Emprunts auprès établissements crédit', type: 'liability', class: '1', nature: 'detail' },
  { code: '164', name: 'Emprunts et dettes rattachés', type: 'liability', class: '1', nature: 'detail' },
  { code: '167', name: 'Dépôts et cautionnements reçus', type: 'liability', class: '1', nature: 'detail' },
  { code: '168', name: 'Autres emprunts et dettes assimilées', type: 'liability', class: '1', nature: 'detail' },
  { code: '17', name: 'Dettes rattachées à des participations', type: 'liability', class: '1', nature: 'header' },
  { code: '171', name: 'Dettes rattachées à des participations', type: 'liability', class: '1', nature: 'detail' },
  { code: '18', name: 'Comptes de liaison entre établissements', type: 'asset', class: '1', nature: 'header' },

  // CLASSE 2: COMPTES D\'IMMOBILISATIONS
  { code: '20', name: 'Immobilisations incorporelles', type: 'asset', class: '2', nature: 'header' },
  { code: '201', name: 'Frais de développement', type: 'asset', class: '2', nature: 'detail' },
  { code: '202', name: 'Brevets, licences, logiciels', type: 'asset', class: '2', nature: 'detail' },
  { code: '205', name: 'Concessions et droits similaires', type: 'asset', class: '2', nature: 'detail' },
  { code: '206', name: 'Droit au bail', type: 'asset', class: '2', nature: 'detail' },
  { code: '207', name: 'Fonds commercial', type: 'asset', class: '2', nature: 'detail' },
  { code: '208', name: 'Autres immobilisations incorporelles', type: 'asset', class: '2', nature: 'detail' },
  { code: '21', name: 'Immobilisations corporelles', type: 'asset', class: '2', nature: 'header' },
  { code: '211', name: 'Terrains', type: 'asset', class: '2', nature: 'detail' },
  { code: '212', name: 'Agencements et aménagements de terrains', type: 'asset', class: '2', nature: 'detail' },
  { code: '213', name: 'Constructions', type: 'asset', class: '2', nature: 'detail' },
  { code: '214', name: 'Constructions sur sol d\'autrui', type: 'asset', class: '2', nature: 'detail' },
  { code: '215', name: 'Installations techniques, matériel outillage', type: 'asset', class: '2', nature: 'detail' },
  { code: '216', name: 'Matériel de transport', type: 'asset', class: '2', nature: 'detail' },
  { code: '217', name: 'Agencements, constructions sur bien propre', type: 'asset', class: '2', nature: 'detail' },
  { code: '218', name: 'Autres immobilisations corporelles', type: 'asset', class: '2', nature: 'detail' },
  { code: '22', name: 'Immobilisations financières', type: 'asset', class: '2', nature: 'header' },
  { code: '221', name: 'Titres de participation', type: 'asset', class: '2', nature: 'detail' },
  { code: '226', name: 'Prêts participatifs', type: 'asset', class: '2', nature: 'detail' },
  { code: '228', name: 'Dépôts et cautionnements versés', type: 'asset', class: '2', nature: 'detail' },
  { code: '27', name: 'Amortissements des immobilisations', type: 'asset', class: '2', nature: 'header' },
  { code: '280', name: 'Amort. immob. incorporelles', type: 'asset', class: '2', nature: 'detail' },
  { code: '281', name: 'Amort. immob. corporelles', type: 'asset', class: '2', nature: 'detail' },
  { code: '282', name: 'Amort. immob. financières', type: 'asset', class: '2', nature: 'detail' },
  { code: '29', name: 'Provisions pour dépréciation immo.', type: 'asset', class: '2', nature: 'header' },

  // CLASSE 3: COMPTES DE STOCKS
  { code: '30', name: 'Stocks de marchandises', type: 'asset', class: '3', nature: 'header' },
  { code: '309', name: 'Provision pour dépréciation stocks', type: 'asset', class: '3', nature: 'detail' },
  { code: '31', name: 'Matières premières et fournitures', type: 'asset', class: '3', nature: 'header' },
  { code: '32', name: 'Autres approvisionnements', type: 'asset', class: '3', nature: 'header' },
  { code: '33', name: 'En-cours de production biens/services', type: 'asset', class: '3', nature: 'header' },
  { code: '34', name: 'Produits intermédiaires et résiduels', type: 'asset', class: '3', nature: 'header' },
  { code: '35', name: 'Stocks de produits finis', type: 'asset', class: '3', nature: 'header' },
  { code: '37', name: 'Stocks provenant d\'immobilisations', type: 'asset', class: '3', nature: 'header' },

  // CLASSE 4: COMPTES DE TIERS
  { code: '40', name: 'Fournisseurs et comptes rattachés', type: 'liability', class: '4', nature: 'header' },
  { code: '400', name: 'Fournisseurs', type: 'liability', class: '4', nature: 'detail' },
  { code: '401', name: 'Fournisseurs - Effets à payer', type: 'liability', class: '4', nature: 'detail' },
  { code: '41', name: 'Clients et comptes rattachés', type: 'asset', class: '4', nature: 'header' },
  { code: '410', name: 'Clients', type: 'asset', class: '4', nature: 'detail' },
  { code: '411', name: 'Clients - Comptes généraux', type: 'asset', class: '4', nature: 'detail' },
  { code: '416', name: 'Clients douteux ou litigieux', type: 'asset', class: '4', nature: 'detail' },
  { code: '42', name: 'Personnel et comptes rattachés', type: 'liability', class: '4', nature: 'header' },
  { code: '421', name: 'Personnel - Rémunérations dues', type: 'liability', class: '4', nature: 'detail' },
  { code: '43', name: 'Organismes sociaux et État', type: 'liability', class: '4', nature: 'header' },
  { code: '430', name: 'Organismes sociaux', type: 'liability', class: '4', nature: 'detail' },
  { code: '431', name: 'Caisse nationale sécurité sociale (CNAS)', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'cnas' },
  { code: '432', name: 'Caisse retraite (CASNOS)', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'casnos' },
  { code: '44', name: 'État et collectivités publiques', type: 'liability', class: '4', nature: 'header' },
  { code: '441', name: 'État - Impôt sur bénéfices (IBS)', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'ibs' },
  { code: '442', name: 'État - TVA due', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'tva_collectee' },
  { code: '4421', name: 'TVA collectée', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'tva_collectee' },
  { code: '4427', name: 'TVA déductible', type: 'asset', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'tva_deductible' },
  { code: '443', name: 'État - Impôt sur revenu global (IRG)', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'irg' },
  { code: '444', name: 'État - Taxe activité professionnelle (TAP)', type: 'liability', class: '4', nature: 'detail', isTaxAccount: true, taxType: 'tap' },
  { code: '45', name: 'Groupe et associés', type: 'asset', class: '4', nature: 'header' },
  { code: '47', name: 'Comptes de régularisation passif', type: 'liability', class: '4', nature: 'header' },
  { code: '48', name: 'Charges ou produits constatés d\'avance', type: 'liability', class: '4', nature: 'header' },

  // CLASSE 5: COMPTES FINANCIERS
  { code: '51', name: 'Valeurs à encaisser', type: 'asset', class: '5', nature: 'header' },
  { code: '512', name: 'Banques', type: 'asset', class: '5', nature: 'detail' },
  { code: '514', name: 'Chèques postaux (CCP)', type: 'asset', class: '5', nature: 'detail' },
  { code: '53', name: 'Caisse', type: 'asset', class: '5', nature: 'header' },
  { code: '531', name: 'Caisse siège', type: 'asset', class: '5', nature: 'detail' },
  { code: '54', name: 'Régies d\'avance et accréditifs', type: 'asset', class: '5', nature: 'header' },
  { code: '58', name: 'Régies d\'avance et accréditifs', type: 'asset', class: '5', nature: 'header' },
  { code: '59', name: 'Provisions pour dépréciation comptes financiers', type: 'asset', class: '5', nature: 'header' },

  // CLASSE 6: COMPTES DE CHARGES
  { code: '60', name: 'Achats consommés', type: 'expense', class: '6', nature: 'header' },
  { code: '601', name: 'Achats stockés - Matières premières', type: 'expense', class: '6', nature: 'detail' },
  { code: '602', name: 'Achats stockés - Autres approvisionnements', type: 'expense', class: '6', nature: 'detail' },
  { code: '604', name: 'Achats stockés - Emballages', type: 'expense', class: '6', nature: 'detail' },
  { code: '605', name: 'Achats stockés - Marchandises', type: 'expense', class: '6', nature: 'detail' },
  { code: '61', name: 'Services extérieurs', type: 'expense', class: '6', nature: 'header' },
  { code: '611', name: 'Sous-traitance générale', type: 'expense', class: '6', nature: 'detail' },
  { code: '612', name: 'Redevances de crédit-bail', type: 'expense', class: '6', nature: 'detail' },
  { code: '613', name: 'Locations', type: 'expense', class: '6', nature: 'detail' },
  { code: '614', name: 'Charges locatives et copropriété', type: 'expense', class: '6', nature: 'detail' },
  { code: '615', name: 'Entretien et réparations', type: 'expense', class: '6', nature: 'detail' },
  { code: '616', name: 'Assurances', type: 'expense', class: '6', nature: 'detail' },
  { code: '62', name: 'Autres services extérieurs', type: 'expense', class: '6', nature: 'header' },
  { code: '621', name: 'Personnel extérieur', type: 'expense', class: '6', nature: 'detail' },
  { code: '622', name: 'Honoraires', type: 'expense', class: '6', nature: 'detail' },
  { code: '623', name: 'Publicité, publications, relations publiques', type: 'expense', class: '6', nature: 'detail' },
  { code: '624', name: 'Transports de biens et transports collectifs', type: 'expense', class: '6', nature: 'detail' },
  { code: '625', name: 'Déplacements, missions et réceptions', type: 'expense', class: '6', nature: 'detail' },
  { code: '626', name: 'Frais postaux et télécommunications', type: 'expense', class: '6', nature: 'detail' },
  { code: '63', name: 'Charges de personnel', type: 'expense', class: '6', nature: 'header' },
  { code: '631', name: 'Rémunérations du personnel', type: 'expense', class: '6', nature: 'detail' },
  { code: '633', name: 'Indemnités et avantages divers', type: 'expense', class: '6', nature: 'detail' },
  { code: '635', name: 'Cotisations sociales patronales', type: 'expense', class: '6', nature: 'detail' },
  { code: '64', name: 'Impôts taxes et versements assimilés', type: 'expense', class: '6', nature: 'header' },
  { code: '641', name: 'Impôts directs', type: 'expense', class: '6', nature: 'detail' },
  { code: '642', name: 'Impôts et taxes indirects', type: 'expense', class: '6', nature: 'detail' },
  { code: '65', name: 'Charges opérationnelles', type: 'expense', class: '6', nature: 'header' },
  { code: '66', name: 'Charges financières', type: 'expense', class: '6', nature: 'header' },
  { code: '67', name: 'Charges exceptionnelles', type: 'expense', class: '6', nature: 'header' },
  { code: '68', name: 'Dotations aux amortissements et provisions', type: 'expense', class: '6', nature: 'header' },
  { code: '69', name: 'Impôts sur les résultats', type: 'expense', class: '6', nature: 'header' },

  // CLASSE 7: COMPTES DE PRODUITS
  { code: '70', name: 'Ventes produits fabriqués', type: 'revenue', class: '7', nature: 'header' },
  { code: '701', name: 'Ventes de produits finis', type: 'revenue', class: '7', nature: 'detail' },
  { code: '71', name: 'Production stockée', type: 'revenue', class: '7', nature: 'header' },
  { code: '72', name: 'Production immobilisée', type: 'revenue', class: '7', nature: 'header' },
  { code: '73', name: 'Variation des stocks de produits', type: 'revenue', class: '7', nature: 'header' },
  { code: '74', name: 'Subventions d\'exploitation', type: 'revenue', class: '7', nature: 'header' },
  { code: '75', name: 'Autres produits opérationnels', type: 'revenue', class: '7', nature: 'header' },
  { code: '76', name: 'Produits financiers', type: 'revenue', class: '7', nature: 'header' },
  { code: '77', name: 'Produits exceptionnels', type: 'revenue', class: '7', nature: 'header' },
  { code: '78', name: 'Transferts de charges', type: 'revenue', class: '7', nature: 'header' }
];

// JOURNAL TYPES FOR ALGERIAN ACCOUNTING
const JOURNALS = [
  { code: 'VT', name: 'Journal des Ventes', type: 'sale', defaultDebitAccount: '411', defaultCreditAccount: '701' },
  { code: 'AC', name: 'Journal des Achats', type: 'purchase', defaultDebitAccount: '601', defaultCreditAccount: '400' },
  { code: 'BQ', name: 'Journal de Banque', type: 'bank', defaultDebitAccount: '512', defaultCreditAccount: '512' },
  { code: 'CA', name: 'Journal de Caisse', type: 'cash', defaultDebitAccount: '531', defaultCreditAccount: '531' },
  { code: 'OD', name: 'Journal Opérations Diverses', type: 'miscellaneous', defaultDebitAccount: null, defaultCreditAccount: null },
  { code: 'PA', name: 'Journal de Paie', type: 'payroll', defaultDebitAccount: '631', defaultCreditAccount: '421' }
];

export async function seedDatabase() {
  console.log('🌱 Starting ERP-DZ database seed...\n');

  try {
    // 1. Create Demo Company
    const company = await prisma.company.upsert({
      where: { id: 'demo-company-001' },
      update: {},
      create: {
        id: 'demo-company-001',
        name: 'ERP-DZ DEMO SARL',
        nameAr: 'شركة تجريبية للعرض',
        commercialName: 'ERP-DZ Algérie',
        legalForm: 'SARL',
        capital: 1000000,
        currency: 'DZD',
        
        // Identifiants Algériens
        rc: '16/00-123456B',
        nif: '000016001234567',
        nis: '000012345600012',
        ai: '160010012345678',
        taxRegime: 'reel',
        
        // Contact
        address: '123 Rue Didouche Mourad',
        addressAr: '123 شارع ديدوش مراد',
        postalCode: '16000',
        city: 'Alger',
        wilayaCode: '16',
        phone: '+213 21 23 45 67',
        fax: '+213 21 23 45 68',
        email: 'contact@erp-dz.dz',
        website: 'www.erp-dz.dz',
        
        fiscalYearStart: 1,
        language: 'fr',
        isActive: true
      }
    });
    console.log('✅ Company created:', company.name);

    // 2. Create Chart of Accounts (SCF)
    let accountsCreated = 0;
    for (const account of SCF_ACCOUNTS) {
      await prisma.chartOfAccount.upsert({
        where: { code: account.code },
        update: {},
        create: {
          code: account.code,
          name: account.name,
          type: account.type,
          class: account.class,
          nature: account.nature || 'detail',
          isLeaf: !account.nature || account.nature === 'detail',
          isTaxAccount: account.isTaxAccount || false,
          taxType: account.taxType || null,
          reconcileable: ['411', '410', '400', '401', '512', '514', '531'].includes(account.code),
          companyId: company.id
        }
      });
      accountsCreated++;
    }
    console.log(`✅ Chart of Accounts created: ${accountsCreated} SCF accounts`);

    // 3. Create Journals
    let journalsCreated = 0;
    for (const journal of JOURNALS) {
      await prisma.journal.upsert({
        where: { code: journal.code },
        update: {},
        create: {
          code: journal.code,
          name: journal.name,
          type: journal.type,
          defaultDebitAccount: journal.defaultDebitAccount,
          defaultCreditAccount: journal.defaultCreditAccount,
          companyId: company.id
        }
      });
      journalsCreated++;
    }
    console.log(`✅ Journals created: ${journalsCreated}`);

    // 4. Create Sample Warehouse
    const warehouse = await prisma.warehouse.upsert({
      where: { id: 'warehouse-main' },
      update: {},
      create: {
        id: 'warehouse-main',
        name: 'Entrepôt Principal',
        code: 'ENT-01',
        address: 'Zone Industrielle Oued Smar',
        contact: 'Responsable Stock',
        phone: '+213 555 123 456',
        isActive: true,
        companyId: company.id
      }
    });
    console.log('✅ Warehouse created:', warehouse.name);

    // 5. Create Sample Products
    const products = [
      { code: 'PROD-001', name: 'Ordinateur Portable Dell', salePrice: 85000, purchasePrice: 72000, tvaRate: 19, type: 'stockable' as const },
      { code: 'PROD-002', name: 'Écran LG 24 pouces', salePrice: 28000, purchasePrice: 23000, tvaRate: 19, type: 'stockable' as const },
      { code: 'PROD-003', name: 'Clavier AZERTY USB', salePrice: 2500, purchasePrice: 1800, tvaRate: 19, type: 'stockable' as const },
      { code: 'PROD-004', name: 'Souris Logitech M185', salePrice: 1800, purchasePrice: 1200, tvaRate: 19, type: 'stockable' as const },
      { code: 'SERV-001', name: 'Installation Windows', salePrice: 5000, purchasePrice: 0, tvaRate: 19, type: 'service' as const },
      { code: 'SERV-002', name: 'Maintenance informatique (forfait)', salePrice: 8000, purchasePrice: 0, tvaRate: 9, type: 'service' as const }
    ];

    let productsCreated = 0;
    for (const prod of products) {
      await prisma.product.upsert({
        where: { code: prod.code },
        update: {},
        create: {
          ...prod,
          costPrice: prod.purchasePrice,
          unitOfMeasure: 'U',
          trackStock: prod.type === 'stockable',
          canBeSold: true,
          canBePurchased: prod.type !== 'service',
          isActive: true,
          companyId: company.id
        }
      });
      productsCreated++;
    }
    console.log(`✅ Products created: ${productsCreated}`);

    // 6. Create Sample Partners
    const partners = [
      { name: 'Entreprise ABC Spécial', type: 'customer' as const, nif: '000116001234567', city: 'Alger', wilayaCode: '16', category: 'Grand compte' },
      { name: 'Société XYZ Import', type: 'supplier' as const, nif: '000135007654321', city: 'Oran', wilayaCode: '31', category: 'Informatique' },
      { name: 'Mohamed Benali', type: 'customer' as const, isCompany: false, city: 'Constantine', wilayaCode: '25', category: 'Particulier' },
      { name: 'Ets Kamel & Frères', type: 'both' as const, nif: '000125009876543', city: 'Blida', wilayaCode: '09', category: 'PME' }
    ];

    let partnersCreated = 0;
    for (const partner of partners) {
      await prisma.partner.create({
        data: {
          ...partner,
          paymentTerms: '30',
          creditLimit: 500000,
          isActive: true,
          companyId: company.id
        }
      });
      partnersCreated++;
    }
    console.log(`✅ Partners created: ${partnersCreated}`);

    // 7. Create Sample Employee
    const employee = await prisma.employee.upsert({
      where: { matricule: 'EMP-0001' },
      update: {},
      create: {
        matricule: 'EMP-0001',
        firstName: 'Ahmed',
        lastName: 'Mansouri',
        firstNameAr: 'أحمد',
        lastNameAr: 'منصوري',
        gender: 'M',
        cin: '001234567890123',
        cnasNumber: '0012345678',
        casnosNumber: '198901234567890',
        workEmail: 'a.mansouri@erp-dz.dz',
        phone: '+213 550 123 456',
        department: 'Direction Générale',
        jobTitle: 'Directeur Technique',
        jobPosition: 'Cadre Supérieur',
        contractType: 'cdi',
        contractStartDate: new Date('2020-03-15'),
        employeeStatus: 'active',
        hireDate: new Date('2020-03-15'),
        baseSalary: 65000,
        dailyRate: 3095,
        hourlyRate: 375,
        bankName: 'CPA',
        bankAccount: '00123456789012345678',
        isActive: true,
        companyId: company.id
      }
    });
    console.log('✅ Employee created:', employee.firstName, employee.lastName);

    // 8. Create Bank Account
    const bankAccount = await prisma.bankAccount.upsert({
      where: { accountNumber: '00123456789' },
      update: {},
      create: {
        name: 'Compte Courant CPA Alger',
        bankName: 'CPA',
        accountNumber: '00123456789',
        rib: '00123456789012345678',
        currency: 'DZD',
        accountType: 'current',
        balance: 2500000,
        minBalance: 100000,
        isActive: true,
        companyId: company.id
      }
    });
    console.log('✅ Bank Account created:', bankAccount.bankName);

    console.log('\n🎉 Database seed completed successfully!');
    return { success: true, message: 'Database seeded successfully' };

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

// Run if called directly
async function main() {
  await seedDatabase();
}

main();
