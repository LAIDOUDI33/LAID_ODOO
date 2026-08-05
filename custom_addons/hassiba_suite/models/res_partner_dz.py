# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Partner Extension

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class ResPartnerDZ(models.Model):
    _inherit = 'res.partner'

    # Algerian Fiscal Identification Fields
    nif = fields.Char(
        string='NIF',
        help='Numéro d\'Identification Fiscale (15 chiffres)',
        tracking=True
    )
    nis = fields.Char(
        string='NIS',
        help='Numéro d\'Identification Statistique',
        tracking=True
    )
    rc = fields.Char(
        string='RC',
        help='Registre du Commerce (Format: XX/NNNNNNNN/AAXX)',
        tracking=True
    )
    ai = fields.Char(
        string='AI',
        help='Article d\'Imposition',
        tracking=True
    )
    
    # Geographic Fields - Linked to Wilaya/Commune
    wilaya_id = fields.Many2one(
        'dz.wilaya',
        string='Wilaya',
        ondelete='restrict'
    )
    commune_id = fields.Many2one(
        'dz.commune',
        string='Commune',
        domain="[('wilaya_id', '=', wilaya_id)]",
        ondelete='restrict'
    )
    
    # Bank Details Algeria-specific
    bank_account_dz = fields.Char(
        string='RIB',
        help='Relevé d\'Identité Bancaire (20-24 chiffres)'
    )
    bank_name_dz = fields.Char(
        string='Banque',
        help='Nom de la banque algérienne'
    )
    
    # TVA Configuration
    tva_assujetti = fields.Boolean(
        string='Assujetti à la TVA',
        default=True
    )
    regime_tva = fields.Selection([
        ('reel', 'Régime Réel'),
        ('simplifie', 'Régime Simplifié'),
        ('forfait', 'Régime Forfaitaire'),
        ('exonere', 'Exonéré'),
        ('suspens', 'Régime Suspens'),
    ], string='Régime de TVA', default='reel')

    @api.constrains('nif')
    def _check_nif(self):
        for record in self:
            if record.nif:
                if not record.nif.isdigit() or len(record.nif) != 15:
                    raise ValidationError(_('Le NIF doit contenir exactement 15 chiffres.'))

    @api.constrains('rc')
    def _check_rc(self):
        for record in self:
            if record.rc:
                import re
                if not re.match(r'^[A-Za-z]{2}/\d{8}/[A-Za-z]{2}\d{2}$', record.rc):
                    raise ValidationError(_(
                        'Le format du RC est invalide. Format attendu: XX/NNNNNNNN/AAXX'
                    ))

    @api.constrains('bank_account_dz')
    def check_rib(self):
        for record in self:
            if record.bank_account_dz:
                rib = record.bank_account_dz.replace(' ', '')
                if not rib.isdigit() or len(rib) < 20 or len(rib) > 24:
                    raise ValidationError(_('Le RIB doit contenir entre 20 et 24 chiffres.'))

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        """Allow search by fiscal codes"""
        if args is None:
            args = []
        domain = ['|', '|', '|', '|',
            ('name', operator, name),
            ('nif', operator, name),
            ('nis', operator, name),
            ('rc', operator, name),
            ('vat', operator, name)
        ]
        return super(ResPartnerDZ, self).search(domain + args, limit=limit)

    @api.onchange('wilaya_id')
    def _onchange_wilaya(self):
        self.commune_id = False
