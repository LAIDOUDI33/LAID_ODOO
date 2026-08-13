// ============================================================
// HASSIBA Suite ERP v2.0.0 - Workflow Orchestrator
// Moteur de Workflow End-to-End pour ERP Algérien
// 
// Flux implémentés:
// 1. Devis → Commande Client → Facture → Paiement
// 2. Demande Achat → Commande Achat → Réception → Facture Fournisseur → Paiement
// 3. Génération automatique des écritures comptables (SCF)
// 4. Automatisation des mouvements de stock
// ============================================================

import { db } from '@/lib/db';
import { calculateTVACollectee, calculateTVADeductible, getTimbreFiscal } from '@/lib/algerian-taxes';

// ============================================================
// Types & Interfaces
// ============================================================

export interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  workflowTrace: WorkflowStepTrace[];
}

export interface WorkflowStepTrace {
  step: string;
  status: 'completed' | 'skipped' | 'failed';
  timestamp: Date;
  details?: string;
  entityId?: string;
}

export interface ConvertQuotationInput {
  quotationId: string;
  partnerId?: string;
  expectedDate?: string;
  paymentTerms?: string;
  paymentMode?: string;
  warehouseId?: string;
  salesPersonId?: string;
  internalNotes?: string;
  customerNotes?: string;
}

export interface ConvertSalesOrderToInvoiceInput {
  salesOrderId: string;
  dueDate?: string;
  paymentMode?: string;
  internalNotes?: string;
  customerNotes?: string;
}

export interface ReceivePurchaseOrderInput {
  purchaseOrderId: string;
  lines: Array<{
    lineId: string;
    quantity: number;
    locationId?: string;
  }>;
  notes?: string;
}

export interface CreateBillFromPOInput {
  purchaseOrderId: string;
  dueDate?: string;
  supplierReference?: string;
  internalNotes?: string;
}

export interface RecordPaymentInput {
  invoiceType: 'customer' | 'supplier';
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  bankAccountId?: string;
  reference?: string;
  notes?: string;
}

export interface JournalEntryInput {
  date: Date;
  journalType: 'sales' | 'purchase' | 'cash' | 'general';
  reference: string;
  label: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    label?: string;
    partnerId?: string;
  }>;
  sourceType: string;
  sourceId: string;
  companyId: string;
}

// ============================================================
// SCF Account Mapping (Plan Comptable Algérien)
// ============================================================

const SCF_ACCOUNTS = {
  // Classe 4 - Comptes de Tiers
  CLIENTS: '410000',      // Clients
  FOURNISSEURS: '440000', // Fournisseurs
  TVA_COLLECTEE: '445700', // TVA collectée
  TVA_DEDUCTIBLE: '445800', // TVA déductible sur achats
  TIMBRE_FISCAL: '445890', // Timbre fiscal
  
  // Classe 7 - Comptes de Produits
  VENTES: '701000',      // Ventes de marchandises
  VENTES_SERVICES: '706000', // Prestations de services
  
  // Classe 6 - Comptes de Charges
  ACHATS: '601000',      // Achats de marchandises
  ACHATS_SERVICES: '606000', // Achats non stockables
  TRANSPORT: '624000',   // Transport
  ASSURANCE: '616000',   // Assures
  
  // Classe 5 - Comptes Financiers
  BANQUE: '512000',      // Banque
  CAISSE: '530000',      // Caisse
};

// ============================================================
// WORKFLOW 1: Devis → Commande Client (Quote → Sales Order)
// ============================================================

