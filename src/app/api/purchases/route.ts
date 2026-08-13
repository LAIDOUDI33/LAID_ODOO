// ============================================================
// HASSIBA Suite ERP v2.0.0 - Purchase Orders API
// Commandes d'Achat - Module Achats Algérien
// M-13 FIX: Added workflow approval requirement for high-value POs
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTVA, TVA_RATES, isValidTVARate, normalizeTVARate, tvaToInt } from '@/lib/algerian-taxes';
import { requireAuth, requireRole, getAuthenticatedUser, ROLES } from '@/lib/auth-utils';

// ============================================================
// Types & Interfaces
// ============================================================

interface PurchaseOrderLineInput {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  tvaRate?: number;
}

interface CreatePurchaseOrderInput {
  partnerId: string;
  companyId?: string;
  date?: string;
  expectedDate?: string;
  paymentTerms?: string;
  paymentMode?: string;
  incoterm?: string;
  shippingAddress?: string;
  warehouseId?: string;
  internalNotes?: string;
  supplierNotes?: string;
  sourceType?: string;
  sourceId?: string;
  lines: PurchaseOrderLineInput[];
}

interface UpdatePurchaseOrderInput {
  partnerId?: string;
  date?: string;
  expectedDate?: string;
  paymentTerms?: string;
  paymentMode?: string;
  incoterm?: string;
  shippingAddress?: string;
  warehouseId?: string;
  internalNotes?: string;
  supplierNotes?: string;
  lines?: PurchaseOrderLineInput[];
}

interface ProcessedPurchaseLine {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  tvaRate: number;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
}

// ============================================================
// Valid Algerian TVA Rates (Taux TVA Algériens)
// Uses centralized validation from algerian-taxes.ts
// Valid rates: 0% (exonéré), 7% (particulier), 9% (réduit), 19% (normal)
// Accepts both INTEGER format (19) and DECIMAL format (0.19)
// ============================================================

// ============================================================
// Reference Generation (ACH-YYYY-MM-XXX)
// ============================================================

// M-13 FIX: Purchase Order Approval Thresholds
// POs exceeding these amounts require workflow approval before processing
const PO_APPROVAL_THRESHOLDS = {
  // Amount above which manager approval is required (in DZD)
  managerApproval: 100000,  // 100,000 DZD
  // Amount above which director approval is required (in DZD)
  directorApproval: 500000,  // 500,000 DZD  
  // Amount above which GM/CEO approval is required (in DZD)
  executiveApproval: 1000000,  // 1,000,000 DZD
};

// Get the required approval level based on PO total amount
function getRequiredApprovalLevel(totalAmount: number): 'none' | 'manager' | 'director' | 'executive' {
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.executiveApproval) return 'executive';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.directorApproval) return 'director';
  if (totalAmount >= PO_APPROVAL_THRESHOLDS.managerApproval) return 'manager';
  return 'none';
}

