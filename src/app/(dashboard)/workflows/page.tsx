// ============================================================
// HASSIBA SUITE ERP - Visual Workflow Automation Builder
// Main Page with List View, Templates & Builder
// ============================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for workflow builder (large component)
const WorkflowBuilderWithProvider = dynamic(
  () => import('@/components/workflows/workflow-builder').then(mod => ({ default: mod.WorkflowBuilderWithProvider })),
  { 
    loading: () => (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du Workflow Builder...</p>
        </div>
      </div>
    ),
    ssr: false 
  }
);

import { 
  Workflow,
  WorkflowTemplate,
  WorkflowStatus
} from '@/lib/types/workflow';
import { workflowTemplates, getPopularTemplates, searchTemplates } from '@/lib/workflow-templates';

import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Copy, 
  MoreVertical,
  Zap,
  Receipt,
  Package,
  Users,
  Calculator,
  ShoppingCart,
  Shield,
  Landmark,
  Calendar,
  Clock,
  ArrowRight,
  Star,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  LayoutTemplate,
  FileCode,
  ChevronRight,
  Sparkles,
  Bot,
  Workflow as WorkflowIcon,
  Eye,
  RotateCcw,
  Archive,
  Power,
  PowerOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ============================================================
// Types & Interfaces
// ============================================================

interface ExecutionRecord {
  id: string;
  reference: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: (workflow: Workflow) => void;
  onView: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string, status: WorkflowStatus) => void;
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: (template: WorkflowTemplate) => void;
}

// ============================================================
// Category Icons Mapping
// ============================================================

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    finance: <Receipt className="w-5 h-5" />,
    hr: <Users className="w-5 h-5" />,
    inventory: <Package className="w-5 h-5" />,
    sales: <ShoppingCart className="w-5 h-5" />,
    purchases: <ShoppingCart className="w-5 h-5" />,
    production: <WorkflowIcon className="w-5 h-5" />,
    fiscal: <Calculator className="w-5 h-5" />,
    custom: <FileCode className="w-5 h-5" />,
  };
  return icons[category] || <Zap className="w-5 h-5" />;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    finance: 'from-blue-500 to-cyan-600',
    hr: 'from-purple-500 to-pink-600',
    inventory: 'from-orange-500 to-amber-600',
    sales: 'from-green-500 to-emerald-600',
    purchases: 'from-teal-500 to-cyan-600',
    production: 'from-gray-500 to-slate-600',
    fiscal: 'from-indigo-500 to-violet-600',
    custom: 'from-slate-500 to-gray-600',
  };
  return colors[category] || 'from-gray-500 to-gray-600';
}

function getStatusBadge(status: WorkflowStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><Power className="w-3 h-3 mr-1" /> Actif</Badge>;
    case 'paused':
      return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" /> En Pause</Badge>;
    case 'draft':
      return <Badge variant="outline">Brouillon</Badge>;
    case 'error':
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erreur</Badge>;
    case 'archived':
      return <Badge variant="secondary" className="text-muted-foreground"><Archive className="w-3 h-3 mr-1" /> Archivé</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

// ============================================================
// Workflow Card Component
// ============================================================

function WorkflowCard({ workflow, onEdit, onView, onDelete, onDuplicate, onToggleStatus }: WorkflowCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => onEdit(workflow)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getCategoryColor(workflow.category)} text-white`}>
              {getCategoryIcon(workflow.category)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(workflow); }}>
                  <Edit className="w-4 h-4 mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(workflow); }}>
                  <Eye className="w-4 h-4 mr-2" /> Voir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(workflow.id); }}>
                  <Copy className="w-4 h-4 mr-2" /> Dupliquer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {workflow.status === 'active' ? (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(workflow.id, 'paused'); }}>
                    <Pause className="w-4 h-4 mr-2" /> Mettre en pause
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(workflow.id, 'active'); }}>
                    <Play className="w-4 h-4 mr-2" /> Activer
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="mt-3 text-base font-semibold line-clamp-1">{workflow.name}</CardTitle>
          <CardDescription className="line-clamp-2 mt-1">{workflow.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(workflow.status)}
            <Badge variant="outline" className="capitalize">{workflow.category}</Badge>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{workflow.steps?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Étapes</p>
            </div>
            <div className="text-center border-x">
              <p className="text-lg font-bold text-primary">{workflow.version}</p>
              <p className="text-xs text-muted-foreground">Version</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{workflow.executionHistory?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Exécutions</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 text-xs text-muted-foreground">
          Mis à jour {new Date(workflow.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le Workflow</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{workflow.name}&quot; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { onDelete(workflow.id); setShowDeleteDialog(false); }}>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// Template Card Component
// ============================================================

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-dashed" onClick={() => onSelect(template)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getCategoryColor(template.category)} text-white`}>
            {getCategoryIcon(template.category)}
          </div>
          <div className="flex gap-1">
            {template.featured && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </TooltipTrigger>
                <TooltipContent>En vedette</TooltipContent>
              </Tooltip>
            )}
            {template.popular && (
              <Badge variant="secondary" className="text-xs">Populaire</Badge>
            )}
          </div>
        </div>
        <CardTitle className="mt-3 text-base font-semibold line-clamp-1">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className="capitalize text-xs">{template.category}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{template.difficulty}</Badge>
          <Badge variant="outline" className="text-xs">{template.estimatedTime}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-muted">
              #{tag}
            </span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <LayoutTemplate className="w-4 h-4 mr-2" /> Utiliser ce modèle
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// Main Workflows Page Component
// ============================================================

