# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Additional Models for Tax/Payroll

from odoo import models, fields, api


class DZIRGTranche(models.Model):
    _name = 'dz.irg.tranche'
    _description = 'Tranche Barème IRG'
    _order = 'ordre'

    name = fields.Char(string='Description', required=True)
    limite_basse = fields.Float(string='Limite Basse', required=True)
    limite_haute = fields.Float(string='Limite Haute', required=True)
    taux = fields.Float(string="Taux (%)", required=True, help='Taux d\'imposition')
    deduction_fixe = fields.Float(
        string='Déduction Fixe (DZD)',
        required=True,
        help='Somme à déduire du calcul pour obtenir l\'IRG net'
    )
    ordre = fields.Integer(string='Ordre', required=True)


class DZCNASSCategory(models.Model):
    _name = 'dz.cnas.category'
    _description = 'Catégorie CNAS'

    name = fields.Char(string='Nom', required=True)
    code = fields.Char(string='Code', size=1)
    description = fields.Text(string='Description')
    taux_accident_min = fields.Float(string='Taux Accident Min (%)', default=0.8)
    taux_accident_max = fields.Float(string='Taux Accident Max (%)', default=5.0)


class DZAccidentRate(models.Model):
    _name = 'dz.accident.rate'
    _description = "Taux d'Accident de Travail"

    name = fields.String(string='Secteur d\'Activité', required=True)
    taux = fields.Float(string='Taux (%)', required=True)


class DZAllocFamiliale(models.Model):
    _name = 'dz.alloc.familiale'
    _description = 'Barème Allocations Familiales'

    name = fields.Char(string='Description', required=True)
    rang = fields.Integer(string='Rang Enfant', required=True)
    montant = fields.Float(string='Montant Mensuel (DZD)', required=True)
