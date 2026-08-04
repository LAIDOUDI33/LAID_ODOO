'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Users, 
  UserPlus,
  Search,
  Phone,
  Mail,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  MapPin,
  IdCard,
  Cake,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================
// TYPES
// ============================================================

interface Employee {
  id: string
  matricule: string
  firstName: string
  lastName: string
  firstNameAr?: string | null
  lastNameAr?: string | null
  gender: string
  dateOfBirth?: string | null
  placeOfBirth?: string | null
  nationality?: string
  cin?: string | null
  cnasNumber?: string | null
  casnosNumber?: string | null
  personalEmail?: string | null
  workEmail?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  wilayaCode?: string | null
  department?: string | null
  jobTitle?: string | null
  jobPosition?: string | null
  managerId?: string | null
  contractType: 'cdi' | 'cdd' | 'internship' | 'temporary' | 'part_time'
  contractStartDate: string
  contractEndDate?: string | null
  employeeStatus: 'active' | 'on_leave' | 'resigned' | 'retired' | 'terminated'
  baseSalary: number
  dailyRate: number
  hourlyRate: number
  bankName?: string | null
  bankAccount?: string | null
  cvFile?: string | null
  contractFile?: string | null
  cinFile?: string | null
  photo?: string | null
  isActive: boolean
  hireDate?: string | null
  terminationDate?: string | null
  terminationReason?: string | null
  createdAt: string
  updatedAt: string
  manager?: { firstName: string; lastName: string; matricule: string } | null
  _count?: { payrolls: number; leaves: number; subordinates?: number }
}

interface PayrollRecord {
  id: string
  reference: string
  period: string
  status: string
  baseSalary: number
  grossSalary: number
  netPayable: number
  totalCotisations: number
  totalRetenues: number
  employee: {
    matricule: string
    firstName: string
    lastName: string
    department?: string | null
    jobTitle?: string | null
    baseSalary: number
  }
}

interface HrStats {
  totalEmployees: number
  activeEmployees: number
  onLeaveCount: number
  monthlyPayrollMass: number
  newHiresThisMonth: number
  departments: { name: string; count: number }[]
  absenteeismRate: number
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { 
    label: 'Actif', 
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200' 
  },
  on_leave: { 
    label: 'En Congé', 
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200' 
  },
  resigned: { 
    label: 'Démissionné', 
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200' 
  },
  retired: { 
    label: 'Retraité', 
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' 
  },
  terminated: { 
    label: 'Licencié', 
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200' 
  },
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  internship: 'Stage',
  temporary: 'Temporaire',
  part_time: 'Temps Partiel',
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getInitials = (firstName: string, lastName: string) => 
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

// ============================================================
// LOADING SKELETON COMPONENTS
// ============================================================

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-3 w-[200px]" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ERROR COMPONENT
// ============================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Erreur de chargement</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </Button>
    </div>
  )
}

// ============================================================
// EMPTY STATE COMPONENT
// ============================================================

function EmptyState({ type }: { type: 'employees' | 'search' }) {
  const config = {
    employees: {
      icon: Users,
      title: 'Aucun employé trouvé',
      description: 'Commencez par ajouter des employés à votre système.',
    },
    search: {
      icon: Search,
      title: 'Aucun résultat',
      description: 'Essayez de modifier vos critères de recherche ou de filtre.',
    },
  }
  
  const { icon: Icon, title, description } = config[type]
  
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground text-center">{description}</p>
    </div>
  )
}

// ============================================================
// EMPLOYEE DETAIL MODAL
// ============================================================