export default function WorkflowsPage() {
  // View state
  const [currentView, setCurrentView] = useState<'list' | 'builder'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  
  // Data state
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowCategory, setNewWorkflowCategory] = useState('custom');

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/workflows?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setWorkflows(result.data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Erreur lors du chargement des workflows');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Handlers
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error('Veuillez entrer un nom pour le workflow');
      return;
    }

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName,
          category: newWorkflowCategory,
          description: '',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Workflow créé avec succès!');
        setSelectedWorkflow(result.data);
        setCurrentView('builder');
        setShowCreateDialog(false);
        setNewWorkflowName('');
      } else {
        toast.error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Erreur lors de la création du workflow');
    }
  };

  const handleSaveWorkflow = async (workflowData: Partial<Workflow>) => {
    try {
      const url = selectedWorkflow 
        ? `/api/workflows/${selectedWorkflow.id}`
        : '/api/workflows';
      const method = selectedWorkflow ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Workflow sauvegardé!');
        setSelectedWorkflow(result.data);
        fetchWorkflows();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}?action=execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Exécution démarrée: ${result.data.reference}`);
      } else {
        toast.error(result.error || 'Erreur lors de l\'exécution');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Erreur lors de l\'exécution du workflow');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Workflow supprimé');
        fetchWorkflows();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}?action=duplicate`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Workflow dupliqué');
        fetchWorkflows();
      } else {
        toast.error(result.error || 'Erreur lors de la duplication');
      }
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleToggleStatus = async (id: string, status: WorkflowStatus) => {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: status === 'active' ? 'activate' : 'deactivate'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        fetchWorkflows();
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowCreateDialog(true);
    setNewWorkflowName(template.name);
    setNewWorkflowCategory(template.category);
  };

  const handleCreateFromTemplate = async () => {
    if (!newWorkflowName.trim() || !selectedTemplate) return;

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName,
          category: selectedTemplate.category,
          description: selectedTemplate.description,
          trigger: selectedTemplate.trigger,
          steps: selectedTemplate.steps.map((step, i) => ({
            ...step,
            id: crypto.randomUUID(),
            position: step.position || { x: 400 + (i * 280), y: 100 + (i * 160) }
          })),
          variables: selectedTemplate.variables,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Workflow créé depuis le modèle!');
        setSelectedWorkflow(result.data);
        setCurrentView('builder');
        setShowCreateDialog(false);
        setNewWorkflowName('');
        setSelectedTemplate(null);
      } else {
        toast.error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating from template:', error);
      toast.error('Erreur lors de la création');
    }
  };

  // Filtered data
  const filteredTemplates = searchQuery 
    ? searchTemplates(searchQuery)
    : getPopularTemplates();

  // Show builder view
  if (currentView === 'builder') {
    return (
      <div className="h-screen">
        <WorkflowBuilderWithProvider
          initialWorkflow={selectedWorkflow}
          onSave={handleSaveWorkflow}
          onExecute={handleExecuteWorkflow}
          onBack={() => {
            setCurrentView('list');
            setSelectedWorkflow(null);
            fetchWorkflows();
          }}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-7 h-7 text-primary" />
                Automatisation des Workflows
              </h1>
              <p className="text-muted-foreground mt-1">
                Créez et gérez vos automatisations métier pour HASSIBA Suite ERP
              </p>
            </div>
            
            <Button onClick={() => { setSelectedTemplate(null); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Workflow
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="workflows" className="gap-2">
              <WorkflowIcon className="w-4 h-4" />
              Mes Workflows
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutTemplate className="w-4 h-4" />
              Modèles
            </TabsTrigger>
          </TabsList>

          {/* My Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un workflow..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="archived">Archivés</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">RH</SelectItem>
                  <SelectItem value="inventory">Inventaire</SelectItem>
                  <SelectItem value="sales">Ventes</SelectItem>
                  <SelectItem value="purchases">Achats</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="fiscal">Fiscal</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Workflow Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-muted" />
                      <div className="h-5 w-3/4 bg-muted rounded mt-3" />
                      <div className="h-4 w-full bg-muted rounded mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-16">
                <WorkflowIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucun workflow trouvé</h3>
                <p className="text-muted-foreground mb-6">
                  Commencez par créer votre premier workflow ou utilisez un modèle préconfiguré.
                </p>
                <Button onClick={() => { setSelectedTemplate(null); setShowCreateDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Workflow
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map(workflow => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onEdit={(w) => { setSelectedWorkflow(w); setCurrentView('builder'); }}
                    onView={() => {}}
                    onDelete={handleDeleteWorkflow}
                    onDuplicate={handleDuplicateWorkflow}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Template Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Featured Templates Section */}
            {!searchQuery && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  Modèles Recommandés
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getPopularTemplates().slice(0, 4).map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleSelectTemplate}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Templates Grid */}
            <section>
              <h2 className="text-lg font-semibold mb-4">
                {searchQuery ? `Résultats pour "${searchQuery}"` : 'Tous les Modèles'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(searchQuery ? searchTemplates(searchQuery) : workflowTemplates).map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </section>

            {/* Algerian Business Context Info */}
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Modèles Adaptés au Contexte Algérien</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Nos modèles sont spécialement conçus pour répondre aux exigences réglementaires et aux pratiques commerciales en Algérie :
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Déclarations TVA G50 conformes DGI
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Circuits d&apos;approbation en DZD
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Gestion des seuils (500K DZD DG approval)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Fuseau horaire Africa/Algiers
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Créer depuis un Modèle' : 'Nouveau Workflow'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? `Créer un workflow basé sur "${selectedTemplate.name}"`
                : 'Commencez un nouveau workflow vide ou choisissez un modèle'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Nom du Workflow *</Label>
              <Input
                id="workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Ex: Approbation Factures Clients"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow-category">Catégorie</Label>
              <Select value={newWorkflowCategory} onValueChange={setNewWorkflowCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="finance">💰 Finance</SelectItem>
                  <SelectItem value="hr">👥 Ressources Humaines</SelectItem>
                  <SelectItem value="inventory">📦 Inventaire</SelectItem>
                  <SelectItem value="sales">🛒 Ventes</SelectItem>
                  <SelectItem value="purchases">📋 Achats</SelectItem>
                  <SelectItem value="production">🏭 Production</SelectItem>
                  <SelectItem value="fiscal">🧮 Fiscalité</SelectItem>
                  <SelectItem value="custom">⚙️ Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Modèle sélectionné:</p>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-gradient-to-br ${getCategoryColor(selectedTemplate.category)} text-white`}>
                    {getCategoryIcon(selectedTemplate.category)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedTemplate.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.difficulty} • {selectedTemplate.estimatedTime}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setSelectedTemplate(null); }}>
              Annuler
            </Button>
            <Button 
              onClick={selectedTemplate ? handleCreateFromTemplate : handleCreateWorkflow}
              disabled={!newWorkflowName.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {selectedTemplate ? 'Créer depuis le Modèle' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Label component for form
function Label({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  );
}
