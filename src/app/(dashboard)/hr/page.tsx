'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Filter,
  // New icons for Contracts tab
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit3,
  Eye,
  Power,
  Ban,
  Upload,
  Shield,
  // New icons for Leave Management
  Sun,
  Heart,
  Baby,
  Star,
  Plane,
  CalendarCheck,
  CalendarX,
  Send,
  UserCheck,
  UserX,
  // New icons for Attendance
  LogIn,
  LogOut,
  Timer,
  Activity,
  Download,
  MoreVertical,
  ArrowRightLeft
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

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

// Contract Types
interface Contract {
  id: string
  reference: string
  employeeId: string
  employeeName: string
  type: 'CDI' | 'CDD' | 'Stage' | 'Temporaire' | 'Temps_Partiel'
  status: 'draft' | 'active' | 'suspended' | 'terminated' | 'expired' | 'renewed'
  startDate: string
  endDate: string | null
  trialEndDate: string | null
  baseSalary: number
  currency: string
  paymentFrequency: 'monthly' | 'weekly' | 'biweekly'
  department: string
  jobTitle: string
  grade: string
  weeklyHours: number
  annualLeaveDays: number
  transportAllowance: number
  housingAllowance: number
  foodAllowance: number
  nssNumber: string
  cnasNumber: string
  casnosNumber: string
  contractUrl: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
}

// Leave Types
interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  employeePhoto?: string | null
  type: 'annual' | 'sickness' | 'maternity' | 'paternity' | 'unpaid' | 'exceptional' | 'marriage' | 'birth' | 'death' | 'pilgrimage'
  startDate: string
  endDate: string
  daysCount: number
  isHalfDay: boolean
  halfDayPart: 'morning' | 'evening' | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
  reason: string | null
  rejectionReason: string | null
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

// Attendance Types
interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeePhoto?: string | null
  date: string
  clockIn: string | null
  clockOut: string | null
  workedHours: number
  overtimeHours: number
  breakMinutes: number
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend'
  notes: string | null
  department?: string | null
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

// Contract Status Configuration (French)
const CONTRACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspendu', color: 'bg-yellow-100 text-yellow-700' },
  terminated: { label: 'Résilié', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700' },
  renewed: { label: 'Renouvelé', color: 'bg-blue-100 text-blue-700' },
}

// Contract Type Configuration
const CONTRACT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  CDI: { label: 'CDI', color: 'bg-blue-100 text-blue-700' },
  CDD: { label: 'CDD', color: 'bg-purple-100 text-purple-700' },
  Stage: { label: 'Stage', color: 'bg-cyan-100 text-cyan-700' },
  Temporaire: { label: 'Temporaire', color: 'bg-orange-100 text-orange-700' },
  Temps_Partiel: { label: 'Temps Partiel', color: 'bg-pink-100 text-pink-700' },
}

// Leave Status Configuration (French)
const LEAVE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Soumise', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-500' },
}

// Leave Types with icons and colors
const LEAVE_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  annual: { label: 'Congé Annuel', icon: Sun, color: 'bg-yellow-100 text-yellow-700' },
  sickness: { label: 'Maladie', icon: Heart, color: 'bg-red-100 text-red-700' },
  maternity: { label: 'Maternité', icon: Baby, color: 'bg-pink-100 text-pink-700' },
  paternity: { label: 'Paternité', icon: Users, color: 'bg-blue-100 text-blue-700' },
  unpaid: { label: 'Sans Solde', icon: Clock, color: 'bg-gray-100 text-gray-700' },
  exceptional: { label: 'Exceptionnel', icon: Star, color: 'bg-purple-100 text-purple-700' },
  marriage: { label: 'Mariage', icon: Heart, color: 'bg-pink-100 text-pink-800' },
  birth: { label: 'Naissance', icon: Baby, color: 'bg-cyan-100 text-cyan-700' },
  death: { label: 'Décès', icon: XCircle, color: 'bg-black/10 text-black' },
  pilgrimage: { label: 'Hadj/Omra', icon: Star, color: 'bg-emerald-100 text-emerald-700' },
}

