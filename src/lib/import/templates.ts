// ============================================================
// Data Import System - Module Templates Definitions
// Pre-configured templates for each ERP module
// ============================================================

import { ImportModule, ImportTemplateDefinition } from './types';

/**
 * Get template definition for a specific module
 */
export function getModuleTemplate(module: ImportModule): ImportTemplateDefinition {
  const templates: Record<ImportModule, ImportTemplateDefinition> = {
    employees: getEmployeeTemplate(),
    chart_of_accounts: getChartAccountTemplate(),
    products: getProductTemplate(),
    partners: getPartnerTemplate(),
    invoices: getInvoiceTemplate(),
    bills: getBillTemplate(),
    attendance: getAttendanceTemplate(),
    journal_entries: getJournalEntryTemplate(),
    warehouses: getWarehouseTemplate(),
    stock_movements: getStockMovementTemplate(),
    sales_orders: getSalesOrderTemplate(),
    purchase_orders: getPurchaseOrderTemplate(),
    fixed_assets: getFixedAssetTemplate(),
    tax_declarations: getTaxDeclarationTemplate(),
    contracts: getContractTemplate(),
    bank_transactions: getBankTransactionTemplate(),
    payroll_records: getPayrollTemplate(),
    leaves: getLeaveTemplate()
  };
  
  return templates[module];
}

/**
 * Get all available import modules
 */
export function getAvailableModules(): { module: ImportModule; name: string; description: string; icon: string }[] {
  return [
    { module: 'employees', name: 'Employés', description: 'Importer les employés et leurs informations', icon: 'Users' },
    { module: 'chart_of_accounts', name: 'Plan Comptable', description: 'Importer le plan comptable (PCN)', icon: 'BookOpen' },
    { module: 'products', name: 'Produits & Services', description: 'Importer le catalogue produits/services', icon: 'Package' },
    { module: 'partners', name: 'Clients & Fournisseurs', description: 'Importer les tiers (clients, fournisseurs)', icon: 'Handshake' },
    { module: 'invoices', name: 'Factures Clients', description: 'Importer l\'historique des factures clients', icon: 'FileText' },
    { module: 'bills', name: 'Factures Fournisseurs', description: 'Importer l\'historique des factures fournisseurs', icon: 'Receipt' },
    { module: 'attendance', name: 'Présences', description: 'Importer les données de présence', icon: 'Clock' },
    { module: 'journal_entries', name: 'Écritures Comptables', description: 'Importer les écritures (soldes d\'ouverture)', icon: 'PenLine' },
    { module: 'warehouses', name: 'Entrepôts', description: 'Configurer les entrepôts et emplacements', icon: 'Warehouse' },
    { module: 'stock_movements', name: 'Mouvements de Stock', description: 'Importer l\'état du stock initial', icon: 'ArrowLeftRight' },
    { module: 'sales_orders', name: 'Commandes Clients', description: 'Importer les commandes clients', icon: 'ShoppingCart' },
    { module: 'purchase_orders', name: 'Commandes Fournisseurs', description: 'Importer les commandes fournisseurs', icon: 'ClipboardList' },
    { module: 'fixed_assets', name: 'Immobilisations', description: 'Importer les immobilisations', icon: 'Building' },
    { module: 'payroll_records', name: 'Paie Historique', description: 'Importer l\'historique de paie', icon: 'Banknote' },
    { module: 'leaves', name: 'Congés & Absences', description: 'Importer les soldes de congés', icon: 'Calendar' }
  ];
}

/**
 * Get recommended import order for initial data migration
 */
export function getRecommendedImportOrder(): ImportModule[] {
  return [
    // 1. Master data first
    'chart_of_accounts',   // Chart of accounts
    'partners',            // Customers & suppliers
    'warehouses',          // Warehouse locations
    'products',            // Products & services
    'employees',           // Employee data
    
    // 2. Transactional data (depends on master data)
    'stock_movements',     // Initial stock levels
    'journal_entries',     // Opening balances
    
    // 3. Historical transactions
    'invoices',            // Historical invoices
    'bills',               // Historical bills
    'sales_orders',        // Sales orders
    'purchase_orders',     // Purchase orders
    'attendance',          // Attendance history
    'payroll_records',     // Payroll history
    'leaves',              // Leave balances
    'fixed_assets',        // Fixed assets registry
  ];
}

// ============================================================
// Module Template Definitions
// ============================================================

function getEmployeeTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Employés',
    module: 'employees',
    description: 'Template pour importer les employés avec leurs informations personnelles et professionnelles',
    version: '1.0',
    columns: [
      { key: 'firstName', label: 'Prénom', type: 'string', required: true, example: 'Mohamed', minLength: 2, maxLength: 100 },
      { key: 'lastName', label: 'Nom', type: 'string', required: true, example: 'Benali', minLength: 2, maxLength: 100 },
      { key: 'employeeId', label: 'Matricule', type: 'string', required: false, example: 'EMP001', maxLength: 20 },
      { key: 'email', label: 'Email', type: 'email', required: false, example: 'm.benali@company.dz' },
      { key: 'phone', label: 'Téléphone', type: 'phone', required: false, example: '0555123456' },
      { key: 'gender', label: 'Sexe', type: 'select', required: false, options: ['M', 'F', 'Homme', 'Femme'], example: 'M' },
      { key: 'birthDate', label: 'Date de naissance', type: 'date', required: false, format: 'YYYY-MM-DD', example: '1990-05-15' },
      { key: 'hireDate', label: "Date d'embauche", type: 'date', required: true, format: 'YYYY-MM-DD', example: '2020-01-15' },
      { key: 'department', label: 'Département', type: 'string', required: false, example: 'Informatique' },
      { key: 'position', label: 'Poste', type: 'string', required: false, example: 'Développeur Senior' },
      { key: 'contractType', label: 'Type de contrat', type: 'select', required: false, options: ['CDI', 'CDD', 'Stage', 'Temps partiel'], example: 'CDI' },
      { key: 'salary', label: 'Salaire (DZD)', type: 'number', required: false, min: 0, example: 85000 },
      { key: 'bankName', label: 'Banque', type: 'string', required: false, example: 'BNA' },
      { key: 'bankAccount', label: 'Compte bancaire', type: 'string', required: false, example: '000123456789' },
      { key: 'address', label: 'Adresse', type: 'string', required: false, example: '123 Rue Didouche Mourad' },
      { key: 'city', label: 'Ville', type: 'string', required: false, example: 'Alger' },
      { key: 'wilayaCode', label: 'Wilaya', type: 'select', required: false, options: ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58'], example: '16' },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['active', 'inactive', 'on_leave'], example: 'active' }
    ],
    requiredColumns: ['firstName', 'lastName', 'hireDate'],
    optionalColumns: ['employeeId', 'email', 'phone', 'gender', 'birthDate', 'department', 'position', 'contractType', 'salary'],
    validationRules: {
      firstName: [
        { type: 'required', message: 'Le prénom est obligatoire' },
        { type: 'format', message: 'Le prénom ne doit contenir que des lettres', params: { pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/ } }
      ],
      lastName: [
        { type: 'required', message: 'Le nom est obligatoire' }
      ],
      email: [
        { type: 'unique', message: 'Cet email est déjà utilisé' }
      ],
      employeeId: [
        { type: 'unique', message: 'Ce matricule existe déjà' }
      ],
      hireDate: [
        { type: 'required', message: "La date d'embauche est obligatoire" }
      ]
    },
    sampleData: [
      { firstName: 'Mohamed', lastName: 'Benali', employeeId: 'EMP001', email: 'm.benali@company.dz', phone: '0555123456', gender: 'M', birthDate: '1990-05-15', hireDate: '2020-01-15', department: 'IT', position: 'Développeur', contractType: 'CDI', salary: 85000, bankName: 'BNA', bankAccount: '00123456789', city: 'Alger', wilayaCode: '16', status: 'active' },
      { firstName: 'Fatima', lastName: 'Zerhouni', employeeId: 'EMP002', email: 'f.zerhouni@company.dz', phone: '0661234567', gender: 'F', birthDate: '1988-09-22', hireDate: '2019-06-01', department: 'Comptabilité', position: 'Comptable', contractType: 'CDI', salary: 70000, city: 'Oran', wilayaCode: '31', status: 'active' }
    ]
  };
}

function getChartAccountTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Plan Comptable',
    module: 'chart_of_accounts',
    description: 'Importer le plan comptable selon le PCN (Plan Comptable National Algérien)',
    version: '1.0',
    columns: [
      { key: 'code', label: 'Compte', type: 'string', required: true, example: '411100', maxLength: 20, pattern: '^\\d{4,}$' },
      { key: 'name', label: 'Libellé (FR)', type: 'string', required: true, example: 'Clients - Compte courant', maxLength: 200 },
      { key: 'nameAr', label: 'Libellé (AR)', type: 'string', required: false, example: 'العملاء - الحساب الجاري' },
      { key: 'type', label: 'Type', type: 'select', required: true, options: ['asset', 'liability', 'equity', 'revenue', 'expense'], example: 'asset' },
      { key: 'category', label: 'Catégorie', type: 'string', required: false, example: 'Clients' },
      { key: 'parentCode', label: 'Compte parent', type: 'string', required: false, example: '4111' },
      { key: 'balance', label: 'Solde initial', type: 'number', required: false, min: 0, example: 1500000 },
      { key: 'taxDeductible', label: 'TVA déductible', type: 'boolean', required: false, example: 'true' },
      { key: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
    ],
    requiredColumns: ['code', 'name', 'type'],
    optionalColumns: ['nameAr', 'category', 'parentCode', 'balance', 'taxDeductible'],
    validationRules: {
      code: [
        { type: 'required', message: 'Le numéro de compte est obligatoire' },
        { type: 'unique', message: 'Ce compte existe déjà' },
        { type: 'format', message: 'Le code doit être numérique (ex: 411100)', params: { pattern: /^\d{4,}$/ } }
      ],
      name: [
        { type: 'required', message: 'Le libellé est obligatoire' }
      ],
      type: [
        { type: 'required', message: 'Le type de compte est obligatoire' },
        { type: 'enum', message: 'Type invalide (asset, liability, equity, revenue, expense)', params: { values: ['asset', 'liability', 'equity', 'revenue', 'expense'] } }
      ],
      parentCode: [
        { type: 'reference', message: 'Le compte parent n\'existe pas', params: { model: 'chartOfAccount', field: 'code' } }
      ]
    },
    sampleData: [
      { code: '101', name: 'Capital social', type: 'equity', category: 'Capitaux propres', isActive: true },
      { code: '4111', name: 'Clients', type: 'asset', category: 'Créances commerciales', parentCode: '411', isActive: true },
      { code: '411100', name: 'Clients - Compte courant', type: 'asset', category: 'Clients', parentCode: '4111', balance: 2500000, isActive: true },
      { code: '4011', name: 'Fournisseurs', type: 'liability', category: 'Dettes commerciales', parentCode: '401', isActive: true },
      { code: '5121', name: 'Banques', type: 'asset', category: 'Trésorerie', parentCode: '512', balance: 8500000, isActive: true }
    ]
  };
}

function getProductTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Produits & Services',
    module: 'products',
    description: 'Importer le catalogue de produits et services',
    version: '1.0',
    columns: [
      { key: 'name', label: 'Désignation', type: 'string', required: true, example: 'Ordinateur Portable Dell', maxLength: 200 },
      { key: 'sku', label: 'Référence', type: 'string', required: false, example: 'DL-LAT5550', maxLength: 50 },
      { key: 'barcode', label: 'Code barres', type: 'string', required: false, example: '4894461201234', maxLength: 50 },
      { key: 'type', label: 'Type', type: 'select', required: true, options: ['product', 'service', 'bundle'], example: 'product' },
      { key: 'category', label: 'Catégorie', type: 'string', required: false, example: 'Informatique' },
      { key: 'unit', label: 'Unité', type: 'string', required: false, example: 'Unité', defaultValue: 'Unité' },
      { key: "purchasePrice", label: "Prix d'achat (DZD)", type: 'number', required: false, min: 0, example: 85000 },
      { key: 'salePrice', label: 'Prix de vente (DZD)', type: 'number', required: false, min: 0, example: 110000 },
      { key: 'taxRate', label: 'Taux TVA (%)', type: 'number', required: false, min: 0, max: 100, example: 19 },
      { key: 'stockQuantity', label: 'Stock initial', type: 'number', required: false, min: 0, example: 25 },
      { key: 'minStock', label: 'Stock minimum', type: 'number', required: false, min: 0, example: 5 },
      { key: 'warehouse', label: 'Entrepôt', type: 'string', required: false, example: 'Principal' },
      { key: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
    ],
    requiredColumns: ['name', 'type'],
    optionalColumns: ['sku', 'barcode', 'category', 'unit', 'purchasePrice', 'salePrice', 'taxRate', 'stockQuantity'],
    validationRules: {
      name: [{ type: 'required', message: 'La désignation est obligatoire' }],
      sku: [{ type: 'unique', message: 'Cette référence existe déjà' }],
      barcode: [{ type: 'unique', message: 'Ce code barres existe déjà' }],
      salePrice: [{ type: 'range', message: 'Le prix doit être positif', params: { min: 0 } }]
    },
    sampleData: [
      { name: 'Ordinateur Portable Dell Latitude 5550', sku: 'DL-LAT5550', type: 'product', category: 'Informatique', unit: 'Unité', purchasePrice: 85000, salePrice: 110000, taxRate: 19, stockQuantity: 25, minStock: 5, warehouse: 'Principal', isActive: true },
      { name: 'Licence Office 365 Annuelle', sku: 'O365-1Y', type: 'service', category: 'Logiciels', unit: 'Licence', purchasePrice: 35000, salePrice: 45000, taxRate: 19, isActive: true }
    ]
  };
}

function getPartnerTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Tiers (Clients/Fournisseurs)',
    module: 'partners',
    description: 'Importer les clients et fournisseurs',
    version: '1.0',
    columns: [
      { key: 'name', label: 'Raison sociale', type: 'string', required: true, example: 'Entreprise ABC SpA', maxLength: 200 },
      { key: 'type', label: 'Type', type: 'select', required: true, options: ['customer', 'supplier', 'both'], example: 'customer' },
      { key: 'contactPerson', label: 'Contact', type: 'string', required: false, example: 'M. Karim' },
      { key: 'email', label: 'Email', type: 'email', required: false, example: 'contact@abc.dz' },
      { key: 'phone', label: 'Téléphone', type: 'phone', required: false, example: '021456789' },
      { key: 'address', label: 'Adresse', type: 'string', required: false, example: '45 Rue de la Liberté' },
      { key: 'city', label: 'Ville', type: 'string', required: false, example: 'Alger' },
      { key: 'wilayaCode', label: 'Wilaya', type: 'string', required: false, example: '16' },
      { key: 'nif', label: 'NIF', type: 'string', required: false, example: '000016001600001', maxLength: 15 },
      { key: 'nis', label: 'NIS', type: 'string', required: false, example: '00001616000001', maxLength: 15 },
      { key: 'rc', label: 'RC', type: 'string', required: false, example: '16/AA-001234', maxLength: 20 },
      { key: 'paymentTerms', label: 'Conditions paiement (jours)', type: 'number', required: false, min: 0, example: 30 },
      { key: 'creditLimit', label: 'Limite crédit (DZD)', type: 'number', required: false, min: 0, example: 500000 },
      { key: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
    ],
    requiredColumns: ['name', 'type'],
    optionalColumns: ['contactPerson', 'email', 'phone', 'address', 'city', 'nif', 'nis', 'rc', 'paymentTerms'],
    validationRules: {
      name: [{ type: 'required', message: 'La raison sociale est obligatoire' }],
      type: [{ type: 'enum', message: 'Type doit être: customer, supplier ou both', params: { values: ['customer', 'supplier', 'both'] } }],
      nif: [{ type: 'unique', message: 'Ce NIF existe déjà' }],
      email: [{ type: 'unique', message: 'Cet email est déjà utilisé' }]
    },
    sampleData: [
      { name: 'ABC Distribution SpA', type: 'customer', contactPerson: 'M. Karim', email: 'contact@abc.dz', phone: '021456789', address: '45 Rue de la Liberté', city: 'Alger', wilayaCode: '16', nif: '000016001600001', nis: '00001616000001', rc: '16/AA-001234', paymentTerms: 30, creditLimit: 500000, isActive: true },
      { name: 'TechSupply Sarl', type: 'supplier', contactPerson: 'Mme. Samira', email: 'achat@techsupply.dz', phone: '0555987654', city: 'Oran', wilayaCode: '31', nif: '000031003100003', rc: '31/BB-005678', paymentTerms: 45, isActive: true }
    ]
  };
}

function getInvoiceTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Factures Clients',
    module: 'invoices',
    description: "Importer l'historique des factures clients",
    version: '1.0',
    columns: [
      { key: 'invoiceNumber', label: 'N° Facture', type: 'string', required: true, example: 'FAC-2024-001', maxLength: 50 },
      { key: 'partnerName', label: 'Client', type: 'string', required: true, example: 'ABC Distribution' },
      { key: 'date', label: 'Date', type: 'date', required: true, format: 'YYYY-MM-DD', example: '2024-01-15' },
      { key: 'dueDate', label: "Échéance", type: 'date', required: false, format: 'YYYY-MM-DD', example: '2024-02-14' },
      { key: 'subtotal', label: 'Total HT', type: 'number', required: false, min: 0, example: 500000 },
      { key: 'taxAmount', label: 'TVA', type: 'number', required: false, min: 0, example: 95000 },
      { key: 'totalAmount', label: 'Total TTC', type: 'number', required: true, min: 0, example: 595000 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['paid', 'unpaid', 'partial', 'overdue'], example: 'paid' },
      { key: 'paymentStatus', label: 'Statut paiement', type: 'select', required: false, options: ['paid', 'unpaid', 'partial'], example: 'paid' },
      { key: 'notes', label: 'Notes', type: 'string', required: false, example: 'Paiement reçu par virement' }
    ],
    requiredColumns: ['invoiceNumber', 'partnerName', 'date', 'totalAmount'],
    optionalColumns: ['dueDate', 'subtotal', 'taxAmount', 'status', 'notes'],
    validationRules: {
      invoiceNumber: [
        { type: 'required', message: 'Le numéro de facture est obligatoire' },
        { type: 'unique', message: 'Ce numéro de facture existe déjà' }
      ],
      partnerName: [{ type: 'required', message: 'Le client est obligatoire' }],
      date: [{ type: 'required', message: 'La date est obligatoire' }],
      totalAmount: [{ type: 'range', message: 'Le total doit être positif', params: { min: 0 } }]
    },
    sampleData: [
      { invoiceNumber: 'FAC-2024-001', partnerName: 'ABC Distribution', date: '2024-01-15', dueDate: '2024-02-14', subtotal: 500000, taxAmount: 95000, totalAmount: 595000, status: 'paid', paymentStatus: 'paid', notes: 'Paiement reçu' },
      { invoiceNumber: 'FAC-2024-002', partnerName: 'XYZ Entreprise', date: '2024-01-20', dueDate: '2024-02-19', subtotal: 275000, taxAmount: 52250, totalAmount: 327250, status: 'unpaid', paymentStatus: 'unpaid' }
    ]
  };
}

function getBillTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Factures Fournisseurs',
    module: 'bills',
    description: "Importer l'historique des factures fournisseurs",
    version: '1.0',
    columns: [
      { key: 'billNumber', label: 'N° Facture', type: 'string', required: true, example: 'FRN-2024-001', maxLength: 50 },
      { key: 'supplierName', label: 'Fournisseur', type: 'string', required: true, example: 'TechSupply' },
      { key: 'date', label: 'Date', type: 'date', required: true, format: 'YYYY-MM-DD', example: '2024-01-10' },
      { key: 'dueDate', label: "Échéance", type: 'date', required: false, format: 'YYYY-MM-DD', example: '2024-02-24' },
      { key: 'subtotal', label: 'Total HT', type: 'number', required: false, min: 0, example: 300000 },
      { key: 'taxAmount', label: 'TVA', type: 'number', required: false, min: 0, example: 57000 },
      { key: 'totalAmount', label: 'Total TTC', type: 'number', required: true, min: 0, example: 357000 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['paid', 'unpaid', 'partial'], example: 'unpaid' },
      { key: 'paymentMethod', label: 'Mode paiement', type: 'select', required: false, options: ['virement', 'espèces', 'chèque', 'traite'], example: 'virement' },
      { key: 'notes', label: 'Notes', type: 'string', required: false, example: 'À payer fin mois' }
    ],
    requiredColumns: ['billNumber', 'supplierName', 'date', 'totalAmount'],
    optionalColumns: ['dueDate', 'subtotal', 'taxAmount', 'status', 'paymentMethod', 'notes'],
    validationRules: {
      billNumber: [
        { type: 'required', message: 'Le numéro de facture est obligatoire' },
        { type: 'unique', message: 'Ce numéro de facture existe déjà' }
      ],
      supplierName: [{ type: 'required', message: 'Le fournisseur est obligatoire' }],
      date: [{ type: 'required', message: 'La date est obligatoire' }]
    },
    sampleData: [
      { billNumber: 'FRN-2024-001', supplierName: 'TechSupply', date: '2024-01-10', dueDate: '2024-02-24', subtotal: 300000, taxAmount: 57000, totalAmount: 357000, status: 'unpaid', notes: 'À payer' }
    ]
  };
}

function getAttendanceTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Présences',
    module: 'attendance',
    description: 'Importer les données de présence des employés',
    version: '1.0',
    columns: [
      { key: 'employeeId', label: 'Matricule ou Email', type: 'string', required: true, example: 'EMP001' },
      { key: 'date', label: 'Date', type: 'date', required: true, format: 'YYYY-MM-DD', example: '2024-01-15' },
      { key: 'checkIn', label: 'Arrivée (HH:mm)', type: 'string', required: false, example: '08:30' },
      { key: 'checkOut', label: 'Départ (HH:mm)', type: 'string', required: false, example: '17:30' },
      { key: 'breakMinutes', label: 'Pause (min)', type: 'number', required: false, min: 0, example: 60 },
      { key: 'workHours', label: 'Heures travaillées', type: 'number', required: false, min: 0, max: 24, example: 8 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['present', 'absent', 'late', 'half_day', 'leave', 'holiday'], example: 'present' },
      { key: 'overtimeHours', label: 'Heures sup.', type: 'number', required: false, min: 0, example: 1.5 },
      { key: 'notes', label: 'Notes', type: 'string', required: false, example: '' }
    ],
    requiredColumns: ['employeeId', 'date'],
    optionalColumns: ['checkIn', 'checkOut', 'breakMinutes', 'workHours', 'status', 'overtimeHours'],
    validationRules: {
      employeeId: [{ type: 'required', message: 'L\'identifiant employé est obligatoire' }],
      date: [{ type: 'required', message: 'La date est obligatoire' }],
      checkIn: [{ type: 'format', message: 'Format HH:mm requis', params: { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ } }],
      checkOut: [{ type: 'format', message: 'Format HH:mm requis', params: { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ } }]
    },
    sampleData: [
      { employeeId: 'EMP001', date: '2024-01-15', checkIn: '08:30', checkOut: '17:30', breakMinutes: 60, workHours: 8, status: 'present' },
      { employeeId: 'EMP002', date: '2024-01-15', checkIn: '09:00', checkOut: '18:15', breakMinutes: 45, workHours: 8.5, status: 'late', overtimeHours: 0.5 }
    ]
  };
}

function getJournalEntryTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Écritures Comptables',
    module: 'journal_entries',
    description: 'Importer les écritures comptables (soldes d\'ouverture, opérations diverses)',
    version: '1.0',
    columns: [
      { key: 'date', label: 'Date', type: 'date', required: true, format: 'YYYY-MM-DD', example: '2024-01-01' },
      { key: 'journalCode', label: 'Journal', type: 'string', required: true, example: 'OD', maxLength: 10 },
      { key: 'label', label: 'Libellé', type: 'string', required: true, example: 'Solde d\'ouverture', maxLength: 200 },
      { key: 'reference', label: 'Référence', type: 'string', required: false, example: 'OD-2024-001' },
      { key: 'accountCode_1', label: 'Compte N°1', type: 'string', required: true, example: '411100' },
      { key: 'label_1', label: 'Libellé ligne 1', type: 'string', required: true, example: 'Clients' },
      { key: 'debit_1', label: 'Débit ligne 1', type: 'number', required: false, min: 0, example: 2500000 },
      { key: 'credit_1', label: 'Crédit ligne 1', type: 'number', required: false, min: 0, example: 0 },
      { key: 'accountCode_2', label: 'Compte N°2', type: 'string', required: true, example: '5121' },
      { key: 'label_2', label: 'Libellé ligne 2', type: 'string', required: true, example: 'Banque' },
      { key: 'debit_2', label: 'Débit ligne 2', type: 'number', required: false, min: 0, example: 0 },
      { key: 'credit_2', label: 'Crédit ligne 2', type: 'number', required: false, min: 0, example: 2500000 }
    ],
    requiredColumns: ['date', 'journalCode', 'label'],
    optionalColumns: ['reference'],
    validationRules: {
      date: [{ type: 'required', message: 'La date est obligatoire' }],
      journalCode: [{ type: 'required', message: 'Le journal est obligatoire' }],
      label: [{ type: 'required', message: 'Le libellé est obligatoire' }]
    },
    sampleData: [
      { date: '2024-01-01', journalCode: 'OD', label: 'Solde d\'ouverture exercice 2024', reference: 'OD-2024-001', accountCode_1: '411100', label_1: 'Clients - Solde initial', debit_1: 2500000, credit_1: 0, accountCode_2: '5121', label_2: 'Banque CPA - Solde initial', debit_2: 0, credit_2: 2500000 }
    ]
  };
}

function getWarehouseTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Entrepôts',
    module: 'warehouses',
    description: 'Configurer les entrepôts et lieux de stockage',
    version: '1.0',
    columns: [
      { key: 'name', label: 'Nom', type: 'string', required: true, example: 'Entrepôt Principal' },
      { key: 'code', label: 'Code', type: 'string', required: false, example: 'ENT-01' },
      { key: 'address', label: 'Adresse', type: 'string', required: false, example: 'Zone Industrielle' },
      { key: 'city', label: 'Ville', type: 'string', required: false, example: 'Alger' },
      { key: 'type', label: 'Type', type: 'select', required: false, options: ['principal', 'secondaire', 'magasin', 'depot'], example: 'principal' },
      { key: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
    ],
    requiredColumns: ['name'],
    optionalColumns: ['code', 'address', 'city', 'type'],
    validationRules: {
      name: [{ type: 'required', message: 'Le nom de l\'entrepôt est obligatoire' }]
    },
    sampleData: [
      { name: 'Entrepôt Principal', code: 'ENT-01', address: 'Zone Industrielle Oued Smar', city: 'Alger', type: 'principal', isActive: true },
      { name: 'Magasin Vente', code: 'MAG-01', address: 'Centre Ville', city: 'Alger', type: 'magasin', isActive: true }
    ]
  };
}

function getStockMovementTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Mouvements Stock',
    module: 'stock_movements',
    description: 'Importer l\'état du stock initial par produit et entrepôt',
    version: '1.0',
    columns: [
      { key: 'sku', label: 'Référence produit', type: 'string', required: true, example: 'DL-LAT5550' },
      { key: 'productName', label: 'Produit', type: 'string', required: false, example: 'Ordinateur Dell' },
      { key: 'warehouse', label: 'Entrepôt', type: 'string', required: true, example: 'Principal' },
      { key: 'quantity', label: 'Quantité', type: 'number', required: true, min: 0, example: 25 },
      { key: 'unitCost', label: 'Coût unitaire', type: 'number', required: false, min: 0, example: 85000 },
      { key: 'location', label: 'Emplacement', type: 'string', required: false, example: 'A-01-03' },
      { key: 'notes', label: 'Notes', type: 'string', required: false, example: 'Stock inventorié au 01/01/2024' }
    ],
    requiredColumns: ['sku', 'warehouse', 'quantity'],
    optionalColumns: ['productName', 'unitCost', 'location', 'notes'],
    validationRules: {
      sku: [{ type: 'required', message: 'La référence produit est obligatoire' }],
      warehouse: [{ type: 'required', message: 'L\'entrepôt est obligatoire' }],
      quantity: [{ type: 'range', message: 'La quantité doit être positive', params: { min: 0 } }]
    },
    sampleData: [
      { sku: 'DL-LAT5550', productName: 'Ordinateur Dell', warehouse: 'Principal', quantity: 25, unitCost: 85000, location: 'A-01-03', notes: 'Stock initial' }
    ]
  };
}

function getSalesOrderTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Commandes Clients',
    module: 'sales_orders',
    description: 'Importer les commandes clients',
    version: '1.0',
    columns: [
      { key: 'orderNumber', label: 'N° Commande', type: 'string', required: true, example: 'CMD-2024-001' },
      { key: 'partnerName', label: 'Client', type: 'string', required: true, example: 'ABC Distribution' },
      { key: 'date', label: 'Date', type: 'date', required: true, example: '2024-01-15' },
      { key: 'totalAmount', label: 'Total', type: 'number', required: true, min: 0, example: 595000 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], example: 'delivered' }
    ],
    requiredColumns: ['orderNumber', 'partnerName', 'date', 'totalAmount'],
    optionalColumns: ['status'],
    validationRules: {},
    sampleData: []
  };
}

function getPurchaseOrderTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Commandes Fournisseurs',
    module: 'purchase_orders',
    description: 'Importer les commandes fournisseurs',
    version: '1.0',
    columns: [
      { key: 'orderNumber', label: 'N° Commande', type: 'string', required: true, example: 'CF-2024-001' },
      { key: 'supplierName', label: 'Fournisseur', type: 'string', required: true, example: 'TechSupply' },
      { key: 'date', label: 'Date', type: 'date', required: true, example: '2024-01-10' },
      { key: 'totalAmount', label: 'Total', type: 'number', required: true, min: 0, example: 357000 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['draft', 'confirmed', 'received', 'cancelled'], example: 'received' }
    ],
    requiredColumns: ['orderNumber', 'supplierName', 'date', 'totalAmount'],
    optionalColumns: ['status'],
    validationRules: {},
    sampleData: []
  };
}

function getFixedAssetTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Immobilisations',
    module: 'fixed_assets',
    description: 'Importer le registre des immobilisations',
    version: '1.0',
    columns: [
      { key: 'name', label: 'Désignation', type: 'string', required: true, example: 'Bâtiment Siège' },
      { key: 'code', label: 'Code', type: 'string', required: false, example: 'IMM-001' },
      { key: 'category', label: 'Catégorie', type: 'select', required: false, options: ['terrain', 'batiment', 'materiel', 'mobilier', 'vehicule', 'informatique', 'autre'], example: 'batiment' },
      { key: 'acquisitionDate', label: "Date d'acquisition", type: 'date', required: true, example: '2018-06-15' },
      { key: 'acquisitionValue', label: "Valeur d'acquisition", type: 'number', required: true, min: 0, example: 15000000 },
      { key: 'accumulatedDepreciation', label: 'Amortissement cumulé', type: 'number', required: false, min: 0, example: 3000000 },
      { key: 'netValue', label: 'Valeur nette', type: 'number', required: false, min: 0, example: 12000000 },
      { key: 'usefulLife', label: 'Durée vie (années)', type: 'number', required: false, min: 1, example: 20 }
    ],
    requiredColumns: ['name', 'acquisitionDate', 'acquisitionValue'],
    optionalColumns: ['code', 'category', 'accumulatedDepreciation', 'netValue', 'usefulLife'],
    validationRules: {},
    sampleData: []
  };
}

function getTaxDeclarationTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Déclarations Fiscales',
    module: 'tax_declarations',
    description: 'Importer l\'historique des déclarations fiscales',
    version: '1.0',
    columns: [
      { key: 'declarationType', label: 'Type', type: 'select', required: true, options: ['tva', 'irg', 'tap', 'bilan'], example: 'tva' },
      { key: 'period', label: 'Période', type: 'string', required: true, example: '01/2024' },
      { key: 'amount', label: 'Montant', type: 'number', required: true, example: 450000 },
      { key: 'dueDate', label: "Date limite", type: 'date', required: true, example: '2024-02-19' },
      { key: 'paymentDate', label: 'Date paiement', type: 'date', required: false, example: '2024-02-17' },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['pending', 'paid', 'late'], example: 'paid' }
    ],
    requiredColumns: ['declarationType', 'period', 'amount', 'dueDate'],
    optionalColumns: ['paymentDate', 'status'],
    validationRules: {},
    sampleData: []
  };
}

function getContractTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Contrats',
    module: 'contracts',
    description: 'Importer les contrats (clients, fournisseurs, employés)',
    version: '1.0',
    columns: [
      { key: 'title', label: 'Titre', type: 'string', required: true, example: 'Contrat maintenance IT' },
      { key: 'partyName', label: 'Partie', type: 'string', required: true, example: 'TechSupport Sarl' },
      { key: 'type', label: 'Type', type: 'select', required: true, options: ['client', 'supplier', 'employee', 'service', 'lease'], example: 'supplier' },
      { key: 'startDate', label: 'Date début', type: 'date', required: true, example: '2024-01-01' },
      { key: 'endDate', label: 'Date fin', type: 'date', required: false, example: '2024-12-31' },
      { key: 'value', label: 'Valeur (DZD)', type: 'number', required: false, example: 1200000 },
      { key: 'status', label: 'Statut', type: 'select', required: false, options: ['draft', 'active', 'expired', 'terminated', 'cancelled'], example: 'active' }
    ],
    requiredColumns: ['title', 'partyName', 'type', 'startDate'],
    optionalColumns: ['endDate', 'value', 'status'],
    validationRules: {},
    sampleData: []
  };
}

function getBankTransactionTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Relevé Bancaire',
    module: 'bank_transactions',
    description: 'Importer les relevés bancaires pour rapprochement',
    version: '1.0',
    columns: [
      { key: 'date', label: 'Date', type: 'date', required: true, example: '2024-01-15' },
      { key: 'label', label: 'Libellé', type: 'string', required: true, example: 'Virement Client ABC' },
      { key: 'reference', label: 'Référence', type: 'string', required: false, example: 'VIR-001234' },
      { key: 'debit', label: 'Débit', type: 'number', required: false, min: 0, example: 0 },
      { key: 'credit', label: 'Crédit', type: 'number', required: false, min: 0, example: 595000 },
      { key: 'balance', label: 'Solde', type: 'number', required: false, example: 9095000 }
    ],
    requiredColumns: ['date', 'label'],
    optionalColumns: ['reference', 'debit', 'credit', 'balance'],
    validationRules: {},
    sampleData: []
  };
}

function getPayrollTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Historique Paie',
    module: 'payroll_records',
    description: "Importer l'historique des bulletins de paie",
    version: '1.0',
    columns: [
      { key: 'employeeId', label: 'Matricule', type: 'string', required: true, example: 'EMP001' },
      { key: 'period', label: 'Période', type: 'string', required: true, example: '01/2024' },
      { key: 'basicSalary', label: 'Salaire base', type: 'number', required: true, min: 0, example: 85000 },
      { key: 'overtimePay', label: 'Heures sup.', type: 'number', required: false, min: 0, example: 7500 },
      { key: 'grossPay', label: 'Brut', type: 'number', required: true, min: 0, example: 92500 },
      { key: 'socialSecurity', label: 'Sécurité sociale', type: 'number', required: false, min: 0, example: 9250 },
      { key: 'irg', label: 'IRG', type: 'number', required: false, min: 0, example: 6500 },
      { key: 'netPay', label: 'Net', type: 'number', required: true, min: 0, example: 76750 },
      { key: 'paymentDate', label: 'Date paiement', type: 'date', required: true, example: '2024-01-31' }
    ],
    requiredColumns: ['employeeId', 'period', 'basicSalary', 'grossPay', 'netPay', 'paymentDate'],
    optionalColumns: ['overtimePay', 'socialSecurity', 'irg'],
    validationRules: {},
    sampleData: []
  };
}

function getLeaveTemplate(): ImportTemplateDefinition {
  return {
    name: 'Template Congés & Absences',
    module: 'leaves',
    description: 'Importer les soldes de congés et historique',
    version: '1.0',
    columns: [
      { key: 'employeeId', label: 'Matricule', type: 'string', required: true, example: 'EMP001' },
      { key: 'leaveType', label: 'Type congé', type: 'select', required: true, options: ['annual', 'sickness', 'unpaid', 'maternity', 'paternity', 'exceptionnel'], example: 'annual' },
      { key: 'accruedDays', label: 'Jours acquis', type: 'number', required: false, min: 0, example: 30 },
      { key: 'usedDays', label: 'Jours pris', type: 'number', required: false, min: 0, example: 15 },
      { key: 'remainingDays', label: 'Solde', type: 'number', required: false, min: 0, example: 15 },
      { key: 'asOfDate', label: "Valable au", type: 'date', required: false, example: '2024-01-01' }
    ],
    requiredColumns: ['employeeId', 'leaveType'],
    optionalColumns: ['accruedDays', 'usedDays', 'remainingDays', 'asOfDate'],
    validationRules: {},
    sampleData: []
  };
}