export async function convertQuotationToSalesOrder(
  input: ConvertQuotationInput,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Validate and fetch quotation
    trace.push({ step: 'validate_quotation', status: 'completed', timestamp: new Date() });
    
    const quotation = await db.quotation.findUnique({
      where: { id: input.quotationId },
      include: { lines: true, partner: true }
    });
    
    if (!quotation) {
      return {
        success: false,
        message: 'Devis non trouvé',
        workflowTrace: trace,
        errors: ['Quotation not found']
      };
    }
    
    if (!['draft', 'sent', 'viewed'].includes(quotation.status)) {
      return {
        success: false,
        message: `Le devis ne peut pas être converti (statut actuel: ${quotation.status})`,
        workflowTrace: trace,
        errors: [`Invalid quotation status: ${quotation.status}`]
      };
    }

    // Step 2: Check for existing conversion
    trace.push({ step: 'check_existing_conversion', status: 'completed', timestamp: new Date() });
    
    const existingConversion = await db.salesOrder.findFirst({
      where: { quotationId: input.quotationId }
    });
    
    if (existingConversion) {
      return {
        success: false,
        message: 'Ce devis a déjà été converti en commande',
        workflowTrace: trace,
        errors: ['Quotation already converted'],
        data: existingConversion
      };
    }

    // Step 3: Get company
    trace.push({ step: 'get_company', status: 'completed', timestamp: new Date() });
    
    const company = await db.company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      return {
        success: false,
        message: 'Aucune entreprise active configurée',
        workflowTrace: trace,
        errors: ['No active company']
      };
    }

    // Step 4: Generate Sales Order reference
    trace.push({ step: 'generate_reference', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const orderCount = await db.salesOrder.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `CMD-${year}-${month}` }
      }
    });
    const sequence = String(orderCount + 1).padStart(3, '0');
    const reference = `CMD-${year}-${month}-${sequence}`;

    // Step 5: Create Sales Order from Quotation lines
    trace.push({ step: 'create_sales_order', status: 'completed', timestamp: new Date() });
    
    const linesData = quotation.lines.map(line => ({
      productId: line.productId,
      description: line.description || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      tvaRate: line.tvaRate,
      amountUntaxed: line.amountUntaxed,
      amountTax: line.amountTax,
      amountTotal: line.amountTotal,
      quantityDelivered: 0,
      quantityInvoiced: 0
    }));

    // Calculate totals
    const amountUntaxed = linesData.reduce((sum, l) => sum + l.amountUntaxed, 0);
    const amountTax = linesData.reduce((sum, l) => sum + l.amountTax, 0);
    const timbreFiscal = getTimbreFiscal('facture', amountUntaxed + amountTax);
    const amountTotal = amountUntaxed + amountTax + timbreFiscal;

    const salesOrder = await db.$transaction(async (tx) => {
      // Create the sales order
      const order = await tx.salesOrder.create({
        data: {
          reference,
          date: now,
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
          status: 'sent',
          
          // Amounts
          amountUntaxed,
          amountTax,
          timbreFiscal,
          amountTotal,
          amountDelivered: 0,
          amountInvoiced: 0,
          
          // Relations
          partnerId: input.partnerId || quotation.partnerId,
          companyId: company.id,
          warehouseId: input.warehouseId || null,
          salesPersonId: input.salesPersonId || quotation.salesPersonId || null,
          quotationId: quotation.id,
          opportunityId: quotation.opportunityId || null,
          
          // Payment & Shipping
          paymentTerms: input.paymentTerms || quotation.paymentTerms || '30',
          paymentMode: input.paymentMode || quotation.paymentMode || null,
          shippingAddress: null,
          
          // Notes
          internalNotes: input.internalNotes || quotation.internalNotes || null,
          customerNotes: input.customerNotes || quotation.customerNotes || null,
          
          // Lines
          lines: { create: linesData }
        },
        include: {
          partner: true,
          lines: { include: { product: true } }
        }
      });

      // Update quotation status to converted
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { 
          status: 'converted',
          convertedToId: order.id
        }
      });

      // Update opportunity status if linked
      if (quotation.opportunityId) {
        await tx.opportunity.update({
          where: { id: quotation.opportunityId },
          data: { status: 'proposal_sent' }
        });
      }

      return order;
    });

    trace.push({ 
      step: 'conversion_completed', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: salesOrder.id,
      details: `Commande ${reference} créée depuis le devis ${quotation.reference}`
    });

    return {
      success: true,
      message: `Commande client ${reference} créée avec succès depuis le devis ${quotation.reference}`,
      data: salesOrder,
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in convertQuotationToSalesOrder:', error);
    trace.push({ 
      step: 'conversion_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de la conversion du devis en commande',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// WORKFLOW 2: Commande Client → Facture (Sales Order → Invoice)
// ============================================================

export async function convertSalesOrderToInvoice(
  input: ConvertSalesOrderToInvoiceInput,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Validate and fetch sales order
    trace.push({ step: 'validate_sales_order', status: 'completed', timestamp: new Date() });
    
    const salesOrder = await db.salesOrder.findUnique({
      where: { id: input.salesOrderId },
      include: { 
        lines: true, 
        partner: true,
        company: true
      }
    });
    
    if (!salesOrder) {
      return {
        success: false,
        message: 'Commande client non trouvée',
        workflowTrace: trace,
        errors: ['Sales order not found']
      };
    }
    
    if (!['confirmed', 'processing', 'delivered'].includes(salesOrder.status)) {
      return {
        success: false,
        message: `La commande ne peut pas être facturée (statut: ${salesOrder.status})`,
        workflowTrace: trace,
        errors: [`Invalid sales order status: ${salesOrder.status}`]
      };
    }

    // Step 2: Get or validate company
    trace.push({ step: 'get_company', status: 'completed', timestamp: new Date() });
    
    const company = salesOrder.company || await db.company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      return {
        success: false,
        message: 'Aucune entreprise active configurée',
        workflowTrace: trace,
        errors: ['No active company']
      };
    }

    // Step 3: Generate Invoice reference
    trace.push({ step: 'generate_invoice_reference', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const invoiceCount = await db.invoice.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `FACT-${year}-${month}` }
      }
    });
    const sequence = String(invoiceCount + 1).padStart(3, '0');
    const reference = `FACT-${year}-${month}-${sequence}`;

    // Step 4: Calculate amounts from SO lines (only uninvoiced quantities)
    trace.push({ step: 'calculate_amounts', status: 'completed', timestamp: new Date() });
    
    const invoiceLines = salesOrder.lines
      .filter(line => line.quantity > line.quantityInvoiced)
      .map(line => {
        const qtyToInvoice = line.quantity - line.quantityInvoiced;
        const ratio = qtyToInvoice / line.quantity;
        
        return {
          productId: line.productId,
          label: line.description || null,
          quantity: qtyToInvoice,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          tvaRate: line.tvaRate,
          amountUntaxed: Math.round(line.amountUntaxed * ratio * 100) / 100,
          amountTax: Math.round(line.amountTax * ratio * 100) / 100,
          amountTotal: Math.round(line.amountTotal * ratio * 100) / 100
        };
      });

    if (invoiceLines.length === 0) {
      return {
        success: false,
        message: 'Toutes les lignes de la commande sont déjà facturées',
        workflowTrace: trace,
        errors: ['All lines already invoiced']
      };
    }

    const amountUntaxed = invoiceLines.reduce((sum, l) => sum + l.amountUntaxed, 0);
    const amountTax = invoiceLines.reduce((sum, l) => sum + l.amountTax, 0);
    const timbreFiscal = getTimbreFiscal('facture', amountUntaxed + amountTax);
    const amountTotal = Math.round((amountUntaxed + amountTax + timbreFiscal) * 100) / 100;

    // Step 5: Create Invoice and update SO in transaction
    trace.push({ step: 'create_invoice', status: 'completed', timestamp: new Date() });
    
    const dueDate = input.dueDate 
      ? new Date(input.dueDate) 
      : new Date(now.getTime() + (parseInt(salesOrder.paymentTerms || '30') * 24 * 60 * 60 * 1000));

    const result = await db.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          reference,
          date: now,
          dueDate,
          status: 'posted', // Auto-post when created from validated SO
          type: 'invoice',
          
          // Amounts
          amountUntaxed,
          amountTax,
          timbreFiscal,
          amountTotal,
          amountPaid: 0,
          amountDue: amountTotal,
          
          // Partner & Company
          partnerId: salesOrder.partnerId,
          companyId: company.id,
          
          // Payment info
          paymentTerm: salesOrder.paymentTerms || '30',
          paymentMode: input.paymentMode || salesOrder.paymentMode || null,
          
          // Source tracking
          sourceType: 'sales_order',
          sourceId: salesOrder.id,
          
          // Notes
          internalNotes: input.internalNotes || `Facture générée depuis commande ${salesOrder.reference}`,
          customerNotes: input.customerNotes || salesOrder.customerNotes || null,
          
          // Lines
          lines: { create: invoiceLines }
        },
        include: {
          partner: true,
          lines: { include: { product: true } }
        }
      });

      // Link invoice to sales order
      await tx.salesOrder.update({
        where: { id: salesOrder.id },
        data: {
          invoices: { connect: { id: invoice.id } },
          amountInvoiced: salesOrder.amountInvoiced + amountUntaxed,
          status: salesOrder.status === 'delivered' ? 'invoiced' : salesOrder.status
        }
      });

      // Update line quantities invoiced
      for (const soLine of salesOrder.lines) {
        const invLine = invoiceLines.find(il => il.productId === soLine.productId);
        if (invLine) {
          await tx.salesOrderLine.update({
            where: { id: soLine.id },
            data: {
              quantityInvoiced: soLine.quantityInvoiced + invLine.quantity
            }
          });
        }
      }

      // Auto-generate SCF Journal Entry
      await generateSCFJournalEntryFromInvoice(tx, invoice, company);

      return { invoice, salesOrderId: salesOrder.id };
    });

    trace.push({ 
      step: 'invoice_created', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: result.invoice.id,
      details: `Facture ${reference} créée depuis commande ${salesOrder.reference}`
    });

    trace.push({ 
      step: 'journal_entry_generated', 
      status: 'completed', 
      timestamp: new Date(),
      details: 'Écriture comptable SCF générée automatiquement'
    });

    return {
      success: true,
      message: `Facture ${reference} créée avec succès depuis la commande ${salesOrder.reference}`,
      data: result.invoice,
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in convertSalesOrderToInvoice:', error);
    trace.push({ 
      step: 'invoice_creation_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de la création de la facture',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// *** CANONICAL GOODS RECEIPT METHOD ***
// WORKFLOW 3: Commande Achat → Réception (PO → Goods Receipt)
// 
// THIS IS THE SINGLE SOURCE OF TRUTH FOR GOODS RECEIPT.
// All receipt operations MUST use this function.
// 
// Consistency guarantees:
// - Uses $transaction for atomic updates
// - Always creates StockMovement with type 'in_receipt'
// - Always updates StockLevel (find or create)
// - Validates quantities > 0
// - Updates PO status appropriately (received/partial)
// ============================================================

export async function receivePurchaseOrder(
  input: ReceivePurchaseOrderInput,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Validate PO exists and has correct status
    trace.push({ step: 'validate_purchase_order', status: 'completed', timestamp: new Date() });
    
    const po = await db.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { 
        lines: { include: { product: true } }, 
        partner: true,
        warehouse: true,
        company: true
      }
    });
    
    if (!po) {
      return {
        success: false,
        message: "Commande d'achat non trouvée",
        workflowTrace: trace,
        errors: ['Purchase order not found']
      };
    }
    
    // Allow receipt from confirmed, sent, or partially received POs
    if (!['confirmed', 'sent', 'partial'].includes(po.status)) {
      return {
        success: false,
        message: `Impossible de réceptionner une commande avec le statut '${po.status}'. La commande doit être confirmée ou partiellement reçue.`,
        workflowTrace: trace,
        errors: [`Invalid PO status: ${po.status}. Must be confirmed, sent, or partial.`]
      };
    }

    // Step 2: Validate received quantities (> 0 and within limits)
    trace.push({ step: 'validate_quantities', status: 'completed', timestamp: new Date() });
    
    for (const recvLine of input.lines) {
      // Validate lineId is provided
      if (!recvLine.lineId) {
        return {
          success: false,
          message: "L'ID de la ligne est requis pour chaque ligne de réception",
          workflowTrace: trace,
          errors: ['Missing lineId in receipt line']
        };
      }
      
      // Validate quantity > 0 (CRITICAL: prevents zero/negative stock changes)
      if (!recvLine.quantity || recvLine.quantity <= 0) {
        return {
          success: false,
          message: `La quantité doit être supérieure à 0 (reçu: ${recvLine.quantity})`,
          workflowTrace: trace,
          errors: [`Invalid quantity: ${recvLine.quantity}. Must be > 0.`]
        };
      }
      
      const poLine = po.lines.find(l => l.id === recvLine.lineId);
      if (!poLine) {
        return {
          success: false,
          message: `Ligne ${recvLine.lineId} non trouvée dans la commande`,
          workflowTrace: trace,
          errors: [`Line not found: ${recvLine.lineId}`]
        };
      }
      
      const maxReceivable = poLine.quantity - poLine.quantityReceived;
      if (recvLine.quantity > maxReceivable) {
        return {
          success: false,
          message: `Quantité à recevoir (${recvLine.quantity}) supérieure à la quantité restante (${maxReceivable}) pour ${poLine.product?.name || recvLine.lineId}`,
          workflowTrace: trace,
          errors: [`Quantity exceeds remaining: ${recvLine.quantity} > ${maxReceivable}`]
        };
      }
    }

    // Step 3: Process receipt with inventory update (ATOMIC TRANSACTION)
    // CRITICAL: All stock updates must happen within $transaction
    trace.push({ step: 'process_receipt', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Generate sequential movement reference for traceability
    const movementCount = await db.stockMovement.count({
      where: {
        type: 'in_receipt',
        date: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });
    const movementRefBase = `ENT-${year}-${month}-${String(movementCount + 1).padStart(3, '0')}`;
    
    let totalReceivedAmount = 0;
    let totalReceivedCost = 0;
    
    const result = await db.$transaction(async (tx) => {
      const createdMovements = [];
      
      for (const recvLine of input.lines) {
        const poLine = po.lines.find(l => l.id === recvLine.lineId)!;
        const product = poLine.product; // Already included in query
        
        // Calculate cost based on PO line pricing (with discount)
        const lineUnitCost = poLine.unitPrice * (1 - (poLine.discountRate || 0) / 100);
        const lineTotalCost = Math.round(recvLine.quantity * lineUnitCost * 100) / 100;
        
        // Calculate proportional tax amounts
        const ratio = recvLine.quantity / poLine.quantity;
        const lineAmountUntaxed = Math.round(poLine.amountUntaxed * ratio * 100) / 100;
        const lineAmountTax = Math.round(poLine.amountTax * ratio * 100) / 100;
        
        totalReceivedAmount += lineAmountUntaxed;
        totalReceivedCost += lineTotalCost;

        // Update PO Line quantity received
        await tx.purchaseOrderLine.update({
          where: { id: poLine.id },
          data: { quantityReceived: poLine.quantityReceived + recvLine.quantity }
        });

        // Determine target warehouse (from location or PO)
        let targetWarehouseId = po.warehouseId;
        if (recvLine.locationId) {
          const location = await tx.location.findUnique({ 
            where: { id: recvLine.locationId },
            select: { warehouseId: true }
          });
          targetWarehouseId = location?.warehouseId || po.warehouseId;
        }

        // Only track stock if we have a warehouse and product exists
        if (targetWarehouseId && product) {
          // Find or create stock level (CANONICAL pattern)
          const stockLevelWhere = {
            productId: poLine.productId,
            warehouseId: targetWarehouseId,
            locationId: recvLine.locationId ?? '',
          };
          
          let stockLevel = await tx.stockLevel.findUnique({
            where: { productId_warehouseId_locationId: stockLevelWhere }
          });
          
          if (!stockLevel) {
            // Create new stock level entry
            stockLevel = await tx.stockLevel.create({
              data: {
                productId: poLine.productId,
                warehouseId: targetWarehouseId,
                locationId: recvLine.locationId || null,
                quantity: recvLine.quantity,
                reservedQty: 0,
                availableQty: recvLine.quantity,
                minQty: 0,
                maxQty: 0,
              }
            });
          } else {
            // Update existing stock level atomically
            const newQuantity = stockLevel.quantity + recvLine.quantity;
            stockLevel = await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: {
                quantity: Math.round(newQuantity * 100) / 100,
                availableQty: Math.round((newQuantity - stockLevel.reservedQty) * 100) / 100,
              }
            });
          }

          // Create stock movement with CONSISTENT type 'in_receipt'
          // This is the canonical movement type for goods receipt
          const movement = await tx.stockMovement.create({
            data: {
              reference: `${movementRefBase}-${poLine.productId.slice(-6)}`,
              date: now,
              type: 'in_receipt', // CANONICAL: always use 'in_receipt' for goods receipt
              quantity: recvLine.quantity,
              unitCost: lineUnitCost,
              totalCost: lineTotalCost,
              notes: input.notes || `Réception commande ${po.reference}`,
              productId: poLine.productId,
              warehouseId: targetWarehouseId,
              locationId: recvLine.locationId || null,
              sourceDoc: 'purchase_order',
              sourceId: po.id,
              purchaseOrderId: po.id,
            }
          });
          
          createdMovements.push(movement);
        }
      }

      // Determine new PO status based on reception completeness
      let newStatus: string = po.status;
      const allLinesFullyReceived = po.lines.every(l => {
        const updatedLine = input.lines.find(il => il.lineId === l.id);
        if (updatedLine) {
          return (l.quantityReceived + updatedLine.quantity) >= l.quantity;
        }
        return l.quantityReceived >= l.quantity;
      });
      
      if (allLinesFullyReceived) {
        newStatus = 'received'; // Fully received
      } else if (input.lines.length > 0) {
        newStatus = 'partial'; // Partially received
      }

      // Atomically update PO with new status and totals
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: newStatus,
          amountReceived: po.amountReceived + totalReceivedAmount,
          receiptDate: now,
        },
        include: { lines: { include: { product: true } } }
      });

      return { updatedPo, movements: createdMovements };
    });

    trace.push({ 
      step: 'receipt_completed', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: result.updatedPo.id,
      details: `${input.lines.length} ligne(s) réceptionnée(s), ${result.movements.length} mouvement(s) de stock créé(s)`
    });

    return {
      success: true,
      message: `Réception enregistrée pour la commande ${po.reference}`,
      data: {
        purchaseOrder: result.updatedPo,
        movements: result.movements,
        amountReceived: totalReceivedAmount,
        totalCost: totalReceivedCost
      },
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in receivePurchaseOrder:', error);
    trace.push({ 
      step: 'receipt_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de la réception de la commande',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// WORKFLOW 4: Commande Achat → Facture Fournisseur (PO → Bill)
// ============================================================

export async function createBillFromPurchaseOrder(
  input: CreateBillFromPOInput,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Validate PO
    trace.push({ step: 'validate_purchase_order', status: 'completed', timestamp: new Date() });
    
    const po = await db.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { 
        lines: true, 
        partner: true,
        company: true
      }
    });
    
    if (!po) {
      return {
        success: false,
        message: "Commande d'achat non trouvée",
        workflowTrace: trace,
        errors: ['Purchase order not found']
      };
    }
    
    if (!['received', 'partial', 'confirmed'].includes(po.status)) {
      return {
        success: false,
        message: `La commande doit être au moins partiellement reçue avant facturation`,
        workflowTrace: trace,
        errors: [`Invalid PO status: ${po.status}`]
      };
    }

    // Step 2: Check for existing bill
    trace.push({ step: 'check_existing_bill', status: 'completed', timestamp: new Date() });
    
    const existingBills = await db.bill.count({
      where: { 
        sourceType: 'purchase_order',
        sourceId: po.id,
        status: { notIn: ['cancelled'] }
      }
    });
    
    if (existingBills > 0 && po.status === 'received') {
      // Allow partial bills but warn about full billing
      trace.push({ 
        step: 'existing_bills_found', 
        status: 'skipped', 
        timestamp: new Date(),
        details: `${existingBills} facture(s) existante(s)`
      });
    }

    // Step 3: Get company
    trace.push({ step: 'get_company', status: 'completed', timestamp: new Date() });
    
    const company = po.company || await db.company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      return {
        success: false,
        message: 'Aucune entreprise active configurée',
        workflowTrace: trace,
        errors: ['No active company']
      };
    }

    // Step 4: Generate Bill reference
    trace.push({ step: 'generate_bill_reference', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const billCount = await db.bill.count({
      where: {
        companyId: company.id,
        reference: { startsWith: `FACH-${year}-${month}` }
      }
    });
    const sequence = String(billCount + 1).padStart(3, '0');
    const reference = `FACH-${year}-${month}-${sequence}`;

    // Step 5: Create Bill from received/billed quantities
    trace.push({ step: 'create_bill', status: 'completed', timestamp: new Date() });
    
    // Use received quantities for billing
    const billLines = po.lines
      .filter(line => line.quantityReceived > 0 || line.quantityInvoiced < line.quantity)
      .map(line => {
        const qtyToBill = Math.min(line.quantityReceived, line.quantity - line.quantityInvoiced);
        if (qtyToBill <= 0) return null;
        
        const ratio = qtyToBill / line.quantity;
        
        return {
          productId: line.productId,
          description: line.description || null,
          quantity: qtyToBill,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          tvaRate: line.tvaRate,
          amountUntaxed: Math.round(line.amountUntaxed * ratio * 100) / 100,
          amountTax: Math.round(line.amountTax * ratio * 100) / 100,
          amountTotal: Math.round(line.amountTotal * ratio * 100) / 100
        };
      })
      .filter(Boolean) as any[];

    if (billLines.length === 0) {
      return {
        success: false,
        message: 'Aucune ligne à facturer (quantités déjà facturées ou non reçues)',
        workflowTrace: trace,
        errors: ['No lines to bill']
      };
    }

    const amountUntaxed = billLines.reduce((sum, l) => sum + l.amountUntaxed, 0);
    const amountTax = billLines.reduce((sum, l) => sum + l.amountTax, 0);
    const amountTotal = Math.round((amountUntaxed + amountTax) * 100) / 100;

    const dueDate = input.dueDate 
      ? new Date(input.dueDate) 
      : new Date(now.getTime() + (parseInt(po.paymentTerms || '30') * 24 * 60 * 60 * 1000));

    const result = await db.$transaction(async (tx) => {
      // Create bill
      // H-07 FIX: Use 'received' status instead of invalid 'posted' status
      // BillStatus enum values: draft, received, verified, approved, paid, cancelled
      const bill = await tx.bill.create({
        data: {
          reference,
          date: now,
          dueDate,
          status: 'received',  // Fixed: was 'posted' which is not in BillStatus enum
          type: 'supplier_invoice',
          
          // Amounts
          amountUntaxed,
          amountTax,
          amountTotal,
          amountPaid: 0,
          amountDue: amountTotal,
          
          // Partner & Company
          partnerId: po.partnerId,
          companyId: company.id,
          
          // Source tracking
          sourceType: 'purchase_order',
          sourceId: po.id,
          
          // Supplier info
          supplierReference: input.supplierReference || po.reference,
          
          // Payment terms
          paymentTerm: po.paymentTerms || '30',
          paymentMode: po.paymentMode || null,
          
          // Notes
          internalNotes: input.internalNotes || `Facture fournisseur générée depuis commande ${po.reference}`,
          
          // Lines
          lines: { create: billLines }
        },
        include: {
          partner: true,
          lines: { include: { product: true } }
        }
      });

      // Link bill to PO
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          amountBilled: po.amountBilled + amountUntaxed,
          status: po.amountBilled + amountUntaxed >= po.amountUntaxed * 0.99 ? 'billed' : po.status
        }
      });

      // Update PO line quantities invoiced
      for (const poLine of po.lines) {
        const billLine = billLines.find(bl => bl.productId === poLine.productId);
        if (billLine) {
          await tx.purchaseOrderLine.update({
            where: { id: poLine.id },
            data: {
              quantityInvoiced: poLine.quantityInvoiced + billLine.quantity
            }
          });
        }
      }

      // Auto-generate SCF Journal Entry for supplier invoice
      await generateSCFJournalEntryFromBill(tx, bill, company);

      return { bill, purchaseOrderId: po.id };
    });

    trace.push({ 
      step: 'bill_created', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: result.bill.id,
      details: `Facture fournisseur ${reference} créée depuis commande ${po.reference}`
    });

    trace.push({ 
      step: 'journal_entry_generated', 
      status: 'completed', 
      timestamp: new Date(),
      details: 'Écriture comptable SCF générée automatiquement'
    });

    return {
      success: true,
      message: `Facture fournisseur ${reference} créée avec succès`,
      data: result.bill,
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in createBillFromPurchaseOrder:', error);
    trace.push({ 
      step: 'bill_creation_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de la création de la facture fournisseur',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// WORKFLOW 5: Enregistrement Paiement (Payment Recording)
// ============================================================

export async function recordPayment(
  input: RecordPaymentInput,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Fetch invoice/bill
    trace.push({ step: 'fetch_document', status: 'completed', timestamp: new Date() });
    
    let document: any;
    let documentType: string;
    
    if (input.invoiceType === 'customer') {
      document = await db.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { partner: true, company: true }
      });
      documentType = 'invoice';
    } else {
      document = await db.bill.findUnique({
        where: { id: input.invoiceId },
        include: { partner: true, company: true }
      });
      documentType = 'bill';
    }
    
    if (!document) {
      return {
        success: false,
        message: 'Document non trouvé',
        workflowTrace: trace,
        errors: ['Document not found']
      };
    }
    
    // H-07 FIX: Validate document status against correct enum values
    // InvoiceStatus: draft, sent, paid, partial, cancelled
    // BillStatus: draft, received, verified, approved, paid, cancelled
    const validPaymentStatuses = input.invoiceType === 'customer' 
      ? ['sent', 'partial']  // Customer invoices can receive payment when sent/partial
      : ['received', 'verified', 'approved'];  // Supplier bills can receive payment in these statuses
    
    if (!validPaymentStatuses.includes(document.status)) {
      return {
        success: false,
        message: `Le document ne peut pas recevoir de paiement (statut: ${document.status})`,
        workflowTrace: trace,
        errors: [`Invalid document status: ${document.status}. Valid statuses: ${validPaymentStatuses.join(', ')}`]
      };
    }

    // Step 2: Validate payment amount
    trace.push({ step: 'validate_payment_amount', status: 'completed', timestamp: new Date() });
    
    const remainingAmount = document.amountDue || (document.amountTotal - document.amountPaid);
    
    if (input.amount <= 0) {
      return {
        success: false,
        message: 'Le montant doit être supérieur à 0',
        workflowTrace: trace,
        errors: ['Invalid amount']
      };
    }
    
    if (input.amount > remainingAmount) {
      return {
        success: false,
        message: `Le montant (${input.amount} DZD) dépasse le restant dû (${remainingAmount.toFixed(2)} DZD)`,
        workflowTrace: trace,
        errors: ['Amount exceeds due']
      };
    }

    // Step 3: Generate payment reference
    trace.push({ step: 'generate_payment_reference', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = input.invoiceType === 'customer' ? 'PAY-C' : 'PAY-F';
    const refSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = input.reference || `${prefix}-${dateStr}-${refSuffix}`;

    // Step 4: Create payment and update document
    trace.push({ step: 'create_payment', status: 'completed', timestamp: new Date() });
    
    const result = await db.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          reference,
          date: input.paymentDate ? new Date(input.paymentDate) : now,
          type: input.invoiceType === 'customer' ? 'inflow' : 'outflow',
          amount: input.amount,
          paymentMode: input.paymentMode,
          status: 'reconciled',
          
          // Relations
          partnerId: document.partnerId,
          companyId: document.companyId,
          bankAccountId: input.bankAccountId || null,
          
          // Source linking
          sourceType: documentType,
          sourceId: document.id,
          
          // Notes
          notes: input.notes || `Paiement ${reference}`,
          
          // Journal entry will be created separately
        }
      });

      // Update document amounts and status
      const newAmountPaid = document.amountPaid + input.amount;
      const newAmountDue = document.amountTotal - newAmountPaid;
      const newStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';

      if (documentType === 'invoice') {
        await tx.invoice.update({
          where: { id: document.id },
          data: {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus
          }
        });
      } else {
        await tx.bill.update({
          where: { id: document.id },
          data: {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus
          }
        });
      }

      // Create bank/cash journal entry for the payment
      const company = document.company || await tx.company.findFirst({
        where: { isActive: true }
      });

      if (company) {
        const journalRef = `EC-PAY-${dateStr}-${refSuffix}`;
        const isCustomerPayment = input.invoiceType === 'customer';
        
        // Debit Bank/Cash, Credit Customer/Supplier
        const journalLines = [
          {
            accountId: input.bankAccountId || SCF_ACCOUNTS.BANQUE,
            debit: input.amount,
            credit: 0,
            label: isCustomerPayment 
              ? `Encaissement client ${document.partner?.name}`
              : `Paiement fournisseur ${document.partner?.name}`,
            partnerId: document.partnerId
          },
          {
            accountId: isCustomerPayment ? SCF_ACCOUNTS.CLIENTS : SCF_ACCOUNTS.FOURNISSEURS,
            debit: 0,
            credit: input.amount,
            label: `Règlement ${reference}`,
            partnerId: document.partnerId
          }
        ];

        await tx.journalEntry.create({
          data: {
            date: now,
            reference: journalRef,
            label: `Paiement ${reference} - ${document.reference}`,
            status: 'posted',
            
            // Amounts
            totalDebit: input.amount,
            totalCredit: input.amount,
            
            // Source
            sourceType: 'payment',
            sourceId: payment.id,
            companyId: company.id,
            
            // Lines
            lines: { create: journalLines }
          }
        });
      }
      
      // H-05/H-06 FIX: Update partner balance on payment
      // For customer payments (inflow): decrease customer balance (they owe less)
      // For supplier payments (outflow): increase supplier balance (we owe them less, liability decreases)
      if (document.partnerId) {
        const currentBalance = document.partner?.balance || 0;
        const balanceAdjustment = input.invoiceType === 'customer' 
          ? -input.amount  // Customer paid us, reduce their debt
          : input.amount;   // We paid supplier, reduce our liability to them
        
        await tx.partner.update({
          where: { id: document.partnerId },
          data: {
            balance: currentBalance + balanceAdjustment
          }
        });
        
        trace.push({ 
          step: 'partner_balance_updated', 
          status: 'completed', 
          timestamp: new Date(),
          details: `Partner ${document.partner?.name || document.partnerId} balance updated by ${balanceAdjustment} DZD`
        });
      }

      return { payment, newStatus };
    });

    trace.push({ 
      step: 'payment_recorded', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: result.payment.id,
      details: `Paiement de ${input.amount.toFixed(2)} DZD enregistré`
    });

    return {
      success: true,
      message: `Paiement de ${input.amount.toFixed(2)} DZD enregistré avec succès`,
      data: result.payment,
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in recordPayment:', error);
    trace.push({ 
      step: 'payment_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de l\'enregistrement du paiement',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// SCF JOURNAL ENTRY GENERATION (Accounting Automation)
// ============================================================

async function generateSCFJournalEntryFromInvoice(
  tx: any,
  invoice: any,
  company: any
): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const refSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const reference = `EC-VTE-${dateStr}-${refSuffix}`;

  // Group lines by TVA rate for optimized entries
  const tvaGroups = new Map<number, number>();
  let totalHT = 0;
  
  for (const line of invoice.lines) {
    const rate = Math.round(line.tvaRate * 100); // Convert to percentage
    tvaGroups.set(rate, (tvaGroups.get(rate) || 0) + line.amountTax);
    totalHT += line.amountUntaxed;
  }

  // Build journal entry lines according to SCF
  const journalLines: any[] = [];

  // 1. Débit Client (Class 4) - Total TTC
  journalLines.push({
    accountId: SCF_ACCOUNTS.CLIENTS,
    debit: Math.round(invoice.amountTotal * 100) / 100,
    credit: 0,
    label: `Facture ${invoice.reference} - ${invoice.partner?.name || 'Client'}`,
    partnerId: invoice.partnerId
  });

  // 2. Crédit Ventes (Class 7) - Total HT
  journalLines.push({
    accountId: SCF_ACCOUNTS.VENTES,
    debit: 0,
    credit: Math.round(invoice.amountUntaxed * 100) / 100,
    label: `Ventes Facture ${invoice.reference}`,
    partnerId: invoice.partnerId
  });

  // 3. Crédit TVA Collectée (Class 4) - By rate
  tvaGroups.forEach((amount, rate) => {
    if (amount > 0) {
      journalLines.push({
        accountId: SCF_ACCOUNTS.TVA_COLLECTEE,
        debit: 0,
        credit: Math.round(amount * 100) / 100,
        label: `TVA collectée ${rate}% - Fact. ${invoice.reference}`,
        partnerId: invoice.partnerId
      });
    }
  });

  // 4. Crédit Timbre Fiscal (if applicable)
  if (invoice.timbreFiscal && invoice.timbreFiscal > 0) {
    journalLines.push({
      accountId: SCF_ACCOUNTS.TIMBRE_FISCAL,
      debit: 0,
      credit: invoice.timbreFiscal,
      label: `Timbre fiscal - Fact. ${invoice.reference}`,
      partnerId: invoice.partnerId
    });
  }

  // Create the journal entry
  await tx.journalEntry.create({
    data: {
      date: now,
      reference,
      label: `Facture client ${invoice.reference} - Écriture SCF auto`,
      status: 'posted',
      
      // Amounts
      totalDebit: Math.round(invoice.amountTotal * 100) / 100,
      totalCredit: Math.round(invoice.amountTotal * 100) / 100,
      
      // Source
      sourceType: 'invoice',
      sourceId: invoice.id,
      companyId: company.id,
      
      // Lines
      lines: { create: journalLines }
    }
  });
}

async function generateSCFJournalEntryFromBill(
  tx: any,
  bill: any,
  company: any
): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const refSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const reference = `EC-ACH-${dateStr}-${refSuffix}`;

  // Group lines by TVA rate
  const tvaGroups = new Map<number, number>();
  
  for (const line of bill.lines) {
    const rate = Math.round(line.tvaRate * 100);
    tvaGroups.set(rate, (tvaGroups.get(rate) || 0) + line.amountTax);
  }

  // Build journal entry lines according to SCF
  const journalLines: any[] = [];

  // 1. Débit Achats (Class 6) - Total HT
  journalLines.push({
    accountId: SCF_ACCOUNTS.ACHATS,
    debit: Math.round(bill.amountUntaxed * 100) / 100,
    credit: 0,
    label: `Achats Facture ${bill.reference} - ${bill.partner?.name || 'Fournisseur'}`,
    partnerId: bill.partnerId
  });

  // 2. Débit TVA Déductible (Class 4) - By rate
  tvaGroups.forEach((amount, rate) => {
    if (amount > 0) {
      journalLines.push({
        accountId: SCF_ACCOUNTS.TVA_DEDUCTIBLE,
        debit: Math.round(amount * 100) / 100,
        credit: 0,
        label: `TVA déductible ${rate}% - Fact. ${bill.reference}`,
        partnerId: bill.partnerId
      });
    }
  });

  // 3. Crédit Fournisseurs (Class 4) - Total TTC
  journalLines.push({
    accountId: SCF_ACCOUNTS.FOURNISSEURS,
    debit: 0,
    credit: Math.round(bill.amountTotal * 100) / 100,
    label: `Facture fournisseur ${bill.reference}`,
    partnerId: bill.partnerId
  });

  // Create the journal entry
  await tx.journalEntry.create({
    data: {
      date: now,
      reference,
      label: `Facture fournisseur ${bill.reference} - Écriture SCF auto`,
      status: 'posted',
      
      // Amounts
      totalDebit: Math.round(bill.amountTotal * 100) / 100,
      totalCredit: Math.round(bill.amountTotal * 100) / 100,
      
      // Source
      sourceType: 'bill',
      sourceId: bill.id,
      companyId: company.id,
      
      // Lines
      lines: { create: journalLines }
    }
  });
}

// ============================================================
// WORKFLOW 6: Livraison Commande Client (SO Delivery → Stock Out)
// ============================================================

export async function deliverSalesOrder(
  salesOrderId: string,
  deliveryLines: Array<{ lineId: string; quantity: number }>,
  warehouseId?: string,
  userId?: string
): Promise<WorkflowResult> {
  const trace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Validate SO
    trace.push({ step: 'validate_sales_order', status: 'completed', timestamp: new Date() });
    
    const so = await db.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { 
        lines: true, 
        partner: true,
        warehouse: true,
        company: true
      }
    });
    
    if (!so) {
      return {
        success: false,
        message: 'Commande client non trouvée',
        workflowTrace: trace,
        errors: ['Sales order not found']
      };
    }
    
    if (!['confirmed', 'processing'].includes(so.status)) {
      return {
        success: false,
        message: `La commande ne peut pas être livrée (statut: ${so.status})`,
        workflowTrace: trace,
        errors: [`Invalid SO status: ${so.status}`]
      };
    }

    // Step 2: Validate delivery quantities and stock availability
    trace.push({ step: 'check_stock_availability', status: 'completed', timestamp: new Date() });
    
    const targetWarehouseId = warehouseId || so.warehouseId;
    
    for (const delLine of deliveryLines) {
      const soLine = so.lines.find(l => l.id === delLine.lineId);
      if (!soLine) {
        return {
          success: false,
          message: `Ligne ${delLine.lineId} non trouvée`,
          workflowTrace: trace,
          errors: [`Line not found`]
        };
      }
      
      const maxDeliverable = soLine.quantity - soLine.quantityDelivered;
      if (delLine.quantity > maxDeliverable) {
        return {
          success: false,
          message: `Quantité à livrer (${delLine.quantity}) dépasse le restant (${maxDeliverable})`,
          workflowTrace: trace,
          errors: ['Quantity exceeds remaining']
        };
      }

      // Check stock availability
      if (targetWarehouseId) {
        const stockLevel = await db.stockLevel.findFirst({
          where: {
            productId: soLine.productId,
            warehouseId: targetWarehouseId
          }
        });
        
        if (!stockLevel || stockLevel.availableQty < delLine.quantity) {
          const available = stockLevel?.availableQty || 0;
          return {
            success: false,
            message: `Stock insuffisant pour le produit (disponible: ${available}, demandé: ${delLine.quantity})`,
            workflowTrace: trace,
            errors: ['Insufficient stock']
          };
        }
      }
    }

    // Step 3: Process delivery with stock update
    trace.push({ step: 'process_delivery', status: 'completed', timestamp: new Date() });
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    let totalDeliveredAmount = 0;
    
    const result = await db.$transaction(async (tx) => {
      const movements = [];
      
      for (const delLine of deliveryLines) {
        const soLine = so.lines.find(l => l.id === delLine.lineId)!;
        const product = await tx.product.findUnique({ where: { id: soLine.productId } });
        
        // Calculate delivered amounts
        const ratio = delLine.quantity / soLine.quantity;
        const lineAmount = Math.round(soLine.amountTotal * ratio * 100) / 100;
        totalDeliveredAmount += lineAmount;

        // Update SO Line quantity delivered
        await tx.salesOrderLine.update({
          where: { id: soLine.id },
          data: { quantityDelivered: soLine.quantityDelivered + delLine.quantity }
        });

        // Generate movement reference
        const refNumber = Math.random().toString(36).substring(2, 8).toUpperCase();
        const reference = `LIV-${dateStr}-${refNumber}`;

        // Update stock if tracking enabled
        if (targetWarehouseId && product?.trackStock) {
          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              productId: soLine.productId,
              warehouseId: targetWarehouseId
            }
          });
          
          if (stockLevel) {
            const newQty = stockLevel.quantity - delLine.quantity;
            const newAvailable = stockLevel.availableQty - delLine.quantity;
            
            await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: {
                quantity: Math.max(0, newQty),
                availableQty: Math.max(0, newAvailable)
              }
            });

            // Create stock movement (OUT for delivery)
            const movement = await tx.stockMovement.create({
              data: {
                reference,
                date: now,
                type: 'out_delivery',
                quantity: delLine.quantity,
                unitCost: product.costPrice || 0,
                totalCost: delLine.quantity * (product.costPrice || 0),
                notes: `Livraison CMD ${so.reference}`,
                productId: soLine.productId,
                warehouseId: targetWarehouseId,
                stockLevelId: stockLevel.id,
                sourceType: 'sales_order',
                sourceId: so.id
              }
            });
            
            movements.push(movement);
          }
        }
      }

      // Update SO status
      const allFullyDelivered = so.lines.every(l => {
        const delivered = l.quantityDelivered + (deliveryLines.find(dl => dl.lineId === l.id)?.quantity || 0);
        return delivered >= l.quantity;
      });
      
      const newStatus = allFullyDelivered ? 'delivered' : 'processing';
      
      const updatedSo = await tx.salesOrder.update({
        where: { id: so.id },
        data: {
          status: newStatus,
          amountDelivered: so.amountDelivered + totalDeliveredAmount
        },
        include: { lines: true }
      });

      return { updatedSo, movements };
    });

    trace.push({ 
      step: 'delivery_completed', 
      status: 'completed', 
      timestamp: new Date(),
      entityId: result.updatedSo.id,
      details: `${deliveryLines.length} ligne(s) livrée(s), ${result.movements.length} mouvement(s) de stock`
    });

    return {
      success: true,
      message: `Livraison enregistrée pour la commande ${so.reference}`,
      data: {
        salesOrder: result.updatedSo,
        movements: result.movements,
        amountDelivered: totalDeliveredAmount
      },
      workflowTrace: trace
    };

  } catch (error) {
    console.error('Error in deliverSalesOrder:', error);
    trace.push({ 
      step: 'delivery_error', 
      status: 'failed', 
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Erreur lors de la livraison',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: trace
    };
  }
}

