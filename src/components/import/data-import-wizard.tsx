'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Download,
  X,
  Loader2,
  Database,
  Users,
  Package,
  Handshake,
  FileText,
  Receipt,
  Clock,
  PenLine,
  Warehouse,
  ArrowLeftRight,
  Building,
  Banknote,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Types
interface ImportModule {
  module: string;
  name: string;
  description: string;
  icon: string;
}

interface ImportJob {
  id: string;
  jobName: string;
  module: string;
  status: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  progress: number;
  fileName: string;
  createdAt: string;
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Users: <Users className="h-5 w-5" />,
  BookOpen: <PenLine className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Handshake: <Handshake className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Receipt: <Receipt className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  PenLine: <PenLine className="h-5 w-5" />,
  Warehouse: <Warehouse className="h-5 w-5" />,
  ArrowLeftRight: <ArrowLeftRight className="h-5 w-5" />,
  ShoppingCart: <Package className="h-5 w-5" />,
  ClipboardList: <FileText className="h-5 w-5" />,
  Building: <Building className="h-5 w-5" />,
  Banknote: <Banknote className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />
};

// Status colors
const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  validating: 'bg-blue-100 text-blue-700',
  validated: 'bg-indigo-100 text-indigo-700',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  partially_completed: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rolled_back: 'bg-purple-100 text-purple-700'
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  validating: 'Validation...',
  validated: 'Validé',
  processing: 'Import en cours',
  completed: 'Terminé',
  partially_completed: 'Partiellement terminé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  rolled_back: 'Annulé (rollback)'
};

