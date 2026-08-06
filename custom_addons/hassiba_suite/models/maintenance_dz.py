# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Maintenance Module for Algeria

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta


class MaintenanceEquipmentDZ(models.Model):
    _name = 'maintenance.equipment.dz'
    _description = 'Équipement de Maintenance (Algérie)'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'

    # Basic Info
    name = fields.Char(
        string="Nom de l'Équipement",
        required=True,
        tracking=True
    )
    code = fields.Char(
        string='Code Équipement',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('Nouveau')
    )
    
    # Equipment Classification
    categorie_equipement = fields.Selection([
        ('machine_production', 'Machine de Production'),
        ('vehicule', 'Véhicule'),
        ('outillage', 'Outillage & Outils'),
        ('informatique', 'Matériel Informatique'),
        ('batiment', 'Bâtiment & Infrastructure'),
        ('climatisation', 'Climatisation / CVC'),
        ('electrique', 'Installation Électrique'),
        ('securite', 'Équipement Sécurité'),
        ('autre', 'Autre'),
    ], string="Catégorie d'Équipement", required=True)
    
    sous_categorie = fields.Char(string='Sous-Catégorie')
    
    # Location
    wilaya_id = fields.Many2one(
        'dz.wilaya',
        string='Wilaya (Site)'
    )
    site_location = fields.Char(string='Site / Localisation')
    batiment = fields.Char(string='Bâtiment')
    etage_zone = fields.Char(string='Étage / Zone')
    
    # Technical Details
    marque = fields.Marque(string='Marque')
    modele = fields.Char(string='Modèle')
    numero_serie = fields.Char(string='Numéro de Série')
    date_acquisition = fields.Date(
        string="Date d'Acquisition",
        default=fields.Date.today
    )
    date_mise_en_service = fields.Date(
        string='Date Mise en Service'
    )
    valeur_acquisition_dzd = fields.Float(
        string="Valeur d'Acquisition (DZD)",
        digits=(16, 2)
    )
    duree_vie_estimee = fields.Integer(
        string='Durée de Vie Estimée (années)',
        default=10
    )
    
    # Status & Condition
    etat = fields.Selection([
        ('operationnel', 'Opérationnel'),
        ('en_panne', 'En Panne'),
        ('en_maintenance', 'En Maintenance'),
        ('hors_service', 'Hors Service'),
        ('en_stock', 'En Stock'),
    ], string='État Actuel', default='operationnel', tracking=True)
    
    niveau_usure = fields.Selection([
        ('neuf', 'Neuf'),
        ('bon', 'Bon État'),
        ('acceptable', 'Acceptable'),
        ('use', 'Usé'),
        ('tres_use', 'Très Usé'),
        ('obsolete', 'Obsolète'),
    ], string="Niveau d'Usure", default='bon')
    
    criticite = fields.Selection([
        ('critique', 'Critique - Arrêt Production'),
        ('important', 'Important - Dégradation Performance'),
        ('normal', 'Normal - Planifiable'),
        ('mineur', 'Mineur - Pas d\'Impact'),
    ], string='Criticit', default='normal')
    
    # Responsible
    responsable = fields.Many2one(
        'hr.employee',
        string='Responsable Équipement'
    )
    fournisseur_id = fields.Many2one(
        'res.partner',
        string='Fournisseur / Constructeur',
        domain="[('supplier_rank', '>', 0)]"
    )
    
    # Warranty & Certification
    sous_garantie = fields.Boolean(
        string='Sous Garantie',
        default=False
    )
    date_fin_garantie = fields.Date(
        string='Fin de Garantie'
    )
    certificat_conformite = fields.Boolean(
        string='Certificat Conformité',
        default=False
    )
    numero_certificat = fields.Char(
        string='N° Certificat Conformité'
    )
    
    # Maintenance Info
    frequence_maintenance_jours = fields.Integer(
        string='Fréquence Maintenance (jours)',
        default=90,
        help='Fréquence de maintenance préventive en jours'
    )
    derniere_maintenance = fields.Date(
        string='Dernière Maintenance'
    )
    prochaine_maintenance = fields.Date(
        string='Prochaine Maintenance',
        compute='_compute_prochaine_maintenance',
        store=True
    )
    cout_total_maintenance = fields.Float(
        string='Coût Total Maintenance (DZD)',
        compute='_compute_cout_total',
        store=True
    )
    
    # Statistics
    nb_interventions = fields.Integer(
        string="Nombre d'Interventions",
        compute='_compute_stats',
        store=True
    )
    nb_pannes = fields.Integer(
        string='Nombre de Pannes',
        compute='_compute_stats',
        store=True
    )
    temps_arret_heures = fields.Float(
        string="Temps d'Arrêt Total (heures)",
        compute='_compute_stats',
        store=True
    )
    
    # Documents
    notice_technique = fields.Binary(
        string='Notice Technique (PDF)'
    )
    plan_maintenance = fields.Binary(
        string='Plan de Maintenance (PDF)'
    )
    image_equipement = fields.Image(
        string='Photo Équipement'
    )
    
    # Relations
    intervention_ids = fields.One2many(
        'maintenance.intervention.dz',
        'equipment_id',
        string='Interventions'
    )
    piece_rechange_ids = fields.One2many(
        'maintenance.piece.rechange.dz',
        'equipment_id',
        string='Pièces de Rechange'
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('code', _('Nouveau')) == _('Nouveau'):
                vals['code'] = self.env['ir.sequence'].next_by_code('maintenance.equipment') or _('EQP-0000')
        return super().create(vals_list)

    @api.depends('derniere_maintenance', 'frequence_maintenance_jours')
    def _compute_prochaine_maintenance(self):
        for equip in self:
            if equip.derniere_maintenance and equip.frequence_maintenance_jours:
                equip.prochaine_maintenance = equip.derniere_maintenance + timedelta(days=equip.frequence_maintenance_jours)
            else:
                equip.prochaine_maintenance = fields.Date.today() + timedelta(days=equip.frequence_maintenance_jours or 90)

    @api.depends('intervention_ids.cout_total')
    def _compute_cout_total(self):
        for equip in self:
            equip.cout_total_maintenance = sum(intervention.cout_total for intervention in equip.intervention_ids)

    @api.depends('intervention_ids')
    def _compute_stats(self):
        for equip in self:
            interventions = equip.intervention_ids
            equip.nb_interventions = len(interventions)
            equip.nb_pannes = len(interventions.filtered(lambda i: i.type_intervention == 'corrective'))
            equip.temps_arret_heures = sum(interventions.mapped('duree_arret_heures'))

    def action_planifier_maintenance(self):
        """Plan a preventive maintenance"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Nouvelle Intervention',
            'res_model': 'maintenance.intervention.dz',
            'view_mode': 'form',
            'context': {
                'default_equipment_id': self.id,
                'default_type_intervention': 'preventive',
            },
        }

    def action_voir_historique(self):
        """View equipment history"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            "name": f"Historique - {self.name}",
            'res_model': 'maintenance.intervention.dz',
            'domain': [('equipment_id', '=', self.id)],
            'view_mode': 'tree,form,pivot_graph',
        }


