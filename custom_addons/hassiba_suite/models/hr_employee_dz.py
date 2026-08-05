# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Employee Extension

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class HREmployeeDZ(models.Model):
    _inherit = 'hr.employee'

    # CNAS / Social Security Numbers
    cnas_number = fields.Char(
        string='N° CNAS',
        help='Numéro d\'affiliation à la CNAS',
        tracking=True,
        copy=False
    )
    casnos_number = fields.Char(
        string='N° CASNOS',
        help='Numéro d\'affiliation CASNOS (pour gérants)',
        tracking=True,
        copy=False
    )

    # Family Situation (for IRG calculation)
    family_situation = fields.Selection([
        ('celibataire', 'Célibataire'),
        ('marie', 'Marié(e)'),
        ('divorce', 'Divorcé(e)'),
        ('veuf', 'Veuf/Veuve'),
    ], string='Situation Familiale', default='celibataire', tracking=True)

    nb_children = fields.Integer(
        string='Nombre d\'Enfants',
        default=0,
        tracking=True,
        help='Nombre d\'enfants à charge (max 4 pour IRG)'
    )
    nb_spouse_employees = fields.Integer(
        string='Emplois Conjoint',
        default=0,
        help='Nombre d\'emplois du conjoint (0, 1 ou 2)'
    )
    
    # Handicap Status
    handicap = fields.Boolean(
        string='Situation de Handicap',
        default=False,
        tracking=True,
        help='Bénéficie d\'une charge supplémentaire de 3750 DZD'
    )

    # Professional Category
    category_professionnelle = fields.Selection([
        ('cadre', 'Cadre Supérieur'),
        ('maitrise', 'Maîtrise / Technicien'),
        ('employe', 'Employé / Administratif'),
        ('ouvrier', 'Ouvrier Qualifié'),
        ('non_qualifie', 'Ouvrier Non-Qualifié'),
    ], string='Catégorie Professionnelle', default='employe')

    # Salary Bank Details
    salary_bank_name = fields.Char(string='Banque Salaire')
    salary_account_rib = fields.Char(
        string='RIB Salaire',
        help='Compte bancaire pour virement salarial'
    )

    # Computed field: Total Family Charges for IRG
    total_charges_famille = fields.Float(
        string='Charges Familles (IRG)',
        compute='_compute_total_charges_famille',
        store=True,
        help='Total des déductions autorisées pour charges de famille selon l\'article 104 CIDTA'
    )

    @api.depends('family_situation', 'nb_children', 'nb_spouse_employees', 'handicap')
    def _compute_total_charges_famille(self):
        """Calculate total family deductions per CIDTA law
        
        Rules (Art 104 CIDTA):
        - Célibataire: 0 (unless handicap)
        - Marié + conjoint sans emploi: 2500 DZD
        - Par enfant à charge: 1250 DZD (max 4 enfants = 5000 DZD)
        - Handicap: +3750 DZD
        - Maximum total: 10000 DZD
        """
        irg_charge_conjoint = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.irg_charge_conjoint', '2500'))
        irg_charge_enfant = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.irg_charge_enfant', '1250'))
        irg_max_enfants = int(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.irg_max_enfants', '4'))
        irg_charge_handicap = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.irg_charge_handicap', '3750'))
        
        max_total = 10000  # Maximum legal deduction
        
        for employee in self:
            total = 0
            
            # Conjoint deduction
            if employee.family_situation == 'marie' and employee.nb_spouse_employees == 0:
                total += irg_charge_conjoint
            
            # Children deductions (capped at max_enfants)
            nb_enfants_deductible = min(employee.nb_children or 0, irg_max_enfants)
            total += nb_enfants_deductible * irg_charge_enfant
            
            # Handicap deduction
            if employee.handicap:
                total += irg_charge_handicap
            
            # Cap at maximum
            employee.total_charges_famille = min(total, max_total)

    @api.constrains('nb_children')
    def _check_nb_children(self):
        for record in self:
            if record.nb_children < 0:
                raise ValidationError(_("Le nombre d'enfants ne peut pas être négatif."))

    @api.constrains('cnas_number')
    def _check_cnas_number(self):
        for record in self:
            if record.cnas_number and not record.cnas_number.isdigit():
                raise ValidationError(_("Le numéro CNAS ne doit contenir que des chiffres."))