// Main Import Wizard Component
export function DataImportWizard({ companyId }: { companyId: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [options, setOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
    continueOnError: true,
    validateOnly: false
  });
  
  const steps = [
    { title: 'Choisir le module', description: 'Sélectionnez le type de données à importer' },
    { title: 'Importer le fichier', description: 'Téléchargez votre fichier CSV ou Excel' },
    { title: 'Configurer', description: 'Vérifiez les options d\'import' },
    { title: 'Valider & Importer', description: 'Lancez l\'import des données' }
  ];
  
  // Fetch available modules
  const [modules, setModules] = useState<ImportModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  
  React.useEffect(() => {
    fetch('/api/import?action=modules')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setModules(data.modules);
        }
        setLoadingModules(false);
      })
      .catch(() => setLoadingModules(false));
  }, []);
  
  // Poll for progress when importing
  React.useEffect(() => {
    if (!currentJobId || !isPolling) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/import?action=progress&jobId=${currentJobId}`);
        const data = await res.json();
        
        if (data.success && data.progress) {
          setImportStatus(data.progress);
          
          if (['completed', 'partially_completed', 'failed', 'rolled_back'].includes(data.progress.status)) {
            setIsPolling(false);
            // Get final job details
            fetch(`/api/import?action=details&jobId=${currentJobId}`)
              .then(res => res.json())
              .then(data => {
                if (data.success) setImportStatus(data.job);
              });
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentJobId, isPolling]);
  
  // Handle file drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile.name)) {
        setFile(droppedFile);
      }
    }
  }, []);
  
  const isValidFileType = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.csv') || 
           fileName.toLowerCase().endsWith('.xlsx') || 
           fileName.toLowerCase().endsWith('.xls');
  };
  
  // Upload file and create job
  const handleUpload = async () => {
    if (!file || !selectedModule || !companyId) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('module', selectedModule);
      formData.append('action', 'upload');
      formData.append('options', JSON.stringify(options));
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentJobId(data.jobId);
        setCurrentStep(3); // Go to final step
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      alert(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Start validation/import
  const handleStartImport = async (validateOnly = false) => {
    if (!currentJobId) return;
    
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: validateOnly ? 'validate' : 'start',
          jobId: currentJobId,
          options
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsPolling(true);
        setImportStatus({ status: validateOnly ? 'validating' : 'processing', progress: 0 });
      }
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };
  
  // Download template
  const downloadTemplate = async (format: string = 'csv') => {
    if (!selectedModule) return;
    
    window.open(`/api/import?action=download-template&module=${selectedModule}&format=${format}`, '_blank');
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Card 
                key={mod.module}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedModule === mod.module ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => setSelectedModule(mod.module)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedModule === mod.module ? 'bg-primary/10' : 'bg-muted'}`}>
                      {iconMap[mod.icon] || <Database className="h-5 w-5" />}
                    </div>
                    <CardTitle className="text-sm font-medium">{mod.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : file ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {file ? (
                <div className="space-y-3">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Changer de fichier
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="font-medium">Glissez votre fichier ici</p>
                    <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Formats supportés: CSV, XLSX, XLS</p>
                </div>
              )}
            </div>
            
            {/* Template download */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Pas de fichier ?</p>
                  <p className="text-xs text-muted-foreground">Téléchargez le template pré-formaté</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            {/* File summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Résumé du fichier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fichier:</span>
                    <span className="ml-2 font-medium">{file?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Module:</span>
                    <span className="ml-2 font-medium capitalize">
                      {modules.find(m => m.module === selectedModule)?.name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Options d&apos;import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="skipDuplicates">Ignorer les doublons</Label>
                    <p className="text-xs text-muted-foreground">Ne pas importer les enregistrements existants</p>
                  </div>
                  <Switch
                    id="skipDuplicates"
                    checked={options.skipDuplicates}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipDuplicates: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="updateExisting">Mettre à jour les existants</Label>
                    <p className="text-xs text-muted-foreground">Remplacer les données existantes</p>
                  </div>
                  <Switch
                    id="updateExisting"
                    checked={options.updateExisting}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, updateExisting: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="continueOnError">Continuer en cas d&apos;erreur</Label>
                    <p className="text-xs text-muted-foreground">Ne pas arrêter si une ligne échoue</p>
                  </div>
                  <Switch
                    id="continueOnError"
                    checked={options.continueOnError}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, continueOnError: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="validateOnly">Validation uniquement</Label>
                    <p className="text-xs text-muted-foreground">Vérifier sans importer</p>
                  </div>
                  <Switch
                    id="validateOnly"
                    checked={options.validateOnly}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, validateOnly: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            {!isPolling && !importStatus ? (
              /* Ready to start */
              <div className="text-center py-8 space-y-4">
                <Database className="mx-auto h-16 w-16 text-primary/30" />
                <div>
                  <h3 className="text-lg font-semibold">Prêt à importer</h3>
                  <p className="text-muted-foreground">
                    Cliquez sur le bouton ci-dessous pour démarrer l&apos;import
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => handleStartImport(true)}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Valider seulement
                  </Button>
                  <Button onClick={() => handleStartImport(false)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Lancer l&apos;import
                  </Button>
                </div>
              </div>
            ) : (
              /* Progress */
              <div className="space-y-6">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <Badge className={statusColors[importStatus?.status || 'pending']}>
                    {statusLabels[importStatus?.status] || 'En cours...'}
                  </Badge>
                  {importStatus?.progress !== undefined && (
                    <span className="text-sm font-medium">{Math.round(importStatus.progress)}%</span>
                  )}
                </div>
                
                {/* Progress bar */}
                <Progress value={importStatus?.progress || 0} className="h-3" />
                
                {/* Stats */}
                {(importStatus?.totalRows > 0 || importStatus?.successCount > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-primary">{importStatus.totalRows || 0}</p>
                        <p className="text-xs text-muted-foreground">Total lignes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{importStatus.successCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Réussies</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{importStatus.errorCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Erreurs</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold">{importStatus.currentRow || 0}/{importStatus.totalRows || 0}</p>
                        <p className="text-xs text-muted-foreground">Progression</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Loading spinner during processing */}
                {isPolling && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      {importStatus?.message || 'Traitement en cours...'}
                    </span>
                  </div>
                )}
                
                {/* Completion message */}
                {['completed', 'partially_completed'].includes(importStatus?.status) && (
                  <div className={`p-4 rounded-lg ${importStatus.errorCount > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-start gap-3">
                      {importStatus.errorCount > 0 ? (
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">
                          {importStatus.errorCount > 0 ? 'Import partiellement terminé' : 'Import terminé avec succès'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {importStatus.successCount} lignes importées avec succès
                          {importStatus.errorCount > 0 && `, ${importStatus.errorCount} erreur(s)`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {importStatus?.status === 'failed' && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Échec de l&apos;import</p>
                        <p className="text-sm text-red-600 mt-1">
                          Une erreur est survenue. Vérifiez vos données et réessayez.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions after completion */}
                {['completed', 'partially_completed', 'failed', 'rolled_back'].includes(importStatus?.status) && (
                  <div className="flex justify-center gap-3 pt-4">
                    <Button variant="outline" onClick={() => {
                      setCurrentStep(0);
                      setSelectedModule(null);
                      setFile(null);
                      setCurrentJobId(null);
                      setImportStatus(null);
                      setIsPolling(false);
                    }}>
                      Nouvel import
                    </Button>
                    {importStatus?.status !== 'rolled_back' && currentJobId && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={async () => {
                          if (confirm('Êtes-vous sûr de vouloir annuler cet import ?')) {
                            await fetch(`/api/import?jobId=${currentJobId}&action=rollback`, { method: 'DELETE' });
                            setImportStatus({ ...importStatus, status: 'rolled_back' });
                          }
                        }}
                      >
                        Annuler l&apos;import (Rollback)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Import de Données Historiques</h2>
        <p className="text-muted-foreground">
          Importez vos données existantes depuis un fichier CSV ou Excel
        </p>
      </div>
      
      {/* Steps indicator */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className={`flex flex-col items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStep ? 'bg-primary text-white' :
                index === currentStep ? 'bg-primary text-white' : 'bg-muted'
              }`}>
                {index < currentStep ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block max-w-[100px] text-center">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingModules ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            renderStepContent()
          )}
        </CardContent>
      </Card>
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(currentStep - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Précédent
        </Button>
        
        <Button
          disabled={
            (currentStep === 0 && !selectedModule) ||
            (currentStep === 1 && !file) ||
            (currentStep === 2 && isUploading)
          }
          onClick={() => {
            if (currentStep === 2) {
              handleUpload();
            } else {
              setCurrentStep(currentStep + 1);
            }
          }}
        >
          {currentStep === 2 ? (
            <>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Démarrer l&apos;import
                </>
              )}
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Import History Component
export function ImportHistory({ companyId }: { companyId: string }) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  
  React.useEffect(() => {
    fetch(`/api/import?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJobs(data.jobs);
        }
        setLoading(false);
      });
  }, [companyId]);
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Historique des imports</h3>
      
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun import effectué pour le moment
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className={`${selectedJob?.id === job.id ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{job.jobName}</p>
                      <p className="text-sm text-muted-foreground">{job.fileName} • {new Date(job.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                      <span className="text-green-600">{job.successCount} ✓</span>
                      {job.errorCount > 0 && <span className="text-red-600">{job.errorCount} ✗</span>}
                    </div>
                    
                    <Badge className={statusColors[job.status] || ''}>
                      {statusLabels[job.status]}
                    </Badge>
                    
                    {/* Actions */}
                    {['completed', 'partially_completed'].includes(job.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm('Annuler cet import ?')) {
                            await fetch(`/api/import?jobId=${job.id}&action=rollback`, { method: 'DELETE' });
                            // Refresh list
                            window.location.reload();
                          }
                        }}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Expanded details */}
                {selectedJob?.id === job.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2 font-medium">{job.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Réussi:</span>
                        <span className="ml-2 font-medium text-green-600">{job.successCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Erreurs:</span>
                        <span className="ml-2 font-medium text-red-600">{job.errorCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avertissements:</span>
                        <span className="ml-2 font-medium text-yellow-600">{job.warningCount}</span>
                      </div>
                    </div>
                    
                    {job.progress > 0 && job.progress < 100 && (
                      <div className="mt-3">
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Quick Import Button for Dashboard
export function QuickImportButton({ module, companyId }: { module: string; companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
      <Upload className="h-4 w-4 mr-1" />
      Importer
    </Button>
  );
}

export default DataImportWizard;