class MaintenanceInterventionDZ(models.Model):
    _name = 'maintenance.intervention.dz'
    _description = 'Intervention de Maintenance (Algérie)'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_creation desc'

    name = fields.Char(
        string='Référence Intervention',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('Nouveau')
    )
    
    # Equipment Link
    equipment_id = fields.Many2one(
        'maintenance.equipment.dz',
        string='Équipement',
        required=True,
        ondelete='cascade'
    )
    
    # Type & Priority
    type_intervention = fields.Selection([
        ('preventive', 'Préventive (Planifiée)'),
        ('corrective', 'Corrective (Panne)'),
        ('ameliorative', 'Améliorative'),
        ('inspection', 'Inspection / Contrôle'),
    ], string="Type d'Intervention", required=True, default='corrective')
    
    priorite = fields.Selection([
        ('urgente', 'Urgente - Immédiate'),
        ('haute', 'Haute - 24h'),
        ('moyenne', 'Moyenne - 72h'),
        ('basse', 'Basse - Planifiable'),
    ], string='Priorité', default='moyenne')
    
    # Dates
    date_creation = fields.Datetime(
        string='Date Création',
        default=fields.Datetime.now
    )
    date_planifiee = fields.Datetime(
        string='Date Planifiée'
    )
    debut_intervention = fields.Datetime(
        string='Début Intervention'
    )
    fin_intervention = fields.Datetime(
        string='Fin Intervention'
    )
    
    # Duration
    duree_prevue_heures = fields.Float(
        string='Durée Prévue (heures)',
        default=2
    )
    duree_reelle_heures = fields.Float(
        string='Durée Réelle (heures)'
    )
    duree_arret_heures = fields.Float(
        string="Temps d'Arrêt (heures)",
        help="Temps pendant lequel l'équipement n'était pas opérationnel"
    )
    
    # Description
    symptome = fields.Text(
        string='Symptôme / Problème constaté',
        help='Description du problème ou motif de l\'intervention'
    )
    diagnostic = fields.Text(
        string='Diagnostic',
        help='Analyse technique de la cause racine'
    )
    travail_effectue = fields.Text(
        string='Travail Effectué',
        help='Description détaillée des travaux réalisés'
    )
    
    # Parts Used
    pieces_utilisees_ids = fields.Many2many(
        'maintenance.piece.rechange.dz',
        'intervention_piece_rel',
        'intervention_id',
        'piece_id',
        string='Pièces Utilisées'
    )
    
    # Technicians
    techniciens_ids = fields.Many2many(
        'hr.employee',
        'intervention_technicien_rel',
        'intervention_id',
        'technicien_id',
        string='Techniciens',
        domain="[('department_id.name', 'ilike', 'maintenance')]"
    )
    technicien_principal = fields.Many2one(
        'hr.employee',
        string='Technicien Principal'
    )
    
    # Costs
    cout_main_oeuvre = fields.Float(
        string='Coût Main d\'Œuvre (DZD)',
        digits=(16, 2)
    )
    cout_pieces = fields.Float(
        string='Coût Pièces (DZD)',
        digits=(16, 2)
    )
    cout_externe = fields.Float(
        string='Coût Externe/Prestataire (DZD)',
        digits=(16, 2)
    )
    cout_total = fields.Float(
        string='Coût Total (DZD)',
        compute='_compute_cout_total',
        store=True,
        digits=(16, 2)
    )
    
    # Status
    state = fields.Selection([
        ('brouillon', 'Brouillon'),
        ('planifie', 'Planifié'),
        ('en_cours', 'En Cours'),
        ('en_attente', 'En Attente (Pièce)'),
        ('termine', 'Terminé'),
        ('annule', 'Annulé'),
        ('valide', 'Validé'),
    ], string='État', default='brouillon', tracking=True)
    
    # Validation
    validateur = fields.Many2one(
        'res.users',
        string='Validé par'
    )
    date_validation = fields.Datetime(
        string='Date Validation'
    )
    
    # Result
    resultat = fields.Selection([
        ('repare', 'Réparé'),
        ('remplace', 'Remplacé'),
        ('ameliore', 'Amélioré'),
        ('non_reparable', 'Non Réparable'),
        ('fausse_alarme', 'Fausse Alarme'),
    ], string='Résultat')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('Nouveau')) == _('Nouveau'):
                vals['name'] = self.env['ir.sequence'].next_by_code('maintenance.intervention') or ('INT-' + 
                    fields.Date.today().strftime('%Y%m%d') + '-001')
        return super().create(vals_list)

    @api.depends('cout_main_oeuvre', 'cout_pieces', 'cout_externe')
    def _compute_cout_total(self):
        for intervention in self:
            intervention.cout_total = (
                (intervention.cout_main_oeuvre or 0) +
                (intervention.cout_pieces or 0) +
                (intervention.cout_externe or 0)
            )

    def action_demarrer(self):
        """Start the intervention"""
        self.write({
            'state': 'en_cours',
            'debut_intervention': fields.Datetime.now(),
        })

    def action_terminer(self):
        """Complete the intervention"""
        self.write({
            'state': 'termine',
            'fin_intervention': fields.Datetime.now(),
        })
        
        # Update equipment last maintenance date
        if self.equipment_id:
            self.equipment_id.write({
                'derniere_maintenance': fields.Date.today(),
                'etat': 'operationnel',
            })

    def action_valider(self):
        """Validate the intervention"""
        self.write({
            'state': 'valide',
            'validateur': self.env.user,
            'date_validation': fields.Datetime.now(),
        })


