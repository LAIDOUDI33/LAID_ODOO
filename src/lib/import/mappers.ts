// ============================================================
// Data Import System - Module Import Mappers
// Handles actual data import for each ERP module
// ============================================================

import { db } from '@/lib/db';
import { 
  ImportModule, 
  ImportRowData, 
  ImportOptions,
  EmployeeImportData,
  ChartAccountImportData,
  ProductImportData,
  PartnerImportData,
  InvoiceImportData,
  BillImportData,
  AttendanceImportData,
  JournalEntryImportData,
  WarehouseImportData,
  StockMovementImportData
} from './types';
import { convertFieldValue } from './validation';

export interface ImportResult {
  success: boolean;
  entityId?: string;
  entityType?: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
  warnings?: string[];
}

/**
 * Main import dispatcher - routes to module-specific handler
 */
export async function importRow(
  row: ImportRowData,
  module: ImportModule,
  companyId: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const data = row.mappedData || row.rawData;
  
  switch (module) {
    case 'employees':
      return importEmployee(data, companyId, options);
    case 'chart_of_accounts':
      return importChartAccount(data, companyId, options);
    case 'products':
      return importProduct(data, companyId, options);
    case 'partners':
      return importPartner(data, companyId, options);
    case 'invoices':
      return importInvoice(data, companyId, options);
    case 'bills':
      return importBill(data, companyId, options);
    case 'attendance':
      return importAttendance(data, companyId, options);
    case 'journal_entries':
      return importJournalEntry(data, companyId, options);
    case 'warehouses':
      return importWarehouse(data, companyId, options);
    case 'stock_movements':
      return importStockMovement(data, companyId, options);
    default:
      return {
        success: false,
        action: 'error',
        error: `Unsupported import module: ${module}`
      };
  }
}

/**
 * Create snapshot of current state for rollback support
 */
export async function createSnapshot(
  module: ImportModule,
  companyId: string
): Promise<string> {
  let records: any[] = [];
  
  switch (module) {
    case 'employees':
      records = await db.employee.findMany({ where: { companyId } });
      break;
    case 'products':
      records = await db.product.findMany({ where: { companyId } });
      break;
    case 'warehouses':
      records = await db.warehouse.findMany({ where: { companyId } });
      break;
    case 'partners':
      records = await db.partner.findMany({ where: { companyId } });
      break;
    case 'chart_of_accounts':
      records = await db.chartOfAccount.findMany({ where: { companyId } });
      break;
    // Add more modules as needed
  }
  
  return JSON.stringify(records);
}

/**
 * Rollback an import using snapshot
 */
