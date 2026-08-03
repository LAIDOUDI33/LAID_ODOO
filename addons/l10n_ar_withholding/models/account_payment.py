from odoo import api, models


class AccountPayment(models.Model):
    _inherit = 'account.payment'

    @api.depends('company_id.country_code', 'withholding_line_ids.withholding_sequence_id')
    def _compute_withholding_hide_name(self):
        super()._compute_withholding_hide_name()
        for payment in self:
            if payment.company_id.country_code == 'AR':
                payment.withholding_hide_name = False
