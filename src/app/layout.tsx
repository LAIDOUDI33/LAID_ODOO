import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP-DZ | Système de Gestion Intégré Algérien",
  description: "ERP-DZ - Solution complète de gestion d'entreprise adaptée au contexte algérien. Finance, Ventes, RH, Stocks et plus.",
  keywords: [
    "ERP", 
    "Algérie", 
    "Gestion", 
    "Comptabilité", 
    "DZ", 
    "TVA", 
    "Facturation",
    "Ressources Humaines"
  ],
  authors: [{ name: "ERP-DZ Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ERP-DZ - Système de Gestion Algérien",
    description: "Solution ERP complète pour les entreprises algériennes",
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
        <DashboardLayout>
          {children}
        </DashboardLayout>
        <Toaster />
      </body>
    </html>
  );
}
