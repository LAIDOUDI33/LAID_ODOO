from odoo import models, fields


class L10n_ArEarningsScale(models.Model):
    _name = 'l10n_ar.earnings.scale'
    _description = 'l10n_ar.earnings.scale'

    name = fields.Char(required=True, translate=True)
    line_ids = fields.One2many('l10n_ar.earnings.scale.line', 'scale_id')
