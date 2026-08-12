'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield
} from 'lucide-react'

// Types for install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptProps {
  className?: string
  variant?: 'banner' | 'button' | 'modal'
  onInstallComplete?: () => void
}

// Storage key for dismissal tracking
const DISMISSAL_KEY = 'hassiba-pwa-install-dismissed'
const INSTALL_STATUS_KEY = 'hassiba-pwa-install-status'

export function InstallPrompt({ 
  className = '', 
  variant = 'banner',
  onInstallComplete 
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check installation status and platform
  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (PWA is installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as unknown as { standalone?: boolean }).standalone === true
      
      // Check localStorage
      const storedStatus = localStorage.getItem(INSTALL_STATUS_KEY)
      
      if (isStandalone || storedStatus === 'installed') {
        setIsInstalled(true)
        return true
      }
      return false
    }

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIPad = /ipad/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const isIPhone = /iphone/.test(userAgent)
      return isIPad || isIPhone
    }

    // Check if dismissed
    const wasDismissed = localStorage.getItem(DISMISSAL_KEY)
    if (wasDismissed) {
      const dismissTime = new Date(wasDismissed)
      const now = new Date()
      const daysSinceDismiss = (now.getTime() - dismissTime.getTime()) / (1000 * 60 * 60 * 24)
      
      // Show again after 7 days
      if (daysSinceDismiss < 7) {
        setDismissed(true)
      }
    }

    const alreadyInstalled = checkInstalled()
    setIsIOS(checkIOS())

    if (!alreadyInstalled && !dismissed) {
      // Show prompt after a delay for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Only show if not dismissed and not installed
      if (!dismissed && !isInstalled) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    
    // Listen for app installed event
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [dismissed, isInstalled])

  const handleAppInstalled = useCallback(() => {
    console.log('[HASSIBA PWA] App installed successfully')
    setIsInstalled(true)
    localStorage.setItem(INSTALL_STATUS_KEY, 'installed')
    setShowPrompt(false)
    setDeferredPrompt(null)
    onInstallComplete?.()
  }, [onInstallComplete])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    
    try {
      await deferredPrompt.prompt()
      
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('[HASSIBA PWA] User accepted install prompt')
        handleAppInstalled()
      } else {
        console.log('[HASSIBA PWA] User dismissed install prompt')
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('[HASSIBA PWA] Install error:', error)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }, [deferredPrompt, handleAppInstalled])

  const handleDismiss = useCallback((permanent = false) => {
    setShowPrompt(false)
    
    if (permanent) {
      localStorage.setItem(DISMISSAL_KEY, new Date().toISOString())
      setDismissed(true)
    }
  }, [])

  // Don't render anything if installed or shouldn't show
  if (isInstalled || !showPrompt) {
    return null
  }

  // Button variant - for header integration
  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstall}
        disabled={isInstalling || (!deferredPrompt && !isIOS)}
        size="sm"
        className={`bg-dz-green hover:bg-dz-green-dark text-white gap-2 ${className}`}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Installer l&apos;app</span>
      </Button>
    )
  }

  // Banner variant - default
  if (variant === 'banner') {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md ${className}`}>
        <Card className="border-dz-green/30 shadow-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          {/* Gradient accent */}
          <div className="h-1 bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red" />
          
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-dz-green to-dz-red flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">H</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-dz-green" />
                      Installer HASSIBA ERP
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Accès rapide hors ligne & meilleure expérience
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleDismiss()}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Features */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Rapide
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Hors ligne
                  </span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Mobile
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {deferredPrompt ? (
                    <Button
                      onClick={handleInstall}
                      disabled={isInstalling}
                      size="sm"
                      className="flex-1 bg-dz-green hover:bg-dz-green-dark text-white"
                    >
                      {isInstalling ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                          Installation...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1.5" />
                          Installer maintenant
                        </>
                      )}
                    </Button>
                  ) : isIOS ? (
                    <IOSInstallGuide onDismiss={() => handleDismiss()} />
                  ) : null}
                  
                  <Button
                    onClick={() => handleDismiss(true)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Modal variant - for more prominent display
  if (variant === 'modal') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${className}`}>
        <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="h-2 bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red" />
          
          <CardContent className="p-6 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-dz-green to-dz-red flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">H</span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Installez HASSIBA Suite
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Accédez à votre ERP comme une application native. Fonctionne hors ligne et se lance instantanément.
            </p>

            {/* Benefits */}
            <div className="space-y-2 mb-6 text-left">
              {[
                { icon: Zap, text: 'Lancement ultra-rapide' },
                { icon: Shield, text: 'Fonctionnement hors ligne' },
                { icon: Smartphone, text: 'Interface adaptée mobile' },
                { icon: CheckCircle2, text: 'Notifications push' }
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <benefit.icon className="w-4 h-4 text-dz-green flex-shrink-0" />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {deferredPrompt ? (
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="w-full bg-dz-green hover:bg-dz-green-dark text-white py-3"
                  size="lg"
                >
                  {isInstalling ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Installation en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Installer HASSIBA Suite
                    </>
                  )}
                </Button>
              ) : isIOS ? (
                <IOSInstallGuide onDismiss={() => handleDismiss()} expanded />
              ) : null}
              
              <Button
                onClick={() => handleDismiss(true)}
                variant="ghost"
                className="w-full text-gray-500"
              >
                Ne plus afficher
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

// iOS Install Guide Component
function IOSInstallGuide({ 
  onDismiss, 
  expanded = false 
}: { 
  onDismiss: () => void
  expanded?: boolean 
}) {
  return (
    <div className={`${expanded ? 'w-full' : 'flex-1'}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-800 mb-2">
          📱 Pour installer sur iOS:
        </p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block w-4 h-4 align-middle">⎙</span></li>
          <li>Faites défiler et appuyez sur <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></li>
          <li>Confirmez avec <strong>&quot;Ajouter&quot;</strong></li>
        </ol>
      </div>
      {expanded && (
        <Button
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-gray-500"
        >
          Fermer
        </Button>
      )}
    </div>
  )
}

// Hook for checking PWA status
export function usePWAInstallStatus() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  // Check installation status
  useEffect(() => {
    // Check standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as unknown as { standalone?: boolean }).standalone === true
    
    // eslint-disable-next-line react-hooks/set-state-in-effect -- PWA detection
    setIsInstalled(isStandalone)
    
    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIPad = /ipad/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isIPhone = /iphone/.test(userAgent)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- iOS detection
    setIsIOS(isIPad || isIPhone)

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  return { canInstall, isInstalled, isIOS }
}

export default InstallPrompt