class MaintenancePieceRechangeDZ(models.Model):
    _name = 'maintenance.piece.rechange.dz'
    _description = 'Pièce de Rechange (Maintenance Algérie)'

    name = fields.Char(
        string='Désignation Pièce',
        required=True
    )
    code = fields.Char(
        string='Code Pièce',
        required=True
    )
    
    # Equipment Association
    equipment_id = fields.Many2one(
        'maintenance.equipment.dz',
        string='Équipement Associé'
    )
    
    # Product Link
    product_id = fields.Many2one(
        'product.product',
        string='Article en Stock'
    )
    
    # Specifications
    fabricant = fields.Char(string='Fabricant')
    reference_fabricant = fields.Char(string='Référence Fabricant')
    
    # Inventory
    stock_actuel = fields.Integer(
        string='Stock Actuel',
        default=0
    )
    stock_minimum = fields.Integer(
        string='Stock Minimum (Alerte)',
        default=1
    )
    en_rupture = fields.Boolean(
        string='Rupture de Stock',
        compute='_check_rupture',
        store=True
    )
    
    # Costs
    prix_unitaire_dzd = fields.Float(
        string='Prix Unitaire (DZD)',
        digits=(16, 2)
    )
    fournisseur_id = fields.Many2one(
        'res.partner',
        string='Fournisseur Principal',
        domain="[('supplier_rank', '>', 0)]"
    )
    
    # Lead Time
    delai_approvisionnement_jours = fields.Integer(
        string="Délai d'Approvisionnement (jours)",
        default=15
    )
    
    # Criticality
    critique = fields.Boolean(
        string='Pièce Critique',
        default=False,
        help='Si Vrai, une alerte est envoyée quand le stock est bas'
    )

    @api.depends('stock_actuel', 'stock_minimum')
    def _check_rupture(self):
        for piece in self:
            piece.en_rupture = piece.stock_actuel <= piece.stock_minimum

    def action_commander(self):
        """Create purchase order for this part"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Commander Pièce',
            'res_model': 'purchase.order',
            'view_mode': 'form',
            'context': {
                'default_partner_id': self.fournisseur_id.id,
                'default_order_line_ids': [(0, 0, {
                    'product_id': self.product_id.id,
                    'product_qty': max(1, self.stock_minimum * 3),
                })],
            }
        }


class MaintenancePreventivePlanDZ(models.Model):
    _name = 'maintenance.preventive.plan.dz'
    _description = 'Plan de Maintenance Préventive'

    name = fields.Char(
        string='Nom du Plan',
        required=True
    )
    
    equipment_id = fields.Many2one(
        'maintenance.equipment.dz',
        string='Équipement',
        required=True
    )
    
    frequence_jours = fields.Integer(
        string='Fréquence (jours)',
        required=True,
        default=90
    )
    frequence_heures_usage = fields.Integer(
        string="Fréquence (heures d'usage)",
        help='Alternative: déclencher après X heures d'utilisation"
    )
    
    description_taches = fields.Html(
        string='Description des Tâches',
        help='Liste détaillée des opérations à effectuer'
    )
    
    pieces_necessaires_ids = fields.Many2many(
        'maintenance.piece.rechange.dz',
        'plan_piece_rel',
        'plan_id',
        'piece_id',
        string='Pièces Nécessaires'
    )
    
    duree_estimee_heures = fields.Float(
        string='Durée Estimée (heures)',
        default=4
    )
    
    cout_estime_dzd = fields.Float(
        string='Coût Estimé (DZD)',
        digits=(16, 2)
    )
    
    active = fields.Boolean(
        string='Actif',
        default=True
    )
    
    derniere_execution = fields.Date(
        string='Dernière Exécution'
    )
    prochaine_execution = fields.Date(
        string='Prochaine Exécution',
        compute='_compute_prochaine',
        store=True
    )
    
    intervention_ids = fields.One2many(
        'maintenance.intervention.dz',
        'preventive_plan_id',
        string='Historique des Interventions'
    )

    @api.depends('frequence_jours', 'derniere_execution')
    def _compute_prochaine(self):
        for plan in self:
            if plan.derniere_execution:
                plan.prochaine_execution = plan.derniere_execution + timedelta(days=plan.frequence_jours)
            else:
                plan.prochaine_execution = fields.Date.today() + timedelta(days=plan.frequence_jours)

    def generer_intervention(self):
        """Generate a preventive intervention from this plan"""
        self.ensure_one()
        intervention = self.env['maintenance.intervention.dz'].create({
            'equipment_id': self.equipment_id.id,
            'type_intervention': 'preventive',
            'priorite': 'basse',
            'date_planifiee': fields.Datetime.now(),
            'symptome': f'Maintenance préventive planifiée: {self.name}',
            'travail_effectue': self.description_taches,
            'duree_prevue_heures': self.duree_estimee_heures,
            'pieces_utilisees_ids': [(6, 0, self.pieces_necessaires_ids.ids)],
            'state': 'planifie',
            'preventive_plan_id': self.id,
        })
        
        self.derniere_execution = fields.Date.today()
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'maintenance.intervention.dz',
            'res_id': intervention.id,
            'view_mode': 'form',
        }