export async function rollbackImport(
  snapshotData: string,
  module: ImportModule,
  companyId: string
): Promise<{ deleted: number; restored: number }> {
  const snapshot = JSON.parse(snapshotData);
  let deleted = 0;
  let restored = 0;
  
  try {
    // Delete all current records for this module/company
    switch (module) {
      case 'employees':
        deleted = await db.employee.deleteMany({ where: { companyId } }).then(r => r.count);
        if (snapshot.length > 0) {
          await db.employee.createMany({ data: snapshot.map((e: any) => ({ ...e, id: e.id })) });
          restored = snapshot.length;
        }
        break;
      case 'products':
        deleted = await db.product.deleteMany({ where: { companyId } }).then(r => r.count);
        if (snapshot.length > 0) {
          await db.product.createMany({ data: snapshot.map((p: any) => ({ ...p, id: p.id })) });
          restored = snapshot.length;
        }
        break;
      case 'partners':
        deleted = await db.partner.deleteMany({ where: { companyId } }).then(r => r.count);
        if (snapshot.length > 0) {
          await db.partner.createMany({ data: snapshot.map((p: any) => ({ ...p, id: p.id })) });
          restored = snapshot.length;
        }
        break;
      case 'chart_of_accounts':
        deleted = await db.chartOfAccount.deleteMany({ where: { companyId } }).then(r => r.count);
        if (snapshot.length > 0) {
          await db.chartOfAccount.createMany({ data: snapshot.map((a: any) => ({ ...a, id: a.id })) });
          restored = snapshot.length;
        }
        break;
      case 'warehouses':
        deleted = await db.warehouse.deleteMany({ where: { companyId } }).then(r => r.count);
        if (snapshot.length > 0) {
          await db.warehouse.createMany({ data: snapshot.map((w: any) => ({ ...w, id: w.id })) });
          restored = snapshot.length;
        }
        break;
    }
    
    return { deleted, restored };
  } catch (error) {
    throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================
// HR Module - Employees
// ============================================================

async function importEmployee(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const employeeData: EmployeeImportData = {
      firstName: String(data.firstName || data['Prénom'] || data.first_name || ''),
      lastName: String(data.lastName || data.Nom || data.last_name || ''),
      workEmail: data.workEmail || data['Email professionnel'] || data.email || undefined,
      personalEmail: data.personalEmail || data['Email personnel'] || undefined,
      phone: data.phone || data.Téléphone || data.phone_number || undefined,
      gender: data.gender || data.Sexe || undefined,
      dateOfBirth: convertFieldValue(data.dateOfBirth || data['Date de naissance'] || data.birthDate, { type: 'date', key: 'dateOfBirth' }),
      hireDate: convertFieldValue(data.hireDate || data["Date d'embauche"] || data.date_embauche, { type: 'date', key: 'hireDate' }),
      matricule: data.matricule || data.Matricule || data.employeeId || undefined,
      department: data.department || data.Département || data.service || undefined,
      jobTitle: data.jobTitle || data.Poste || data.position || undefined,
      jobPosition: data.jobPosition || data.Fonction || undefined,
      contractType: data.contractType || data['Type de contrat'] || data.type_contrat || undefined,
      baseSalary: convertFieldValue(data.baseSalary || data['Salaire de base'] || data.salary, { type: 'number', key: 'baseSalary' }),
      bankAccount: data.bankAccount || data['Compte bancaire'] || undefined,
      bankName: data.bankName || data.Banque || undefined,
      address: data.address || data.Adresse || undefined,
      city: data.city || data.Ville || undefined,
      wilayaCode: data.wilayaCode || data.Wilaya || data.wilaya || undefined,
      employeeStatus: data.employeeStatus || data.Statut || data.status || 'active',
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
    };
    
    // Check for existing employee
    const existingByMatricule = employeeData.matricule 
      ? await db.employee.findFirst({ where: { companyId, matricule: employeeData.matricule } })
      : null;
    const existingByEmail = employeeData.workEmail
      ? await db.employee.findFirst({ where: { companyId, workEmail: employeeData.workEmail } })
      : null;
    
    const existing = existingByMatricule || existingByEmail;
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Employee',
        action: 'skipped',
        warnings: [`Employee already exists: ${employeeData.matricule || employeeData.workEmail}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.employee.update({
        where: { id: existing.id },
        data: {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          workEmail: employeeData.workEmail,
          personalEmail: employeeData.personalEmail,
          phone: employeeData.phone,
          gender: employeeData.gender,
          dateOfBirth: employeeData.dateOfBirth,
          hireDate: employeeData.hireDate,
          matricule: employeeData.matricule,
          department: employeeData.department,
          jobTitle: employeeData.jobTitle,
          jobPosition: employeeData.jobPosition,
          contractType: employeeData.contractType,
          baseSalary: employeeData.baseSalary,
          bankAccount: employeeData.bankAccount,
          bankName: employeeData.bankName,
          address: employeeData.address,
          city: employeeData.city,
          wilayaCode: employeeData.wilayaCode,
          employeeStatus: employeeData.employeeStatus as any,
          isActive: employeeData.isActive
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Employee',
        action: 'updated'
      };
    }
    
    // Create new employee
    const created = await db.employee.create({
      data: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        workEmail: employeeData.workEmail,
        personalEmail: employeeData.personalEmail,
        phone: employeeData.phone,
        gender: employeeData.gender,
        dateOfBirth: employeeData.dateOfBirth,
        hireDate: employeeData.hireDate,
        matricule: employeeData.matricule,
        department: employeeData.department,
        jobTitle: employeeData.jobTitle,
        jobPosition: employeeData.jobPosition,
        contractType: employeeData.contractType as any,
        baseSalary: employeeData.baseSalary,
        bankAccount: employeeData.bankAccount,
        bankName: employeeData.bankName,
        address: employeeData.address,
        city: employeeData.city,
        wilayaCode: employeeData.wilayaCode,
        employeeStatus: employeeData.employeeStatus as any,
        isActive: employeeData.isActive,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Employee',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import employee: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Finance Module - Chart of Accounts
// ============================================================

async function importChartAccount(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const accountData: ChartAccountImportData = {
      code: String(data.code || data.Code || data.account_code || ''),
      name: String(data.name || data.Libellé || data.name_ar || ''),
      nameAr: data.nameAr || data['Nom arabe'] || undefined,
      type: String(data.type || data.Type || data.account_type || 'asset'),
      class: data.class || data.Classe || data.account_class || undefined,
      parentCode: data.parentCode || data['Compte parent'] || undefined,
      nature: data.nature || data.Nature || 'detail',
      isLeaf: data.isLeaf !== false && data.isLeaf !== 'false' && data.isLeaf !== '0',
      isTaxAccount: data.isTaxAccount === true || data.isTaxAccount === 'true' || data.isTaxAccount === '1',
      taxType: data.taxType || data['Type fiscal'] || undefined,
      reconcileable: data.reconciliable === true || data.reconciliable === 'true'
    };
    
    // Check required fields
    if (!accountData.code || !accountData.name) {
      return {
        success: false,
        action: 'error',
        error: 'Account code and name are required'
      };
    }
    
    // Check for existing account
    const existing = await db.chartOfAccount.findFirst({
      where: { companyId, code: accountData.code }
    });
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'ChartOfAccount',
        action: 'skipped',
        warnings: [`Account already exists: ${accountData.code}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.chartOfAccount.update({
        where: { id: existing.id },
        data: {
          name: accountData.name,
          nameAr: accountData.nameAr,
          type: accountData.type,
          class: accountData.class,
          parentCode: accountData.parentCode,
          nature: accountData.nature,
          isLeaf: accountData.isLeaf,
          isTaxAccount: accountData.isTaxAccount,
          taxType: accountData.taxType,
          reconcileable: accountData.reconciliable
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'ChartOfAccount',
        action: 'updated'
      };
    }
    
    // Validate parent exists if specified
    if (accountData.parentCode) {
      const parent = await db.chartOfAccount.findFirst({
        where: { companyId, code: accountData.parentCode }
      });
      if (!parent) {
        return {
          success: false,
          action: 'error',
          error: `Parent account not found: ${accountData.parentCode}`
        };
      }
    }
    
    const created = await db.chartOfAccount.create({
      data: {
        code: accountData.code,
        name: accountData.name,
        nameAr: accountData.nameAr,
        type: accountData.type,
        class: accountData.class,
        parentCode: accountData.parentCode,
        nature: accountData.nature,
        isLeaf: accountData.isLeaf,
        isTaxAccount: accountData.isTaxAccount,
        taxType: accountData.taxType,
        reconcileable: accountData.reconciliable,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'ChartOfAccount',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import chart account: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Inventory Module - Products
// ============================================================

async function importProduct(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const productData: ProductImportData = {
      name: String(data.name || data.Désignation || data.product_name || ''),
      code: data.code || data.Référence || data.reference || data.sku || undefined,
      description: data.description || data.Description || undefined,
      type: String(data.type || data.Type || data.product_type || 'stockable'),
      category: data.category || data.Catégorie || undefined,
      unitOfMeasure: data.unitOfMeasure || data['Unité de mesure'] || data.unit || 'U',
      purchasePrice: convertFieldValue(data.purchasePrice || data["Prix d'achat"] || data.purchase_price, { type: 'number', key: 'purchasePrice' }),
      salePrice: convertFieldValue(data.salePrice || data['Prix de vente'] || data.sale_price, { type: 'number', key: 'salePrice' }),
      costPrice: convertFieldValue(data.costPrice || data['Coût de revient'] || data.cost_price, { type: 'number', key: 'costPrice' }),
      tvaRate: convertFieldValue(data.tvaRate || data.TVA || data.tva || data.tax_rate, { type: 'number', key: 'tvaRate' }),
      trackStock: data.trackStock !== false && data.trackStock !== 'false',
      canBeSold: data.canBeSold !== false && data.canBeSold !== 'false',
      canBePurchased: data.canBePurchased !== false && data.canBePurchased !== 'false',
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
    };
    
    if (!productData.name) {
      return {
        success: false,
        action: 'error',
        error: 'Product name is required'
      };
    }
    
    // Check for existing product by code
    const existing = productData.code
      ? await db.product.findFirst({ where: { companyId, code: productData.code } })
      : await db.product.findFirst({ where: { companyId, name: productData.name } });
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Product',
        action: 'skipped',
        warnings: [`Product already exists: ${productData.code || productData.name}`]
      };
    }
    
    // Lookup category if provided by name
    let categoryId: string | undefined = undefined;
    if (productData.category) {
      const cat = await db.productCategory.findFirst({
        where: { companyId, name: productData.category }
      });
      if (cat) {
        categoryId = cat.id;
      }
      // If category doesn't exist, we'll create without it (or could create it)
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.product.update({
        where: { id: existing.id },
        data: {
          name: productData.name,
          code: productData.code,
          description: productData.description,
          type: productData.type as any,
          categoryId: categoryId,
          unitOfMeasure: productData.unitOfMeasure,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          costPrice: productData.costPrice,
          tvaRate: productData.tvaRate,
          trackStock: productData.trackStock,
          canBeSold: productData.canBeSold,
          canBePurchased: productData.canBePurchased,
          isActive: productData.isActive
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Product',
        action: 'updated'
      };
    }
    
    const created = await db.product.create({
      data: {
        name: productData.name,
        code: productData.code,
        description: productData.description,
        type: productData.type as any,
        categoryId: categoryId,
        unitOfMeasure: productData.unitOfMeasure,
        purchasePrice: productData.purchasePrice,
        salePrice: productData.salePrice,
        costPrice: productData.costPrice,
        tvaRate: productData.tvaRate,
        trackStock: productData.trackStock,
        canBeSold: productData.canBeSold,
        canBePurchased: productData.canBePurchased,
        isActive: productData.isActive,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Product',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import product: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Inventory Module - Warehouses
// ============================================================

async function importWarehouse(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const warehouseData: WarehouseImportData = {
      name: String(data.name || data.Nom || data.name || ''),
      code: data.code || data.Code || undefined,
      address: data.address || data.Adresse || undefined,
      city: data.city || data.Ville || undefined,
      type: (data.type || data.Type || 'principal') as WarehouseImportData['type'],
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
    };
    
    if (!warehouseData.name) {
      return {
        success: false,
        action: 'error',
        error: 'Warehouse name is required'
      };
    }
    
    // Check for existing warehouse (by name or code)
    const existingByName = await db.warehouse.findFirst({
      where: { companyId, name: warehouseData.name }
    });
    
    const existingByCode = warehouseData.code
      ? await db.warehouse.findFirst({
          where: { companyId, code: warehouseData.code }
        })
      : null;
    
    const existing = existingByName || existingByCode;
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Warehouse',
        action: 'skipped',
        warnings: [`Warehouse already exists: ${warehouseData.name}${warehouseData.code ? ` (${warehouseData.code})` : ''}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.warehouse.update({
        where: { id: existing.id },
        data: {
          name: warehouseData.name,
          code: warehouseData.code,
          address: warehouseData.address,
          city: warehouseData.city,
          type: warehouseData.type,
          isActive: warehouseData.isActive
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Warehouse',
        action: 'updated'
      };
    }
    
    const created = await db.warehouse.create({
      data: {
        name: warehouseData.name,
        code: warehouseData.code,
        address: warehouseData.address,
        city: warehouseData.city,
        type: warehouseData.type,
        isActive: warehouseData.isActive,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Warehouse',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import warehouse: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Inventory Module - Stock Movements
// ============================================================

async function importStockMovement(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const movementData: StockMovementImportData = {
      sku: String(data.sku || data.Référence || data.reference || data.product_sku || ''),
      productName: data.productName || data.Produit || data.product_name || undefined,
      warehouse: String(data.warehouse || data.Entrepôt || data.warehouse_name || ''),
      quantity: convertFieldValue(data.quantity || data.Quantité || data.qty, { type: 'number', key: 'quantity' }) || 0,
      unitCost: convertFieldValue(data.unitCost || data['Coût unitaire'] || data.unit_cost, { type: 'number', key: 'unitCost' }),
      location: data.location || data.Emplacement || undefined,
      notes: data.notes || data.Notes || undefined
    };
    
    if (!movementData.sku) {
      return {
        success: false,
        action: 'error',
        error: 'Product SKU is required for stock movement'
      };
    }
    
    if (!movementData.warehouse) {
      return {
        success: false,
        action: 'error',
        error: 'Warehouse is required for stock movement'
      };
    }
    
    // Find the product by SKU
    const product = await db.product.findFirst({
      where: { companyId, sku: movementData.sku }
    });
    
    if (!product) {
      return {
        success: false,
        action: 'error',
        error: `Product not found with SKU: ${movementData.sku}`
      };
    }
    
    // Find the warehouse by name
    const warehouse = await db.warehouse.findFirst({
      where: { companyId, name: movementData.warehouse }
    });
    
    if (!warehouse) {
      return {
        success: false,
        action: 'error',
        error: `Warehouse not found: ${movementData.warehouse}`
      };
    }
    
    // Check for existing stock movement for this product/warehouse
    const existingMovement = await db.inventoryMovement.findFirst({
      where: {
        productId: product.id,
        warehouseId: warehouse.id,
        reason: 'Initial stock import'
      }
    });
    
    if (existingMovement && !options.updateExisting) {
      return {
        success: true,
        entityId: existingMovement.id,
        entityType: 'InventoryMovement',
        action: 'skipped',
        warnings: [`Stock already initialized for ${movementData.sku} in ${movementData.warehouse}`]
      };
    }
    
    // Determine movement type based on quantity
    const movementType = movementData.quantity >= 0 ? 'in' : 'out';
    const absQuantity = Math.abs(movementData.quantity);
    
    if (existingMovement && options.updateExisting) {
      // Update existing initial stock
      const updated = await db.inventoryMovement.update({
        where: { id: existingMovement.id },
        data: {
          quantity: absQuantity,
          type: movementType,
          unitCost: movementData.unitCost,
          location: movementData.location,
          notes: movementData.notes || 'Initial stock import (updated)'
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'InventoryMovement',
        action: 'updated'
      };
    }
    
    // Create new inventory movement
    const created = await db.inventoryMovement.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        type: movementType,
        quantity: absQuantity,
        unitCost: movementData.unitCost,
        location: movementData.location,
        reason: movementData.notes || 'Initial stock import',
        reference: `STOCK-INIT-${Date.now()}`,
        companyId,
        movementDate: new Date()
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'InventoryMovement',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import stock movement: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// CRM Module - Partners (Customers/Suppliers)
// ============================================================

async function importPartner(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const partnerData: PartnerImportData = {
      name: String(data.name || data['Raison sociale'] || data.partner_name || ''),
      displayName: data.displayName || data['Nom affiché'] || undefined,
      type: String(data.type || data.Type || data.partner_type || 'customer'),
      isCompany: data.isCompany !== false && data.isCompany !== 'false',
      isTaxPayer: data.isTaxPayer !== false && data.isTaxPayer !== 'false',
      
      // Identifiants Algériens
      rc: data.rc || data.RC || undefined,
      nif: data.nif || data.NIF || undefined,
      nis: data.nis || data.NIS || undefined,
      ai: data.ai || data.AI || undefined,
      numArticleImpot: data.numArticleImpot || undefined,
      
      // Contact
      contactName: data.contactName || data.Contact || data.contactPerson || undefined,
      email: data.email || data.Email || undefined,
      phone: data.phone || data.Téléphone || undefined,
      mobile: data.mobile || data.Mobile || undefined,
      website: data.website || data['Site web'] || undefined,
      
      // Adresse
      address: data.address || data.Adresse || undefined,
      city: data.city || data.Ville || undefined,
      postalCode: data.postalCode || data['Code postal'] || undefined,
      wilayaCode: data.wilayaCode || data.Wilaya || undefined,
      
      // Financier
      paymentTerms: String(data.paymentTerms || data['Délai paiement'] || '30'),
      paymentMode: data.paymentMode || data['Mode paiement'] || undefined,
      creditLimit: convertFieldValue(data.creditLimit || data['Limite crédit'], { type: 'number', key: 'creditLimit' }),
      bankAccount: data.bankAccount || data.RIB || undefined,
      
      // Catégorisation
      category: data.category || data.Catégorie || undefined,
      
      // Statut
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0',
      notes: data.notes || data.Notes || undefined
    };
    
    if (!partnerData.name) {
      return { success: false, action: 'error', error: 'Partner name is required' };
    }
    
    // Validate partner type
    if (!['customer', 'supplier', 'both'].includes(partnerData.type)) {
      partnerData.type = 'customer';
    }
    
    // Check for existing partner
    const existing = await db.partner.findFirst({
      where: { 
        companyId, 
        OR: [
          { name: partnerData.name },
          ...(partnerData.email ? [{ email: partnerData.email }] : []),
          ...(partnerData.nif ? [{ nif: partnerData.nif }] : [])
        ]
      }
    });
    
    if (existing && !options.updateExisting) {
      return { success: true, entityId: existing.id, entityType: 'Partner', action: 'skipped', warnings: [`Partner already exists: ${partnerData.name}`] };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.partner.update({
        where: { id: existing.id },
        data: {
          name: partnerData.name,
          displayName: partnerData.displayName,
          type: partnerData.type as any,
          isCompany: partnerData.isCompany,
          isTaxPayer: partnerData.isTaxPayer,
          rc: partnerData.rc,
          nif: partnerData.nif,
          nis: partnerData.nis,
          ai: partnerData.ai,
          contactName: partnerData.contactName,
          email: partnerData.email,
          phone: partnerData.phone,
          mobile: partnerData.mobile,
          website: partnerData.website,
          address: partnerData.address,
          city: partnerData.city,
          postalCode: partnerData.postalCode,
          wilayaCode: partnerData.wilayaCode,
          paymentTerms: partnerData.paymentTerms,
          paymentMode: partnerData.paymentMode,
          creditLimit: partnerData.creditLimit,
          bankAccount: partnerData.bankAccount,
          category: partnerData.category,
          notes: partnerData.notes,
          isActive: partnerData.isActive
        }
      });
      return { success: true, entityId: updated.id, entityType: 'Partner', action: 'updated' };
    }
    
    const created = await db.partner.create({
      data: {
        name: partnerData.name,
        displayName: partnerData.displayName,
        type: partnerData.type as any,
        isCompany: partnerData.isCompany,
        isTaxPayer: partnerData.isTaxPayer,
        rc: partnerData.rc,
        nif: partnerData.nif,
        nis: partnerData.nis,
        ai: partnerData.ai,
        contactName: partnerData.contactName,
        email: partnerData.email,
        phone: partnerData.phone,
        mobile: partnerData.mobile,
        website: partnerData.website,
        address: partnerData.address,
        city: partnerData.city,
        postalCode: partnerData.postalCode,
        wilayaCode: partnerData.wilayaCode,
        paymentTerms: partnerData.paymentTerms,
        paymentMode: partnerData.paymentMode,
        creditLimit: partnerData.creditLimit,
        bankAccount: partnerData.bankAccount,
        category: partnerData.category,
        notes: partnerData.notes,
        isActive: partnerData.isActive,
        companyId
      }
    });
    
    return { success: true, entityId: created.id, entityType: 'Partner', action: 'created' };
    
  } catch (error) {
    return { success: false, action: 'error', error: `Failed to import partner: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================================
// Sales Module - Invoices
// ============================================================

async function importInvoice(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const invoiceData: InvoiceImportData = {
      invoiceNumber: String(data.invoiceNumber || data['N° facture'] || data.invoice_number || ''),
      partnerName: String(data.partnerName || data.Client || data.customer_name || ''),
      partnerType: 'customer',
      date: convertFieldValue(data.date || data.Date || data.invoice_date, { type: 'date', key: 'date' }),
      dueDate: convertFieldValue(data.dueDate || data['Échéance'] || data.due_date, { type: 'date', key: 'dueDate' }),
      subtotal: convertFieldValue(data.subtotal || data.Sous_total || data.subtotal, { type: 'number', key: 'subtotal' }),
      taxAmount: convertFieldValue(data.taxAmount || data.TVA || data.tax_amount, { type: 'number', key: 'taxAmount' }),
      discountAmount: convertFieldValue(data.discountAmount || data.Remise || data.discount, { type: 'number', key: 'discountAmount' }),
      totalAmount: convertFieldValue(data.totalAmount || data.Total || data.total || data['total TTC'], { type: 'number', key: 'totalAmount' }),
      status: data.status || data.Statut || 'paid',
      paymentStatus: data.paymentStatus || data['Statut paiement'] || 'paid',
      notes: data.notes || data.Notes || undefined
    };
    
    if (!invoiceData.invoiceNumber || !invoiceData.partnerName) {
      return {
        success: false,
        action: 'error',
        error: 'Invoice number and customer name are required'
      };
    }
    
    // Find or create partner
    let partner = await db.partner.findFirst({
      where: { companyId, name: invoiceData.partnerName, type: { in: ['customer', 'both'] } }
    });
    
    if (!partner) {
      partner = await db.partner.create({
        data: {
          name: invoiceData.partnerName,
          type: 'customer',
          companyId
        }
      });
    }
    
    // Check for existing invoice
    const existing = await db.invoice.findFirst({
      where: { companyId, invoiceNumber: invoiceData.invoiceNumber }
    });
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Invoice',
        action: 'skipped',
        warnings: [`Invoice already exists: ${invoiceData.invoiceNumber}`]
      };
    }
    
    const now = new Date();
    
    if (existing && options.updateExisting) {
      // Update existing invoice
      const updated = await db.invoice.update({
        where: { id: existing.id },
        data: {
          date: invoiceData.date,
          dueDate: invoiceData.dueDate,
          totalHT: invoiceData.subtotal || invoiceData.totalAmount / 1.19,
          taxAmount: invoiceData.taxAmount || 0,
          totalTTC: invoiceData.totalAmount,
          status: invoiceData.status as any,
          paymentStatus: invoiceData.paymentStatus as any,
          notes: invoiceData.notes,
          partnerId: partner.id
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Invoice',
        action: 'updated'
      };
    }
    
    // Create new invoice
    const created = await db.invoice.create({
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.date || now,
        dueDate: invoiceData.dueDate,
        totalHT: invoiceData.subtotal || invoiceData.totalAmount / 1.19,
        taxAmount: invoiceData.taxAmount || 0,
        totalTTC: invoiceData.totalAmount,
        status: invoiceData.status as any,
        paymentStatus: invoiceData.paymentStatus as any,
        notes: invoiceData.notes,
        partnerId: partner.id,
        companyId
      }
    });
    
    // Process line items if present
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        let product = item.productSku 
          ? await db.product.findFirst({ where: { companyId, sku: item.productSku } })
          : null;
        
        if (!product && item.productName) {
          product = await db.product.findFirst({ where: { companyId, name: item.productName } });
        }
        
        // Create invoice line
        await db.invoiceItem.create({
          data: {
            invoiceId: created.id,
            productId: product?.id,
            label: item.productName,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            taxRate: item.taxRate || 19,
            total: item.total || (item.quantity * item.unitPrice),
            companyId
          }
        });
      }
    }
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Invoice',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Purchases Module - Bills
// ============================================================

async function importBill(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const billData: BillImportData = {
      billNumber: String(data.billNumber || data['N° facture'] || data.bill_number || ''),
      supplierName: String(data.supplierName || data.Fournisseur || data.supplier_name || ''),
      date: convertFieldValue(data.date || data.Date || data.bill_date, { type: 'date', key: 'date' }),
      dueDate: convertFieldValue(data.dueDate || data['Échéance'] || data.due_date, { type: 'date', key: 'dueDate' }),
      subtotal: convertFieldValue(data.subtotal || data.Sous_total, { type: 'number', key: 'subtotal' }),
      taxAmount: convertFieldValue(data.taxAmount || data.TVA, { type: 'number', key: 'taxAmount' }),
      totalAmount: convertFieldValue(data.totalAmount || data.Total || data.total, { type: 'number', key: 'totalAmount' }),
      status: data.status || data.Statut || 'paid',
      paymentMethod: data.paymentMethod || data['Mode paiement'],
      notes: data.notes || data.Notes
    };
    
    if (!billData.billNumber || !billData.supplierName) {
      return {
        success: false,
        action: 'error',
        error: 'Bill number and supplier name are required'
      };
    }
    
    // Find or create supplier
    let supplier = await db.partner.findFirst({
      where: { companyId, name: billData.supplierName, type: { in: ['supplier', 'both'] } }
    });
    
    if (!supplier) {
      supplier = await db.partner.create({
        data: {
          name: billData.supplierName,
          type: 'supplier',
          companyId
        }
      });
    }
    
    // Check for existing bill
    const existing = await db.bill.findFirst({
      where: { companyId, billNumber: billData.billNumber }
    });
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Bill',
        action: 'skipped',
        warnings: [`Bill already exists: ${billData.billNumber}`]
      };
    }
    
    const now = new Date();
    
    if (existing && options.updateExisting) {
      const updated = await db.bill.update({
        where: { id: existing.id },
        data: {
          date: billData.date || now,
          dueDate: billData.dueDate,
          totalHT: billData.subtotal || billData.totalAmount / 1.19,
          taxAmount: billData.taxAmount || 0,
          totalTTC: billData.totalAmount,
          status: billData.status as any,
          paymentStatus: billData.status as any,
          paymentMethod: billData.paymentMethod,
          notes: billData.notes,
          supplierId: supplier.id
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Bill',
        action: 'updated'
      };
    }
    
    const created = await db.bill.create({
      data: {
        billNumber: billData.billNumber,
        date: billData.date || now,
        dueDate: billData.dueDate,
        totalHT: billData.subtotal || billData.totalAmount / 1.19,
        taxAmount: billData.taxAmount || 0,
        totalTTC: billData.totalAmount,
        status: billData.status as any,
        paymentStatus: billData.status as any,
        paymentMethod: billData.paymentMethod,
        notes: billData.notes,
        supplierId: supplier.id,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Bill',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import bill: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// HR Module - Attendance
// ============================================================

async function importAttendance(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const attendanceData: AttendanceImportData = {
      employeeId: String(data.employeeId || data.Matricule || data.employee_id || data.email || ''),
      date: convertFieldValue(data.date || data.Date, { type: 'date', key: 'date' }),
      checkIn: data.checkIn || data['Arrivée'] || data.check_in || undefined,
      checkOut: data.checkOut || data.Départ || data.check_out || undefined,
      breakMinutes: convertFieldValue(data.breakMinutes || data.Pause || data.break_minutes, { type: 'number', key: 'breakMinutes' }) || 0,
      workHours: convertFieldValue(data.workHours || data.Heures || data.work_hours, { type: 'number', key: 'workHours' }),
      status: data.status || data.Statut || 'present',
      overtimeHours: convertFieldValue(data.overtimeHours || data.HSup || data.overtime_hours, { type: 'number', key: 'overtimeHours' }),
      notes: data.notes || data.Notes
    };
    
    if (!attendanceData.employeeId || !attendanceData.date) {
      return {
        success: false,
        action: 'error',
        error: 'Employee ID and date are required'
      };
    }
    
    // Find employee by matricule or email
    let employee = await db.employee.findFirst({
      where: { companyId, employeeId: attendanceData.employeeId }
    });
    
    if (!employee) {
      employee = await db.employee.findFirst({
        where: { companyId, email: attendanceData.employeeId }
      });
    }
    
    if (!employee) {
      return {
        success: false,
        action: 'error',
        error: `Employee not found: ${attendanceData.employeeId}`
      };
    }
    
    // Check for existing attendance record
    const existing = await db.attendanceRecord.findFirst({
      where: { 
        employeeId: employee.id,
        date: attendanceData.date
      }
    });
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'AttendanceRecord',
        action: 'skipped',
        warnings: [`Attendance record already exists for this date`]
      };
    }
    
    // Calculate work hours if not provided
    let workHours = attendanceData.workHours;
    if (!workHours && attendanceData.checkIn && attendanceData.checkOut) {
      const [inH, inM] = attendanceData.checkIn.split(':').map(Number);
      const [outH, outM] = attendanceData.checkOut.split(':').map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (attendanceData.breakMinutes || 0);
      workHours = Math.round((totalMinutes / 60) * 100) / 100;
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          checkIn: attendanceData.checkIn,
          checkOut: attendanceData.checkOut,
          breakMinutes: attendanceData.breakMinutes || 0,
          workHours,
          status: attendanceData.status as any,
          overtimeHours: attendanceData.overtimeHours || 0,
          notes: attendanceData.notes
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'AttendanceRecord',
        action: 'updated'
      };
    }
    
    const created = await db.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        date: attendanceData.date,
        checkIn: attendanceData.checkIn,
        checkOut: attendanceData.checkOut,
        breakMinutes: attendanceData.breakMinutes || 0,
        workHours: workHours || 8,
        status: attendanceData.status as any,
        overtimeHours: attendanceData.overtimeHours || 0,
        notes: attendanceData.notes,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'AttendanceRecord',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import attendance: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================
// Finance Module - Journal Entries (Opening Balances)
// ============================================================

async function importJournalEntry(
  data: Record<string, any>,
  companyId: string,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    const entryData: JournalEntryImportData = {
      date: convertFieldValue(data.date || data.Date, { type: 'date', key: 'date' }),
      journalCode: String(data.journalCode || data.Journal || data.journal_code || 'OD'), // OD = Opening
      label: String(data.label || data.Libellé || data.description || ''),
      reference: data.reference || data.Référence || undefined,
      lines: data.lines || []
    };
    
    if (!entryData.date || !entryData.label) {
      return {
        success: false,
        action: 'error',
        error: 'Date and label are required for journal entry'
      };
    }
    
    // Find journal
    const journal = await db.journal.findFirst({
      where: { companyId, code: entryData.journalCode }
    });
    
    if (!journal) {
      return {
        success: false,
        action: 'error',
        error: `Journal not found: ${entryData.journalCode}`
      };
    }
    
    // Validate entry is balanced
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of entryData.lines) {
      totalDebit += Number(line.debit) || 0;
      totalCredit += Number(line.credit) || 0;
    }
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        action: 'error',
        error: `Journal entry not balanced: Debit=${totalDebit}, Credit=${totalCredit}`
      };
    }
    
    // Create journal entry with lines
    const created = await db.journalEntry.create({
      data: {
        date: entryData.date,
        label: entryData.label,
        reference: entryData.reference || `IMPORT-${Date.now()}`,
        totalDebit,
        totalCredit,
        status: 'posted',
        journalId: journal.id,
        companyId
      }
    });
    
    // Create entry lines
    for (const lineData of entryData.lines) {
      const account = await db.chartOfAccount.findFirst({
        where: { companyId, code: lineData.accountCode }
      });
      
      if (!account) {
        continue; // Skip invalid accounts
      }
      
      let partnerId: string | undefined;
      if (lineData.partnerRef) {
        const partner = await db.partner.findFirst({
          where: { companyId, name: lineData.partnerRef }
        });
        partnerId = partner?.id;
      }
      
      await db.journalEntryLine.create({
        data: {
          entryId: created.id,
          accountId: account.id,
          label: lineData.label || entryData.label,
          debit: Number(lineData.debit) || 0,
          credit: Number(lineData.credit) || 0,
          partnerId,
          companyId
        }
      });
    }
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'JournalEntry',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
