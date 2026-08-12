'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

// Types for PWA state
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  isInstalled: boolean
  isOffline: boolean
  canInstall: boolean
  isInstalling: boolean
  swRegistered: boolean
  swUpdateAvailable: boolean
}

interface UsePWAReturn extends PWAState {
  showInstallPrompt: () => Promise<boolean>
  registerSW: () => Promise<boolean>
  updateSW: () => void
  requestNotificationPermission: () => Promise<NotificationPermission>
}

// Storage keys
const INSTALL_STATUS_KEY = 'hassiba-pwa-install-status'

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isOffline: false,
    canInstall: false,
    isInstalling: false,
    swRegistered: false,
    swUpdateAvailable: false,
  })

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Check if app is installed (standalone mode)
  const checkInstalled = useCallback((): boolean => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as unknown as { standalone?: boolean }).standalone === true
    
    const storedStatus = localStorage.getItem(INSTALL_STATUS_KEY)
    
    return isStandalone || storedStatus === 'installed'
  }, [])

  // Initialize PWA state
  useEffect(() => {
    // Check installation status
    setState(prev => ({
      ...prev,
      isInstalled: checkInstalled(),
      isOffline: !navigator.onLine,
    }))

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      setState(prev => ({ ...prev, canInstall: true }))
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      logger.debug('App was installed', { context: 'PWA' })
      localStorage.setItem(INSTALL_STATUS_KEY, 'installed')
      deferredPromptRef.current = null
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        isInstalling: false,
      }))
    }

    // Listen for online/offline events
    const handleOnline = () => {
      logger.debug('Went online', { context: 'PWA' })
      setState(prev => ({ ...prev, isOffline: false }))
      
      // Trigger sync when coming back online
      if (swRegistrationRef.current?.sync) {
        swRegistrationRef.current.sync.register('sync-pending-forms')
          .catch(err => logger.debug('Sync registration failed:', err, { context: 'PWA' }))
      }
    }

    const handleOffline = () => {
      logger.debug('Went offline', { context: 'PWA' })
      setState(prev => ({ ...prev, isOffline: true }))
    }

    // Register event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Custom online status change from SW
    const handleCustomOnlineChange = ((e: CustomEvent<{ online: boolean }>) => {
      setState(prev => ({ ...prev, isOffline: !e.detail.online })) 
    }) as EventListener

    window.addEventListener('online-status-change', handleCustomOnlineChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online-status-change', handleCustomOnlineChange)
    }
  }, [checkInstalled])

  // Show install prompt
  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPromptRef.current

    if (!promptEvent) {
      console.warn('[usePWA] No install prompt available')
      
      // For iOS, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      
      if (isIOS) {
        alert('Pour installer HASSIBA ERP sur iOS:\n\n1. Appuyez sur le bouton "Partager"\n2. Faites défiler et appuyez sur "Sur l\'écran d\'accueil"\n3. Confirmez avec "Ajouter"')
      }
      
      return false
    }

    setState(prev => ({ ...prev, isInstalling: true }))

    try {
      await promptEvent.prompt()
      
      const { outcome } = await promptEvent.userChoice
      
      if (outcome === 'accepted') {
        logger.debug('User accepted install', { context: 'PWA' })
        return true
      } else {
        logger.debug('User dismissed install', { context: 'PWA' })
        return false
      }
    } catch (error) {
      console.error('[usePWA] Install prompt error:', error)
      return false
    } finally {
      deferredPromptRef.current = null
      setState(prev => ({
        ...prev,
        isInstalling: false,
        canInstall: false,
      }))
    }
  }, [])

  // Register service worker
  const registerSW = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[usePWA] Service workers not supported')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      swRegistrationRef.current = registration
      setState(prev => ({ ...prev, swRegistered: true }))

      logger.debug('SW registered with scope:', registration.scope, { context: 'PWA' })

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, swUpdateAvailable: true }))
              logger.debug('New SW version available', { context: 'PWA' })
            }
          })
        }
      })

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        switch (event.data?.type) {
          case 'SYNC_START':
            logger.debug('Background sync started', { context: 'PWA' })
            break
          case 'SYNC_COMPLETE':
            logger.debug('Background sync completed', { context: 'PWA' })
            break
          case 'ONLINE_STATUS_CHANGE':
            setState(prev => ({ ...prev, isOffline: !event.data.online }))
            break
          default:
            break
        }
      })

      return true
    } catch (error) {
      console.error('[usePWA] SW registration failed:', error)
      return false
    }
  }, [])

  // Update service worker (skip waiting and reload)
  const updateSW = useCallback(() => {
    if (swRegistrationRef.current?.waiting) {
      // Tell the new SW to skip waiting
      swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload when the new SW activates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('[usePWA] Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      logger.debug('Notification permission:', permission, { context: 'PWA' })
      return permission
    } catch (error) {
      console.error('[usePWA] Notification permission error:', error)
      return 'denied'
    }
  }, [])

  return {
    ...state,
    showInstallPrompt,
    registerSW,
    updateSW,
    requestNotificationPermission,
  }
}

// Hook for offline/online detection only
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  // Initialize online status from navigator
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading navigator API
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Hook to check if running as installed PWA
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const check = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as unknown as { standalone?: boolean }).standalone === true
      const storedStatus = localStorage.getItem(INSTALL_STATUS_KEY)
      setIsInstalled(isStandalone || storedStatus === 'installed')
    }

    check()

    // Re-check on visibility change (in case user installs while page is open)
    document.addEventListener('visibilitychange', check)
    
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  return isInstalled
}

export default usePWA
