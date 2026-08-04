# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


class ResCompany(models.Model):
    """
    Extension du modèle res.company pour la paie algérienne.
    
    Algerian Payroll Company Configuration
    - SMIG value configuration
    - CNAS registration info
    - Tax configuration
    """
    
    _inherit = 'res.company'
    
    # ============================================
    # SMIG / MINIMUM WAGE
    # ============================================
    
    smig_value = fields.Float(
        string='SMIG (DZD)',
        default=20000.0,
        help='الحد الأدنى للأجور - Salaire Minimum Interprofessionnel Garanti\n\nValeur actuelle: 20,000 DZD (Janvier 2024)\nHistorique:\n- 2024: 20,000 DZD\n- 2023: 20,000 DZD\n- 2019-2022: 18,000 DZD'
    )
    smag_value = fields.Float(
        string='SMAG (DZD/jour)',
        default=666.67,
        help='الحد الأدنى الزمني للأجور - Salaire Minimum Agricole Garanti\nCalcul: SMIG / 30 jours ≈ 666.67 DZD'
    )
    
    # ============================================
    # CNAS / SOCIAL SECURITY REGISTRATION
    # ============================================
    
    cnas_numero_employeur = fields.Char(
        string='N° Employeur CNAS',
        help='رقم صاحب العمل - Numéro employeur auprès de la CNAS'
    )
    cnas_etablissement_code = fields.Char(
        string='Code Établissement CNAS',
        help='رمز المنشأة - Code établissement pour déclarations CNAS'
    )
    cacobat_numero = fields.Char(
        string='N° CACOBAT',
        help='رقم صندوق البطالة - Numéro d\'affiliation CACOBAT'
    )
    
    # ============================================
    # SECTEUR D'ACTIVITÉ POUR TAUX AT
    # ============================================
    
    secteur_activite = fields.Selection([
        ('bureau', 'Bureau / Services'),
        ('commerce', 'Commerce'),
        ('industrie_legere', 'Industrie Légère'),
        ('industrie_lourde', 'Industrie Lourde'),
        ('btp', 'BTP / Travaux Publics'),
        ('transport', 'Transport'),
        ('agriculture', 'Agriculture'),
    ],
        string="Secteur d'Activité",
        default='bureau',
        help='قطاع النشاط - Secteur déterminant le taux d\'accident de travail par défaut'
    )
    
    taux_at_defaut = fields.Float(
        string="Taux Accident Travail Défaut (%)",
        compute='_compute_taux_at_defaut',
        inverse='_inverse_taux_at_defaut',
        store=True,
        help='معدل حادث العمل الافتراضي - Taux d\'accident de travail par défaut selon secteur'
    )
    
    @api.depends('secteur_activite')
    def _compute_taux_at_defaut(self):
        """Calcule le taux AT par défaut selon le secteur."""
        taux_par_secteur = {
            'bureau': 0.5,
            'commerce': 1.5,
            'industrie_legere': 2.5,
            'industrie_lourde': 4.0,
            'btp': 5.0,
            'transport': 3.0,
            'agriculture': 2.0,
        }
        for company in self:
            company.taux_at_defaut = taux_par_secteur.get(company.secteur_activite, 3.0)
    
    def _inverse_taux_at_defaut(self):
        """Permet de modifier manuellement le taux AT."""
        pass  # Stocké directement dans le champ
    
    # ============================================
    # CONFIGURATION PAIE / PAYROLL CONFIGURATION
    # ============================================
    
    bulletin_langue = fields.Selection([
        ('fr', 'Français uniquement'),
        ('ar', 'Arabe uniquement'),
        ('bilingue', 'Bilingue Français-Arabe'),
    ],
        default='bilingue',
        string='Langue Bulletin de Paie',
        help='لغة كشف الراتب - Langue d\'édition du bulletin de paie'
    )
    
    afficher_charges_patronales = fields.Boolean(
        string='Afficher Charges Patronales sur Bulletin',
        default=True,
        help='Afficher le détail des charges patronales sur le bulletin de paie'
    )
    
    generer_attestation_auto = fields.Boolean(
        string='Générer Attestation Auto',
        default=False,
        help='Générer automatiquement l\'attestation CNAS lors de la validation du bulletin'
    )
