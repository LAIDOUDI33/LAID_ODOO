# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Enhanced CRM Module for Algeria

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
import math


# ==============================
# CRM LEAD EXTENSION (DZ)
# ==============================

class CRMLeadDZ(models.Model):
    _inherit = 'crm.lead'

    # Algerian-specific fields
    secteur_activite = fields.Selection([
        ('public', 'Secteur Public'),
        ('prive', 'Secteur Privé'),
        ('semipublic', 'Semi-Public (EPA/EPIC)'),
        ('association', 'Association / ONG'),
        ('international', 'International / Ambassade'),
    ], string='Secteur d\'Activité')
    
    type_client = fields.Selection([
        ('prospect', 'Prospect'),
        ('client_nouveau', 'Nouveau Client'),
        ('client_existant', 'Client Existant'),
        ('partenaire', 'Partenaire Stratégique'),
        ('fournisseur', 'Fournisseur (Achat)'),
    ], string='Type Client', default='prospect')
    
    origine_contact = fields.Selection([
        ('salon', 'Salon / Foire'),
        ('web_site', 'Site Web'),
        ('recommandation', 'Recommandation'),
        ('publicite', 'Publicité'),
        ('demarche', 'Démarche Commerciale'),
        ('appel_entrant', 'Appel Entrant'),
        ('reseau_social', 'Réseaux Sociaux'),
        ('autre', 'Autre'),
    ], string='Origine du Contact')
    
    # Decision makers info
    decisionnaire_nom = fields.Char(string='Nom Décisionnaire')
    decisionnaire_fonction = fields.Char(string='Fonction Décisionnaire')
    decisionnaire_tel = fields.Char(string='Téléphone Direct')
    decisionnaire_email = fields.Char(string='Email Direct')
    
    # Budget & Timeline
    budget_estime_dzd = fields.Float(
        string='Budget Estimé (DZD)',
        digits=(16, 2),
        help='Budget estimé par le client en Dinars Algériens'
    )
    delai_decision_jours = fields.Integer(
        string="Délai de Décision (jours)",
        help='Temps estimé avant décision finale'
    )
    date_prevue_signature = fields.Date(
        string='Date Prévue Signature'
    )
    
    # Probability factors (Algerian context)
    concurrence = fields.Selection([
        ('aucune', 'Pas de Concurrence'),
        ('faible', 'Faible - Avantage Compétitif Fort'),
        ('moyenne', 'Moyenne - Compétitif'),
        ('forte', 'Forte - Difficile'),
        ('tres_forte', 'Très Forte - Peu de Chances'),
    ], string='Niveau Concurrence', default='moyenne')
    
    facteurs_differenciation = fields.Text(
        string='Facteurs de Différenciation',
        help='Points forts face à la concurrence'
    )
    
    # Regulatory compliance needed
    besoin_appel_offres = fields.Boolean(
        string="Besoin d'Appel d'Offres",
        help='Le projet nécessite un appel d\'offres public'
    )
    type_marche = fields.Selection([
        ('aon', 'Appel d\'Offres National'),
        ('aoi', 'Appel d\'Offres International'),
        ('concours', 'Concours'),
        ('gré_à_gré', 'Gré à Gré'),
        ('consultation', 'Consultation Restreinte'),
    ], string='Type de Marché')
    
    # Geographic tracking
    wilaya_projet = fields.Many2one(
        'dz.wilaya',
        string='Wilaya du Projet'
    )
    commune_projet = fields.Many2one(
        'dz.commune',
        string='Commune du Projet',
        domain="[('wilaya_id', '=', wilaya_projet)]"
    )
    
    # Computed probability adjustment
    probabilite_calculee = fields.Float(
        string='Probabilité Calculée (%)',
        compute='_compute_probabilite',
        store=True,
        help='Probabilité ajustée selon facteurs algériens'
    )
    
    @api.depends('stage_id', 'concurrence', 'budget_estime_dzd', 'delai_decision_jours')
    def _compute_probabilite(self):
        """Calculate adjusted probability based on Algerian context"""
        for lead in self:
            base_prob = lead.probability or 0
            
            # Adjust based on competition
            concurrence_factor = {
                'aucune': 1.3,
                'faible': 1.15,
                'moyenne': 1.0,
                'forte': 0.7,
                'tres_forte': 0.4,
            }
            
            factor = concurrence_factor.get(lead.concurrence, 1.0)
            lead.probabilite_calculee = min(100, max(0, round(base_prob * factor, 1)))

    def action_set_won_rationalized(self):
        """Set won with rationalization for Algerian market"""
        self.ensure_one()
        
        if not self.partner_id:
            raise ValidationError(_('Veuillez d\'abord associer un partenaire/client.'))
        
        # Create opportunity analysis record
        self.env['crm.opportunity.analysis.dz'].create({
            'lead_id': self.id,
            'partner_id': self.partner_id.id,
            'wilaya_id': self.wilaya_projet.id or self.partner_id.wilaya_id.id,
            'montant_gagne': self.planned_revenue or self.budget_estime_dzd or 0,
            'date_cloture': fields.Date.today(),
            'duree_conversion': (fields.Date.today() - self.create_date.date()).days if self.create_date else 0,
        })
        
        return self.action_set_won()