function EmployeeDetailModal({ 
  employee, 
  isOpen, 
  onClose 
}: { 
  employee: Employee | null
  isOpen: boolean
  onClose: () => void 
}) {
  if (!employee) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{employee.firstName} {employee.lastName}</span>
              <p className="text-sm font-normal text-muted-foreground">{employee.matricule}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Fiche employé • {STATUS_CONFIG[employee.employeeStatus]?.label || employee.employeeStatus}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <IdCard className="w-4 h-4" />
              Informations Personnelles
            </h4>
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <InfoRow label="Nom complet" value={`${employee.firstName} ${employee.lastName}`} />
              <InfoRow label="CIN" value={employee.cin || '-'} />
              <InfoRow 
                label="Date de naissance" 
                value={formatDate(employee.dateOfBirth)}
                icon={<Cake className="w-3 h-3" />}
              />
              <InfoRow 
                label="Lieu de naissance" 
                value={employee.placeOfBirth || '-'}
                icon={<MapPin className="w-3 h-3" />}
              />
              <InfoRow label="Nationalité" value={employee.nationality || 'DZ'} />
              <InfoRow label="Genre" value={employee.gender === 'M' ? 'Masculin' : 'Féminin'} />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <Phone className="w-4 h-4" />
              Contact
            </h4>
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <InfoRow 
                label="Email pro" 
                value={employee.workEmail || '-'}
                icon={<Mail className="w-3 h-3" />}
              />
              <InfoRow 
                label="Téléphone" 
                value={employee.phone || '-'}
                icon={<Phone className="w-3 h-3" />}
              />
              <InfoRow label="Adresse" value={employee.address || '-'} />
              <InfoRow label="Ville" value={employee.city || '-'} />
            </div>
          </div>

          {/* Contract Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              Contrat & Poste
            </h4>
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <InfoRow 
                label="Type de contrat" 
                value={
                  <Badge variant="outline">
                    {CONTRACT_LABELS[employee.contractType] || employee.contractType}
                  </Badge>
                }
              />
              <InfoRow label="Département" value={
                employee.department ? (
                  <Badge variant="secondary">{employee.department}</Badge>
                ) : '-'
              } />
              <InfoRow label="Poste" value={employee.jobTitle || '-'} />
              <InfoRow label="Fonction" value={employee.jobPosition || '-'} />
              <InfoRow 
                label="Début contrat" 
                value={formatDate(employee.contractStartDate)}
                icon={<Calendar className="w-3 h-3" />}
              />
              <InfoRow 
                label="Fin contrat" 
                value={employee.contractEndDate ? formatDate(employee.contractEndDate) : '-'}
              />
              <InfoRow 
                label="Statut" 
                value={
                  <Badge variant="outline" className={STATUS_CONFIG[employee.employeeStatus]?.className}>
                    {STATUS_CONFIG[employee.employeeStatus]?.label}
                  </Badge>
                }
              />
            </div>
          </div>

          {/* Salary & Bank */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Salaire & Banque
            </h4>
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <InfoRow 
                label="Salaire de base" 
                value={<span className="font-semibold text-green-600">{formatCurrency(employee.baseSalary)}</span>}
              />
              <InfoRow label="Taux journalier" value={formatCurrency(employee.dailyRate)} />
              <InfoRow label="Taux horaire" value={formatCurrency(employee.hourlyRate)} />
              
              <div className="pt-2 border-t border-border mt-2">
                <InfoRow label="Banque" value={employee.bankName || '-'} />
                <InfoRow 
                  label="Compte bancaire" 
                  value={employee.bankAccount ? (
                    <span className="font-mono text-xs">{employee.bankAccount}</span>
                  ) : '-'}
                  icon={<CreditCard className="w-3 h-3" />}
                />
              </div>
            </div>
          </div>

          {/* Social Security */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <FileText className="w-4 h-4" />
              Sécurité Sociale & Documents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/50 p-4 rounded-lg">
              <InfoRow label="N° CNAS" value={employee.cnasNumber || '-'} />
              <InfoRow label="N° CASNOS" value={employee.casnosNumber || '-'} />
              <InfoRow 
                label="CV" 
                value={employee.cvFile ? 'Disponible' : '-'}
                valueClassName={employee.cvFile ? 'text-green-600' : ''}
              />
              <InfoRow 
                label="Contrat signé" 
                value={employee.contractFile ? 'Disponible' : '-'}
                valueClassName={employee.contractFile ? 'text-green-600' : ''}
              />
              <InfoRow 
                label="Copie CIN" 
                value={employee.cinFile ? 'Disponible' : '-'}
                valueClassName={employee.cinFile ? 'text-green-600' : ''}
              />
            </div>
          </div>
        </div>

        {/* Manager Info */}
        {employee.manager && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Responsable hiérarchique</p>
            <p className="font-medium">
              {employee.manager.firstName} {employee.manager.lastName} ({employee.manager.matricule})
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>Paies: {employee._count?.payrolls || 0}</span>
          <span>Congés: {employee._count?.leaves || 0}</span>
          <span>Créé le: {formatDate(employee.createdAt)}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// INFO ROW HELPER
// ============================================================

function InfoRow({ 
  label, 
  value, 
  icon,
  valueClassName = '' 
}: { 
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  valueClassName?: string 
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium text-right ${valueClassName}`}>{value}</span>
    </div>
  )
}

// ============================================================
// MAIN HR PAGE COMPONENT
// ============================================================

export default function HrPage() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (departmentFilter !== 'all') params.append('department', departmentFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/employees?${params.toString()}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch employees')
      }
      
      setEmployees(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [departmentFilter, statusFilter, searchQuery])

  // Fetch payroll data
  const fetchPayrollData = useCallback(async () => {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7) // YYYY-MM
      const response = await fetch(`/api/payroll?period=${currentPeriod}`)
      const result = await response.json()
      
      if (result.success) {
        setPayrollData(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch payroll:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchEmployees()
    fetchPayrollData()
  }, [])

  // Refetch when filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        fetchEmployees()
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [departmentFilter, statusFilter, searchQuery, loading, fetchEmployees])

  // Computed values
  const stats: HrStats = useMemo(() => {
    const total = employees.length
    const active = employees.filter(e => e.employeeStatus === 'active').length
    const onLeave = employees.filter(e => e.employeeStatus === 'on_leave').length
    
    // Calculate payroll mass from fetched data or use sum of base salaries
    let monthlyPayrollMass = payrollData.reduce((sum, p) => sum + p.grossSalary, 0)
    if (monthlyPayrollMass === 0 && employees.length > 0) {
      monthlyPayrollMass = employees.reduce((sum, e) => sum + e.baseSalary, 0)
    }
    
    // New hires this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const newHires = employees.filter(e => {
      const hireDate = new Date(e.hireDate || e.contractStartDate)
      return hireDate >= startOfMonth
    }).length
    
    // Departments distribution
    const deptMap: Record<string, number> = {}
    employees.forEach(emp => {
      const dept = emp.department || 'Non assigné'
      deptMap[dept] = (deptMap[dept] || 0) + 1
    })
    const departments = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    
    // Absenteeism rate (on_leave / total * 100)
    const absenteeismRate = total > 0 ? (onLeave / total) * 100 : 0
    
    return {
      totalEmployees: total,
      activeEmployees: active,
      onLeaveCount: onLeave,
      monthlyPayrollMass,
      newHiresThisMonth: newHires,
      departments,
      absenteeismRate: Math.round(absenteeismRate * 10) / 10,
    }
  }, [employees, payrollData])

  // Unique departments for filter
  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[]
    return depts.sort()
  }, [employees])

  // Handle employee click
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsModalOpen(true)
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status]
    return (
      <Badge variant="outline" className={config?.className || ''}>
        {config?.label || status}
      </Badge>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Ressources Humaines
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des employés, congés et paie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={fetchEmployees}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Effectif Total"
            value={stats.totalEmployees}
            icon={Users}
            iconColor="text-dz-green"
            iconBg="bg-dz-green/10"
            format="number"
            delay={0}
          />
          <KpiCard
            title="Masse Salariale"
            value={stats.monthlyPayrollMass}
            change={2.5}
            icon={DollarSign}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            format="currency"
            delay={0.05}
          />
          <KpiCard
            title="Nouvelles Recrues"
            value={stats.newHiresThisMonth}
            icon={UserPlus}
            iconColor="text-violet-600"
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            format="number"
            delay={0.1}
          />
          <KpiCard
            title="Taux d'Absentéisme"
            value={stats.absenteeismRate}
            change={stats.absenteeismRate > 5 ? -0.5 : 0.3}
            icon={Calendar}
            iconColor="text-orange-600"
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            format="percentage"
            delay={0.15}
          />
        </div>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="employes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="employes" className="gap-2">
            <Users className="w-4 h-4" />
            Employés
          </TabsTrigger>
          <TabsTrigger value="conges" className="gap-2">
            <Calendar className="w-4 h-4" />
            Congés
          </TabsTrigger>
          <TabsTrigger value="presence" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Présence
          </TabsTrigger>
          <TabsTrigger value="paie" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Paie
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* EMPLOYÉS TAB */}
        {/* ============================================================ */}
        <TabsContent value="employes" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>Annuaire des Employés</CardTitle>
                    {!loading && !error && (
                      <Badge variant="secondary" className="bg-dz-green/10 text-dz-green">
                        {stats.totalEmployees} employé{stats.totalEmployees > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Search & Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="on_leave">En congé</SelectItem>
                        <SelectItem value="resigned">Démissionné</SelectItem>
                        <SelectItem value="retired">Retraité</SelectItem>
                        <SelectItem value="terminated">Licencié</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <Building2 className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Département" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        {uniqueDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={6} />
                ) : error ? (
                  <ErrorState message={error} onRetry={fetchEmployees} />
                ) : employees.length === 0 ? (
                  <EmptyState type={searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' ? 'search' : 'employees'} />
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Matricule</TableHead>
                            <TableHead>Employé</TableHead>
                            <TableHead>Département</TableHead>
                            <TableHead>Poste</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {employees.map((emp) => (
                              <motion.tr
                                key={emp.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleEmployeeClick(emp)}
                              >
                                <TableCell className="font-mono text-xs font-medium">
                                  {emp.matricule}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                        {getInitials(emp.firstName, emp.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">
                                        {emp.firstName} {emp.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {CONTRACT_LABELS[emp.contractType]}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {emp.department ? (
                                    <Badge variant="secondary">{emp.department}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                  {emp.jobTitle || emp.jobPosition || '-'}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={emp.employeeStatus} />
                                </TableCell>
                                <TableCell className="text-sm">
                                  {emp.phone || '-'}
                                </TableCell>
                                <TableCell className="text-sm max-w-[180px] truncate">
                                  {emp.workEmail || emp.personalEmail || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEmployeeClick(emp)
                                    }}
                                  >
                                    Voir
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Summary footer */}
                    <div className="mt-4 flex flex-wrap justify-between items-center gap-4 text-sm text-muted-foreground">
                      <p>
                        Affichage de <strong>{employees.length}</strong> employé{employees.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Actifs: {stats.activeEmployees}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          En congé: {stats.onLeaveCount}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Department Distribution */}
            {!loading && !error && stats.departments.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Répartition par Département
                  </CardTitle>
                  <CardDescription>
                    Distribution des {stats.totalEmployees} employés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {stats.departments.map((dept) => {
                      const percentage = ((dept.count / stats.totalEmployees) * 100).toFixed(1)
                      return (
                        <div key={dept.name} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{dept.name}</span>
                            <span className="text-muted-foreground">
                              {new Intl.NumberFormat('fr-DZ').format(dept.count)} ({percentage}%)
                            </span>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* CONGÉS TAB */}
        {/* ============================================================ */}
        <TabsContent value="conges" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Gestion des Congés
                </CardTitle>
                <CardDescription>Suivi des demandes de congés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg border border-border text-center hover:bg-muted/50 transition-colors">
                    <p className="text-4xl font-bold text-yellow-600">
                      {stats.onLeaveCount}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">En congé aujourd'hui</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center hover:bg-muted/50 transition-colors">
                    <p className="text-4xl font-bold text-blue-600">
                      {employees.reduce((sum, e) => sum + (e._count?.leaves || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total des demandes</p>
                  </div>
                  <div className="p-6 rounded-lg border border-border text-center hover:bg-muted/50 transition-colors">
                    <p className="text-4xl font-bold text-green-600">30j</p>
                    <p className="text-sm text-muted-foreground mt-1">Congés moyens/employé/an</p>
                  </div>
                </div>

                {/* Leave summary by status */}
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">Résumé par statut</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Actif', count: stats.activeEmployees, color: 'green' },
                      { label: 'En congé', count: stats.onLeaveCount, color: 'yellow' },
                      { label: 'Autres', count: stats.totalEmployees - stats.activeEmployees - stats.onLeaveCount, color: 'gray' },
                      { label: 'Total', count: stats.totalEmployees, color: 'blue' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className={`p-4 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-center`}>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Placeholder for leave requests table */}
                <div className="mt-6 p-8 border border-dashed border-border rounded-lg text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-semibold mb-2">Module de gestion des congés</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visualisez et gérez les demandes de congés des employés.
                  </p>
                  <Button variant="outline" disabled>
                    Bientôt disponible
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* PRÉSENCE TAB */}
        {/* ============================================================ */}
        <TabsContent value="presence" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Suivi de Présence
                </CardTitle>
                <CardDescription>
                  Temps réel - Dernière mise à jour: {new Date().toLocaleTimeString('fr-DZ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {stats.activeEmployees.toLocaleString('fr-DZ')}
                  </div>
                  <p className="text-muted-foreground">
                    sur {stats.totalEmployees} employés présents ({stats.totalEmployees > 0 ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) : 0}%)
                  </p>
                  
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium">Présents</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span className="text-sm font-medium">En congé</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.onLeaveCount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-sm font-medium">Absents</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {Math.max(0, stats.totalEmployees - stats.activeEmployees - stats.onLeaveCount)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                        <span className="text-sm font-medium">Télétravail</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">-</p>
                    </div>
                  </div>
                </div>

                {/* Attendance placeholder */}
                <div className="mt-6 p-8 border border-dashed border-border rounded-lg text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-semibold mb-2">Module de pointage</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Intégration avec les systèmes de pointage biométrique et badgeuse.
                  </p>
                  <Button variant="outline" disabled>
                    Configuration requise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* PAIE TAB */}
        {/* ============================================================ */}
        <TabsContent value="paie" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Gestion de la Paie</CardTitle>
                <CardDescription>
                  Traitement des salaires • IRG/CNAS/CASNOS conforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Payroll Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Calendar className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Bulletins de Paie</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Générer pour {stats.totalEmployees} employés
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <Briefcase className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Déclarations CNAS</h3>
                    <p className="text-sm text-muted-foreground mt-1">Cotisations sociales (9%)</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <CreditCard className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">Déclarations CASNOS</h3>
                    <p className="text-sm text-muted-foreground mt-1">Retraite (12.5%+7.5%)</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <FileText className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-semibold">IRG Barème</h3>
                    <p className="text-sm text-muted-foreground mt-1">Calcul automatique IRG</p>
                  </div>
                </div>

                {/* Payroll Summary */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-4">Résumé Masse Salariale Mensuelle</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Brut Total</p>
                      <p className="text-xl font-bold">{formatCurrency(stats.monthlyPayrollMass)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CNAS (~9%)</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(stats.monthlyPayrollMass * 0.09)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CASNOS (~20%)</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(stats.monthlyPayrollMass * 0.20)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net estimé</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(stats.monthlyPayrollMass * 0.71)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Payroll Records */}
                {payrollData.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Bulletins récents</h4>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Référence</TableHead>
                            <TableHead>Employé</TableHead>
                            <TableHead>Période</TableHead>
                            <TableHead>Brut</TableHead>
                            <TableHead>Net</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollData.slice(0, 10).map((payroll) => (
                            <TableRow key={payroll.id}>
                              <TableCell className="font-mono text-xs">{payroll.reference}</TableCell>
                              <TableCell>
                                {payroll.employee.firstName} {payroll.employee.lastName}
                              </TableCell>
                              <TableCell>{payroll.period}</TableCell>
                              <TableCell>{formatCurrency(payroll.grossSalary)}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {formatCurrency(payroll.netPayable)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    payroll.status === 'paid' 
                                      ? 'bg-green-100 text-green-700' 
                                      : payroll.status === 'validated'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }
                                >
                                  {payroll.status === 'paid' ? 'Payé' : 
                                   payroll.status === 'validated' ? 'Validé' :
                                   payroll.status === 'calculated' ? 'Calculé' : 'Brouillon'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