// Attendance Status Configuration
const ATTENDANCE_STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  present: { label: 'Présent', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
  absent: { label: 'Absent', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
  late: { label: 'En retard', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500' },
  half_day: { label: 'Demi-journée', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500' },
  on_leave: { label: 'En congé', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' },
  holiday: { label: 'Férié', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-500' },
  weekend: { label: 'Week-end', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
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

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getInitials = (firstName: string, lastName: string) => 
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

// Generate mock data for contracts
const generateMockContracts = (): Contract[] => [
  { id: '1', reference: 'CTR-2024-001', employeeId: 'emp1', employeeName: 'Ahmed Benali', type: 'CDI', status: 'active', startDate: '2024-01-15', endDate: null, trialEndDate: '2024-04-15', baseSalary: 85000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Informatique', jobTitle: 'Développeur Senior', grade: 'P5', weeklyHours: 40, annualLeaveDays: 30, transportAllowance: 8000, housingAllowance: 0, foodAllowance: 4500, nssNumber: 'NSS123456', cnasNumber: 'CNAS789012', casnosNumber: 'CASNOS345678', contractUrl: '/files/contracts/ctr1.pdf', internalNotes: null, createdAt: '2024-01-10T10:00:00Z', updatedAt: '2024-01-15T14:30:00Z' },
  { id: '2', reference: 'CTR-2024-002', employeeId: 'emp2', employeeName: 'Fatima Zerhouni', type: 'CDD', status: 'active', startDate: '2024-03-01', endDate: '2025-02-28', trialEndDate: '2024-04-01', baseSalary: 65000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Marketing', jobTitle: 'Chef de Projet Digital', grade: 'P4', weeklyHours: 40, annualLeaveDays: 25, transportAllowance: 8000, housingAllowance: 12000, foodAllowance: 4500, nssNumber: 'NSS234567', cnasNumber: 'CNAS890123', casnosNumber: 'CASNOS456789', contractUrl: '/files/contracts/ctr2.pdf', internalNotes: 'Renouvellement possible', createdAt: '2024-02-25T09:00:00Z', updatedAt: '2024-03-01T11:00:00Z' },
  { id: '3', reference: 'CTR-2024-003', employeeId: 'emp3', employeeName: 'Karim Hadjeres', type: 'Stage', status: 'draft', startDate: '2024-06-01', endDate: '2024-08-31', trialEndDate: null, baseSalary: 18000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Informatique', jobTitle: 'Stagiaire Développeur', grade: 'S1', weeklyHours: 35, annualLeaveDays: 5, transportAllowance: 4000, housingAllowance: 0, foodAllowance: 2500, nssNumber: '', cnasNumber: '', casnosNumber: '', contractUrl: null, internalNotes: 'Stage PFE - Université USTHB', createdAt: '2024-05-20T14:00:00Z', updatedAt: '2024-05-20T14:00:00Z' },
  { id: '4', reference: 'CTR-2023-015', employeeId: 'emp4', employeeName: 'Amina Boudrahem', type: 'CDI', status: 'suspended', startDate: '2023-06-01', endDate: null, trialEndDate: '2023-09-01', baseSalary: 75000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Ressources Humaines', jobTitle: 'Responsable RH', grade: 'P4', weeklyHours: 39, annualLeaveDays: 30, transportAllowance: 8000, housingAllowance: 8000, foodAllowance: 4500, nssNumber: 'NSS345678', cnasNumber: 'CNAS901234', casnosNumber: 'CASNOS567890', contractUrl: '/files/contracts/ctr4.pdf', internalNotes: 'Suspension temporaire - congé maternité prolongé', createdAt: '2023-05-20T10:00:00Z', updatedAt: '2024-04-01T09:00:00Z' },
  { id: '5', reference: 'CTR-2023-008', employeeId: 'emp5', employeeName: 'Yacine Mebarki', type: 'CDD', status: 'terminated', startDate: '2023-09-01', endDate: '2024-04-30', trialEndDate: null, baseSalary: 55000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Comptabilité', jobTitle: 'Comptable', grade: 'P3', weeklyHours: 39, annualLeaveDays: 25, transportAllowance: 6000, housingAllowance: 0, foodAllowance: 3500, nssNumber: 'NSS456789', cnasNumber: 'CNAS012345', casnosNumber: 'CASNOS678901', contractUrl: '/files/contracts/ctr5.pdf', internalNotes: 'Fin de contrat - non renouvelé', createdAt: '2023-08-20T11:00:00Z', updatedAt: '2024-04-30T16:00:00Z' },
  { id: '6', reference: 'CTR-2023-003', employeeId: 'emp6', employeeName: 'Nadia Belkacem', type: 'CDI', status: 'expired', startDate: '2023-01-01', endDate: '2023-12-31', trialEndDate: '2023-04-01', baseSalary: 95000, currency: 'DZD', paymentFrequency: 'monthly', department: 'Direction', jobTitle: 'Directrice Technique', grade: 'P6', weeklyHours: 40, annualLeaveDays: 30, transportAllowance: 10000, housingAllowance: 15000, foodAllowance: 5000, nssNumber: 'NSS567890', cnasNumber: 'CNAS123456', casnosNumber: 'CASNOS789012', contractUrl: '/files/contracts/ctr6.pdf', internalNotes: 'Contrat expiré - en attente de renouvellement', createdAt: '2022-12-15T10:00:00Z', updatedAt: '2023-12-31T23:59:00Z' },
]

// Generate mock data for leave requests
const generateMockLeaves = (): LeaveRequest[] => [
  { id: '1', employeeId: 'emp1', employeeName: 'Ahmed Benali', type: 'annual', startDate: '2024-07-01', endDate: '2024-07-15', daysCount: 15, isHalfDay: false, halfDayPart: null, status: 'approved', reason: 'Vacances familiales', rejectionReason: null, approvedBy: 'admin', approvedAt: '2024-06-20T10:00:00Z', createdAt: '2024-06-01T09:00:00Z', updatedAt: '2024-06-20T10:00:00Z' },
  { id: '2', employeeId: 'emp2', employeeName: 'Fatima Zerhouni', type: 'sickness', startDate: '2024-07-10', endDate: '2024-07-12', daysCount: 3, isHalfDay: false, halfDayPart: null, status: 'submitted', reason: 'Grippe forte avec fièvre', rejectionReason: null, approvedBy: null, approvedAt: null, createdAt: '2024-07-10T08:00:00Z', updatedAt: '2024-07-10T08:00:00Z' },
  { id: '3', employeeId: 'emp4', employeeName: 'Amina Boudrahem', type: 'maternity', startDate: '2024-05-01', endDate: '2024-08-31', daysCount: 124, isHalfDay: false, halfDayPart: null, status: 'approved', reason: 'Congé maternité légal', rejectionReason: null, approvedBy: 'admin', approvedAt: '2024-04-15T14:00:00Z', createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-04-15T14:00:00Z' },
  { id: '4', employeeId: 'emp7', employeeName: 'Omar Khaled', type: 'exceptional', startDate: '2024-07-18', endDate: '2024-07-18', daysCount: 1, isHalfDay: true, halfDayPart: 'morning', status: 'submitted', reason: 'Démarches administratives urgentes', rejectionReason: null, approvedBy: null, approvedAt: null, createdAt: '2024-07-16T11:00:00Z', updatedAt: '2024-07-16T11:00:00Z' },
  { id: '5', employeeId: 'emp8', employeeName: 'Lina Mansouri', type: 'marriage', startDate: '2024-08-15', endDate: '2024-08-22', daysCount: 8, isHalfDay: false, halfDayPart: null, status: 'draft', reason: 'Mariage prévu le 17 août', rejectionReason: null, approvedBy: null, approvedAt: null, createdAt: '2024-07-10T15:00:00Z', updatedAt: '2024-07-10T15:00:00Z' },
  { id: '6', employeeId: 'emp9', employeeName: 'Rachid Hamadi', type: 'pilgrimage', startDate: '2024-06-10', endDate: '2024-07-15', daysCount: 36, isHalfDay: false, halfDayPart: null, status: 'approved', reason: 'Hadj 2024', rejectionReason: null, approvedBy: 'admin', approvedAt: '2024-05-01T09:00:00Z', createdAt: '2024-04-01T10:00:00Z', updatedAt: '2024-05-01T09:00:00Z' },
  { id: '7', employeeId: 'emp10', employeeName: 'Samira Djelloul', type: 'birth', startDate: '2024-07-20', endDate: '2024-07-24', daysCount: 5, isHalfDay: false, halfDayPart: null, status: 'rejected', reason: 'Naissance d\'un enfant', rejectionReason: 'Dates non conformes au règlement intérieur', approvedBy: 'manager', approvedAt: '2024-07-15T11:00:00Z', createdAt: '2024-07-12T09:00:00Z', updatedAt: '2024-07-15T11:00:00Z' },
]

// Generate mock attendance records
const generateMockAttendance = (): AttendanceRecord[] => {
  const today = new Date().toISOString().split('T')[0]
  return [
    { id: '1', employeeId: 'emp1', employeeName: 'Ahmed Benali', date: today, clockIn: '08:25', clockOut: '17:32', workedHours: 8.12, overtimeHours: 0.62, breakMinutes: 60, status: 'present', notes: null, department: 'Informatique' },
    { id: '2', employeeId: 'emp2', employeeName: 'Fatima Zerhouni', date: today, clockIn: '08:55', clockOut: null, workedHours: 0, overtimeHours: 0, breakMinutes: 0, status: 'late', notes: 'En cours', department: 'Marketing' },
    { id: '3', employeeId: 'emp3', employeeName: 'Karim Hadjeres', date: today, clockIn: '08:15', clockOut: '17:00', workedHours: 8.75, overtimeHours: 0.25, breakMinutes: 60, status: 'present', notes: null, department: 'Informatique' },
    { id: '4', employeeId: 'emp4', employeeName: 'Amina Boudrahem', date: today, clockIn: null, clockOut: null, workedHours: 0, overtimeHours: 0, breakMinutes: 0, status: 'on_leave', notes: 'Congé maternité', department: 'Ressources Humaines' },
    { id: '5', employeeId: 'emp5', employeeName: 'Yacine Mebarki', date: today, clockIn: null, clockOut: null, workedHours: 0, overtimeHours: 0, breakMinutes: 0, status: 'absent', notes: 'Absence non justifiée', department: 'Comptabilité' },
    { id: '6', employeeId: 'emp6', employeeName: 'Nadia Belkacem', date: today, clockIn: '08:00', clockOut: '13:00', workedHours: 5, overtimeHours: 0, breakMinutes: 30, status: 'half_day', notes: 'Départ anticipé - rendez-vous médical', department: 'Direction' },
    { id: '7', employeeId: 'emp7', employeeName: 'Omar Khaled', date: today, clockIn: '08:30', clockOut: '17:45', workedHours: 8.25, overtimeHours: 0.75, breakMinutes: 60, status: 'present', notes: null, department: 'Commercial' },
    { id: '8', employeeId: 'emp8', employeeName: 'Lina Mansouri', date: today, clockIn: '09:15', clockOut: null, workedHours: 0, overtimeHours: 0, breakMinutes: 0, status: 'late', notes: 'Retard - problèmes de transport', department: 'Communication' },
  ]
}

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

function EmptyState({ type }: { type: 'employees' | 'search' | 'contracts' | 'leaves' | 'attendance' }) {
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
    contracts: {
      icon: FileSignature,
      title: 'Aucun contrat trouvé',
      description: 'Aucun contrat ne correspond à vos critères de recherche.',
    },
    leaves: {
      icon: CalendarCheck,
      title: 'Aucune demande de congé',
      description: 'Aucune demande de congé ne correspond à vos critères.',
    },
    attendance: {
      icon: Activity,
      title: 'Aucun enregistrement',
      description: 'Aucun enregistrement de présence pour cette période.',
    },
  }
  
  const { icon: Icon, title, description } = config[type] || config.search
  
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
// CONTRACT MODAL COMPONENT
// ============================================================

function ContractModal({
  contract,
  isOpen,
  onClose,
  onSave,
  employees,
}: {
  contract: Contract | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Contract>) => void
  employees: Employee[]
}) {
  const [formData, setFormData] = useState<Partial<Contract>>(contract || {
    type: 'CDI',
    status: 'draft',
    baseSalary: 0,
    currency: 'DZD',
    paymentFrequency: 'monthly',
    weeklyHours: 40,
    annualLeaveDays: 30,
    transportAllowance: 0,
    housingAllowance: 0,
    foodAllowance: 0,
  })

  // Initialize form data from contract prop (using ref to track previous value)
  const prevContractRef = useRef(contract)
  
  useEffect(() => {
    // Only update if contract actually changed
    if (contract !== prevContractRef.current) {
      prevContractRef.current = contract
      if (contract) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- form initialization from prop
        setFormData(contract)
      } else {
        setFormData({
          type: 'CDI',
          status: 'draft',
          baseSalary: 0,
          currency: 'DZD',
          paymentFrequency: 'monthly',
          weeklyHours: 40,
          annualLeaveDays: 30,
          transportAllowance: 0,
          housingAllowance: 0,
          foodAllowance: 0,
        })
      }
    }
  }, [contract])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            {contract ? 'Modifier le Contrat' : 'Nouveau Contrat'}
          </DialogTitle>
          <DialogDescription>
            {contract ? `Contrat ${contract.reference}` : 'Créer un nouveau contrat de travail'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employé *</Label>
              <Select
                value={formData.employeeId || ''}
                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                disabled={!!contract}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.matricule})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de Contrat *</Label>
              <Select
                value={formData.type || 'CDI'}
                onValueChange={(v) => setFormData({ ...formData, type: v as Contract['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPE_CONFIG).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trialEnd">Fin de période d'essai</Label>
              <Input
                id="trialEnd"
                type="date"
                value={formData.trialEndDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value || null })}
              />
            </div>
          </div>

          {/* Salary Section */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Rémunération
            </h4>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salaire de base (DZD) *</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Fréquence de paiement</Label>
                <Select
                  value={formData.paymentFrequency || 'monthly'}
                  onValueChange={(v) => setFormData({ ...formData, paymentFrequency: v as Contract['paymentFrequency'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="biweekly">Bi-mensuel</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select value={formData.currency || 'DZD'} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DZD">DZD - Dinar Algérien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <GiftIcon className="w-4 h-4" />
              Avantages et Primes
            </h4>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transport">Prime de transport</Label>
                <Input
                  id="transport"
                  type="number"
                  value={formData.transportAllowance || 0}
                  onChange={(e) => setFormData({ ...formData, transportAllowance: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="housing">Indemnité logement</Label>
                <Input
                  id="housing"
                  type="number"
                  value={formData.housingAllowance || 0}
                  onChange={(e) => setFormData({ ...formData, housingAllowance: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food">Indemnité nourriture</Label>
                <Input
                  id="food"
                  type="number"
                  value={formData.foodAllowance || 0}
                  onChange={(e) => setFormData({ ...formData, foodAllowance: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Working Conditions */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Conditions de Travail
            </h4>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Heures hebdomadaires</Label>
                <Input
                  id="hours"
                  type="number"
                  value={formData.weeklyHours || 40}
                  onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                  min={0}
                  max={48}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaveDays">Jours de congés annuels</Label>
                <Input
                  id="leaveDays"
                  type="number"
                  value={formData.annualLeaveDays || 30}
                  onChange={(e) => setFormData({ ...formData, annualLeaveDays: Number(e.target.value) })}
                  min={0}
                  max={45}
                />
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Informations du Poste
            </h4>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Département</Label>
                <Input
                  id="department"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Informatique"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Intitulé du poste</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle || ''}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="Ex: Développeur Senior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Classification / Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="Ex: P5"
                />
              </div>
            </div>
          </div>

          {/* Algerian Compliance Fields */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Conformité Algérienne (NSS/CNAS/CASNOS)
            </h4>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nss">N° Sécurité Sociale (NSS)</Label>
                <Input
                  id="nss"
                  value={formData.nssNumber || ''}
                  onChange={(e) => setFormData({ ...formData, nssNumber: e.target.value })}
                  placeholder="NSS-XXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnas">N° CNAS</Label>
                <Input
                  id="cnas"
                  value={formData.cnasNumber || ''}
                  onChange={(e) => setFormData({ ...formData, cnasNumber: e.target.value })}
                  placeholder="CNAS-XXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="casnos">N° CASNOS</Label>
                <Input
                  id="casnos"
                  value={formData.casnosNumber || ''}
                  onChange={(e) => setFormData({ ...formData, casnosNumber: e.target.value })}
                  placeholder="CASNOS-XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* File Upload & Notes */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Documents & Notes
            </h4>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractUrl">URL du fichier contrat signé</Label>
                <Input
                  id="contractUrl"
                  value={formData.contractUrl || ''}
                  onChange={(e) => setFormData({ ...formData, contractUrl: e.target.value })}
                  placeholder="/files/contracts/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes internes</Label>
                <Textarea
                  id="notes"
                  value={formData.internalNotes || ''}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Notes internes sur ce contrat..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {contract ? 'Modifier' : 'Créer'} le Contrat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Simple Gift Icon for benefits section
function GiftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 12 20 22 4 22 4 12"></polyline>
      <rect x="2" y="7" width="20" height="5"></rect>
      <line x1="12" y1="22" x2="12" y2="7"></line>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
    </svg>
  )
}

// ============================================================
// LEAVE REQUEST MODAL COMPONENT
// ============================================================

function LeaveRequestModal({
  leave,
  isOpen,
  onClose,
  onSave,
  employees,
}: {
  leave: LeaveRequest | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<LeaveRequest>) => void
  employees: Employee[]
}) {
  const [formData, setFormData] = useState<Partial<LeaveRequest>>(leave || {
    type: 'annual',
    isHalfDay: false,
    halfDayPart: null,
    status: 'draft',
  })

  // Initialize form data from leave prop (using ref to track previous value)
  const prevLeaveRef = useRef(leave)

  useEffect(() => {
    // Only update if leave actually changed
    if (leave !== prevLeaveRef.current) {
      prevLeaveRef.current = leave
      if (leave) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- form initialization from prop
        setFormData(leave)
      } else {
        setFormData({
          type: 'annual',
          isHalfDay: false,
          halfDayPart: null,
          status: 'draft',
        })
      }
    }
  }, [leave])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate days count
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      
      if (formData.isHalfDay) diffDays -= 0.5
      
      onSave({ ...formData, daysCount: diffDays })
    } else {
      onSave(formData)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            {leave ? 'Modifier la Demande' : 'Nouvelle Demande de Congé'}
          </DialogTitle>
          <DialogDescription>
            {leave ? `Demande #${leave.id}` : 'Créer une nouvelle demande de congé'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Employee Selection */}
          {!leave && (
            <div className="space-y-2">
              <Label htmlFor="employee">Employé *</Label>
              <Select
                value={formData.employeeId || ''}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v)
                  setFormData({ ...formData, employeeId: v, employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Leave Type with Icons */}
          <div className="space-y-2">
            <Label>Type de congé *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(LEAVE_TYPES).map(([key, { label, icon: Icon, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: key as LeaveRequest['type'] })}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                    formData.type === key 
                      ? `${color} border-current` 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Half Day Option */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="halfDay"
                checked={formData.isHalfDay}
                onCheckedChange={(checked) => setFormData({ ...formData, isHalfDay: !!checked })}
              />
              <Label htmlFor="halfDay">Demi-journée</Label>
            </div>
            
            {formData.isHalfDay && (
              <RadioGroup
                value={formData.halfDayPart || 'morning'}
                onValueChange={(v) => setFormData({ ...formData, halfDayPart: v as 'morning' | 'evening' })}
                className="flex gap-4 ml-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <Label htmlFor="morning">Matin</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="evening" id="evening" />
                  <Label htmlFor="evening">Après-midi</Label>
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif / Raison</Label>
            <Textarea
              id="reason"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Décrivez la raison de cette demande..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {leave ? 'Modifier' : 'Soumettre'} la Demande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  // Contracts State
  const [contracts, setContracts] = useState<Contract[]>(generateMockContracts())
  const [contractsLoading, setContractsLoading] = useState(false)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [contractFilters, setContractFilters] = useState({ status: 'all', type: 'all' })
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; contract: Contract | null }>({ open: false, action: '', contract: null })

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveRequest[]>(generateMockLeaves())
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [leaveFilters, setLeaveFilters] = useState({ status: 'all', type: 'all' })
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; leave: LeaveRequest | null; action: 'approve' | 'reject'; reason: string }>({ open: false, leave: null, action: 'approve', reason: '' })

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(generateMockAttendance())
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceView, setAttendanceView] = useState<'my' | 'team'>('team')
  const [clockStatus, setClockStatus] = useState<'in' | 'out'>('in') // 'in' means can clock in, 'out' means can clock out
  const [lastClockTime, setLastClockTime] = useState<string | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState('all')

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

  // Contract stats
  const contractStats = useMemo(() => {
    const total = contracts.length
    const active = contracts.filter(c => c.status === 'active').length
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringSoon = contracts.filter(c => {
      if (!c.endDate) return false
      const endDate = new Date(c.endDate)
      return endDate <= thirtyDaysFromNow && c.status === 'active'
    }).length
    const pendingRenewals = contracts.filter(c => c.status === 'expired' || c.status === 'terminated').length
    
    return { total, active, expiringSoon, pendingRenewals }
  }, [contracts])

  // Leave stats
  const leaveStats = useMemo(() => {
    const pendingApprovals = leaves.filter(l => l.status === 'submitted').length
    const today = new Date().toISOString().split('T')[0]
    const onLeaveToday = leaves.filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today).length
    const currentMonth = new Date().toISOString().slice(0, 7)
    const totalDaysThisMonth = leaves
      .filter(l => l.status === 'approved' && l.startDate.startsWith(currentMonth))
      .reduce((sum, l) => sum + l.daysCount, 0)
    const quarterStart = new Date()
    quarterStart.setMonth(quarterStart.getMonth() - (quarterStart.getMonth() % 3))
    const sickLeaveQuarter = leaves
      .filter(l => l.type === 'sickness' && l.status === 'approved' && l.startDate >= quarterStart.toISOString().slice(0, 10))
      .reduce((sum, l) => sum + l.daysCount, 0)
    
    return { pendingApprovals, onLeaveToday, totalDaysThisMonth, sickLeaveQuarter }
  }, [leaves])

  // Attendance stats
  const attendanceStats = useMemo(() => {
    const present = attendanceRecords.filter(r => r.status === 'present').length
    const late = attendanceRecords.filter(r => r.status === 'late').length
    const absent = attendanceRecords.filter(r => r.status === 'absent').length
    const onLeave = attendanceRecords.filter(r => r.status === 'on_leave').length
    const totalWorkedHours = attendanceRecords.reduce((sum, r) => sum + r.workedHours, 0)
    const totalOvertime = attendanceRecords.reduce((sum, r) => sum + r.overtimeHours, 0)
    
    return { present, late, absent, onLeave, totalWorkedHours, totalOvertime }
  }, [attendanceRecords])

  // Unique departments for filter
  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[]
    return depts.sort()
  }, [employees])

  // Unique attendance departments
  const attendanceDepartments = useMemo(() => {
    const depts = [...new Set(attendanceRecords.map(r => r.department).filter(Boolean))] as string[]
    return depts.sort()
  }, [attendanceRecords])

  // Handle employee click
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsModalOpen(true)
  }

  // Contract handlers
  const handleCreateContract = () => {
    setSelectedContract(null)
    setContractModalOpen(true)
  }

  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract)
    setContractModalOpen(true)
  }

  const handleSaveContract = async (data: Partial<Contract>) => {
    try {
      if (selectedContract) {
        // Update existing contract
        setContracts(prev => prev.map(c => c.id === selectedContract.id ? { ...c, ...data } as Contract : c))
        toast.success('Contrat modifié avec succès')
      } else {
        // Create new contract
        const newContract: Contract = {
          id: String(Date.now()),
          reference: `CTR-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
          employeeId: data.employeeId || '',
          employeeName: data.employeeName || '',
          type: data.type || 'CDI',
          status: data.status || 'draft',
          startDate: data.startDate || '',
          endDate: data.endDate || null,
          trialEndDate: data.trialEndDate || null,
          baseSalary: data.baseSalary || 0,
          currency: data.currency || 'DZD',
          paymentFrequency: data.paymentFrequency || 'monthly',
          department: data.department || '',
          jobTitle: data.jobTitle || '',
          grade: data.grade || '',
          weeklyHours: data.weeklyHours || 40,
          annualLeaveDays: data.annualLeaveDays || 30,
          transportAllowance: data.transportAllowance || 0,
          housingAllowance: data.housingAllowance || 0,
          foodAllowance: data.foodAllowance || 0,
          nssNumber: data.nssNumber || '',
          cnasNumber: data.cnasNumber || '',
          casnosNumber: data.casnosNumber || '',
          contractUrl: data.contractUrl || null,
          internalNotes: data.internalNotes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setContracts(prev => [...prev, newContract])
        toast.success('Contrat créé avec succès')
      }
      setContractModalOpen(false)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde du contrat')
    }
  }

  const handleContractAction = (action: string, contract: Contract) => {
    setConfirmDialog({ open: true, action, contract })
  }

  const confirmContractAction = async () => {
    if (!confirmDialog.contract) return
    
    const { action, contract } = confirmDialog
    let newStatus: Contract['status'] = contract.status
    
    switch (action) {
      case 'activate':
        newStatus = 'active'
        toast.success(`Contrat ${contract.reference} activé`)
        break
      case 'terminate':
        newStatus = 'terminated'
        toast.success(`Contrat ${contract.reference} résilié`)
        break
      case 'suspend':
        newStatus = 'suspended'
        toast.success(`Contrat ${contract.reference} suspendu`)
        break
    }
    
    setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: newStatus } : c))
    setConfirmDialog({ open: false, action: '', contract: null })
  }

  // Leave handlers
  const handleCreateLeave = () => {
    setSelectedLeave(null)
    setLeaveModalOpen(true)
  }

  const handleEditLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave)
    setLeaveModalOpen(true)
  }

  const handleSaveLeave = async (data: Partial<LeaveRequest>) => {
    try {
      if (selectedLeave) {
        setLeaves(prev => prev.map(l => l.id === selectedLeave.id ? { ...l, ...data } as LeaveRequest : l))
        toast.success('Demande modifiée avec succès')
      } else {
        const newLeave: LeaveRequest = {
          id: String(Date.now()),
          employeeId: data.employeeId || '',
          employeeName: data.employeeName || '',
          type: data.type || 'annual',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          daysCount: data.daysCount || 0,
          isHalfDay: data.isHalfDay || false,
          halfDayPart: data.halfDayPart || null,
          status: 'submitted',
          reason: data.reason || null,
          rejectionReason: null,
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setLeaves(prev => [...prev, newLeave])
        toast.success('Demande soumise avec succès')
      }
      setLeaveModalOpen(false)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde de la demande')
    }
  }

  const handleLeaveApproval = (leave: LeaveRequest, action: 'approve' | 'reject') => {
    setApprovalDialog({ open: true, leave, action, reason: '' })
  }

  const confirmLeaveAction = async () => {
    if (!approvalDialog.leave) return
    
    const { leave, action, reason } = approvalDialog
    
    if (action === 'approve') {
      setLeaves(prev => prev.map(l => 
        l.id === leave.id 
          ? { ...l, status: 'approved', approvedBy: 'current_user', approvedAt: new Date().toISOString() } 
          : l
      ))
      toast.success(`Demande approuvée pour ${leave.employeeName}`)
    } else {
      setLeaves(prev => prev.map(l => 
        l.id === leave.id 
          ? { ...l, status: 'rejected', rejectionReason: reason } 
          : l
      ))
      toast.success(`Demande rejetée pour ${leave.employeeName}`)
    }
    
    setApprovalDialog({ open: false, leave: null, action: 'approve', reason: '' })
  }

  // Attendance handlers
  const handleClockInOut = () => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
    
    if (clockStatus === 'in') {
      // Clock in
      setClockStatus('out')
      setLastClockTime(timeStr)
      toast.success(`Pointage entrée à ${timeStr}`)
    } else {
      // Clock out
      setClockStatus('in')
      setLastClockTime(timeStr)
      toast.success(`Pointage sortie à ${timeStr}`)
    }
  }

  // Filtered data
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      if (contractFilters.status !== 'all' && c.status !== contractFilters.status) return false
      if (contractFilters.type !== 'all' && c.type !== contractFilters.type) return false
      return true
    })
  }, [contracts, contractFilters])

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (leaveFilters.status !== 'all' && l.status !== leaveFilters.status) return false
      if (leaveFilters.type !== 'all' && l.type !== leaveFilters.type) return false
      return true
    })
  }, [leaves, leaveFilters])

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (attendanceDeptFilter !== 'all' && r.department !== attendanceDeptFilter) return false
      return true
    })
  }, [attendanceRecords, attendanceDeptFilter])

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status]
    return (
      <Badge variant="outline" className={config?.className || ''}>
        {config?.label || status}
      </Badge>
    )
  }

  // Contract Status Badge
  const ContractStatusBadge = ({ status }: { status: string }) => {
    const config = CONTRACT_STATUS_CONFIG[status]
    return (
      <Badge className={config?.color || ''}>
        {config?.label || status}
      </Badge>
    )
  }

  // Contract Type Badge
  const ContractTypeBadge = ({ type }: { type: string }) => {
    const config = CONTRACT_TYPE_CONFIG[type]
    return (
      <Badge className={config?.color || ''}>
        {config?.label || type}
      </Badge>
    )
  }

  // Leave Status Badge
  const LeaveStatusBadge = ({ status }: { status: string }) => {
    const config = LEAVE_STATUS_CONFIG[status]
    return (
      <Badge className={config?.color || ''}>
        {config?.label || status}
      </Badge>
    )
  }

  // Leave Type Badge
  const LeaveTypeBadge = ({ type }: { type: string }) => {
    const config = LEAVE_TYPES[type]
    if (!config) return <Badge>{type}</Badge>
    const Icon = config.icon
    return (
      <Badge className={config.color} variant="outline">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Attendance Status Badge
  const AttendanceStatusBadge = ({ status }: { status: string }) => {
    const config = ATTENDANCE_STATUS_CONFIG[status]
    return (
      <Badge className={config?.color || ''}>
        <span className={`w-2 h-2 rounded-full mr-1.5 ${config?.dotColor}`} />
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
            Gestion des employés, contrats, congés et paie
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
        <TabsList className="grid w-full grid-cols-4 lg:w-[auto] lg:inline-grid lg:min-w-[600px]">
          <TabsTrigger value="employes" className="gap-2">
            <Users className="w-4 h-4" />
            Employés
          </TabsTrigger>
          <TabsTrigger value="contrats" className="gap-2">
            <FileSignature className="w-4 h-4" />
            Contrats
          </TabsTrigger>
          <TabsTrigger value="conges" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            Congés
          </TabsTrigger>
          <TabsTrigger value="presence" className="gap-2">
            <Activity className="w-4 h-4" />
            Présence
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
        {/* CONTRATS TAB (NEW) */}
        {/* ============================================================ */}
        <TabsContent value="contrats" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* KPI Cards for Contracts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Contrats"
                value={contractStats.total}
                icon={FileSignature}
                iconColor="text-blue-600"
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                format="number"
                delay={0}
              />
              <KpiCard
                title="Contrats Actifs"
                value={contractStats.active}
                icon={CheckCircle2}
                iconColor="text-green-600"
                iconBg="bg-green-100 dark:bg-green-900/30"
                format="number"
                delay={0.05}
              />
              <KpiCard
                title="Expiration Ce Mois"
                value={contractStats.expiringSoon}
                icon={AlertCircle}
                iconColor="text-orange-600"
                iconBg="bg-orange-100 dark:bg-orange-900/30"
                format="number"
                delay={0.1}
              />
              <KpiCard
                title="Renouvellements"
                value={contractStats.pendingRenewals}
                icon={RefreshCw}
                iconColor="text-purple-600"
                iconBg="bg-purple-100 dark:bg-purple-900/30"
                format="number"
                delay={0.15}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <FileSignature className="w-5 h-5" />
                      Gestion des Contrats
                    </CardTitle>
                    <Badge variant="secondary">
                      {filteredContracts.length} contrat{filteredContracts.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleCreateContract} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nouveau Contrat
                    </Button>
                    
                    <Select value={contractFilters.status} onValueChange={(v) => setContractFilters(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="suspended">Suspendu</SelectItem>
                        <SelectItem value="terminated">Résilié</SelectItem>
                        <SelectItem value="expired">Expiré</SelectItem>
                        <SelectItem value="renewed">Renouvelé</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={contractFilters.type} onValueChange={(v) => setContractFilters(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {Object.entries(CONTRACT_TYPE_CONFIG).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <TableSkeleton rows={5} />
                ) : filteredContracts.length === 0 ? (
                  <EmptyState type="contracts" />
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Référence</TableHead>
                          <TableHead>Employé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Date Début</TableHead>
                          <TableHead>Date Fin</TableHead>
                          <TableHead>Salaire Base</TableHead>
                          <TableHead>Département</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredContracts.map((contract) => (
                            <motion.tr
                              key={contract.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell className="font-mono text-xs font-medium">
                                {contract.reference}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium hover:text-primary cursor-pointer hover:underline"
                                  onClick={() => handleEditContract(contract)}>
                                  {contract.employeeName}
                                </span>
                              </TableCell>
                              <TableCell>
                                <ContractTypeBadge type={contract.type} />
                              </TableCell>
                              <TableCell>
                                <ContractStatusBadge status={contract.status} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(contract.startDate)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(contract.endDate)}
                              </TableCell>
                              <TableCell className="font-medium text-green-600">
                                {formatCurrency(contract.baseSalary)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{contract.department}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditContract(contract)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditContract(contract)}>
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  {(contract.status === 'draft' || contract.status === 'suspended') && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleContractAction('activate', contract)}>
                                      <Power className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {(contract.status === 'active' || contract.status === 'suspended') && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleContractAction('terminate', contract)}>
                                      <Ban className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* CONGÉS TAB (ENHANCED) */}
        {/* ============================================================ */}
        <TabsContent value="conges" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* KPI Cards for Leaves */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Approbations en Attente"
                value={leaveStats.pendingApprovals}
                icon={Send}
                iconColor="text-yellow-600"
                iconBg="bg-yellow-100 dark:bg-yellow-900/30"
                format="number"
                delay={0}
              />
              <KpiCard
                title="En Congé Aujourd'hui"
                value={leaveStats.onLeaveToday}
                icon={Plane}
                iconColor="text-blue-600"
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                format="number"
                delay={0.05}
              />
              <KpiCard
                title="Jours Ce Mois"
                value={leaveStats.totalDaysThisMonth}
                icon={Calendar}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                format="number"
                delay={0.1}
              />
              <KpiCard
                title="Maladie Ce Trimestre"
                value={leaveStats.sickLeaveQuarter}
                icon={Heart}
                iconColor="text-red-600"
                iconBg="bg-red-100 dark:bg-red-900/30"
                format="number"
                delay={0.15}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Gestion des Congés
                    </CardTitle>
                    <Badge variant="secondary">
                      {filteredLeaves.length} demande{filteredLeaves.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleCreateLeave} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nouvelle Demande
                    </Button>
                    
                    <Select value={leaveFilters.status} onValueChange={(v) => setLeaveFilters(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="submitted">Soumise</SelectItem>
                        <SelectItem value="approved">Approuvé</SelectItem>
                        <SelectItem value="rejected">Rejetée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={leaveFilters.type} onValueChange={(v) => setLeaveFilters(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {Object.entries(LEAVE_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {leavesLoading ? (
                  <TableSkeleton rows={5} />
                ) : filteredLeaves.length === 0 ? (
                  <EmptyState type="leaves" />
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employé</TableHead>
                          <TableHead>Type de Congé</TableHead>
                          <TableHead>Date Début</TableHead>
                          <TableHead>Date Fin</TableHead>
                          <TableHead>Jours</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Motif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredLeaves.map((leave) => (
                            <motion.tr
                              key={leave.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getInitials(leave.employeeName.split(' ')[0], leave.employeeName.split(' ')[1] || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{leave.employeeName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <LeaveTypeBadge type={leave.type} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(leave.startDate)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(leave.endDate)}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {leave.daysCount}{leave.isHalfDay ? '.5' : ''}j
                              </TableCell>
                              <TableCell>
                                <LeaveStatusBadge status={leave.status} />
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                                {leave.reason || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {leave.status === 'submitted' && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleLeaveApproval(leave, 'approve')}
                                      >
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Approuver
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleLeaveApproval(leave, 'reject')}
                                      >
                                        <UserX className="w-4 h-4 mr-1" />
                                        Rejeter
                                      </Button>
                                    </>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditLeave(leave)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* PRÉSENCE TAB (ENHANCED) */}
        {/* ============================================================ */}
        <TabsContent value="presence" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* View Toggle & Clock In/Out */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Clock In/Out Card */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Timer className="w-5 h-5" />
                    Pointage
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {clockStatus === 'in' ? "Prêt à pointer l'entrée" : "Prêt à pointer la sortie"}
                    </p>
                    {lastClockTime && (
                      <p className="text-xs text-muted-foreground">
                        Dernier pointage: {lastClockTime}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    size="lg"
                    className={`w-full h-20 text-lg font-bold gap-3 transition-all ${
                      clockStatus === 'in' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    onClick={handleClockInOut}
                  >
                    {clockStatus === 'in' ? (
                      <>
                        <LogIn className="w-8 h-8" />
                        POINTER L'ENTRÉE
                      </>
                    ) : (
                      <>
                        <LogOut className="w-8 h-8" />
                        POINTER LA SORTIE
                      </>
                    )}
                  </Button>
                  
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Heures aujourd'hui</p>
                      <p className="text-xl font-bold">{attendanceStats.totalWorkedHours.toFixed(1)}h</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Heures sup.</p>
                      <p className="text-xl font-bold text-orange-600">{attendanceStats.totalOvertime.toFixed(1)}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Attendance View */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Suivi de Présence
                      </CardTitle>
                      
                      {/* View Toggle */}
                      <div className="flex rounded-lg border p-1">
                        <button
                          onClick={() => setAttendanceView('my')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            attendanceView === 'my' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Ma Présence
                        </button>
                        <button
                          onClick={() => setAttendanceView('team')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            attendanceView === 'team' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Équipe
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-auto"
                      />
                      {attendanceView === 'team' && (
                        <Select value={attendanceDeptFilter} onValueChange={setAttendanceDeptFilter}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Département" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            {attendanceDepartments.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs font-medium text-green-700">Présents</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-xs font-medium text-orange-700">En retard</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{attendanceStats.late}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-xs font-medium text-red-700">Absents</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-medium text-blue-700">En congé</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{attendanceStats.onLeave}</p>
                    </div>
                  </div>

                  {/* Attendance Table */}
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employé</TableHead>
                          <TableHead>Département</TableHead>
                          <TableHead>Entrée</TableHead>
                          <TableHead>Sortie</TableHead>
                          <TableHead>Heures Travaillées</TableHead>
                          <TableHead>H.Sup.</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredAttendance.map((record) => (
                            <motion.tr
                              key={record.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getInitials(record.employeeName.split(' ')[0], record.employeeName.split(' ')[1] || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{record.employeeName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {record.department ? (
                                  <Badge variant="secondary" className="text-xs">{record.department}</Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {record.clockIn || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {record.clockOut || '-'}
                              </TableCell>
                              <TableCell className="font-medium">
                                {record.workedHours > 0 ? `${record.workedHours.toFixed(2)}h` : '-'}
                              </TableCell>
                              <TableCell className="font-medium text-orange-600">
                                {record.overtimeHours > 0 ? `+${record.overtimeHours.toFixed(2)}h` : '-'}
                              </TableCell>
                              <TableCell>
                                <AttendanceStatusBadge status={record.status} />
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                                {record.notes || '-'}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Export Button */}
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Exporter CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Contract Modal */}
      <ContractModal
        contract={selectedContract}
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        onSave={handleSaveContract}
        employees={employees}
      />

      {/* Leave Request Modal */}
      <LeaveRequestModal
        leave={selectedLeave}
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSave={handleSaveLeave}
        employees={employees}
      />

      {/* Contract Action Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(d => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'activate' ? 'Activer le Contrat' :
               confirmDialog.action === 'terminate' ? 'Résilier le Contrat' :
               'Suspendre le Contrat'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir {confirmDialog.action === 'activate' ? 'activer' : 
                confirmDialog.action === 'terminate' ? 'résilier' : 'suspendre'} le contrat{' '}
              <strong>{confirmDialog.contract?.reference}</strong> de{' '}
              <strong>{confirmDialog.contract?.employeeName}</strong> ?
              {confirmDialog.action === 'terminate' && (
                <span className="block mt-2 text-destructive">
                  Cette action est irréversible.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmContractAction}
              className={
                confirmDialog.action === 'terminate' 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : ''
              }
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Approval Dialog */}
      <AlertDialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog(d => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {approvalDialog.action === 'approve' ? (
                <><UserCheck className="w-5 h-5 text-green-600" /> Approuver la Demande</>
              ) : (
                <><UserX className="w-5 h-5 text-red-600" /> Rejeter la Demande</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog.action === 'approve' 
                ? `Voulez-vous approuver la demande de congé de ${approvalDialog.leave?.employeeName} ?`
                : `Voulez-vous rejeter la demande de congé de ${approvalDialog.leave?.employeeName} ?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {approvalDialog.action === 'reject' && (
            <div className="py-4">
              <Label htmlFor="rejectionReason">Motif du rejet *</Label>
              <Textarea
                id="rejectionReason"
                value={approvalDialog.reason}
                onChange={(e) => setApprovalDialog(d => ({ ...d, reason: e.target.value }))}
                placeholder="Expliquez la raison du rejet..."
                rows={3}
                className="mt-2"
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveAction}
              className={
                approvalDialog.action === 'reject' 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }
            >
              {approvalDialog.action === 'approve' ? 'Approuver' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
