'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Bell,
  Repeat,
  Trash2,
  Edit3,
  X,
  CalendarDays,
  List,
  LayoutGrid,
  Filter,
  Search,
  PartyPopper,
  GraduationCap,
  Plane,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Tag,
  Users,
  FileText,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============== TYPES ==============
interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: 'holiday' | 'meeting' | 'deadline' | 'reminder' | 'training' | 'event' | 'leave'
  startDate: string
  endDate?: string
  allDay: boolean
  location?: string
  color?: string
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'
  reminder?: number // minutes before
  notes?: string
}

interface PublicHoliday {
  id: string
  name: string
  nameAr?: string
  date: string
  type: 'national' | 'religious' | 'cultural' | 'custom'
  durationDays: number
}

type ViewMode = 'month' | 'week' | 'list'

// ============== CONSTANTS ==============
const EVENT_COLORS: Record<CalendarEvent['type'], { bg: string; text: string; border: string; solid: string }> = {
  holiday: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', solid: '#ef4444' },
  meeting: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', solid: '#3b82f6' },
  deadline: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', solid: '#f97316' },
  reminder: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700', solid: '#a855f7' },
  training: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700', solid: '#14b8a6' },
  leave: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700', solid: '#22c55e' },
  event: { bg: 'bg-gray-100 dark:bg-gray-800/50', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', solid: '#6b7280' },
}

const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  holiday: 'Férié',
  meeting: 'Réunion',
  deadline: 'Échéance',
  reminder: 'Rappel',
  training: 'Formation',
  leave: 'Congé',
  event: 'Événement',
}

const EVENT_ICONS: Record<CalendarEvent['type'], React.ReactNode> = {
  holiday: <PartyPopper className="w-3 h-3" />,
  meeting: <Users className="w-3 h-3" />,
  deadline: <AlertTriangle className="w-3 h-3" />,
  reminder: <Bell className="w-3 h-3" />,
  training: <GraduationCap className="w-3 h-3" />,
  leave: <Plane className="w-3 h-3" />,
  event: <Sparkles className="w-3 h-3" />,
}

// Algerian weekend: Friday (5) and Saturday (6)
const WEEKEND_DAYS = [5, 6]

// French month names
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// Default Algerian Public Holidays
const DEFAULT_HOLIDAYS: Omit<PublicHoliday, 'id'>[] = [
  { name: "Nouvel An", nameAr: "رأس السنة الميلادية", date: "01-01", type: 'national', durationDays: 1 },
  { name: "Jour de l'Amazighité", nameAr: "يوم الأمازيغية", date: "01-29", type: 'cultural', durationDays: 1 },
  { name: "Fête de la Printemps", nameAr: "عيد الربيع", date: "03-20", type: 'cultural', durationDays: 1 },
  { name: "Mawlid Ennabaoui", nameAr: "المولد النبوي الشريف", date: "", type: 'religious', durationDays: 1 }, // Variable date
  { name: "Fête du Travail", nameAr: "عيد العمال", date: "05-01", type: 'national', durationDays: 1 },
  { name: "Aid El Fitr", nameAr: "عيد الفطر", date: "", type: 'religious', durationDays: 2 }, // Variable date
  { name: "Anniversaire de l'Indépendance", nameAr: "ذكرى الاستقلال", date: "07-05", type: 'national', durationDays: 1 },
  { name: "Aid El Adha", nameAr: "عيد الأضحى", date: "", type: 'religious', durationDays: 3 }, // Variable date
  { name: "Anniversaire de la Révolution", nameAr: "ذكرى الثورة", date: "08-23", type: 'national', durationDays: 1 },
  { name: "Anniversaire de la Révolution du 1er Novembre", nameAr: "ذكرى ثورة أول نوفمبر", date: "11-01", type: 'national', durationDays: 1 },
  { name: "Muharram", nameAr: "رأس السنة الهجرية", date: "", type: 'religious', durationDays: 1 }, // Variable date
  { name: "Achoura", nameAr: "عاشوراء", date: "", type: 'religious', durationDays: 1 }, // Variable date
]

// ============== HELPER FUNCTIONS ==============
const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number): number => {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Convert to Monday-based (0=Monday)
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay() // 0=Sunday, 6=Saturday
  return day === 5 || day === 6 // Friday or Saturday
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-DZ', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-DZ', { 
    day: 'numeric', 
    month: 'short' 
  })
}

