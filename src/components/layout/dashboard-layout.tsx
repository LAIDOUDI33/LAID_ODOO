'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check saved preference
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
    <div className="min-h-screen bg-background">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
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
            'lg:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-300',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
        </div>

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[280px]'
          )}
        >
          <Header onMobileMenuToggle={handleMobileToggle} />
          
          <div className="p-4 md:p-6 lg:p-8 pb-20">
            {children}
          </div>

          {/* Footer */}
          <footer className="fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 transition-all duration-300"
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
                <span className="text-dz-green font-medium">✓ Production Ready</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
