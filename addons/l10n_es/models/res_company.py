from odoo import fields, models


class ResCompany(models.Model):
    _inherit = 'res.company'

    l10n_es_simplified_invoice_limit = fields.Float(
        string="Simplified Invoice limit amount",
        help="Over this amount is not legally possible to create a simplified invoice",
        default=400,
    )

    l10n_es_special_vat_regime = fields.Selection(
        selection=[
            ('cash_basis', 'Cash Basis'),
            ('equivalence_surcharge', 'Equivalence Surcharge'),
            ('reagyp', 'REAGYP'),
            ('simplified', 'Simplified'),
        ]
    )
