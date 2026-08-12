// ============================================================
// HASSIBA SUITE ERP - Report Viewer Component
// Advanced Report Display with Charts, Tables, and Export
// ============================================================

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
} from 'recharts'
import {
  Table2,
  Download,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Filter,
  Search,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileDown,
  Image,
  Eye,
  EyeOff,
  Columns3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  LayoutGrid,
  Calculator,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
  Copy,
  Share2,
  Star,
  Calendar,
  Clock,
  Database,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ReportExecutionResult,
  ReportConfig,
  ChartType,
  ColorScheme,
  CHART_COLOR_PALETTES,
  ColumnMetadata,
  ExportFormat,
} from '@/lib/types/report'

// ============================================================
// Types
// ============================================================

interface ReportViewerProps {
  data: ReportExecutionResult | null
  config: ReportConfig
  isLoading?: boolean
  onRefresh?: () => void
  onExport?: (format: ExportFormat) => void
  isEmbedded?: boolean
  showToolbar?: boolean
}

interface KPICardData {
  title: string
  value: number
  previousValue?: number
  format: string
  icon?: React.ReactNode
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}

// ============================================================
// Custom Tooltip for Charts
// ============================================================

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ============================================================
// KPI Cards Component
// ============================================================

function KPICards({ 
  data, 
  config 
}: { 
  data: ReportExecutionResult; 
  config: ReportConfig 
}) {
  const kpiData = useMemo(() => {
    if (!data.summary || !data.data || data.data.length === 0) return []

    const kpis: KPICardData[] = []
    
    // Generate KPIs from metrics
    config.metrics.forEach((metric, index) => {
      const sumKey = `sum_${metric.fieldId}`
      const avgKey = `avg_${metric.fieldId}`
      const countKey = `count_${metric.fieldId}`
      
      const value = data.summary[sumKey] || data.summary[avgKey] || 0
      const count = data.summary[countKey] || 0
      
      // Determine trend (mock)
      const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'neutral'
      
      kpis.push({
        title: metric.customLabel || metric.fieldName,
        value: value as number,
        format: metric.format || 'number',
        icon: getMetricIcon(index),
        color: getColorForIndex(index),
        trend,
      })
    })
    
    // Add record count KPI
    kpis.push({
      title: 'Total Enregistrements',
      value: data.metadata.filteredRecords,
      format: 'integer',
      icon: <Database className="h-5 w-5" />,
      color: '#6366f1',
    })
    
    return kpis.slice(0, 4) // Limit to 4 KPIs per row
  }, [data, config])

  function getMetricIcon(index: number) {
    const icons = [
      <TrendingUp key="trending" className="h-5 w-5" />,
      <Calculator key="calculator" className="h-5 w-5" />,
      <Layers key="layers" className="h-5 w-5" />,
      <BarChart3 key="barchart" className="h-5 w-5" />,
    ]
    return icons[index % icons.length]
  }

  function getColorForIndex(index: number) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
    return colors[index % colors.length]
  }

  function formatValue(value: number, format: string): string {
    switch (format) {
      case 'currency_dzd':
        return `${value.toLocaleString('fr-DZ')} DZD`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'integer':
        return Math.round(value).toLocaleString('fr-DZ')
      default:
        return value.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })
    }
  }

  function getTrendIcon(trend: 'up' | 'down' | 'neutral') {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "p-2.5 rounded-lg",
                  `bg-[${kpi.color}]/10`
                )}
                style={{ backgroundColor: `${kpi.color}15` }}
              >
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              {kpi.trend && (
                <div className="flex items-center gap-1 text-xs">
                  {getTrendIcon(kpi.trend)}
                  <span className={cn(
                    kpi.trend === 'up' && 'text-green-600',
                    kpi.trend === 'down' && 'text-red-600',
                    kpi.trend === 'neutral' && 'text-gray-500'
                  )}>
                    {Math.floor(Math.random() * 20 + 1)}%
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">{kpi.title}</p>
              <p className="text-2xl font-bold tracking-tight">
                {formatValue(kpi.value, kpi.format)}
              </p>
            </div>

            {/* Decorative gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${kpi.color}, transparent)` }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================================
// Data Table Component with Sorting & Pagination
// ============================================================

function DataTable({ 
  data, 
  config,
  pageSize = 25 
}: { 
  data: ReportExecutionResult; 
  config: ReportConfig;
  pageSize?: number;
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(data.metadata.columns?.map((c: ColumnMetadata) => c.id) || [])
  )
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...(data.data || [])]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(query)
        )
      )
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal || '')
        const bStr = String(bVal || '')
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
    }

    return result
  }, [data.data, sortColumn, sortDirection, searchQuery])

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const visibleColumnsList = data.metadata.columns?.filter(
    (c: ColumnMetadata) => visibleColumns.has(c.id)
  ) || []

  const formatCellValue = (value: unknown, column: ColumnMetadata): string => {
    if (value == null || value === '') return '-'

    switch (column.type) {
      case 'currency':
        return Number(value).toLocaleString('fr-DZ', {
          style: 'currency',
          currency: 'DZD',
          maximumFractionDigits: 2
        }).replace('DZD', '').trim() + ' DZD'
      case 'percentage':
        return `${Number(value).toFixed(1)}%`
      case 'number':
        return Number(value).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })
      default:
        return String(value)
    }
  }

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-9 w-[250px]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-2" />
                Colonnes
                <Badge variant="secondary" className="ml-2">
                  {visibleColumnsList.length}/{data.metadata.columns?.length}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {data.metadata.columns?.map((col: ColumnMetadata) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => toggleColumnVisibility(col.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      visibleColumns.has(col.id) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {visibleColumns.has(col.id) && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                  </div>
                  <span className="truncate">{col.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{processedData.length} enregistrements</span>
          {searchQuery && (
            <Badge variant="secondary">Filtré</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10">
              <tr>
                {visibleColumnsList.map((col: ColumnMetadata) => (
                  <th
                    key={col.id}
                    className={cn(
                      "px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide cursor-pointer hover:bg-muted/80 transition-colors select-none",
                      sortColumn === col.id && "text-primary"
                    )}
                    onClick={() => handleSort(col.id)}
                    style={{ width: columnWidths[col.id] || 'auto', minWidth: '120px' }}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.name}</span>
                      <span className="flex flex-col ml-1">
                        <ArrowUp
                          className={cn(
                            "h-3 w-3 -mb-1",
                            sortColumn === col.id && sortDirection === 'asc'
                              ? "text-primary opacity-100"
                              : "opacity-30"
                          )}
                        />
                        <ArrowDown
                          className={cn(
                            "h-3 w-3 -mt-1",
                            sortColumn === col.id && sortDirection === 'desc'
                              ? "text-primary opacity-100"
                              : "opacity-30"
                          )}
                        />
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {visibleColumnsList.map((col: ColumnMetadata) => (
                    <td
                      key={col.id}
                      className="px-4 py-2.5 max-w-[300px]"
                    >
                      <span
                        className={cn(
                          "block truncate",
                          col.isMetric && "font-medium tabular-nums"
                        )}
                        title={String(row[col.id] ?? '')}
                      >
                        {formatCellValue(row[col.id], col)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {processedData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">Aucun résultat trouvé</p>
              <p className="text-sm">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
            {' · '}
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, processedData.length)} sur {processedData.length}
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setCurrentPage(1)
                // Would need to update pageSize in parent
              }}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}/page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="px-3 text-sm min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Chart Renderer Component
// ============================================================

function ChartRenderer({ 
  data, 
  config 
}: { 
  data: ReportExecutionResult; 
  config: ReportConfig 
}) {
  const colors = CHART_COLOR_PALETTES[config.style.colorScheme] || CHART_COLOR_PALETTES.default
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data.data) return []

    // Group by first dimension if exists
    const dimensionField = config.dimensions[0]?.fieldId
    
    if (!dimensionField) {
      // No dimensions, just show metrics
      return data.data.map((row, idx) => ({ ...row, _key: idx }))
    }

    // Group by dimension
    const grouped: Record<string, Record<string, unknown>> = {}
    
    data.data.forEach(row => {
      const key = String(row[dimensionField])
      if (!grouped[key]) {
        grouped[key] = { [dimensionField]: key }
      }
      
      // Add metric values
      config.metrics.forEach(metric => {
        const currentVal = grouped[key][metric.fieldId] || 0
        grouped[key][metric.fieldId] = currentVal + (Number(row[metric.fieldId]) || 0)
      })
    })

    return Object.values(grouped)
  }, [data.data, config.dimensions, config.metrics])

  // Get metric field names for series
  const metricFields = config.metrics.map(m => m.fieldId)
  const dimensionName = config.dimensions[0]?.fieldName || ''

  // Render based on chart type
  const renderChart = () => {
    switch (config.chartType) {
      case 'bar':
      case 'bar_horizontal':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout={config.chartType === 'bar_horizontal' ? 'vertical' : 'horizontal'}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              {config.chartType !== 'bar_horizontal' ? (
                <XAxis 
                  dataKey={config.dimensions[0]?.fieldId} 
                  tick={{ fontSize: 12 }}
                  className="text-xs"
                />
              ) : (
                <YAxis 
                  type="category"
                  dataKey={config.dimensions[0]?.fieldId}
                  tick={{ fontSize: 12 }}
                  width={100}
                />
              )}
              {config.chartType !== 'bar_horizontal' ? (
                <YAxis tick={{ fontSize: 12 }} />
              ) : (
                <XAxis type="number" tick={{ fontSize: 12 }} />
              )}
              <Tooltip content={<CustomChartTooltip />} />
              {config.style.showLegend && (
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              )}
              {metricFields.map((field, index) => (
                <Bar
                  key={field}
                  dataKey={field}
                  name={config.metrics.find(m => m.fieldId === field)?.customLabel || field}
                  fill={colors[index % colors.length]}
                  radius={config.chartType === 'bar_horizontal' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  stackId={config.style.stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={config.dimensions[0]?.fieldId} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomChartTooltip />} />
              {config.style.showLegend && (
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              )}
              {metricFields.map((field, index) => (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  name={config.metrics.find(m => m.fieldId === field)?.customLabel || field}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={config.dimensions[0]?.fieldId} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomChartTooltip />} />
              {config.style.showLegend && (
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              )}
              {metricFields.map((field, index) => (
                <Area
                  key={field}
                  type="monotone"
                  dataKey={field}
                  name={config.metrics.find(m => m.fieldId === field)?.customLabel || field}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  stackId={config.style.stacked ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
      case 'doughnut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RePieChart>
              <Tooltip content={<CustomChartTooltip />} />
              {config.style.showLegend && (
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              )}
              <Pie
                data={chartData}
                dataKey={metricFields[0] || 'value'}
                nameKey={config.dimensions[0]?.fieldId}
                cx="50%"
                cy="50%"
                innerRadius={config.chartType === 'doughnut' ? 60 : 0}
                outerRadius={120}
                paddingAngle={2}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ strokeWidth: 1 }}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
            </RePieChart>
          </ResponsiveContainer>
        )

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis
                dataKey={config.dimensions[0]?.fieldId}
                tick={{ fontSize: 11 }}
              />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomChartTooltip />} />
              {config.style.showLegend && (
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              )}
              {metricFields.map((field, index) => (
                <Radar
                  key={field}
                  name={config.metrics.find(m => m.fieldId === field)?.customLabel || field}
                  dataKey={field}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Type de graphique non supporté pour cette configuration</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {renderChart()}
      
      {/* Data labels toggle info */}
      {config.style.showDataLabels && (
        <p className="text-xs text-center text-muted-foreground">
          Les étiquettes de données sont activées
        </p>
      )}
    </div>
  )
}

