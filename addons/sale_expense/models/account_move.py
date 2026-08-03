# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    is_linked_to_expense_with_attachment = fields.Boolean(compute='_compute_is_linked_to_expense_with_attachment')

    @api.depends('invoice_line_ids.sale_line_ids.expense_ids.attachment_ids')
    def _compute_is_linked_to_expense_with_attachment(self):
        for move in self:
            move.is_linked_to_expense_with_attachment = move.invoice_line_ids.sale_line_ids.order_id.expense_ids.attachment_ids

    def _reverse_moves(self, default_values_list=None, cancel=False):
        # EXTENDS sale
        self.expense_ids._sale_expense_reset_sol_quantities()
        return super()._reverse_moves(default_values_list, cancel)

    def button_draft(self):
        # EXTENDS sale
        self.expense_ids._sale_expense_reset_sol_quantities()
        return super().button_draft()

    def unlink(self):
        # EXTENDS sale
        self.expense_ids._sale_expense_reset_sol_quantities()
        return super().unlink()
