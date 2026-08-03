# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.fields import Domain


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    expense_ids = fields.One2many(
        comodel_name='hr.expense',
        inverse_name='sale_order_id',
        string='Expenses',
        #TODO can delete domain ?
        #domain=[('state', 'in', ('approved', 'posted', 'in_payment', 'paid'))],
        readonly=True,
    )
    expense_count = fields.Integer("# of Expenses", compute='_compute_expense_count', compute_sudo=True)
    is_linked_to_expense_with_attachment = fields.Boolean(compute='_compute_is_linked_to_expense_with_attachment')

    #@api.depends('expense_ids.attachment_ids')
    def _compute_is_linked_to_expense_with_attachment(self):
        order2attachment = self._get_attachments_not_linked_yet({order.id: order.expense_ids.attachment_ids for order in self})
        for order in self:
            order.is_linked_to_expense_with_attachment = order2attachment.get(order.id, [])

    def _get_attachments_not_linked_yet(self, order2attachments):
        """
        Returns a dict specifying attachments that are not linked yet with the sale order(s) in self
        :param order2attachments: A dict with key being sale order id, and values a recordset of ir.attachment
        :return: A dict with the same structure as order2attachments
        """
        checksums = dict(self.env['ir.attachment']._read_group([
            ('res_model', 'in', self._name),
            ('res_id', 'in', self.ids),
        ], groupby=['res_id'], aggregates=['checksum:array_agg']))
        return {
            order_id: attachments.filtered(lambda a: a.checksum not in checksums.get(order_id, []))
            for order_id, attachments in order2attachments.items()
        }

    def _get_attachments_checksum_grouped_by_order(self):
        return dict(self.env['ir.attachment']._read_group([
            ('res_model', 'in', self._name),
            ('res_id', 'in', self.ids),
        ], groupby=['res_id'], aggregates=['checksum:array_agg']))

    @api.model
    def _search_display_name(self, operator, value):
        """ For expense, we want to show all sales order but only their display_name (no ir.rule applied), this is the only way to do it. """
        if (
            self.env.context.get('sale_expense_all_order')
            and self.env.user.has_group('sales_team.group_sale_salesman')
            and not self.env.user.has_group('sales_team.group_sale_salesman_all_leads')
        ):
            if operator in Domain.NEGATIVE_OPERATORS:
                return NotImplemented
            domain = super()._search_display_name(operator, value)
            company_domain = Domain('state', '=', 'sale') & Domain('company_id', 'in', self.env.companies.ids)
            query = self.sudo()._search(domain & company_domain)
            return Domain('id', 'in', query)
        return super()._search_display_name(operator, value)

    @api.depends('expense_ids')
    def _compute_expense_count(self):
        expense_data = self.env['hr.expense']._read_group(
            domain=[('sale_order_id', 'in', self.ids)],
            groupby=['sale_order_id'],
            aggregates=['__count'])
        mapped_data = {sale_order.id: count for sale_order, count in expense_data}
        for sale_order in self:
            sale_order.expense_count = mapped_data.get(sale_order.id, 0)

    def action_copy_reinvoiced_expense_receipts(self):
        self.ensure_one()
        if not self.expense_ids.attachment_ids:
            raise UserError(self.env._("No attachment found to import from linked expense(s)"))

        wizard = self.env['expense.attachment.selection.wizard'].create({
            'sale_order_id': self.id,
        })
        return {
            'type': 'ir.actions.act_window',
            'name': "Attachments Selection",
            'view_mode': 'form',
            'views': [(False, "form")],
            'res_id': wizard.id,
            'res_model': wizard._name,
            'target': 'new',
        }
