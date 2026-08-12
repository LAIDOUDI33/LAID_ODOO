// ============================================================
// HASSIBA SUITE ERP - Visual Workflow Builder Component
// Node-based Visual Editor using @xyflow/react
// ============================================================

'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  Workflow, 
  WorkflowStep, 
  FlowNodeData, 
  FlowEdgeData,
  WorkflowTrigger,
  StepType,
  WorkflowStatus
} from '@/lib/types/workflow';

import { v4 as uuidv4 } from 'uuid';
import { 
  Play, 
  Pause, 
  Save, 
  Trash2, 
  Plus, 
  Settings, 
  Zap, 
  Mail, 
  GitBranch, 
  Clock, 
  CheckCircle, 
  Users, 
  FileText, 
  Package, 
  Calculator, 
  Calendar,
  Shield,
  ShoppingCart,
  Landmark,
  Bell,
  Search,
  Edit,
  Copy,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronRight,
  GripVertical,
  MousePointerClick,
  Timer,
  Repeat,
  Send,
  Globe,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Bot,
  Workflow as WorkflowIcon,
  Eye,
  RotateCcw,
  Layers,
  Code,
  Database,
  FileInput,
  FileOutput,
  Webhook,
  Filter,
  Hexagon,
  Flag,
  Power,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ============================================================
// Types & Interfaces
// ============================================================

interface CustomNodeProps {
  data: FlowNodeData;
  selected?: boolean;
  id?: string;
}

interface NodePaletteItem {
  type: string;
  label: string;
  labelAr?: string;
  icon: React.ReactNode;
  description: string;
  category: 'trigger' | 'action' | 'logic' | 'advanced';
  color: string;
}

interface WorkflowBuilderProps {
  initialWorkflow?: Workflow | null;
  onSave?: (workflow: Partial<Workflow>) => Promise<void>;
  onExecute?: (workflowId: string) => Promise<void>;
  onBack?: () => void;
  readOnly?: boolean;
}

// ============================================================
// Node Palette Configuration
// ============================================================

const nodePaletteItems: NodePaletteItem[] = [
  // Trigger Nodes
  {
    type: 'trigger-manual',
    label: 'Déclencheur Manuel',
    labelAr: 'تشغيل يدوي',
    icon: <MousePointerClick size={18} />,
    description: 'Déclenché par un utilisateur',
    category: 'trigger',
    color: 'from-emerald-500 to-green-600'
  },
  {
    type: 'trigger-schedule',
    label: 'Planification',
    labelAr: 'جدولة زمنية',
    icon: <Calendar size={18} />,
    description: 'Déclenché selon un horaire (CRON)',
    category: 'trigger',
    color: 'from-violet-500 to-purple-600'
  },
  {
    type: 'trigger-event',
    label: 'Événement',
    labelAr: 'حدث',
    icon: <Zap size={18} />,
    description: 'Déclenché par un événement système',
    category: 'trigger',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    type: 'trigger-webhook',
    label: 'Webhook',
    icon: <Webhook size={18} />,
    description: 'Déclenché par un appel HTTP',
    category: 'trigger',
    color: 'from-pink-500 to-rose-600'
  },
  
  // Action Nodes
  {
    type: 'action-email',
    label: 'Envoyer Email',
    labelAr: 'إرسال بريد إلكتروني',
    icon: <Mail size={18} />,
    description: 'Envoyer un email',
    category: 'action',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    type: 'action-notification',
    label: 'Notification',
    labelAr: 'إشعار',
    icon: <Bell size={18} />,
    description: 'Envoyer une notification',
    category: 'action',
    color: 'from-amber-500 to-orange-600'
  },
  {
    type: 'action-create',
    label: 'Créer Enregistrement',
    labelAr: 'إنشاء سجل',
    icon: <Plus size={18} />,
    description: 'Créer un enregistrement',
    category: 'action',
    color: 'from-green-500 to-emerald-600'
  },
  {
    type: 'action-update',
    label: 'Modifier Enregistrement',
    labelAr: 'تعديل سجل',
    icon: <Edit size={18} />,
    description: 'Modifier un enregistrement',
    category: 'action',
    color: 'from-teal-500 to-cyan-600'
  },
  {
    type: 'action-http',
    label: 'Requête HTTP',
    icon: <Globe size={18} />,
    description: 'Appeler une API externe',
    category: 'action',
    color: 'from-indigo-500 to-violet-600'
  },
  {
    type: 'action-pdf',
    label: 'Générer PDF',
    icon: <FileText size={18} />,
    description: 'Générer un document PDF',
    category: 'action',
    color: 'from-red-500 to-rose-600'
  },
  
  // Logic Nodes
  {
    type: 'condition',
    label: 'Condition',
    labelAr: 'شرط',
    icon: <GitBranch size={18} />,
    description: 'Branchements conditionnels Si/Sinon',
    category: 'logic',
    color: 'from-amber-500 to-orange-600'
  },
  {
    type: 'delay',
    label: 'Délai',
    labelAr: 'تأخير',
    icon: <Clock size={18} />,
    description: 'Attendre avant de continuer',
    category: 'logic',
    color: 'from-cyan-500 to-teal-600'
  },
  {
    type: 'loop',
    label: 'Boucle',
    labelAr: 'حلقة',
    icon: <Repeat size={18} />,
    description: 'Répéter des actions',
    category: 'logic',
    color: 'from-purple-500 to-pink-600'
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: <Layers size={18} />,
    description: 'Branchement multiple',
    category: 'logic',
    color: 'from-slate-500 to-gray-600'
  },
  
  // Advanced Nodes
  {
    type: 'approval',
    label: 'Approbation',
    labelAr: 'موافقة',
    icon: <UserCheck size={18} />,
    description: 'Demander une approbation humaine',
    category: 'advanced',
    color: 'from-yellow-500 to-amber-600'
  },
  {
    type: 'parallel',
    label: 'Parallèle',
    labelAr: 'متوازي',
    icon: <Layers size={18} />,
    description: 'Exécuter en parallèle',
    category: 'advanced',
    color: 'from-fuchsia-500 to-pink-600'
  },
];

const nodePaletteCategories = [
  { id: 'trigger', label: 'Déclencheurs', icon: <Zap size={14} /> },
  { id: 'action', label: 'Actions', icon: <Play size={14} /> },
  { id: 'logic', label: 'Logique', icon: <GitBranch size={14} /> },
  { id: 'advanced', label: 'Avancé', icon: <Settings size={14} /> },
];

// ============================================================
// Custom Node Components
// ============================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-400';
    case 'warning': return 'bg-yellow-400';
    case 'error': return 'bg-red-400';
    case 'running': return 'bg-blue-400 animate-pulse';
    default: return '';
  }
}

