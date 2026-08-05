# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Contract Extension

from odoo import models, fields, api, _
from datetime import date
from dateutil.relativedelta import relativedelta


class HRContractDZ(models.Model):
    _inherit = 'hr.contract'

    # Contract Types (Algerian Labor Law compliant)
    type_contrat_dz = fields.Selection([
        ('cdi', 'CDI - Contrat à Durée Indéterminée'),
        ('cdd', 'CDD - Contrat à Durée Déterminée'),
        ('cdt', 'CDT - Contrat de Travail Temporaire'),
        ('cae', 'CAE - Contrat d\'Insertion'),
        ('apprentissage', 'Contrat d\'Apprentissage'),
        ('formation', 'Contrat de Formation-emploi'),
        ('reengagement', 'Réengagement'),
        ('saisonnier', 'Travail Saisonnier'),
        ('quotite', 'Travail à Temps Partiel'),
    ], string='Type de Contrat (DZ)', default='cdi', required=True)

    # End date for fixed-term contracts
    date_fin_contrat = fields.Date(
        string='Date Fin de Contrat',
        help='Obligatoire pour les contrats CDD'
    )

    # Salary Components (Algerian Pay Structure)
    salaire_de_base = fields.Float(
        string='Salaire de Base',
        required=True,
        tracking=True,
        help='Salaire de base mensuel brut en DZD'
    )
    
    prime_anciennete = fields.Float(
        string="Prime d'Ancienneté",
        compute='_compute_prime_anciennete',
        store=True,
        readonly=False,
        help='Calculée automatiquement selon le barème légal'
    )
    
    prime_resultat = fields.Float(
        string='Prime de Résultat',
        default=0
    )
    prime_logement = fields.Float(
        string='Prime de Logement',
        default=0
    )
    prime_transport = fields.Float(
        string='Prime de Transport',
        default=0
    )
    prime_responsabilite = fields.Float(
        string='Prime de Responsabilité',
        default=0
    )
    prime_zone_geographique = fields.Float(
        string='Prime Zone Géographique',
        default=0
    )
    prime_nuisance = fields.Float(
        string='Prime de Nuisance',
        default=0
    )
    indemnite_repas = fields.Float(
        string='Indemnité de Repas',
        default=0
    )
    indemnite_kilometrique = fields.Float(
        string='Indemnité Kilométrique',
        default=0
    )
    allocation_familiale_patronale = fields.Float(
        string='Allocations Familiales (Patronal)',
        default=0
    )
    autres_primes = fields.Float(
        string='Autres Primes & Avantages',
        default=0
    )
    
    # Working Hours
    heures_semaine = fields.Integer(
        string='Heures/Semaine',
        default=39,
        help='Heures hebdomadaires (standard: 39h en Algérie)'
    )
    
    # Category for CNAS rates
    cnas_category = fields.Selection([
        ('a', 'Catégorie A - Personnel de Direction'),
        ('b', 'Catégorie B - Personnel Tampon'),
        ('c', 'Catégorie C - Ouvriers Qualifiés'),
        ('d', 'Catégorie D - Ouvriers Non-Qualifiés'),
    ], string='Catégorie CNAS', default='b')

    @api.depends('date_start', 'employee_id', 'salaire_de_base')
    def _compute_prime_anciennete(self):
        """Compute seniority bonus according to Algerian labor law
        
        Barème légal (Art 66 Loi 90-11):
        - Après 1 an: 1% du salaire
        - Après 2 ans: 2%
        - Après 3-5 ans: 3%
        - Après 6-10 ans: 5%
        - Après 11-15 ans: 7%
        - Après 16-20 ans: 10%
        - Après 21+ ans: 12%
        """
        today = date.today()
        
        for contract in self:
            if not contract.date_start or not contract.salaire_de_base:
                contract.prime_anciennete = 0
                continue
            
            start_date = fields.Date.from_string(contract.date_start)
            diff = relativedelta(today, start_date)
            years = diff.years
            
            # Determine rate based on seniority
            if years < 1:
                rate = 0
            elif years < 2:
                rate = 0.01
            elif years < 3:
                rate = 0.02
            elif years <= 5:
                rate = 0.03
            elif years <= 10:
                rate = 0.05
            elif years <= 15:
                rate = 0.07
            elif years <= 20:
                rate = 0.10
            else:
                rate = 0.12
            
            contract.prime_anciennete = round(contract.salaire_de_base * rate, 2)

    def get_total_brut(self):
        """Calculate total gross salary"""
        self.ensure_one()
        return round((
            self.salaire_de_base +
            self.prime_anciennete +
            self.prime_resultat +
            self.prime_logement +
            self.prime_transport +
            self.prime_responsabilite +
            self.prime_zone_geographique +
            self.prime_nuisance +
            self.indemnite_repas +
            self.indemnite_kilometrique +
            self.allocation_familiale_patronale +
            self.autres_primes
        ), 2)

    def get_assiette_cnas(self):
        """Get taxable base for CNAS calculations
        
        Excludes certain allowances from CNAS base
        """
        self.ensure_one()
        return round((
            self.salaire_de_base +
            self.prime_anciennete +
            self.prime_resultat +
            self.prime_logement +
            self.prime_responsabilite +
            self.autres_primes
            # Transport, repas, zone géo are usually excluded
        ), 2)

    def get_assiette_irg(self):
        """Get taxable base for IRG calculation
        
        Includes all imposable income elements
        """
        self.ensure_one()
        return round((
            self.salaire_de_base +
            self.prime_anciennete +
            self.prime_resultat +
            self.prime_logement +
            self.prime_transport +
            self.prime_responsabilite +
            self.prime_zone_geographique +
            self.prime_nuisance +
            self.indemnite_repas +
            self.indemnite_kilometrique +
            self.allocation_familiale_patronale +
            self.autres_primes
        ), 2)

    @api.onchange('type_contrat_dz')
    def _onchange_type_contrat(self):
        if self.type_contrat_dz == 'cdd' and not self.date_fin_contrat:
            return {
                'warning': {
                    'title': _('Attention'),
                    'message': _('Pour un contrat CDD, veuillez indiquer la date de fin.')
                }
            }

    @api.constrains('date_start', 'date_fin_contrat')
    def _check_dates(self):
        for record in self:
            if record.date_fin_contrat and record.date_start:
                if record.date_fin_contrat < record.date_start:
                    raise ValidationError(_('La date de fin ne peut être antérieure à la date de début.'))
