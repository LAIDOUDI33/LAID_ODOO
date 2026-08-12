// ============================================================
// HASSIBA SUITE ERP - Visual Workflow Automation Builder
// Complete Type Definitions
// ============================================================

// ============================================================
// Core Workflow Types
// ============================================================

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';
export type WorkflowCategory = 'finance' | 'hr' | 'inventory' | 'sales' | 'purchases' | 'production' | 'fiscal' | 'custom';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  category: WorkflowCategory;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  version: number;
  executionHistory: ExecutionRecord[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastExecutedAt?: Date;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook' | 'form_submit';
  config: TriggerConfig;
  // Examples:
  // schedule: { cron: '0 9 * * 1' } // Every Monday 9am
  // event: { event: 'invoice.created', filters: { amount: { gt: 100000 } } }
  // webhook: { secret: 'xxx', method: 'POST' }
  // form_submit: { formId: 'xxx' }
}

export interface TriggerConfig {
  // Schedule config
  cron?: string;
  timezone?: string;
  
  // Event config
  event?: string;
  filters?: Record<string, FilterCondition>;
  
  // Webhook config
  secret?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  
  // Form config
  formId?: string;
  
  // Common
  debounceMs?: number;
  throttleMs?: number;
}

export interface FilterCondition {
  eq?: string | number | boolean;
  neq?: string | number | boolean;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: (string | number)[];
  notIn?: (string | number)[];
  isEmpty?: boolean;
  isNotEmpty?: boolean;
}

// ============================================================
// Step Types
// ============================================================

export type StepType = 'action' | 'condition' | 'delay' | 'loop' | 'approval' | 'parallel' | 'switch' | 'transform' | 'http_request' | 'sub_workflow';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  position: Position;
  config: StepConfig;
  nextStepId?: string;      // For linear flow
  trueStepId?: string;       // For conditions - true branch
  falseStepId?: string;      // For conditions - false branch
  errorStepId?: string;      // Error handling step
  retryConfig?: RetryConfig;
  timeoutMs?: number;
  enabled: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  retryOn: string[]; // Error codes to retry on
}

export interface StepConfig {
  // Action configs
  actionType?: ActionType;
  actionParams?: Record<string, any>;
  
  // Condition config
  conditionType?: 'simple' | 'advanced' | 'expression';
  conditions?: ConditionGroup[];
  expression?: string;
  
  // Delay config
  delayType?: 'fixed' | 'until_date' | 'business_hours';
  duration?: number;           // in milliseconds
  delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';
  untilDate?: string;          // ISO date string
  businessHoursOnly?: boolean;
  
  // Loop config
  loopType?: 'for_each' | 'while' | 'for';
  iterateOver?: string;        // Variable path to array
  loopVariable?: string;       // Current item variable name
  condition?: ConditionGroup;   // While condition
  iterations?: number;         // Fixed count
  
  // Approval config
  approvalType?: 'single' | 'sequential' | 'parallel' | 'conditional';
  approvers?: ApproverConfig[];
  timeoutHours?: number;
  reminderIntervalHours?: number;
  escalateTo?: string[];
  minApprovalsRequired?: number;
  
  // Parallel config
  branches?: ParallelBranch[];
  waitAll?: boolean;
  
  // Switch config
  cases?: SwitchCase[];
  defaultCaseStepId?: string;
  
  // Transform config
  transformations?: Transformation[];
  
  // HTTP Request config
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  authentication?: AuthConfig;
  
  // Sub-workflow config
  workflowId?: string;
  passVariables?: string[];
  returnVariables?: string[];
}

export type ActionType = 
  | 'send_email'
  | 'send_sms'
  | 'send_notification'
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'find_record'
  | 'call_api'
  | 'set_variable'
  | 'increment_variable'
  | 'append_to_list'
  | 'generate_pdf'
  | 'generate_excel'
  | 'webhook_call'
  | 'log_message'
  | 'custom_code';

export interface ApproverConfig {
  userId?: string;
  roleId?: string;
  fieldPath?: string;        // Dynamic from data
  required: boolean;
}

export interface ParallelBranch {
  id: string;
  name: string;
  firstStepId: string;
}

export interface SwitchCase {
  value: any;
  stepId: string;
}

export interface Transformation {
  type: 'map' | 'filter' | 'reduce' | 'sort' | 'join' | 'split' | 'format' | 'calculate';
  source: string;
  target: string;
  config: Record<string, any>;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  credentials?: Record<string, string>;
}

