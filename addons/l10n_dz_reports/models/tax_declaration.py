# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

"""
Algerian Tax Declarations Module (l10n_dz_models)
===================================================

This module provides models for Algerian fiscal declarations:
- G50: TVA Declaration (Monthly/Quarterly)
- G1: IRG Declaration (Withholding Tax)
- G2: TAP Declaration (Professional Activity Tax)
- G4: IBS Declaration (Corporate Income Tax)

Conforme au Code des Impôts Algériens et SCF
"""

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools import date_utils, float_round, format_date
from datetime import timedelta
import logging

_logger = logging.getLogger(__name__)


class L10nDzTaxDeclarationTemplate(models.Model):
    """
    Template pour les déclarations fiscales algériennes.
    Définit la structure de chaque type de déclaration (G50, G1, G2, G4).
    """
    _name = 'l10n.dz.tax.declaration.template'
    _description = 'Modèle de Déclaration Fiscale Algérienne'
    
    name = fields.Char(string='Nom du modèle', required=True, translate=True)
    code = fields.Char(string='Code', required=True)  # G50, G1, G2, G4
    type = fields.Selection([
        ('tva', 'TVA'),
        ('irg', 'IRG'),
        ('tap', 'TAP'),
        ('ibs', 'IBS'),
    ], string='Type d\'impôt', required=True)
    
    description = fields.Text(string='Description', translate=True)
    periodicity_options = fields.Char(
        string='Périodicités autorisées',
        default='monthly'
    )
    default_periodicity = fields.Selection([
        ('monthly', 'Mensuelle'),
        ('quarterly', 'Trimestrielle'),
        ('yearly', 'Annuelle'),
    ], string='Périodicité par défaut', default='monthly')
    
    # Références aux templates de taxes l10n_dz
    tax_account_collected_ids = fields.Many2many(
        'account.tax.template',
        string='Templates TVA Collectée',
        domain="[('type_tax_use', '=', 'sale')]"
    )
    tax_account_deductible_ids = fields.Many2many(
        'account.tax.template',
        string='Templates TVA Déductible',
        domain="[('type_tax_use', '=', 'purchase')]"
    )
    
    # Taux par défaut pour TAP/IBS
    tax_rate_default = fields.Float(string='Taux par défaut (%)', default=19.0)
    
    # Lignes de template
    line_template_ids = fields.One2many(
        'l10n.dz.tax.declaration.line.template',
        'template_id',
        string='Lignes de modèle'
    )


