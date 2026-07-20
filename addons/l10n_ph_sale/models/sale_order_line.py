# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.fields import Command
from odoo.tools import float_is_zero


class SaleOrderLine(models.Model):
    _inherit = ["sale.order.line", "l10n_ph.discount.privilege.line.mixin"]
    _name = "sale.order.line"

    # Keep the sale-order-line relation table name distinct from invoice lines.
    l10n_ph_original_tax_ids = fields.Many2many(
        relation="sale_order_line_l10n_ph_original_tax_rel",
    )

    # --- Model-specific hooks for the mixin ---

    def _l10n_ph_skip_discount_amounts(self):
        self.ensure_one()
        return bool(self.display_type)

    def _l10n_ph_line_qty(self):
        self.ensure_one()
        return self.product_uom_qty

    def _l10n_ph_regular_discount_reference_price(self):
        self.ensure_one()
        if self.pricelist_item_id and not self.pricelist_item_id._show_discount():
            base_price = self._get_pricelist_price_before_discount()
            if not float_is_zero(
                base_price,
                precision_rounding=self.currency_id.rounding,
            ):
                return base_price
        return super()._l10n_ph_regular_discount_reference_price()

    @api.depends(
        "product_uom_qty",
        "discount",
        "price_unit",
        "price_total",
        "product_id.lst_price",
        "tax_ids",
        "order_id.document_tax_mode",
        "l10n_ph_discount_privilege_id",
    )
    def _compute_l10n_ph_discount_amounts(self):
        super()._compute_l10n_ph_discount_amounts()

    def write(self, vals):
        # A sales order line that already carries a Discount Privilege cannot
        # have its regular discount manually overridden (the privilege defines
        # the discount). Only privilege-driven writes (wizard apply/remove) are
        # allowed, and they set the `l10n_ph_skip_privilege_lock` context.
        if (
            "discount" in vals
            and not self.env.context.get("l10n_ph_skip_privilege_lock")
        ):
            locked = self.filtered("l10n_ph_discount_privilege_id")
            if locked:
                raise UserError(
                    self.env._(
                        "You cannot modify the discount of a sales order line that has a "
                        "Discount Privilege applied. Remove the privilege first.",
                    ),
                )
        return super().write(vals)

    # --- Invoice preparation ---

    def _prepare_invoice_line(self, **optional_values):
        res = super()._prepare_invoice_line(**optional_values)
        if self.l10n_ph_discount_privilege_id:
            res.update(
                {
                    "l10n_ph_discount_privilege_id": self.l10n_ph_discount_privilege_id.id,
                    "l10n_ph_original_tax_ids": [Command.set(self.l10n_ph_original_tax_ids.ids)],
                    "l10n_ph_discount_privilege_previous_discount": self.l10n_ph_discount_privilege_previous_discount,
                    "l10n_ph_original_price_unit": self.l10n_ph_original_price_unit,
                },
            )
        return res
