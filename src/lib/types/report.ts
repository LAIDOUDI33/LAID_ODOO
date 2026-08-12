// ============================================================
// HASSIBA SUITE ERP - Report Builder Types
// Complete TypeScript interfaces for Advanced Report Builder
// ============================================================

// ============================================================
// Core Report Configuration
// ============================================================

export interface ReportConfig {
  id?: string
  name: string
  description?: string
  dataSource: DataSourceType
  dimensions: ReportDimension[]
  metrics: ReportMetric[]
  filters: ReportFilter[]
  sortBy?: SortConfig[]
  dateRange?: DateRangeConfig
  chartType: ChartType
  style: ReportStyle
  pivotConfig?: PivotConfig
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  isTemplate?: boolean
  isFavorite?: boolean
}

// ============================================================
// Data Source Types (ERP Entities)
// ============================================================

export type DataSourceType = 
  | 'employees'
  | 'invoices'
  | 'products'
  | 'purchases'
  | 'sales_orders'
  | 'partners'
  | 'inventory'
  | 'attendance'
  | 'payroll'
  | 'accounting'
  | 'production'
  | 'maintenance'
  | 'documents'

export interface DataSourceDefinition {
  id: DataSourceType
  name: string
  nameAr?: string
  icon: string
  category: DataSourceCategory
  description: string
  fields: FieldDefinition[]
  defaultMetrics?: string[]
  defaultDimensions?: string[]
}

export type DataSourceCategory = 
  | 'hr'
  | 'finance'
  | 'commercial'
  | 'inventory'
  | 'production'
  | 'accounting'
  | 'documents'

// ============================================================
// Field Definitions for Data Sources
// ============================================================

export type FieldType = 
  | 'string'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'enum'
  | 'currency'
  | 'percentage'
  | 'id'
  | 'json'

export interface FieldDefinition {
  id: string
  name: string
  nameAr?: string
  type: FieldType
  description?: string
  format?: string
  aggregatable: boolean
  filterable: boolean
  sortable: boolean
  groupable: boolean
  enumValues?: { label: string; value: string; color?: string }[]
  defaultValue?: unknown
  reference?: {
    table: string
    field: string
  }
}

// ============================================================
// Dimensions (Grouping/Row Fields)
// ============================================================

export interface ReportDimension {
  id: string
  fieldId: string
  fieldName: string
  dataSource: DataSourceType
  sortOrder: number
  sortDirection?: 'asc' | 'desc'
  format?: DimensionFormat
  customLabel?: string
  drillDownEnabled?: boolean
  hierarchyLevel?: number
}

export type DimensionFormat = 
  | 'default'
  | 'date_year'
  | 'date_quarter'
  | 'date_month'
  | 'date_week'
  | 'date_day'
  | 'uppercase'
  | 'lowercase'
  | 'truncate_20'
  | 'truncate_50'

// ============================================================
// Metrics (Aggregations/Value Fields)
// ============================================================

export type AggregationFunction = 
  | 'sum'
  | 'avg'
  | 'count'
  | 'count_distinct'
  | 'min'
  | 'max'
  | 'median'
  | 'stddev'
  | 'first'
  | 'last'

export interface ReportMetric {
  id: string
  fieldId: string
  fieldName: string
  dataSource: DataSourceType
  aggregation: AggregationFunction
  sortOrder: number
  format?: MetricFormat
  customLabel?: string
  formula?: string // For calculated fields
  showPercentage?: boolean
  showRunningTotal?: boolean
  targetValue?: number
  comparisonPeriod?: 'previous_period' | 'same_period_last_year' | 'custom'
}

export type MetricFormat = 
  | 'number'
  | 'currency_dzd'
  | 'currency_eur'
  | 'currency_usd'
  | 'percentage'
  | 'decimal_1'
  | 'decimal_2'
  | 'decimal_3'
  | 'integer'
  | 'duration'
  | 'short_number' // 1.2K, 1.5M

// ============================================================
// Filters
// ============================================================

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'between'
  | 'not_between'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in'
  | 'is_true'
  | 'is_false'

export type FilterLogic = 'AND' | 'OR'

export interface ReportFilter {
  id: string
  fieldId: string
  fieldName: string
  dataSource: DataSourceType
  operator: FilterOperator
  value: unknown
  valueTo?: unknown // For between operators
  logic?: FilterLogic
  enabled: boolean
  groupId?: number // For grouping filters with AND/OR
}

