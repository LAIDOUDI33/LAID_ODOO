'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar, MobileBottomNav } from './sidebar'
import { Header } from './header'
import { HassibaAIAssistant } from '@/components/ai/assistant'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { usePWA } from '@/hooks/use-pwa'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // PWA hooks
  const { isOffline, swUpdateAvailable, updateSW } = usePWA()

  // Set mounted state to handle hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration fix
    setMounted(true)
    
    // Check saved preference
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleMobileToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          {/* Sidebar placeholder */}
          <div className="hidden lg:block w-[280px]" />
          {/* Main content placeholder */}
          <main className="flex-1 min-h-screen">
            <Header onMobileMenuToggle={handleMobileToggle} />
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isOffline && "offline-mode"
    )}>
      {/* PWA Install Prompt */}
      <InstallPrompt variant="banner" />

      {/* Update Available Banner */}
      {swUpdateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-dz-green text-white py-2 px-4 text-center text-sm animate-in slide-in-from-top duration-300">
          <span className="mr-2">🔄 Une mise à jour est disponible!</span>
          <button 
            onClick={updateSW}
            className="underline font-medium hover:no-underline"
          >
            Mettre à jour maintenant
          </button>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white py-1.5 px-4 text-center text-xs flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Vous êtes hors ligne - Les données mises en cache sont disponibles</span>
        </div>
      )}

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
        </div>

        {/* Mobile Sidebar */}
        <div
          className={cn(
            'lg:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar 
            collapsed={false} 
            onToggle={() => setMobileMenuOpen(false)} 
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[280px]',
            // Add bottom padding for mobile nav
            'pb-16 md:pb-20',
            // Add top padding for offline/update indicators
            (isOffline || swUpdateAvailable) ? 'pt-8 md:pt-10' : ''
          )}
        >
          <Header onMobileMenuToggle={handleMobileToggle} />
          
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>

          {/* Footer - Hidden on mobile, shown on desktop */}
          <footer className="hidden md:block fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 transition-all duration-300"
            style={{
              left: typeof window !== 'undefined' && window.innerWidth >= 1024 
                ? (sidebarCollapsed ? '70px' : '280px') 
                : 0
            }}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>© 2024 <span className="font-semibold text-primary">HASSIBA Suite ERP</span> - Plateforme Enterprise Algérienne</p>
              <div className="flex items-center gap-3">
                <span>v2.0.0 Enterprise</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                <span>🇩🇿 Fait avec ❤️ en Algérie</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                <span className={cn(
                  "font-medium",
                  isOffline ? "text-amber-500" : "text-dz-green"
                )}>
                  {isOffline ? "⚠️ Hors ligne" : "✓ Production Ready"}
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={handleMobileToggle} />

      {/* AI Assistant - Global Chatbot */}
      <HassibaAIAssistant />
    </div>
  )
}
