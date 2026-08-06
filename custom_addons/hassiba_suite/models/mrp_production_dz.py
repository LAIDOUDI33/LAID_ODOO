# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - MRP Production Extension for Algeria

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class MRProductionOrderDZ(models.Model):
    _inherit = 'mrp.production'

    # === ALGERIAN PRODUCTION FIELDS ===
    
    # Customs/Trade
    code_nomenclature_douaniere = fields.Char(
        string='Code Nomenclature Douanière',
        help='Code système harmonisé pour les produits fabriqués (Algérie)'
    )
    origine_produit = fields.Selection([
        ('local', 'Fabrication Locale'),
        ('import_matiere', 'Matière Première Importée'),
        ('import_total', 'Produit Fini Importé (Sous-traitance)'),
    ], string='Origine du Produit', default='local')
    
    # Quality Control - Algerian Standards
    conforme_norme_algerienne = fields.Boolean(
        string='Conforme Norme Algérienne',
        default=False,
        help='Certification de conformité aux normes algériennes (IANOR, etc.)'
    )
    numero_certification_ianor = fields.Char(
        string='N° Certification IANOR',
        help='Numéro de certification Institut Algérien de Normalisation'
    )
    date_certification = fields.Date(
        string='Date Certification'
    )
    
    # Costing in DZD
    cout_revient_unitaire_dzd = fields.Float(
        string='Coût de Revient Unitaire (DZD)',
        compute='_compute_cout_revient_dz',
        store=True,
        digits=(16, 2),
        help='Coût total de production en Dinars Algériens'
    )
    marge_beneficiaire_pct = fields.Float(
        string='Marge Bénéficiaire (%)',
        default=20,
        help='Pourcentage de marge appliqué sur le coût de revient'
    )
    prix_vente_suggere_dzd = fields.Float(
        string='Prix de Vente Suggéré (DZD)',
        compute='_compute_prix_vente_suggere',
        store=True,
        digits=(16, 2)
    )
    
    # Production Tracking
    responsable_production = fields.Many2one(
        'hr.employee',
        string='Responsable Production',
        domain="[('department_id.name', 'ilike', 'production')]"
    )
    equipe_production = fields.Char(
        string="Équipe de Production"
    )
    poste_travail = fields.Many2one(
        'mrp.workcenter',
        string='Poste de Travail Principal'
    )
    
    # Regulatory Compliance
    conforme_hygiene_securite = fields.Boolean(
        string='Conforme Hygiène & Sécurité',
        default=False
    )
    date_controle_qualite = fields.Date(
        string='Date Contrôle Qualité'
    )
    inspecteur_qualite = fields.Many2one(
        'hr.employee',
        string='Inspecteur Qualité'
    )

    @api.depends('move_raw_ids', 'move_finished_ids', 'workorder_ids')
    def _compute_cout_revient_dz(self):
        """Calculate production cost in DZD"""
        for production in self:
            total_cost = 0
            
            # Raw materials cost
            for move in production.move_raw_ids:
                if move.state not in ['cancel']:
                    total_cost += move.product_uom_qty * move.product_id.standard_price
            
            # Labor cost from work orders
            for wo in production.workorder_ids:
                if wo.duration_expected > 0:
                    hourly_rate = wo.workcenter_id.costs_hour or 500  # Default 500 DZD/h
                    labor_cost = (wo.duration_expected / 60) * hourly_rate
                    total_cost += labor_cost
            
            # Overhead costs (estimated at 15% of direct costs)
            overhead = total_cost * 0.15
            total_cost += overhead
            
            if production.product_qty > 0:
                production.cout_revient_unitaire_dzd = round(total_cost / production.product_qty, 2)
            else:
                production.cout_revient_unitaire_dzd = 0

    @api.depends('cout_revient_unitaire_dzd', 'marge_beneficiaire_pct')
    def _compute_prix_vente_suggere(self):
        """Calculate suggested selling price"""
        for production in self:
            if production.cout_revient_unitaire_dz > 0:
                production.prix_vente_suggere_dzd = round(
                    production.cout_revient_unitaire_dz * (1 + production.marge_beneficiaire_pct / 100), 2
                )
            else:
                production.prix_vente_suggere_dzd = 0

    def action_confirm(self):
        """Add validation checks for Algerian context"""
        for record in self:
            if record.origine_produit == 'local':
                # Check raw material availability
                insufficient_moves = record.move_raw_ids.filtered(
                    lambda m: m.product_qty_available < m.product_uom_qty
                )
                if insufficient_moves:
                    products = ', '.join(insufficient_moves.mapped('product_id.name'))
                    # Warning only, don't block
                    pass
        
        return super(MRProductionOrderDZ, self).action_confirm()

    def button_mark_done(self):
        """Mark as done with quality control check"""
        for record in self:
            if record.conforme_norme_algerienne and not record.numero_certification_ianor:
                # Auto-generate certification number if norm is checked
                record.numero_certification_ianor = self.env['ir.sequence'].next_by_code('mrp.certif.ianor') or ''
        
        return super(MRProductionOrderDZ, self).button_mark_done()

    def get_production_report_data(self):
        """Return data for production report"""
        self.ensure_one()
        return {
            'production': {
                'name': self.name,
                'product': self.product_id.name,
                'quantity': self.product_qty,
                'unit': self.product_uom_id.name,
                'date_planned': self.date_planned_start,
                'state': dict(self._fields['state'].selection).get(self.state),
            },
            'costing': {
                'cout_unitaire': self.cout_revient_unitaire_dzd,
                'marge_pct': self.marge_beneficiaire_pct,
                'prix_vente': self.prix_vente_suggere_dzd,
            },
            'quality': {
                'conforme_ianor': self.conforme_norme_algerienne,
                'certif_num': self.numero_certification_ianor or 'N/A',
                'conforme_hs': self.conforme_hygiene_securite,
            },
            'origin': {
                'type': dict(self._fields['origine_produit'].selection).get(self.origine_produit),
                'code_douanier': self.code_nomenclature_douaniere or 'N/A',
            }
        }


