// ============================================================
// HASSIBA SUITE ERP - Workflow Triggers & Actions Catalog API
// GET /api/workflows/catalog - Full catalog
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  availableTriggers, 
  availableActions, 
  nodePaletteCategories,
  workflowTemplates,
  getPopularTemplates,
  searchTemplates
} from '@/lib/workflow-templates';
import { requireAuth } from '@/lib/auth-utils';

// ============================================================
// GET /api/workflows/catalog - Get full catalog or specific section
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // triggers, actions, palette, templates
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const popular = searchParams.get('popular') === 'true';
    const featured = searchParams.get('featured') === 'true';

    // Return specific section if requested
    switch (section) {
      case 'triggers':
        return NextResponse.json({
          success: true,
          data: availableTriggers,
          count: availableTriggers.length
        });

      case 'actions':
        return NextResponse.json({
          success: true,
          data: availableActions,
          count: availableActions.length
        });

      case 'palette':
        return NextResponse.json({
          success: true,
          data: nodePaletteCategories
        });

      case 'templates':
        let templates = workflowTemplates;

        // Apply filters
        if (category) {
          templates = templates.filter(t => t.category === category);
        }

        if (search) {
          templates = searchTemplates(search);
        }

        if (popular) {
          templates = getPopularTemplates();
        }

        if (featured) {
          templates = templates.filter(t => t.featured);
        }

        return NextResponse.json({
          success: true,
          data: templates,
          count: templates.length,
          categories: [...new Set(workflowTemplates.map(t => t.category))]
        });

      default:
        // Return full catalog
        let filteredTemplates = workflowTemplates;
        
        if (category) {
          filteredTemplates = filteredTemplates.filter(t => t.category === category);
        }

        if (search) {
          filteredTemplates = searchTemplates(search);
        }

        return NextResponse.json({
          success: true,
          data: {
            triggers: availableTriggers,
            actions: availableActions,
            palette: nodePaletteCategories,
            templates: filteredTemplates
          },
          metadata: {
            triggerCount: availableTriggers.length,
            actionCount: availableActions.length,
            templateCount: filteredTemplates.length,
            categories: [...new Set(workflowTemplates.map(t => t.category))]
          }
        });
    }

  } catch (error) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
