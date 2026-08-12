'use client';

import React from 'react';
import { DataImportWizard, ImportHistory } from '@/components/import/data-import-wizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  History, 
  FileSpreadsheet, 
  ArrowRightLeft,
  CheckCircle2,
  Info
} from 'lucide-react';

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
        <Card className="mb-8 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
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

        {/* Main Tabs */}
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Nouvel Import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <DataImportWizard companyId={DEFAULT_COMPANY_ID} />
          </TabsContent>

          <TabsContent value="history">
            <ImportHistory companyId={DEFAULT_COMPANY_ID} />
          </TabsContent>
        </Tabs>

        {/* Features Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