class MRProductTemplateDZ(models.Model):
    _inherit = 'product.template'

    # Product classification for Algeria
    classement_comptable_scf = fields.Selection([
        ('classe3', 'Classe 3 - Stocks'),
        ('classe4', 'Classe 4 - Tiers'),
        ('classe5', 'Classe 5 - Trésorerie'),
        ('classe6', 'Classe 6 - Charges'),
        ('classe7', 'Classe 7 - Produits'),
    ], string='Classement Comptable SCF')

    taux_amortissement = fields.Float(
        string="Taux d'Amortissement (%)",
        default=10,
        help="Taux d'amortissement selon le plan comptable SCF"
    )
    duree_vie_utile = fields.Integer(
        string='Durée de Vie Utile (années)',
        compute='_compute_duree_vie',
        inverse='_inverse_duree_vie',
        store=True
    )

    @api.depends('taux_amortissement')
    def _compute_duree_vie(self):
        for product in self:
            if product.taux_amortissement > 0:
                product.duree_vie_utile = round(100 / product.taux_amortissement)
            else:
                product.duree_vie_utile = 10

    def _inverse_duree_vie(self):
        for product in self:
            if product.duree_vie_utile > 0:
                product.taux_amortissement = round(100 / product.duree_vie_utile, 2)


class MRWorkCenterDZ(models.Model):
    _inherit = 'mrp.workcenter'

    # Algerian work center extensions
    zone_usine = fields.Selection([
        ('zone_a', 'Zone A - Production Principale'),
        ('zone_b', 'Zone B - Assemblage'),
        ('zone_c', 'Zone C - Contrôle Qualité'),
        ('zone_d', 'Zone D - Stockage'),
        ('zone_e', 'Zone E - Maintenance'),
    ], string='Zone Usine')
    
    responsable_poste = fields.Many2one(
        'hr.employee',
        string='Responsable du Poste'
    )
    
    certificat_qualification = fields.Char(
        string='N° Certificat Qualification'
    )
    date_derniere_inspection = fields.Date(
        string='Date Dernière Inspection'
    )
    
    consommation_energie_kw = fields.Float(
        string='Consommation Énergie (kW/h)',
        help='Consommation horaire moyenne'
    )


class MRPBOMDZ(models.Model):
    _inherit = 'mrp.bom'

    # BOM Extensions for Algeria
    rendement_pourcent = fields.Float(
        string='Rendement (%)',
        default=95,
        help='Rendement de production (pertes estimées)'
    )
    
    pertes_estimees_pct = fields.Float(
        string='Pertes Estimées (%)',
        compute='_compute_pertes',
        store=True
    )
    
    @api.depends('rendement_pourcent')
    def _compute_pertes(self):
        for bom in self:
            bom.pertes_estimees_pct = max(0, 100 - bom.rendement_pourcent)

    def get_cost_breakdown(self):
        """Get detailed cost breakdown for BOM"""
        self.ensure_one()
        components_cost = 0
        lines_data = []
        
        for line in self.bom_line_ids:
            line_cost = line.product_qty * line.product_id.standard_price
            components_cost += line_cost
            lines_data.append({
                'product': line.product_id.name,
                'qty': line.product_qty,
                'uom': line.product_uom_id.name,
                'unit_cost': line.product_id.standard_price,
                'total_cost': line_cost,
            })
        
        return {
            'components_cost': components_cost,
            'overhead_cost': components_cost * 0.15,
            'total_cost': components_cost * 1.15,
            'lines': lines_data,
            'yield_pct': self.rendement_pourcent,
        }
