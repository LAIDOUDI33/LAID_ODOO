# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Company Configuration for Algeria

from odoo import models, fields, api, _


class ResCompanyDZ(models.Model):
    _inherit = 'res.company'

    # === FISCAL IDENTIFICATION ===
    nif = fields.Char(
        string='NIF Entreprise',
        help='Numéro d\'Identification Fiscale (15 chiffres)',
        tracking=True
    )
    nis = fields.Char(
        string='NIS Entreprise',
        help='Numéro d\'Identification Statistique',
        tracking=True
    )
    rc = fields.Char(
        string='RC Entreprise',
        help='Registre du Commerce',
        tracking=True
    )
    ai = fields.Char(
        string='AI Entreprise',
        help='Article d\'Imposition',
        tracking=True
    )
    ifu = fields.Char(
        string='IFU',
        help='Identifiant Unique'
    )

    # === SOCIAL SECURITY ===
    cnas_employeur_number = fields.Char(
        string='N° Employeur CNAS',
        help='Numéro d\'affiliation employeur à la CNAS',
        tracking=True
    )
    cnas_categorie = fields.Selection([
        ('a', 'Catégorie A - Direction'),
        ('b', 'Catégorie B - Tampon'),
        ('c', 'Catégorie C - Ouvriers Qualifiés'),
        ('d', 'Catégorie D - Ouvriers Non-Qualifiés'),
    ], string='Catégorie CNAS Principale', default='b')

    # === PAYROLL PARAMETERS ===
    snmg_value = fields.Float(
        string='SNMG (DZD)',
        default=20000,
        help='Salaire National Minimum Garanti en vigueur'
    )
    jour_paiement = fields.Integer(
        string='Jour de Paiement',
        default=5,
        help='Jour du mois où les salaires sont payés'
    )

    # === TAX CONFIGURATION ===
    regime_imposition = fields.Selection([
        ('reel', 'Régime Réel'),
        ('simplifie', 'Régime Simplifié'),
        ('forfait', 'Régime Forfaitaire'),
        ('exonere', 'Exonéré'),
    ], string='Régime d\'Imposition', default='reel')
    
    periodicite_tva = fields.Selection([
        ('mensuelle', 'Mensuelle'),
        ('trimestrielle', 'Trimestrielle'),
    ], string='Périodicité TVA', default='mensuelle')
    
    centre_impots = fields.Char(
        string='Centre des Impôts',
        help='Direction des Impôts de rattachement'
    )
    inspecteur_impots = fields.Char(
        string='Inspecteur des Impôts'
    )

    # === GEOGRAPHIC ===
    wilaya_id = fields.Many2one(
        'dz.wilaya',
        string='Wilaya Siège'
    )
    commune_id = fields.Many2one(
        'dz.commune',
        string='Commune Siège',
        domain="[('wilaya_id', '=', wilaya_id)]"
    )

    # === BANK DETAILS ===
    banque_principale = fields.Char(string='Banque Principale')
    rib_principal = fields.Char(
        string='RIB Principal',
        help='Relevé d\'Identité Bancaire (20-24 chiffres)'
    )

    # === REPORTING CONFIGURATION ===
    responsable_social = fields.Many2one(
        'hr.employee',
        string='Responsable RH/Paie'
    )
    directeur_general = fields.Many2one(
        'hr.employee',
        string='Directeur Général'
    )

    @api.onchange('snmg_value')
    def _onchange_snmg(self):
        """Update system parameter when SNMG changes"""
        if self.snmg_value:
            self.env['ir.config_parameter'].sudo().set_param(
                'hassiba.snmg_value', str(self.snmg_value)
            )

    def write(self, values):
        res = super(ResCompanyDZ, self).write(values)
        
        # Sync critical values to config parameters
        if 'snmg_value' in values:
            self.env['ir.config_parameter'].sudo().set_param(
                'hassiba.snmg_value', str(values['snmg_value'])
            )
        
        return res
