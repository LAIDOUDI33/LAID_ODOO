# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api, _

class HrEmployee(models.Model):
    """
    Extension du modèle hr.employee pour la paie algérienne.
    
    Algerian Payroll Employee Extension
    - Parts fiscales IRG
    - Situation familiale pour allocations
    - Historique CNAS
    """
    
    _inherit = 'hr.employee'
    
    # ============================================
    # INFORMATIONS FISCALES / TAX INFORMATION
    # ============================================
    
    nb_parts_fiscales = fields.Integer(
        string='Parts Fiscales IRG',
        default=1,
        help='الضرائب - Nombre de parts fiscales pour le calcul IRG:\n• 1 part: salarié célibataire\n• 2 parts: marié(e)\n• +0.5 part par enfant à charge (max 4 parts supplémentaires)\n\nExemple: Marié + 3 enfants = 4 parts'
    )
    situation_familiale = fields.Selection([
        ('celibataire', 'Célibataire / عازب'),
        ('marie', 'Marié(e) / متزوج'),
        ('divorce', 'Divorcé(ée) / مطلق'),
        ('veuf', 'Veuf(ouf) / أرمل'),
    ],
        string='Situation Familiale',
        default='celibataire',
        help='الحالة العائلية - Situation familiale pour calcul des parts fiscales et allocations'
    )
    nb_enfants_a_charge = fields.Integer(
        string='Enfants à Charge',
        default=0,
        help='عدد الأولاد تحت الكفالة - Nombre d\'enfants à charge (max 3 pour allocations familiales, illimité pour parts fiscales)\nÂge limite: 16 ans (27 ans si étudiant)'
    )
    conjoint_a_charge = fields.Boolean(
        string='Conjoint à Charge',
        default=False,
        help='الزوج تحت الكفالة - Indique si le conjoint est à charge (sans revenu propre)'
    )
    
    # ============================================
    # CNAS / SOCIAL SECURITY
    # ============================================
    
    cnas_numero_affiliation = fields.Char(
        string='N° Affiliation CNAS',
        help='رقم الانتمام - Numéro d\'affiliation CNAS/CASNOS du salarié'
    )
    cnas_date_affiliation = fields.Date(
        string='Date Affiliation CNAS',
        help='تاريخ الانتمام - Date d\'affiliation à la CNAS'
    )
    cnas_categorie = fields.Selection([
        ('A', 'Catégorie A - Cadre Supérieur'),
        ('B', 'Catégorie B - Cadre Maîtrise'),
        ('C', 'Catégorie C - Employé/Technicien'),
        ('D', 'Catégorie D - Ouvrier Exécutant'),
    ],
        string='Catégorie CNAS',
        default='C',
        help='فئة التأمينات - Catégorie de cotisation CNAS selon classification professionnelle'
    )
    
    # ============================================
    # MÉTHODES UTILITAIRES / UTILITY METHODS
    # ============================================
    
    @api.depends('situation_familiale', 'nb_enfants_a_charge', 'conjoint_a_charge')
    def _get_nb_parts_fiscales(self):
        """
        Calcule automatiquement le nombre de parts fiscales.
        
        Calculate fiscal shares automatically based on family situation.
        
        Règles:
        - Salarié: 1 part
        - Conjoint à charge: +1 part
        - Enfants à charge: +0.5 part/enfant (max 4 parts supp)
        
        Returns:
            int: Nombre total de parts fiscales
        """
        self.ensure_one()
        
        parts = 1  # Le salarié lui-même
        
        if self.conjoint_a_charge or self.situation_familiale == 'marie':
            parts += 1
        
        # Enfants: 0.5 part chacun, arrondi
        parts_enfants = min(self.nb_enfants_a_charge, 8) * 0.5  # Max 4 parts enfants
        parts += int(parts_enfants)  # Arrondi entier inférieur
        
        return max(1, parts)  # Minimum 1 part
    
    @api.onchange('situation_familiale', 'nb_enfants_a_charge', 'conjoint_a_charge')
    def _onchange_situation_familiale(self):
        """Met à jour les parts fiscales quand la situation change."""
        self.nb_parts_fiscales = self._get_nb_parts_fiscales()
    
    def get_allocations_familiales_montant(self):
        """
        Calcule le montant des allocations familiales.
        
        Calculate family allowances amount.
        
        Règles Algérie:
        - 250 DZD par enfant
        - Maximum 3 enfants (750 DZD/mois)
        - Transférées aux caisses pour embauches post-2021
        
        Returns:
            float: Montant mensuel des allocations familiales
        """
        alloc_par_enfant = 250
        max_enfants = 3
        nb_enfants = min(self.nb_enfants_a_charge or 0, max_enfants)
        
        return alloc_par_enfant * nb_enfants
