'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  FileText,
  Upload,
  Search,
  Grid3X3,
  List,
  Filter,
  Download,
  Eye,
  Edit3,
  Archive,
  Trash2,
  MoreVertical,
  X,
  Plus,
  Lock,
  Unlock,
  Users,
  DollarSign,
  Shield,
  Wrench,
  Briefcase,
  Package,
  CreditCard,
  File,
  ImageIcon,
  FileType,
  Table as TableSheet,
  ArchiveIcon as ArchiveIcon2,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  Clock,
  HardDrive,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileSearch,
  Link2,
  History,
  UserCheck,
  Paperclip,
  ZoomIn,
  Copy,
  RotateCcw,
  Layers,
  LayoutGrid
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface DocumentUser {
  id: string
  name: string
  email?: string
  avatar?: string
}

interface Document {
  id: string
  name: string
  description?: string | null
  fileName: string
  fileSize: number
  mimeType?: string | null
  category: DocumentCategoryType
  tags: string[]
  fileUrl: string
  thumbnailUrl?: string | null
  version: number
  isConfidential: boolean
  status: 'active' | 'archived' | 'deleted' | 'pending_approval'
  entityType?: string | null
  entityId?: string | null
  uploadedBy: DocumentUser
  createdAt: string
  updatedAt: string
  versions?: DocumentVersion[]
}

interface DocumentVersion {
  id: string
  name: string
  fileName: string
  version: number
  createdAt: string
}

type DocumentCategoryType = 'hr' | 'finance' | 'legal' | 'administrative' | 'technical' | 'commercial' | 'inventory' | 'payroll' | 'other'

type ViewMode = 'grid' | 'list'

interface Filters {
  category: string
  entityType: string
  dateFrom: string
  dateTo: string
  tags: string[]
  confidentialOnly: boolean
  search: string
  status: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================================
// CONSTANTS & CONFIGURATIONS
// ============================================================

const CATEGORY_CONFIG: Record<DocumentCategoryType, { label: string; color: string; bgColor: string; icon: typeof FileText }> = {
  hr: { label: 'RH', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Users },
  finance: { label: 'Finance', color: 'text-green-700', bgColor: 'bg-green-100', icon: DollarSign },
  legal: { label: 'Juridique', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Shield },
  administrative: { label: 'Administratif', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText },
  technical: { label: 'Technique', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Wrench },
  commercial: { label: 'Commercial', color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Briefcase },
  inventory: { label: 'Inventaire', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Package },
  payroll: { label: 'Paie', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CreditCard },
  other: { label: 'Autre', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: File },
}

const ENTITY_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'employee', label: 'Employé' },
  { value: 'contract', label: 'Contrat' },
  { value: 'invoice', label: 'Facture' },
  { value: 'po', label: 'Bon de commande' },
  { value: 'quote', label: 'Devis' },
  { value: 'project', label: 'Projet' },
  { value: 'expense', label: 'Dépense' },
  { value: 'leave', label: 'Congé' },
  { value: 'other', label: 'Autre' },
]

const STATUS_CONFIG = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archivé', color: 'bg-yellow-100 text-yellow-700' },
  deleted: { label: 'Supprimé', color: 'bg-red-100 text-red-700' },
  pending_approval: { label: 'En attente', color: 'bg-blue-100 text-blue-700' },
}