// ============================================================
// Complete Workflow Executors (Multi-step flows)
// ============================================================

/**
 * Execute complete Sales Cycle: Quote → SO → Invoice → Payment
 */
export async function executeFullSalesCycle(
  quotationId: string,
  paymentData?: Omit<RecordPaymentInput, 'invoiceType' | 'invoiceId'>,
  userId?: string
): Promise<WorkflowResult> {
  const masterTrace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Convert Quote to SO
    masterTrace.push({ step: 'start_quote_to_so_conversion', status: 'completed', timestamp: new Date() });
    
    const conversionResult = await convertQuotationToSalesOrder({ quotationId }, userId);
    masterTrace.push(...conversionResult.workflowTrace);
    
    if (!conversionResult.success) {
      return {
        ...conversionResult,
        workflowTrace: masterTrace,
        message: 'Échec: Conversion Devis → Commande'
      };
    }

    // Step 2: Confirm SO
    const salesOrderId = conversionResult.data.id;
    masterTrace.push({ step: 'confirm_sales_order', status: 'completed', timestamp: new Date() });
    
    await db.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: 'confirmed' }
    });

    // Step 3: Deliver SO (auto-deliver full quantity)
    masterTrace.push({ step: 'deliver_sales_order', status: 'completed', timestamp: new Date() });
    
    const so = await db.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { lines: true }
    });
    
    if (so) {
      const deliveryLines = so.lines.map(l => ({
        lineId: l.id,
        quantity: l.quantity - l.quantityDelivered
      }));
      
      const deliveryResult = await deliverSalesOrder(salesOrderId, deliveryLines, so.warehouseId || undefined, userId);
      masterTrace.push(...deliveryResult.workflowTrace);
    }

    // Step 4: Create Invoice from SO
    masterTrace.push({ step: 'create_invoice_from_so', status: 'completed', timestamp: new Date() });
    
    const invoiceResult = await convertSalesOrderToInvoice({ salesOrderId }, userId);
    masterTrace.push(...invoiceResult.workflowTrace);
    
    if (!invoiceResult.success) {
      return {
        ...invoiceResult,
        workflowTrace: masterTrace,
        message: 'Échec: Création Facture depuis Commande'
      };
    }

    // Step 5: Record Payment (if provided)
    if (paymentData && invoiceResult.data) {
      masterTrace.push({ step: 'record_payment', status: 'completed', timestamp: new Date() });
      
      const paymentResult = await recordPayment({
        ...paymentData,
        invoiceType: 'customer',
        invoiceId: invoiceResult.data.id
      }, userId);
      masterTrace.push(...paymentResult.workflowTrace);
    }

    return {
      success: true,
      message: 'Cycle commercial complet exécuté avec succès: Devis → Commande → Facture → Paiement',
      data: {
        salesOrder: conversionResult.data,
        invoice: invoiceResult.data
      },
      workflowTrace: masterTrace
    };

  } catch (error) {
    console.error('Error in executeFullSalesCycle:', error);
    return {
      success: false,
      message: 'Erreur lors du cycle commercial complet',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: masterTrace
    };
  }
}

