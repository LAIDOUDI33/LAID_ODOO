# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models
from odoo.tools import float_round


class PosOrderReceipt(models.AbstractModel):
    _inherit = 'pos.order.receipt'

    def order_receipt_generate_data(self, basic_receipt=False):
        """Add the loyalty points summary printed on the receipt.

        The JS counterpart is ``GeneratePrinterData._generateLoyaltyReceiptData``; both must
        produce the same rows (won/spent/balance per loyalty program) so the frontend and
        backend receipts match.
        """
        data = super().order_receipt_generate_data(basic_receipt)
        loyalties = []
        histories = self.env['loyalty.history'].search([
            ('order_model', '=', 'pos.order'),
            ('order_id', '=', self.id),
        ])
        for history in histories:
            program = history.card_id.program_id
            if program.program_type != 'loyalty':
                continue
            for field, label in [('issued', _("Won:")), ('used', _("Spent:"))]:
                if history[field] > 0:
                    loyalties.append({
                        'name': program.portal_point_name,
                        'type': label,
                        'points': float_round(history[field], precision_rounding=0.01),
                    })
            loyalties.append({
                'name': program.portal_point_name,
                'type': _("Balance:"),
                'points': float_round(history.card_id.points, precision_rounding=0.01),
            })
        data['extra_data']['loyalties'] = loyalties
        return data
