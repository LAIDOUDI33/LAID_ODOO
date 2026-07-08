# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    on_time_rate_perc = fields.Float(string="OTD", compute="_compute_on_time_rate_perc")

    @api.depends('on_time_rate')
    def _compute_on_time_rate_perc(self):
        for po in self:
            if po.on_time_rate >= 0:
                po.on_time_rate_perc = po.on_time_rate / 100
            else:
                po.on_time_rate_perc = -1


class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    on_time_rate_perc = fields.Float(string="OTD", related="order_id.on_time_rate_perc")

    def _get_countable_rfq_qty_by_line(self):
        qty_by_line = super()._get_countable_rfq_qty_by_line()
        for lines in self.filtered('order_id.purchase_group_id').grouped(
            lambda line: line.order_id.purchase_group_id
        ).values():
            open_lines = lines.filtered(lambda line: line.order_id.state in ('draft', 'sent', 'to approve'))
            qty_by_order = {
                order: sum(qty_by_line[line] for line in order_lines)
                for order, order_lines in open_lines.grouped('order_id').items()
            }
            countable_order = max(
                qty_by_order,
                key=lambda order: (qty_by_order[order], -order.id),
                default=self.env['purchase.order'],
            )
            for line in lines:
                if line.order_id != countable_order:
                    qty_by_line[line] = 0.0
        return qty_by_line