// Trigger Node Component
function TriggerNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[200px] rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-300" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <Zap size={16} />
          </div>
          <span className="font-semibold text-sm">Déclencheur</span>
          <Badge variant="secondary" className="ml-auto text-xs bg-white/20 text-white border-0">
            {data.triggerType || 'manuel'}
          </Badge>
        </div>
        <div className="text-xs text-emerald-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-emerald-200/70 mt-1 line-clamp-2">{data.description}</div>
        )}
      </div>
      
      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-emerald-700 ${statusClass}`} />
      )}
    </div>
  );
}

// Action Node Component
function ActionNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[200px] rounded-lg border-2 border-blue-400 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-300" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            {data.icon === 'Mail' ? <Mail size={16} /> :
             data.icon === 'Bell' ? <Bell size={16} /> :
             data.icon === 'Plus' ? <Plus size={16} /> :
             data.icon === 'Edit' ? <Edit size={16} /> :
             data.icon === 'Globe' ? <Globe size={16} /> :
             data.icon === 'FileText' ? <FileText size={16} /> :
             <Settings size={16} />}
          </div>
          <span className="font-semibold text-sm">Action</span>
        </div>
        <div className="text-xs text-blue-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-blue-200/70 mt-1">{data.description}</div>
        )}
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-blue-700 ${statusClass}`} />
      )}
    </div>
  );
}

