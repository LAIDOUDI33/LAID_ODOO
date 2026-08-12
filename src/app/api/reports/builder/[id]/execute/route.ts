// ============================================================
// HASSIBA SUITE ERP - Report Builder API
// Execute Report with Data Generation
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  ReportConfig,
  ReportExecutionResult,
  ReportMetadata,
  ColumnMetadata,
  ReportDataRow,
  ReportSummary,
  FieldType,
  DataSourceType,
  AggregationFunction,
  FilterOperator
} from '@/lib/types/report'
import { getDataSource, DATA_SOURCES } from '@/lib/report-templates'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================================
// Algerian Wilayas Data for Demos
// ============================================================

const ALGERIAN_WILAYAS = [
  '01-Adrar', '02-Chlef', '03-Laghouat', '04-Oum El Bouaghi', '05-Batna',
  '06-Béjaïa', '07-Biskra', '08-Béchar', '09-Blida', '10-Bouira',
  '11-Tamanrasset', '12-Tébessa', '13-Tlemcen', '14-Tiaret', '15-Tizi Ouzou',
  '16-Alger', '17-Djelfa', '18-Jijel', '19-Sétif', '20-Saïda',
  '21-Skikda', '22-Sidi Bel Abbès', '23-Annaba', '24-Guelma', '25-Constantine',
  '26-Médea', '27-Mostaganem', "28-M'Sila", '29-Mascara', '30-Ouargla',
  '31-Oran', '32-El Bayadh', '33-Illizi', '34-Bordj Bou Arreridj', '35-Boumerdès',
  '36-El Tarf', '37-Tindouf', '38-Tissemsilt', '39-El Oued', '40-Khenchela',
  '41-Souk Ahras', '42-Tipaza', '43-Mila', '44-Aïn Defla', '45-Naâma',
  '46-Aïn Témouchent', '47-Ghardaïa', '48-Relizane'
]

const DEPARTMENTS = ['Direction', 'Finance', 'RH', 'Commercial', 'Production', 'IT', 'Marketing', 'Logistique']
const STATUSES_FACTURE = ['Brouillon', 'Envoyée', 'Partiellement Payée', 'Payée', 'En Retard', 'Annulée']
const PAYMENT_METHODS = ['Espèces', 'Chèque', 'Virement', 'Traite']

// ============================================================
// Helper: Generate random number in range
// ============================================================

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

// ============================================================
// Helper: Generate mock data based on data source
// ============================================================