// ============================================================
// Sorting
// ============================================================

export interface SortConfig {
  fieldId: string
  direction: 'asc' | 'desc'
  priority: number
}

// ============================================================
// Date Range Configuration
// ============================================================

export type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'year_to_date'
  | 'custom'

export interface DateRangeConfig {
  preset?: DatePreset
  from?: string
  to?: string
  fieldId?: string // Which date field to filter on
  compareWithPrevious?: boolean
  comparePreset?: DatePreset
  compareFrom?: string
  compareTo?: string
}

// ============================================================
// Chart Types
// ============================================================

export type ChartType = 
  | 'table'
  | 'bar'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'scatter'
  | 'kpi'
  | 'pivot'
  | 'heatmap'
  | 'funnel'
  | 'gauge'
  | 'treemap'
  | 'combo'

// ============================================================
// Style Configuration
// ============================================================

export interface ReportStyle {
  theme: 'light' | 'dark' | 'auto'
  colorScheme: ColorScheme
  fontSize: 'small' | 'medium' | 'large'
  showLegend: boolean
  legendPosition: 'top' | 'bottom' | 'left' | 'right'
  showGridLines: boolean
  showDataLabels: boolean
  stacked: boolean
  percentageMode: boolean
  conditionalFormatting: ConditionalFormattingRule[]
  pagination?: PaginationConfig
  exportSettings?: ExportSettings
}

export type ColorScheme = 
  | 'default'
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'teal'
  | 'monochrome'
  | 'corporate'
  | 'warm'
  | 'cool'
  | 'algeria' // Green/White/Red

export interface ConditionalFormattingRule {
  id: string
  fieldId: string
  type: 'highlight' | 'data_bar' | 'icon_set' | 'color_scale'
  condition: FormattingCondition
  style: FormattingStyle
  enabled: boolean
}

export interface FormattingCondition {
  operator: 'greater_than' | 'less_than' | 'equals' | 'between' | 'contains' | 'top_n' | 'bottom_n'
  value?: number
  valueTo?: number
  percentage?: boolean
}

export interface FormattingStyle {
  backgroundColor?: string
  textColor?: string
  fontWeight?: 'normal' | 'bold'
  icon?: string
  minValueColor?: string
  midValueColor?: string
  maxValueColor?: string
}

export interface PaginationConfig {
  pageSize: number
  enabled: boolean
  showPageNumbers: boolean
}

export interface ExportSettings {
  includeHeader: boolean
  includeFooter: boolean
  includePageNumbers: boolean
  paperSize: 'a4' | 'a3' | 'letter' | 'legal'
  orientation: 'portrait' | 'landscape'
  filename?: string
}

// ============================================================
// Pivot Table Configuration
// ============================================================

export interface PivotConfig {
  rows: string[] // Field IDs for rows
  columns: string[] // Field IDs for columns
  values: string[] // Metric IDs
  rowSubtotals: boolean
  columnSubtotals: boolean
  grandTotal: boolean
  showEmptyRows: boolean
  showEmptyColumns: boolean
}

// ============================================================
// Report Execution Results
// ============================================================

export interface ReportExecutionResult {
  reportId: string
  executedAt: Date
  executionTimeMs: number
  data: ReportDataRow[]
  metadata: ReportMetadata
  summary?: ReportSummary
  warnings?: string[]
}

export interface ReportDataRow {
  [key: string]: unknown
  _dimensions?: Record<string, unknown>
  _metrics?: Record<string, number>
}

export interface ReportMetadata {
  totalRecords: number
  filteredRecords: number
  columns: ColumnMetadata[]
  dateGenerated: Date
  dataSource: DataSourceType
  queryInfo?: QueryInfo
}

export interface ColumnMetadata {
  id: string
  name: string
  type: FieldType
  format?: string
  isDimension: boolean
  isMetric: boolean
  visible: boolean
  width?: number
}

export interface QueryInfo {
  sql?: string
  parameters?: unknown[]
  executionPlan?: string
}

export interface ReportSummary {
  totalSum?: Record<string, number>
  averages?: Record<string, number>
  counts?: Record<string, number>
  minValues?: Record<string, number>
  maxValues?: Record<string, number>
}

// ============================================================
// Template Types
// ============================================================