// ============================================================
// Condition Types
// ============================================================

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

export interface Condition {
  field: string;
  operator: ComparisonOperator;
  value: any;
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'variable' | 'expression';
}

export type ComparisonOperator = 
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in'
  | 'matches_regex'
  | 'between'
  | 'is_true' | 'is_false'
  | 'is_null' | 'is_not_null';

// ============================================================
// Variable Types
// ============================================================

export interface WorkflowVariable {
  id: string;
  name: string;
  key: string;              // Unique identifier for referencing
  type: VariableType;
  defaultValue?: any;
  description?: string;
  isInput: boolean;          // Can be set externally
  isOutput: boolean;         // Can be read externally
  options?: VariableOption[]; // For select/enum types
  validation?: ValidationRule[];
}

export type VariableType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array'
  | 'object'
  | 'file'
  | 'select'
  | 'json';

export interface VariableOption {
  label: string;
  value: any;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

// ============================================================
// Execution Types
// ============================================================

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggerData?: Record<string, any>;
  inputVariables?: Record<string, any>;
  outputVariables?: Record<string, any>;
  steps: StepExecutionResult[];
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: ExecutionError;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'waiting'        // Waiting for approval or external action
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'partially_failed';

export interface StepExecutionResult {
  stepId: string;
  stepName: string;
  status: StepExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: ExecutionError;
  retryCount?: number;
  logs?: ExecutionLog[];
}

export type StepExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'waiting';

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
  recoverable: boolean;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

// ============================================================
// Settings & Configuration
// ============================================================

export interface WorkflowSettings {
  autoSave: boolean;
  saveIntervalMs: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeoutMs: number;
  maxConcurrentExecutions: number;
  enableRetry: boolean;
  defaultRetryCount: number;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  notificationEmails?: string[];
  tags: string[];
}

// ============================================================
// Template Types
// ============================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameAr?: string;
  category: WorkflowCategory;
  description: string;
  descriptionAr?: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: string[];
  trigger: WorkflowTrigger;
  steps: Omit<WorkflowStep, 'id' | 'position'>[];
  variables: Omit<WorkflowVariable, 'id'>[];
  previewImage?: string;
  popular: boolean;
  featured: boolean;
}

// ============================================================
// Node Types for Visual Editor (React Flow)
// ============================================================

export type FlowNodeType = 
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'loop'
  | 'approval'
  | 'parallel'
  | 'switch'
  | 'start'
  | 'end';

export interface FlowNodeData {
  label: string;
  type: FlowNodeType;
  stepType?: StepType;
  icon?: string;
  description?: string;
  status?: 'default' | 'success' | 'warning' | 'error' | 'running';
  config?: StepConfig;
  isValid?: boolean;
  errors?: string[];
  [key: string]: any;
}

export interface FlowEdgeData {
  label?: string;
  type?: 'true' | 'false' | 'default' | 'branch' | 'sequential';
  animated?: boolean;
  style?: React.CSSProperties;
}

// ============================================================
// Available Triggers & Actions Catalog
// ============================================================

export interface TriggerDefinition {
  type: WorkflowTrigger['type'];
  name: string;
  nameAr?: string;
  description: string;
  icon: string;
  category: string;
  configFields: ConfigField[];
  examples: TriggerExample[];
}

export interface ActionDefinition {
  type: ActionType;
  name: string;
  nameAr?: string;
  description: string;
  icon: string;
  category: string;
  configFields: ConfigField[];
  outputVariables: OutputVariableDef[];
}

export interface ConfigField {
  key: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'toggle' | 'date' | 'time' | 'datetime' | 'json' | 'variable' | 'dynamic';
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: ValidationRule[];
  dependsOn?: string;     // Show only when another field has a value
  tooltip?: string;
}

export interface OutputVariableDef {
  key: string;
  name: string;
  type: VariableType;
  description: string;
}

export interface TriggerExample {
  name: string;
  config: Partial<TriggerConfig>;
}

// ============================================================
// Store Types (Zustand)
// ============================================================

export interface WorkflowBuilderState {
  // Current workflow
  workflow: Workflow | null;
  nodes: any[];            // React Flow nodes
  edges: any[];            // React Flow edges
  selectedNode: string | null;
  
