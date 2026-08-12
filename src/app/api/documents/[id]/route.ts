import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, getAuthenticatedUser } from '@/lib/auth-utils';

/**
 * GET /api/documents/[id] - Get document metadata
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        parentVersion: {
          select: {
            id: true,
            name: true,
            fileName: true,
            version: true
          }
        },
        versions: {
          select: {
            id: true,
            name: true,
            fileName: true,
            version: true,
            createdAt: true
          },
          orderBy: { version: 'desc' }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check if document is deleted
    if (document.status === 'deleted') {
      const searchParams = new URL(request.url).searchParams;
      if (searchParams.get('includeDeleted') !== 'true') {
        return NextResponse.json(
          { success: false, error: "Document supprimé" },
          { status: 410 }
        );
      }
    }

    // Parse JSON fields for response
    const responseDocument = {
      ...document,
      tags: document.tags ? JSON.parse(document.tags) : [],
      allowedRoles: document.allowedRoles ? JSON.parse(document.allowedRoles) : null,
      allowedUserIds: document.allowedUserIds ? JSON.parse(document.allowedUserIds) : null
    };

    return NextResponse.json({ success: true, data: responseDocument });
  } catch (error) {
    console.error('Document GET by ID Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/documents/[id] - Update document metadata
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for updating documents
    const authError = await requireRole(request, ['admin', 'manager', 'hr']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const { id } = await params;
    const body = await request.json();

    // Check if document exists
    const existingDocument = await db.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check if document is deleted
    if (existingDocument.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: "Impossible de modifier un document supprimé" },
        { status: 400 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, any> = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    if (body.fileName !== undefined) {
      updateData.fileName = body.fileName;
    }

    if (body.fileSize !== undefined) {
      updateData.fileSize = parseInt(body.fileSize) || 0;
    }

    if (body.mimeType !== undefined) {
      updateData.mimeType = body.mimeType || null;
    }

    if (body.category !== undefined) {
      const validCategories = ['hr', 'finance', 'legal', 'administrative', 'technical', 'commercial', 'inventory', 'payroll', 'other'];
      if (!body.category || validCategories.includes(body.category)) {
        updateData.category = body.category || 'other';
      }
    }

    if (body.fileUrl !== undefined) {
      updateData.fileUrl = body.fileUrl;
    }

    if (body.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = body.thumbnailUrl || null;
    }

    if (body.storageProvider !== undefined) {
      updateData.storageProvider = body.storageProvider;
    }

    if (body.isConfidential !== undefined) {
      updateData.isConfidential = body.isConfidential;
    }

    if (body.allowedRoles !== undefined) {
      updateData.allowedRoles = Array.isArray(body.allowedRoles) 
        ? JSON.stringify(body.allowedRoles) 
        : null;
    }

    if (body.allowedUserIds !== undefined) {
      updateData.allowedUserIds = Array.isArray(body.allowedUserIds) 
        ? JSON.stringify(body.allowedUserIds) 
        : null;
    }

    if (body.status && ['active', 'archived', 'pending_approval'].includes(body.status)) {
      updateData.status = body.status;
    }

    if (body.entityType !== undefined) {
      updateData.entityType = body.entityType || null;
    }

    if (body.entityId !== undefined) {
      updateData.entityId = body.entityId || null;
    }

    if (body.tags !== undefined) {
      updateData.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : null;
    }

    const document = await db.document.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Parse JSON fields for response
    const responseDocument = {
      ...document,
      tags: document.tags ? JSON.parse(document.tags) : [],
      allowedRoles: document.allowedRoles ? JSON.parse(document.allowedRoles) : null,
      allowedUserIds: document.allowedUserIds ? JSON.parse(document.allowedUserIds) : null
    };

    return NextResponse.json({
      success: true,
      data: responseDocument,
      message: "Document mis à jour avec succès"
    });
  } catch (error) {
    console.error('Document PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id] - Soft delete document (set status to 'deleted')
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Require appropriate role for deleting documents
    const authError = await requireRole(request, ['admin', 'manager']);
    if (authError) return authError;

    const { id } = await params;

    // Check if document exists
    const existingDocument = await db.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check if already deleted
    if (existingDocument.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: "Document déjà supprimé" },
        { status: 400 }
      );
    }

    // Soft delete - update status to deleted
    await db.document.update({
      where: { id },
      data: { status: 'deleted' }
    });

    return NextResponse.json({
      success: true,
      message: `Document "${existingDocument.name}" supprimé avec succès`
    });
  } catch (error) {
    console.error('Document DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id] - Document actions (restore, archive, create version)
 * Query param: action=restore|archive|new_version
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Require appropriate role for document actions
    const authError = await requireRole(request, ['admin', 'manager', 'hr']);
    if (authError) return authError;

    const user = await getAuthenticatedUser();

    const { id } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Check if document exists
    const existingDocument = await db.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: "Document non trouvé" },
        { status: 404 }
      );
    }

    switch (action) {
      case 'restore':
        // Restore a soft-deleted document
        if (existingDocument.status !== 'deleted') {
          return NextResponse.json(
            { success: false, error: "Seuls les documents supprimés peuvent être restaurés" },
            { status: 400 }
          );
        }

        const restoredDoc = await db.document.update({
          where: { id },
          data: { status: 'active' }
        });

        return NextResponse.json({
          success: true,
          data: restoredDoc,
          message: `Document "${existingDocument.name}" restauré avec succès`
        });

      case 'archive':
        // Archive an active document
        if (existingDocument.status !== 'active') {
          return NextResponse.json(
            { success: false, error: "Seuls les documents actifs peuvent être archivés" },
            { status: 400 }
          );
        }

        const archivedDoc = await db.document.update({
          where: { id },
          data: { status: 'archived' }
        });

        return NextResponse.json({
          success: true,
          data: archivedDoc,
          message: `Document "${existingDocument.name}" archivé avec succès`
        });

      case 'new_version':
        // Create a new version of the document
        if (!body.fileName || !body.fileUrl) {
          return NextResponse.json(
            { success: false, error: "Le nom du fichier et l'URL sont obligatoires pour une nouvelle version" },
            { status: 400 }
          );
        }

        // Get current max version
        const currentVersion = existingDocument.version;

        // Create new version record
        const newVersion = await db.document.create({
          data: {
            name: body.name || existingDocument.name,
            description: body.description || existingDocument.description,
            fileName: body.fileName,
            fileSize: parseInt(body.fileSize) || existingDocument.fileSize,
            mimeType: body.mimeType || existingDocument.mimeType,
            category: existingDocument.category,
            
            fileUrl: body.fileUrl,
            thumbnailUrl: body.thumbnailUrl || existingDocument.thumbnailUrl,
            storageProvider: existingDocument.storageProvider,
            
            version: currentVersion + 1,
            parentVersionId: id,
            
            isConfidential: existingDocument.isConfidential,
            allowedRoles: existingDocument.allowedRoles,
            allowedUserIds: existingDocument.allowedUserIds,
            
            status: 'active',
            
            entityType: existingDocument.entityType,
            entityId: existingDocument.entityId,
            
            uploadedById: body.uploadedById || existingDocument.uploadedById,
            companyId: existingDocument.companyId
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        return NextResponse.json({
          success: true,
          data: newVersion,
          message: `Nouvelle version (${currentVersion + 1}) créée avec succès`
        }, { status: 201 });

      default:
        return NextResponse.json(
          { success: false, error: "Action non valide. Utilisez ?action=restore|archive|new_version" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Document POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement du document' },
      { status: 500 }
    );
  }
}
