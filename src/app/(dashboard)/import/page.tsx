'use client';

import React from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, ArrowRightLeft, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Default company ID (in real app, get from auth context)
const DEFAULT_COMPANY_ID = 'default-company';

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Import de Données</h1>
              <p className="text-muted-foreground">
                Importez vos données historiques pour initialiser votre système ERP
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Info Banner */}
        <Card className="mb-8 border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Recommandation d&apos;ordre d&apos;import</p>
                <p>Pour une migration réussie, importez les données dans cet ordre :</p>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
                  <li><strong>Données de référence</strong> : Plan comptable → Tiers → Entrepôts → Produits → Employés</li>
                  <li><strong>États initiaux</strong> : Stocks → Soldes d&apos;ouverture</li>
                  <li><strong>Historique</strong> : Factures clients/fournisseurs → Présences → Paie</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Templates Pré-formatés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Téléchargez des templates Excel/CSV pré-configurés pour chaque module avec 
                les colonnes correctes et des exemples de données.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Validation Intelligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Validation automatique des données avant import : formats, doublons, 
                références croisées et règles métier spécifiques.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-5 w-5 text-orange-600" />
                Rollback Complet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Possibilité d&apos;annuler un import et de restaurer l&apos;état précédent 
                en cas d&apos;erreur ou de données incorrectes.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Message */}
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <Upload className="mx-auto h-16 w-16 text-primary/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Fonctionnalité d&apos;Import</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              L&apos;outil d&apos;import de données historiques est en cours de développement. 
              Il permettra d&apos;importer facilement vos données depuis des fichiers CSV ou Excel.
            </p>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-lg mx-auto text-left">
              <h4 className="font-medium mb-2">Modules supportés :</h4>
              <ul className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                <li>• Employés (RH)</li>
                <li>• Plan Comptable (Finance)</li>
                <li>• Produits & Services</li>
                <li>• Clients & Fournisseurs</li>
                <li>• Factures Clients</li>
                <li>• Factures Fournisseurs</li>
                <li>• Présences & Pointage</li>
                <li>• Écritures Comptables</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