  // UI State
  isDirty: boolean;
  isSaving: boolean;
  isExecuting: boolean;
  showMinimap: boolean;
  showGrid: boolean;
  zoomLevel: number;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  
  // Actions
  loadWorkflow: (workflow: Workflow) => void;
  createNewWorkflow: () => void;
  updateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  addNode: (type: FlowNodeType, position: Position) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (source: string, target: string, data?: FlowEdgeData) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  saveWorkflow: () => Promise<void>;
  executeWorkflow: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  toggleMinimap: () => void;
  toggleGrid: () => void;
  setZoom: (level: number) => void;
}

export interface HistoryEntry {
  nodes: any[];
  edges: any[];
  timestamp: number;
  description: string;
}

// ============================================================
// Node Palette Categories (for UI)
// ============================================================

export const nodePaletteCategories = [
  { id: 'trigger', label: 'Déclencheurs', icon: 'Zap', color: 'emerald' },
  { id: 'action', label: 'Actions', icon: 'Play', color: 'blue' },
  { id: 'logic', label: 'Logique', icon: 'GitBranch', color: 'amber' },
  { id: 'advanced', label: 'Avancé', icon: 'Settings', color: 'purple' },
];

// ============================================================
// Available Triggers Catalog
// ============================================================

export const availableTriggers = [
  {
    type: 'manual' as const,
    name: 'Déclencheur Manuel',
    nameAr: 'تشغيل يدوي',
    description: 'Déclenché manuellement par un utilisateur',
    icon: 'MousePointerClick',
    category: 'general',
    configFields: [],
    examples: [{ name: 'Bouton Exécuter', config: {} }],
  },
  {
    type: 'schedule' as const,
    name: 'Planification CRON',
    nameAr: 'جدولة زمنية',
    description: 'Déclenché selon un horaire prédéfini',
    icon: 'Calendar',
    category: 'schedule',
    configFields: [
      { key: 'cron', label: 'Expression CRON', type: 'text', required: true, placeholder: '0 9 * * 1' },
      { key: 'timezone', label: 'Fuseau Horaire', type: 'select', required: false, options: [{ label: 'Alger/Algiers', value: 'Africa/Algiers' }, { label: 'UTC', value: 'UTC' }] },
    ],
    examples: [
      { name: 'Tous les lundis à 9h', config: { cron: '0 9 * * 1', timezone: 'Africa/Algiers' } },
      { name: 'Tous les jours à 8h', config: { cron: '0 8 * * *', timezone: 'Africa/Algiers' } },
      { name: '1er du mois à minuit', config: { cron: '0 0 1 * *', timezone: 'Africa/Algiers' } },
    ],
  },
  {
    type: 'event' as const,
    name: 'Événement Système',
    nameAr: 'حدث النظام',
    description: 'Déclenché par un événement de l\'ERP',
    icon: 'Zap',
    category: 'system',
    configFields: [
      { key: 'event', label: 'Type d\'Événement', type: 'select', required: true, options: [
        { label: 'Facture Créée', value: 'invoice.created' },
        { label: 'Facture Approuvée', value: 'invoice.approved' },
        { label: 'Commande Client', value: 'sales_order.created' },
        { label: 'Stock Faible', value: 'inventory.low_stock' },
        { label: 'Nouvel Employé', value: 'employee.created' },
        { label: 'Document Uploadé', value: 'document.uploaded' },
      ]},
    ],
    examples: [
      { name: 'Nouvelle facture', config: { event: 'invoice.created' } },
      { name: 'Stock en alerte', config: { event: 'inventory.low_stock' } },
    ],
  },
  {
    type: 'webhook' as const,
    name: 'Webhook HTTP',
    description: 'Déclenché par un appel API externe',
    icon: 'Webhook',
    category: 'integration',
    configFields: [
      { key: 'secret', label: 'Clé Secrète', type: 'text', required: true, placeholder: 'whsec_xxx' },
      { key: 'method', label: 'Méthode HTTP', type: 'select', required: false, options: [{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }] },
    ],
    examples: [{ name: 'Webhook Banque', config: { secret: 'my-secret-key' } }],
  },
];

// ============================================================
// Available Actions Catalog
// ============================================================

