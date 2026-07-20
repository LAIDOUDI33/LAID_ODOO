# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import AccessError, UserError
from odoo.fields import Command


class L10nPhDiscountPrivilegeWizard(models.TransientModel):
    _inherit = "l10n_ph.discount.privilege.wizard"

    order_id = fields.Many2one("sale.order", string="Sale Order")
    # Override move_id to be not required, since the wizard can work with
    # sale orders (order_id) instead of invoices.
    move_id = fields.Many2one("account.move", required=False)
    # Override the base related company/currency with a compute that resolves
    # from either the invoice (move_id) or the sale order (order_id).
    # `related=None` is required so Odoo drops the inherited `related` and
    # uses the compute (otherwise the field keeps both and resolves to False
    # for sale orders, which have no move_id).
    company_id = fields.Many2one(
        "res.company",
        compute="_compute_l10n_ph_sale_company_currency",
        store=True,
        related=None,
    )
    currency_id = fields.Many2one(
        "res.currency",
        compute="_compute_l10n_ph_sale_company_currency",
        store=True,
        related=None,
    )

    @api.depends(
        "move_id.company_id",
        "order_id.company_id",
        "move_id.currency_id",
        "order_id.currency_id",
    )
    def _compute_l10n_ph_sale_company_currency(self):
        for wiz in self:
            wiz.company_id = (
                wiz.move_id.company_id or wiz.order_id.company_id or wiz.env.company
            )
            wiz.currency_id = (
                wiz.move_id.currency_id
                or wiz.order_id.currency_id
                or wiz.env.company.currency_id
            )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            # A wizard is always anchored to exactly one document type.
            if vals.get("move_id") and vals.get("order_id"):
                raise UserError(
                    self.env._(
                        "A discount privilege wizard cannot be anchored to both an "
                        "invoice and a sale order at the same time.",
                    ),
                )
            if "line_ids" not in vals and vals.get("order_id"):
                order = self.env["sale.order"].browse(vals["order_id"])
                vals["line_ids"] = [
                    Command.create({"sale_order_line_id": line.id})
                    for line in order.order_line
                    if not line.display_type
                ]
                # Pre-set company/currency so the stored computed fields have
                # correct values available during the base create()/preview flow.
                vals["company_id"] = order.company_id.id
                vals["currency_id"] = order.currency_id.id
        # Transient models skip ir.model.access enforcement, so we must guard
        # access explicitly: only users who may read discount privileges may open
        # the wizard. Configuring (creating/editing) privilege definitions still
        # requires the dedicated Accounting group (enforced on the model itself).
        if not self.env["l10n_ph.discount.privilege"].has_access("read"):
            raise AccessError(
                self.env._(
                    "You are not allowed to apply discount privileges. Enable "
                    "\"Discount Privileges (Sales)\" in your Sales settings or ask "
                    "an accounting administrator to grant the privilege.",
                ),
            )
        # Base create() autopopulates invoice lines and runs _recompute_line_previews().
        return super().create(vals_list)

    def _check_can_modify(self, action_label):
        self.ensure_one()
        if self.move_id:
            super()._check_can_modify(action_label)
        elif self.order_id:
            if self.order_id.state not in ("draft", "sent"):
                raise UserError(
                    self.env._(
                        "Discount privileges can only be %(action)s on draft or sent quotations.",
                        action=action_label,
                    ),
                )
        else:
            raise UserError(
                self.env._(
                    "Discount privileges can only be %(action)s on an invoice or a sale order.",
                    action=action_label,
                ),
            )

    @api.depends(
        "line_ids.invoice_line_id.product_id",
        "line_ids.invoice_line_id.product_id.categ_id",
        "line_ids.sale_order_line_id.product_id",
        "line_ids.sale_order_line_id.product_id.categ_id",
    )
    def _compute_available_filters(self):
        for wizard in self:
            products = wizard.line_ids.invoice_line_id.product_id
            products |= wizard.line_ids.sale_order_line_id.product_id
            wizard.available_product_ids = products
            wizard.available_category_ids = products.categ_id


class L10nPhDiscountPrivilegeWizardLine(models.TransientModel):
    _inherit = "l10n_ph.discount.privilege.wizard.line"

    sale_order_line_id = fields.Many2one(
        "sale.order.line",
        string="Sale Order Line",
    )
    # Override invoice_line_id to be not required, since the line can link
    # to a sale order line instead.
    invoice_line_id = fields.Many2one("account.move.line", required=False)
    # The base Label/Category fields are related to invoice_line_id; resolve
    # them from the actual source line (invoice or sale order) instead.
    # `related=None` drops the inherited `related` so the compute is used.
    name = fields.Char(
        compute="_compute_l10n_ph_sale_line_display", string="Label", related=None,
    )
    category_id = fields.Many2one(
        "product.category",
        compute="_compute_l10n_ph_sale_line_display",
        string="Product Category",
        related=None,
    )

    @api.depends(
        "invoice_line_id.name",
        "invoice_line_id.product_id.categ_id",
        "sale_order_line_id.name",
        "sale_order_line_id.product_id.categ_id",
    )
    def _compute_l10n_ph_sale_line_display(self):
        for line in self:
            source = line._get_line_source()
            line.name = source.name if source else False
            line.category_id = source.product_id.categ_id if source else False

    def _get_line_source(self):
        self.ensure_one()
        return self.invoice_line_id or self.sale_order_line_id