// Condition Node Component (Diamond shape approximation)
function ConditionNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[220px] rounded-lg border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-300" />
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-green-400" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-red-400" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <GitBranch size={16} />
          </div>
          <span className="font-semibold text-sm">Condition</span>
        </div>
        <div className="text-xs text-amber-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-amber-200/70 mt-1">{data.description}</div>
        )}
        
        <div className="flex justify-between mt-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-green-500/30 text-green-100">Oui ✓</span>
          <span className="px-2 py-0.5 rounded bg-red-500/30 text-red-100">Non ✗</span>
        </div>
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-orange-600 ${statusClass}`} />
      )}
    </div>
  );
}

// Approval Node Component
function ApprovalNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[220px] rounded-lg border-2 border-yellow-400 bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-300" />
      <Handle type="source" position={Position.Bottom} id="approved" style={{ left: '35%' }} className="!bg-green-400" />
      <Handle type="source" position={Position.Bottom} id="rejected" style={{ left: '65%' }} className="!bg-red-400" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <UserCheck size={16} />
          </div>
          <span className="font-semibold text-sm">Approbation</span>
        </div>
        <div className="text-xs text-yellow-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-yellow-200/70 mt-1">{data.description}</div>
        )}
        
        <div className="flex justify-between mt-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-green-500/30 text-green-100">Approuvé ✓</span>
          <span className="px-2 py-0.5 rounded bg-red-500/30 text-red-100">Rejeté ✗</span>
        </div>
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-amber-700 ${statusClass}`} />
      )}
    </div>
  );
}

// Delay Node Component
function DelayNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[180px] rounded-lg border-2 border-cyan-400 bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-300" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <Clock size={16} />
          </div>
          <span className="font-semibold text-sm">Délai</span>
        </div>
        <div className="text-xs text-cyan-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-cyan-200/70 mt-1">{data.description}</div>
        )}
        
        {data.config?.duration && (
          <div className="mt-2 px-2 py-1 rounded bg-white/10 text-xs">
            {data.config.duration} {data.config.delayUnit || 'minutes'}
          </div>
        )}
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-teal-600 ${statusClass}`} />
      )}
    </div>
  );
}

// Loop Node Component
function LoopNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[200px] rounded-lg border-2 border-purple-400 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-300" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <Repeat size={16} />
          </div>
          <span className="font-semibold text-sm">Boucle</span>
        </div>
        <div className="text-xs text-purple-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-purple-200/70 mt-1">{data.description}</div>
        )}
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-pink-600 ${statusClass}`} />
      )}
    </div>
  );
}

// Parallel Node Component
function ParallelNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  const statusClass = getStatusColor(data.status || 'default');
  
  return (
    <div className={`relative min-w-[220px] rounded-lg border-2 border-fuchsia-400 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-fuchsia-300" />
      <Handle type="source" position={Position.Bottom} id="branch-1" style={{ left: '25%' }} className="!bg-fuchsia-300" />
      <Handle type="source" position={Position.Bottom} id="branch-2" style={{ left: '50%' }} className="!bg-fuchsia-300" />
      <Handle type="source" position={Position.Bottom} id="branch-3" style={{ left: '75%' }} className="!bg-fuchsia-300" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-white/20">
            <Layers size={16} />
          </div>
          <span className="font-semibold text-sm">Parallèle</span>
        </div>
        <div className="text-xs text-fuchsia-100 font-medium">{data.label}</div>
        {data.description && (
          <div className="text-xs text-fuchsia-200/70 mt-1">{data.description}</div>
        )}
      </div>

      {data.status && data.status !== 'default' && (
        <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-pink-700 ${statusClass}`} />
      )}
    </div>
  );
}

