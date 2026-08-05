import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

/**
 * GET /api/documents - List documents with filters
 * Query params: category, entityType, entityId, tags, search, page, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const tags = searchParams.get('tags');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const whereClause: Record<string, any> = {};

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (entityId) {
      whereClause.entityId = entityId;
    }

    if (tags) {
      // Search for documents containing any of the specified tags
      const tagList = tags.split(',').map(t => t.trim());
      whereClause.OR = tagList.map(tag => ({
        tags: { contains: tag }
      }));
    }

    if (search) {
      const searchCondition = {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { fileName: { contains: search } }
        ]
      };
      
      if (whereClause.OR) {
        // Combine existing OR conditions with search
        whereClause.AND = [{ OR: whereClause.OR }, searchCondition];
        delete whereClause.OR;
      } else {
        Object.assign(whereClause, searchCondition);
      }
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Exclude deleted documents by default
    if (!status && !searchParams.get('includeDeleted')) {
      whereClause.status = { not: 'deleted' };
    }

    // Get default company for filtering
    const company = await db.company.findFirst({ where: { isActive: true } });
    
    if (company) {
      whereClause.companyId = company.id;
    }

    // Get pagination info
    const total = await db.document.count({ where: whereClause });
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch documents with pagination
    const documents = await db.document.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Parse JSON fields for response
    const parsedDocuments = documents.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      allowedRoles: doc.allowedRoles ? JSON.parse(doc.allowedRoles) : null,
      allowedUserIds: doc.allowedUserIds ? JSON.parse(doc.allowedUserIds) : null
    }));

    return NextResponse.json({
      success: true,
      data: parsedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Documents GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents - Upload document metadata
 * Body: name, fileName, fileSize, mimeType?, category?, description?, etc.
 * 
 * Note: Actual file upload should be handled separately (e.g., via multipart form)
 * This endpoint handles the metadata storage only.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.fileName || !body.fileUrl || !body.uploadedById) {
      return NextResponse.json(
        { success: false, error: "Le nom, le nom du fichier, l'URL du fichier et l'identifiant du téléverseur sont obligatoires" },
        { status: 400 }
      );
    }

    // Check if uploader exists
    const uploader = await db.user.findUnique({
      where: { id: body.uploadedById }
    });

    if (!uploader) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (body.category) {
      const validCategories = ['hr', 'finance', 'legal', 'administrative', 'technical', 'commercial', 'inventory', 'payroll', 'other'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { success: false, error: `Catégorie invalide. Valeurs acceptées: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Generate unique filename if not provided or sanitize
    let finalFileName = body.fileName;
    if (body.generateUniqueName || !finalFileName) {
      const ext = finalFileName.split('.').pop() || '';
      const uuid = randomUUID().substring(0, 8);
      finalFileName = `${uuid}_${Date.now()}.${ext}`;
    }

    // Get default company
    const company = await db.company.findFirst({ where: { isActive: true } });
    
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Aucune entreprise trouvée" },
        { status: 400 }
      );
    }

    // Create document record
    const document = await db.document.create({
      data: {
        name: body.name,
        description: body.description || null,
        fileName: finalFileName,
        fileSize: parseInt(body.fileSize) || 0,
        mimeType: body.mimeType || null,
        category: body.category || 'other',
        
        // Storage
        fileUrl: body.fileUrl,
        thumbnailUrl: body.thumbnailUrl || null,
        storageProvider: body.storageProvider || 'local',
        
        // Versioning
        version: parseInt(body.version) || 1,
        parentVersionId: body.parentVersionId || null,
        
        // Access Control
        isConfidential: body.isConfidential || false,
        allowedRoles: body.allowedRoles ? JSON.stringify(body.allowedRoles) : null,
        allowedUserIds: body.allowedUserIds ? JSON.stringify(body.allowedUserIds) : null,
        
        // Status
        status: body.status || 'active',
        
        // Linking
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        
        // Relations
        uploadedById: body.uploadedById,
        companyId: company.id
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
      message: `Document "${body.name}" enregistré avec succès`
    }, { status: 201 });
  } catch (error) {
    console.error('Documents POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du document' },
      { status: 500 }
    );
  }
}