# ==============================
# OPPORTUNITY ANALYSIS MODEL
# ==============================

class CRMOpportunityAnalysisDZ(models.Model):
    _name = 'crm.opportunity.analysis.dz'
    _description = "Analyse d'Opportunité (Algérie)"
    _order = 'date_cloture desc'

    name = fields.Char(
        string='Référence',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('OPP-0000')
    )
    
    lead_id = fields.Many2one(
        'crm.lead',
        string='Opportunité'
    )
    partner_id = fields.Many2one(
        'res.partner',
        string='Client'
    )
    
    # Location
    wilaya_id = fields.Many2one('dz.wilaya', string='Wilaya')
    
    # Financials
    montant_gagne = fields.Float(
        string='Montant Gagné (DZD)',
        digits=(16, 2)
    )
    marge_reelle_pct = fields.Float(
        string='Marge Réelle (%)'
    )
    
    # Timeline
    date_creation_lead = fields.Datetime(string='Date Création Lead')
    date_cloture = fields.Date(string='Date Clôture')
    duree_conversion = fields.Integer(
        string='Durée Conversion (jours)',
        help='Nombre de jours entre création et signature'
    )
    
    # Analysis
    canal_acquisition = fields.Char(string="Canal d'Acquisition")
    nombre_relances = fields.Integer(
        string='Nombre de Relances',
        default=0
    )
    nombre_visites = fields.Integer(
        string='Nombre de Visites',
        default=0
    )
    
    # Lost reasons (if applicable)
    raison_perte = fields.Text(string='Raison Perte')
    concurrent_gagnant = fields.Char(string='Concurrent Gagnant')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('OPP-0000')) == _('OPP-0000'):
                vals['name'] = self.env['ir.sequence'].next_by_code('crm.opportunity.analysis') or _('OPP-0000')
        return super().create(vals_list)


# ==============================
# COMMISSION CALCULATOR (DZ)
# ==============================

