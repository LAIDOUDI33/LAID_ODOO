# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request


class HrReminder(http.Controller):
    @http.route('/hr/today_work_intervals', type='jsonrpc', auth='user', readonly=True)
    def today_work_intervals(self):
        return request.env.user.employee_id._get_today_work_intervals()
