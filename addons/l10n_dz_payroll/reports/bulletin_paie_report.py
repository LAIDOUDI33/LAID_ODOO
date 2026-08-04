# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, api, _
from odoo.tools import format_date


class ReportBulletinPaie(models.AbstractModel):
    """
    Rapport Bulletin de Paie Algérien.
    
    Algerian Payslip Report
    - Format bilingue Arabe/Français
    - Conforme à la législation algérienne
    - Attestation CNAS intégrée
    """
    
    _name = 'report.l10n_dz_payroll.bulletin_paie_bilingue'
    _inherit = 'report.abstract_report'
    _description = 'Bulletin de Paie Bilingue Arabe/Français'
    
    @api.model
    def _get_report_values(self, docids, data=None):
        """Prépare les données pour le rapport."""
        payslips = self.env['hr.payslip'].browse(docids)
        
        return {
            'doc_ids': docids,
            'doc_model': 'hr.payslip',
            'docs': payslips,
            'data': data or {},
            'format_date': self._format_date,
            'format_amount': self._format_amount_dzd,
        }
    
    def _format_date(self, date):
        """Formate une date en format algérien (DD/MM/YYYY)."""
        if date:
            return format_date(self.env, date, date_format='dd/MM/yyyy')
        return ''
    
    def _format_amount_dzd(self, amount):
        """Formate un montant en DZD avec séparateurs de milliers."""
        if amount is not None:
            return '{:,.2f}'.format(amount).replace(',', ' ') + ' DZD'
        return '0.00 DZD'


class ReportAttestationCnas(models.AbstractModel):
    """
    Rapport Attestation CNAS pour salarié algérien.
    
    CNAS Certificate Report for Algerian Employee
    - Certifie l'affiliation à la CNAS
    - Mentionne les cotisations versées
    - Document officiel pour démarches administratives
    """
    
    _name = 'report.l10n_dz_payroll.report_attestation_cnas'
    _inherit = 'report.abstract_report'
    _description = "Attestation d'Affiliation CNAS"
    
    @api.model
    def _get_report_values(self, docids, data=None):
        """Prépare les données pour l'attestation CNAS."""
        payslips = self.env['hr.payslip'].browse(docids)
        
        return {
            'doc_ids': docids,
            'doc_model': 'hr.payslip',
            'docs': payslips,
            'data': data or {},
            'format_date': self._format_date,
            'format_amount': self._format_amount_dzd,
        }
    
    def _format_date(self, date):
        """Formate une date en format algérien."""
        if date:
            return format_date(self.env, date, date_format='dd/MM/yyyy')
        return ''
    
    def _format_amount_dzd(self, amount):
        """Formate un montant en DZD."""
        if amount is not None:
            return '{:,.2f}'.format(amount).replace(',', ' ') + ' DZD'
        return '0.00 DZD'


class HrPayslipPrint(models.TransientModel):
    """
    Assistant d'impression du bulletin de paie.
    
    Payslip Printing Wizard
    - Choix du format (Français/Arabe/Bilingue)
    - Options d'impression
    """
    
    _name = 'hr.payslip.print.dz'
    _description = 'Assistant Impression Bulletin Paie Algérien'
    
    payslip_id = fields.Many2one(
        'hr.payslip',
        string='Bulletin de Paie',
        required=True,
        readonly=True
    )
    print_format = fields.Selection([
        ('fr', 'Français'),
        ('ar', 'Arabe'),
        ('bilingue', 'Bilingue Français-Arabe'),
    ],
        string='Format d\'impression',
        default='bilingue',
        required=True
    )
    include_cnas = fields.Boolean(
        string='Inclure Attestation CNAS',
        default=False
    )
    include_details_irg = fields.Boolean(
        string='Inclure Détails IRG',
        default=True
    )
    
    def action_print(self):
        """Génère le rapport selon le format choisi."""
        self.ensure_one()
        
        if self.print_format == 'bilingue':
            report_name = 'l10n_dz_payroll.bulletin_paie_bilingue'
        else:
            # Par défaut, utiliser le template bilingue
            report_name = 'l10n_dz_payroll.bulletin_paie_bilingue'
        
        return self.env.ref(report_name).report_action([self.payslip_id.id])