// End Node Component
function EndNode({ data, selected }: CustomNodeProps) {
  const borderClass = selected ? 'ring-2 ring-white/50' : '';
  
  return (
    <div className={`relative min-w-[140px] rounded-full border-2 border-gray-400 bg-gradient-to-br from-gray-600 to-gray-800 text-white shadow-lg ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      
      <div className="p-3 text-center">
        <Flag size={20} className="mx-auto mb-1" />
        <span className="font-semibold text-xs">Fin</span>
      </div>
    </div>
  );
}

// Define node types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  approval: ApprovalNode,
  delay: DelayNode,
  loop: LoopNode,
  parallel: ParallelNode,
  end: EndNode,
};

// ============================================================
// Main Workflow Builder Component
// ============================================================

export function WorkflowBuilder({ 
  initialWorkflow = null, 
  onSave, 
  onExecute,
  onBack,
  readOnly = false 
}: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<FlowNodeData | null>(null);
  
  // UI State
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || 'Nouveau Workflow');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(initialWorkflow?.status || 'draft');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [activeCategory, setActiveCategory] = useState('trigger');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  // Initialize with default nodes if no workflow provided
  useEffect(() => {
    if (initialWorkflow && initialWorkflow.steps.length > 0) {
      // Load existing workflow
      const flowNodes: Node[] = initialWorkflow.steps.map((step, index) => ({
        id: step.id,
        type: mapStepTypeToNodeType(step.type),
        position: step.position || { x: 100 + (index * 280), y: 100 },
        data: {
          label: step.name,
          description: step.description,
          type: step.type,
          config: step.config,
          ...mapStepConfigToNodeData(step.type, step.config),
        } as FlowNodeData,
      }));
      
      // Add trigger node
      flowNodes.unshift({
        id: 'trigger-start',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: getTriggerLabel(initialWorkflow.trigger.type),
          triggerType: initialWorkflow.trigger.type,
          type: 'trigger',
        } as FlowNodeData,
      });
      
      // Add end node
      flowNodes.push({
        id: 'end-node',
        type: 'end',
        position: { x: 100 + (flowNodes.length * 280), y: 100 },
        data: { label: 'Fin', type: 'end' } as FlowNodeData,
      });
      
      setNodes(flowNodes);
      
      // Create edges between nodes
      const flowEdges: Edge[] = [];
      for (let i = 0; i < flowNodes.length - 1; i++) {
        flowEdges.push({
          id: `e-${flowNodes[i].id}-${flowNodes[i + 1].id}`,
          source: flowNodes[i].id,
          target: flowNodes[i + 1].id,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        });
      }
      setEdges(flowEdges);
    } else {
      // Create default workflow structure
      const defaultNodes: Node[] = [
        {
          id: 'trigger-start',
          type: 'trigger',
          position: { x: 100, y: 150 },
          data: { label: 'Déclencheur Manuel', triggerType: 'manual', type: 'trigger' } as FlowNodeData,
        },
        {
          id: 'end-node',
          type: 'end',
          position: { x: 550, y: 150 },
          data: { label: 'Fin', type: 'end' } as FlowNodeData,
        },
      ];
      
      const defaultEdges: Edge[] = [
        {
          id: 'e-trigger-start-end-node',
          source: 'trigger-start',
          target: 'end-node',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        },
      ];
      
      setNodes(defaultNodes);
      setEdges(defaultEdges);
    }
  }, [initialWorkflow]);

  // Helper functions
  function mapStepTypeToNodeType(stepType: string): string {
    const mapping: Record<string, string> = {
      action: 'action',
      condition: 'condition',
      delay: 'delay',
      loop: 'loop',
      approval: 'approval',
      parallel: 'parallel',
      switch: 'condition',
    };
    return mapping[stepType] || 'action';
  }

  function getTriggerLabel(triggerType: string): string {
    const labels: Record<string, string> = {
      manual: 'Déclencheur Manuel',
      schedule: 'Planification',
      event: 'Événement',
      webhook: 'Webhook',
      form_submit: 'Soumission Formulaire',
    };
    return labels[triggerType] || 'Déclencheur';
  }

  function mapStepConfigToNodeData(stepType: string, config: any): Partial<FlowNodeData> {
    const baseData: Partial<FlowNodeData> = {};
    
    if (stepType === 'action') {
      baseData.icon = mapActionTypeToIcon(config?.actionType);
    }
    
    return baseData;
  }

  function mapActionTypeToIcon(actionType?: string): string {
    const icons: Record<string, string> = {
      send_email: 'Mail',
      send_sms: 'Bell',
      send_notification: 'Bell',
      create_record: 'Plus',
      update_record: 'Edit',
      delete_record: 'Trash2',
      call_api: 'Globe',
      generate_pdf: 'FileText',
      generate_excel: 'Table',
      webhook_call: 'Webhook',
    };
    return icons[actionType || ''] || 'Settings';
  }

  // Drag and drop handlers
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    
    // Check if drop target is valid
    if (!reactFlowWrapper.current) return;
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = createNodeFromType(type, position);
    if (newNode) {
      setNodes((nds) => [...nds, newNode]);
      toast.success(`Nœud "${newNode.data.label}" ajouté`);
    }
  }, [screenToFlowPosition, setNodes]);

  function createNodeFromType(type: string, position: { x: number; y: number }): Node | null {
    const paletteItem = nodePaletteItems.find(item => item.type === type);
    if (!paletteItem) return null;

    const nodeId = uuidv4();
    const nodeType = type.split('-')[0]; // Get base type (trigger, action, condition, etc.)
    
    const newNode: Node = {
      id: nodeId,
      type: nodeType,
      position,
      data: {
        label: paletteItem.label,
        description: paletteItem.description,
        type: nodeType as FlowNodeData['type'],
        ...(nodeType === 'trigger' && { triggerType: type.replace('trigger-', '') }),
        ...(nodeType === 'action' && { 
          icon: mapActionTypeFromPaletteType(type),
          actionType: type.replace('action-', ''),
        }),
        config: getDefaultConfigForType(nodeType, type),
      } as FlowNodeData,
    };

    return newNode;
  }

  function mapActionTypeFromPaletteType(type: string): string {
    const mapping: Record<string, string> = {
      'action-email': 'Mail',
      'action-notification': 'Bell',
      'action-create': 'Plus',
      'action-update': 'Edit',
      'action-http': 'Globe',
      'action-pdf': 'FileText',
    };
    return mapping[type] || 'Settings';
  }

  function getDefaultConfigForType(nodeType: string, fullType: string): any {
    switch (nodeType) {
      case 'delay':
        return { delayType: 'fixed', duration: 1, delayUnit: 'hours' };
      case 'condition':
        return { conditionType: 'simple', conditions: [{ logic: 'AND', conditions: [] }] };
      case 'approval':
        return { approvalType: 'single', approvers: [], timeoutHours: 48 };
      case 'loop':
        return { loopType: 'for_each', iterateOver: '' };
      case 'action':
        return { actionType: fullType.replace('action-', ''), actionParams: {} };
      default:
        return {};
    }
  }

  // Connection handler
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }, eds));
    toast.success('Connexion créée');
  }, [setEdges]);

  // Node selection handler
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    if (selectedNodes.length > 0) {
      setSelectedNode(selectedNodes[0].id);
      setSelectedNodeData(selectedNodes[0].data as FlowNodeData);
    } else {
      setSelectedNode(null);
      setSelectedNodeData(null);
    }
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const workflowData: Partial<Workflow> = {
        name: workflowName,
        status: workflowStatus,
        steps: nodes
          .filter(n => n.id !== 'trigger-start' && n.id !== 'end-node')
          .map(n => ({
            id: n.id,
            type: (n.data.type || 'action') as StepType,
            name: n.data.label,
            description: n.data.description,
            position: n.position,
            config: n.data.config || {},
            enabled: true,
          })),
        trigger: {
          type: (nodes.find(n => n.id === 'trigger-start')?.data as FlowNodeData)?.triggerType || 'manual',
          config: {},
        } as WorkflowTrigger,
      };

      if (onSave) {
        await onSave(workflowData);
      }
      
      toast.success('Workflow sauvegardé avec succès!');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, workflowStatus, nodes, onSave]);

  // Execute/Test handler
  const handleTest = useCallback(async () => {
    setIsExecuting(true);
    setTestResult(null);
    
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate workflow
      const hasTrigger = nodes.some(n => n.id === 'trigger-start');
      const hasEnd = nodes.some(n => n.id === 'end-node');
      const hasActions = nodes.some(n => n.type === 'action' || n.type === 'condition');
      
      if (!hasTrigger || !hasEnd) {
        setTestResult({ success: false, message: 'Le workflow doit avoir un déclencheur et une fin.' });
        return;
      }
      
      if (!hasActions) {
        setTestResult({ success: false, message: 'Ajoutez au moins une action ou condition.' });
        return;
      }
      
      setTestResult({ 
        success: true, 
        message: `Workflow validé! ${nodes.length - 2} étapes prêtes à l'exécution.` 
      });
      
      if (onExecute && initialWorkflow?.id) {
        await onExecute(initialWorkflow.id);
      }
    } catch (error) {
      console.error('Error testing workflow:', error);
      setTestResult({ success: false, message: 'Erreur lors du test du workflow.' });
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, onExecute, initialWorkflow]);

  // Delete selected node
  const handleDeleteNode = useCallback(() => {
    if (!selectedNode || selectedNode === 'trigger-start' || selectedNode === 'end-node') {
      toast.error('Impossible de supprimer ce nœud');
      return;
    }
    
    setNodes((nds) => nds.filter(n => n.id !== selectedNode));
    setEdges((eds) => eds.filter(e => e.source !== selectedNode && e.target !== selectedNode));
    setSelectedNode(null);
    setSelectedNodeData(null);
    toast.success('Nœud supprimé');
  }, [selectedNode, setNodes, setEdges]);

  // Filtered palette items
  const filteredPaletteItems = useMemo(() => {
    if (!searchQuery) {
      return nodePaletteItems.filter(item => item.category === activeCategory);
    }
    return nodePaletteItems.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeCategory, searchQuery]);

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Top Toolbar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <X className="w-4 h-4 mr-1" />
                Retour
              </Button>
            )}
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-5 h-5 text-primary" />
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="h-8 w-64 font-semibold border-none focus-visible:ring-1"
                placeholder="Nom du workflow..."
              />
            </div>
            <Badge variant={workflowStatus === 'active' ? 'default' : 'secondary'}>
              {workflowStatus === 'draft' && 'Brouillon'}
              {workflowStatus === 'active' && <><Power className="w-3 h-3 mr-1" /> Actif</>}
              {workflowStatus === 'paused' && <><Pause className="w-3 h-3 mr-1" /> En Pause</>}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowNodePalette(!showNodePalette)}>
                  <Layers className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Palette de Nœuds</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}>
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Propriétés</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTestDialog(true)}
                  disabled={readOnly}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Tester
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tester le Workflow</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => setShowSaveDialog(true)}
                  disabled={readOnly || isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Sauvegarder
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sauvegarder le Workflow</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Node Palette */}
          {showNodePalette && (
            <aside className="w-72 border-r bg-card flex flex-col shrink-0">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un nœud..."
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 mx-2 mt-2">
                  {nodePaletteCategories.map(cat => (
                    <TabsTrigger key={cat.id} value={cat.id} className="text-xs p-1.5">
                      <div className="flex flex-col items-center gap-0.5">
                        {cat.icon}
                        <span className="hidden lg:inline">{cat.label}</span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeCategory} className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="space-y-2">
                      {filteredPaletteItems.map(item => (
                        <Card
                          key={item.type}
                          draggable={!readOnly}
                          onDragStart={(e) => onDragStart(e, item.type)}
                          className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} text-white`}>
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.label}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              </div>
                              <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {filteredPaletteItems.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucun nœud trouvé</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </aside>
          )}

          {/* Center Canvas - React Flow */}
          <main className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 },
              }}
              proOptions={{ hideAttribution: true }}
              className="bg-muted/30"
            >
              <Background gap={20} size={1} color="#e2e8f0" />
              <Controls 
                showInteractive={false}
                className="!border !shadow-lg"
              />
              <MiniMap 
                nodeStrokeWidth={3}
                zoomable
                pannable
                className="!border !shadow-lg"
                maskColor="rgba(0,0,0,0.1)"
              />
            </ReactFlow>

            {/* Empty State / Help Overlay */}
            {nodes.length <= 2 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-card/90 rounded-xl border shadow-lg pointer-events-auto">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Commencez votre Workflow</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Glissez-déposez des nœuds depuis la palette vers le canevas pour construire votre automation.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline"><Zap className="w-3 h-3 mr-1" /> Déclencheurs</Badge>
                    <Badge variant="outline"><Play className="w-3 h-3 mr-1" /> Actions</Badge>
                    <Badge variant="outline"><GitBranch className="w-3 h-3 mr-1" /> Logique</Badge>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right Panel - Properties */}
          {showPropertiesPanel && (
            <aside className="w-80 border-l bg-card flex flex-col shrink-0">
              {selectedNode && selectedNodeData ? (
                <>
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Propriétés du Nœud</h3>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNode(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {selectedNodeData.type}
                    </Badge>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="node-label">Nom</Label>
                        <Input
                          id="node-label"
                          value={selectedNodeData.label}
                          onChange={(e) => {
                            const newData = { ...selectedNodeData, label: e.target.value };
                            setSelectedNodeData(newData);
                            setNodes(nds => nds.map(n => 
                              n.id === selectedNode ? { ...n, data: newData } : n
                            ));
                          }}
                          disabled={readOnly}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="node-description">Description</Label>
                        <Textarea
                          id="node-description"
                          value={selectedNodeData.description || ''}
                          onChange={(e) => {
                            const newData = { ...selectedNodeData, description: e.target.value };
                            setSelectedNodeData(newData);
                            setNodes(nds => nds.map(n => 
                              n.id === selectedNode ? { ...n, data: newData } : n
                            ));
                          }}
                          rows={3}
                          disabled={readOnly}
                          placeholder="Description optionnelle..."
                        />
                      </div>

                      {/* Type-specific properties */}
                      {selectedNodeData.type === 'delay' && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                          <Label className="text-sm font-medium">Configuration du Délai</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Durée</Label>
                              <Input
                                type="number"
                                value={selectedNodeData.config?.duration || 1}
                                onChange={(e) => {
                                  const newConfig = { ...selectedNodeData.config, duration: parseInt(e.target.value) || 1 };
                                  updateNodeConfig(newConfig);
                                }}
                                disabled={readOnly}
                                min={1}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Unité</Label>
                              <Select
                                value={selectedNodeData.config?.delayUnit || 'hours'}
                                onValueChange={(value) => {
                                  const newConfig = { ...selectedNodeData.config, delayUnit: value };
                                  updateNodeConfig(newConfig);
                                }}
                                disabled={readOnly}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="seconds">Secondes</SelectItem>
                                  <SelectItem value="minutes">Minutes</SelectItem>
                                  <SelectItem value="hours">Heures</SelectItem>
                                  <SelectItem value="days">Jours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedNodeData.type === 'condition' && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                          <Label className="text-sm font-medium">Condition</Label>
                          <div className="space-y-2">
                            <Select defaultValue="eq" disabled={readOnly}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eq">Égal à (=)</SelectItem>
                                <SelectItem value="neq">Différent de (≠)</SelectItem>
                                <SelectItem value="gt">Supérieur à (&gt;)</SelectItem>
                                <SelectItem value="gte">Supérieur ou égal (≥)</SelectItem>
                                <SelectItem value="lt">Inférieur à (&lt;)</SelectItem>
                                <SelectItem value="lte">Inférieur ou égal (≤)</SelectItem>
                                <SelectItem value="contains">Contient</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Valeur 1" disabled={readOnly} className="h-8" />
                              <Input placeholder="Valeur 2" disabled={readOnly} className="h-8" />
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedNodeData.type === 'approval' && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                          <Label className="text-sm font-medium">Configuration d&apos;Approbation</Label>
                          <div className="space-y-2">
                            <Select defaultValue="single" disabled={readOnly}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Simple</SelectItem>
                                <SelectItem value="sequential">Séquentiel</SelectItem>
                                <SelectItem value="parallel">Parallèle</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="space-y-1">
                              <Label className="text-xs">Délai d&apos;expiration (heures)</Label>
                              <Input
                                type="number"
                                defaultValue={48}
                                disabled={readOnly}
                                className="h-8"
                                min={1}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {!readOnly && selectedNode !== 'trigger-start' && selectedNode !== 'end-node' && (
                        <>
                          <Separator />
                          <div className="pt-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={handleDeleteNode}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer ce Nœud
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center text-muted-foreground">
                    <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Sélectionnez un nœud pour voir ses propriétés</p>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sauvegarder le Workflow</DialogTitle>
              <DialogDescription>
                Confirmez la sauvegarde de votre workflow &quot;{workflowName}&quot;
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Statut après sauvegarde</Label>
                <Select value={workflowStatus} onValueChange={(v) => setWorkflowStatus(v as WorkflowStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="paused">En Pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Résumé du Workflow</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Nœuds: <strong>{nodes.length}</strong></div>
                  <div>Connexions: <strong>{edges.length}</strong></div>
                  <div>Actions: <strong>{nodes.filter(n => n.type === 'action').length}</strong></div>
                  <div>Conditions: <strong>{nodes.filter(n => n.type === 'condition').length}</strong></div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tester le Workflow</DialogTitle>
              <DialogDescription>
                Validez et testez l&apos;exécution de votre workflow
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {isExecuting ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Test en cours...</p>
                </div>
              ) : testResult ? (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={`font-medium ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {testResult.success ? 'Succès!' : 'Erreur'}
                    </p>
                  </div>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {testResult.message}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Cliquez sur &quot;Exécuter le Test&quot; pour valider votre workflow</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>Fermer</Button>
              {!testResult && (
                <Button onClick={handleTest} disabled={isExecuting}>
                  {isExecuting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Exécuter le Test
                </Button>
              )}
              {testResult && (
                <Button onClick={() => { setTestResult(null); }} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nouveau Test
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Helper function to update node config
function updateNodeConfig(
  newConfig: any,
  setSelectedNodeData: React.Dispatch<React.SetStateAction<FlowNodeData | null>>,
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  selectedNode: string
) {
  setSelectedNodeData(prev => prev ? { ...prev, config: newConfig } : null);
  setNodes(nds => nds.map(n => 
    n.id === selectedNode ? { ...n, data: { ...(n.data as FlowNodeData), config: newConfig } } : n
  ));
}

// Export wrapper with provider
export function WorkflowBuilderWithProvider(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder {...props} />
    </ReactFlowProvider>
  );
}
