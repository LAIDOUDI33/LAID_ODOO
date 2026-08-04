import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/contracts/[id] - Get single contract with full details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            department: true,
            jobTitle: true,
            jobPosition: true,
            phone: true,
            workEmail: true,
            personalEmail: true,
            address: true,
            city: true,
            dateOfBirth: true,
            cin: true,
            cnasNumber: true,
            casnosNumber: true
          }
        },
        manager: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contrat non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error('Contract GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du contrat' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contracts/[id] - Update contract
 * Only allows updates for draft or active contracts
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if contract exists
    const existingContract = await db.contract.findUnique({ where: { id } });

    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "Contrat non trouvé" },
        { status: 404 }
      );
    }

    // Only allow updates for draft or active contracts (not terminated or expired)
    if (['terminated', 'expired'].includes(existingContract.status)) {
      return NextResponse.json(
        { success: false, error: "Les contrats terminés ou expirés ne peuvent pas être modifiés" },
        { status: 400 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    // Basic info
    if (body.type !== undefined) {
      const validTypes = ['cdi', 'cdd', 'internship', 'temporary', 'part_time'];
      if (validTypes.includes(body.type)) {
        updateData.type = body.type;
      }
    }

    // Dates
    if (body.startDate !== undefined) {
      updateData.startDate = new Date(body.startDate);
    }

    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    if (body.trialEndDate !== undefined) {
      updateData.trialEndDate = body.trialEndDate ? new Date(body.trialEndDate) : null;
    }

    // Financial
    if (body.baseSalary !== undefined) {
      updateData.baseSalary = parseFloat(body.baseSalary) || 0;
    }

    if (body.currency !== undefined) {
      updateData.currency = body.currency;
    }

    if (body.paymentFrequency !== undefined) {
      updateData.paymentFrequency = body.paymentFrequency;
    }

    // Benefits
    if (body.transportAllowance !== undefined) {
      updateData.transportAllowance = parseFloat(body.transportAllowance) || 0;
    }

    if (body.housingAllowance !== undefined) {
      updateData.housingAllowance = parseFloat(body.housingAllowance) || 0;
    }

    if (body.foodAllowance !== undefined) {
      updateData.foodAllowance = parseFloat(body.foodAllowance) || 0;
    }

    if (body.otherBenefits !== undefined) {
      updateData.otherBenefits = body.otherBenefits ? JSON.stringify(body.otherBenefits) : null;
    }

    // Working conditions
    if (body.weeklyHours !== undefined) {
      updateData.weeklyHours = parseFloat(body.weeklyHours) || 40;
    }

    if (body.daysLeave !== undefined) {
      updateData.daysLeave = parseInt(body.daysLeave) || 30;
    }

    if (body.sickLeaveDays !== undefined) {
      updateData.sickLeaveDays = parseInt(body.sickLeaveDays) || 15;
    }

    if (body.location !== undefined) {
      updateData.location = body.location || null;
    }

    if (body.department !== undefined) {
      updateData.department = body.department || null;
    }

    if (body.jobTitle !== undefined) {
      updateData.jobTitle = body.jobTitle || null;
    }

    if (body.jobGrade !== undefined) {
      updateData.jobGrade = body.jobGrade || null;
    }

    // Legal (Algerian compliance)
    if (body.nssNumber !== undefined) {
      updateData.nssNumber = body.nssNumber || null;
    }

    if (body.cnasNumber !== undefined) {
      updateData.cnasNumber = body.cnasNumber || null;
    }

    if (body.casnosNumber !== undefined) {
      updateData.casnosNumber = body.casnosNumber || null;
    }

    if (body.mutuelleNumber !== undefined) {
      updateData.mutuelleNumber = body.mutuelleNumber || null;
    }

    // Files
    if (body.contractFileUrl !== undefined) {
      updateData.contractFileUrl = body.contractFileUrl || null;
    }

    if (body.annexFilesUrls !== undefined) {
      updateData.annexFilesUrls = body.annexFilesUrls ? JSON.stringify(body.annexFilesUrls) : null;
    }

    // Notes
    if (body.internalNotes !== undefined) {
      updateData.internalNotes = body.internalNotes || null;
    }

    if (body.specialClauses !== undefined) {
      updateData.specialClauses = body.specialClauses || null;
    }

    // Relations
    if (body.managerId !== undefined) {
      updateData.managerId = body.managerId || null;
    }

    // Status change (if explicitly requested)
    if (body.status && ['draft', 'active', 'suspended'].includes(body.status)) {
      updateData.status = body.status;
    }

    const contract = await db.contract.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: `Contrat ${contract.reference} mis à jour avec succès`
    });
  } catch (error) {
    console.error('Contract PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du contrat' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/[id] - Contract actions (activate, terminate, renew)
 * Query param: action=activate|terminate|renew
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Check if contract exists
    const existingContract = await db.contract.findUnique({ 
      where: { id },
      include: { employee: true }
    });

    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "Contrat non trouvé" },
        { status: 404 }
      );
    }

    let updatedContract;

    switch (action) {
      case 'activate':
        // Activate contract - only from draft or suspended
        if (!['draft', 'suspended'].includes(existingContract.status)) {
          return NextResponse.json(
            { success: false, error: "Seuls les contrats en brouillon ou suspendus peuvent être activés" },
            { status: 400 }
          );
        }

        updatedContract = await db.contract.update({
          where: { id },
          data: { status: 'active' },
          include: {
            employee: {
              select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Update employee's contract info
        await db.employee.update({
          where: { id: existingContract.employeeId },
          data: {
            contractType: existingContract.type,
            contractStartDate: existingContract.startDate,
            contractEndDate: existingContract.endDate,
            baseSalary: existingContract.baseSalary,
            employeeStatus: 'active'
          }
        });

        return NextResponse.json({
          success: true,
          data: updatedContract,
          message: `Contrat ${existingContract.reference} activé avec succès`
        });

      case 'terminate':
        // Terminate contract - only from active or suspended
        if (!['active', 'suspended'].includes(existingContract.status)) {
          return NextResponse.json(
            { success: false, error: "Seuls les contrats actifs ou suspendus peuvent être résiliés" },
            { status: 400 }
          );
        }

        if (!body.terminationReason) {
          return NextResponse.json(
            { success: false, error: "La raison de la résiliation est obligatoire" },
            { status: 400 }
          );
        }

        const terminationDate = body.terminationDate ? new Date(body.terminationDate) : new Date();

        updatedContract = await db.contract.update({
          where: { id },
          data: {
            status: 'terminated',
            terminationDate,
            terminationReason: body.terminationReason
          },
          include: {
            employee: {
              select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Update employee status
        await db.employee.update({
          where: { id: existingContract.employeeId },
          data: {
            employeeStatus: 'terminated',
            isActive: false,
            contractEndDate: terminationDate
          }
        });

        return NextResponse.json({
          success: true,
          data: updatedContract,
          message: `Contrat ${existingContract.reference} résilié avec effet au ${terminationDate.toLocaleDateString('fr-DZ')}`
        });

      case 'renew':
        // Renew contract - only from active or expiring
        if (!['active', 'expired'].includes(existingContract.status)) {
          return NextResponse.json(
            { success: false, error: "Seuls les contrats actifs ou expirés peuvent être renouvelés" },
            { status: 400 }
          );
        }

        if (!body.newEndDate) {
          return NextResponse.json(
            { success: false, error: "La nouvelle date de fin est obligatoire pour le renouvellement" },
            { status: 400 }
          );
        }

        const newEndDate = new Date(body.newEndDate);

        if (newEndDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: "La nouvelle date de fin doit être dans le futur" },
            { status: 400 }
          );
        }

        updatedContract = await db.contract.update({
          where: { id },
          data: {
            status: 'active',
            endDate: newEndDate,
            renewalCount: existingContract.renewalCount + 1
          },
          include: {
            employee: {
              select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Update employee's contract end date
        await db.employee.update({
          where: { id: existingContract.employeeId },
          data: {
            contractEndDate: newEndDate,
            employeeStatus: 'active'
          }
        });

        return NextResponse.json({
          success: true,
          data: updatedContract,
          message: `Contrat ${existingContract.reference} renouvelé jusqu'au ${newEndDate.toLocaleDateString('fr-DZ')}`
        });

      default:
        return NextResponse.json(
          { success: false, error: "Action non valide. Utilisez ?action=activate|terminate|renew" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Contract POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement du contrat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contracts/[id] - Delete contract (only if draft)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if contract exists
    const existingContract = await db.contract.findUnique({ where: { id } });

    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "Contrat non trouvé" },
        { status: 404 }
      );
    }

    // Only allow deletion for draft contracts
    if (existingContract.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: "Seuls les contrats en brouillon peuvent être supprimés" },
        { status: 400 }
      );
    }

    await db.contract.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Contrat ${existingContract.reference} supprimé avec succès`
    });
  } catch (error) {
    console.error('Contract DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du contrat' },
      { status: 500 }
    );
  }
}
