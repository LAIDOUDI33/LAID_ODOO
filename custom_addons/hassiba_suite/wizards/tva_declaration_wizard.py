# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - TVA Declaration Wizard (G50)

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class TVADeclarationWizard(models.TransientModel):
    _name = 'tva.declaration.wizard'
    _description = 'Assistant de Déclaration TVA G50'

    # Period Selection
    month = fields.Selection([
        ('1', 'Janvier'), ('2', 'Février'), ('3', 'Mars'),
        ('4', 'Avril'), ('5', 'Mai'), ('6', 'Juin'),
        ('7', 'Juillet'), ('8', 'Août'), ('9', 'Septembre'),
        ('10', 'Octobre'), ('11', 'Novembre'), ('12', 'Décembre'),
    ], string='Mois', required=True, default=lambda self: str(fields.Date.today().month))

    year = fields.Char(
        string='Année',
        required=True,
        default=fields.Date.today().strftime('%Y')
    )

    company_id = fields.Many2one(
        'res.company',
        string='Société',
        default=lambda self: self.env.company
    )

    # Computed Totals
    tva_collectee = fields.Monetary(
        string='TVA Collectée',
        compute='_compute_totals',
        currency_field='currency_id'
    )
    tva_deductible = fields.Monetary(
        string='TVA Déductible',
        compute='_compute_totals',
        currency_field='currency_id'
    )
    solde_tva = fields.Monetary(
        string='Solde TVA à Payer',
        compute='_compute_solde',
        currency_field='currency_id'
    )
    nb_factures_vente = fields.Integer(
        string='Nb Factures Vente',
        compute='_compute_totals'
    )
    nb_factures_achat = fields.Integer(
        string='Nb Factures Achat',
        compute='_compute_totals'
    )
    
    currency_id = fields.Many2one(
        'res.currency',
        related='company_id.currency_id'
    )

    # Options
    include_draft = fields.Boolean(
        string='Inclure les Brouillons',
        default=False,
        help='Inclure les factures en brouillon dans le calcul'
    )
    auto_mark_declared = fields.Boolean(
        string='Marquer comme Déclaré',
        default=True,
        help='Marquer automatiquement les factures comme déclarées'
    )

    @api.depends('month', 'year', 'company_id')
    def _compute_totals(self):
        """Calculate TVA totals for the period"""
        for wizard in self:
            if not wizard.month or not wizard.year:
                continue
            
            # Date range for the period
            month_int = int(wizard.month)
            year_int = int(wizard.year)
            
            date_from = f'{year_int}-{month_int:02d}-01'
            if month_int == 12:
                date_to = f'{year_int + 1}-01-01'
            else:
                date_to = f'{year_int}-{month_int + 1:02d}-01'
            
            # Domain for sales invoices (out_invoice)
            vente_domain = [
                ('move_type', '=', 'out_invoice'),
                ('invoice_date', '>=', date_from),
                ('invoice_date', '<', date_to),
                ('company_id', '=', wizard.company_id.id),
            ]
            
            # Domain for purchase invoices (in_invoice)
            achat_domain = [
                ('move_type', '=', 'in_invoice'),
                ('invoice_date', '>=', date_from),
                ('invoice_date', '<', date_to),
                ('company_id', '=', wizard.company_id.id),
            ]
            
            if not wizard.include_draft:
                vente_domain.append(('state', '=', 'posted'))
                achat_domain.append(('state', '=', 'posted'))
            
            ventes = self.env['account.move'].search(vente_domain)
            achats = self.env['account.move'].search(achat_domain)
            
            wizard.tva_collectee = sum(v.amount_tax for v in ventes)
            wizard.tva_deductible = sum(a.amount_tax for a in achats)
            wizard.nb_factures_vente = len(ventes)
            wizard.nb_factures_achat = len(achats)

    @api.depends('tva_collectee', 'tva_deductible')
    def _compute_solde(self):
        for wizard in self:
            wizard.solde_tva = wizard.tva_collectee - wizard.tva_deductible

    def action_validate_declaration(self):
        """Validate and create/update tax period"""
        self.ensure_one()
        
        # Check if period exists
        period = self.env['account.tax.period'].search([
            ('month', '=', self.month),
            ('year', '=', self.year),
            ('company_id', '=', self.company_id.id),
        ], limit=1)
        
        if not period:
            period = self.env['account.tax.period'].create({
                'month': self.month,
                'year': self.year,
                'company_id': self.company_id.id,
                'state': 'declared' if self.auto_mark_declared else 'open',
            })
        elif self.auto_mark_declared:
            period.write({'state': 'declared'})
        
        # Mark invoices as declared if option is set
        if self.auto_mark_declared and self.solde_tva > 0:
            month_int = int(self.month)
            year_int = int(self.year)
            
            date_from = f'{year_int}-{month_int:02d}-01'
            if month_int == 12:
                date_to = f'{year_int + 1}-01-01'
            else:
                date_to = f'{year_int}-{month_int + 1:02d}-01'
            
            invoices = self.env['account.move'].search([
                ('move_type', '=', 'out_invoice'),
                ('invoice_date', '>=', date_from),
                ('invoice_date', '<', date_to),
                ('state', '=', 'posted'),
                ('declare_g50', '=', False),
                ('company_id', '=', self.company_id.id),
            ])
            
            invoices.write({
                'declare_g50': True,
                'periode_declaration_id': period.id,
            })
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'account.tax.period',
            'res_id': period.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_print_g50(self):
        """Print G50 declaration form"""
        self.ensure_one()
        
        # Ensure we have data
        self._compute_totals()
        
        return self.env.ref('hassiba_suite.report_g50_declaration').report_action(self)


# Action for menu
class TVADeclarationWizardAction(models.TransientModel):
    _name = 'tva.declaration.wizard.action'
    _inherit = 'tva.declaration.wizard'
