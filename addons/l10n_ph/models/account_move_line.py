# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.tools import float_is_zero, frozendict


class AccountMoveLine(models.Model):
    _inherit = ["account.move.line", "l10n_ph.discount.privilege.line.mixin"]
    _name = "account.move.line"

    # Keep the base relation table name used by the l10n_ph module.
    l10n_ph_original_tax_ids = fields.Many2many(
        relation="account_move_line_l10n_ph_original_tax_rel",
    )

    # --- Model-specific hooks for the mixin ---

    def _l10n_ph_skip_discount_amounts(self):
        self.ensure_one()
        return self.display_type != "product" or not self.move_id.is_sale_document()

    def _l10n_ph_regular_discount_reference_price(self):
        self.ensure_one()
        if "sale_line_ids" in self._fields and self.sale_line_ids:
            sale_line = self.sale_line_ids[:1]
            reference_price = sale_line.price_unit
            if (
                not sale_line.discount
                and sale_line.pricelist_item_id
                and not sale_line.pricelist_item_id._show_discount()
            ):
                base_price = sale_line._get_pricelist_price_before_discount()
                if not float_is_zero(
                    base_price,
                    precision_rounding=sale_line.currency_id.rounding,
                ):
                    reference_price = base_price
            return reference_price
        return super()._l10n_ph_regular_discount_reference_price()

    @api.depends(
        "quantity",
        "discount",
        "price_unit",
        "price_total",
        "product_id.lst_price",
        "tax_ids",
        "move_id.move_type",
        "document_tax_mode",
        "l10n_ph_discount_privilege_id",
    )
    def _compute_l10n_ph_discount_amounts(self):
        super()._compute_l10n_ph_discount_amounts()

    # --- Discount allocation (invoice lines only) ---

    @api.depends(
        "l10n_ph_discount_privilege_id",
        "l10n_ph_special_discount_amount",
    )
    def _compute_discount_allocation_needed(self):
        """Override: for privilege lines, always replace super()'s output with
        entries using the privilege's account and the correct amount formula."""
        super()._compute_discount_allocation_needed()
        for line in self:
            priv = line.l10n_ph_discount_privilege_id
            if not priv:
                continue
            if not priv.account_id:
                line.discount_allocation_needed = False
                continue
            amount_currency = line.currency_id.round(
                line.move_id.direction_sign
                * (
                    line.quantity * line.price_unit * line.discount / 100
                    if priv.fiscal_position_id
                    else line.l10n_ph_special_discount_amount
                ),
            )
            amount = line.company_currency_id.round(
                amount_currency / line.currency_rate,
            )
            base_key = {
                "move_id": line.move_id._origin.id,
                "currency_rate": line.currency_rate,
            }
            line.discount_allocation_needed = [
                (
                    frozendict(account_id=line.account_id._origin.id, **base_key),
                    frozendict(
                        display_type="discount",
                        name=self.env._("Discount"),
                        amount_currency=amount_currency,
                        balance=amount,
                        analytic_distribution={},
                    ),
                ),
                (
                    frozendict(account_id=priv.account_id._origin.id, **base_key),
                    frozendict(
                        display_type="discount",
                        name=self.env._("Discount"),
                        amount_currency=-amount_currency,
                        balance=-amount,
                        analytic_distribution={},
                    ),
                ),
            ]