function generateMockData(config: ReportConfig): { rows: ReportDataRow[], metadata: ReportMetadata } {
  const dataSourceDef = getDataSource(config.dataSource)
  const rows: ReportDataRow[] = []
  const columns: ColumnMetadata[] = []
  
  // Determine dimensions and metrics
  const dimensionFields = config.dimensions.map(d => {
    const field = dataSourceDef.fields.find(f => f.id === d.fieldId)
    return { ...d, field }
  }).filter(d => d.field)
  
  const metricFields = config.metrics.map(m => {
    const field = dataSourceDef.fields.find(f => f.id === m.fieldId)
    return { ...m, field }
  }).filter(m => m.field)
  
  // Build column metadata
  dimensionFields.forEach(d => {
    if (d.field) {
      columns.push({
        id: d.fieldId,
        name: d.customLabel || d.field?.name || d.fieldId,
        type: d.field?.type || 'string',
        isDimension: true,
        isMetric: false,
        visible: true
      })
    }
  })
  
  metricFields.forEach(m => {
    if (m.field) {
      columns.push({
        id: m.fieldId,
        name: m.customLabel || `${m.aggregation}(${m.field?.name || m.fieldId})`,
        type: m.field?.type || 'number',
        format: m.format,
        isDimension: false,
        isMetric: true,
        visible: true
      })
    }
  })
  
  // Generate row count based on configuration
  const rowCount = config.dataSource === 'employees' ? randomInRange(15, 50) :
                    config.dataSource === 'products' ? randomInRange(20, 80) :
                    config.dataSource === 'invoices' ? randomInRange(50, 200) :
                    config.dataSource === 'partners' ? randomInRange(10, 40) :
                    randomInRange(30, 100)
  
  // Generate data rows
  for (let i = 0; i < rowCount; i++) {
    const row: ReportDataRow = {}
    
    // Generate dimension values
    dimensionFields.forEach(d => {
      if (d.field) {
        switch (d.field.type) {
          case 'string':
          case 'id':
            if (d.fieldId === 'partnerWilaya' || d.fieldId === 'wilaya') {
              row[d.fieldId] = ALGERIAN_WILAYAS[randomInRange(0, ALGERIAN_WILAYAS.length - 1)]
            } else if (d.fieldId === 'department') {
              row[d.fieldId] = DEPARTMENTS[randomInRange(0, DEPARTMENTS.length - 1)]
            } else if (d.fieldId === 'status') {
              row[d.fieldId] = STATUSES_FACTURE[randomInRange(0, STATUSES_FACTURE.length - 1)]
            } else if (d.fieldId === 'partnerName' || d.fieldId === 'customerName' || d.fieldId === 'supplierName' || d.fieldId === 'employeeName' || d.fieldId === 'productName') {
              const names = ['Entreprise ABC', 'SARL XYZ', 'EURL Test', 'SPA Exemple', 'Groupe Demo',
                           'Client Alpha', 'Beta SARL', 'Gamma EURL', 'Delta SPA', 'Omega Group',
                           'Société Nouvelle', 'Partenaire Plus', 'Fournisseur Top', 'Client Premium']
              row[d.fieldId] = names[randomInRange(0, names.length - 1)]
            } else if (d.fieldId === 'month') {
              const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
              row[d.fieldId] = months[randomInRange(0, months.length - 1)]
            } else if (d.fieldId === 'accountClass') {
              row[d.fieldId] = `Classe ${randomInRange(1, 8)}`
            } else if (d.fieldId === 'journal') {
              row[d.fieldId] = ['ACH', 'VEN', 'BQ', 'CA', 'OD'][randomInRange(0, 4)]
            } else if (d.fieldId === 'paymentMethod') {
              row[d.fieldId] = PAYMENT_METHODS[randomInRange(0, PAYMENT_METHODS.length - 1)]
            } else {
              row[d.fieldId] = `Valeur ${i + 1}`
            }
            break
            
          case 'enum':
            if (d.field.enumValues && d.field.enumValues.length > 0) {
              const enumVal = d.field.enumValues[randomInRange(0, d.field.enumValues.length - 1)]
              row[d.fieldId] = enumVal.label
            } else {
              row[d.fieldId] = `Enum_${i}`
            }
            break
            
          case 'date':
          case 'datetime':
            const date = new Date(2024, randomInRange(0, 11), randomInRange(1, 28))
            row[d.fieldId] = date.toISOString().split('T')[0]
            break
            
          case 'boolean':
            row[d.fieldId] = Math.random() > 0.5
            break
            
          case 'number':
            row[d.fieldId] = randomInRange(1, 100)
            break
            
          default:
            row[d.fieldId] = `Value_${i}`
        }
      }
    })
    
    // Generate metric values
    metricFields.forEach(m => {
      if (m.field) {
        let value: number
        
        switch (m.field.type) {
          case 'currency':
            value = randomFloat(1000, 500000)
            break
          case 'percentage':
            value = randomFloat(0, 100, 1)
            break
          case 'number':
          default:
            value = randomFloat(10, 10000)
        }
        
        // Apply aggregation simulation
        switch (m.aggregation) {
          case 'sum':
          case 'avg':
            row[m.fieldId] = value
            break
          case 'count':
          case 'count_distinct':
            row[m.fieldId] = randomInRange(1, 100)
            break
          case 'min':
            row[m.fieldId] = value * 0.5
            break
          case 'max':
            row[m.fieldId] = value * 1.5
            break
          default:
            row[m.fieldId] = value
        }
      }
    })
    
    rows.push(row)
  }
  
  // Apply filters if any
  let filteredRows = rows
  if (config.filters && config.filters.length > 0) {
    filteredRows = rows.filter(row => {
      return config.filters.every(filter => {
        if (!filter.enabled) return true
        const value = row[filter.fieldId]
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'not_equals':
            return value !== filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'greater_than':
            return Number(value) > Number(filter.value)
          case 'less_than':
            return Number(value) < Number(filter.value)
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value)
          case 'is_null':
            return value === null || value === undefined
          case 'is_not_null':
            return value !== null && value !== undefined
          default:
            return true
        }
      })
    })
  }
  
  // Apply sorting
  if (config.sortBy && config.sortBy.length > 0) {
    filteredRows.sort((a, b) => {
      for (const sort of config.sortBy!) {
        const aVal = a[sort.fieldId]
        const bVal = b[sort.fieldId]
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
        }
        
        const aStr = String(aVal || '')
        const bStr = String(bVal || '')
        const comparison = aStr.localeCompare(bStr)
        return sort.direction === 'asc' ? comparison : -comparison
      }
      return 0
    })
  }
  
  const metadata: ReportMetadata = {
    totalRecords: rows.length,
    filteredRecords: filteredRows.length,
    columns,
    dateGenerated: new Date(),
    dataSource: config.dataSource,
    queryInfo: {
      sql: `-- Generated query for ${config.name}\nSELECT ${columns.map(c => c.name).join(', ')}\nFROM ${config.dataSource}${config.filters.length > 0 ? '\nWHERE ' + config.filters.map(f => `${f.fieldId} ${f.operator} ${f.value}`).join(' AND ') : ''}`,
      parameters: config.filters.map(f => f.value),
      executionPlan: 'Mock execution - no actual database query'
    }
  }
  
  return { rows: filteredRows, metadata }
}

