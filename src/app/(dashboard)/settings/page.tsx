'use client'

import React from 'react'
import { 
  Settings, 
  Building2, 
  Users,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  Server,
  HardDrive
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Paramètres Enterprise
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuration de HASSIBA Suite ERP • Déploiement 25,000 utilisateurs
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4" />
          Sauvegarder
        </Button>
      </div>

      {/* System Status Banner */}
      <div className="rounded-lg bg-gradient-to-r from-dz-green/10 to-blue-50 border border-dz-green/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-dz-green" />
          <div>
            <p className="font-semibold text-dz-green">Système Opérationnel</p>
            <p className="text-sm text-muted-foreground">
              HASSIBA Suite ERP v2.0.0 Enterprise • Uptime: 99.9% • Dernière synchro: Temps réel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-green-500 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Production
          </Badge>
          <Badge variant="secondary">25K Users Ready</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="entreprise" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
          <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="systeme">Système</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        {/* Entreprise Tab */}
        <TabsContent value="entreprise" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informations Entreprise
                </CardTitle>
                <CardDescription>Données de base de votre société - Conforme réglementation algérienne</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Raison Sociale</Label>
                    <Input id="company-name" defaultValue="HASSIBA Suite ERP - Siège Algérie" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nrc">N° Registre Commerce (RC)</Label>
                    <Input id="company-nrc" defaultValue="16A1234567890ABC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nif">NIF (Numéro Identité Fiscale)</Label>
                    <Input id="company-nif" defaultValue="000016001234567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nis">NIS (Numéro Identité Statistique)</Label>
                    <Input id="company-nis" defaultValue="10001234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-capital">Capital Social (DZD)</Label>
                    <Input id="company-capital" defaultValue="1000000000" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-activity">Code Activité</Label>
                    <Input id="company-activity" defaultValue="1234AB" />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-address">Adresse</Label>
                    <Input id="company-address" defaultValue="123 Rue Didouche Mourad, Alger Centre" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville / Wilaya (58)</Label>
                    <Select defaultValue="16">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la wilaya" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">16 - Alger</SelectItem>
                        <SelectItem value="31">31 - Oran</SelectItem>
                        <SelectItem value="13">13 - Constantine</SelectItem>
                        <SelectItem value="09">09 - Béjaïa</SelectItem>
                        <SelectItem value="25">25 - Sétif</SelectItem>
                        <SelectItem value="28">28 - Tlemcen</SelectItem>
                        <SelectItem value="43">43 - Mila</SelectItem>
                        <SelectItem value="19">19 - Sidi Bel Abbès</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Téléphone</Label>
                    <Input id="company-phone" defaultValue="+213 21 23 45 67" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Email Professionnel</Label>
                    <Input id="company-email" defaultValue="contact@hassiba-suite.dz" type="email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paramètres Fiscaux Algériens */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-dz-green" />
                  Paramètres Fiscaux Algériens
                </CardTitle>
                <CardDescription>Configuration des obligations fiscales algériennes (TVA/TAP/IRG/IBS)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tva-rate">Taux TVA par défaut (%)</Label>
                    <Select defaultValue="19">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le taux" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="19">19% (Standard)</SelectItem>
                        <SelectItem value="14">14% (Réduit)</SelectItem>
                        <SelectItem value="9">9% (Spécifique)</SelectItem>
                        <SelectItem value="0">Exonéré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tap-rate">Taux TAP par zone (%)</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le taux" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1% (Zone A)</SelectItem>
                        <SelectItem value="2">2% (Zone B)</SelectItem>
                        <SelectItem value="3">3% (Zone C)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Régime d&apos;imposition</Label>
                    <Select defaultValue="reel">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le régime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reel">Régime Réel (CA &gt; 30M DZD)</SelectItem>
                        <SelectItem value="simplifie">Régime Simplifié</SelectItem>
                        <SelectItem value="forfait">Régime Forfaitaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Périodicité déclaration TVA (G50)</Label>
                    <Select defaultValue="mensuel">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la périodicité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensuel">Mensuel</SelectItem>
                        <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge className="bg-dz-green/10 text-dz-green border-dz-green/20">SCF Compliant</Badge>
                    Paramètres SCF Actifs
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Plan Comptable SCF
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      TVA G50 Automatisé
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      IRG Barème Progressif
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      CNAS/CASNOS Intégré
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Utilisateur Tab */}
        <TabsContent value="utilisateur">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-1">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-dz-green to-dz-red flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-white">AD</span>
                  </div>
                  <h3 className="font-semibold text-lg">Admin HASSIBA</h3>
                  <p className="text-muted-foreground text-sm">Administrateur Système</p>
                  <Badge className="mt-2 bg-gradient-to-r from-dz-green to-dz-red text-white border-0">Super Admin</Badge>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>admin@hassiba-suite.dz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Département:</span>
                      <span>Direction IT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dernière connexion:</span>
                      <span>Aujourd'hui</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions actives:</span>
                      <span>2,450</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Profil Utilisateur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Nom Complet</Label>
                      <Input id="user-name" defaultValue="Admin HASSIBA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input id="user-email" defaultValue="admin@hassiba-suite.dz" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-phone">Téléphone</Label>
                      <Input id="user-phone" defaultValue="+213 555 123 456" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-role">Rôle</Label>
                      <Select defaultValue="admin">
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Directeur</SelectItem>
                          <SelectItem value="accountant">Comptable</SelectItem>
                          <SelectItem value="hr">RH</SelectItem>
                          <SelectItem value="sales">Commercial</SelectItem>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="viewer">Consultant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Changer le mot de passe</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Mot de passe actuel</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nouveau mot de passe</Label>
                        <Input id="new-password" type="password" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Préférences de Notification Enterprise
                </CardTitle>
                <CardDescription>Gérez les alertes pour 25,000+ utilisateurs et systèmes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Notifications par Email', desc: 'Recevoir les notifications importantes par email', enabled: true },
                  { title: 'Alertes Stock Bas (Multi-sites)', desc: 'Notifier quand un produit est en dessous du seuil sur 6 sites', enabled: true },
                  { title: 'Rappels Fiscaux (G50/G1/G2/G4)', desc: 'Rappeler les échéances fiscales algériennes à venir', enabled: true },
                  { title: 'Nouvelles Commandes', desc: 'Notifier pour chaque nouvelle commande (1,847/mois)', enabled: false },
                  { title: 'Rapports Hebdomadaires Exec', desc: 'Envoyer un résumé hebdomadaire à la direction', enabled: true },
                  { title: 'Alertes Paiement', desc: 'Notifier pour les paiements en retard (créances 1.8B)', enabled: true },
                  { title: 'Alertes RH (25K)', desc: 'Notifications sur congés, recrutement, paie', enabled: true },
                  { title: 'Sécurité Système', desc: 'Alertes sur tentatives d\'accès, sauvegardes', enabled: true },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Système Tab */}
        <TabsContent value="systeme">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Langue & Région */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Langue & Région
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Langue de l&apos;interface</Label>
                    <Select defaultValue="fr">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        <SelectItem value="ar">🇩🇿 العربية (RTL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select defaultValue="dz">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dz">(GMT+1) Alger - Algérie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format de date</Label>
                    <Select defaultValue="fr-dz">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr-dz">DD/MM/YYYY</SelectItem>
                        <SelectItem value="iso">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Devise principale</Label>
                    <Select defaultValue="dzd">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dzd">🇩🇿 DZD - Dinar Algérien</SelectItem>
                        <SelectItem value="eur">EUR - Euro</SelectItem>
                        <SelectItem value="usd">USD - Dollar US</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Apparence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Apparence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Thème</Label>
                    <Select defaultValue="system">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Clair</SelectItem>
                        <SelectItem value="dark">Sombre</SelectItem>
                        <SelectItem value="system">Système</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur principale (Algerian Theme)</Label>
                    <div className="flex gap-2">
                      {['#006233', '#D21034', '#2563eb', '#7c3aed', '#059669'].map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${color === '#006233' ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Sidebar compacte</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Mode haute performance (25K users)</Label>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              {/* Base de données Enterprise */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Données Enterprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Dernière sauvegarde</span>
                      <span className="font-medium text-green-600">Aujourd&apos;hui 02:00 ✓</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taille de la BDD</span>
                      <span className="font-medium">12.4 GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Enregistrements Employés</span>
                      <span className="font-medium">25,000+</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Enregistrements Transactions</span>
                      <span className="font-medium">1.2M+</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Version HASSIBA</span>
                      <Badge variant="secondary">v2.0.0 Enterprise</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <HardDrive className="w-4 h-4" />
                    Sauvegarder maintenant
                  </Button>
                </CardContent>
              </Card>

              {/* Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Performance Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uptime</span>
                      <span className="font-medium text-green-600">99.97%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Latence moyenne</span>
                      <span className="font-medium">&lt;50ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Requêtes/seconde</span>
                      <span className="font-medium">10K+</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Utilisateurs simultanés max</span>
                      <span className="font-medium">5,000</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Cache activé</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Compression données</Label>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Sécurité Tab */}
        <TabsContent value="securite">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sécurité Enterprise
                  </CardTitle>
                  <CardDescription>Protection pour 25,000 utilisateurs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authentification 2FA</p>
                      <p className="text-sm text-muted-foreground">Double authentification obligatoire</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Session automatique</p>
                      <p className="text-sm text-muted-foreground">Déconnexion après inactivité</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Audit Trail</p>
                      <p className="text-sm text-muted-foreground">Journalisation complète des actions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">IP Whitelist</p>
                      <p className="text-sm text-muted-foreground">Restreindre par adresse IP</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conformité RGPD / Algérie</CardTitle>
                  <CardDescription>Réglementations de protection des données</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Conformité Active</span>
                    </div>
                    <ul className="text-sm space-y-1 text-green-600">
                      <li>✓ Chiffrement AES-256</li>
                      <li>✓ Sauvegardes automatisées</li>
                      <li>✓ Politique de rétention</li>
                      <li>✓ Droit à l'oubli</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-700">Backup Strategy</span>
                    </div>
                    <ul className="text-sm space-y-1 text-blue-600">
                      <li>• Quotidien: Incrémental</li>
                      <li>• Hebdomadaire: Complet</li>
                      <li>• Mensuel: Archive longue durée</li>
                      <li>• RPO: 1 heure | RTO: 4 heures</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
