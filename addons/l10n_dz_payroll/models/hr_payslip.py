# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_round, float_is_zero
import logging

_logger = logging.getLogger(__name__)


class HrPayslip(models.Model):
    """
    Extension du modèle hr.payslip pour la paie algérienne.
    
    Algerian Payroll Payslip Extension
    - Calcul IRG selon barème progressif
    - Cotisations CNAS/CASNOS
    - Validation SMIG
    - Attestation CNAS
    """
    
    _inherit = 'hr.payslip'
    
    # ============================================
    # CHAMPS SUPPLÉMENTAIRES / ADDITIONAL FIELDS
    # ============================================
    
    heures_sup = fields.Float(
        string='Heures Supplémentaires 50%',
        help='ساعات إضافية - Heures supplémentaires majorées à 50% (8 premières)'
    )
    heures_sup_100 = fields.Float(
        string='Heures Supplémentaires 100%',
        help='ساعات إضافية - Heures supplémentaires majorées à 100% (au-delà de 8h)'
    )
    nb_jours_conges_pris = fields.Float(
        string='Jours de Congés Pris',
        default=0,
        help='أيام الإجازات المستحقة - Nombre de jours de congés pris sur la période'
    )
    irg_brut = fields.Float(
        string='IRG Brut',
        compute='_compute_irg_details',
        store=True,
        readonly=True,
        help='الضريبة الإجمالية قبل التخفيض - IRG avant abattement'
    )
    irg_abattement = fields.Float(
        string="Abattement IRG (40%)",
        compute='_compute_irg_details',
        store=True,
        readonly=True,
        help='الخصم الضريبي - Abattement forfaitaire de 40%'
    )
    irg_net = fields.Float(
        string='IRG Net',
        compute='_compute_irg_details',
        store=True,
        readonly=True,
        help='الضريبة الصافية - IRG après abattement'
    )
    cnas_salarial_montant = fields.Float(
        string='CNAS Salariale',
        compute='_compute_cnas_details',
        store=True,
        readonly=True,
        help='التأمينات الاجتماعية للموظف - Montant cotisation salariale CNAS'
    )
    cnas_patronal_montant = fields.Float(
        string='CNAS Patronal Total',
        compute='_compute_cnas_details',
        store=True,
        readonly=True,
        help='التأمينات الاجتماعية لصاحب العمل - Total charges patronales CNAS'
    )
    smig_value = fields.Float(
        related='contract_id.smig_value',
        string='SMIG',
        readonly=True,
        help='الحد الأدنى للأجور - Salaire Minimum Interprofessionnel Garanti'
    )
    est conforme_smig = fields.Boolean(
        string='Conforme SMIG',
        compute='_check_salaire_min',
        store=True,
        readonly=True,
        help='مطابق للحد الأدنى للأجور - Vérification conformité SMIG'
    )
    
    # ============================================
    # MÉTHODES DE CALCUL IRG / IRG COMPUTATION
    # ============================================
    
    @api.depends('line_ids', 'line_ids.amount', 'line_ids.total')
    def _compute_irg_details(self):
        """Calcul détaillé de l'IRG avec abattement."""
        for payslip in self:
            irg_brut = 0.0
            irg_abattement = 0.0
            irg_net = 0.0
            
            for line in payslip.line_ids:
                if line.code == 'IRG_RETENU':
                    irg_net = line.total
                elif line.code == 'NET_IMP_IRG':
                    base_imposable = line.total
                    # Recalculer l'abattement
                    irg_abattement = min(base_imposable * 0.40, 1500)
                    irg_brut = base_imposable
            
            payslip.irg_brut = irg_brut
            payslip.irg_abattement = irg_abattement
            payslip.irg_net = irg_net
    
    def _compute_irg_algeria(self, base_imposable, parts_fiscales=1):
        """
        Calcule l'IRG selon le barème progressif algérien.
        
        Calculate Algerian Income Tax (IRG) using progressive scale.
        
        Args:
            base_imposable (float): Base imposable avant abattement
            parts_fiscales (int): Nombre de parts fiscales (personnes à charge)
        
        Returns:
            dict: Détail du calcul IRG {
                'irg_brut': base imposable,
                'abattement': montant abattement 40%,
                'base_apres_abattement': base après abattement,
                'abattement_parts': abattement supplémentaire par parts,
                'base_finale': base finale d'imposition,
                'irg_calculé': montant IRG calculé,
                'irg_arrondi': IRG arrondi au dinar inférieur,
                'tranche_details': détail par tranche
            }
        
        Barème IRG Mensuel 2024:
        -----------------------
        Tranche 1: 0 - 22,500 DZD → 0%
        Tranche 2: 22,501 - 75,000 DZD → 10%
        Tranche 3: 75,001 - 120,000 DZD → 20%
        Tranche 4: 120,001 - 200,000 DZD → 30%
        Tranche 5: > 200,000 DZD → 35%
        
        + Abattement: 40% du salaire imposable (max 1,500 DZD/mois)
        + Parts fiscales: 5,000 DZD/part supplémentaire
        + Minimum de perception: 500 DZD
        """
        
        # Constantes du barème IRG
        ABATTEMENT_PCT = 0.40  # 40% d'abattement
        ABATTEMENT_MAX = 1500   # Maximum 1,500 DZD/mois
        VALEUR_PART = 5000      # 5,000 DZD par part fiscale
        MIN_PERCEPTION = 500    # Minimum de perception
        
        # Barème progressif (seuil, taux)
        BAREME_IRG = [
            (22500, 0.00),       # Tranche 1: 0%
            (75000, 0.10),       # Tranche 2: 10%
            (120000, 0.20),      # Tranche 3: 20%
            (200000, 0.30),      # Tranche 4: 30%
            (float('inf'), 0.35) # Tranche 5: 35%
        ]
        
        result = {
            'irg_brut': base_imposable,
            'abattement': 0.0,
            'base_apres_abattement': 0.0,
            'parts_fiscales': parts_fiscales,
            'abattement_parts': 0.0,
            'base_finale': 0.0,
            'irg_calcule': 0.0,
            'irg_arrondi': 0.0,
            'tranche_details': []
        }
        
        if base_imposable <= 0:
            return result
        
        # Étape 1: Application de l'abattement forfaitaire de 40%
        abattement = min(base_imposable * ABATTEMENT_PCT, ABATTEMENT_MAX)
        base_apres_abattement = base_imposable - abattement
        
        # Étape 2: Déduction des parts fiscales
        abattement_parts = max(0, (parts_fiscales - 1)) * VALEUR_PART
        base_finale = max(0, base_apres_abattement - abattement_parts)
        
        # Étape 3: Application du barème progressif
        irg_total = 0.0
        seuil_precedent = 0
        tranche_details = []
        
        for seuil, taux in BAREME_IRG:
            if base_finale > seuil_precedent:
                taxable_dans_tranche = min(base_finale, seuil) - seuil_precedent
                impot_tranche = taxable_dans_tranche * taux
                
                tranche_details.append({
                    'tranche': len(tranche_details) + 1,
                    'debut': seuil_precedent,
                    'fin': min(base_finale, seuil),
                    'taux': taux * 100,
                    'taxable': taxable_dans_tranche,
                    'impot': impot_tranche
                })
                
                irg_total += impot_tranche
            
            seuil_precedent = seuil
            if base_finale <= seuil:
                break
        
        # Étape 4: Arrondi au dinar inférieur (règle algérienne)
        irg_arrondi = int(irg_total)
        
        # Étape 5: Application du minimum de perception
        if irg_arrondi > 0 and irg_arrondi < MIN_PERCEPTION:
            irg_arrondi = MIN_PERCEPTION
        
        # Résultat final
        result.update({
            'abattement': round(abattement, 2),
            'base_apres_abattement': round(base_apres_abattement, 2),
            'abattement_parts': round(abattement_parts, 2),
            'base_finale': round(base_finale, 2),
            'irg_calcule': round(irg_total, 2),
            'irg_arrondi': irg_arrondi,
            'tranche_details': tranche_details
        })
        
        return result
    
    @api.model
    def get_irg_from_base(self, base_imposable, parts=1):
        """
        Méthode utilitaire pour calculer l'IRG depuis une base.
        
        Utility method to calculate IRG from a given base.
        
        Args:
            base_imposable: Base imposable
            parts: Nombre de parts fiscales
        
        Returns:
            float: Montant IRG à retenir
        """
        result = self._compute_irg_algeria(base_imposable, parts)
        return result['irg_arrondi']
    
    # ============================================
    # MÉTHODES DE CALCUL CNAS / CNAS COMPUTATION
    # ============================================
    
    @api.depends('line_ids', 'line_ids.amount', 'line_ids.total')
    def _compute_cnas_details(self):
        """Calcul détaillé des cotisations CNAS."""
        for payslip in self:
            cnas_sal = 0.0
            cnas_pat = 0.0
            
            for line in payslip.line_ids:
                # Part salariale
                if line.code == 'CNAS_SAL':
                    cnas_sal = abs(line.total)
                # Charges patronales totales
                elif line.code == 'TOT_COT_PAT':
                    cnas_pat = abs(line.total)
            
            payslip.cnas_salarial_montant = cnas_sal
            payslip.cnas_patronal_montant = cnas_pat
    
    def _compute_cnas_algeria(self, salaire_brut, taux_accident=None):
        """
        Calcule les cotisations CNAS complètes.
        
        Calculate complete CNAS social contributions.
        
        Args:
            salaire_brut (float): Salaire brut de position
            taux_accident (float): Taux accident de travail (défaut: 3%)
        
        Returns:
            dict: Détail des cotisations {
                'salaire_brut': base de calcul,
                'cnas_salarial': part salarié (9%),
                'cnas_pat_social': sécurité sociale patronale (26%),
                'cnas_pat_accident': accident travail (variable),
                'total_patronal': total charges patronales,
                'total_cotisations': total employeur + salarié
            }
        
        Taux CNAS Algérie:
        ---------------
        Salarial: 9% (Retraite + Santé)
        Patronal Sécurité Sociale: 26%
        Patronal Accident Travail: variable (0.5% à 5%, défaut 3%)
        """
        
        if taux_accident is None:
            taux_accident = self.contract_id.taux_accident_travail or 0.03
        
        # Taux de cotisation
        TAUX_CNAS_SAL = 0.09      # 9% salarial
        TAUX_CNAS_PAT_SOCIAL = 0.26  # 26% patronal sécurité sociale
        
        result = {
            'salaire_brut': salaire_brut,
            'cnas_salarial': 0.0,
            'cnas_pat_social': 0.0,
            'cnas_pat_accident': 0.0,
            'taux_accident': taux_accident * 100,
            'total_patronal': 0.0,
            'total_cotisations': 0.0
        }
        
        if salaire_brut <= 0:
            return result
        
        # Calculs
        cnas_salarial = salaire_brut * TAUX_CNAS_SAL
        cnas_pat_social = salaire_brut * TAUX_CNAS_PAT_SOCIAL
        cnas_pat_accident = salaire_brut * taux_accident
        total_patronal = cnas_pat_social + cnas_pat_accident
        total_cotisations = cnas_salarial + total_patronal
        
        result.update({
            'cnas_salarial': round(cnas_salarial, 2),
            'cnas_pat_social': round(cnas_pat_social, 2),
            'cnas_pat_accident': round(cnas_pat_accident, 2),
            'total_patronal': round(total_patronal, 2),
            'total_cotisations': round(total_cotisations, 2)
        })
        
        return result
    
    # ============================================
    # SMIG ET CONTRÔLES / MINIMUM WAGE CONTROLS
    # ============================================
    
    @api.model
    def _get_smig_value(self, date=None):
        """
        Retourne la valeur actuelle du SMIG.
        
        Get current minimum wage value (SMIG).
        
        Valeurs historiques:
        - Janvier 2024: 20,000 DZD
        - Septembre 2023: 20,000 DZD
        - 2022: 20,000 DZD
        
        Args:
            date: Date de référence (optionnel)
        
        Returns:
            float: Valeur du SMIG en DZD
        """
        # SMIG peut être configuré dans les paramètres de la société
        company = self.env.company
        smig_configured = company.smig_value
        
        if smig_configured and smig_configured > 0:
            return smig_configured
        
        # Valeur par défaut 2024
        return 20000.0
    
    @api.depends('contract_id.wage', 'contract_id.smig_value')
    def _check_salaire_min(self):
        """
        Vérifie la conformité avec le SMIG.
        
        Check compliance with minimum wage (SMIG).
        """
        for payslip in self:
            if not payslip.contract_id:
                payslip.est_conforme_smig = True
                continue
            
            smig = self._get_smig_value()
            salaire_base = payslip.contract_id.wage or 0
            
            # Le salaire doit être >= SMIG
            payslip.est_conforme_smig = salaire_base >= smig
    
    def action_check_smig_compliance(self):
        """
        Action de vérification de conformité SMIG.
        
        Check SMIG compliance action with detailed report.
        """
        self.ensure_one()
        
        smig = self._get_smig_value()
        salaire_base = self.contract_id.wage or 0
        ecart = salaire_base - smig
        est_conforme = ecart >= 0
        
        message = _("""
=== VÉRIFICATION CONFORMITÉ SMIG ===
====================================

Société: {company}
Employé: {employee}
Contrat: {contrat}
Période: {periode}

Résultat: {statut}

Détails:
--------
• SMIG en vigueur: {:,.0f} DZD
• Salaire de base: {:,.0f} DZD
• Écart: {:,.0f} DZD

{alerte}

Base légale: Arrêté ministériel fixant le SMIG à 20,000 DZD (2024)

Note: Un salaire inférieur au SMIG constitue une violation 
du Code du Travail algérien (Loi 90-11).
        """).format(
            company=self.company_id.name,
            employee=self.employee_id.name,
            contrat=self.contract_id.name or 'N/A',
            periode=self.date_to,
            statut=_('CONFORME ✓') if est_conforme else _('NON CONFORME ✗'),
            alerte='' if est_conforme else _('⚠️ ATTENTION: Le salaire est inférieur au SMIG !'),
            smig=smig,
            salaire_base=salaire_base,
            ecart=ecart
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Vérification SMIG'),
                'message': message,
                'type': 'success' if est_conforme else 'danger',
                'sticky': True,
            }
        }
    
    # ============================================
    # ATTESTATIONS ET DOCUMENTS / CERTIFICATES
    # ============================================
    
    def generate_attestation_cnas(self):
        """
        Génère l'attestation CNAS pour le salarié.
        
        Generate CNAS certificate for employee.
        
        L'attestation CNAS certifie que le salarié est affilié
        et que les cotisations sont à jour.
        """
        self.ensure_one()
        
        # Vérifier que le bulletin est confirmé
        if self.state != 'done':
            raise UserError(_("L'attestation ne peut être générée que pour un bulletin confirmé."))
        
        return {
            'type': 'ir.actions.report',
            'report_name': 'l10n_dz_payroll.report_attestation_cnas',
            'report_type': 'qweb-pdf',
            'data': {'payslip_id': self.id},
        }
    
    def generate_bulletin_paie_arabe(self):
        """
        Génère le bulletin de paie en format arabe/français bilingue.
        
        Generate bilingual Arabic/French payslip.
        """
        self.ensure_one()
        
        return {
            'type': 'ir.actions.report',
            'report_name': 'l10n_dz_payroll.bulletin_paie_bilingue',
            'report_type': 'qweb-pdf',
            'data': {'payslip_id': self.id},
        }
    
    # ============================================
    # SURCHARGES / OVERRIDES
    # ============================================
    
    def compute_sheet(self):
        """
        Surcharge du calcul du bulletin de paie.
        
        Override of payslip computation to add Algerian-specific logic.
        """
        # Appel de la méthode parente
        res = super(HrPayslip, self).compute_sheet()
        
        # Calculs spécifiques Algérie
        for payslip in self:
            # Vérification SMIG après calcul
            payslip._check_salaire_min()
            
            # Log des calculs pour audit
            _logger.info(
                "Bulletin %s - Employé %s - Net: %.2f DZD",
                payslip.number,
                payslip.employee_id.name,
                payslip.net_a_payer or 0
            )
        
        return res
    
    def action_payslip_done(self):
        """
        Surcharge de la validation du bulletin.
        
        Override of payslip validation with additional checks.
        """
        for payslip in self:
            # Vérifier la conformité SMIG avant validation
            if not payslip.est_conforme_smig:
                # Avertissement mais pas de blocage (configurable)
                _logger.warning(
                    "Bulletin %s: Salaire inférieur au SMIG!",
                    payslip.number
                )
        
        return super(HrPayslip, self).action_payslip_done()
