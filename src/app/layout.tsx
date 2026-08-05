import type { Metadata } from "next";
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
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "HASSIBA Suite ERP - Plateforme de Gestion Algérienne",
    description: "Solution ERP enterprise complète pour les entreprises algériennes - 25,000 employés",
    type: "website",
    locale: "fr_DZ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