class CRMCommissionDZ(models.Model):
    _name = 'crm.commission.dz'
    _description = 'Commission Commerciale (Algérie)'
    _order = 'periode_debut desc'

    name = fields.Char(
        string='Référence Commission',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('COM-0000')
    )
    
    commercial_id = fields.Many2one(
        'hr.employee',
        string='Commercial',
        required=True,
        domain="[('department_id.name', 'ilike', 'commercial')]"
    )
    
    # Period
    periode_debut = fields.Date(
        string='Début Période',
        required=True
    )
    periode_fin = fields.Date(
        string='Fin Période',
        required=True
    )
    
    # Sales Performance
    ca_realise = fields.Float(
        string='CA Réalisé (DZD)',
        compute='_compute_performance',
        store=True,
        digits=(16, 2)
    )
    objectif_ca = fields.Float(
        string='Objectif CA (DZD)',
        default=1000000
    )
    taux_atteinte = fields.Float(
        string="Taux d'Atteinte (%)",
        compute='_compute_performance',
        store=True
    )
    
    # Opportunities
    nb_opportunities_gagnees = fields.Integer(
        string='Opp. Gagnées',
        compute='_compute_performance',
        store=True
    )
    nb_opportunities_perdues = fields.Integer(
        string='Opp. Perdues',
        compute='_compute_performance',
        store=True
    )
    
    # Commission Calculation
    taux_commission_base = fields.Float(
        string='Taux Commission Base (%)',
        default=5
    )
    commission_brute = fields.Float(
        string='Commission Brute (DZD)',
        compute='_compute_commission',
        store=True,
        digits=(16, 2)
    )
    
    # IRG on commission
    irg_commission = fields.Float(
        string='IRG sur Commission (DZD)',
        compute='_compute_commission',
        store=True,
        digits=(16, 2),
        help='IRG calculé sur la commission brute'
    )
    
    commission_net = fields.Float(
        string='Commission Net (DZD)',
        compute='_compute_commission',
        store=True,
        digits=(16, 2)
    )
    
    # Bonus
    bonus_objectif = fields.Float(
        string='Bonus Objectif Atteint (DZD)',
        compute='_compute_bonus',
        store=True
    )
    bonus_exceptionnel = fields.Float(
        string='Bonus Exceptionnel (DZD)',
        default=0
    )
    
    total_a_payer = fields.Float(
        string='Total à Payer (DZD)',
        compute='_compute_total',
        store=True,
        digits=(16, 2)
    )
    
    # State
    state = fields.Selection([
        ('calcul', 'En Calcul'),
        ('valide', 'Validée'),
        ('payee', 'Payée'),
        ('annulee', 'Annulée'),
    ], string='État', default='calcul')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('COM-0000')) == _('COM-0000'):
                vals['name'] = self.env['ir.sequence'].next_by_code('crm.commission') or _('COM-0000')
        return super().create(vals_list)

    @api.depends('commercial_id', 'periode_debut', 'periode_fin')
    def _compute_performance(self):
        """Calculate sales performance metrics"""
        for comm in self:
            if not comm.commercial_id or not comm.periode_debut or not comm.periode_fin:
                continue
            
            # Get won opportunities in period
            opps_gagnees = self.env['crm.lead'].search([
                ('type', '=', 'opportunity'),
                ('stage_id.is_won', '=', True),
                ('user_id.employee_id', '=', comm.commercial_id.id),
                ('date_closed', '>=', comm.periode_debut),
                ('date_closed', '<=', comm.periode_fin),
            ])
            
            opps_perdues = self.env['crm.lead'].search([
                ('type', '=', 'opportunity'),
                ('stage_id.is_lost', '=', True),
                ('user_id.employee_id', '=', comm.commercial_id.id),
                ('date_closed', '>=', comm.periode_debut),
                ('date_closed', '<=', comm.periode_fin),
            ])
            
            comm.ca_realise = sum(op.planned_revenue for op in opps_gagnees if op.planned_revenue)
            comm.nb_opportunities_gagnees = len(opps_gagnees)
            comm.nb_opportunities_perdues = len(opps_perdues)
            
            if comm.objectif_ca > 0:
                comm.taux_atteinte = round((comm.ca_realise / comm.objectif_ca) * 100, 2)

    @api.depends('ca_realise', 'taux_commission_base')
    def _compute_commission(self):
        """Calculate commission and IRG"""
        for comm in self:
            # Base commission
            comm.commission_brute = round(comm.ca_realise * (comm.taux_commission_base / 100), 2)
            
            # IRG calculation on commission (simplified barème)
            if comm.commission_brute <= 30000:
                irg = 0
            elif comm.commission_brute <= 50000:
                irg = (comm.commission_brute * 0.20) - 6000
            elif comm.commission_brute <= 120000:
                irg = (comm.commission_brute * 0.30) - 11000
            elif comm.commission_brute <= 170000:
                irg = (comm.commission_brute * 0.35) - 17000
            elif comm.commission_brute <= 250000:
                irg = (comm.commission_brute * 0.40) - 25500
            else:
                irg = (comm.commission_brute * 0.35) - 29500
            
            comm.irg_commission = max(0, math.ceil(irg))
            comm.commission_net = round(comm.commission_brute - comm.irg_commission, 2)

    @api.depends('taux_atteinte')
    def _compute_bonus(self):
        """Calculate bonus based on objective achievement"""
        for comm in self:
            if comm.taux_atteinte >= 150:
                comm.bonus_objectif = comm.commission_net * 0.50  # 50% bonus
            elif comm.taux_atteinte >= 125:
                comm.bonus_objectif = comm.commission_net * 0.30  # 30% bonus
            elif comm.taux_atteinte >= 100:
                comm.bonus_objectif = comm.commission_net * 0.15  # 15% bonus
            elif comm.taux_atteinte >= 75:
                comm.bonus_objectif = 0
            else:
                # Penalty: reduce commission
                comm.bonus_objectif = -(comm.commission_net * 0.10)  # 10% penalty

    @api.depends('commission_net', 'bonus_objectif', 'bonus_exceptionnel')
    def _compute_total(self):
        for comm in self:
            comm.total_a_payer = round(
                comm.commission_net + comm.bonus_objectif + comm.bonus_exceptionnel, 2
            )

    def action_valider(self):
        """Validate the commission"""
        self.write({'state': 'valide'})

    def action_marquer_payee(self):
        """Mark as paid"""
        self.write({'state': 'payee'})