class L10nDzTaxDeclarationLineTemplate(models.Model):
    """
    Template de ligne pour les déclarations fiscales.
    Définit chaque ligne du formulaire de déclaration.
    """
    _name = 'l10n.dz.tax.declaration.line.template'
    _description = 'Ligne de Modèle de Déclaration Fiscale'
    _order = 'sequence'
    
    template_id = fields.Many2one(
        'l10n.dz.tax.declaration.template',
        string='Modèle de déclaration',
        required=True,
        ondelete='cascade'
    )
    
    sequence = fields.Integer(string='Séquence', default=1)
    code = fields.Char(string='Code ligne')  # 01, 02, etc.
    name = fields.Char(string='Libellé', required=True, translate=True)
    
    category = fields.Selection([
        # Catégories G50 TVA
        ('tva_collectee', 'TVA Collectée'),
        ('tva_deductible', 'TVA Déductible B/S'),
        ('tva_deductible_immo', 'TVA Déductible Immobilisations'),
        ('tva_non_deductible', 'TVA Non Déductible'),
        ('exonerations', 'Exonérations'),
        
        # Catégories G1 IRG
        ('remunerations_brutes', 'Rémunérations Brutes'),
        ('avantages_nature', 'Avantages en Nature'),
        ('cotisations_salariales', 'Cotisations Salariales'),
        ('cotisations_patronales', 'Cotisations Patronales'),
        ('deductions', 'Déductions/Abattements'),
        
        # Catégories G2 TAP
        ('chiffre_affaires', 'Chiffre d\'Affaires'),
        ('chiffre_affaires_reduit', 'CA à Taux Réduit'),
        ('exonerations_zone', 'Exonération Zone'),
        ('exonerations_secteur', 'Exonération Secteur'),
        ('exonerations_creation', 'Exonération Création'),
        ('exonerations_autres', 'Autres Exonérations'),
        
        # Catégories G4 IBS
        ('resultat_comptable', 'Résultat Comptable'),
        ('reintegrations', 'Réintégrations'),
        ('deductions', 'Déductions'),
        ('deductions_deficit', 'Déficit Reportable'),
        ('deductions_credits', 'Crédits d\'Impôt'),
        ('deductions_incentives', 'Incitations ANDI'),
        ('deductions_zone', 'Super-déduction Zone'),
        ('calcul_ibs', 'Calcul IBS'),
        ('minimum_impot', 'Minimum d\'Impôt'),
        
        # Communes
        ('regularisation', 'Régularisation'),
        ('acomptes', 'Acomptes Versés'),
        ('total', 'Total'),
        ('solde', 'Solde'),
    ], string='Catégorie', required=True)
    
    tax_id = fields.Many2one(
        'account.tax.template',
        string='Taxe associée'
    )
    
    sign = fields.Selection([
        ('positive', 'Positif (+)'),
        ('negative', 'Négatif (-)'),
        ('neutral', 'Neutre'),
    ], string='Signe', default='positive')
    
    is_mandatory = fields.Boolean(string='Obligatoire', default=False)
    is_computed = fields.Boolean(string='Champ calculé', default=False)
    manual_entry = fields.Boolean(string='Saisie manuelle', default=False)
    
    is_total = fields.Boolean(string='Est un total', default=False)
    is_solde = fields.Boolean(string='Est le solde final', default=False)
    is_bold = fields.Boolean(string='En gras', default=False)
    is_highlighted = fields.Boolean(string='Mis en évidence', default=False)
    
    # Formules de calcul
    total_formula = fields.Char(string='Formule total')
    solde_formula = fields.Char(string='Formule solde')
    compute_formula = fields.Char(string='Formule calcul')
    
    # Taux spécifiques
    tap_rate = fields.Float(string='Taux TAP (%)')
    ibs_rate = fields.Float(string='Taux IBS (%)')
    default_rate = fields.Float(string='Taux par défaut (%)')
    
    description_text = fields.Text(string='Description détaillée', translate=True)


