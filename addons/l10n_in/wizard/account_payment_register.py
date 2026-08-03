# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models


class AccountPaymentRegister(models.TransientModel):
    _inherit = 'account.payment.register'

    @api.model
    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        if self.env.company.account_fiscal_country_id.code == 'IN' and 'withhold' in fields_list and res['withhold'] == 'withhold_pay':
            res['withhold'] = 'withhold'
        return res

    @api.depends('withhold')
    def _compute_journal_id(self):
        super()._compute_journal_id()
        for wizard in self:
            if wizard.company_id.account_fiscal_country_id.code == 'IN' and wizard.withhold == 'withhold' and wizard.company_id.l10n_in_withholding_journal_id:
                wizard.journal_id = wizard.company_id.l10n_in_withholding_journal_id
