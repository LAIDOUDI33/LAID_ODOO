# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)


class HrContract(models.Model):
    """
    Extension du modèle hr.contract pour la paie algérienne.
    
    Algerian Payroll Contract Extension
    - Configuration des primes spécifiques
    - Taux accident de travail
    - SMIG configurable par contrat
    """
    
    _inherit = 'hr.contract'
    
    # ============================================
    # CHAMPS PRIMES ALGÉRIENNES / ALGERIAN ALLOWANCES
    # ============================================
    
    prime_logement = fields.Float(
        string='Indemnité Logement (DZD)',
        default=0,
        help='بدل السكن - Montant mensuel de l\'indemnité de logement'
    )
    logement_plafond = fields.Float(
        string='Plafond Logement (DZD)',
        default=20000,
        help='Plafond d\'exonération de l\'indemnité de logement'
    )
    prime_transport = fields.Float(
        string='Indemnité Transport (DZD)',
        default=10000,
        help='بدل النقل - Montant mensuel de l\'indemnité de transport (max 10,000 DZD non imposable)'
    )
    prime_responsabilite = fields.Float(
        string='Prime de Responsabilité (DZD)',
        default=0,
        help='مكافأة المسؤولية - Prime liée au niveau de responsabilité du poste'
    )
    
    # ============================================
    # COTISATIONS / CONTRIBUTIONS CONFIGURATION
    # ============================================
    
    taux_accident_travail = fields.Float(
        string="Taux Accident de Travail (%)",
        default=3.0,
        help='حادث العمل - Taux de cotisation accident de travail selon secteur:\n- Bureau: 0.5% à 1%\n- Commerce: 1.5% à 2%\n- Industrie: 3% à 5%'
    )
    
    # ============================================
    # SMIG ET LÉGISLATION / MINIMUM WAGE
    # ============================================
    
    smig_value = fields.Float(
        related='company_id.smig_value',
        string='SMIG (DZD)',
        readonly=False,
        store=True,
        help='الحد الأدنى للأجور - Salaire Minimum Interprofessionnel Garanti en vigueur'
    )
    
    # ============================================
    # INFORMATIONS FISCALES / TAX INFORMATION
    # ============================================
    
    nb_parts_fiscales = fields.Integer(
        related='employee_id.nb_parts_fiscales',
        string='Parts Fiscales',
        readonly=False,
        store=True,
        help='الضرائب - Nombre de parts fiscales pour calcul IRG\n1 part = salarié\n+ 1 part par personne à charge (époux(se), enfants)'
    )
    
    # ============================================
    # CONTRAINTES DE VALIDATION / VALIDATION RULES
    # ============================================
    
    @api.constrains('wage', 'smig_value')
    def _check_smig_minimum(self):
        """Vérifie que le salaire est conforme au SMIG."""
        for contract in self:
            if contract.wage <= 0:
                continue
            
            smig = contract.smig_value or self.env['hr.payslip']._get_smig_value()
            
            if contract.wage < smig:
                raise ValidationError(_(
                    "Le salaire de base (%(salaire)s DZD) est inférieur au SMIG (%(smig)s DZD).\n"
                    "Ceci constitue une violation du Code du Travail algérien.\n"
                    "Veuillez ajuster le salaire ou justifier l'écart.",
                    salaire=contract.wage,
                    smig=smig
                ))
    
    @api.constrains('taux_accident_travail')
    def _check_taux_accident(self):
        """Vérifie la validité du taux accident de travail."""
        for contract in self:
            if contract.taux_accident_travail < 0 or contract.taux_accident_travail > 10:
                raise ValidationError(_(
                    "Le taux d'accident de travail doit être entre 0%% et 10%%."
                ))
    
    @api.onchange('employee_id')
    def _onchange_employee_parts(self):
        """Met à jour les parts fiscales depuis l'employé."""
        if self.employee_id:
            self.nb_parts_fiscales = self.employee_id._get_nb_parts_fiscales()