async function generatePurchaseReference(date: Date, companyId: string): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Count existing POs for this month/year/company
  const count = await db.purchaseOrder.count({
    where: {
      companyId,
      date: {
        gte: new Date(year, date.getMonth(), 1),
        lt: new Date(year, date.getMonth() + 1, 1),
      },
    },
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `ACH-${year}-${month}-${sequence}`;
}

// ============================================================
// Calculate Line Amounts with Algerian TVA
// ============================================================

function calculateLineAmounts(line: PurchaseOrderLineInput) {
  const quantity = line.quantity || 0;
  const unitPrice = line.unitPrice || 0;
  const discountRate = line.discountRate || 0;
  
  // Validate and normalize TVA rate - accepts both formats (19 or 0.19)
  const rawTvaRate = line.tvaRate ?? 19; // Default to 19% normal rate (integer format for storage)
  if (!isValidTVARate(rawTvaRate)) {
    throw new Error(`Taux TVA invalide: ${rawTvaRate}. Taux autorisés: 0%, 7%, 9%, 19%`);
  }
  
  // Store in integer format for display/storage consistency
  const tvaRateForStorage = rawTvaRate > 1 ? rawTvaRate : tvaToInt(rawTvaRate);
  
  // Normalize to decimal format for accurate calculations
  const tvaRateDecimal = normalizeTVARate(rawTvaRate);
  
  // Amount before discount
  const amountBeforeDiscount = quantity * unitPrice;
  
  // Apply discount
  const discountAmount = amountBeforeDiscount * (discountRate / 100);
  const amountUntaxed = Math.round((amountBeforeDiscount - discountAmount) * 100) / 100;
  
  // Calculate TVA using DECIMAL format (Algerian tax engine standard)
  const amountTax = Math.round(amountUntaxed * tvaRateDecimal * 100) / 100;
  const amountTotal = Math.round((amountUntaxed + amountTax) * 100) / 100;
  
  return {
    amountUntaxed,
    amountTax,
    amountTotal,
    tvaRate: tvaRateForStorage, // Store as integer for DB consistency
  };
}

// ============================================================
// Calculate Order Totals
// ============================================================

function calculateOrderTotals(lines: Array<{
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
}>) {
  let amountUntaxed = 0;
  let amountTax = 0;
  let amountTotal = 0;
  
  for (const line of lines) {
    amountUntaxed += line.amountUntaxed;
    amountTax += line.amountTax;
    amountTotal += line.amountTotal;
  }
  
  return {
    amountUntaxed: Math.round(amountUntaxed * 100) / 100,
    amountTax: Math.round(amountTax * 100) / 100,
    amountTotal: Math.round(amountTotal * 100) / 100,
  };
}

// ============================================================
// GET /api/purchases - List Purchase Orders
// ============================================================

export async function GET(request: NextRequest) {
  // SECURITY: Require authentication for purchase data
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract filters
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const companyId = searchParams.get('companyId');
    
    // SECURITY: Get authenticated user for company scoping
    const user = await getAuthenticatedUser();

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (partnerId) {
      where.partnerId = partnerId;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }

    // SECURITY: Company scoping - non-super-admins can only see their company's data
    if (user && user.role !== ROLES.SUPER_ADMIN && user.companyId && !companyId) {
      where.companyId = user.companyId;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.date as Record<string, unknown>).lte = new Date(dateTo);
      }
    }
    
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' as const } },
        { partner: { name: { contains: search, mode: 'insensitive' as const } } },
        { internalNotes: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    // Get total count for pagination
    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              displayName: true,
              type: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          bills: {
            select: {
              id: true,
              reference: true,
              status: true,
              amountTotal: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des commandes d\'achat',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/purchases - Create Purchase Order
// ============================================================

export async function POST(request: NextRequest) {
  // SECURITY: Require role to create purchase orders
  const authError = await requireRole(request, ['admin', 'manager', 'accountant', 'warehouse_manager']);
  if (authError) return authError;
  
  const user = await getAuthenticatedUser();
  
  try {
    const body: CreatePurchaseOrderInput = await request.json();
    
    // Validate required fields
    if (!body.partnerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le fournisseur (partnerId) est obligatoire',
        },
        { status: 400 }
      );
    }
    
    if (!body.lines || body.lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Au moins une ligne de commande est requise',
        },
        { status: 400 }
      );
    }
    
    // Validate partner exists and is a supplier
    const partner = await db.partner.findUnique({
      where: { id: body.partnerId },
    });
    
    if (!partner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fournisseur non trouvé',
        },
        { status: 404 }
      );
    }
    
    if (partner.type === 'customer') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ce partenaire n\'est pas un fournisseur',
        },
        { status: 400 }
      );
    }
    
    // Determine company ID (use provided or get from partner)
    let companyId = body.companyId;
    if (!companyId) {
      companyId = partner.companyId;
    }
    
    // Validate company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
    });
    
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: 'Entreprise non trouvée',
        },
        { status: 404 }
      );
    }
    
    // Validate warehouse if provided
    if (body.warehouseId) {
      const warehouse = await db.warehouse.findUnique({
        where: { id: body.warehouseId },
      });
      
      if (!warehouse) {
        return NextResponse.json(
          {
            success: false,
            error: 'Entrepôt non trouvé',
          },
          { status: 404 }
        );
      }
    }
    
    // Set order date
    const orderDate = body.date ? new Date(body.date) : new Date();
    
    // Generate reference
    const reference = await generatePurchaseReference(orderDate, companyId);
    
    // Validate and calculate line amounts
    const processedLines: ProcessedPurchaseLine[] = [];
    
    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      
      // Validate required fields
      if (!line.productId) {
        return NextResponse.json(
          {
            success: false,
            error: `Le produit est requis pour la ligne ${i + 1}`,
          },
          { status: 400 }
        );
      }
      
      if (!line.quantity || line.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `La quantité doit être supérieure à 0 pour la ligne ${i + 1}`,
          },
          { status: 400 }
        );
      }
      
      if (line.unitPrice === undefined || line.unitPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Le prix unitaire doit être positif pour la ligne ${i + 1}`,
          },
          { status: 400 }
        );
      }
      
      // Validate product exists
      const product = await db.product.findUnique({
        where: { id: line.productId },
      });
      
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Produit non trouvé pour la ligne ${i + 1}`,
          },
          { status: 404 }
        );
      }
      
      // Validate TVA rate (Algerian rates only: 0%, 7%, 9%, 19%)
      // Accepts both INTEGER (19) and DECIMAL (0.19) formats
      const tvaRate = line.tvaRate ?? product.tvaRate ?? 19;
      if (!isValidTVARate(tvaRate)) {
        return NextResponse.json(
          {
            success: false,
            error: `Taux TVA invalide pour la ligne ${i + 1}. Taux autorisés: 0%, 7%, 9%, 19%`,
          },
          { status: 400 }
        );
      }
      
      // Calculate amounts
      const amounts = calculateLineAmounts({
        ...line,
        tvaRate,
      });
      
      processedLines.push({
        productId: line.productId,
        description: line.description || product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate || 0,
        ...amounts, // Includes tvaRate (as integer for storage), amountUntaxed, amountTax, amountTotal
      });
    }
    
    // Calculate order totals
    const totals = calculateOrderTotals(processedLines);
    
    // M-13 FIX: Determine if this PO requires workflow approval based on total amount
    const approvalLevel = getRequiredApprovalLevel(totals.amountTotal);
    const requiresApproval = approvalLevel !== 'none';
    
    // Create purchase order with lines in a transaction
    const purchaseOrder = await db.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          reference,
          partnerId: body.partnerId,
          companyId,
          date: orderDate,
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
          status: 'draft',
          amountUntaxed: totals.amountUntaxed,
          amountTax: totals.amountTax,
          amountTotal: totals.amountTotal,
          amountReceived: 0,
          amountBilled: 0,
          paymentTerms: body.paymentTerms || partner.paymentTerms || '30',
          paymentMode: body.paymentMode || partner.paymentMode,
          incoterm: body.incoterm,
          shippingAddress: body.shippingAddress,
          warehouseId: body.warehouseId,
          internalNotes: body.internalNotes,
          supplierNotes: body.supplierNotes,
          sourceType: body.sourceType || 'manual',
          sourceId: body.sourceId,
        },
      });
      
      // Create order lines
      const lines = await Promise.all(
        processedLines.map((line) =>
          tx.purchaseOrderLine.create({
            data: {
              purchaseOrderId: order.id,
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountRate: line.discountRate,
              tvaRate: line.tvaRate,
              amountUntaxed: line.amountUntaxed,
              amountTax: line.amountTax,
              amountTotal: line.amountTotal,
              quantityReceived: 0,
              quantityInvoiced: 0,
            },
          })
        )
      );
      
      return { ...order, lines };
    });
    
    // M-13 FIX: If PO requires approval, create workflow instance or flag it
    let approvalInfo = undefined;
    if (requiresApproval) {
      try {
        // Check if there's an active workflow definition for purchase orders
        const wfDefinition = await db.workflowDefinition.findFirst({
          where: {
            type: 'purchase_order',
            companyId: companyId,
            isActive: true
          }
        });
        
        if (wfDefinition) {
          // Create workflow instance for this PO
          const workflowInstance = await db.workflowInstance.create({
            data: {
              definitionId: wfDefinition.id,
              initiatorId: user?.id,
              entityType: 'purchase_order',
              entityId: purchaseOrder.id,
              entityReference: purchaseOrder.reference,
              amount: totals.amountTotal,
              title: `Approbation commande d'achat ${purchaseOrder.reference}`,
              description: `Commande d'achat de ${totals.amountTotal.toLocaleString()} DZD auprès du fournisseur. Niveau d'approbation requis: ${approvalLevel}`,
              status: 'pending',
              companyId: companyId
            }
          });
          
          approvalInfo = {
            requiresApproval: true,
            approvalLevel,
            workflowInstanceId: workflowInstance.id,
            message: `Cette commande d'achat nécessite une approbation ${approvalLevel} avant traitement`
          };
          
          // Update PO status to indicate pending approval
          await db.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: { status: 'pending_approval' }
          });
          
          console.info(`[M-13] PO ${purchaseOrder.id} created with workflow approval required. Level: ${approvalLevel}, Amount: ${totals.amountTotal}`);
        } else {
          // No workflow definition found, but still flag for manual approval
          approvalInfo = {
            requiresApproval: true,
            approvalLevel,
            message: `Cette commande d'achat dépasse le seuil de ${approvalLevel} (${PO_APPROVAL_THRESHOLDS[approvalLevel + 'Approval']} DZD). Veuillez obtenir l'approbation appropriée manuellement.`,
            recommendation: 'Configurez un workflow d\'approbation pour les commandes d\'achat'
          };
          
          console.warn(`[M-13] PO ${purchaseOrder.id} exceeds threshold but no workflow definition found. Level: ${approvalLevel}`);
        }
      } catch (workflowError) {
        console.error('[M-13] Error creating workflow instance for PO:', workflowError);
        // Don't fail the PO creation, just note the issue
        approvalInfo = {
          requiresApproval: true,
          approvalLevel,
          error: 'Erreur lors de la création du workflow d\'approbation',
          recommendation: 'Vérifier la configuration des workflows et approuver manuellement si nécessaire'
        };
      }
    }
    
    return NextResponse.json(
      {
        success: true,
        data: purchaseOrder,
        message: `Commande d'achat ${reference} créée avec succès${requiresApproval ? ' (en attente d\'approbation)' : ''}`,
        // M-13 FIX: Include approval information if applicable
        ...(approvalInfo ? { approvalInfo } : {}),
        thresholds: {
          ...PO_APPROVAL_THRESHOLDS,
          currentLevel: approvalLevel,
          currency: 'DZD'
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création de la commande d\'achat',
      },
      { status: 500 }
    );
  }
}
