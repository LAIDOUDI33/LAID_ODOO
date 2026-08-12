'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  WifiOff, 
  RefreshCw, 
  Database, 
  FileText, 
  LayoutDashboard,
  Package,
  Users,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

// Types for cached data
interface CachedDataInfo {
  name: string
  count: number
  icon: React.ElementType
  color: string
}

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false)
  const [cachedData, setCachedData] = useState<CachedDataInfo[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [animationPhase, setAnimationPhase] = useState(0)

  // Simulate cached data (in real app, this would come from IndexedDB or cache inspection)
  useEffect(() => {
    const mockCachedData: CachedDataInfo[] = [
      { name: 'Tableau de Bord', count: 1, icon: LayoutDashboard, color: 'text-dz-green' },
      { name: 'Factures', count: 12, icon: FileText, color: 'text-blue-600' },
      { name: 'Produits', count: 45, icon: Package, color: 'text-orange-600' },
      { name: 'Employés', count: 28, icon: Users, color: 'text-purple-600' },
    ]
    
    setCachedData(mockCachedData)
    
    // Get last sync time from localStorage
    const lastSync = localStorage.getItem('hassiba-last-sync')
    if (lastSync) {
      setLastSyncTime(new Date(lastSync).toLocaleString('fr-DZ', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }))
    }
    
    // Animation cycle
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 3)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleRetryConnection = useCallback(async () => {
    setIsRetrying(true)
    
    try {
      // Try to fetch a lightweight endpoint to check connectivity
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (response.ok) {
        // Connection restored - redirect to home
        window.location.href = '/'
      }
    } catch (error) {
      console.log('Still offline:', error)
    } finally {
      setIsRetrying(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Main Offline Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-dz-green via-dz-green-light to-dz-red p-8 text-center">
            {/* Animated Illustration */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              {/* Outer ring animation */}
              <div className={`absolute inset-0 rounded-full border-4 border-white/20 transition-all duration-500 ${
                animationPhase === 0 ? 'scale-100 opacity-50' : 'scale-110 opacity-0'
              }`} />
              <div className={`absolute inset-2 rounded-full border-4 border-white/30 transition-all duration-500 ${
                animationPhase === 1 ? 'scale-100 opacity-60' : 'scale-110 opacity-0'
              }`} />
              
              {/* Central icon container */}
              <div className={`absolute inset-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-transform duration-700 ${
                isRetrying ? 'animate-spin' : ''
              }`}>
                {isRetrying ? (
                  <RefreshCw className="w-12 h-12 text-white" />
                ) : (
                  <WifiOff className="w-12 h-12 text-white" />
                )}
              </div>
              
              {/* Floating particles */}
              <div className={`absolute top-0 left-1/2 w-2 h-2 bg-white/40 rounded-full transition-all duration-500 ${
                animationPhase === 0 ? '-translate-y-2 opacity-100' : 'translate-y-0 opacity-0'
              }`} />
              <div className={`absolute bottom-0 left-4 w-1.5 h-1.5 bg-white/30 rounded-full transition-all duration-500 delay-100 ${
                animationPhase === 1 ? '-translate-y-3 opacity-80' : 'translate-y-0 opacity-0'
              }`} />
              <div className={`absolute bottom-2 right-4 w-2 h-2 bg-white/35 rounded-full transition-all duration-500 delay-200 ${
                animationPhase === 2 ? '-translate-y-2 opacity-90' : 'translate-y-0 opacity-0'
              }`} />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Vous êtes hors ligne
            </h1>
            <p className="text-white/80 text-sm">
              Vérifiez votre connexion Internet et réessayez
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Status Message */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Mode Hors Ligne Activé
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Certaines fonctionnalités sont limitées. Vos données seront synchronisées automatiquement lorsque la connexion sera rétablie.
                </p>
              </div>
            </div>

            {/* Cached Data Summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-dz-green" />
                <span className="text-sm font-semibold text-gray-700">Données Disponibles Hors Ligne</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  Mise en cache active
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {cachedData.map((item) => (
                  <Link
                    key={item.name}
                    href="/"
                    className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                  >
                    <item.icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.count} éléments</p>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-dz-green flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Last Sync Info */}
            {lastSyncTime && (
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>Dernière synchronisation:</span>
                <span className="font-medium">{lastSyncTime}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleRetryConnection}
                disabled={isRetrying}
                className="w-full bg-dz-green hover:bg-dz-green-dark text-white font-medium py-3"
                size="lg"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Tentative de reconnexion...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer la connexion
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                asChild
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Link href="/">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Accéder au mode hors ligne
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-primary">HASSIBA Suite ERP</span> v2.0.0
          </p>
          <p className="text-xs text-gray-400">
            🇩🇿 Solution Enterprise Algérienne
          </p>
          
          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
            <p className="text-xs font-medium text-blue-800 mb-1">💡 Conseils:</p>
            <ul className="text-xs text-blue-700 space-y-1 ml-3">
              <li>• Les formulaires remplis seront envoyés automatiquement</li>
              <li>• Les pages visitées sont disponibles hors ligne</li>
              <li>• Activez les notifications pour les mises à jour</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
