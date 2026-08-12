import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SessionProvider } from "@/components/auth/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PWA Viewport Configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#047857' }
  ],
};

export const metadata: Metadata = {
  title: "HASSIBA Suite ERP | Système de Gestion Intégré Algérien",
  description: "HASSIBA Suite ERP - Solution entreprise complète adaptée au contexte algérien. Finance, Comptabilité SCF, Ventes, RH/Paie, Stocks, Production, BI Analytics. Déploiement pour 25,000+ employés.",
  keywords: [
    "HASSIBA Suite ERP",
    "ERP Algérie",
    "Système de Gestion",
    "Comptabilité SCF",
    "DZD",
    "TVA Algérie",
    "TAP",
    "IRG",
    "CNAS",
    "CASNOS",
    "Facturation",
    "Ressources Humaines",
    "Paie Algérie",
    "Business Intelligence",
    "Enterprise Resource Planning"
  ],
  authors: [{ name: "HASSIBA Suite Team" }],
  icons: {
    icon: [
      { url: "/icons/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HASSIBA ERP",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "HASSIBA Suite ERP - Plateforme de Gestion Algérienne",
    description: "Solution ERP enterprise complète pour les entreprises algériennes - 25,000 employés",
    type: "website",
    locale: "fr_DZ",
    siteName: "HASSIBA Suite ERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "HASSIBA Suite ERP",
    description: "Système de Gestion Intégré Algérien",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "HASSIBA",
    "application-name": "HASSIBA Suite ERP",
    "msapplication-TileColor": "#059669",
    "msapplication-tap-highlight": "no",
  },
};

// PWA Service Worker Registration Component
function SWRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('[HASSIBA PWA] ServiceWorker registration successful with scope: ', registration.scope);
                  
                  // Check for updates
                  registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                      newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          // New content is available
                          console.log('[HASSIBA PWA] New content available, refresh to update');
                          // Could show update notification here
                        }
                      });
                    }
                  });
                })
                .catch(function(error) {
                  console.log('[HASSIBA PWA] ServiceWorker registration failed: ', error);
                });
              
              // Handle connection status
              function updateOnlineStatus() {
                document.body.classList.toggle('offline', !navigator.onLine);
                window.dispatchEvent(new CustomEvent('online-status-change', { 
                  detail: { online: navigator.onLine } 
                }));
              }
              
              window.addEventListener('online', updateOnlineStatus);
              window.addEventListener('offline', updateOnlineStatus);
              updateOnlineStatus();
            });
          }
          
          // Prevent zoom on double tap for iOS
          let lastTouchEnd = 0;
          document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
              event.preventDefault();
            }
            lastTouchEnd = now;
          }, false);
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/favicon.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HASSIBA" />
        <SWRegistration />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </SessionProvider>
        <Toaster />
        
        {/* No-script fallback */}
        <noscript>
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            textAlign: 'center'
          }}>
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>JavaScript requis</h1>
              <p style={{ color: '#666' }}>HASSIBA Suite ERP nécessite JavaScript pour fonctionner. Veuillez activer JavaScript dans les paramètres de votre navigateur.</p>
            </div>
          </div>
        </noscript>
      </body>
    </html>
  );
}