export const availableActions = [
  {
    type: 'send_email' as const,
    name: 'Envoyer Email',
    nameAr: 'إرسال بريد إلكتروني',
    description: 'Envoyer un email aux destinataires spécifiés',
    icon: 'Mail',
    category: 'communication',
    configFields: [
      { key: 'to', label: 'Destinataire(s)', type: 'variable', required: true, placeholder: 'email@exemple.dz' },
      { key: 'subject', label: 'Sujet', type: 'text', required: true, placeholder: 'Sujet de l\'email' },
      { key: 'body', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Corps du message...' },
      { key: 'attachments', label: 'Pièces Jointes', type: 'dynamic', required: false },
    ],
    outputVariables: [{ key: 'emailId', name: 'ID Email', type: 'string', description: 'Identifiant unique de l\'email envoyé' }],
  },
  {
    type: 'send_notification' as const,
    name: 'Envoyer Notification',
    nameAr: 'إرسال إشعار',
    description: 'Envoyer une notification interne aux utilisateurs',
    icon: 'Bell',
    category: 'communication',
    configFields: [
      { key: 'users', label: 'Utilisateurs', type: 'dynamic', required: true },
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'message', label: 'Message', type: 'textarea', required: true },
      { key: 'priority', label: 'Priorité', type: 'select', required: false, options: [{ label: 'Basse', value: 'low' }, { label: 'Normale', value: 'normal' }, { label: 'Haute', value: 'high' }, { label: 'Urgente', value: 'urgent' }] },
    ],
    outputVariables: [{ key: 'notificationId', name: 'ID Notification', type: 'string' }],
  },
  {
    type: 'create_record' as const,
    name: 'Créer Enregistrement',
    nameAr: 'إنشاء سجل',
    description: 'Créer un nouvel enregistrement dans le système',
    icon: 'Plus',
    category: 'data',
    configFields: [
      { key: 'entity', label: 'Entité', type: 'select', required: true, options: [
        { label: 'Facture', value: 'Invoice' },
        { label: 'Commande Client', value: 'SalesOrder' },
        { label: 'Commande Fournisseur', value: 'PurchaseOrder' },
        { label: 'Produit', value: 'Product' },
        { label: 'Employé', value: 'Employee' },
      ]},
      { key: 'data', label: 'Données', type: 'json', required: true, placeholder: '{ "field": "value" }' },
    ],
    outputVariables: [{ key: 'recordId', name: 'ID Enregistrement', type: 'string' }],
  },
  {
    type: 'update_record' as const,
    name: 'Modifier Enregistrement',
    nameAr: 'تعديل سجل',
    description: 'Modifier un enregistrement existant',
    icon: 'Edit',
    category: 'data',
    configFields: [
      { key: 'entity', label: 'Entité', type: 'select', required: true },
      { key: 'recordId', label: 'ID Enregistrement', type: 'variable', required: true },
      { key: 'data', label: 'Données à modifier', type: 'json', required: true },
    ],
    outputVariables: [],
  },
  {
    type: 'call_api' as const,
    name: 'Appeler API Externe',
    nameAr: 'استدعاء API خارجي',
    description: 'Effectuer un appel HTTP vers une API externe',
    icon: 'Globe',
    category: 'integration',
    configFields: [
      { key: 'method', label: 'Méthode', type: 'select', required: true, options: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' }] },
      { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://api.exemple.com/endpoint' },
      { key: 'headers', label: 'En-têtes', type: 'json', required: false },
      { key: 'body', label: 'Corps', type: 'json', required: false },
    ],
    outputVariables: [
      { key: 'statusCode', name: 'Code Statut', type: 'number' },
      { key: 'response', name: 'Réponse', type: 'json' },
    ],
  },
  {
    type: 'generate_pdf' as const,
    name: 'Générer PDF',
    nameAr: 'إنشاء PDF',
    description: 'Générer un document PDF',
    icon: 'FileText',
    category: 'document',
    configFields: [
      { key: 'template', label: 'Modèle', type: 'select', required: true, options: [
        { label: 'Facture Standard', value: 'invoice_standard' },
        { label: 'Facture Proforma', value: 'invoice_proforma' },
        { label: 'Bon de Commande', value: 'purchase_order' },
        { label: 'Bulletin de Paie', value: 'payslip' },
      ]},
      { key: 'data', label: 'Données', type: 'json', required: true },
    ],
    outputVariables: [{ key: 'pdfUrl', name: 'URL PDF', type: 'string' }],
  },
];

// ============================================================
// Template Helper Functions
// ============================================================

export function getPopularTemplates(templates: WorkflowTemplate[]): WorkflowTemplate[] {
  return templates.filter(t => t.popular || t.featured);
}

export function searchTemplates(templates: WorkflowTemplate[], query: string): WorkflowTemplate[] {
  const q = query.toLowerCase();
  return templates.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q)
  );
}
