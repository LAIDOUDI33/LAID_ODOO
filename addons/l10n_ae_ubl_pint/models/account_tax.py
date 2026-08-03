from odoo import fields, models


class AccountTax(models.Model):
    _inherit = 'account.tax'

    ubl_cii_tax_category_code = fields.Selection(
        selection_add=[('N', 'N - Margin scheme goods')],
        ondelete={'N': 'cascade'},
    )
    l10n_ae_exemption_reason_code = fields.Selection(
        string='AE Exemption Reason Code',
        selection=[
            ('DL8.46.1', 'Certain financial services'),
            ('DL8.46.2', 'Supply of residential units (lease or sale)'),
            ('DL8.46.3', 'Bare land'),
            ('DL8.46.4', 'Local passenger transport'),
        ],
    )
