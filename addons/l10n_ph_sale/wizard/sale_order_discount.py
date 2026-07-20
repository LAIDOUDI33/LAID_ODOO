# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models
from odoo.fields import Command


class SaleOrderDiscount(models.TransientModel):
    _inherit = "sale.order.discount"

    def action_apply_discount(self):
        self.ensure_one()
        if self.discount_type == "sol_discount":
            # Do not override the discount on SC/PWD privileged lines: those are
            # managed exclusively by the discount privilege wizard (spec #3).
            lines = self.sale_order_id.order_line.filtered(
                lambda line: not line.l10n_ph_discount_privilege_id,
            )
            lines.write({"discount": self.discount_percentage * 100})
        else:
            self._create_discount_lines()

    def _create_discount_lines(self):
        privileged = self.sale_order_id.order_line.filtered(
            "l10n_ph_discount_privilege_id",
        )
        if not privileged:
            return super()._create_discount_lines()

        # Compute the global/amount discount only on the non-privileged lines, so
        # SC/PWD privileged lines are not consumed by (and double-discounted by) the
        # regular discount (spec #3).
        discount_product = self.with_context(
            lang=self.sale_order_id._get_lang(),
        )._get_discount_product()

        if self.discount_type == "so_discount":
            amount_type = "percent"
            amount = self.discount_percentage * 100.0
        else:  # self.discount_type == 'amount':
            amount_type = "fixed"
            amount = self.discount_amount

        order = self.sale_order_id
        AccountTax = self.env["account.tax"]
        order_lines = order.order_line.filtered(
            lambda x: not x.display_type and not x.l10n_ph_discount_privilege_id,
        )
        base_lines = [line._prepare_base_line_for_taxes_computation() for line in order_lines]
        AccountTax._add_tax_details_in_base_lines(base_lines, order.company_id)
        AccountTax._round_base_lines_tax_details(base_lines, order.company_id)

        def grouping_function(base_line):  # noqa: ARG001
            return {"product_id": discount_product}

        global_discount_base_lines = AccountTax._prepare_global_discount_lines(
            base_lines=base_lines,
            company=self.company_id,
            amount_type=amount_type,
            amount=amount,
            computation_key=f"global_discount,{self.id}",
            grouping_function=grouping_function,
        )
        order.order_line = [
            Command.create(values)
            for values in self._prepare_global_discount_so_lines(global_discount_base_lines)
        ]
        return None
