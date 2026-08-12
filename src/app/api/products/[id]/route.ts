import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/products/[id] - Get single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        company: { select: { id: true, name: true } },
        _count: {
          select: {
            invoiceLines: true,
            billLines: true,
            purchaseOrderLines: true,
            salesOrderLines: true,
            quotationLines: true,
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Product GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role
    const authError = await requireRole(request, ['admin', 'manager', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();

    // Check if product exists
    const existingProduct = await db.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate unique code (exclude current product)
    if (body.code && body.code !== existingProduct.code) {
      const codeExists = await db.product.findFirst({
        where: { code: body.code, id: { not: id } }
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'A product with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, any> = {};

    // Basic info
    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.type !== undefined) updateData.type = body.type;

    // Pricing
    if (body.salePrice !== undefined) updateData.salePrice = parseFloat(body.salePrice) || 0;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = parseFloat(body.purchasePrice) || 0;
    if (body.costPrice !== undefined) updateData.costPrice = parseFloat(body.costPrice) || 0;
    if (body.tvaRate !== undefined) updateData.tvaRate = parseFloat(body.tvaRate) || 19;

    // Stock settings
    if (body.trackStock !== undefined) updateData.trackStock = body.trackStock;
    if (body.useSerials !== undefined) updateData.useSerials = body.useSerials;
    if (body.useLots !== undefined) updateData.useLots = body.useLots;
    if (body.unitOfMeasure !== undefined) updateData.unitOfMeasure = body.unitOfMeasure || 'U';

    // Category
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;

    // Image
    if (body.image !== undefined) updateData.image = body.image || null;

    // Status flags
    if (body.canBeSold !== undefined) updateData.canBeSold = body.canBeSold;
    if (body.canBePurchased !== undefined) updateData.canBePurchased = body.canBePurchased;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updatedProduct = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Product PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Soft delete (deactivate) a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const { id } = await params;

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoiceLines: true,
            billLines: true,
            purchaseOrderLines: true,
            salesOrderLines: true,
            quotationLines: true,
          }
        }
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already inactive
    if (!existingProduct.isActive) {
      return NextResponse.json(
        { success: false, error: 'Product is already deactivated' },
        { status: 400 }
      );
    }

    // Check for dependencies in active documents
    const dependencies: string[] = [];
    const counts = existingProduct._count;

    // Check active invoices that use this product
    if (counts.invoiceLines > 0) {
      const activeInvoices = await db.invoiceLine.count({
        where: {
          productId: id,
          invoice: { status: { notIn: ['cancelled'] } }
        }
      });
      if (activeInvoices > 0) {
        dependencies.push(`${activeInvoices} active invoice(s)`);
      }
    }

    // Check active bills that use this product
    if (counts.billLines > 0) {
      const activeBills = await db.billLine.count({
        where: {
          productId: id,
          bill: { status: { notIn: ['cancelled'] } }
        }
      });
      if (activeBills > 0) {
        dependencies.push(`${activeBills} active bill(s)`);
      }
    }

    // Check active purchase orders
    if (counts.purchaseOrderLines > 0) {
      const activePOs = await db.purchaseOrderLine.count({
        where: {
          productId: id,
          purchaseOrder: { status: { notIn: ['cancelled', 'closed'] } }
        }
      });
      if (activePOs > 0) {
        dependencies.push(`${activePOs} active purchase order(s)`);
      }
    }

    // Check active sales orders
    if (counts.salesOrderLines > 0) {
      const activeSOs = await db.salesOrderLine.count({
        where: {
          productId: id,
          salesOrder: { status: { notIn: ['cancelled', 'closed'] } }
        }
      });
      if (activeSOs > 0) {
        dependencies.push(`${activeSOs} active sales order(s)`);
      }
    }

    // Check active quotations
    if (counts.quotationLines > 0) {
      const activeQuotes = await db.quotationLine.count({
        where: {
          productId: id,
          quotation: { status: { notIn: ['expired', 'cancelled', 'converted'] } }
        }
      });
      if (activeQuotes > 0) {
        dependencies.push(`${activeQuotes} active quotation(s)`);
      }
    }

    // Soft delete - set isActive to false
    const deactivatedProduct = await db.product.update({
      where: { id },
      data: { isActive: false },
      include: {
        category: { select: { id: true, name: true } }
      }
    });

    const response: any = {
      success: true,
      data: deactivatedProduct,
      message: 'Product deactivated successfully'
    };

    // Add warning if there are dependencies
    if (dependencies.length > 0) {
      response.warning = `Product has dependencies: ${dependencies.join(', ')}. Consider reviewing related documents.`;
      response.dependencies = dependencies;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Product DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate product' },
      { status: 500 }
    );
  }
}
