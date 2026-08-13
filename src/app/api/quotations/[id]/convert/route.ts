import { NextResponse } from 'next/server';
import { convertQuotationToSalesOrder } from '@/lib/workflow-orchestrator';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

// POST /api/quotations/[id]/convert - Convert quotation to Sales Order
// NOTE: This route delegates to the canonical convertQuotationToSalesOrder function
// in workflow-orchestrator.ts to ensure single source of truth for conversion logic.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role
    const authError = await requireRole(request, ['admin', 'manager', 'sales_manager', 'salesperson', 'accountant', 'warehouse_manager']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Call the canonical conversion function from workflow orchestrator
    // This ensures all conversions (API or internal) use the same logic
    const result = await convertQuotationToSalesOrder({
      quotationId: id,
      expectedDate: body.expectedDate,
      paymentTerms: body.paymentTerms,
      paymentMode: body.paymentMode,
      warehouseId: body.warehouseId,
      salesPersonId: body.salesPersonId,
      internalNotes: body.internalNotes,
      customerNotes: body.customerNotes
    }, user?.id);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.message,
          errors: result.errors,
          workflowTrace: result.workflowTrace 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message,
      workflowTrace: result.workflowTrace
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation CONVERT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert quotation to Sales Order' },
      { status: 500 }
    );
  }
}
