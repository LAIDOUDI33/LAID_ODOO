'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/logger'

// Types for the chat system
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isTyping?: boolean
  actions?: QuickAction[]
}

export interface QuickAction {
  id: string
  label: string
  icon?: string
  action: string
}

interface UseAIChatOptions {
  maxMessages?: number
  storageKey?: string
}

interface ChatState {
  messages: ChatMessage[]
  isOpen: boolean
  isTyping: boolean
  isLoading: boolean
  error: string | null
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: '1', label: "Chiffre d'affaires", icon: '💰', action: 'Quel est le chiffre d\'affaires du mois ?' },
  { id: '2', label: 'Employés actifs', icon: '👥', action: 'Combien d\'employés actifs ?' },
  { id: '3', label: 'Factures impayées', icon: '📄', action: 'Combien de factures impayées ?' },
  { id: '4', label: 'Stock produits', icon: '📦', action: 'Quel est l\'état du stock ?' },
  { id: '5', label: 'Top clients', icon: '🏆', action: 'Qui sont les meilleurs clients ce mois ?' },
  { id: '6', label: 'Rapport ventes', icon: '📊', action: 'Crée un rapport des ventes' },
]

// Simple cache for responses
const responseCache = new Map<string, { response: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getCacheKey(message: string): string {
  return message.toLowerCase().trim()
}

function getCachedResponse(message: string): string | null {
  const key = getCacheKey(message)
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response
  }
  if (cached) {
    responseCache.delete(key)
  }
  return null
}

function setCachedResponse(message: string, response: string): void {
  const key = getCacheKey(message)
  responseCache.set(key, { response, timestamp: Date.now() })
  
  // Clean old entries if cache is too large
  if (responseCache.size > 100) {
    const oldestKey = Array.from(responseCache.keys())[0]
    responseCache.delete(oldestKey)
  }
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { 
    maxMessages = 50,
    storageKey = 'hassiba-ai-chat-history'
  } = options

  const [state, setState] = useState<ChatState>({
    messages: [],
    isOpen: false,
    isTyping: false,
    isLoading: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const messages: ChatMessage[] = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
          setState(prev => ({ ...prev, messages }))
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
  }, [storageKey])

  // Save chat history to localStorage when messages change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.messages))
    } catch (e) {
      console.error('Failed to save chat history:', e)
    }
  }, [state.messages, storageKey])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.messages])

  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  const openChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }))
  }, [])

  const closeChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }))
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    }

    setState(prev => {
      const updatedMessages = [...prev.messages, newMessage]
      // Keep only the last maxMessages
      if (updatedMessages.length > maxMessages) {
        return { ...prev, messages: updatedMessages.slice(-maxMessages) }
      }
      return { ...prev, messages: updatedMessages }
    })

    return newMessage.id
  }, [maxMessages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Add user message
    addMessage({
      role: 'user',
      content: content.trim(),
    })

    // Check cache first
    const cachedResponse = getCachedResponse(content)
    if (cachedResponse) {
      addMessage({
        role: 'assistant',
        content: cachedResponse,
        actions: DEFAULT_QUICK_ACTIONS,
      })
      return
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      isTyping: true,
      isLoading: true,
      error: null,
    }))

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content.trim() }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Cache successful response
      setCachedResponse(content.trim(), data.response)

      // Add assistant message
      addMessage({
        role: 'assistant',
        content: data.response || data.message || 'Je suis désolé, je n\'ai pas pu traiter votre demande.',
        actions: DEFAULT_QUICK_ACTIONS,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('Request aborted', { context: 'AIChat' })
        return
      }

      logger.error('AI Chat error:', error, { context: 'AIChat' })
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Une erreur inattendue s\'est produite'

      setState(prev => ({ ...prev, error: errorMessage }))

      // Add error message from assistant
      addMessage({
        role: 'assistant',
        content: `Désolé, j'ai rencontré une erreur: ${errorMessage}. Veuillez réessayer.`,
        actions: DEFAULT_QUICK_ACTIONS,
      })
    } finally {
      setState(prev => ({
        ...prev,
        isTyping: false,
        isLoading: false,
      }))
      abortControllerRef.current = null
    }
  }, [addMessage])

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action)
  }, [sendMessage])

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...state.messages]
      .reverse()
      .find(m => m.role === 'user')
    
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content)
    }
  }, [state.messages, sendMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    messages: state.messages,
    isOpen: state.isOpen,
    isTyping: state.isTyping,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    toggleChat,
    openChat,
    closeChat,
    clearMessages,
    sendMessage,
    handleQuickAction,
    retryLastMessage,

    // Refs
    messagesEndRef,

    // Constants
    quickActions: DEFAULT_QUICK_ACTIONS,
  }
}
