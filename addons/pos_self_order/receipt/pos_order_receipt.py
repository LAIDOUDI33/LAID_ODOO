# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models


class PosOrderReceipt(models.AbstractModel):
    _inherit = 'pos.order.receipt'
    _description = 'Point of Sale Order Receipt Generator'

    @api.model
    def get_receipt_template_for_pos_frontend(self):
        names = ['pos_self_order.DynamicQrReceipt']
        return super().get_receipt_template_for_pos_frontend() + [
            [name, self.env['ir.qweb']._get_template(name)[1]] for name in names
        ]

    def order_receipt_generate_data(self, basic_receipt=False):
        data = super().order_receipt_generate_data(basic_receipt)
        data['conditions']['from_self'] = self.source in ['mobile', 'kiosk']
        return data
