// ============================================================
// HASSIBA SUITE ERP - Report Templates System
// Pre-built templates for Algerian businesses (SCF Compliant)
// ============================================================

import { 
  ReportTemplate, 
  ReportConfig, 
  DataSourceType, 
  ChartType,
  FieldDefinition,
  DataSourceDefinition
} from '@/lib/types/report'

// ============================================================
// Data Source Definitions - Complete ERP Entity Catalog
// ============================================================

export const DATA_SOURCES: Record<DataSourceType, DataSourceDefinition> = {
  employees: {
    id: 'employees',
    name: 'Employés',
    nameAr: 'الموظفين',
    icon: 'Users',
    category: 'hr',
    description: 'Données des employés et ressources humaines',
    fields: [
      { id: 'id', name: 'ID Employé', type: 'id', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'firstName', name: 'Prénom', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'lastName', name: 'Nom', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'email', name: 'Email', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'phone', name: 'Téléphone', type: 'string', aggregatable: false, filterable: true, sortable: false, groupable: false },
      { id: 'department', name: 'Département', type: 'enum', enumValues: [
        { label: 'Direction', value: 'direction' },
        { label: 'Finance', value: 'finance' },
        { label: 'RH', value: 'rh' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Production', value: 'production' },
        { label: 'IT', value: 'it' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'position', name: 'Poste', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'grade', name: 'Grade', type: 'enum', enumValues: [
        { label: 'Cadre Supérieur', value: 'cadre_superieur' },
        { label: 'Cadre', value: 'cadre' },
        { label: 'Maîtrise', value: 'maitrise' },
        { label: 'Exécution', value: 'execution' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'baseSalary', name: 'Salaire de Base (DZD)', type: 'currency', format: '#,##0 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'grossSalary', name: 'Salaire Brut (DZD)', type: 'currency', format: '#,##0 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'netSalary', name: 'Salaire Net (DZD)', type: 'currency', format: '#,##0 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'hireDate', name: "Date d'Embauche", type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'seniorityYears', name: "Ancienneté (Années)", type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'wilayaCode', name: 'Wilaya', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'isActive', name: 'Actif', type: 'boolean', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'gender', name: 'Genre', type: 'enum', enumValues: [
        { label: 'Homme', value: 'M' },
        { label: 'Femme', value: 'F' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'birthDate', name: 'Date de Naissance', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'cnasNumber', name: 'N° CNAS', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'casnosNumber', name: 'N° CASNOS', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false }
    ],
    defaultMetrics: ['baseSalary', 'netSalary'],
    defaultDimensions: ['department', 'position']
  },

  invoices: {
    id: 'invoices',
    name: 'Factures',
    nameAr: 'الفواتير',
    icon: 'FileText',
    category: 'finance',
    description: 'Factures clients et ventes',
    fields: [
      { id: 'id', name: 'N° Facture', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'invoiceDate', name: 'Date Facture', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'dueDate', name: "Date d'Échéance", type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'partnerId', name: 'Code Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'partnerName', name: 'Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'partnerWilaya', name: 'Wilaya Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'totalHT', name: 'Total HT (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalTVA', name: 'TVA (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalTTC', name: 'Total TTC (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'tvaRate', name: 'Taux TVA (%)', type: 'percentage', format: '0.0%', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Brouillon', value: 'draft', color: '#94a3b8' },
        { label: 'Envoyée', value: 'sent', color: '#3b82f6' },
        { label: 'Partiellement Payée', value: 'partial', color: '#f59e0b' },
        { label: 'Payée', value: 'paid', color: '#10b981' },
        { label: 'En Retard', value: 'overdue', color: '#ef4444' },
        { label: 'Annulée', value: 'cancelled', color: '#6b7280' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'paymentMethod', name: 'Mode Paiement', type: 'enum', enumValues: [
        { label: 'Espèces', value: 'cash' },
        { label: 'Chèque', value: 'cheque' },
        { label: 'Virement', value: 'virement' },
        { label: 'Traite', value: 'traite' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'paidAmount', name: 'Montant Payé (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'remainingAmount', name: 'Reste à Payer (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'daysOverdue', name: 'Jours de Retard', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'itemsCount', name: 'Nb Articles', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'salespersonId', name: 'Commercial', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'quarter', name: 'Trimestre', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'year', name: 'Année', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['totalHT', 'totalTTC'],
    defaultDimensions: ['partnerName', 'status', 'month']
  },

  products: {
    id: 'products',
    name: 'Produits',
    nameAr: 'المنتجات',
    icon: 'Package',
    category: 'inventory',
    description: 'Catalogue produits et articles',
    fields: [
      { id: 'id', name: 'Code Produit', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'name', name: 'Désignation', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'category', name: 'Catégorie', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'subcategory', name: 'Sous-Catégorie', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'brand', name: 'Marque', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'unit', name: 'Unité', type: 'enum', enumValues: [
        { label: 'Unité', value: 'unit' },
        { label: 'Kilogramme', value: 'kg' },
        { label: 'Litre', value: 'l' },
        { label: 'Mètre', value: 'm' },
        { label: 'Carton', value: 'carton' },
        { label: 'Palette', value: 'palette' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'purchasePrice', name: "Prix d'Achat (DZD)", type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'sellingPrice', name: 'Prix de Vente (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'margin', name: 'Marge (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'marginPercent', name: 'Marge %', type: 'percentage', format: '0.0%', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'stockQuantity', name: 'Quantité Stock', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'stockValue', name: 'Valeur Stock (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'minStock', name: 'Stock Minimum', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'maxStock', name: 'Stock Maximum', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'reorderPoint', name: 'Seuil Réappro.', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'isActive', name: 'Actif', type: 'boolean', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'tvaRate', name: 'Taux TVA', type: 'percentage', format: '0%', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'warehouse', name: 'Entrepôt', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'supplier', name: 'Fournisseur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['sellingPrice', 'stockQuantity', 'margin'],
    defaultDimensions: ['category', 'brand']
  },

  purchases: {
    id: 'purchases',
    name: 'Achats',
    nameAr: 'المشتريات',
    icon: 'ShoppingCart',
    category: 'achats',
    description: 'Commandes d\'achat et factures fournisseurs',
    fields: [
      { id: 'id', name: 'N° Achat', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date Achat', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'supplierId', name: 'Code Fournisseur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'supplierName', name: 'Fournisseur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'supplierWilaya', name: 'Wilaya Fournisseur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'totalHT', name: 'Total HT (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalTVA', name: 'TVA (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalTTC', name: 'Total TTC (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Validé', value: 'validated' },
        { label: 'Commandé', value: 'ordered' },
        { label: 'Reçu Partiel', value: 'partial' },
        { label: 'Reçu', value: 'received' },
        { label: 'Annulé', value: 'cancelled' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'paymentStatus', name: 'Paiement', type: 'enum', enumValues: [
        { label: 'Non Payé', value: 'unpaid' },
        { label: 'Partiel', value: 'partial' },
        { label: 'Payé', value: 'paid' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'paymentTerms', name: 'Conditions Paiement', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'itemsCount', name: 'Nb Articles', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'category', name: 'Catégorie Achat', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['totalHT', 'totalTTC'],
    defaultDimensions: ['supplierName', 'status']
  },

  sales_orders: {
    id: 'sales_orders',
    name: 'Commandes Ventes',
    icon: 'ShoppingCart',
    category: 'commercial',
    description: 'Commandes clients et suivi commercial',
    fields: [
      { id: 'id', name: 'N° Commande', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date Commande', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'customerId', name: 'Code Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'customerName', name: 'Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'customerWilaya', name: 'Wilaya Client', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'totalAmount', name: 'Montant Total (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'discount', name: 'Remise (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'discountPercent', name: 'Remise %', type: 'percentage', format: '0.0%', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Confirmée', value: 'confirmed' },
        { label: 'En Préparation', value: 'preparing' },
        { label: 'Expédiée', value: 'shipped' },
        { label: 'Livrée', value: 'delivered' },
        { label: 'Annulée', value: 'cancelled' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'salesperson', name: 'Commercial', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'itemsCount', name: 'Nb Articles', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'deliveryMode', name: 'Mode Livraison', type: 'enum', enumValues: [
        { label: 'Magasin', value: 'store' },
        { label: 'Livraison', value: 'delivery' },
        { label: 'Point Relais', value: 'pickup' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'quarter', name: 'Trimestre', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['totalAmount'],
    defaultDimensions: ['customerName', 'status', 'salesperson']
  },

  partners: {
    id: 'partners',
    name: 'Partenaires (Clients/Fournisseurs)',
    icon: 'Users',
    category: 'commercial',
    description: 'Base données clients et fournisseurs',
    fields: [
      { id: 'id', name: 'Code Partenaire', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'name', name: 'Raison Sociale', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'type', name: 'Type', type: 'enum', enumValues: [
        { label: 'Client', value: 'client' },
        { label: 'Fournisseur', value: 'supplier' },
        { label: 'Client/Fournisseur', value: 'both' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'contactPerson', name: 'Contact', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'email', name: 'Email', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'phone', name: 'Téléphone', type: 'string', aggregatable: false, filterable: true, sortable: false, groupable: false },
      { id: 'wilaya', name: 'Wilaya', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'city', name: 'Ville', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'address', name: 'Adresse', type: 'string', aggregatable: false, filterable: true, sortable: false, groupable: false },
      { id: 'totalPurchases', name: 'Total Achats (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalSales', name: 'Total Ventes (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'balance', name: 'Solde (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'orderCount', name: 'Nb Commandes', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'firstOrderDate', name: 'Première Commande', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'lastOrderDate', name: 'Dernière Commande', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'isActive', name: 'Actif', type: 'boolean', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'taxId', name: 'NIF', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'rcNumber', name: 'N° RC', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'activitySector', name: "Secteur d'Activité", type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'createdAt', name: 'Date Création', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['totalSales', 'totalPurchases'],
    defaultDimensions: ['type', 'wilaya', 'activitySector']
  },

  inventory: {
    id: 'inventory',
    name: 'Inventaire & Stocks',
    icon: 'Package',
    category: 'stock',
    description: 'Mouvements de stock et inventaire',
    fields: [
      { id: 'id', name: 'ID Mouvement', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date Mouvement', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'productId', name: 'Code Produit', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'productName', name: 'Produit', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'category', name: 'Catégorie', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'warehouse', name: 'Entrepôt', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'movementType', name: 'Type Mouvement', type: 'enum', enumValues: [
        { label: 'Entrée Achat', value: 'purchase_in' },
        { label: 'Sortie Vente', value: 'sale_out' },
        { label: 'Entrée Retour', value: 'return_in' },
        { label: 'Sortie Casse', value: 'damage_out' },
        { label: 'Transfert Entrée', value: 'transfer_in' },
        { label: 'Transfert Sortie', value: 'transfer_out' },
        { label: 'Inventaire', value: 'inventory' },
        { label: 'Ajustement', value: 'adjustment' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'quantity', name: 'Quantité', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'unitCost', name: "Coût Unitaire (DZD)", type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalValue', name: 'Valeur Totale (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'reference', name: 'Référence', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'reason', name: 'Motif', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'operator', name: 'Opérateur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['quantity', 'totalValue'],
    defaultDimensions: ['warehouse', 'movementType', 'category']
  },

  attendance: {
    id: 'attendance',
    name: 'Présence & Pointage',
    icon: 'Clock',
    category: 'rh',
    description: 'Suivi des présences et absences',
    fields: [
      { id: 'id', name: 'ID Pointage', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'employeeId', name: 'ID Employé', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'employeeName', name: 'Employé', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'department', name: 'Département', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'checkIn', name: 'Heure Arrivée', type: 'datetime', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'checkOut', name: 'Heure Départ', type: 'datetime', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'workHours', name: 'Heures Travaillées', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'overtimeHours', name: 'Heures Supp.', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'lateMinutes', name: 'Retard (min)', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'earlyDeparture', name: 'Départ Anticipé (min)', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Présent', value: 'present' },
        { label: 'Absent', value: 'absent' },
        { label: 'Congé', value: 'leave' },
        { label: 'Mission', value: 'mission' },
        { label: 'Week-end', value: 'weekend' },
        { label: 'Férié', value: 'holiday' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'absenceType', name: "Type d'Absence", type: 'enum', enumValues: [
        { label: 'Autorisée', value: 'authorized' },
        { label: 'Non Autorisée', value: 'unauthorized' },
        { label: 'Maladie', value: 'sick' },
        { label: 'Personnelle', value: 'personal' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'week', name: 'Semaine', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['workHours', 'overtimeHours'],
    defaultDimensions: ['employeeName', 'department', 'status']
  },

  payroll: {
    id: 'payroll',
    name: 'Paie & Salaires',
    icon: 'DollarSign',
    category: 'rh',
    description: 'Bulletins de paie et masse salariale',
    fields: [
      { id: 'id', name: 'N° Bulletin', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'period', name: 'Période', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'year', name: 'Année', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'employeeId', name: 'ID Employé', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'employeeName', name: 'Employé', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'department', name: 'Département', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'position', name: 'Poste', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'grade', name: 'Grade', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'baseSalary', name: 'Salaire Base (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'grossSalary', name: 'Salaire Brut (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'socialSecurity', name: 'CNAS (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'retirementFund', name: 'CASNOS (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'irgTax', name: 'IRG (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'netSalary', name: 'Salaire Net (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'overtimePay', name: 'Heures Supp. (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'allowances', name: 'Primes (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'deductions', name: 'Retenues (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'workDays', name: 'Jours Travaillés', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'absenceDays', name: 'Jours Absence', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'cnasRate', name: 'Taux CNAS %', type: 'percentage', format: '0.0%', aggregatable: false, filterable: true, sortable: true, groupable: false }
    ],
    defaultMetrics: ['grossSalary', 'netSalary', 'irgTax'],
    defaultDimensions: ['department', 'grade', 'month']
  },

  accounting: {
    id: 'accounting',
    name: 'Comptabilité Générale',
    icon: 'Calculator',
    category: 'comptabilite',
    description: 'Écritures comptables et grands livres (SCF)',
    fields: [
      { id: 'id', name: 'N° Écriture', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable:false },
      { id: 'date', name: 'Date Écriture', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'journal', name: 'Journal', type: 'enum', enumValues: [
        { label: 'Achats', value: 'ACH' },
        { label: 'Ventes', value: 'VEN' },
        { label: 'Banque', value: 'BQ' },
        { label: 'Caisse', value: 'CA' },
        { label: 'OD', value: 'OD' },
        { label: 'Paie', value: 'PAIE' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'accountNumber', name: 'N° Compte', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'accountName', name: 'Libellé Compte', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'accountClass', name: 'Classe', type: 'enum', enumValues: [
        { label: 'Classe 1 - Capitaux', value: '1' },
        { label: 'Classe 2 - Immobilisations', value: '2' },
        { label: 'Classe 3 - Stocks', value: '3' },
        { label: 'Classe 4 - Tiers', value: '4' },
        { label: 'Classe 5 - Financiers', value: '5' },
        { label: 'Classe 6 - Charges', value: '6' },
        { label: 'Classe 7 - Produits', value: '7' },
        { label: 'Classe 8 - Engagements', value: '8' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'label', name: 'Libellé', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'debit', name: 'Débit (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'credit', name: 'Crédit (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'balance', name: 'Solde (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'documentRef', name: 'Réf. Document', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'partnerName', name: 'Tier', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'costCenter', name: 'Centre Coûts', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'taxRate', name: 'Taux Taxe', type: 'percentage', format: '0.0%', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'taxAmount', name: 'Montant Taxe', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'fiscalYear', name: 'Exercice', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['debit', 'credit', 'balance'],
    defaultDimensions: ['accountClass', 'journal', 'costCenter']
  },

  production: {
    id: 'production',
    name: 'Production',
    icon: 'Factory',
    category: 'production',
    description: 'Ordres de fabrication et production',
    fields: [
      { id: 'id', name: 'N° OF', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date OF', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'productId', name: 'Code Produit', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'productName', name: 'Produit', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'quantityPlanned', name: 'Qté Prévue', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'quantityProduced', name: 'Qté Produite', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'quantityDefect', name: 'Qté Défectueuse', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'yieldRate', name: 'Rendement %', type: 'percentage', format: '0.0%', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Planifié', value: 'planned' },
        { label: 'En Cours', value: 'in_progress' },
        { label: 'Terminé', value: 'completed' },
        { label: 'En Attente', value: 'pending' },
        { label: 'Annulé', value: 'cancelled' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'workCenter', name: 'Poste Travail', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'operator', name: 'Opérateur', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'startTime', name: 'H Début', type: 'datetime', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'endTime', name: 'H Fin', type: 'datetime', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'durationHours', name: 'Durée (h)', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'materialCost', name: 'Coût Matière (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'laborCost', name: 'Coût MO (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'overheadCost', name: 'Coût Indirect (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalCost', name: 'Coût Total (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'unitCost', name: 'Coût Unitaire (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['quantityProduced', 'totalCost', 'yieldRate'],
    defaultDimensions: ['workCenter', 'status', 'productName']
  },

  maintenance: {
    id: 'maintenance',
    name: 'Maintenance',
    icon: 'Wrench',
    category: 'production',
    description: 'Ordres de maintenance et équipements',
    fields: [
      { id: 'id', name: 'N° OT', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'date', name: 'Date OT', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'equipmentId', name: 'Code Équipement', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'equipmentName', name: 'Équipement', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'type', name: 'Type Maintenance', type: 'enum', enumValues: [
        { label: 'Préventive', value: 'preventive' },
        { label: 'Corrective', value: 'corrective' },
        { label: 'Curative', value: 'curative' },
        { label: 'Améliorative', value: 'improvement' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'priority', name: 'Priorité', type: 'enum', enumValues: [
        { label: 'Basse', value: 'low', color: '#10b981' },
        { label: 'Moyenne', value: 'medium', color: '#f59e0b' },
        { label: 'Haute', value: 'high', color: '#ef4444' },
        { label: 'Critique', value: 'critical', color: '#7c2d12' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Planifié', value: 'planned' },
        { label: 'En Cours', value: 'in_progress' },
        { label: 'En Attente', value: 'waiting' },
        { label: 'Terminé', value: 'completed' },
        { label: 'Annulé', value: 'cancelled' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'technician', name: 'Technicien', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'estimatedDuration', name: 'Durée Estimée (h)', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'actualDuration', name: 'Durée Réelle (h)', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'partsCost', name: 'Coût Pièces (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'laborCost', name: 'Coût MO (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'totalCost', name: 'Coût Total (DZD)', type: 'currency', format: '#,##0.00 DZD', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'downtimeHours', name: 'Arrêt (h)', type: 'number', format: '0.0', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'failureReason', name: 'Cause Panne', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['totalCost', 'downtimeHours', 'actualDuration'],
    defaultDimensions: ['equipmentName', 'type', 'priority']
  },

  documents: {
    id: 'documents',
    name: 'Documents',
    icon: 'FileText',
    category: 'documents',
    description: 'Gestion documentaire',
    fields: [
      { id: 'id', name: 'ID Document', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'name', name: 'Nom Fichier', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'title', name: 'Titre', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'type', name: 'Type Document', type: 'enum', enumValues: [
        { label: 'Facture', value: 'invoice' },
        { label: 'Contrat', value: 'contract' },
        { label: 'Bon Commande', value: 'po' },
        { label: 'Bon Livraison', value: 'dn' },
        { label: 'Rapport', value: 'report' },
        { label: 'Autre', value: 'other' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'category', name: 'Catégorie', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'fileType', name: 'Format', type: 'enum', enumValues: [
        { label: 'PDF', value: 'pdf' },
        { label: 'Word', value: 'docx' },
        { label: 'Excel', value: 'xlsx' },
        { label: 'Image', value: 'image' },
        { label: 'Autre', value: 'other' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'size', name: 'Taille (Ko)', type: 'number', aggregatable: true, filterable: true, sortable: true, groupable: false },
      { id: 'uploadedBy', name: 'Uploadé Par', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'uploadedAt', name: 'Date Upload', type: 'date', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'partnerName', name: 'Partenaire', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'version', name: 'Version', type: 'number', aggregatable: false, filterable: true, sortable: true, groupable: false },
      { id: 'status', name: 'Statut', type: 'enum', enumValues: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'En Revision', value: 'review' },
        { label: 'Approuvé', value: 'approved' },
        { label: 'Archivé', value: 'archived' },
        { label: 'Obsolète', value: 'obsolete' }
      ], aggregatable: false, filterable: true, sortable: true, groupable: true },
      { id: 'month', name: 'Mois', type: 'string', aggregatable: false, filterable: true, sortable: true, groupable: true }
    ],
    defaultMetrics: ['size'],
    defaultDimensions: ['type', 'category', 'uploadedBy']
  }
}

// Helper to get data source by ID
export function getDataSource(id: DataSourceType): DataSourceDefinition {
  return DATA_SOURCES[id]
}

// Helper to get all data sources
export function getAllDataSources(): DataSourceDefinition[] {
  return Object.values(DATA_SOURCES)
}

// Helper to get data sources by category
export function getDataSourcesByCategory(category: string): DataSourceDefinition[] {
  return Object.values(DATA_SOURCES).filter(ds => ds.category === category)
}

// ============================================================
// Pre-built Report Templates for Algerian Businesses
// ============================================================

export const REPORT_TEMPLATES: ReportTemplate[] = [
  // ========================================
  // COMPTABILITÉ (Accounting) Templates
  // ========================================
  {
    id: 'bilan-scf',
    name: 'Bilan SCF',
    nameAr: 'الميزانية العمومية',
    category: 'comptabilite',
    description: 'Bilan comptable selon le Système Comptable Financier algérien',
    descriptionAr: 'الميزانية العمومية وفق النظام المحاسبي المالي الجزائري',
    icon: 'BalanceScale',
    config: {
      name: 'Bilan SCF',
      dataSource: 'accounting',
      dimensions: [
        { id: 'd1', fieldId: 'accountClass', fieldName: 'Classe Compte', dataSource: 'accounting', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'debit', fieldName: 'Total Débit', dataSource: 'accounting', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'credit', fieldName: 'Total Crédit', dataSource: 'accounting', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'balance', fieldName: 'Solde', dataSource: 'accounting', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' }
      ],
      filters: [],
      chartType: 'table',
      style: {
        theme: 'light',
        colorScheme: 'corporate',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [],
        pagination: { pageSize: 20, enabled: true, showPageNumbers: true }
      }
    } as ReportConfig,
    tags: ['scf', 'bilan', 'comptabilité', 'fin de année'],
    difficulty: 'advanced',
    estimatedTime: '15 min',
    isPopular: true
  },
  {
    id: 'etat-resultat',
    name: 'État de Résultat',
    nameAr: 'حساب النتائج',
    category: 'comptabilite',
    description: 'Compte de résultat avec charges et produits (Chapitre 5 SCF)',
    descriptionAr: 'حساب النتائج مع المصاريف والإيرادات',
    icon: 'TrendingUp',
    config: {
      name: 'État de Résultat',
      dataSource: 'accounting',
      dimensions: [
        { id: 'd1', fieldId: 'accountClass', fieldName: 'Classe', dataSource: 'accounting', sortOrder: 1 },
        { id: 'd2', fieldId: 'month', fieldName: 'Mois', dataSource: 'accounting', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'debit', fieldName: 'Charges', dataSource: 'accounting', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'credit', fieldName: 'Produits', dataSource: 'accounting', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'accountClass', fieldName: 'Classe', dataSource: 'accounting', operator: 'in', value: ['6', '7'], enabled: true }
      ],
      sortBy: [{ fieldId: 'accountClass', direction: 'asc' }],
      chartType: 'bar',
      style: {
        theme: 'light',
        colorScheme: 'default',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: true,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['scf', 'résultat', 'charges', 'produits', 'exploitation'],
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    isPopular: true
  },
  {
    id: 'grand-livre',
    name: 'Grand Livre Général',
    nameAr: 'دفتر الأستاذ العام',
    category: 'comptabilite',
    description: 'Grand livre avec détail des comptes et soldes cumulés',
    icon: 'BookOpen',
    config: {
      name: 'Grand Livre',
      dataSource: 'accounting',
      dimensions: [
        { id: 'd1', fieldId: 'accountNumber', fieldName: 'N° Compte', dataSource: 'accounting', sortOrder: 1 },
        { id: 'd2', fieldId: 'accountName', fieldName: 'Compte', dataSource: 'accounting', sortOrder: 2 },
        { id: 'd3', fieldId: 'journal', fieldName: 'Journal', dataSource: 'accounting', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'debit', fieldName: 'Débit', dataSource: 'accounting', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'credit', fieldName: 'Crédit', dataSource: 'accounting', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'balance', fieldName: 'Solde', dataSource: 'accounting', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' }
      ],
      filters: [],
      chartType: 'table',
      style: {
        theme: 'light',
        colorScheme: 'monochrome',
        fontSize: 'small',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: false,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [],
        pagination: { pageSize: 50, enabled: true, showPageNumbers: true }
      }
    } as ReportConfig,
    tags: ['grand livre', 'comptabilité', 'scf', 'soldes'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },
  {
    id: 'journal-ventes',
    name: 'Journal des Ventes',
    nameAr: 'يوميات المبيعات',
    category: 'comptabilite',
    description: 'Journal des ventes TVA avec ventilation par taux',
    icon: 'Receipt',
    config: {
      name: 'Journal Ventes',
      dataSource: 'accounting',
      dimensions: [
        { id: 'd1', fieldId: 'date', fieldName: 'Date', dataSource: 'accounting', sortOrder: 1 },
        { id: 'd2', fieldId: 'partnerName', fieldName: 'Client', dataSource: 'accounting', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'credit', fieldName: 'HT', dataSource: 'accounting', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'taxAmount', fieldName: 'TVA', dataSource: 'accounting', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'journal', fieldName: 'Journal', dataSource: 'accounting', operator: 'equals', value: 'VEN', enabled: true }
      ],
      chartType: 'table',
      style: {
        theme: 'light',
        colorScheme: 'green',
        fontSize: 'medium',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: false,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [],
        pagination: { pageSize: 30, enabled: true, showPageNumbers: true }
      }
    } as ReportConfig,
    tags: ['ventes', 'tva', 'journal', 'facturation'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },

  // ========================================
  // COMMERCIAL (Sales/CRM) Templates
  // ========================================
  {
    id: 'ca-par-wilaya',
    name: 'CA par Wilaya',
    nameAr: 'رقم الأعمال حسب الولاية',
    category: 'commercial',
    description: "Chiffre d'affaires réparti par les 58 wilayas algériennes",
    descriptionAr: 'توزيع رقم الأعمال على 58 ولاية جزائرية',
    icon: 'Map',
    config: {
      name: 'CA par Wilaya',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'partnerWilaya', fieldName: 'Wilaya', dataSource: 'invoices', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalTTC', fieldName: 'CA TTC', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'id', fieldName: 'Nb Factures', dataSource: 'invoices', aggregation: 'count', sortOrder: 2, format: 'integer' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'invoices', operator: 'not_equals', value: 'cancelled', enabled: true }
      ],
      sortBy: [{ fieldId: 'totalTTC', direction: 'desc' }],
      chartType: 'bar',
      style: {
        theme: 'light',
        colorScheme: 'algeria',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'bottom',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['ca', 'wilaya', 'géographique', 'ventes', '58 wilayas'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    isPopular: true,
    isNew: true
  },
  {
    id: 'top-clients',
    name: 'Top Clients (Pareto)',
    nameAr: 'أفضل العملاء',
    category: 'commercial',
    description: 'Analyse Pareto 80/20 des meilleurs clients par CA',
    icon: 'Trophy',
    config: {
      name: 'Top Clients',
      dataSource: 'partners',
      dimensions: [
        { id: 'd1', fieldId: 'name', fieldName: 'Client', dataSource: 'partners', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalSales', fieldName: 'CA Total', dataSource: 'partners', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'orderCount', fieldName: 'Nb Commandes', dataSource: 'partners', aggregation: 'sum', sortOrder: 2, format: 'integer' },
        { id: 'm3', fieldId: 'balance', fieldName: 'Solde Dû', dataSource: 'partners', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'type', fieldName: 'Type', dataSource: 'partners', operator: 'in', value: ['client', 'both'], enabled: true }
      ],
      sortBy: [{ fieldId: 'totalSales', direction: 'desc' }],
      dateRange: { preset: 'this_year' },
      chartType: 'bar_horizontal',
      style: {
        theme: 'light',
        colorScheme: 'blue',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'bottom',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [
          {
            id: 'cf1',
            fieldId: 'totalSales',
            type: 'data_bar',
            condition: { operator: 'greater_than', value: 0 },
            style: { minValueColor: '#dbeafe', maxValueColor: '#1e40af' },
            enabled: true
          }
        ]
      }
    } as ReportConfig,
    tags: ['clients', 'pareto', 'crm', 'ventes', '80/20'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    isPopular: true
  },
  {
    id: 'suivi-commercial',
    name: 'Tableau de Bord Commercial',
    nameAr: 'لوحة المتابعة التجارية',
    category: 'commercial',
    description: 'KPIs commerciaux: CA, marge, panier moyen, conversion',
    icon: 'BarChart3',
    config: {
      name: 'Tableau Bord Commercial',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'month', fieldName: 'Mois', dataSource: 'invoices', sortOrder: 1 },
        { id: 'd2', fieldId: 'salespersonId', fieldName: 'Commercial', dataSource: 'invoices', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalTTC', fieldName: 'CA TTC', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'totalHT', fieldName: 'CA HT', dataSource: 'invoices', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'id', fieldName: 'Nb Factures', dataSource: 'invoices', aggregation: 'count', sortOrder: 3, format: 'integer' },
        { id: 'm4', fieldId: 'itemsCount', fieldName: 'Articles', dataSource: 'invoices', aggregation: 'sum', sortOrder: 4, format: 'integer' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'invoices', operator: 'equals', value: 'paid', enabled: true }
      ],
      dateRange: { preset: 'this_year', compareWithPrevious: true },
      chartType: 'kpi',
      style: {
        theme: 'light',
        colorScheme: 'corporate',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'bottom',
        showGridLines: false,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['kpi', 'commercial', 'ca', 'tableau de bord', 'dashboard'],
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    isPopular: true
  },
  {
    id: 'evolution-ca-mensuel',
    name: "Évolution CA Mensuel",
    nameAr: 'تطور رقم الأعمال الشهري',
    category: 'commercial',
    description: "Tendance du chiffre d'affaires sur 12 mois avec comparaison N vs N-1",
    icon: 'LineChart',
    config: {
      name: 'Évolution CA',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'month', fieldName: 'Mois', dataSource: 'invoices', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalTTC', fieldName: 'CA TTC', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'invoices', operator: 'not_equals', value: 'cancelled', enabled: true }
      ],
      dateRange: { preset: 'this_year' },
      chartType: 'line',
      style: {
        theme: 'light',
        colorScheme: 'blue',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['ca', 'mensuel', 'tendance', 'évolution', 'graphique'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },

  // ========================================
  // RH (Human Resources) Templates
  // ========================================
  {
    id: 'fiche-paie',
    name: 'Fiche de Paie Employé',
    nameAr: 'بطاقة راتب الموظف',
    category: 'rh',
    description: 'Bulletin de paie détaillé avec IRG, CNAS, CASNOS (barème algérien)',
    descriptionAr: 'كشف الراتب مع الضرائب والضمان الاجتماعي',
    icon: 'Wallet',
    config: {
      name: 'Fiche de Paie',
      dataSource: 'payroll',
      dimensions: [
        { id: 'd1', fieldId: 'employeeName', fieldName: 'Employé', dataSource: 'payroll', sortOrder: 1 },
        { id: 'd2', fieldId: 'department', fieldName: 'Département', dataSource: 'payroll', sortOrder: 2 },
        { id: 'd3', fieldId: 'position', fieldName: 'Poste', dataSource: 'payroll', sortOrder: 3 },
        { id: 'd4', fieldId: 'period', fieldName: 'Période', dataSource: 'payroll', sortOrder: 4 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'baseSalary', fieldName: 'Salaire Base', dataSource: 'payroll', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'grossSalary', fieldName: 'Brut', dataSource: 'payroll', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'socialSecurity', fieldName: 'CNAS (9%)', dataSource: 'payroll', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' },
        { id: 'm4', fieldId: 'retirementFund', fieldName: 'CASNOS', dataSource: 'payroll', aggregation: 'sum', sortOrder: 4, format: 'currency_dzd' },
        { id: 'm5', fieldId: 'irgTax', fieldName: 'IRG', dataSource: 'payroll', aggregation: 'sum', sortOrder: 5, format: 'currency_dzd' },
        { id: 'm6', fieldId: 'netSalary', fieldName: 'Net à Payer', dataSource: 'payroll', aggregation: 'sum', sortOrder: 6, format: 'currency_dzd' }
      ],
      filters: [],
      chartType: 'table',
      style: {
        theme: 'light',
        colorScheme: 'corporate',
        fontSize: 'medium',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: false,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [
          {
            id: 'cf1',
            fieldId: 'netSalary',
            type: 'highlight',
            condition: { operator: 'greater_than', value: 100000 },
            style: { backgroundColor: '#dcfce7', textColor: '#166534' },
            enabled: true
          }
        ]
      }
    } as ReportConfig,
    tags: ['paie', 'salaire', 'irg', 'cnas', 'casnos', 'bulletin'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    isPopular: true
  },
  {
    id: 'masse-salariale',
    name: 'Masse Salariale',
    nameAr: 'كتلة الرواتب',
    category: 'rh',
    description: 'Analyse de la masse salariale par département et grade',
    icon: 'Users',
    config: {
      name: 'Masse Salariale',
      dataSource: 'payroll',
      dimensions: [
        { id: 'd1', fieldId: 'department', fieldName: 'Département', dataSource: 'payroll', sortOrder: 1 },
        { id: 'd2', fieldId: 'grade', fieldName: 'Grade', dataSource: 'payroll', sortOrder: 2 },
        { id: 'd3', fieldId: 'month', fieldName: 'Mois', dataSource: 'payroll', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'netSalary', fieldName: 'Net Total', dataSource: 'payroll', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'grossSalary', fieldName: 'Brut Total', dataSource: 'payroll', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'irgTax', fieldName: 'Total IRG', dataSource: 'payroll', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' },
        { id: 'm4', fieldId: 'employeeName', fieldName: 'Effectif', dataSource: 'payroll', aggregation: 'count_distinct', sortOrder: 4, format: 'integer' }
      ],
      filters: [],
      dateRange: { preset: 'this_month' },
      chartType: 'bar',
      style: {
        theme: 'light',
        colorScheme: 'purple',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'right',
        showGridLines: true,
        showDataLabels: true,
        stacked: true,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['masse salariale', 'rh', 'budget', 'département', 'effectif'],
    difficulty: 'intermediate',
    estimatedTime: '8 min'
  },
  {
    id: 'taux-absenteisme',
    name: "Taux d'Absentéisme",
    nameAr: 'معدل الغياب',
    category: 'rh',
    description: "Calcul du taux d'absentéisme par département et cause",
    icon: 'UserX',
    config: {
      name: 'Absentéisme',
      dataSource: 'attendance',
      dimensions: [
        { id: 'd1', fieldId: 'department', fieldName: 'Département', dataSource: 'attendance', sortOrder: 1 },
        { id: 'd2', fieldId: 'status', fieldName: 'Statut', dataSource: 'attendance', sortOrder: 2 },
        { id: 'd3', fieldId: 'absenceType', fieldName: "Type Absence", dataSource: 'attendance', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'workHours', fieldName: 'Heures Planifiées', dataSource: 'attendance', aggregation: 'sum', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'lateMinutes', fieldName: 'Retards (min)', dataSource: 'attendance', aggregation: 'sum', sortOrder: 2, format: 'integer' },
        { id: 'm3', fieldId: 'overtimeHours', fieldName: 'Heures Supp.', dataSource: 'attendance', aggregation: 'sum', sortOrder: 3, format: 'decimal_1' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'attendance', operator: 'not_equals', value: 'present', enabled: true }
      ],
      dateRange: { preset: 'this_month' },
      chartType: 'pie',
      style: {
        theme: 'light',
        colorScheme: 'orange',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'right',
        showGridLines: false,
        showDataLabels: true,
        stacked: false,
        percentageMode: true,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['absentéisme', 'rh', 'présence', 'pointage', 'retard'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },
  {
    id: 'effectif-par-departement',
    name: "Effectif par Département",
    nameAr: 'عدد الموظفين حسب القسم',
    category: 'rh',
    description: 'Répartition des effectifs par département, grade et ancienneté',
    icon: 'PieChart',
    config: {
      name: 'Effectifs',
      dataSource: 'employees',
      dimensions: [
        { id: 'd1', fieldId: 'department', fieldName: 'Département', dataSource: 'employees', sortOrder: 1 },
        { id: 'd2', fieldId: 'grade', fieldName: 'Grade', dataSource: 'employees', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'id', fieldName: 'Effectif', dataSource: 'employees', aggregation: 'count', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'baseSalary', fieldName: 'Salaire Moyen', dataSource: 'employees', aggregation: 'avg', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'seniorityYears', fieldName: "Ancienneté Moy.", dataSource: 'employees', aggregation: 'avg', sortOrder: 3, format: 'decimal_1' }
      ],
      filters: [
        { id: 'f1', fieldId: 'isActive', fieldName: 'Actif', dataSource: 'employees', operator: 'equals', value: true, enabled: true }
      ],
      chartType: 'pie',
      style: {
        theme: 'light',
        colorScheme: 'teal',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'right',
        showGridLines: false,
        showDataLabels: true,
        stacked: false,
        percentageMode: true,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['effectif', 'rh', 'département', 'organigramme'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },

  // ========================================
  // FINANCE / TRÉSORERIE Templates
  // ========================================
  {
    id: 'situation-tresorerie',
    name: 'Situation de Trésorerie',
    nameAr: 'وضعية الخزينة',
    category: 'finance',
    description: 'Position de trésorerie: encaissements, décaissements, solde',
    icon: 'Landmark',
    config: {
      name: 'Trésorerie',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'month', fieldName: 'Mois', dataSource: 'invoices', sortOrder: 1 },
        { id: 'd2', fieldId: 'status', fieldName: 'Statut', dataSource: 'invoices', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'paidAmount', fieldName: 'Encaissements', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'remainingAmount', fieldName: 'À Encaisser', dataSource: 'invoices', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'totalTTC', fieldName: 'CA Total', dataSource: 'invoices', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' }
      ],
      filters: [],
      dateRange: { preset: 'this_quarter' },
      chartType: 'area',
      style: {
        theme: 'light',
        colorScheme: 'green',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: true,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['trésorerie', 'finance', 'encaissement', 'cash flow'],
    difficulty: 'intermediate',
    estimatedTime: '8 min'
  },
  {
    id: 'aging-client',
    name: 'Âge des Créances Clients',
    nameAr: 'عمر المستحقات',
    category: 'finance',
    description: 'Analyse des créances par tranche d\'âges (30j, 60j, 90j+)',
    icon: 'Clock',
    config: {
      name: 'Âge Créances',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'partnerName', fieldName: 'Client', dataSource: 'invoices', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'remainingAmount', fieldName: 'Solde Dû', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'daysOverdue', nombre: 'Jours Retard', dataSource: 'invoices', aggregation: 'avg', sortOrder: 2, format: 'integer' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'invoices', operator: 'in', value: ['sent', 'partial', 'overdue'], enabled: true },
        { id: 'f2', fieldId: 'remainingAmount', fieldName: 'Reste', dataSource: 'invoices', operator: 'greater_than', value: 0, enabled: true }
      ],
      sortBy: [{ fieldId: 'remainingAmount', direction: 'desc' }],
      chartType: 'bar_horizontal',
      style: {
        theme: 'light',
        colorScheme: 'red',
        fontSize: 'medium',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [
          {
            id: 'cf1',
            fieldId: 'daysOverdue',
            type: 'color_scale',
            condition: { operator: 'between', value: 0, valueTo: 90 },
            style: { minValueColor: '#fef08f', midValueColor: '#fb923c', maxValueColor: '#dc2626' },
            enabled: true
          }
        ]
      }
    } as ReportConfig,
    tags: ['créances', 'aging', 'clients', 'recouvrement', 'trésorerie'],
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    isNew: true
  },

  // ========================================
  // STOCK / INVENTORY Templates
  // ========================================
  {
    id: 'etat-stock',
    name: "État des Stocks",
    nameAr: 'حالة المخزون',
    category: 'stock',
    description: 'Valorisation des stocks par catégorie et entrepôt',
    icon: 'Package',
    config: {
      name: 'État des Stocks',
      dataSource: 'products',
      dimensions: [
        { id: 'd1', fieldId: 'category', fieldName: 'Catégorie', dataSource: 'products', sortOrder: 1 },
        { id: 'd2', fieldId: 'warehouse', fieldName: 'Entrepôt', dataSource: 'products', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'stockQuantity', fieldName: 'Quantité', dataSource: 'products', aggregation: 'sum', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'stockValue', fieldName: 'Valeur Stock', dataSource: 'products', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'margin', fieldName: 'Marge Totale', dataSource: 'products', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'isActive', fieldName: 'Actif', dataSource: 'products', operator: 'equals', value: true, enabled: true }
      ],
      chartType: 'pivot',
      pivotConfig: {
        rows: ['category'],
        columns: ['warehouse'],
        values: ['stockQuantity', 'stockValue'],
        rowSubtotals: true,
        columnSubtotals: true,
        grandTotal: true,
        showEmptyRows: false,
        showEmptyColumns: false
      },
      style: {
        theme: 'light',
        colorScheme: 'teal',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [
          {
            id: 'cf1',
            fieldId: 'stockQuantity',
            type: 'highlight',
            condition: { operator: 'less_than', value: 10 },
            style: { backgroundColor: '#fee2e2', textColor: '#991b1b' },
            enabled: true
          }
        ]
      }
    } as ReportConfig,
    tags: ['stock', 'inventaire', 'valorisation', 'entrepôt'],
    difficulty: 'intermediate',
    estimatedTime: '10 min'
  },
  {
    id: 'rotation-stock',
    name: 'Rotation des Stocks',
    nameAr: 'دوران المخزون',
    category: 'stock',
    description: 'Analyse de la rotation et couverture stock',
    icon: 'RefreshCw',
    config: {
      name: 'Rotation Stock',
      dataSource: 'inventory',
      dimensions: [
        { id: 'd1', fieldId: 'productName', fieldName: 'Produit', dataSource: 'inventory', sortOrder: 1 },
        { id: 'd2', fieldId: 'category', fieldName: 'Catégorie', dataSource: 'inventory', sortOrder: 2 },
        { id: 'd3', fieldId: 'movementType', fieldName: 'Type Mouvement', dataSource: 'inventory', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'quantity', fieldName: 'Quantité', dataSource: 'inventory', aggregation: 'sum', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'totalValue', fieldName: 'Valeur', dataSource: 'inventory', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' }
      ],
      filters: [],
      dateRange: { preset: 'this_year' },
      chartType: 'bar',
      style: {
        theme: 'light',
        colorScheme: 'cool',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'right',
        showGridLines: true,
        showDataLabels: true,
        stacked: true,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['rotation', 'stock', 'couverture', 'mouvements'],
    difficulty: 'intermediate',
    estimatedTime: '10 min'
  },
  {
    id: 'ruptures-stock',
    name: 'Alertes Rupture de Stock',
    nameAr: 'تنبيهات نفاد المخزون',
    category: 'stock',
    description: 'Produits en dessous du seuil de réapprovisionnement',
    icon: 'AlertTriangle',
    config: {
      name: 'Alertes Stock',
      dataSource: 'products',
      dimensions: [
        { id: 'd1', fieldId: 'name', fieldName: 'Produit', dataSource: 'products', sortOrder: 1 },
        { id: 'd2', fieldId: 'category', fieldName: 'Catégorie', dataSource: 'products', sortOrder: 2 },
        { id: 'd3', fieldId: 'supplier', fieldName: 'Fournisseur', dataSource: 'products', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'stockQuantity', fieldName: 'Stock Actuel', dataSource: 'products', aggregation: 'sum', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'reorderPoint', fieldName: 'Seuil Alert', dataSource: 'products', aggregation: 'sum', sortOrder: 2, format: 'integer' },
        { id: 'm3', fieldId: 'minStock', fieldName: 'Stock Min', dataSource: 'products', aggregation: 'sum', sortOrder: 3, format: 'integer' }
      ],
      filters: [
        { id: 'f1', fieldId: 'isActive', fieldName: 'Actif', dataSource: 'products', operator: 'equals', value: true, enabled: true }
      ],
      chartType: 'table',
      style: {
        theme: 'light',
        colorScheme: 'red',
        fontSize: 'medium',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: false,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: [
          {
            id: 'cf1',
            fieldId: 'stockQuantity',
            type: 'icon_set',
            condition: { operator: 'less_than', value: 0 },
            style: { icon: 'alert-circle', textColor: '#dc2626' },
            enabled: true
          }
        ],
        pagination: { pageSize: 30, enabled: true, showPageNumbers: true }
      }
    } as ReportConfig,
    tags: ['rupture', 'stock', 'alerte', 'réapprovisionnement'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    isNew: true
  },

  // ========================================
  // PRODUCTION Templates
  // ========================================
  {
    id: 'rendement-production',
    name: 'Rendement Production',
    nameAr: 'إنتاجية الإنتاج',
    category: 'production',
    description: 'Taux de rendement, qualité et coûts de production par OF',
    icon: 'Factory',
    config: {
      name: 'Rendement Production',
      dataSource: 'production',
      dimensions: [
        { id: 'd1', fieldId: 'workCenter', fieldName: 'Poste Travail', dataSource: 'production', sortOrder: 1 },
        { id: 'd2', fieldId: 'productName', fieldName: 'Produit', dataSource: 'production', sortOrder: 2 },
        { id: 'd3', fieldId: 'month', fieldName: 'Mois', dataSource: 'production', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'quantityProduced', fieldName: 'Qté Produite', dataSource: 'production', aggregation: 'sum', sortOrder: 1, format: 'integer' },
        { id: 'm2', fieldId: 'quantityDefect', fieldName: 'Rebuts', dataSource: 'production', aggregation: 'sum', sortOrder: 2, format: 'integer' },
        { id: 'm3', fieldId: 'yieldRate', fieldName: 'Rendement %', dataSource: 'production', aggregation: 'avg', sortOrder: 3, format: 'percentage' },
        { id: 'm4', fieldId: 'totalCost', fieldName: 'Coût Total', dataSource: 'production', aggregation: 'sum', sortOrder: 4, format: 'currency_dzd' },
        { id: 'm5', fieldId: 'unitCost', fieldName: 'Coût Unit.', dataSource: 'production', aggregation: 'avg', sortOrder: 5, format: 'currency_dzd' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'production', operator: 'equals', value: 'completed', enabled: true }
      ],
      dateRange: { preset: 'this_month' },
      chartType: 'combo',
      style: {
        theme: 'light',
        colorScheme: 'warm',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['production', 'rendement', 'qualité', 'coût', 'of'],
    difficulty: 'intermediate',
    estimatedTime: '10 min'
  },
  {
    id: 'cout-reviens',
    name: 'Coût de Revient',
    nameAr: 'تكلفة الإنتاج',
    category: 'production',
    description: 'Analyse du coût de revient par produit et composant',
    icon: 'Calculator',
    config: {
      name: 'Coût de Revient',
      dataSource: 'production',
      dimensions: [
        { id: 'd1', fieldId: 'productName', fieldName: 'Produit', dataSource: 'production', sortOrder: 1 },
        { id: 'd2', fieldId: 'workCenter', fieldName: 'Poste', dataSource: 'production', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'materialCost', fieldName: 'Coût Matière', dataSource: 'production', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'laborCost', fieldName: 'Coût MO', dataSource: 'production', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'overheadCost', fieldName: 'Coût Indirect', dataSource: 'production', aggregation: 'sum', sortOrder: 3, format: 'currency_dzd' },
        { id: 'm4', fieldId: 'totalCost', fieldName: 'Coût Total', dataSource: 'production', aggregation: 'sum', sortOrder: 4, format: 'currency_dzd' },
        { id: 'm5', fieldId: 'unitCost', fieldName: 'Coût Unitaire', dataSource: 'production', aggregation: 'avg', sortOrder: 5, format: 'currency_dzd' }
      ],
      filters: [],
      chartType: 'bar',
      style: {
        theme: 'light',
        colorScheme: 'orange',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'right',
        showGridLines: true,
        showDataLabels: true,
        stacked: true,
        percentageMode: true,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['coût', 'revient', 'production', 'analyse coût'],
    difficulty: 'advanced',
    estimatedTime: '15 min'
  },

  // ========================================
  // ACHATS (Procurement) Templates
  // ========================================
  {
    id: 'achats-par-fournisseur',
    name: 'Achats par Fournisseur',
    nameAr: 'المشتريات حسب المورد',
    category: 'achats',
    description: 'Volume et montant des achats par fournisseur',
    icon: 'ShoppingCart',
    config: {
      name: 'Achats Fournisseurs',
      dataSource: 'purchases',
      dimensions: [
        { id: 'd1', fieldId: 'supplierName', fieldName: 'Fournisseur', dataSource: 'purchases', sortOrder: 1 },
        { id: 'd2', fieldId: 'category', fieldName: 'Catégorie', dataSource: 'purchases', sortOrder: 2 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalTTC', fieldName: 'Montant TTC', dataSource: 'purchases', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'totalHT', fieldName: 'Montant HT', dataSource: 'purchases', aggregation: 'sum', sortOrder: 2, format: 'currency_dzd' },
        { id: 'm3', fieldId: 'id', fieldName: 'Nb Commandes', dataSource: 'purchases', aggregation: 'count', sortOrder: 3, format: 'integer' }
      ],
      filters: [
        { id: 'f1', fieldId: 'status', fieldName: 'Statut', dataSource: 'purchases', operator: 'not_equals', value: 'cancelled', enabled: true }
      ],
      sortBy: [{ fieldId: 'totalTTC', direction: 'desc' }],
      dateRange: { preset: 'this_year' },
      chartType: 'bar_horizontal',
      style: {
        theme: 'light',
        colorScheme: 'purple',
        fontSize: 'medium',
        showLegend: false,
        legendPosition: 'top',
        showGridLines: true,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['achats', 'fournisseurs', 'procurement', 'dépenses'],
    difficulty: 'beginner',
    estimatedTime: '5 min'
  },

  // ========================================
  // MAINTENANCE Templates
  // ========================================
  {
    id: 'suivi-maintenance',
    name: 'Tableau de Bord Maintenance',
    nameAr: 'لوحة متابعة الصيانة',
    category: 'direction',
    description: 'KPIs maintenance: MTTR, MTBF, coûts, disponibilité',
    icon: 'Wrench',
    config: {
      name: 'Maintenance Dashboard',
      dataSource: 'maintenance',
      dimensions: [
        { id: 'd1', fieldId: 'equipmentName', fieldName: 'Équipement', dataSource: 'maintenance', sortOrder: 1 },
        { id: 'd2', fieldId: 'type', fieldName: 'Type', dataSource: 'maintenance', sortOrder: 2 },
        { id: 'd3', fieldId: 'month', fieldName: 'Mois', dataSource: 'maintenance', sortOrder: 3 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalCost', fieldName: 'Coût Total', dataSource: 'maintenance', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'downtimeHours', fieldName: 'Arrêts (h)', dataSource: 'maintenance', aggregation: 'sum', sortOrder: 2, format: 'decimal_1' },
        { id: 'm3', fieldId: 'actualDuration', fieldName: 'Durée Interv.', dataSource: 'maintenance', aggregation: 'sum', sortOrder: 3, format: 'decimal_1' },
        { id: 'm4', fieldId: 'id', fieldName: 'Nb Interventions', dataSource: 'maintenance', aggregation: 'count', sortOrder: 4, format: 'integer' }
      ],
      filters: [],
      dateRange: { preset: 'this_quarter' },
      chartType: 'kpi',
      style: {
        theme: 'light',
        colorScheme: 'warm',
        fontSize: 'medium',
        showLegend: true,
        legendPosition: 'bottom',
        showGridLines: false,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['maintenance', 'mttr', 'mtbf', 'disponibilité', 'kpi'],
    difficulty: 'intermediate',
    estimatedTime: '10 min'
  },

  // ========================================
  // DIRECTION / EXECUTIVE Templates
  // ========================================
  {
    id: 'tableau-bord-general',
    name: 'Tableau de Bord Général',
    nameAr: 'لوحة المتابعة العامة',
    category: 'direction',
    description: 'Vue synthétique de l\'entreprise pour la direction générale',
    icon: 'LayoutDashboard',
    config: {
      name: 'Tableau Bord Direction',
      dataSource: 'invoices',
      dimensions: [
        { id: 'd1', fieldId: 'month', fieldName: 'Mois', dataSource: 'invoices', sortOrder: 1 }
      ],
      metrics: [
        { id: 'm1', fieldId: 'totalTTC', fieldName: 'CA', dataSource: 'invoices', aggregation: 'sum', sortOrder: 1, format: 'currency_dzd' },
        { id: 'm2', fieldId: 'id', fieldName: 'Factures', dataSource: 'invoices', aggregation: 'count', sortOrder: 2, format: 'integer' }
      ],
      dateRange: { preset: 'year_to_date', compareWithPrevious: true },
      chartType: 'kpi',
      style: {
        theme: 'light',
        colorScheme: 'corporate',
        fontSize: 'large',
        showLegend: true,
        legendPosition: 'bottom',
        showGridLines: false,
        showDataLabels: true,
        stacked: false,
        percentageMode: false,
        conditionalFormatting: []
      }
    } as ReportConfig,
    tags: ['dg', 'direction', 'executive', 'synthèse', 'kpi'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    isPopular: true,
    isNew: true
  }
]

// Get template by ID
export function getReportTemplate(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find(t => t.id === id)
}

// Get templates by category
export function getTemplatesByCategory(category: string): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(t => t.category === category)
}

// Get popular templates
export function getPopularTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(t => t.isPopular)
}

// Get new templates
export function getNewTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(t => t.isNew)
}

// Search templates
export function searchTemplates(query: string): ReportTemplate[] {
  const lowerQuery = query.toLowerCase()
  return REPORT_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

// Template categories with labels
export const TEMPLATE_CATEGORIES = [
  { id: 'comptabilite', name: 'Comptabilité', icon: 'Calculator', count: 4 },
  { id: 'commercial', name: 'Commercial', icon: 'TrendingUp', count: 4 },
  { id: 'rh', name: 'Ressources Humaines', icon: 'Users', count: 4 },
  { id: 'finance', name: 'Finance', icon: 'Landmark', count: 2 },
  { id: 'stock', name: 'Gestion des Stocks', icon: 'Package', count: 3 },
  { id: 'production', name: 'Production', icon: 'Factory', count: 2 },
  { id: 'achats', name: 'Achats', icon: 'ShoppingCart', count: 1 },
  { id: 'direction', name: 'Direction', icon: 'LayoutDashboard', count: 2 }
] as const

// Default empty report configuration
export function getDefaultReportConfig(dataSource?: DataSourceType): ReportConfig {
  return {
    name: 'Nouveau Rapport',
    dataSource: dataSource || 'invoices',
    dimensions: [],
    metrics: [],
    filters: [],
    chartType: 'table',
    style: {
      theme: 'light',
      colorScheme: 'default',
      fontSize: 'medium',
      showLegend: true,
      legendPosition: 'bottom',
      showGridLines: true,
      showDataLabels: false,
      stacked: false,
      percentageMode: false,
      conditionalFormatting: [],
      pagination: { pageSize: 25, enabled: true, showPageNumbers: true }
    }
  }
}