// ============== MAIN COMPONENT ==============
export default function CalendarPage() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [holidayDetailOpen, setHolidayDetailOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<PublicHoliday | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting' as CalendarEvent['type'],
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    allDay: true,
    location: '',
    color: '',
    recurrence: 'none' as CalendarEvent['recurrence'],
    reminder: 15,
    notes: '',
  })

  // Filter state
  const [filterType, setFilterType] = useState<string>('all')

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      
      // Fetch events
      try {
        const eventsRes = await fetch(`/api/calendar/events?year=${year}&month=${month}`)
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData)
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        // Use mock data for demo
        setEvents(generateMockEvents(year, month))
      }

      // Fetch holidays
      try {
        const holidaysRes = await fetch(`/api/holidays?year=${year}`)
        if (holidaysRes.ok) {
          const holidaysData = await holidaysRes.json()
          setHolidays(holidaysData)
        }
      } catch (error) {
        console.error('Error fetching holidays:', error)
        // Use default holidays
        setHolidays(generateDefaultHolidays(year))
      }
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Navigation handlers
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setFormData(prev => ({
      ...prev,
      startDate: formatDateKey(date),
      endDate: formatDateKey(date),
    }))
    setEditingEvent(null)
    setEventModalOpen(true)
  }

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation()
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate.split('T')[0],
      startTime: event.startDate.includes('T') ? event.startDate.split('T')[1]?.substring(0, 5) || '09:00' : '09:00',
      endDate: event.endDate?.split('T')[0] || event.startDate.split('T')[0],
      endTime: event.endDate?.includes('T') ? event.endDate.split('T')[1]?.substring(0, 5) || '10:00' : '10:00',
      allDay: event.allDay,
      location: event.location || '',
      color: event.color || '',
      recurrence: event.recurrence || 'none',
      reminder: event.reminder || 15,
      notes: event.notes || '',
    })
    setEventModalOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      toast.error('Le titre de l\'événement est requis')
      return
    }

    const eventData: Partial<CalendarEvent> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: formData.type,
      startDate: formData.allDay 
        ? `${formData.startDate}T00:00:00` 
        : `${formData.startDate}T${formData.startTime}:00`,
      endDate: formData.allDay 
        ? `${formData.endDate}T23:59:59` 
        : `${formData.endDate}T${formData.endTime}:00`,
      allDay: formData.allDay,
      location: formData.location.trim(),
      color: formData.color || EVENT_COLORS[formData.type].solid,
      recurrence: formData.recurrence !== 'none' ? formData.recurrence : undefined,
      reminder: formData.reminder,
      notes: formData.notes.trim(),
    }

    try {
      if (editingEvent) {
        // Update existing event
        const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })
        
        if (res.ok) {
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } as CalendarEvent : e))
          toast.success('Événement mis à jour avec succès')
        } else {
          throw new Error('Failed to update event')
        }
      } else {
        // Create new event
        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...eventData, id: `evt-${Date.now()}` }),
        })
        
        if (res.ok) {
          const newEvent = await res.json()
          setEvents(prev => [...prev, newEvent])
          toast.success('Événement créé avec succès')
        } else {
          throw new Error('Failed to create event')
        }
      }
      
      setEventModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving event:', error)
      // Fallback to local update for demo
      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData, id: editingEvent.id } as CalendarEvent : e))
      } else {
        setEvents(prev => [...prev, { ...eventData, id: `evt-${Date.now()}` } as CalendarEvent])
      }
      toast.success(editingEvent ? 'Événement mis à jour' : 'Événement créé')
      setEventModalOpen(false)
      resetForm()
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return

    try {
      const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
        toast.success('Événement supprimé avec succès')
      } else {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
      toast.success('Événement supprimé')
    }
    
    setDeleteModalOpen(false)
    setEventModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'meeting',
      startDate: selectedDate ? formatDateKey(selectedDate) : formatDateKey(new Date()),
      startTime: '09:00',
      endDate: selectedDate ? formatDateKey(selectedDate) : formatDateKey(new Date()),
      endTime: '10:00',
      allDay: true,
      location: '',
      color: '',
      recurrence: 'none',
      reminder: 15,
      notes: '',
    })
    setEditingEvent(null)
  }

  // Computed values
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [currentDate])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(event => {
      const dateKey = event.startDate.split('T')[0]
      const existing = map.get(dateKey) || []
      existing.push(event)
      map.set(dateKey, existing)
    })
    return map
  }, [events])

  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return events
      .filter(e => {
        const eventDate = new Date(e.startDate)
        return eventDate >= today && eventDate <= nextWeek
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [events])

  const stats = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const monthEvents = events.filter(e => {
      const d = new Date(e.startDate)
      return d.getFullYear() === year && d.getMonth() === month
    })

    const holidayCount = monthEvents.filter(e => e.type === 'holiday').length
    const leaveCount = monthEvents.filter(e => e.type === 'leave').length
    
    return {
      total: monthEvents.length,
      holidays: holidayCount,
      leaves: leaveCount,
      meetings: monthEvents.filter(e => e.type === 'meeting').length,
      deadlines: monthEvents.filter(e => e.type === 'deadline').length,
    }
  }, [events, currentDate])

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    return events.filter(e => e.type === filterType)
  }, [events, filterType])

  // Week view data
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  // Render helpers
  const renderEventBadge = (event: CalendarEvent, compact = false) => {
    const colors = EVENT_COLORS[event.type]
    
    if (compact) {
      return (
        <div
          key={event.id}
          className={cn(
            'truncate text-xs px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity',
            colors.bg,
            colors.text
          )}
          onClick={(e) => handleEventClick(e, event)}
          style={{ borderLeft: `3px ${colors.solid} solid` }}
        >
          {event.title}
        </div>
      )
    }
    
    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer hover:shadow-sm transition-all group',
          colors.bg,
          colors.text,
          colors.border,
          'border'
        )}
        onClick={(e) => handleEventClick(e, event)}
        whileHover={{ scale: 1.02 }}
      >
        <span className="shrink-0">{EVENT_ICONS[event.type]}</span>
        <span className="truncate font-medium">{event.title}</span>
        {!event.allDay && (
          <span className="ml-auto opacity-70 shrink-0">{formatTime(event.startDate)}</span>
        )}
      </motion.div>
    )
  }

  // ============== RENDER ==============
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            Calendrier
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos événements, rendez-vous et jours fériés
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button 
            size="sm" 
            className="gap-2"
            onClick={() => {
              resetForm()
              setEventModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Nouvel événement
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total ce mois"
          value={stats.total}
          icon={CalendarDays}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          delay={0}
        />
        <KpiCard
          title="Jours fériés"
          value={stats.holidays}
          icon={PartyPopper}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          delay={0.1}
        />
        <KpiCard
          title="Congés"
          value={stats.leaves}
          icon={Plane}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          delay={0.2}
        />
        <KpiCard
          title="Réunions"
          value={stats.meetings}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar Main Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Calendar Header Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* View Toggle & Filters */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">
                        <span className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" /> Mois
                        </span>
                      </SelectItem>
                      <SelectItem value="week">
                        <span className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" /> Semaine
                        </span>
                      </SelectItem>
                      <SelectItem value="list">
                        <span className="flex items-center gap-2">
                          <List className="w-4 h-4" /> Liste
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout afficher</SelectItem>
                      <SelectItem value="holiday">Fériés</SelectItem>
                      <SelectItem value="meeting">Réunions</SelectItem>
                      <SelectItem value="deadline">Échéances</SelectItem>
                      <SelectItem value="reminder">Rappels</SelectItem>
                      <SelectItem value="training">Formations</SelectItem>
                      <SelectItem value="leave">Congés</SelectItem>
                      <SelectItem value="event">Événements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Month View */}
              {viewMode === 'month' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAY_NAMES_SHORT.map((day, idx) => (
                          <div
                            key={day}
                            className={cn(
                              'text-center text-sm font-medium py-2',
                              WEEKEND_DAYS.includes(idx + 1) ? 'text-red-500' : 'text-muted-foreground'
                            )}
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, idx) => {
                          if (!date) {
                            return <div key={`empty-${idx}`} className="aspect-square p-1" />
                          }

                          const dateKey = formatDateKey(date)
                          const dayEvents = eventsByDate.get(dateKey) || []
                          const isWeekendDay = isWeekend(date)
                          const isTodayDate = isToday(date)
                          const isHoliday = holidays.some(h => {
                            const hDate = h.date.startsWith(`${date.getFullYear()}-`) 
                              ? h.date 
                              : `${date.getFullYear()}-${h.date}`
                            return hDate === dateKey
                          })

                          return (
                            <motion.div
                              key={dateKey}
                              className={cn(
                                'aspect-square p-1 border rounded-lg transition-colors cursor-pointer hover:bg-accent/50 min-h-[90px]',
                                isTodayDate && 'ring-2 ring-primary ring-offset-1',
                                isWeekendDay && 'bg-red-50/50 dark:bg-red-950/10',
                                isHoliday && !isWeekendDay && 'bg-orange-50/50 dark:bg-orange-950/10'
                              )}
                              onClick={() => handleDateClick(date)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex flex-col h-full">
                                <span className={cn(
                                  'text-sm font-medium mb-1 inline-flex items-center justify-center w-7 h-7 rounded-full',
                                  isTodayDate && 'bg-primary text-primary-foreground',
                                  isWeekendDay && !isTodayDate && 'text-red-600 dark:text-red-400'
                                )}>
                                  {date.getDate()}
                                </span>
                                
                                <div className="flex-1 overflow-hidden space-y-0.5">
                                  {dayEvents.slice(0, 3).map(event => renderEventBadge(event, true))}
                                  {dayEvents.length > 3 && (
                                    <div className="text-xs text-muted-foreground px-1">
                                      +{dayEvents.length - 3} plus...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-8 gap-2">
                        {/* Time column header */}
                        <div className="text-sm font-medium text-muted-foreground p-2" />
                        
                        {/* Day headers */}
                        {weekDays.map(day => (
                          <div
                            key={formatDateKey(day)}
                            className={cn(
                              'text-center p-2 rounded-t-lg',
                              isToday(day) ? 'bg-primary text-primary-foreground' :
                              isWeekend(day) ? 'bg-red-50 dark:bg-red-950/20 text-red-600' : 'bg-muted/50'
                            )}
                          >
                            <div className="text-xs uppercase tracking-wide">
                              {DAY_NAMES_SHORT[day.getDay()]}
                            </div>
                            <div className="text-lg font-semibold">
                              {day.getDate()}
                            </div>
                          </div>
                        ))}

                        {/* Time slots */}
                        {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => (
                          <React.Fragment key={hour}>
                            <div className="text-xs text-muted-foreground py-3 pr-2 text-right border-t">
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                            {weekDays.map(day => {
                              const dateKey = formatDateKey(day)
                              const dayEvents = (eventsByDate.get(dateKey) || []).filter(e => {
                                const eventHour = new Date(e.startDate).getHours()
                                return eventHour === hour
                              })
                              
                              return (
                                <div
                                  key={`${dateKey}-${hour}`}
                                  className="min-h-[60px] border-t p-1 space-y-1"
                                >
                                  {dayEvents.map(event => renderEventBadge(event))}
                                </div>
                              )
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <List className="w-5 h-5" />
                        Liste des événements
                        <Badge variant="secondary" className="ml-2">
                          {filteredEvents.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredEvents.length === 0 ? (
                        <div className="text-center py-12">
                          <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-muted-foreground">
                            Aucun événement trouvé
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Créez un nouvel événement pour commencer
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-3">
                            {[...filteredEvents]
                              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                              .map(event => {
                                const colors = EVENT_COLORS[event.type]
                                
                                return (
                                  <motion.div
                                    key={event.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                      'flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all group',
                                      colors.border,
                                      'bg-card'
                                    )}
                                    onClick={(e) => handleEventClick(e, event)}
                                  >
                                    <div className={cn(
                                      'p-3 rounded-lg shrink-0',
                                      colors.bg
                                    )}>
                                      <span className={colors.text}>
                                        {EVENT_ICONS[event.type]}
                                      </span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold truncate">{event.title}</h4>
                                        <Badge 
                                          variant="secondary" 
                                          className={cn(colors.bg, colors.text, 'shrink-0')}
                                        >
                                          {EVENT_LABELS[event.type]}
                                        </Badge>
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5" />
                                          {formatDate(event.startDate)}
                                        </span>
                                        {!event.allDay && (
                                          <span>{formatTime(event.startDate)}</span>
                                        )}
                                        {event.location && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {event.location}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {event.description && (
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                          {event.description}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEventClick(e, event)
                                        }}
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingEvent(event)
                                          setDeleteModalOpen(true)
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </motion.div>
                                )
                              })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Événements à venir
              </CardTitle>
              <CardDescription>Prochains 7 jours</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun événement prévu</p>
                </div>
              ) : (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 5).map(event => {
                      const colors = EVENT_COLORS[event.type]
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-sm transition-all',
                            colors.bg,
                            colors.border
                          )}
                          style={{ borderLeftColor: colors.solid }}
                          onClick={(e) => handleEventClick(e, event)}
                        >
                          <div className="font-medium text-sm truncate">{event.title}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatShortDate(event.startDate)}</span>
                            {!event.allDay && <span>{formatTime(event.startDate)}</span>}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Légende
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(Object.keys(EVENT_LABELS) as Array<keyof typeof EVENT_LABELS>).map(type => {
                  const colors = EVENT_COLORS[type]
                  
                  return (
                    <div
                      key={type}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors',
                        filterType === type && 'bg-accent'
                      )}
                      onClick={() => setFilterType(filterType === type ? 'all' : type)}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: colors.solid }}
                      />
                      <span className="text-sm flex-1">{EVENT_LABELS[type]}</span>
                      <Badge variant="outline" className="text-xs">
                        {stats[type === 'holiday' ? 'holidays' : type === 'leave' ? 'leaves' : type === 'meeting' ? 'meetings' : type === 'deadline' ? 'deadlines' : 'total']}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Public Holidays */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-red-500" />
                Jours fériés
              </CardTitle>
              <CardDescription>{currentDate.getFullYear()}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {holidays.filter(h => h.date).slice(0, 8).map(holiday => {
                    const fullDate = holiday.date.startsWith(String(currentDate.getFullYear()))
                      ? holiday.date
                      : `${currentDate.getFullYear()}-${holiday.date}`
                    
                    return (
                      <button
                        key={holiday.id || holiday.name}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                        onClick={() => {
                          setSelectedHoliday({ ...holiday, id: holiday.id || holiday.name })
                          setHolidayDetailOpen(true)
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{holiday.name}</div>
                          {holiday.nameAr && (
                            <div className="text-xs text-muted-foreground" dir="rtl">
                              {holiday.nameAr}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {fullDate.split('-').slice(1).join('/')}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={(open) => {
        setEventModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEvent ? (
                <>
                  <Edit3 className="w-5 h-5" />
                  Modifier l&apos;événement
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Nouvel événement
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingEvent 
                ? 'Modifiez les détails de votre événement'
                : 'Remplissez les informations pour créer un nouvel événement'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Titre de l'événement..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Type & Color Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d&apos;événement</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    type: v as CalendarEvent['type'],
                    color: EVENT_COLORS[v as CalendarEvent['type']].solid
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_LABELS) as Array<keyof typeof EVENT_LABELS>).map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: EVENT_COLORS[type].solid }} 
                          />
                          {EVENT_LABELS[type]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                  <input
                    type="color"
                    value={formData.color || EVENT_COLORS[formData.type].solid}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.color || EVENT_COLORS[formData.type].solid}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description de l'événement..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="cursor-pointer">Journée entière</Label>
                  <p className="text-xs text-muted-foreground">
                    L&apos;événement dure toute la journée
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.allDay}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked }))}
              />
            </div>

            {/* Date/Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              {!formData.allDay && (
                <div className="space-y-2">
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              
              {!formData.allDay && (
                <div className="space-y-2">
                  <Label>Heure de fin</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lieu
              </Label>
              <Input
                id="location"
                placeholder="Lieu de l'événement..."
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            {/* Recurrence & Reminder Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Récurrence
                </Label>
                <Select 
                  value={formData.recurrence} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence: v as CalendarEvent['recurrence'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pas de récurrence</SelectItem>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Rappel
                </Label>
                <Select 
                  value={String(formData.reminder)} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, reminder: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">À l&apos;heure</SelectItem>
                    <SelectItem value="15">15 min avant</SelectItem>
                    <SelectItem value="30">30 min avant</SelectItem>
                    <SelectItem value="60">1 heure avant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Notes supplémentaires..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => setDeleteModalOpen(true)}
                className="sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={() => setEventModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEvent}>
              {editingEvent ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer l&apos;événement
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          {editingEvent && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="font-medium">{editingEvent.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDate(editingEvent.startDate)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday Detail Modal */}
      <Dialog open={holidayDetailOpen} onOpenChange={setHolidayDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-red-500" />
              Détail du jour férié
            </DialogTitle>
          </DialogHeader>
          
          {selectedHoliday && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="text-xl font-bold">{selectedHoliday.name}</h3>
                {selectedHoliday.nameAr && (
                  <p className="text-lg text-muted-foreground mt-1" dir="rtl">
                    {selectedHoliday.nameAr}
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant={
                    selectedHoliday.type === 'national' ? 'default' :
                    selectedHoliday.type === 'religious' ? 'secondary' : 'outline'
                  }>
                    {selectedHoliday.type === 'national' ? 'National' :
                     selectedHoliday.type === 'religious' ? 'Religieux' :
                     selectedHoliday.type === 'cultural' ? 'Culturel' : 'Personnalisé'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Durée</span>
                  <span>{selectedHoliday.durationDays} jour{selectedHoliday.durationDays > 1 ? 's' : ''}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Statut</span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Jour chômé et payé
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setHolidayDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============== MOCK DATA GENERATORS ==============
function generateMockEvents(year: number, month: number): CalendarEvent[] {
  const events: CalendarEvent[] = [
    {
      id: 'evt-1',
      title: 'Réunion équipe technique',
      description: 'Point hebdomadaire sur le développement',
      type: 'meeting',
      startDate: `${year}-${String(month).padStart(2, '0')}-03T10:00:00`,
      endDate: `${year}-${String(month).padStart(2, '0')}-03T11:30:00`,
      allDay: false,
      location: 'Salle de conférence A',
      color: '#3b82f6',
      reminder: 15,
    },
    {
      id: 'evt-2',
      title: 'Soumission rapport financier',
      description: 'Déposer le rapport mensuel auprès de la direction',
      type: 'deadline',
      startDate: `${year}-${String(month).padStart(2, '0')}-15T17:00:00`,
      allDay: false,
      color: '#f97316',
      reminder: 60,
    },
    {
      id: 'evt-3',
      title: 'Formation React avancé',
      description: 'Session de formation sur les hooks et performance',
      type: 'training',
      startDate: `${year}-${String(month).padStart(2, '0')}-08T09:00:00`,
      endDate: `${year}-${String(month).padStart(2, '0')}-08T17:00:00`,
      allDay: false,
      location: 'Centre de formation',
      color: '#14b8a6',
      recurrence: 'weekly',
    },
    {
      id: 'evt-4',
      title: 'Congé annuel',
      description: 'Vacances familiales',
      type: 'leave',
      startDate: `${year}-${String(month).padStart(2, '0')}-20T00:00:00`,
      endDate: `${year}-${String(month).padStart(2, '0')}-25T23:59:59`,
      allDay: true,
      color: '#22c55e',
    },
    {
      id: 'evt-5',
      title: 'Rappel: Paiement fournisseurs',
      description: 'Ne pas oublier de traiter les factures en attente',
      type: 'reminder',
      startDate: `${year}-${String(month).padStart(2, '0')}-28T09:00:00`,
      allDay: false,
      color: '#a855f7',
      reminder: 30,
    },
    {
      id: 'evt-6',
      title: 'Équipe building',
      description: 'Activité team building trimestrielle',
      type: 'event',
      startDate: `${year}-${String(month).padStart(2, '0')}-22T14:00:00`,
      endDate: `${year}-${String(month).padStart(2, '0')}-22T18:00:00`,
      allDay: false,
      location: 'Parc national',
      color: '#6b7280',
    },
  ]
  
  // Add some random events based on current month
  const additionalEvents: CalendarEvent[] = []
  const types: CalendarEvent['type'][] = ['meeting', 'reminder', 'deadline']
  
  for (let i = 0; i < 3; i++) {
    const day = Math.floor(Math.random() * 28) + 1
    const type = types[Math.floor(Math.random() * types.length)]
    
    additionalEvents.push({
      id: `evt-random-${i}`,
      title: `Événement ${i + 1}`,
      type,
      startDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:00:00`,
      allDay: Math.random() > 0.5,
      color: EVENT_COLORS[type].solid,
    })
  }
  
  return [...events, ...additionalEvents]
}

function generateDefaultHolidays(year: number): PublicHoliday[] {
  return DEFAULT_HOLIDAYS.map((holiday, index) => ({
    ...holiday,
    id: `holiday-${index}`,
    date: holiday.date ? `${year}-${holiday.date}` : '',
  })).filter(h => h.date)
}
