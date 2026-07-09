# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class ResourceCalendar(models.Model):
    _inherit = "resource.calendar"

    associated_leaves_count = fields.Integer("Time Off Count", compute='_compute_associated_leaves_count')

    def _compute_associated_leaves_count(self):
        leaves_read_group = self.env['resource.calendar.leaves']._read_group(
            [('resource_id', '=', False), '|', ('calendar_id', 'in', self.ids), ('calendar_id', '=', False)],
            ['calendar_id', 'company_id'],
            ['__count'],
        )
        calendar_leaves = {}
        company_leaves = {}
        for calendar, company, count in leaves_read_group:
            if calendar:
                calendar_leaves[calendar.id] = calendar_leaves.get(calendar.id, 0) + count
            else:
                company_leaves[company.id] = company_leaves.get(company.id, 0) + count
        for calendar in self:
            calendar.associated_leaves_count = calendar_leaves.get(calendar.id, 0) + company_leaves.get(calendar.company_id.id, 0)
