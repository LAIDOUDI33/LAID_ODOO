# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Batch Payroll Generation Wizard

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class GeneratePayrollWizard(models.TransientModel):
    _name = 'generate.payroll.wizard'
    _description = 'Assistant de Génération de Paie en Masse'

    mois_paie = fields.Selection([
        ('1', 'Janvier'), ('2', 'Février'), ('3', 'Mars'),
        ('4', 'Avril'), ('5', 'Mai'), ('6', 'Juin'),
        ('7', 'Juillet'), ('8', 'Août'), ('9', 'Septembre'),
        ('10', 'Octobre'), ('11', 'Novembre'), ('12', 'Décembre'),
    ], string='Mois de Paie', required=True, default=lambda self: str(fields.Date.today().month))

    annee_paie = fields.Char(
        string='Année de Paie',
        required=True,
        default=fields.Date.today().strftime('%Y')
    )

    date_debut = fields.Date(
        string='Date Début',
        required=True,
        compute='_compute_dates',
        store=False,
        readonly=False
    )

    date_fin = fields.Date(
        string='Date Fin',
        required=True,
        compute='_compute_dates',
        store=False,
        readonly=False
    )

    employee_ids = fields.Many2many(
        'hr.employee',
        string='Employés',
        domain="[('contract_id.state', '=', 'open')]",
        help="Laisser vide pour tous les employés actifs"
    )

    struct_id = fields.Many2one(
        'hr.payroll.structure',
        string='Structure de Paie',
        required=True,
        default=lambda self: self.env['hr.payroll.structure'].search([], limit=1)
    )

    journal_id = fields.Many2one(
        'account.journal',
        string='Journal de Paie',
        domain="[('type', '=', 'general')]",
        required=True,
        default=lambda self: self.env['account.journal'].search([('type', '=', 'general')], limit=1)
    )

    note = fields.Text(string='Notes')

    @api.onchange('mois_paie', 'annee_paie')
    def _compute_dates(self):
        """Compute period dates based on month/year"""
        for wizard in self:
            if wizard.mois_paie and wizard.annee_paie:
                month = int(wizard.mois_paie)
                year = int(wizard.annee_paie)
                
                # First day of month
                date_debut = fields.Date.to_date(f'{year}-{month:02d}-01')
                
                # Last day of month
                if month == 12:
                    next_month = date_debut.replace(year=year + 1, month=1)
                else:
                    next_month = date_debut.replace(month=month + 1)
                date_fin = next_month - relativedelta(days=1)
                
                wizard.date_debut = date_debut
                wizard.date_fin = date_fin

    def action_generate_payslips(self):
        """Generate payslips for selected employees"""
        from datetime import timedelta
        
        # Get employees
        employees = self.employee_ids
        if not employees:
            employees = self.env['hr.employee'].search([
                ('contract_id.state', '=', 'open')
            ])
        
        if not employees:
            raise UserError(_("Aucun employé trouvé avec un contrat actif."))
        
        # Create or get Payslip Batch
        batch_vals = {
            'name': f'Paie {dict(self._fields["mois_paie"].selection).get(self.mois_paie)} {self.annee_paie}',
            'date_start': self.date_debut,
            'date_end': self.date_fin,
            'struct_id': self.struct_id.id,
            'journal_id': self.journal_id.id,
            'note': self.note or '',
        }
        
        batch = self.env['hr.payslip.run'].create(batch_vals)
        
        # Create individual payslips
        payslips_created = 0
        for employee in employees:
            if employee.contract_id:
                slip_vals = {
                    'payslip_run_id': batch.id,
                    'employee_id': employee.id,
                    'name': f'Bulletin {employee.name}',
                    'struct_id': self.struct_id.id,
                    'date_from': self.date_debut,
                    'date_to': self.date_fin,
                    'journal_id': self.journal_id.id,
                    'mois_paie': self.mois_paie,
                    'annee_paie': self.annee_paie,
                }
                
                slip = self.env['hr.payslip'].create(slip_vals)
                
                # Compute the payslip (this triggers CNAS/IRG calculations)
                try:
                    slip.action_compute_sheet()
                    payslips_created += 1
                except Exception as e:
                    # Log error but continue with other employees
                    pass
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'hr.payslip.run',
            'res_id': batch.id,
            'view_mode': 'form',
            'target': 'current',
        }


# Import needed for date calculation
from dateutil.relativedelta import relativedelta
