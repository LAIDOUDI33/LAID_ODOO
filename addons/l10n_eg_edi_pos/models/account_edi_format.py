from odoo import models


class AccountEdiFormat(models.Model):
    _inherit = 'account.edi.format'

    def _get_move_applicability(self, move):
        self.ensure_one()
        if self.code == 'eg_eta' and move.sudo().pos_order_ids:
            return None
        return super()._get_move_applicability(move)