# ==============================
# COMMERCIAL PIPELINE DZ
# ==============================

class CommercialPipelineDZ(models.Model):
    _name = 'commercial.pipeline.dz'
    _description = 'Pipeline Commercial Algérie'

    name = fields.Char(string='Nom Pipeline', required=True)
    commercial_id = fields.Many2one(
        'hr.employee',
        string='Commercial',
        required=True
    )
    
    # Pipeline stages (Algerian sales process)
    stage_ids = fields.One2many(
        'commercial.pipeline.stage.dz',
        'pipeline_id',
        string='Étapes du Pipeline'
    )
    
    active = fields.Boolean(string='Actif', default=True)
    
    # Statistics
    total_valeur_pipeline = fields.Float(
        string='Valeur Totale Pipeline (DZD)',
        compute='_compute_stats',
        store=True
    )
    nb_opportunites = fields.Integer(
        string="Nombre d'Opportunités",
        compute='_compute_stats',
        store=True
    )
    taux_conversion_global = fields.Float(
        string='Taux Conversion Global (%)',
        compute='_compute_stats',
        store=True
    )

    @api.depends('stage_ids.nb_opportunities', 'stage_ids.valeur_totale')
    def _compute_stats(self):
        for pipeline in self:
            pipeline.nb_opportunities = sum(stage.nb_opportunities for stage in pipeline.stage_ids)
            pipeline.total_valeur_pipeline = sum(stage.valeur_totale for stage in pipeline.stage_ids)
            
            # Calculate conversion rate (won vs total)
            won_stage = pipeline.stage_ids.filtered(lambda s: s.type == 'won')
            total_done = sum(s.nb_opportunities for s in pipeline.stage_ids if s.type in ['won', 'lost'])
            if total_done > 0:
                pipeline.taux_conversion_global = round(
                    (sum(won_stage.mapped('nb_opportunities')) / total_done) * 100, 1
                )


class CommercialPipelineStageDZ(models.Model):
    _name = 'commercial.pipeline.stage.dz'
    _description = 'Étape Pipeline Commercial'

    name = fields.Chars(string="Nom de l'Étape", required=True)
    pipeline_id = fields.Many2one(
        'commercial.pipeline.dz',
        string='Pipeline',
        required=True,
        ondelete='cascade'
    )
    
    sequence = fields.Integer(string='Ordre', default=10)
    
    type = fields.Selection([
        ('prospection', 'Prospection'),
        ('qualification', 'Qualification'),
        ('proposition', 'Proposition'),
        ('negociation', 'Négociation'),
        ('validation', 'Validation Interne'),
        ('signature', 'Signature'),
        ('won', 'Gagné'),
        ('lost', 'Perdu'),
    ], string="Type d'Étape", default='prospection')
    
    expected_duration_days = fields.Integer(
        string='Durée Estimée (jours)',
        default=7
    )
    
    # Stats at this stage
    nb_opportunities = fields.Integer(
        string="Nb Opportunités",
        compute='_compute_stage_stats'
    )
    valeur_totale = fields.Float(
        string='Valeur Totale (DZD)',
        compute='_compute_stage_stats',
        digits=(16, 2)
    )
    
    color = fields.Integer(string='Couleur')

    @api.depends('pipeline_id')
    def _compute_stage_stats(self):
        for stage in self:
            # Count leads at this stage
            leads = self.env['crm.lead'].search([
                ('type', '=', 'opportunity'),
                ('stage_id.name', 'ilike', stage.name),
            ])
            stage.nb_opportunities = len(leads)
            stage.valeur_totale = sum(l.planned_revenue for l in leads if l.planned_revenue)