class L10nDzTaxDeclaration(models.Model):
    """
    Modèle principal des déclarations fiscales algériennes.
    Une déclaration peut être de type G50 (TVA), G1 (IRG), G2 (TAP), ou G4 (IBS).
    """
    _name = 'l10n.dz.tax.declaration'
    _description = 'Déclaration Fiscale Algérienne'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_from desc'
    
    # ============================================ #
    # CHAMPS PRINCIPAUX                            #
    # ============================================ #
    
    name = fields.Char(
        string='Numéro de Déclaration',
        readonly=True,
        copy=False,
        default=lambda self: _('Nouveau')
    )
    
    declaration_type = fields.Selection([
        ('G50', 'G50 - Déclaration TVA'),
        ('G1', 'G1 - Déclaration IRG'),
        ('G2', 'G2 - Déclaration TAP'),
        ('G4', 'G4 - Déclaration IBS'),
    ], string='Type de Déclaration', required=True, tracking=True)
    
    template_id = fields.Many2one(
        'l10n.dz.tax.declaration.template',
        string='Modèle de déclaration',
        compute='_compute_template_id',
        store=True,
        readonly=False
    )
    
    state = fields.Selection([
        ('draft', 'Brouillon'),
        ('computed', 'Calculée'),
        ('submitted', 'Soumise'),
        ('paid', 'Payée'),
        ('cancelled', 'Annulée'),
    ], string='État', default='draft', tracking=True, required=True)
    
    # ============================================ #
    # CHAMPS ENTREPRISE                           #
    # ============================================ #
    
    company_id = fields.Many2one(
        'res.company',
        string='Entreprise',
        default=lambda self: self.env.company,
        required=True,
        tracking=True
    )
    
    currency_id = fields.Many2one(
        related='company_id.currency_id',
        string='Devise',
        readonly=True
    )
    
    partner_id = fields.Many2one(
        related='company_id.partner_id',
        string='Partenaire Entreprise'
    )
    
    fiscal_position_id = fields.Many2one(
        'account.fiscal.position',
        string='Position Fiscale',
        domain="[('company_id', '=', company_id)]"
    )
    
    nif = fields.Char(
        string='NIF (N° Identification Fiscale)',
        related='company_id.vat',
        readonly=True
    )
    
    nis = fields.Char(
        string='NIS (N° Identification Statistique)',
        related='company_id.company_registry',
        readonly=True
    )
    
    article_imposition = fields.Char(
        string="Article d'Imposition",
        help="Article du CIDTA applicable"
    )
    
    regime_fiscal = fields.Selection([
        ('reel', 'Régime Réel'),
        ('simplifie', 'Régime Simplifié'),
        ('forfait', 'Régime Forfaitaire'),
    ], string='Régime Fiscal')
    
    tax_office = fields.Char(
        string='Direction des Impôts (Wilaya)',
        help="Direction des impôts compétente"
    )
    
    # ============================================ #
    # CHAMPS PÉRIODE                               #
    # ============================================ #
    
    period_type = fields.Selection([
        ('monthly', 'Mensuelle'),
        ('quarterly', 'Trimestrielle'),
        ('yearly', 'Annuelle'),
    ], string='Type de Période', required=True, default='monthly')
    
    date_from = fields.Date(
        string='Date de début',
        required=True,
        tracking=True,
        default=fields.date.today().replace(day=1)
    )
    
    date_to = fields.Date(
        string='Date de fin',
        required=True,
        tracking=True,
        default=lambda self: fields.date.today()
    )
    
    month = fields.Integer(
        string='Mois',
        compute='_compute_period_details',
        store=True
    )
    
    quarter = fields.Integer(
        string='Trimestre',
        compute='_compute_period_details',
        store=True
    )
    
    fiscal_year = fields.Char(
        string='Exercice Fiscal',
        compute='_compute_period_details',
        store=True
    )
    
    # ============================================ #
    # MONTANTS CALCULÉS                            #
    # ============================================ #
    
    line_ids = fields.One2many(
        'l10n.dz.tax.declaration.line',
        'declaration_id',
        string='Lignes de déclaration'
    )
    
    amount_collected = fields.Monetary(
        string='TVA/Impôt Collecté',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    amount_deductible = fields.Monetary(
        string='TVA/Impôt Déductible',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    amount_taxable_base = fields.Monetary(
        string='Base Imposable',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    amount_regularization = fields.Monetary(
        string='Régularisation/Crédit antérieur',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    amount_total = fields.Monetary(
        string='Montant Total',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    amount_due = fields.Monetary(
        string='Solde à Payer (ou Crédit)',
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )
    
    # ============================================ #
    # PAIEMENT                                     #
    # ============================================ #
    
    payment_reference = fields.Char(
        string='Référence de Paiement',
        help="N° de quittance ou référence bancaire"
    )
    
    payment_date = fields.Date(
        string='Date de Paiement'
    )
    
    bank_account_id = fields.Many2one(
        'account.journal',
        string='Compte Bancaire',
        domain="[('type', '=', 'bank'), ('company_id', '=', company_id)]"
    )
    
    amount_paid = fields.Monetary(
        string='Montant Payé',
        currency_field='currency_id',
        default=0.0
    )
    
    amount_remaining = fields.Monetary(
        string='Reste à Payer',
        compute='_compute_remaining',
        store=True,
        currency_field='currency_id'
    )
    
    # ============================================ #
    # DOCUMENTS ET NOTES                           #
    # ============================================ #
    
    attachment_ids = fields.Many2many(
        'ir.attachment',
        'l10n_dz_declaration_attachment_rel',
        'declaration_id',
        'attachment_id',
        string='Pièces Jointes'
    )
    
    notes = fields.Text(string='Notes')
    
    # ============================================ #
    # COMPUTES / CALCULS AUTOMATIQUES              #
    # ============================================ #
    
    @api.depends('declaration_type')
    def _compute_template_id(self):
        """Recherche le template correspondant au type de déclaration."""
        for record in self:
            if record.declaration_type:
                template = self.env['l10n.dz.tax.declaration.template'].search(
                    [('code', '=', record.declaration_type)], limit=1
                )
                record.template_id = template.id if template else False
    
    @api.depends('date_from')
    def _compute_period_details(self):
        """Calcule le mois, trimestre et exercice fiscal."""
        for record in self:
            if record.date_from:
                record.month = record.date_from.month
                record.quarter = (record.date_from.month - 1) // 3 + 1
                record.fiscal_year = str(record.date_from.year)
            else:
                record.month = False
                record.quarter = False
                record.fiscal_year = False
    
    @api.depends('line_ids.base_amount', 'line_ids.tax_amount', 'line_ids.category')
    def _compute_amounts(self):
        """Calcule les totaux de la déclaration."""
        for record in self:
            collected = 0.0
            deductible = 0.0
            taxable_base = 0.0
            regularization = 0.0
            total = 0.0
            
            for line in record.line_ids:
                if line.category in ['tva_collectee', 'remunerations_brutes', 
                                      'avantages_nature', 'chiffre_affaires',
                                      'chiffre_affaires_reduit', 'resultat_comptable',
                                      'reintegrations']:
                    collected += line.tax_amount or 0.0
                    taxable_base += line.base_amount or 0.0
                    
                elif line.category in ['tva_deductible', 'tva_deductible_immo',
                                        'cotisations_salariales', 'deductions',
                                        'deductions_deficit', 'deductions_credits',
                                        'deductions_incentives', 'deductions_zone',
                                        'acomptes']:
                    deductible += abs(line.tax_amount or 0.0)
                    
                elif line.category == 'regularization':
                    regularization += line.tax_amount or 0.0
                    
                elif line.category == 'total':
                    total += line.tax_amount or 0.0
                    
                elif line.category == 'solde':
                    total = line.tax_amount or 0.0
            
            record.amount_collected = collected
            record.amount_deductible = deductible
            record.amount_taxable_base = taxable_base
            record.amount_regularization = regularization
            record.amount_total = total
            record.amount_due = total
    
    @api.depends('amount_due', 'amount_paid')
    def _compute_remaining(self):
        """Calcule le reste à payer."""
        for record in self:
            record.amount_remaining = record.amount_due - record.amount_paid
    
    # ============================================ #
    # ACTIONS / WORKFLOW                           #
    # ============================================ #
    
    @api.model_create_multi
    def create(self, vals_list):
        """Génère le numéro de séquence lors de la création."""
        for vals in vals_list:
            if vals.get('name', _('Nouveau')) == _('Nouveau'):
                declaration_type = vals.get('declaration_type', '')
                date_from = vals.get('date_from', fields.date.today())
                
                seq_name = f'DZ-{declaration_type}-{date_from.strftime("%Y%m")}'
                vals['name'] = self.env['ir.sequence'].next_by_code(
                    'l10n.dz.tax.declaration'
                ) or seq_name
        
        return super().create(vals_list)
    
    def action_compute(self):
        """
        Calcule automatiquement les montants de la déclaration
        en fonction des écritures comptables de la période.
        """
        self.ensure_one()
        
        # Vérifier que le template existe
        if not self.template_id:
            raise UserError(_("Aucun modèle trouvé pour ce type de déclaration."))
        
        # Supprimer les anciennes lignes
        self.line_ids.unlink()
        
        # Créer les lignes depuis le template
        lines_to_create = []
        for line_template in self.template_id.line_template_ids:
            # Calculer les montants depuis les écritures comptables
            base_amount, tax_amount = self._compute_line_amounts(line_template)
            
            lines_to_create.append((0, 0, {
                'sequence': line_template.sequence,
                'code': line_template.code,
                'name': line_template.name,
                'category': line_template.category,
                'sign': line_template.sign,
                'base_amount': base_amount,
                'tax_amount': tax_amount,
                'rate': line_template.default_rate or line_template.tap_rate 
                          or line_template.ibs_rate or self.template_id.tax_rate_default,
                'is_mandatory': line_template.is_mandatory,
                'manual_entry': line_template.manual_entry,
                'is_computed': line_template.is_computed,
                'is_total': line_template.is_total,
                'is_solde': line_template.is_solde,
                'is_bold': line_template.is_bold,
                'is_highlighted': line_template.is_highlighted,
                'description_text': line_template.description_text,
            }))
        
        self.write({'line_ids': lines_to_create})
        
        # Recalculer les totaux et soldes
        self._recalculate_totals()
        
        # Changer l'état
        self.state = 'computed'
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'view_type': 'form',
        }
    
    def _compute_line_amounts(self, line_template):
        """
        Calcule les montants pour une ligne de déclaration
        en interrogeant les écritures comptables.
        
        Returns:
            tuple: (base_amount, tax_amount)
        """
        base_amount = 0.0
        tax_amount = 0.0
        
        try:
            # Rechercher la taxe réelle correspondant au template
            domain = [
                ('company_id', '=', self.company_id.id),
            ]
            
            if line_template.tax_id:
                # Chercher la taxe active avec même description
                tax = self.env['account.tax'].search([
                    ('description', '=', line_template.tax_id.description),
                    ('company_id', '=', self.company_id.id),
                ], limit=1)
                
                if tax:
                    # Rechercher les lignes d'écritures pour cette taxe
                    move_lines = self.env['account.move.line'].search([
                        ('tax_ids', 'in', [tax.id]),
                        ('date', '>=', self.date_from),
                        ('date', '<=', self.date_to),
                        ('move.state', '=', 'posted'),
                        ('company_id', '=', self.company_id.id),
                    ])
                    
                    for ml in move_lines:
                        if line_template.sign == 'positive':
                            if ml.tax_ids.type_tax_use == 'sale':
                                base_amount += ml.balance if ml.balance > 0 else -ml.balance
                                tax_amount += abs(ml.balance * (tax.amount / 100)) if ml.balance else 0
                        elif line_template.sign == 'negative':
                            if ml.tax_ids.type_tax_use == 'purchase':
                                base_amount += abs(ml.balance)
                                tax_amount -= abs(ml.balance * (tax.amount / 100))
            
        except Exception as e:
            _logger.error(f"Erreur calcul ligne {line_template.code}: {str(e)}")
        
        return base_amount, tax_amount
    
    def _recalculate_totals(self):
        """Recalcule les lignes de total et solde."""
        for record in self:
            totals = {}
            categories_sum = {}
            
            # Calculer les sommes par catégorie
            for line in record.line_ids:
                cat = line.category
                if cat not in categories_sum:
                    categories_sum[cat] = {'base': 0.0, 'tax': 0.0}
                categories_sum[cat]['base'] += line.base_amount or 0.0
                categories_sum[cat]['tax'] += line.tax_amount or 0.0
            
            # Mettre à jour les lignes de total et solde
            for line in record.line_ids:
                if line.is_total and line.total_formula:
                    # Appliquer la formule de total
                    line.tax_amount = record._evaluate_formula(
                        line.total_formula, categories_sum
                    )
                elif line.is_solde and line.solde_formula:
                    # Appliquer la formule de solde
                    line.tax_amount = record._evaluate_formula(
                        line.solde_formula, categories_sum
                    )
                elif line.is_computed and line.compute_formula:
                    # Appliquer la formule de calcul spécifique
                    line.tax_amount = record._evaluate_compute_formula(
                        line.compute_formula, categories_sum
                    )
    
    def _evaluate_formula(self, formula, categories_sum):
        """
        Évalue une formule simple de total/solde.
        
        Exemples de formules:
        - sum(tva_collectee)
        - sum(tva_deductible) + sum(tva_deductible_immo)
        - sum(tva_collectee) - sum(tva_deductible)
        """
        result = 0.0
        
        # Parser la formule et remplacer les références de catégories
        formula_lower = formula.lower().strip()
        
        # Extraire les catégories mentionnées dans la formule
        import re
        pattern = r'sum\((\w+)\)'
        matches = re.findall(pattern, formula_lower)
        
        for match in matches:
            if match in categories_sum:
                result += categories_sum[match]['tax']
        
        # Gérer les opérations simples (+ et -)
        if '+' in formula_lower:
            parts = formula_lower.split('+')
            for part in parts:
                inner_matches = re.findall(pattern, part.strip())
                for m in inner_matches:
                    if m in categories_sum:
                        result += categories_sum[m]['tax']
        elif '-' in formula_lower:
            parts = formula_lower.split('-')
            if len(parts) >= 2:
                first_part = parts[0].strip()
                second_part = '-'.join(parts[1:]).strip()
                
                first_matches = re.findall(pattern, first_part)
                second_matches = re.findall(pattern, second_part)
                
                pos_result = 0.0
                neg_result = 0.0
                
                for m in first_matches:
                    if m in categories_sum:
                        pos_result += categories_sum[m]['tax']
                        
                for m in second_matches:
                    if m in categories_sum:
                        neg_result += categories_sum[m]['tax']
                
                result = pos_result - neg_result
        
        return round(result, 2)
    
    def _evaluate_compute_formula(self, formula, categories_sum):
        """
        Évalue une formule de calcul spécifique.
        
        Exemples:
        - brut_imposable * 0.10
        - resultat_fiscal * 0.19
        - chiffre_affaires_ttc * 0.005
        """
        result = 0.0
        
        try:
            # Remplacer les références aux catégories
            eval_context = {}
            
            # Ajouter les variables disponibles
            for cat_name, values in categories_sum.items():
                eval_context[f'sum({cat_name})'] = values['tax']
                eval_context[f'{cat_name}'] = values['tax']
            
            # Variables spéciales
            eval_context['brut_imposable'] = categories_sum.get(
                'remunerations_brutes', {'tax': 0}
            )['tax'] + categories_sum.get(
                'avantages_nature', {'tax': 0}
            )['tax']
            
            eval_context['resultat_fiscal'] = (
                categories_sum.get('resultat_comptable', {'tax': 0})['tax'] +
                categories_sum.get('reintegrations', {'tax': 0})['tax'] -
                categories_sum.get('deductions', {'tax': 0})['tax']
            )
            
            eval_context['ca_imposable'] = categories_sum.get(
                'chiffre_affaires', {'tax': 0}
            )['tax']
            
            # Évaluer la formule (sécurisé - opérations mathématiques uniquement)
            safe_formula = formula.replace(',', '.')
            allowed_chars = set('0123456789+-*/.() abcdefghijklmnopqrstuvwxyz_')
            
            if all(c in allowed_chars for c in safe_formula):
                result = eval(safe_formula, {"__builtins__": {}}, eval_context)
            
        except Exception as e:
            _logger.warning(f"Erreur évaluation formule '{formula}': {e}")
        
        return round(result, 2)
    
    def action_submit(self):
        """
        Soumet la déclaration (passe à l'état 'submitted').
        Vérifie que tous les champs obligatoires sont remplis.
        """
        self.ensure_one()
        
        # Vérifications avant soumission
        missing_lines = self.line_ids.filtered(lambda l: l.is_mandatory and not l.tax_amount)
        if missing_lines:
            raise ValidationError(_(
                "Les lignes obligatoires suivantes ne sont pas remplies: %s",
                ', '.join(missing_lines.mapped('code'))
            ))
        
        self.state = 'submitted'
        self.message_post(body=_("Déclaration soumise avec succès"))
    
    def action_confirm_payment(self):
        """
        Confirme le paiement de la déclaration.
        """
        self.ensure_one()
        
        if self.amount_due <= 0:
            raise UserError(_("Cette déclaration n'a pas de montant dû (crédit possible)."))
        
        self.payment_date = fields.date.today()
        self.amount_paid = self.amount_due
        self.state = 'paid'
        
        self.message_post(body=_(
            "Paiement confirmé: %s %s",
            self.amount_paid,
            self.currency_id.symbol
        ))
    
    def action_set_to_draft(self):
        """
        Remet la déclaration en brouillon.
        """
        self.ensure_one()
        
        if self.state == 'paid':
            raise UserError(_(
                "Impossible de modifier une déclaration déjà payée. "
                "Veuillez d'abord annuler le paiement."
            ))
        
        self.state = 'draft'
        self.message_post(body=_("Déclaration remise en brouillon"))
    
    def action_print_report(self):
        """
        Ouvre l'action d'impression du rapport PDF.
        """
        self.ensure_one()
        
        report_map = {
            'G50': 'l10n_dz_reports.action_report_g50_tva',
            'G1': 'l10n_dz_reports.action_report_g1_irg',
            'G2': 'l10n_dz_reports.action_report_g2_tap',
            'G4': 'l10n_dz_reports.action_report_g4_ibs',
        }
        
        report_action = report_map.get(self.declaration_type)
        if not report_action:
            raise UserError(_("Rapport non disponible pour ce type de déclaration."))
        
        return self.env.ref(report_action).report_action(self)


class L10nDzTaxDeclarationLine(models.Model):
    """
    Ligne de déclaration fiscale.
    Contient les montants pour chaque rubrique du formulaire.
    """
    _name = 'l10n.dz.tax.declaration.line'
    _description = 'Ligne de Déclaration Fiscale Algérienne'
    _order = 'sequence'
    
    declaration_id = fields.Many2one(
        'l10n.dz.tax.declaration',
        string='Déclaration',
        required=True,
        ondelete='cascade'
    )
    
    sequence = fields.Integer(string='Séquence')
    code = fields.Char(string='Code')
    name = fields.Char(string='Libellé')
    
    category = fields.Selection([
        # Catégories G50 TVA
        ('tva_collectee', 'TVA Collectée'),
        ('tva_deductible', 'TVA Déductible B/S'),
        ('tva_deductible_immo', 'TVA Déductible Immobilisations'),
        ('tva_non_deductible', 'TVA Non Déductible'),
        ('exonerations', 'Exonérations'),
        
        # Catégories G1 IRG
        ('remunerations_brutes', 'Rémunérations Brutes'),
        ('avantages_nature', 'Avantages en Nature'),
        ('cotisations_salariales', 'Cotisations Salariales'),
        ('cotisations_patronales', 'Cotisations Patronales'),
        ('deductions', 'Déductions/Abattements'),
        
        # Catégories G2 TAP
        ('chiffre_affaires', 'Chiffre d\'Affaires'),
        ('chiffre_affaires_reduit', 'CA à Taux Réduit'),
        ('exonerations_zone', 'Exonération Zone'),
        ('exonerations_secteur', 'Exonération Secteur'),
        ('exonerations_creation', 'Exonération Création'),
        ('exonerations_autres', 'Autres Exonérations'),
        
        # Catégories G4 IBS
        ('resultat_comptable', 'Résultat Comptable'),
        ('reintegrations', 'Réintégrations'),
        ('deductions', 'Déductions'),
        ('deductions_deficit', 'Déficit Reportable'),
        ('deductions_credits', 'Crédits d\'Impôt'),
        ('deductions_incentives', 'Incitations ANDI'),
        ('deductions_zone', 'Super-déduction Zone'),
        ('calcul_ibs', 'Calcul IBS'),
        ('minimum_impot', 'Minimum d\'Impôt'),
        
        # Communes
        ('regularisation', 'Régularisation'),
        ('acomptes', 'Acomptes Versés'),
        ('total', 'Total'),
        ('solde', 'Solde'),
    ], string='Catégorie')
    
    sign = fields.Selection([
        ('positive', 'Positif (+)'),
        ('negative', 'Négatif (-)'),
        ('neutral', 'Neutre'),
    ], string='Signe')
    
    base_amount = fields.Monetary(
        string='Base de calcul',
        currency_field='currency_id'
    )
    
    tax_amount = fields.Monetary(
        string='Montant',
        currency_field='currency_id'
    )
    
    rate = fields.Float(string='Taux (%)')
    
    is_mandatory = fields.Boolean(string='Obligatoire')
    manual_entry = fields.Boolean(string='Saisie manuelle')
    is_computed = fields.Boolean(string='Calculé')
    
    is_total = fields.Boolean(string='Total')
    is_solde = fields.Boolean(string='Solde')
    is_bold = fields.Boolean(string='Gras')
    is_highlighted = fields.Boolean(string='Mis en évidence')
    
    description_text = fields.Text(string='Description')
    
    currency_id = fields.Many2one(
        related='declaration_id.currency_id',
        string='Devise',
        readonly=True
    )
    
    @api.onchange('base_amount', 'rate')
    def _onchange_compute_tax(self):
        """Calcule automatiquement le montant de la taxe si taux disponible."""
        if self.base_amount and self.rate and not self.manual_entry:
            self.tax_amount = round(self.base_amount * (self.rate / 100), 2)


class L10nDzDeclarationWizard(models.TransientModel):
    """
    Assistant de création de déclaration fiscale.
    Permet de créer rapidement une nouvelle déclaration.
    """
    _name = 'l10n.dz.declaration.wizard'
    _description = 'Assistant de Déclaration Fiscale Algérienne'
    
    declaration_type = fields.Selection([
        ('G50', 'G50 - Déclaration TVA'),
        ('G1', 'G1 - Déclaration IRG'),
        ('G2', 'G2 - Déclaration TAP'),
        ('G4', 'G4 - Déclaration IBS'),
    ], string='Type de Déclaration', required=True, default='G50')
    
    company_id = fields.Many2one(
        'res.company',
        string='Entreprise',
        default=lambda self: self.env.company,
        required=True
    )
    
    period_type = fields.Selection([
        ('monthly', 'Mensuelle'),
        ('quarterly', 'Trimestrielle'),
        ('yearly', 'Annuelle'),
    ], string='Période', required=True, default='monthly')
    
    date_from = fields.Date(
        string='Date début',
        required=True,
        default=fields.date.today().replace(day=1)
    )
    
    date_to = fields.Date(
        string='Date fin',
        required=True,
        default=fields.date.today()
    )
    
    auto_compute = fields.Boolean(
        string='Calculer automatiquement après création',
        default=True
    )
    
    include_draft_moves = fields.Boolean(
        string='Inclure les brouillons comptables',
        default=False
    )
    
    exclude_reconciled = fields.Boolean(
        string='Exclure les écritures lettrées',
        default=False
    )
    
    journal_ids = fields.Many2many(
        'account.journal',
        string='Journaux',
        domain="[('company_id', '=', company_id)]"
    )
    
    def action_create_declaration(self):
        """
        Crée une nouvelle déclaration et optionnellement lance le calcul.
        """
        # Créer la déclaration
        declaration = self.env['l10n.dz.tax.declaration'].create({
            'declaration_type': self.declaration_type,
            'company_id': self.company_id.id,
            'period_type': self.period_type,
            'date_from': self.date_from,
            'date_to': self.date_to,
            'state': 'draft',
        })
        
        # Calculer si demandé
        if self.auto_compute:
            declaration.action_compute()
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'l10n.dz.tax.declaration',
            'res_id': declaration.id,
            'view_mode': 'form',
            'view_type': 'form',
        }