// ============================================================
// Main Report Viewer Component
// ============================================================

export default function ReportViewer({
  data,
  config,
  isLoading = false,
  onRefresh,
  onExport,
  isEmbedded = false,
  showToolbar = true,
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeView, setActiveView] = useState<'table' | 'chart' | 'both'>('both')

  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    if (onExport) {
      onExport(format)
      return
    }

    // Default export handling
    if (!data) return

    let content: string
    let mimeType: string
    let extension: string

    switch (format) {
      case 'csv':
        const headers = data.metadata.columns?.map((c: ColumnMetadata) => c.name).join(',') || ''
        const rows = data.data.map((row: Record<string, unknown>) =>
          data.metadata.columns?.map((col: ColumnMetadata) =>
            `"${String(row[col.id] ?? '').replace(/"/g, '""')}"`
          ).join(',')
        ).join('\n')
        content = `${headers}\n${rows}`
        mimeType = 'text/csv'
        extension = 'csv'
        break
      
      case 'json':
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        extension = 'json'
        break
      
      default:
        console.warn(`Export format ${format} not implemented`)
        return
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.name || 'rapport'}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data, config.name, onExport])

  // Print handler
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-medium">Génération du rapport en cours...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Veuillez patienter quelques instants
        </p>
      </div>
    )
  }

  // Empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-lg mb-2">Aucune donnée à afficher</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Exécutez un rapport pour voir les résultats ici.
        </p>
        {onRefresh && (
          <Button onClick={onRefresh} className="mt-4">
            <Play className="h-4 w-4 mr-2" />
            Exécuter le rapport
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6"
    )}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">{config.name || 'Rapport'}</h2>
            
            {data.executionTimeMs && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {data.executionTimeMs}ms
              </Badge>
            )}

            {data.warnings && data.warnings.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {data.warnings.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {data.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setActiveView('table')}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'chart' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 border-l"
                onClick={() => setActiveView('chart')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'both' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 border-l"
                onClick={() => setActiveView('both')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Refresh */}
            {onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rafraîchir</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Print */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimer</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Fullscreen */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Quitter plein écran' : 'Plein écran'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6" />

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (bientôt disponible)
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Image className="h-4 w-4 mr-2" alt="" />
                  PNG (bientôt disponible)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-6 pb-6">
          {/* KPI Cards - Show for KPI or both view */}
          {(config.chartType === 'kpi' || activeView === 'both') && (
            <KPICards data={data} config={config} />
          )}

          {/* Chart - Show for chart or both view */}
          {(config.chartType !== 'table' && config.chartType !== 'kpi') && 
           (activeView === 'chart' || activeView === 'both') && (
            <Card>
              <CardContent className="p-4 pt-6">
                <ChartRenderer data={data} config={config} />
              </CardContent>
            </Card>
          )}

          {/* Table - Show for table or both view */}
          {(config.chartType === 'table' || activeView === 'table' || activeView === 'both') && (
            <DataTable data={data} config={config} />
          )}

          {/* Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                Source: {data.metadata.dataSource}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {data.metadata.totalRecords} enregistrements
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Généré le {new Date(data.executedAt).toLocaleString('fr-DZ')}</span>
              {data.metadata.queryInfo && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex items-center gap-1 hover:text-foreground">
                        <Info className="h-3.5 w-3.5" />
                        Détails requête
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <pre className="text-xs whitespace-pre-wrap">
                        {data.metadata.queryInfo.sql}
                      </pre>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// Play icon for refresh button
function Play({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
    </svg>
  )
}