export interface ReportTemplate {
  id: string
  name: string
  nameAr?: string
  category: TemplateCategory
  description: string
  descriptionAr?: string
  icon: string
  config: Omit<ReportConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string
  previewImage?: string
  isPopular?: boolean
  isNew?: boolean
}

export type TemplateCategory = 
  | 'comptabilite'   // Comptabilité
  | 'commercial'     // Commercial/Ventes
  | 'rh'             // Ressources Humaines
  | 'finance'        // Finance/Trésorerie
  | 'stock'          // Gestion des Stocks
  | 'production'     // Production
  | 'achats'         // Achats
  | 'direction'      // Direction/Général

// ============================================================
// Saved Reports (Database Model)
// ============================================================

export interface SavedReport {
  id: string
  name: string
  description?: string
  config: ReportConfig
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastExecutedAt?: Date
  executionCount: number
  isPublic: boolean
  folderId?: string
  tags: string[]
}

// ============================================================
// Export Options
// ============================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'png' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeHeaders: boolean
  includeFilters: boolean
  includeSummary: boolean
  filename?: string
  paperSize?: 'a4' | 'a3' | 'letter'
  orientation?: 'portrait' | 'landscape'
  password?: string
}

// ============================================================
// Scheduled Reports (Future)
// ============================================================

export interface ScheduledReport {
  id: string
  reportId: string
  name: string
  schedule: ScheduleConfig
  recipients: string[]
  subject: string
  message?: string
  format: ExportFormat
  active: boolean
  lastRunAt?: Date
  nextRunAt?: Date
  createdBy: string
  createdAt: Date
}

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  time: string // HH:mm format
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  timezone?: string
}

// ============================================================
// Drag and Drop Types
// ============================================================

export type DropZoneType = 
  | 'rows'
  | 'columns'
  | 'values'
  | 'filters'

export interface DraggableItem {
  id: string
  type: 'field' | 'dimension' | 'metric' | 'filter'
  fieldId: string
  fieldName: string
  dataSource: DataSourceType
  fieldType: FieldType
  zone?: DropZoneType
  index?: number
}

export interface DropZone {
  type: DropZoneType
  items: DraggableItem[]
  maxItems?: number
  acceptsTypes: FieldType[]
}

// ============================================================
// Undo/Redo History
// ============================================================

export interface HistoryState {
  config: ReportConfig
  timestamp: Date
  description: string
}

export interface UndoRedoState {
  past: HistoryState[]
  present: HistoryState
  future: HistoryState[]
}

// ============================================================
// KPI Card Configuration
// ============================================================

export interface KPICardConfig {
  id: string
  title: string
  metricField: string
  aggregation: AggregationFunction
  format: MetricFormat
  comparisonField?: string
  comparisonType?: 'difference' | 'percentage' | 'trend'
  sparkline?: boolean
  goalValue?: number
  icon?: string
  color?: string
}

// ============================================================
// Chart Colors - Algeria Theme
// ============================================================

export const ALGERIA_COLORS = {
  primary: '#006233',    // Green
  secondary: '#FFFFFF',  // White
  accent: '#D21034',     // Red
  palette: [
    '#006233', '#00874D', '#00AC67', '#33D17F',
    '#66E097', '#99EAAF', '#CCF4C7', '#E8FAE3',
    '#D21034', '#DB3A52', '#E46470', '#ED8E8E',
    '#F6B8AC', '#FFE2DA', '#FFC9BF', '#FFB0A4'
  ]
}

export const CHART_COLOR_PALETTES: Record<ColorScheme, string[]> = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
  blue: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#2563EB'],
  green: ['#065F46', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#047857'],
  orange: ['#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#DC2626'],
  purple: ['#581C87', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#6D28D9'],
  red: ['#991B1B', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#B91C1C'],
  teal: ['#115E59', '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#0F766E'],
  monochrome: ['#18181B', '#3F3F46', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#E4E4E7', '#F4F4F5'],
  corporate: ['#1E3A5F', '#2E5A88', '#3E7AB1', '#4E9ADA', '#7EB8E8', '#AED6F5', '#DEF4FF', '#0D2137'],
  warm: ['#92400E', '#B45309', '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#78350F'],
  cool: ['#164E63', '#155E75', '#0E7490', '#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#083344'],
  algeria: ALGERIA_COLORS.palette
}
