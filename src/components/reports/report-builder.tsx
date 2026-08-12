// ============================================================
// HASSIBA SUITE ERP - Advanced Report Builder Component
// Drag-and-Drop Report Design Interface
// ============================================================

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  GripVertical,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  Save,
  Download,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  LayoutGrid,
  Settings,
  Filter,
  Calendar,
  Palette,
  Undo2,
  Redo2,
  Eye,
  Loader2,
  Database,
  Layers,
  ArrowRightLeft,
  Hash,
  AlignLeft,
  Type,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Trash2,
  Copy,
  Maximize2,
  Minimize2,
  MousePointerClick2,
  Calculator,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Grid3X3,
  Sparkles,
  FolderOpen,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ReportConfig,
  DataSourceType,
  FieldDefinition,
  ReportDimension,
  ReportMetric,
  ReportFilter,
  ChartType,
  ColorScheme,
  AggregationFunction,
  FilterOperator,
  DraggableItem,
  DropZoneType,
  HistoryState,
  DATA_SOURCES,
  CHART_COLOR_PALETTES,
  getDefaultReportConfig
} from '@/lib/types/report'
import { getDataSource, getAllDataSources, TEMPLATE_CATEGORIES } from '@/lib/report-templates'

// ============================================================
// Types for Component State
// ============================================================

interface ReportBuilderProps {
  initialConfig?: ReportConfig
  onSave?: (config: ReportConfig) => void
  onPreview?: (config: ReportConfig) => void
  isEmbedded?: boolean
}

// ============================================================
// Sortable Field Item (for drag source)
// ============================================================

interface SortableFieldProps {
  field: FieldDefinition
  dataSourceId: DataSourceType
  onAddToZone: (field: FieldDefinition, dataSourceId: DataSourceType, zone: DropZoneType) => void
}

function SortableFieldItem({ field, dataSourceId, onAddToZone }: SortableFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const handleDoubleClick = () => {
    // Auto-add to appropriate zone based on field type
    if (field.aggregatable && field.type !== 'string' && field.type !== 'boolean' && field.type !== 'date') {
      onAddToZone(field, dataSourceId, 'values')
    } else {
      onAddToZone(field, dataSourceId, 'rows')
    }
  }
  
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing",
        "hover:bg-accent/50 border border-transparent hover:border-border transition-colors",
        "text-sm"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'field',
          fieldId: field.id,
          fieldName: field.name,
          dataSource: dataSourceId,
          fieldType: field.type
        }))
      }}
      onDoubleClick={handleDoubleClick}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      
      {/* Field type icon */}
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {getFieldTypeIcon(field.type)}
      </span>
      
      <span className="flex-1 truncate text-xs font-medium">{field.name}</span>
      
      {/* Quick add buttons */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!field.aggregatable || field.type === 'string' || field.type === 'boolean' || field.type === 'date' ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-0.5 rounded hover:bg-primary/10 text-primary"
                  onClick={(e) => { e.stopPropagation(); onAddToZone(field, dataSourceId, 'rows'); }}
                >
                  <AlignLeft className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Ajouter aux lignes</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 rounded hover:bg-primary/10 text-primary"
                    onClick={(e) => { e.stopPropagation(); onAddToZone(field, dataSourceId, 'values'); }}
                  >
                    <Hash className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Ajouter aux valeurs</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 rounded hover:bg-primary/10 text-primary"
                    onClick={(e) => { e.stopPropagation(); onAddToZone(field, dataSourceId, 'rows'); }}
                  >
                    <AlignLeft className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Ajouter aux lignes</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); onAddToZone(field, dataSourceId, 'filters'); }}
              >
                <Filter className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Ajouter comme filtre</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

// ============================================================
// Field Type Icon Helper
// ============================================================

function FieldTypeIcon({ type }: { type: string }) {
  return <span className="text-[10px]">{getFieldTypeIcon(type)}</span>
}

