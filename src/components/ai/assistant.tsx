'use client'

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Sparkles,
  X,
  Bot,
  User,
  Trash2,
  RefreshCw,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  DollarSign,
  Users,
  FileText,
  Package,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAIChat, ChatMessage as ChatMessageType } from '@/hooks/use-ai-chat'

// Animation variants
const chatVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: { duration: 0.2 }
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: { duration: 0.15 }
  }
}

const messageVariants = {
  hidden: { 
    opacity: 0, 
    x: -20, 
    transition: { duration: 0.2 } 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.3, ease: 'easeOut' } 
  }
}

const floatingButtonVariants = {
  idle: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  hover: {
    scale: 1.1,
    transition: { duration: 0.2 }
  }
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-dz-green"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.6,
              delay: i * 0.15,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-2">HASSIBA réfléchit...</span>
    </div>
  )
}

// Message bubble component
interface MessageBubbleProps {
  message: ChatMessageType
  onCopy?: (content: string) => void
  copiedId?: string | null
}

function MessageBubble({ message, onCopy, copiedId }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isCopied = copiedId === message.id

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    // Bold text
    let processed = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Line breaks
    processed = processed.replace(/\n/g, '<br/>')
    return processed
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <Avatar className={`h-8 w-8 shrink-0 ${isUser ? '' : 'bg-gradient-to-br from-dz-green to-dz-green-light'}`}>
        <AvatarFallback className={`${isUser ? 'bg-primary text-primary-foreground' : 'bg-dz-green text-white text-xs'}`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            rounded-2xl px-4 py-2.5 text-sm
            ${isUser 
              ? 'bg-primary text-primary-foreground rounded-tr-md' 
              : 'bg-muted rounded-tl-md border border-border/50'
            }
          `}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
            className="leading-relaxed"
          />
        </div>
        
        {/* Message meta */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString('fr-DZ', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          
          {!isUser && onCopy && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onCopy(message.content)}
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3 text-dz-green" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{isCopied ? 'Copié!' : 'Copier'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Quick actions after AI response */}
        {message.actions && message.role === 'assistant' && (
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {message.actions.slice(0, 4).map((action) => (
              <QuickActionChip key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Quick action chip component
interface QuickActionChipProps {
  action: {
    id: string
    label: string
    icon?: string
    action: string
  }
  onClick?: () => void
}

function QuickActionChip({ action }: QuickActionChipProps) {
  // This is a display-only component; clicking is handled by parent via handleQuickAction
  return null
}

// Welcome screen component
function WelcomeScreen({ onAction }: { onAction: (action: string) => void }) {
  const suggestedActions = [
    { icon: <DollarSign className="h-4 w-4" />, label: "Chiffre d'affaires", query: "Quel est le chiffre d'affaires du mois ?" },
    { icon: <Users className="h-4 w-4" />, label: 'Employés actifs', query: "Combien d'employés actifs ?" },
    { icon: <FileText className="h-4 w-4" />, label: 'Factures impayées', query: "Combien de factures impayées ?" },
    { icon: <Package className="h-4 w-4" />, label: 'État du stock', query: "Quel est l'état du stock ?" },
    { icon: <TrendingUp className="h-4 w-4" />, label: 'Top clients', query: "Qui sont les meilleurs clients ce mois ?" },
    { icon: <BarChart3 className="h-4 w-4" />, label: 'Rapport ventes', query: "Crée un rapport des ventes" },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4">
      {/* Logo and title */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-6"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dz-green to-dz-green-light flex items-center justify-center shadow-lg shadow-dz-green/25">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-dz-red rounded-full animate-pulse" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <h3 className="text-lg font-semibold text-foreground mb-1">
          HASSIBA AI Assistant
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Votre assistant intelligent pour le système ERP HASSIBA Suite 🇩🇿
        </p>
      </motion.div>

      {/* Suggested actions grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm"
      >
        <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
          Questions fréquentes :
        </p>
        <div className="grid grid-cols-2 gap-2">
          {suggestedActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              onClick={() => onAction(action.query)}
              className="
                flex items-center gap-2 p-3 rounded-xl
                bg-muted/50 hover:bg-muted
                border border-border/50 hover:border-dz-green/30
                text-left transition-all duration-200
                group cursor-pointer
              "
            >
              <span className="text-dz-green group-hover:scale-110 transition-transform">
                {action.icon}
              </span>
              <span className="text-xs font-medium text-foreground truncate">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-muted-foreground mt-6 text-center"
      >
        Posez votre question en langage naturel...
      </motion.p>
    </div>
  )
}

// Main AI Assistant Component
export function HassibaAIAssistant() {
  const {
    messages,
    isOpen,
    isTyping,
    isLoading,
    error,
    toggleChat,
    closeChat,
    clearMessages,
    sendMessage,
    handleQuickAction,
    retryLastMessage,
    messagesEndRef,
    quickActions,
  } = useAIChat()

  const [inputValue, setInputValue] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isMinimized])

  // Handle copy to clipboard
  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handle send message
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue)
      setInputValue('')
    }
  }

  // Handle keyboard shortcut
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Unread messages count (for badge)
  const unreadCount = isOpen ? 0 : messages.filter(m => m.role === 'assistant').length

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {isOpen && !isMinimized && (
          <motion.div
            variants={chatVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mb-4"
          >
            <Card className="w-[380px] sm:w-[420px] h-[600px] shadow-2xl shadow-black/20 border-border/50 overflow-hidden flex flex-col">
              {/* Header */}
              <CardHeader className="py-3 px-4 bg-gradient-to-r from-dz-green to-dz-green-light text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-white/30">
                        <AvatarFallback className="bg-white/20 text-white text-xs">
                          <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        HASSIBA AI
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
                          Beta
                        </Badge>
                      </CardTitle>
                      <p className="text-[11px] text-white/80">Assistant ERP Intelligent</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                            onClick={() => setIsMinimized(true)}
                          >
                            <Minimize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Réduire</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                            onClick={clearMessages}
                            disabled={messages.length === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Effacer la conversation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                            onClick={closeChat}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fermer</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              {/* Messages area */}
              <CardContent ref={scrollRef} className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <WelcomeScreen onAction={(query) => {
                        setInputValue(query)
                        setTimeout(() => sendMessage(query), 100)
                      }} />
                    ) : (
                      <>
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            onCopy={(content) => handleCopy(content, message.id)}
                            copiedId={copiedMessageId}
                          />
                        ))}

                        {/* Typing indicator */}
                        {isTyping && <TypingIndicator />}

                        {/* Error message with retry */}
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                          >
                            <span className="text-xs text-destructive">{error}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={retryLastMessage}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Réessayer
                            </Button>
                          </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Quick actions bar (when there are messages) */}
              {messages.length > 0 && !isTyping && (
                <>
                  <Separator />
                  <div className="px-4 py-2 flex-shrink-0">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {quickActions.slice(0, 4).map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action.action)}
                          className="
                            flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                            bg-muted hover:bg-dz-green/10 hover:text-dz-green
                            border border-transparent hover:border-dz-green/20
                            text-xs font-medium whitespace-nowrap
                            transition-all duration-200
                          "
                        >
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Input area */}
              <div className="p-3 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Posez votre question..."
                      disabled={isLoading}
                      className="
                        pr-10 h-10 rounded-xl
                        bg-muted/50 border-border/50
                        focus-visible:ring-dz-green focus-visible:border-dz-green/50
                        placeholder:text-muted-foreground/60
                      "
                    />
                    {inputValue && (
                      <button
                        type="button"
                        onClick={() => setInputValue('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="
                      h-10 w-10 rounded-xl shrink-0
                      bg-dz-green hover:bg-dz-green-light
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                
                {/* Input hint */}
                <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                  Appuyez sur Entrée pour envoyer • HASSIBA AI v2.0
                </p>
              </div>
            </Card>
          </motion.div>
        )}
        
        {/* Minimized state */}
        {isOpen && isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-4"
          >
            <Card className="shadow-xl border-dz-green/30 overflow-hidden">
              <button
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-3 p-3 w-full hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-dz-green to-dz-green-light">
                    <AvatarFallback className="text-white text-xs">
                      <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-background" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">HASSIBA AI</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour ouvrir...</p>
                </div>
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating action button */}
      <motion.button
        variants={floatingButtonVariants}
        initial="idle"
        whileHover="hover"
        onClick={toggleChat}
        className={`
          relative w-14 h-14 rounded-full
          bg-gradient-to-r from-dz-green to-dz-green-light
          text-white shadow-lg shadow-dz-green/30
          flex items-center justify-center
          transition-shadow duration-300
          hover:shadow-xl hover:shadow-dz-green/40
          focus:outline-none focus:ring-2 focus:ring-dz-green focus:ring-offset-2
          ${isOpen ? 'rotate-0' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification badge */}
        {unreadCount > 0 && !isOpen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="
              absolute -top-1 -right-1
              w-5 h-5 rounded-full
              bg-dz-red text-white
              text-[10px] font-bold
              flex items-center justify-center
              border-2 border-background
            "
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}

        {/* Pulse effect when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-dz-green animate-ping opacity-25" />
        )}
      </motion.button>
    </div>
  )
}

// Default export
export default HassibaAIAssistant
