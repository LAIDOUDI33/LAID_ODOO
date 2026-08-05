# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Core Payroll Engine for Algeria

import math
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HRPayslipDZ(models.Model):
    _inherit = 'hr.payslip'

    # Algerian Payslip Fields
    numero_bulletin = fields.Char(
        string='N° Bulletin',
        readonly=True,
        copy=False,
        default=lambda self: _('Nouveau')
    )
    mois_paie = fields.Selection([
        ('1', 'Janvier'),
        ('2', 'Février'),
        ('3', 'Mars'),
        ('4', 'Avril'),
        ('5', 'Mai'),
        ('6', 'Juin'),
        ('7', 'Juillet'),
        ('8', 'Août'),
        ('9', 'Septembre'),
        ('10', 'Octobre'),
        ('11', 'Novembre'),
        ('12', 'Décembre'),
    ], string='Mois de Paie', required=True)
    
    annee_paie = fields.Char(
        string='Année de Paie',
        required=True,
        default=fields.Date.today().strftime('%Y')
    )

    # Computed Totals
    montant_brut = fields.Float(
        string='Salaire Brut',
        compute='_compute_totals',
        store=True,
        digits=(16, 2)
    )
    montant_cnas_salarial = fields.Float(
        string='CNAS Salarial',
        compute='_compute_cnas',
        store=True,
        digits=(16, 2)
    )
    montant_cnas_patronal = fields.Float(
        string='CNAS Patronal',
        compute='_compute_cnas',
        store=True,
        digits=(16, 2)
    )
    montant_irg = fields.Float(
        string='IRG',
        compute='_compute_irg',
        store=True,
        digits=(16, 2)
    )
    montant_net = fields.Float(
        string='Salaire Net',
        compute='_compute_totals',
        store=True,
        digits=(16, 2)
    )
    net_en_lettres = fields.Char(
        string='Net en Lettres',
        compute='_compute_net_en_lettres'
    )

    # Gains and Retenues Lines
    gains_line_ids = fields.One2many(
        'hr.payslip.gains.line',
        'payslip_id',
        string='Lignes de Gains'
    )
    retenues_line_ids = fields.One2many(
        ' 'hr.payslip.retenues.line',
        'payslip_id',
        string='Lignes de Retenues'
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('numero_bulletin', _('Nouveau')) == _('Nouveau'):
                vals['numero_bulletin'] = self.env['ir.sequence'].next_by_code('hr.payslip.dz') or _('Nouveau')
        return super().create(vals_list)

    @api.depends('gains_line_ids.montant', 'retenues_line_ids.montant', 'montant_irg', 'montant_cnas_salarial')
    def _compute_totals(self):
        for payslip in self:
            total_gains = sum(line.montant for line in payslip.gains_line_ids)
            total_retenues = sum(line.montant for line in payslip.retenues_line_ids)
            payslip.montant_brut = total_gains
            payslip.montant_net = round(total_gains - total_retenues - payslip.montant_cnas_salarial - payslip.montant_irg, 2)

    @api.depends('employee_id', 'contract_id', 'date_from', 'date_to')
    def _compute_cnas(self):
        """Calculate CNAS contributions
        
        CNAS Rates (configurable via ir.config_parameter):
        
        Part Salariale:
        - Vieillesse: 5%
        - Survivorat: 2%
        - Maladie: 1.5%
        - Chômage: 1%
        Total Salarial: ~9.5%
        
        Part Patronale:
        - Vieillesse: 7.5%
        - Survivorat: 3%
        - Maladie: 6.5%
        - Accident Travail: variable (0.8%-5%)
        - Allocations Familiales: 5%
        Total Patronal: ~26%+
        
        Plafond: 5 × SNMG (Salaire National Minimum Garanti)
        """
        snmg_value = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.snmg_value', '20000'))
        plafond_cnass = snmg_value * 5  # 100000 DZD with SNMG=20000

        # Get rates from config
        vieillesce_sal = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_vieillesce_sal', '5'))
        survivorat_sal = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_survivorat_sal', '2'))
        maladie_sal = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_maladie_sal', '1.5'))
        chomage_sal = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_chomage_sal', '1'))

        vieillesque_pat = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_vieillesque_pat', '7.5'))
        survivorat_pat = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_survivorat_pat', '3'))
        maladie_pat = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_maladie_pat', '6.5'))
        accident_rate = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_accident', '1'))
        alloc_famille = float(self.env['ir.config_parameter'].sudo().get_param(
            'hassiba.cnas_alloc_famille', '5'))

        total_taux_sal = (vieillesce_sal + survivorat_sal + maladie_sal + chomage_sal) / 100
        total_taux_pat = (vieillesque_pat + survivorat_pat + maladie_pat + accident_rate + alloc_famille) / 100

        for payslip in self:
            if not payslip.contract_id:
                payslip.montant_cnas_salarial = 0
                payslip.montant_cnas_patronal = 0
                continue
            
            assiette = payslip.contract_id.get_assiette_cnas()
            
            # Apply plafond
            assiette_plafonnee = min(assiette, plafond_cnass)
            
            payslip.montant_cnas_salarial = round(assiette_plafonnee * total_taux_sal, 2)
            payslip.montant_cnas_patronal = round(assiette_plafonnee * total_taux_pat, 2)

    @api.depends('employee_id', 'contract_id', 'montant_brut')
    def _compute_irg(self):
        """Calculate IRG (Impôt sur Revenu Global) per Algerian tax law
        
        IRG Barème 2024 (Art 104 CIDTA):
        
        Tranche | Base Imposable     | Taux   | Déduction
        --------|---------------------|--------|----------
        0       | 0 - 30,000 DZD      | 0%     | 0
        1       | 30,001 - 50,000     | 20%    | 6,000
        2       | 50,001 - 120,000    | 30%    | 11,000
        3       | 120,001 - 170,000   | 35%    | 17,000
        4       | 170,001 - 250,000   | 40%    | 25,500
        5       | > 250,001           | 35%*    | Special (*effective rate after deduction)
        
        Family deductions (charges de famille):
        - Conjoint sans emploi: 2,500 DZD
        - Par enfant à charge: 1,250 DZD (max 4 enfants)
        - Handicap: +3,750 DZD
        - Maximum total: 10,000 DZD
        
        Rounding: Always round up to nearest dinar (math.ceil)
        """
        for payslip in self:
            if not payslip.employee_id or not payslip.contract_id:
                payslip.montant_irg = 0
                continue
            
            # Get taxable base from contract
            base_imposable = payslip.contract_id.get_assiette_irg()
            
            # Subtract family charges
            charges_famille = payslip.employee_id.total_charges_famille or 0
            
            net_imposable = base_imposable - charges_famille
            
            # Ensure minimum of 0
            net_imposable = max(net_imposable, 0)
            
            # Apply IRG barème
            irg = 0
            
            if net_imposable <= 30000:
                irg = 0
            elif net_imposable <= 50000:
                irg = (net_imposable * 0.20) - 6000
            elif net_imposable <= 120000:
                irg = (net_imposable * 0.30) - 11000
            elif net_imposable <= 170000:
                irg = (net_imposable * 0.35) - 17000
            elif net_imposable <= 250000:
                irg = (net_imposable * 0.40) - 25500
            else:
                # For income > 250k, effective rate is 35% after deduction
                irg = (net_imposable * 0.35) - 29500
            
            # Round up to nearest dinar (legal requirement)
            irg = math.ceil(irg)
            
            # Ensure non-negative
            irg = max(irg, 0)
            
            payslip.montant_irg = irg

    def _compute_net_en_lettres(self):
        """Convert net salary to words (French/Arabic)"""
        for payslip in self:
            if payslip.montant_net > 0:
                payslip.net_en_lettres = self._number_to_words(payslip.montant_net)
            else:
                payslip.net_en_lettres = ''

    def _number_to_words(self, number):
        """Simple French number to words converter"""
        units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
        teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
        tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
        
        int_part = int(number)
        dec_part = int(round((number - int_part) * 100))
        
        def convert_under_1000(n):
            if n == 0:
                return ''
            if n < 10:
                return units[n]
            if n < 20:
                return teens[n - 10]
            if n < 100:
                t, u = divmod(n, 10)
                result = tens[t]
                if u:
                    if u == 1 and t in [7, 9]:
                        result += '-et-' + units[u]
                    else:
                        result += '-' + units[u]
                return result
            h, r = divmod(n, 100)
            result = units[h] + ' cent' if h > 1 else 'cent'
            if r:
                result += ' ' + convert_under_1000(r)
            return result
        
        if int_part == 0:
            words = 'zéro'
        else:
            parts = []
            while int_part > 0:
                int_part, remainder = divmod(int_part, 1000)
                parts.insert(0, remainder)
            
            word_parts = []
            scale = ['mille', 'million', 'milliard']
            for i, part in enumerate(parts):
                if part > 0:
                    w = convert_under_1000(part)
                    if i == 0:
                        word_parts.append(w)
                    elif i == 1:
                        if part == 1:
                            word_parts.append(scale[0])
                        else:
                            word_parts.append(w + ' ' + scale[0])
                    elif len(scale) > i - 1:
                        word_parts.append(w + ' ' + scale[i - 1])
            
            words = ' '.join(word_parts).capitalize()
        
        return f'{words} Dinars Algériens et {dec_part} Centimes'

    def get_bulletin_data(self):
        """Return complete data dict for report rendering"""
        self.ensure_one()
        return {
            'employee': {
                'name': self.employee_id.name,
                'matricule': self.employee_id.registration_number or '',
                'cnas': self.employee_id.cnas_number or '',
                'category': self.employee_id.category_professionnelle or '',
                'fonction': self.employee_id.job_title or '',
                'department': self.employee_id.department_id.name or '',
            },
            'contract': {
                'type': dict(self.contract_id._fields['type_contrat_dz'].selection).get(self.contract_id.type_contrat_dz),
                'salaire_base': self.contract_id.salaire_de_base,
                'anciennete': self.contract_id.prime_anciennete,
            },
            'bulletin': {
                'numero': self.numero_bulletin,
                'mois': dict(self._fields['mois_paie'].selection).get(self.mois_paie),
                'annee': self.annee_paie,
                'periode': f"{self.date_from.strftime('%d/%m/%Y')} au {self.date_to.strftime('%d/%m/%Y')}",
            },
            'montants': {
                'brut': self.montant_brut,
                'cnas_sal': self.montant_cnas_salarial,
                'cnas_pat': self.montant_cnas_patronal,
                'irg': self.montant_irg,
                'net': self.montant_net,
                'net_lettres': self.net_en_lettres,
            },
            'gains': [(line.libelle, line.montant) for line in self.gains_line_ids],
            'retenues': [(line.libelle, line.montant) for line in self.retenues_line_ids],
        }

    def action_compute_sheet(self):
        """Override to populate gains/retenues lines"""
        res = super(HRPayslipDZ, self).action_compute_sheet()
        
        for payslip in self:
            # Clear existing lines
            payslip.gains_line_ids.unlink()
            payslip.retenues_line_ids.unlink()
            
            if payslip.contract_id:
                c = payslip.contract_id
                
                # Create gain lines
                gains_data = [
                    ('Salaire de Base', c.salaire_de_base),
                    ("Prime d'Ancienneté", c.prime_anciennete),
                    ('Prime de Résultat', c.prime_resultat),
                    ('Prime de Logement', c.prime_logement),
                    ('Prime de Transport', c.prime_transport),
                    ('Prime de Responsabilité', c.prime_responsabilite),
                    ('Prime Zone Géographique', c.prime_zone_geographique),
                    ('Prime de Nuisance', c.prime_nuisance),
                    ('Indemnité Repas', c.indemnite_repas),
                    ('Indemnité Kilométrique', c.indemnite_kilometrique),
                    ('Allocations Familiales', c.allocation_familiale_patronale),
                    ('Autres Primes', c.autres_primes),
                ]
                
                for libelle, montant in gains_data:
                    if montant > 0:
                        payslip.gains_line_ids.create({
                            'payslip_id': payslip.id,
                            'libelle': libelle,
                            'montant': montant,
                        })
                
                # Create retenue lines
                retenues_data = [
                    ('CNAS Part Salarial', payslip.montant_cnas_salarial),
                    ('IRG', payslip.montant_irg),
                ]
                
                for libelle, montant in retenues_data:
                    if montant > 0:
                        payslip.retenues_line_ids.create({
                            'payslip_id': payslip.id,
                            'libelle': libelle,
                            'montant': montant,
                        })
        
        return res


class HRPayslipGainsLine(models.Model):
    _name = 'hr.payslip.gains.line'
    _description = 'Ligne de Gains du Bulletin de Paie'

    payslip_id = fields.Many2one('hr.payslip', ondelete='cascade', required=True)
    libelle = fields.String(string='Libellé', required=True)
    montant = fields.Float(string='Montant', digits=(16, 2), required=True)
    sequence = fields.Integer(string='Séquence', default=10)


class HRPayslipRetenuesLine(models.Model):
    _name = 'hr.payslip.retenues.line'
    _description = 'Ligne de Retenues du Bulletin de Paie'

    payslip_id = fields.Many2one('hr.payslip', ondelete='cascade', required=True)
    libelle = fields.String(string='Libellé', required=True)
    montant = fields.Float(string='Montant', digits=(16, 2), required=True)
    sequence = fields.Integer(string='Séquence', default=10)
