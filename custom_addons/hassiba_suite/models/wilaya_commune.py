# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Geographic Data (Wilayas & Communes)

from odoo import models, fields, api, _
from sql_constraint import name


class DZWilaya(models.Model):
    _name = 'dz.wilaya'
    _description = 'Wilaya Algérienne (Département)'
    _order = 'code'

    name = fields.Char(string='Nom de la Wilaya', required=True, translate=True)
    code = fields.Char(string='Code Wilaya', required=True, size=2)
    chef_lieu = fields.Char(string='Chef-Lieu', required=True)
    code_ons = fields.Char(string='Code ONS', size=3)
    superficie_km2 = fields.Integer(string='Superficie (km²)')
    population = fields.Integer(string='Population (est.)')
    latitude = fields.Float(digits=(10, 6))
    longitude = fields.Float(digits=(10, 6))
    
    commune_ids = fields.One2many(
        'dz.commune',
        'wilaya_id',
        string='Communes'
    )
    nb_communes = fields.Integer(
        string='Nombre de Communes',
        compute='_compute_nb_communes',
        store=True
    )

    @api.depends('commune_ids')
    def _compute_nb_communes(self):
        for record in self:
            record.nb_communes = len(record.commune_ids)

    _sql_constraints = [
        ('code_unique', 'UNIQUE(code)', 'Le code Wilaya doit être unique!'),
        ('name_unique', 'UNIQUE(name)', 'Le nom de la Wilaya doit être unique!'),
    ]

    def name_get(self):
        result = []
        for record in self:
            name = f'{record.code} - {record.name}'
            result.append((record.id, name))
        return result


class DZCommune(models.Model):
    _name = 'dz.commune'
    _description = 'Commune Algérienne'
    _order = 'code'

    name = fields.Char(string='Nom de la Commune', required=True, translate=True)
    code = fields.Char(string='Code Commune', required=True, size=3)
    wilaya_id = fields.Many2one(
        'dz.wilaya',
        string='Wilaya',
        required=True,
        ondelete='cascade'
    )
    code_ons = fields.Char(string='Code ONS (Commune)', size=5)
    chef_lieu_wilaya = fields.Boolean(
        string='Chef-Lieu de Wilaya',
        default=False,
        help='Cette commune est le chef-lieu de la wilaya'
    )
    population = fields.Integer(string='Population (est.)')
    superficie_km2 = fields.Float(string='Superficie (km²)')
    
    # Full name including wilaya
    display_name_complet = fields.Char(
        string='Nom Complet',
        compute='_compute_display_name_complet'
    )

    @api.depends('name', 'wilaya_id.name')
    def _compute_display_name_complet(self):
        for record in self:
            if record.wilaya_id:
                record.display_name_complet = f'{record.name} ({record.wilaya_id.code})'
            else:
                record.display_name_complet = record.name

    _sql_constraints = [
        ('code_wilaya_unique', 'UNIQUE(code, wilaya_id)', 
         'Le code commune doit être unique par wilaya!'),
    ]

    def name_get(self):
        result = []
        for record in self:
            wilaya_code = record.wilaya_id.code if record.wilaya_id else '??'
            name = f'{record.code} - {record.name} ({wilaya_code})'
            result.append((record.id, name))
        return result