// ============================================================
// Helper: Calculate summary statistics
// ============================================================

function calculateSummary(rows: ReportDataRow[], metrics: ReportConfig['metrics']): ReportSummary {
  const summary: ReportSummary = {}
  
  metrics.forEach(metric => {
    const values = rows
      .map(row => Number(row[metric.fieldId]))
      .filter(val => !isNaN(val))
    
    if (values.length > 0) {
      summary[`sum_${metric.fieldId}`] = values.reduce((a, b) => a + b, 0)
      summary[`avg_${metric.fieldId}`] = values.reduce((a, b) => a + b, 0) / values.length
      summary[`count_${metric.fieldId}`] = values.length
      summary[`min_${metric.fieldId}`] = Math.min(...values)
      summary[`max_${metric.fieldId}`] = Math.max(...values)
    }
  })
  
  return summary
}

// ============================================================
// POST /api/reports/builder/[id]/execute - Execute report
// ============================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  
  try {
    const { id } = await params
    const body = await request.json()
    
    // Get report configuration
    let config: ReportConfig
    
    if (id === 'preview' || id === 'template') {
      // Execute from provided config (for preview or template execution)
      config = body.config as ReportConfig
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Configuration requise pour l\'exécution' },
          { status: 400 }
        )
      }
    } else {
      // Get saved report config
      const report = await db.reportBuilderConfig.findUnique({ where: { id } })
      
      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Rapport non trouvé' },
          { status: 404 }
        )
      }
      
      config = JSON.parse(report.config)
      
      // Override with any provided options
      if (body.dateRange) {
        config.dateRange = body.dateRange
      }
      if (body.filters) {
        config.filters = [...(config.filters || []), ...body.filters]
      }
    }
    
    // Generate mock data based on configuration
    const { rows, metadata } = generateMockData(config)
    
    // Calculate summary statistics
    const summary = calculateSummary(rows, config.metrics)
    
    // Update execution stats if it's a saved report
    if (id !== 'preview' && id !== 'template') {
      await db.reportBuilderConfig.update({
        where: { id },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 }
        }
      })
    }
    
    const executionTimeMs = Date.now() - startTime
    
    const result: ReportExecutionResult = {
      reportId: id,
      executedAt: new Date(),
      executionTimeMs,
      data: rows,
      metadata,
      summary,
      warnings: rows.length === 0 ? ['Aucune donnée trouvée pour cette configuration'] : undefined
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('Error executing report:', error)
    const executionTimeMs = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'exécution du rapport',
      executionTimeMs
    }, { status: 500 })
  }
}
