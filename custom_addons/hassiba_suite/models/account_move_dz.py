# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Invoice/TVA Extension for Algeria

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class AccountMoveDZ(models.Model):
    _inherit = 'account.move'

    # TVA-specific fields
    mention_tva = fields.Text(
        string='Mention TVA',
        compute='_compute_mention_tva',
        store=True
    )
    regime_facture = fields.Selection([
        ('normal', 'Facture Normale'),
        ('auto_facture', 'Auto-Facture'),
        ('note_honoraires', 'Note d\'Honoraires'),
        ('facture_proforma', 'Proforma'),
        ('avoir', 'Avoir / Note de Crédit'),
    ], string='Type de Document Fiscal', default='normal')

    # G50 Declaration tracking
    declare_g50 = fields.Boolean(
        string='Déclarée G50',
        default=False,
        copy=False
    )
    periode_declaration_id = fields.Many2one(
        'account.tax.period',
        string='Période de Déclaration'
    )
    
    # Algerian invoice requirements
    timbre_fiscal = fields.Float(
        string='Timbre Fiscal (DZD)',
        default=0,
        help='Montant du timbre fiscal obligatoire sur les factures'
    )
    facture_accompte = fields.Boolean(
        string='Facture d\'Accompte',
        default=False
    )
    pourcentage_accompte = fields.Float(
        string='% Accompte',
        default=0
    )

    @api.depends('partner_id', 'amount_total', 'invoice_date')
    def _compute_mention_tva(self):
        for move in self:
            if move.move_type in ['out_invoice', 'out_refund'] and move.partner_id:
                partner = move.partner_id
                
                mentions = []
                
                if partner.tva_assujetti and move.amount_total > 0:
                    mentions.append(f'TVA {partner.regime_tva or "Régime Réel"}')
                
                if partner.nif:
                    mentions.append(f'NIF: {partner.nif}')
                
                if partner.rc:
                    mentions.append(f'RC: {partner.rc}')
                
                if partner.ai:
                    mentions.append(f'AI: {partner.ai}')
                
                move.mention_tva = ' | '.join(mentions) if mentions else ''
            else:
                move.mention_tva = ''

    def action_post(self):
        """Validate invoice with Algerian checks"""
        for move in self:
            if move.move_type == 'out_invoice':
                # Check mandatory fields for B2B invoices
                if move.partner_id.tva_assujetti:
                    if not move.partner_id.nif:
                        raise ValidationError(_(
                            'Le NIF est obligatoire pour les clients assujettis à la TVA.'
                        ))
                    
                    # Check TVA lines exist
                    has_tva_lines = any(
                        line.tax_ids for line in move.invoice_line_ids
                    )
                    if not has_tva_lines:
                        raise ValidationError(_(
                            'Les lignes de TVA sont obligatoires pour les factures assujetties.'
                        ))
        
        return super(AccountMoveDZ, self).action_post()

    def button_draft(self):
        """Reset declaration status when returning to draft"""
        for move in self:
            move.declare_g50 = False
        return super(AccountMoveDZ, self).button_draft()


class AccountTaxPeriod(models.Model):
    _name = 'account.tax.period'
    _description = 'Période Fiscale pour Déclarations TVA'
    _order = 'year DESC, month DESC'

    name = fields.Char(string='Période', compute='_compute_name', store=True)
    month = fields.Selection([
        ('1', 'Janvier'), ('2', 'Février'), ('3', 'Mars'),
        ('4', 'Avril'), ('5', 'Mai'), ('6', 'Juin'),
        ('7', 'Juillet'), ('8', 'Août'), ('9', 'Septembre'),
        ('10', 'Octobre'), ('11', 'Novembre'), ('12', 'Décembre'),
    ], string='Mois', required=True)
    year = fields.Char(string='Année', required=True, size=4)
    
    company_id = fields.Many2one(
        'res.company',
        string='Société',
        default=lambda self: self.env.company
    )
    
    state = fields.Selection([
        ('draft', 'Brouillon'),
        ('open', 'Ouverte'),
        ('declared', 'Déclarée'),
        ('paid', 'Payée'),
        ('closed', 'Clôturée'),
    ], string='État', default='draft')

    # Computed totals from invoices
    tva_collectee = fields.Monetary(
        string='TVA Collectée',
        compute='_compute_totals',
        store=True,
        currency_field='company_currency_id'
    )
    tva_deductible = fields.Monetary(
        string='TVA Déductible',
        compute='_compute_totals',
        store=True,
        currency_field='company_currency_id'
    )
    solde_tva = fields.Monetary(
        string='Solde TVA',
        compute='_compute_solde',
        store=True,
        currency_field='company_currency_id'
    )
    company_currency_id = fields.Many2one(
        'res.currency',
        related='company_id.currency_id'
    )
    
    invoice_ids = fields.One2many(
        'account.move',
        'periode_declaration_id',
        string='Factures'
    )
    nb_invoices = fields.Integer(
        string='Nb Factures',
        compute='_compute_nb_invoices'
    )

    @api.depends('month', 'year')
    def _compute_name(self):
        for period in self:
            mois_name = dict(period._fields['month'].selection).get(period.month)
            period.name = f'{mois_name} {period.year}'

    @api.depends('invoice_ids.amount_tax')
    def _compute_totals(self):
        for period in self:
            invoices = period.invoice_ids.filtered(lambda m: m.state == 'posted')
            
            # TVA collectée (ventes)
            ventes = invoices.filtered(lambda m: m.move_type in ['out_invoice'])
            period.tva_collectee = sum(v.amount_tax for v in ventes)
            
            # TVA déductible (achats)
            achats = invoices.filtered(lambda m: m.move_type in ['in_invoice'])
            period.tva_deductible = sum(a.amount_tax for a in achats)

    @api.depends('tva_collectee', 'tva_deductible')
    def _compute_solde(self):
        for period in self:
            period.solde_tva = period.tva_collectee - period.tva_deductible

    @api.depends('invoice_ids')
    def _compute_nb_invoices(self):
        for period in self:
            period.nb_invoices = len(period.invoice_ids)

    def action_open_period(self):
        self.write({'state': 'open'})
    
    def action_close_period(self):
        self.write({'state': 'closed'})

    _sql_constraints = [
        ('month_year_unique', 'UNIQUE(month, year, company_id)', 
         'Une période ne peut exister qu\'une seule fois!'),
    ]