const FILE_TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileText, color: 'text-red-500 bg-red-50' },
  jpg: { icon: ImageIcon, color: 'text-blue-500 bg-blue-50' },
  jpeg: { icon: ImageIcon, color: 'text-blue-500 bg-blue-50' },
  png: { icon: ImageIcon, color: 'text-blue-500 bg-blue-50' },
  gif: { icon: ImageIcon, color: 'text-purple-500 bg-purple-50' },
  svg: { icon: ImageIcon, color: 'text-orange-500 bg-orange-50' },
  doc: { icon: FileType, color: 'text-blue-600 bg-blue-50' },
  docx: { icon: FileType, color: 'text-blue-600 bg-blue-50' },
  xls: { icon: TableSheet, color: 'text-green-600 bg-green-50' },
  xlsx: { icon: TableSheet, color: 'text-green-600 bg-green-50' },
  csv: { icon: TableSheet, color: 'text-green-600 bg-green-50' },
  zip: { icon: ArchiveIcon2, color: 'text-orange-500 bg-orange-50' },
  rar: { icon: ArchiveIcon2, color: 'text-orange-500 bg-orange-50' },
  '7z': { icon: ArchiveIcon2, color: 'text-orange-500 bg-orange-50' },
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function getFileTypeConfig(mimeType?: string | null, fileName?: string): { icon: typeof FileText; color: string } {
  if (mimeType) {
    const ext = mimeType.split('/')[1] || ''
    if (FILE_TYPE_CONFIG[ext]) return FILE_TYPE_CONFIG[ext]
  }
  if (fileName) {
    const ext = getFileExtension(fileName)
    if (FILE_TYPE_CONFIG[ext]) return FILE_TYPE_CONFIG[ext]
  }
  return { icon: File, color: 'text-gray-500 bg-gray-50' }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DocumentsPage() {
  // State Management
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Filter State
  const [filters, setFilters] = useState<Filters>({
    category: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
    tags: [],
    confidentialOnly: false,
    search: '',
    status: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [tagInput, setTagInput] = useState('')
  
  // Pagination State
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  
  // Modal States
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  
  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    name: '',
    description: '',
    category: 'other' as DocumentCategoryType,
    tags: [] as string[],
    entityType: '',
    entityId: '',
    isConfidential: false,
    allowedRoles: [] as string[],
    allowedUsers: [] as string[],
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Stats State
  const [stats, setStats] = useState({
    totalDocuments: 0,
    storageUsed: 0,
    documentsThisMonth: 0,
    confidentialCount: 0,
    pendingApproval: 0,
  })

  // ============================================================
  // API CALLS
  // ============================================================

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category && filters.category !== 'all') params.append('category', filters.category)
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.search) params.append('search', filters.search)
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetch(`/api/documents?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDocuments(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }))
        
        // Calculate stats from data or fetch separately
        calculateStats(data.data)
      } else {
        toast.error(data.error || 'Erreur lors du chargement des documents')
      }
    } catch (error) {
      console.error('Fetch documents error:', error)
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  const calculateStats = useCallback((docs?: Document[]) => {
    const docsToUse = docs || documents
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    setStats({
      totalDocuments: pagination.total || docsToUse.length,
      storageUsed: docsToUse.reduce((acc, doc) => acc + doc.fileSize, 0),
      documentsThisMonth: docsToUse.filter(doc => new Date(doc.createdAt) >= startOfMonth).length,
      confidentialCount: docsToUse.filter(doc => doc.isConfidential).length,
      pendingApproval: docsToUse.filter(doc => doc.status === 'pending_approval').length,
    })
  }, [documents, pagination.total])

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return
    
    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || 'Document supprimé avec succès')
        fetchDocuments()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Delete document error:', error)
      toast.error('Erreur de connexion')
    } finally {
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleArchiveDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}?action=archive`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || 'Document archivé avec succès')
        fetchDocuments()
      } else {
        toast.error(data.error || 'Erreur lors de l\'archivage')
      }
    } catch (error) {
      console.error('Archive document error:', error)
      toast.error('Erreur de connexion')
    }
  }

  const handleRestoreDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}?action=restore`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || 'Document restauré avec succès')
        fetchDocuments()
      } else {
        toast.error(data.error || 'Erreur lors de la restauration')
      }
    } catch (error) {
      console.error('Restore document error:', error)
      toast.error('Erreur de connexion')
    }
  }

  const handleUploadDocument = async () => {
    if (uploadForm.files.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < uploadForm.files.length; i++) {
        const file = uploadForm.files[i]
        const progress = ((i + 1) / uploadForm.files.length) * 100
        setUploadProgress(progress)

        // Simulate file upload - in real app, use actual file upload service
        const formData = new FormData()
        formData.append('file', file)

        // Create a mock URL for demo purposes
        const fileUrl = URL.createObjectURL(file)
        
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: uploadForm.name || file.name.replace(/\.[^/.]+$/, ''),
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            description: uploadForm.description,
            category: uploadForm.category,
            tags: uploadForm.tags,
            entityType: uploadForm.entityType || null,
            entityId: uploadForm.entityId || null,
            isConfidential: uploadForm.isConfidential,
            allowedRoles: uploadForm.isConfidential ? uploadForm.allowedRoles : null,
            allowedUserIds: uploadForm.isConfidential ? uploadForm.allowedUsers : null,
            fileUrl: fileUrl,
            uploadedById: 'current-user-id', // Would get from auth context
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Erreur lors du téléversement')
        }
      }

      toast.success(`${uploadForm.files.length} document(s) téléversé(s) avec succès`)
      setUploadModalOpen(false)
      resetUploadForm()
      fetchDocuments()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléversement')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  const resetUploadForm = () => {
    setUploadForm({
      files: [],
      name: '',
      description: '',
      category: 'other',
      tags: [],
      entityType: '',
      entityId: '',
      isConfidential: false,
      allowedRoles: [],
      allowedUsers: [],
    })
    setTagInput('')
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files)
    setUploadForm(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
      name: prev.name || (newFiles[0]?.name.replace(/\.[^/.]+$/, '') || ''),
    }))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const removeFile = (index: number) => {
    setUploadForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !uploadForm.tags.includes(trimmedTag)) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }))
    }
    setTagInput('')
  }

  const removeUploadTag = (tag: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }

  const addFilterTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !filters.tags.includes(trimmedTag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }))
    }
    setTagInput('')
  }

  const removeFilterTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }

  const toggleSelectDocument = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  const openDocumentDetail = (doc: Document) => {
    setSelectedDocument(doc)
    setDetailDrawerOpen(true)
  }

  const openDeleteConfirm = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      entityType: '',
      dateFrom: '',
      dateTo: '',
      tags: [],
      confidentialOnly: false,
      search: '',
      status: '',
    })
  }

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds)
    
    switch (action) {
      case 'download':
        toast.info(`Téléchargement de ${ids.length} document(s)...`)
        break
      case 'archive':
        for (const id of ids) {
          const doc = documents.find(d => d.id === id)
          if (doc) await handleArchiveDocument(doc)
        }
        setSelectedIds(new Set())
        break
      case 'delete':
        toast.warning(`Suppression de ${ids.length} document(s)...`)
        break
      default:
        break
    }
  }

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderFileTypeIcon = (doc: Document) => {
    const config = getFileTypeConfig(doc.mimeType, doc.fileName)
    const Icon = config.icon
    
    return (
      <div className={cn('p-2 rounded-lg flex items-center justify-center', config.color)}>
        <Icon className="w-5 h-5" />
      </div>
    )
  }

  const renderCategoryBadge = (category: DocumentCategoryType) => {
    const config = CATEGORY_CONFIG[category]
    const Icon = config.icon
    
    return (
      <Badge variant="secondary" className={cn(config.bgColor, config.color, 'gap-1')}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return null
    
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const renderGridCard = (doc: Document) => {
    const config = getCategoryConfig(doc.category)
    const Icon = config.icon
    const fileTypeConfig = getFileTypeConfig(doc.mimeType, doc.fileName)
    const FileIcon = fileTypeConfig.icon

    return (
      <motion.div
        key={doc.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={cn(
            "group cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden",
            selectedIds.has(doc.id) && "ring-2 ring-primary"
          )}
          onClick={() => openDocumentDetail(doc)}
        >
          {/* Selection Checkbox */}
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={selectedIds.has(doc.id)}
              onCheckedChange={() => {
                toggleSelectDocument(doc.id)
              }}
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-background"
            />
          </div>

          {/* Action Menu */}
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocumentDetail(doc) }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Voir les détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(doc.fileUrl, '_blank') }}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveDocument(doc) }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); openDeleteConfirm(doc) }} 
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent className="p-6 pt-12">
            {/* File Type Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className={cn('p-4 rounded-xl', fileTypeConfig.color)}>
                <FileIcon className="w-10 h-10" />
              </div>
            </div>

            {/* File Name */}
            <h3 className="font-semibold text-sm truncate mb-2 text-center" title={doc.name}>
              {doc.name}
            </h3>

            {/* Category Badge */}
            <div className="flex justify-center mb-3">
              {renderCategoryBadge(doc.category)}
            </div>

            {/* Meta Info */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>{formatDate(doc.createdAt)}</span>
              </div>
              
              {/* Uploaded By */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={doc.uploadedBy.avatar} alt={doc.uploadedBy.name} />
                  <AvatarFallback className="text-[10px]">
                    {doc.uploadedBy.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{doc.uploadedBy.name}</span>
                
                {doc.isConfidential && (
                  <Lock className="w-3 h-3 ml-auto text-amber-500" />
                )}
              </div>
            </div>

            {/* Version Badge */}
            {doc.version > 1 && (
              <div className="mt-2 flex justify-center">
                <Badge variant="outline" className="text-xs">
                  v{doc.version}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderListRow = (doc: Document) => {
    const fileTypeConfig = getFileTypeConfig(doc.mimeType, doc.fileName)
    const FileIcon = fileTypeConfig.icon

    return (
      <motion.tr
        key={doc.id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "group cursor-pointer hover:bg-muted/50 transition-colors",
          selectedIds.has(doc.id) && "bg-primary/5"
        )}
        onClick={() => openDocumentDetail(doc)}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(doc.id)}
            onCheckedChange={() => toggleSelectDocument(doc.id)}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg shrink-0', fileTypeConfig.color)}>
              <FileIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate max-w-[200px]" title={doc.name}>
                {doc.name}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {doc.fileName}
              </p>
            </div>
            {doc.isConfidential && (
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>
        </TableCell>
        <TableCell>{renderCategoryBadge(doc.category)}</TableCell>
        <TableCell>
          {doc.entityType ? (
            <Badge variant="outline" className="text-xs">
              {ENTITY_TYPES.find(e => e.value === doc.entityType)?.label || doc.entityType}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-sm">{formatFileSize(doc.fileSize)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={doc.uploadedBy.avatar} alt={doc.uploadedBy.name} />
              <AvatarFallback className="text-[9px]">
                {doc.uploadedBy.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{doc.uploadedBy.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm">{formatDate(doc.createdAt)}</TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            v{doc.version}
          </Badge>
        </TableCell>
        <TableCell>{renderStatusBadge(doc.status)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDocumentDetail(doc)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {doc.status === 'active' && (
                <DropdownMenuItem onClick={() => handleArchiveDocument(doc)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
              )}
              {doc.status === 'deleted' && (
                <DropdownMenuItem onClick={() => handleRestoreDocument(doc)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => openDeleteConfirm(doc)} 
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </motion.tr>
    )
  }

  const getCategoryConfig = (category: DocumentCategoryType) => CATEGORY_CONFIG[category]

  // ============================================================
  // SKELETON LOADERS
  // ============================================================

  const renderGridSkeleton = () => (
    Array.from({ length: 8 }).map((_, i) => (
      <Card key={i} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-5 w-20 mx-auto mb-4" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    ))
  )

  const renderListSkeleton = () => (
    Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded" /><Skeleton className="h-4 w-32" /></div></TableCell>
        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-5 w-14 rounded" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><div className="flex items-center gap-2"><Skeleton className="w-6 h-6 rounded-full" /><Skeleton className="h-4 w-20" /></div></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-8 rounded" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
      </TableRow>
    ))
  )

  // ============================================================
  // EMPTY STATE
  // ============================================================

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <FolderOpen className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Aucun document trouvé</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        {filters.search || filters.category || filters.entityType || filters.tags.length > 0
          ? 'Essayez de modifier vos filtres pour trouver ce que vous cherchez.'
          : 'Commencez par télécharger votre premier document.'}
      </p>
      {(filters.search || filters.category || filters.entityType || filters.tags.length > 0) ? (
        <Button variant="outline" onClick={clearFilters}>
          <Filter className="w-4 h-4 mr-2" />
          Effacer les filtres
        </Button>
      ) : (
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Télécharger un document
        </Button>
      )}
    </motion.div>
  )

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="min-h-screen space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Gestion Documentaire
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez et organisez tous vos documents d&apos;entreprise
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {(filters.category || filters.entityType || filters.tags.length > 0 || filters.confidentialOnly) && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {[filters.category, filters.entityType, ...filters.tags].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          
          <Button
            size="lg"
            onClick={() => setUploadModalOpen(true)}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            <Upload className="w-5 h-5 mr-2" />
            Télécharger
          </Button>
        </div>
      </motion.div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Documents"
          value={stats.totalDocuments}
          icon={Layers}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          delay={0}
        />
        <KpiCard
          title="Stockage Utilisé"
          value={formatFileSize(stats.storageUsed)}
          icon={HardDrive}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          delay={0.05}
        />
        <KpiCard
          title="Ce Mois"
          value={stats.documentsThisMonth}
          icon={Calendar}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          change={12.5}
          delay={0.1}
        />
        <KpiCard
          title="Confidentiels"
          value={stats.confidentialCount}
          icon={Lock}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          delay={0.15}
        />
        <KpiCard
          title="En Attente"
          value={stats.pendingApproval}
          icon={Clock}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
          delay={0.2}
        />
      </div>

      {/* Search & View Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des documents..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              {/* Quick Category Filter */}
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {(Object.keys(CATEGORY_CONFIG) as DocumentCategoryType[]).map(key => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {(() => { const C = CATEGORY_CONFIG[key].icon; return <C className="w-4 h-4" /> })()}
                        {CATEGORY_CONFIG[key].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                  <SelectItem value="deleted">Supprimé</SelectItem>
                  <SelectItem value="pending_approval">En attente</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Entity Type */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Type d&apos;entité</Label>
                      <Select
                        value={filters.entityType}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range From */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Date début</Label>
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      />
                    </div>

                    {/* Date Range To */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Date fin</Label>
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Tags</Label>
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[38px]">
                        {filters.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeFilterTag(tag)}>
                            {tag}
                            <X className="w-3 h-3" />
                          </Badge>
                        ))}
                        <Input
                          placeholder="Ajouter un tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addFilterTag(tagInput)
                            }
                          }}
                          className="border-0 p-0 h-6 focus-visible:ring-0 shadow-none"
                        />
                      </div>
                    </div>

                    {/* Confidential Only Toggle */}
                    <div className="flex items-end pb-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="confidential-filter"
                          checked={filters.confidentialOnly}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, confidentialOnly: checked }))}
                        />
                        <Label htmlFor="confidential-filter" className="cursor-pointer">
                          Confidentiels uniquement
                        </Label>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end pb-2">
                      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Réinitialiser
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      {selectedIds.size} document(s) sélectionné(s)
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Désélectionner
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('download')}>
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archiver
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {renderGridSkeleton()}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderListSkeleton()}</TableBody>
              </Table>
            </Card>
          )
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              {renderEmptyState()}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {documents.map(renderGridCard)}
            </AnimatePresence>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === documents.length && documents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {documents.map(renderListRow)}
                </AnimatePresence>
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Affichage de {(pagination.page - 1) * pagination.limit + 1} à{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                  {pagination.total} documents
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/* UPLOAD MODAL */}
      {/* ============================================================ */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => { setUploadModalOpen(open); if (!open) resetUploadForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Télécharger un document
            </DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau document à votre bibliothèque
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Drag & Drop Zone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                uploadForm.files.length > 0 && "pb-2"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.svg,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.7z"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <Upload className={cn("w-12 h-12 mx-auto mb-4", dragActive ? "text-primary" : "text-muted-foreground")} />
              <p className="text-lg font-medium mb-2">
                {dragActive ? 'Déposez les fichiers ici...' : 'Glissez-déposez vos fichiers'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, Images, Word, Excel, Archives (Max 50MB par fichier)
              </p>

              {/* Selected Files Preview */}
              {uploadForm.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Separator />
                  <p className="text-sm font-medium pt-2">
                    Fichiers sélectionnés ({uploadForm.files.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {uploadForm.files.map((file, index) => {
                      const ext = getFileExtension(file.name)
                      const typeConfig = FILE_TYPE_CONFIG[ext] || { icon: File, color: 'text-gray-500' }
                      const FileIcon = typeConfig.icon
                      
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                        >
                          <FileIcon className={cn("w-5 h-5 shrink-0", typeConfig.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          {/* Image Preview */}
                          {file.type.startsWith('image/') && (
                            <img
                              src={URL.createObjectURL(file)}
                              alt=""
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(index)
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Téléversement en cours...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Name */}
              <div>
                <Label htmlFor="doc-name" className="mb-2 block">Nom du document *</Label>
                <Input
                  id="doc-name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom affiché"
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="doc-category" className="mb-2 block">Catégorie *</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value: DocumentCategoryType) => setUploadForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_CONFIG) as DocumentCategoryType[]).map(key => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {(() => { const C = CATEGORY_CONFIG[key].icon; return <C className="w-4 h-4" /> })()}
                          {CATEGORY_CONFIG[key].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="doc-description" className="mb-2 block">Description</Label>
              <Textarea
                id="doc-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description optionnelle du document..."
                rows={3}
              />
            </div>

            {/* Entity Linking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entity-type" className="mb-2 block">Lier à une entité</Label>
                <Select
                  value={uploadForm.entityType}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, entityType: value }))}
                >
                  <SelectTrigger id="entity-type">
                    <SelectValue placeholder="Type d'entité" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.slice(1).map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entity-id" className="mb-2 block">ID de l&apos;entité</Label>
                <Input
                  id="entity-id"
                  value={uploadForm.entityId}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, entityId: e.target.value }))}
                  placeholder="ID de l'entité liée"
                  disabled={!uploadForm.entityType}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px]">
                {uploadForm.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeUploadTag(tag)}>
                    <Tag className="w-3 h-3" />
                    {tag}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                <Input
                  placeholder="Ajouter un tag et appuyer sur Entrée..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  className="border-0 p-0 h-7 focus-visible:ring-0 shadow-none flex-1 min-w-[200px]"
                />
              </div>
            </div>

            {/* Confidentiality Settings */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div>
                    <Label className="font-medium">Document confidentiel</Label>
                    <p className="text-xs text-muted-foreground">
                      Restreindre l&apos;accès à certains utilisateurs/rôles
                    </p>
                  </div>
                </div>
                <Switch
                  checked={uploadForm.isConfidential}
                  onCheckedChange={(checked) => setUploadForm(prev => ({ ...prev, isConfidential: checked }))}
                />
              </div>

              <AnimatePresence>
                {uploadForm.isConfidential && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <Separator />
                    
                    {/* Allowed Roles */}
                    <div>
                      <Label className="mb-2 block">Rôles autorisés</Label>
                      <div className="flex flex-wrap gap-2">
                        {['admin', 'manager', 'hr', 'finance', 'user'].map(role => (
                          <Badge
                            key={role}
                            variant={uploadForm.allowedRoles.includes(role) ? 'default' : 'outline'}
                            className="cursor-pointer capitalize"
                            onClick={() => {
                              setUploadForm(prev => ({
                                ...prev,
                                allowedRoles: prev.allowedRoles.includes(role)
                                  ? prev.allowedRoles.filter(r => r !== role)
                                  : [...prev.allowedRoles, role],
                              }))
                            }}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Allowed Users */}
                    <div>
                      <Label className="mb-2 block">Utilisateurs spécifiques</Label>
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        className="mb-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Les utilisateurs ajoutés auront accès en plus des rôles sélectionnés
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)} disabled={isUploading}>
              Annuler
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={isUploading || uploadForm.files.length === 0 || !uploadForm.name}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Téléversement...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DOCUMENT DETAIL DRAWER */}
      {/* ============================================================ */}
      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détails du document
            </SheetTitle>
            <SheetDescription>
              Informations complètes et historique du document
            </SheetDescription>
          </SheetHeader>

          {selectedDocument && (
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* Document Preview */}
                {selectedDocument.thumbnailUrl || selectedDocument.mimeType?.startsWith('image/') ? (
                  <div className="rounded-xl overflow-hidden bg-muted">
                    {selectedDocument.mimeType?.startsWith('image/') ? (
                      <img
                        src={selectedDocument.fileUrl}
                        alt={selectedDocument.name}
                        className="w-full h-48 object-contain"
                      />
                    ) : selectedDocument.thumbnailUrl ? (
                      <img
                        src={selectedDocument.thumbnailUrl}
                        alt={selectedDocument.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted flex items-center justify-center h-48">
                    {(() => {
                      const config = getFileTypeConfig(selectedDocument.mimeType, selectedDocument.fileName)
                      const Icon = config.icon
                      return <Icon className={cn("w-20 h-20", config.color.split(' ')[0])} />
                    })()}
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedDocument.name}</h2>
                    <p className="text-muted-foreground text-sm">{selectedDocument.fileName}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {renderCategoryBadge(selectedDocument.category)}
                    {renderStatusBadge(selectedDocument.status)}
                    <Badge variant="outline" className="font-mono">
                      v{selectedDocument.version}
                    </Badge>
                    {selectedDocument.isConfidential && (
                      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3" />
                        Confidentiel
                      </Badge>
                    )}
                  </div>

                  {selectedDocument.description && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">{selectedDocument.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Taille</p>
                    <p className="font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      {formatFileSize(selectedDocument.fileSize)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Type MIME</p>
                    <p className="font-medium text-sm">{selectedDocument.mimeType || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Créé le</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDateTime(selectedDocument.createdAt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Modifié le</p>
                    <p className="font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      {formatDateTime(selectedDocument.updatedAt)}
                    </p>
                  </div>
                  {selectedDocument.entityType && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Entité liée</p>
                      <p className="font-medium flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        {ENTITY_TYPES.find(e => e.value === selectedDocument.entityType)?.label || selectedDocument.entityType}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Téléversé par</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedDocument.uploadedBy.avatar} />
                        <AvatarFallback className="text-[9px]">
                          {selectedDocument.uploadedBy.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{selectedDocument.uploadedBy.name}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => window.open(selectedDocument.fileUrl, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button variant="outline">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                  {selectedDocument.status === 'active' && (
                    <Button variant="outline" onClick={() => handleArchiveDocument(selectedDocument)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archiver
                    </Button>
                  )}
                  {selectedDocument.status === 'deleted' && (
                    <Button variant="outline" onClick={() => handleRestoreDocument(selectedDocument)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restaurer
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => { setDetailDrawerOpen(false); openDeleteConfirm(selectedDocument) }}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>

                {/* Version History */}
                {selectedDocument.versions && selectedDocument.versions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Historique des versions
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Badge variant="default">Actuel</Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm">v{selectedDocument.version} - {selectedDocument.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(selectedDocument.updatedAt)}</p>
                          </div>
                        </div>
                        {selectedDocument.versions.map(version => (
                          <div key={version.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Badge variant="outline">v{version.version}</Badge>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{version.name}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Activity Log Placeholder */}
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Journal d&apos;activité
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm">Document créé par <strong>{selectedDocument.uploadedBy.name}</strong></p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(selectedDocument.createdAt)}</p>
                      </div>
                    </div>
                    {selectedDocument.updatedAt !== selectedDocument.createdAt && (
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <div>
                          <p className="text-sm">Dernière modification</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(selectedDocument.updatedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action peut être annulée.
            </DialogDescription>
          </DialogHeader>

          {documentToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {renderFileTypeIcon(documentToDelete)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{documentToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(documentToDelete.fileSize)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