# ==============================
# VISITE COMMERCIALE (DZ)
# ==============================

class VisiteCommercialeDZ(models.Model):
    _name = 'visite.commerciale.dz'
    _description = 'Visite Commerciale (Algérie)'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_visite desc'

    name = fields.Char(
        string='Référence Visite',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('VIS-0000')
    )
    
    # Related records
    partner_id = fields.Many2one(
        'res.partner',
        string='Client / Prospect',
        required=True
    )
    lead_id = fields.Many2one(
        'crm.lead',
        string='Opportunité Associée'
    )
    commercial_id = fields.Many2one(
        'hr.employee',
        string='Commercial',
        required=True
    )
    
    # Visit details
    type_visite = fields.Selection([
        ('premiere', 'Première Visite'),
        ('suivi', 'Visite de Suivi'),
        ('technique', 'Visite Technique'),
        ('négociation', 'Visite Négociation'),
        ('livraison', 'Livraison / Installation'),
        ('support', 'Support / SAV'),
    ], string='Type de Visite', required=True, default='suivi')
    
    date_visite = fields.Datetime(
        string='Date & Heure Visite',
        required=True,
        default=fields.Datetime.now
    )
    duree_prevue_heures = fields.Float(
        string='Durée Prévue (heures)',
        default=1
    )
    duree_reelle_heures = fields.Float(
        string='Durée Réelle (heures)'
    )
    
    # Location
    adresse_visite = fields.Char(string="Adresse de la Visite")
    wilaya_id = fields.Many2one('dz.wilaya', string='Wilaya')
    contact_nom = fields.Char(string='Contact sur Place')
    contact_telephone = fields.Char(string='Téléphone Contact')
    
    # Objectives & Results
    objectifs = fields.Text(string='Objectifs de la Visite')
    compte_rendu = fields.Html(string='Compte-Rendu')
    
    resultats = fields.Selection([
        ('positif', 'Positif - Suite Commerciale'),
        ('neutre', 'Neutrel - À Suivre'),
        ('negatif', 'Négatif - Sans Suite'),
        ('reporte', 'Reporté'),
        ('annule', 'Annulé'),
    ], string='Résultat de la Visite')
    
    prochaines_actions = fields.Text(string='Prochaines Actions')
    date_prochaine_visite = fields.Datetime(string='Date Prochaine Visite')
    
    # Documents
    documents_ids = fields.Many2many(
        'ir.attachment',
        'visite_document_rel',
        'visite_id',
        'document_id',
        string='Documents Partagés'
    )
    
    state = fields.Selection([
        ('planifie', 'Planifiée'),
        ('realisée', 'Réalisée'),
        ('annulee', 'Annulée'),
    ], string='État', default='planifie', tracking=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('VIS-0000')) == _('VIS-0000'):
                vals['name'] = self.env['ir.sequence'].next_by_code('visite.commerciale') or _('VIS-0000')
        return super().create(vals_list)

    def action_realiser(self):
        """Mark visit as completed"""
        self.write({'state': 'realisée'})
        
        # Update related lead activity
        if self.lead_id:
            self.lead_id.message_post(
                body=f"Visite commerciale réalisée le {self.date_visite} - Résultat: {dict(self._fields['resultats'].selection).get(self.resultats)}"
            )

    def action_annuler(self):
        """Cancel visit"""
        self.write({'state': 'annulee'})
