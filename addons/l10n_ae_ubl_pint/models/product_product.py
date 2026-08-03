from odoo import fields, models

L10N_AE_GOODS_SERVICE_TYPE_SELECTION = [
    ('DL8.48.8.2', 'Electronic Devices'),
    ('DL8.48.8.1', 'Gold and Diamonds'),
    ('DL8.48.3.1', 'Crude or refined oil'),
    ('DL8.48.3.2', 'Unprocessed or processed natural gas'),
    ('DL8.48.3.3', 'Pure hydrocarbons'),
]


class ProductProduct(models.Model):
    _inherit = 'product.product'

    l10n_ae_is_good_and_service = fields.Boolean(
        string='Is Good and Service',
        copy=False,
    )
    l10n_ae_goods_service_type = fields.Selection(
        string='Goods and Service Type',
        selection=L10N_AE_GOODS_SERVICE_TYPE_SELECTION,
        copy=False,
    )
    # BTAE-13's Item classification identifier (IBT-158, HS code) for Goods and Service
    # accounting code (BTAE-17, SAC) for Services are two different UBL nodes, but Odoo has no
    # own concept of either - one field covers both, the view picks the right label per product
    # type/l10n_ae_is_good_and_service.
    l10n_ae_classification_code = fields.Char(
        string='HS / Service Accounting Code',
        copy=False,
    )
