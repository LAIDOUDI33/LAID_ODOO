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
  Save
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
            Paramètres
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuration générale de l'application ERP-DZ
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4" />
          Sauvegarder
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="entreprise" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
          <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="systeme">Système</TabsTrigger>
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
                <CardDescription>Données de base de votre société</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Raison Sociale</Label>
                    <Input id="company-name" defaultValue="SARL ERP-DZ Algérie" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nrc">N° Registre Commerce</Label>
                    <Input id="company-nrc" defaultValue="16A1234567890ABC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nif">NIF (Identité Fiscale)</Label>
                    <Input id="company-nif" defaultValue="000016001234567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-nis">NIS (Statistique)</Label>
                    <Input id="company-nis" defaultValue="10001234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-capital">Capital Social (DZD)</Label>
                    <Input id="company-capital" defaultValue="2000000" type="number" />
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
                    <Input id="company-address" defaultValue="123 Rue Didouche Mourad, Alger" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-city">Ville / Wilaya</Label>
                    <Select defaultValue="16">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la wilaya" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">Alger</SelectItem>
                        <SelectItem value="31">Oran</SelectItem>
                        <SelectItem value="13">Constantine</SelectItem>
                        <SelectItem value="09">Béjaïa</SelectItem>
                        <SelectItem value="25">Sétif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Téléphone</Label>
                    <Input id="company-phone" defaultValue="+213 21 23 45 67" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Email Professionnel</Label>
                    <Input id="company-email" defaultValue="contact@erp-dz.dz" type="email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paramètres Fiscaux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Paramètres Fiscaux
                </CardTitle>
                <CardDescription>Configuration des obligations fiscales algériennes</CardDescription>
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
                        <SelectItem value="19">19%</SelectItem>
                        <SelectItem value="14">14%</SelectItem>
                        <SelectItem value="9">9%</SelectItem>
                        <SelectItem value="0">Exonéré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tap-rate">Taux TAP (%)</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le taux" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1%</SelectItem>
                        <SelectItem value="2">2%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Régime d'imposition</Label>
                    <Select defaultValue="reel">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le régime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reel">Régime Réel</SelectItem>
                        <SelectItem value="simplifie">Régime Simplifié</SelectItem>
                        <SelectItem value="forfait">Régime Forfaitaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Périodicité déclaration TVA</Label>
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
                  <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold text-primary">AD</span>
                  </div>
                  <h3 className="font-semibold text-lg">Admin DZ</h3>
                  <p className="text-muted-foreground text-sm">Administrateur Système</p>
                  <Badge variant="secondary" className="mt-2">Super Admin</Badge>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>admin@erp-dz.dz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Département:</span>
                      <span>Informatique</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dernière connexion:</span>
                      <span>Aujourd'hui</span>
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
                      <Input id="user-name" defaultValue="Admin DZ" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input id="user-email" defaultValue="admin@erp-dz.dz" type="email" />
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
                  Préférences de Notification
                </CardTitle>
                <CardDescription>Gérez comment et quand vous recevez les notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Notifications par Email', desc: 'Recevoir les notifications importantes par email', enabled: true },
                  { title: 'Alertes Stock Bas', desc: 'Notifier quand un produit est en dessous du seuil', enabled: true },
                  { title: 'Rappels Fiscaux', desc: 'Rappeler les échéances fiscales à venir', enabled: true },
                  { title: 'Nouvelles Commandes', desc: 'Notifier pour chaque nouvelle commande', enabled: false },
                  { title: 'Rapports Hebdomadaires', desc: 'Recevoir un résumé hebdomadaire', enabled: true },
                  { title: 'Alertes Paiement', desc: 'Notifier pour les paiements en retard', enabled: true },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
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
                    <Label>Langue de l'interface</Label>
                    <Select defaultValue="fr">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        <SelectItem value="ar">🇩🇿 العربية</SelectItem>
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
                        <SelectItem value="dz">(GMT+1) Alger</SelectItem>
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
                    <Label>Couleur principale</Label>
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
                </CardContent>
              </Card>

              {/* Base de données */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Données
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Dernière sauvegarde</span>
                      <span className="font-medium">Aujourd'hui 02:00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taille de la BDD</span>
                      <span className="font-medium">124 Mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Version</span>
                      <span className="font-medium">v1.0.0</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <Database className="w-4 h-4" />
                    Sauvegarder maintenant
                  </Button>
                </CardContent>
              </Card>

              {/* Sécurité */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authentification 2FA</p>
                      <p className="text-sm text-muted-foreground">Double authentification</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Session automatique</p>
                      <p className="text-sm text-muted-foreground">Déconnexion après inactivité</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                      </SelectContent>
                    </Select>
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
