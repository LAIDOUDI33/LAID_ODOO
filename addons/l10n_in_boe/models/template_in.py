from odoo import models
from odoo.addons.account.models.chart_template import template


class AccountChartTemplate(models.AbstractModel):
    _inherit = 'account.chart.template'

    @template('in', 'account.account')
    def _get_in_boe_account_account(self):
        return {
            'p2140': {
                'name': self.env._("Custom Duty Account"),
                'code': '2140',
                'account_type': 'expense',
                'reconcile': False,
            },
        }
