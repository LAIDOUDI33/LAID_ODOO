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
      email: data.email || data.Email || undefined,
      phone: data.phone || data.Téléphone || data.phone_number || undefined,
      gender: data.gender || data.Sexe || undefined,
      birthDate: convertFieldValue(data.birthDate || data['Date de naissance'], { type: 'date', key: 'birthDate' }),
      hireDate: convertFieldValue(data.hireDate || data['Date d\'embauche'] || data.date_embauche, { type: 'date', key: 'hireDate' }),
      employeeId: data.employeeId || data.Matricule || data.matricule || undefined,
      department: data.department || data.Département || data.service || undefined,
      position: data.position || data.Poste || undefined,
      contractType: data.contractType || data['Type de contrat'] || data.type_contrat || undefined,
      salary: convertFieldValue(data.salary || data.Salaire || data.salaire, { type: 'number', key: 'salary' }),
      bankAccount: data.bankAccount || data['Compte bancaire'] || undefined,
      bankName: data.bankName || data.Banque || undefined,
      address: data.address || data.Adresse || undefined,
      city: data.city || data.Ville || undefined,
      wilayaCode: data.wilayaCode || data.Wilaya || data.wilaya || undefined,
      status: data.status || data.Statut || 'active'
    };
    
    // Check for existing employee
    const existingByMatricule = employeeData.employeeId 
      ? await db.employee.findFirst({ where: { companyId, employeeId: employeeData.employeeId } })
      : null;
    const existingByEmail = employeeData.email
      ? await db.employee.findFirst({ where: { companyId, email: employeeData.email } })
      : null;
    
    const existing = existingByMatricule || existingByEmail;
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Employee',
        action: 'skipped',
        warnings: [`Employee already exists: ${employeeData.employeeId || employeeData.email}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.employee.update({
        where: { id: existing.id },
        data: {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          gender: employeeData.gender,
          birthDate: employeeData.birthDate,
          hireDate: employeeData.hireDate,
          employeeId: employeeData.employeeId,
          department: employeeData.department,
          position: employeeData.position,
          contractType: employeeData.contractType,
          salary: employeeData.salary,
          bankAccount: employeeData.bankAccount,
          bankName: employeeData.bankName,
          address: employeeData.address,
          city: employeeData.city,
          wilayaCode: employeeData.wilayaCode,
          status: employeeData.status
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
        email: employeeData.email,
        phone: employeeData.phone,
        gender: employeeData.gender,
        birthDate: employeeData.birthDate,
        hireDate: employeeData.hireDate,
        employeeId: employeeData.employeeId,
        department: employeeData.department,
        position: employeeData.position,
        contractType: employeeData.contractType,
        salary: employeeData.salary,
        bankAccount: employeeData.bankAccount,
        bankName: employeeData.bankName,
        address: employeeData.address,
        city: employeeData.city,
        wilayaCode: employeeData.wilayaCode,
        status: employeeData.status,
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
      category: data.category || data.Catégorie || undefined,
      parentCode: data.parentCode || data['Compte parent'] || undefined,
      balance: convertFieldValue(data.balance || data['Solde initial'] || data.opening_balance, { type: 'number', key: 'balance' }),
      currency: data.currency || data.Devise || 'DZD',
      taxDeductible: data.taxDeductible === true || data.taxDeductible === 'true' || data.taxDeductible === '1',
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
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
          category: accountData.category,
          parentCode: accountData.parentCode,
          taxDeductible: accountData.taxDeductible,
          isActive: accountData.isActive
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
        category: accountData.category,
        parentCode: accountData.parentCode,
        taxDeductible: accountData.taxDeductible,
        isActive: accountData.isActive,
        companyId
      }
    });
    
    // If opening balance provided, create journal entry
    if (accountData.balance && accountData.balance !== 0) {
      // TODO: Create opening balance journal entry
    }
    
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
      sku: data.sku || data.Référence || data.reference || undefined,
      barcode: data.barcode || data['Code barre'] || undefined,
      type: String(data.type || data.Type || data.product_type || 'product'),
      category: data.category || data.Catégorie || undefined,
      unit: data.unit || data.Unité || data.unité || 'unité',
      purchasePrice: convertFieldValue(data.purchasePrice || data["Prix d'achat"] || data.purchase_price, { type: 'number', key: 'purchasePrice' }),
      salePrice: convertFieldValue(data.salePrice || data['Prix de vente'] || data.sale_price, { type: 'number', key: 'salePrice' }),
      taxRate: convertFieldValue(data.taxRate || data.TVA || data.tva || data.tax_rate, { type: 'number', key: 'taxRate' }),
      stockQuantity: convertFieldValue(data.stockQuantity || data.Stock || data.stock_initial, { type: 'number', key: 'stockQuantity' }),
      minStock: convertFieldValue(data.minStock || data['Stock min'] || data.min_stock, { type: 'number', key: 'minStock' }),
      warehouse: data.warehouse || data.Entrepôt || undefined,
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
    };
    
    if (!productData.name) {
      return {
        success: false,
        action: 'error',
        error: 'Product name is required'
      };
    }
    
    // Check for existing product
    const existingBySku = productData.sku
      ? await db.product.findFirst({ where: { companyId, sku: productData.sku } })
      : null;
    const existingByBarcode = productData.barcode
      ? await db.product.findFirst({ where: { companyId, barcode: productData.barcode } })
      : null;
    
    const existing = existingBySku || existingByBarcode;
    
    if (existing && !options.updateExisting) {
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Product',
        action: 'skipped',
        warnings: [`Product already exists: ${productData.sku || productData.barcode}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.product.update({
        where: { id: existing.id },
        data: {
          name: productData.name,
          sku: productData.sku,
          barcode: productData.barcode,
          type: productData.type,
          category: productData.category,
          unit: productData.unit,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          taxRate: productData.taxRate,
          minStock: productData.minStock,
          isActive: productData.isActive
        }
      });
      
      // Update stock if provided
      if (productData.stockQuantity !== undefined && productData.stockQuantity !== null) {
        // Update stock in warehouse
      }
      
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
        sku: productData.sku,
        barcode: productData.barcode,
        type: productData.type,
        category: productData.category,
        unit: productData.unit,
        purchasePrice: productData.purchasePrice,
        salePrice: productData.salePrice,
        taxRate: productData.taxRate,
        isActive: productData.isActive,
        companyId
      }
    });
    
    // Set initial stock if warehouse specified
    if (productData.stockQuantity && productData.warehouse) {
      const warehouse = await db.warehouse.findFirst({
        where: { companyId, name: productData.warehouse }
      });
      
      if (warehouse) {
        await db.inventoryMovement.create({
          data: {
            productId: created.id,
            warehouseId: warehouse.id,
            type: 'in',
            quantity: productData.stockQuantity,
            reason: 'Initial stock import',
            reference: `IMPORT-${Date.now()}`,
            companyId
          }
        });
      }
    }
    
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
      name: String(data.name || data.Raison_sociale || data.partner_name || ''),
      type: String(data.type || data.Type || data.partner_type || 'customer'),
      email: data.email || data.Email || undefined,
      phone: data.phone || data.Téléphone || undefined,
      address: data.address || data.Adresse || undefined,
      city: data.city || data.Ville || undefined,
      wilayaCode: data.wilayaCode || data.Wilaya || undefined,
      nif: data.nif || data.NIF || undefined,
      nis: data.nis || data.NIS || undefined,
      rc: data.rc || data.RC || undefined,
      contactPerson: data.contactPerson || data.Contact || data.personne_contact || undefined,
      paymentTerms: convertFieldValue(data.paymentTerms || data['Conditions paiement'], { type: 'number', key: 'paymentTerms' }),
      creditLimit: convertFieldValue(data.creditLimit || data['Limite crédit'], { type: 'number', key: 'creditLimit' }),
      isActive: data.isActive !== false && data.isActive !== 'false' && data.isActive !== '0'
    };
    
    if (!partnerData.name) {
      return {
        success: false,
        action: 'error',
        error: 'Partner name is required'
      };
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
      return {
        success: true,
        entityId: existing.id,
        entityType: 'Partner',
        action: 'skipped',
        warnings: [`Partner already exists: ${partnerData.name}`]
      };
    }
    
    if (existing && options.updateExisting) {
      const updated = await db.partner.update({
        where: { id: existing.id },
        data: {
          name: partnerData.name,
          type: partnerData.type,
          email: partnerData.email,
          phone: partnerData.phone,
          address: partnerData.address,
          city: partnerData.city,
          wilayaCode: partnerData.wilayaCode,
          nif: partnerData.nif,
          nis: partnerData.nis,
          rc: partnerData.rc,
          contactPerson: partnerData.contactPerson,
          paymentTerms: partnerData.paymentTerms,
          creditLimit: partnerData.creditLimit,
          isActive: partnerData.isActive
        }
      });
      
      return {
        success: true,
        entityId: updated.id,
        entityType: 'Partner',
        action: 'updated'
      };
    }
    
    const created = await db.partner.create({
      data: {
        name: partnerData.name,
        type: partnerData.type,
        email: partnerData.email,
        phone: partnerData.phone,
        address: partnerData.address,
        city: partnerData.city,
        wilayaCode: partnerData.wilayaCode,
        nif: partnerData.nif,
        nis: partnerData.nis,
        rc: partnerData.rc,
        contactPerson: partnerData.contactPerson,
        paymentTerms: partnerData.paymentTerms || 30,
        creditLimit: partnerData.creditLimit || 0,
        isActive: partnerData.isActive,
        companyId
      }
    });
    
    return {
      success: true,
      entityId: created.id,
      entityType: 'Partner',
      action: 'created'
    };
    
  } catch (error) {
    return {
      success: false,
      action: 'error',
      error: `Failed to import partner: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
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