function getFieldTypeIcon(type: string) {
  switch (type) {
    case 'string':
    case 'id':
      return <Type className="h-3 w-3 text-blue-500" />
    case 'number':
      return <Hash className="h-3 w-3 text-green-500" />
    case 'currency':
      return <Calculator className="h-3 w-3 text-emerald-500" />
    case 'percentage':
      return <span className="text-emerald-500 font-bold text-[10px]">%</span>
    case 'date':
    case 'datetime':
      return <Calendar className="h-3 w-3 text-orange-500" />
    case 'boolean':
      return <CheckCircle className="h-3 w-3 text-purple-500" />
    case 'enum':
      return <Grid3X3 className="h-3 w-3 text-cyan-500" />
    default:
      return <Type className="h-3 w-3 text-gray-500" />
  }
}

// ============================================================
// Drop Zone Item (dropped item in canvas)
// ============================================================

interface DropZoneItemProps {
  item: DraggableItem
  zoneType: DropZoneType
  onRemove: (itemId: string) => void
  onChangeAggregation?: (itemId: string, aggregation: AggregationFunction) => void
  onChangeOperator?: (itemId: string, operator: FilterOperator) => void
  onChangeValue?: (itemId: string, value: unknown) => void
  index?: number
}

function DropZoneItem({
  item,
  zoneType,
  onRemove,
  onChangeAggregation,
  onChangeOperator,
  onChangeValue,
  index = 0
}: DropZoneItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${zoneType}-${item.id}`,
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1 bg-background border rounded-md text-xs",
        "hover:border-primary/50 transition-colors shadow-sm",
        isDragging && "shadow-md"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      
      <FieldTypeIcon type={item.fieldType} />
      
      <span className="font-medium truncate max-w-[100px]">{item.fieldName}</span>
      
      {/* Zone-specific controls */}
      {zoneType === 'values' && onChangeAggregation && (
        <Select
          defaultValue={item.fieldType === 'string' ? 'count' : 'sum'}
          onValueChange={(v) => onChangeAggregation(item.id, v as AggregationFunction)}
        >
          <SelectTrigger className="w-[70px] h-6 text-[10px] p-0 border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sum">Somme</SelectItem>
            <SelectItem value="avg">Moyenne</SelectItem>
            <SelectItem value="count">Nombre</SelectItem>
            <SelectItem value="count_distinct">Distinct</SelectItem>
            <SelectItem value="min">Min</SelectItem>
            <SelectItem value="max">Max</SelectItem>
          </SelectContent>
        </Select>
      )}
      
      {zoneType === 'filters' && (
        <>
          {onChangeOperator && (
            <Select
              defaultValue="equals"
              onValueChange={(v) => onChangeOperator(item.id, v as FilterOperator)}
            >
              <SelectTrigger className="w-[80px] h-6 text-[10px] p-0 border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">=</SelectItem>
                <SelectItem value="not_equals">≠</SelectItem>
                <SelectItem value="contains">Contient</SelectItem>
                <SelectItem value="greater_than">&gt;</SelectItem>
                <SelectItem value="less_than">&lt;</SelectItem>
                <SelectItem value="in">Dans</SelectItem>
              </SelectContent>
            </Select>
          )}
          {onChangeValue && (
            <Input
              placeholder="Valeur..."
              className="w-[80px] h-6 text-[10px]"
              onChange={(e) => onChangeValue(item.id, e.target.value)}
            />
          )}
        </>
      )}
      
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ============================================================
// Canvas Drop Zone
// ============================================================

interface CanvasDropZoneProps {
  title: string
  description: string
  zoneType: DropZoneType
  items: DraggableItem[]
  icon: React.ReactNode
  onRemove: (itemId: string) => void
  onDrop: (e: React.DragEvent) => void
  onChangeAggregation?: (itemId: string, aggregation: AggregationFunction) => void
  onChangeOperator?: (itemId: string, operator: FilterOperator) => void
  onChangeValue?: (itemId: string, value: unknown) => void
  accentColor?: string
}

function CanvasDropZone({
  title,
  description,
  zoneType,
  items,
  icon,
  onRemove,
  onDrop,
  onChangeAggregation,
  onChangeOperator,
  onChangeValue,
  accentColor = 'border-primary/30'
}: CanvasDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-3 min-h-[60px] transition-all",
        isDragOver ? `bg-primary/5 ${accentColor}` : "bg-muted/30 border-transparent",
        items.length > 0 && "border-solid border-border"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        onDrop(e)
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("text-muted-foreground", isDragOver && "text-primary")}>
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {items.length}
          </Badge>
        )}
      </div>
      
      {description && items.length === 0 && (
        <p className="text-[10px] text-muted-foreground mb-2 pl-6">{description}</p>
      )}
      
      {items.length > 0 ? (
        <div className="space-y-1 pl-1">
          <SortableContext items={items.map(i => `${zoneType}-${i.id}`)} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <DropZoneItem
                key={`${zoneType}-${item.id}`}
                item={item}
                zoneType={zoneType}
                index={index}
                onRemove={onRemove}
                onChangeAggregation={onChangeAggregation}
                onChangeOperator={onChangeOperator}
                onChangeValue={onChangeValue}
              />
            ))}
          </SortableContext>
        </div>
      ) : isDragOver ? (
        <div className="flex items-center justify-center py-2 pl-6">
          <span className="text-xs text-primary font-medium">Déposer ici</span>
        </div>
      ) : null}
    </div>
  )
}

// ============================================================
// Main Report Builder Component
// ============================================================

export default function ReportBuilder({ 
  initialConfig, 
  onSave, 
  onPreview,
  isEmbedded = false 
}: ReportBuilderProps) {
  // ============================================================
  // Core State
  // ============================================================
  
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || getDefaultReportConfig('invoices')
  )
  
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceType>(
    initialConfig?.dataSource || 'invoices'
  )
  
  const [searchFieldQuery, setSearchFieldQuery] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportName, setReportName] = useState(config.name)
  const [reportDescription, setReportDescription] = useState(config.description || '')
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'templates'>('builder')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // ============================================================
  // Canvas Items State (Drag & Drop Zones)
  // ============================================================
  
  const [rowItems, setRowItems] = useState<DraggableItem[]>(() =>
    config.dimensions.map((d, i) => ({
      id: d.id,
      type: 'dimension' as const,
      fieldId: d.fieldId,
      fieldName: d.fieldName,
      dataSource: d.dataSource,
      fieldType: 'string',
      zone: 'rows' as DropZoneType,
      index: i
    }))
  )
  
  const [valueItems, setValueItems] = useState<DraggableItem[]>(() =>
    config.metrics.map((m, i) => ({
      id: m.id,
      type: 'metric' as const,
      fieldId: m.fieldId,
      fieldName: m.fieldName,
      dataSource: m.dataSource,
      fieldType: 'number',
      zone: 'values' as DropZoneType,
      index: i
    }))
  )
  
  const [filterItems, setFilterItems] = useState<DraggableItem[]>(() =>
    config.filters.map((f, i) => ({
      id: f.id,
      type: 'filter' as const,
      fieldId: f.fieldId,
      fieldName: f.fieldName,
      dataSource: f.dataSource,
      fieldType: 'string',
      zone: 'filters' as DropZoneType,
      index: i
    }))
  )

  // ============================================================
  // History State (Undo/Redo)
  // ============================================================
  
  const [history, setHistory] = useState<HistoryState[]>([
    { config: { ...config }, timestamp: new Date(), description: 'État initial' }
  ])
  const [historyIndex, setHistoryIndex] = useState(0)

  // ============================================================
  // DnD Sensors
  // ============================================================
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ============================================================
  // Computed Values
  // ============================================================
  
  const currentDataSource = useMemo(() => 
    getDataSource(selectedDataSource), 
    [selectedDataSource]
  )
  
  const filteredFields = useMemo(() => {
    if (!searchFieldQuery) return currentDataSource.fields
    
    const query = searchFieldQuery.toLowerCase()
    return currentDataSource.fields.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.id.toLowerCase().includes(query)
    )
  }, [currentDataSource, searchFieldQuery])

  // ============================================================
  // Handlers
  // ============================================================
  
  const pushHistory = useCallback((newConfig: ReportConfig, description: string) => {
    const newHistoryState: HistoryState = {
      config: { ...newConfig },
      timestamp: new Date(),
      description
    }
    
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newHistoryState])
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setConfig(history[newIndex].config)
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setConfig(history[newIndex].config)
    }
  }, [historyIndex, history])

  const addToZone = useCallback((
    field: FieldDefinition, 
    dataSourceId: DataSourceType, 
    zone: DropZoneType
  ) => {
    const newItem: DraggableItem = {
      id: `${zone}-${Date.now()}`,
      type: zone === 'values' ? 'metric' : zone === 'filters' ? 'filter' : 'dimension',
      fieldId: field.id,
      fieldName: field.name,
      dataSource: dataSourceId,
      fieldType: field.type,
      zone,
      index: 0
    }

    switch (zone) {
      case 'rows':
        setRowItems(prev => [...prev, newItem])
        break
      case 'values':
        setValueItems(prev => [...prev, newItem])
        break
      case 'filters':
        setFilterItems(prev => [...prev, newItem])
        break
    }
  }, [])

  const removeFromZone = useCallback((zone: DropZoneType, itemId: string) => {
    switch (zone) {
      case 'rows':
        setRowItems(prev => prev.filter(item => item.id !== itemId))
        break
      case 'values':
        setValueItems(prev => prev.filter(item => item.id !== itemId))
        break
      case 'filters':
        setFilterItems(prev => prev.filter(item => item.id !== itemId))
        break
    }
  }, [])

  const handleCanvasDrop = useCallback((zone: DropZoneType, e: React.DragEvent) => {
    e.preventDefault()
    
    try {
      const data = e.dataTransfer.getData('application/json')
      if (!data) return
      
      const draggedData = JSON.parse(data)
      const field = currentDataSource.fields.find(f => f.id === draggedData.fieldId)
      
      if (field) {
        addToZone(field, selectedDataSource, zone)
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }, [currentDataSource, selectedDataSource, addToZone])

  const executeReport = useCallback(async () => {
    setIsExecuting(true)
    
    // Build config from current state
    const executionConfig: ReportConfig = {
      ...config,
      dataSource: selectedDataSource,
      dimensions: rowItems.map((item, i) => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        sortOrder: i
      })),
      metrics: valueItems.map((item, i) => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        aggregation: 'sum' as AggregationFunction,
        sortOrder: i
      })),
      filters: filterItems.map(item => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        operator: 'equals' as FilterOperator,
        value: '',
        enabled: true
      }))
    }

    try {
      const response = await fetch('/api/reports/builder/template/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: executionConfig })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setPreviewData(result.data)
        setShowPreview(true)
        setActiveTab('preview')
        onPreview?.(executionConfig)
      }
    } catch (error) {
      console.error('Execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }, [config, selectedDataSource, rowItems, valueItems, filterItems, onPreview])

  const saveReport = async () => {
    const saveConfig: ReportConfig = {
      ...config,
      name: reportName,
      description: reportDescription,
      dataSource: selectedDataSource,
      dimensions: rowItems.map((item, i) => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        sortOrder: i
      })),
      metrics: valueItems.map((item, i) => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        aggregation: 'sum' as AggregationFunction,
        sortOrder: i
      })),
      filters: filterItems.map(item => ({
        id: item.id,
        fieldId: item.fieldId,
        fieldName: item.fieldName,
        dataSource: item.dataSource,
        operator: 'equals' as FilterOperator,
        value: '',
        enabled: true
      }))
    }

    try {
      const response = await fetch('/api/reports/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          description: reportDescription,
          config: saveConfig
        })
      })

      const result = await response.json()

      if (result.success) {
        onSave?.(saveConfig)
        setShowSaveDialog(false)
        // Could show success toast here
      }
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        setShowSaveDialog(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        executeReport()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeReport, undo, redo])

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className={cn(
      "flex flex-col h-full bg-background",
      isFullscreen && "fixed inset-0 z-50 bg-background"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Report Builder</h2>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Select
            value={selectedDataSource}
            onValueChange={(v) => setSelectedDataSource(v as DataSourceType)}
          >
            <SelectTrigger className="w-[180px]">
              <Database className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAllDataSources().map(ds => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>

          <Button
            size="sm"
            onClick={executeReport}
            disabled={isExecuting || (rowItems.length === 0 && valueItems.length === 0)}
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Exécuter
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Data Sources & Fields */}
        <div className="w-[260px] border-r flex flex-col bg-card/50">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des champs..."
                className="pl-9 h-9 text-sm"
                value={searchFieldQuery}
                onChange={(e) => setSearchFieldQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Data Source Info */}
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-primary/10">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{currentDataSource.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {currentDataSource.description}
                  </p>
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    {filteredFields.length} champs
                  </Badge>
                </div>
              </div>

              {/* Fields List */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Champs disponibles
                </p>
                
                {filteredFields.map(field => (
                  <SortableFieldItem
                    key={field.id}
                    field={field}
                    dataSourceId={selectedDataSource}
                    onAddToZone={addToZone}
                  />
                ))}
                
                {filteredFields.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucun champ trouvé
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center Canvas - Report Design */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <div className="px-4 pt-3">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="builder" className="text-xs">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Constructeur
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs">
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                  Modèles
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="builder" className="flex-1 overflow-auto p-4 mt-0">
              <div className="max-w-5xl mx-auto space-y-4">
                {/* Drop Zones Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Rows / Dimensions */}
                  <CanvasDropZone
                    title="Lignes (Dimensions)"
                    description="Glissez les champs de regroupement ici"
                    zoneType="rows"
                    items={rowItems}
                    icon={<AlignLeft className="h-4 w-4" />}
                    onRemove={(id) => removeFromZone('rows', id)}
                    onDrop={(e) => handleCanvasDrop('rows', e)}
                    accentColor="border-blue-300"
                  />

                  {/* Values / Metrics */}
                  <CanvasDropZone
                    title="Valeurs (Métriques)"
                    description="Glissez les champs numériques à agréger ici"
                    zoneType="values"
                    items={valueItems}
                    icon={<Hash className="h-4 w-4" />}
                    onRemove={(id) => removeFromZone('values', id)}
                    onDrop={(e) => handleCanvasDrop('values', e)}
                    onChangeAggregation={(id, agg) => {
                      setValueItems(prev => prev.map(item => 
                        item.id === id ? { ...item, aggregation: agg } : item
                      ))
                    }}
                    accentColor="border-green-300"
                  />
                </div>

                {/* Filters Row */}
                <CanvasDropZone
                  title="Filtres"
                  description="Ajoutez des conditions de filtrage"
                  zoneType="filters"
                  items={filterItems}
                  icon={<Filter className="h-4 w-4" />}
                  onRemove={(id) => removeFromZone('filters', id)}
                  onDrop={(e) => handleCanvasDrop('filters', e)}
                  onChangeOperator={(id, op) => {
                    setFilterItems(prev => prev.map(item =>
                      item.id === id ? { ...item, operator: op } : item
                    ))
                  }}
                  onChangeValue={(id, val) => {
                    setFilterItems(prev => prev.map(item =>
                      item.id === id ? { ...item, value: val } : item
                    ))
                  }}
                  accentColor="border-orange-300"
                />

                {/* Quick Info Cards */}
                {(rowItems.length > 0 || valueItems.length > 0) && (
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 flex items-center gap-2">
                        <AlignLeft className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Dimensions</p>
                          <p className="text-lg font-bold">{rowItems.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Métriques</p>
                          <p className="text-lg font-bold">{valueItems.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Filtres</p>
                          <p className="text-lg font-bold">{filterItems.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Empty State */}
                {rowItems.length === 0 && valueItems.length === 0 && filterItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <MousePointerClick2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Commencez votre rapport</h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      Glissez-déposez les champs depuis le panneau gauche vers les zones ci-dessus pour construire votre rapport personnalisé.
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="py-1.5">
                        <AlignLeft className="h-3 w-3 mr-1" /> Lignes
                      </Badge>
                      <Badge variant="outline" className="py-1.5">
                        <Hash className="h-3 w-3 mr-1" /> Valeurs
                      </Badge>
                      <Badge variant="outline" className="py-1.5">
                        <Filter className="h-3 w-3 mr-1" /> Filtres
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto mt-0">
              <div className="p-4">
                {previewData ? (
                  <ReportViewer data={previewData} config={config} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Aperçu du rapport</h3>
                    <p className="text-sm text-muted-foreground">
                      Cliquez sur &quot;Exécuter&quot; pour générer et prévisualiser votre rapport.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="flex-1 overflow-auto mt-0">
              <TemplateGallery onSelectTemplate={(template) => {
                setConfig(template.config as ReportConfig)
                setSelectedDataSource(template.config.dataSource)
                setActiveTab('builder')
              }} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Options */}
        <div className="w-[280px] border-l flex flex-col bg-card/50">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Chart Type Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Type de Graphique
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'table' as ChartType, icon: Table2, label: 'Tableau' },
                    { type: 'bar' as ChartType, icon: BarChart3, label: 'Barres' },
                    { type: 'line' as ChartType, icon: LineChart, label: 'Ligne' },
                    { type: 'pie' as ChartType, icon: PieChart, label: 'Camembert' },
                    { type: 'area' as ChartType, icon: null, label: 'Aire' },
                    { type: 'kpi' as ChartType, icon: null, label: 'KPI' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all",
                        config.chartType === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                      <span className="text-[10px] font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date Range */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Période
                </h3>
                
                <Select
                  value={config.dateRange?.preset || 'this_month'}
                  onValueChange={(v) => setConfig(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, preset: v as any }
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="this_week">Cette semaine</SelectItem>
                    <SelectItem value="last_week">Semaine dernière</SelectItem>
                    <SelectItem value="this_month">Ce mois</SelectItem>
                    <SelectItem value="last_month">Mois dernier</SelectItem>
                    <SelectItem value="this_quarter">Ce trimestre</SelectItem>
                    <SelectItem value="this_year">Cette année</SelectItem>
                    <SelectItem value="year_to_date">Depuis le début de l&apos;année</SelectItem>
                    <SelectItem value="custom">Personnalisé...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Color Scheme */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Schéma de Couleurs
                </h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(CHART_COLOR_PALETTES) as ColorScheme[]).slice(0, 10).map(scheme => (
                    <button
                      key={scheme}
                      onClick={() => setConfig(prev => ({
                        ...prev,
                        style: { ...prev.style, colorScheme: scheme }
                      }))}
                      className={cn(
                        "w-full aspect-square rounded-lg border-2 transition-all flex items-end p-1",
                        config.style.colorScheme === scheme
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border"
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${CHART_COLOR_PALETTES[scheme][0]}, ${CHART_COLOR_PALETTES[scheme][3]})`
                      }}
                      title={scheme}
                    >
                      {config.style.colorScheme === scheme && (
                        <CheckCircle className="h-3 w-3 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Display Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Affichage
                </h3>
                
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Afficher la légende</span>
                    <input
                      type="checkbox"
                      checked={config.style.showLegend}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        style: { ...prev.style, showLegend: e.target.checked }
                      }))}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Grilles</span>
                    <input
                      type="checkbox"
                      checked={config.style.showGridLines}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        style: { ...prev.style, showGridLines: e.target.checked }
                      }))}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Étiquettes de données</span>
                    <input
                      type="checkbox"
                      checked={config.style.showDataLabels}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        style: { ...prev.style, showDataLabels: e.target.checked }
                      }))}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Empilé</span>
                    <input
                      type="checkbox"
                      checked={config.style.stacked}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        style: { ...prev.style, stacked: e.target.checked }
                      }))}
                      className="rounded"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <label className="text-sm text-muted-foreground block mb-1.5">Taille du texte</label>
                  <Select
                    value={config.style.fontSize}
                    onValueChange={(v) => setConfig(prev => ({
                      ...prev,
                      style: { ...prev.style, fontSize: v as any }
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Petit</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="large">Grand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Sorting Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Tri
                </h3>
                
                <Select defaultValue="none">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pas de tri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pas de tri</SelectItem>
                    {valueItems.map(item => (
                      <React.Fragment key={item.id}>
                        <SelectItem value={`${item.fieldId}-asc`}>
                          {item.fieldName} ↑
                        </SelectItem>
                        <SelectItem value={`${item.fieldId}-desc`}>
                          {item.fieldName} ↓
                        </SelectItem>
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-card text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{currentDataSource.name}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{rowItems.length + valueItems.length + filterItems.length} éléments sélectionnés</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+S</kbd>
            Sauver
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+P</kbd>
            Prévisualiser
          </span>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Sauvegarder le Rapport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom du rapport *</label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Mon rapport personnalisé..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={saveReport} disabled={!reportName.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function ArrowUpDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12l7-7 7 7" />
    </svg>
  )
}

// Template Gallery Component
function TemplateGallery({ onSelectTemplate }: { onSelectTemplate: (template: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // This would normally fetch templates from API
  const templates = [
    { id: 'bilan-scf', name: 'Bilan SCF', category: 'comptabilite', description: 'Bilan comptable algérien', icon: '📊', isNew: true, isPopular: true },
    { id: 'etat-resultat', name: 'État de Résultat', category: 'comptabilite', description: 'Compte de résultat', icon: '📈' },
    { id: 'ca-par-wilaya', name: 'CA par Wilaya', category: 'commercial', description: 'Chiffre d\'affaires par région', icon: '🗺️', isNew: true },
    { id: 'top-clients', name: 'Top Clients', category: 'commercial', description: 'Analyse Pareto clients', icon: '🏆', isPopular: true },
    { id: 'fiche-paie', name: 'Fiche de Paie', category: 'rh', description: 'Bulletin de paie IRG/CNAS', icon: '💰', isPopular: true },
    { id: 'masse-salariale', name: 'Masse Salariale', category: 'rh', description: 'Analyse des salaires', icon: '👥' },
    { id: 'etat-stock', name: 'État des Stocks', category: 'stock', description: 'Valorisation stocks', icon: '📦' },
    { id: 'situation-tresorerie', name: 'Trésorerie', category: 'finance', description: 'Position de trésorerie', icon: '🏦' },
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          Tous
        </Button>
        {TEMPLATE_CATEGORIES.slice(0, 5).map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex gap-1">
                  {template.isNew && (
                    <Badge variant="default" className="text-[10px] bg-green-500">Nouveau</Badge>
                  )}
                  {template.isPopular && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> Populaire
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>
              <Button variant="ghost" size="sm" className="w-full mt-3">
                Utiliser ce modèle
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Simple Report Viewer Placeholder
function ReportViewer({ data, config }: { data: any; config: ReportConfig }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{config.name}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-4">
          {data.metadata?.totalRecords !== undefined && (
            <p className="text-sm text-muted-foreground mb-4">
              {data.metadata.filteredRecords} enregistrements affichés sur {data.metadata.totalRecords}
            </p>
          )}
          
          {/* Summary KPIs */}
          {data.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(data.summary).slice(0, 4).map(([key, value]) => (
                <Card key={key} className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-lg font-bold">
                      {typeof value === 'number' ? value.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) : value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Data Table Preview */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {data.metadata?.columns?.map((col: any) => (
                    <th key={col.id} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data?.slice(0, 20)?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    {data.metadata?.columns?.map((col: any) => (
                      <td key={col.id} className="px-4 py-2.5">
                        {typeof row[col.id] === 'number' 
                          ? row[col.id].toLocaleString('fr-DZ', { maximumFractionDigits: col.format ? 2 : 0 })
                          : row[col.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {data.data?.length > 20 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Affichage des 20 premiers résultats sur {data.data.length}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