/**
 * Execute complete Purchase Cycle: PO → Receipt → Bill → Payment
 */
export async function executeFullPurchaseCycle(
  purchaseOrderId: string,
  receiveData?: Omit<ReceivePurchaseOrderInput, 'purchaseOrderId'>,
  paymentData?: Omit<RecordPaymentInput, 'invoiceType' | 'invoiceId'>,
  userId?: string
): Promise<WorkflowResult> {
  const masterTrace: WorkflowStepTrace[] = [];
  
  try {
    // Step 1: Confirm PO
    masterTrace.push({ step: 'confirm_purchase_order', status: 'completed', timestamp: new Date() });
    
    const po = await db.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (po && po.status === 'draft') {
      await db.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'confirmed' }
      });
    }

    // Step 2: Receive goods (if data provided)
    if (receiveData) {
      masterTrace.push({ step: 'receive_goods', status: 'completed', timestamp: new Date() });
      
      const receiveResult = await receivePurchaseOrder({
        purchaseOrderId,
        ...receiveData
      }, userId);
      masterTrace.push(...receiveResult.workflowTrace);
      
      if (!receiveResult.success) {
        return {
          ...receiveResult,
          workflowTrace: masterTrace,
          message: 'Échec: Réception marchandise'
        };
      }
    }

    // Step 3: Create Bill from PO
    masterTrace.push({ step: 'create_supplier_bill', status: 'completed', timestamp: new Date() });
    
    const billResult = await createBillFromPurchaseOrder({ purchaseOrderId }, userId);
    masterTrace.push(...billResult.workflowTrace);
    
    if (!billResult.success) {
      return {
        ...billResult,
        workflowTrace: masterTrace,
        message: 'Échec: Création Facture Fournisseur'
      };
    }

    // Step 4: Record Payment (if provided)
    if (paymentData && billResult.data) {
      masterTrace.push({ step: 'record_payment', status: 'completed', timestamp: new Date() });
      
      const paymentResult = await recordPayment({
        ...paymentData,
        invoiceType: 'supplier',
        invoiceId: billResult.data.id
      }, userId);
      masterTrace.push(...paymentResult.workflowTrace);
    }

    return {
      success: true,
      message: 'Cycle achat complet exécuté avec succès: Commande → Réception → Facture → Paiement',
      data: {
        bill: billResult.data
      },
      workflowTrace: masterTrace
    };

  } catch (error) {
    console.error('Error in executeFullPurchaseCycle:', error);
    return {
      success: false,
      message: 'Erreur lors du cycle achat complet',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      workflowTrace: masterTrace
    };
  }
}

// Export all workflow functions
export default {
  convertQuotationToSalesOrder,
  convertSalesOrderToInvoice,
  receivePurchaseOrder,
  createBillFromPurchaseOrder,
  recordPayment,
  deliverSalesOrder,
  executeFullSalesCycle,
  executeFullPurchaseCycle
};
