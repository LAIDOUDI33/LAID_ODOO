from odoo import api, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    @api.depends('pos_order_ids.l10n_eg_edi_pos_qr')
    def _compute_eta_qr_code_str(self):
        pos_moves = self.filtered('pos_order_ids')
        for move in pos_moves:
            pos_orders = move.pos_order_ids
            move.l10n_eg_qr_code = pos_orders.l10n_eg_edi_pos_qr if len(pos_orders) == 1 else False
        super(AccountMove, self - pos_moves)._compute_eta_qr_code_str()
