# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models
from odoo.fields import Command


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    l10n_ph_enable_discount_privilege_sale = fields.Boolean(
        string="Discount Privileges (Sales)",
        group="base.group_user",
        help="Enable Philippine SC/PWD discount privileges on sale orders for the current user. "
        "This is a per-user setting: enabling it here only grants the current user the ability "
        "to apply and remove discount privileges on quotations and sale orders. It does not grant "
        "the right to create or edit privilege definitions (that is reserved for Accounting).",
    )

    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        if "l10n_ph_enable_discount_privilege_sale" in fields_list:
            res["l10n_ph_enable_discount_privilege_sale"] = self.env.user.has_group(
                "l10n_ph_sale.group_l10n_ph_discount_privilege_sale",
            )
        return res

    def set_values(self):
        super().set_values()
        # Per-user enablement: only the current user is added to / removed from
        # the sales privilege group. This is deliberately NOT an `implied_group`
        # (which would add the group to every member of `base.group_user`), so
        # enabling it for one user does not enable it for all internal users.
        sale_group = self.env.ref("l10n_ph_sale.group_l10n_ph_discount_privilege_sale")
        user = self.env.user
        if self.l10n_ph_enable_discount_privilege_sale:
            if sale_group not in user.group_ids:
                user.write({"group_ids": [Command.link(sale_group.id)]})
        else:
            if sale_group in user.group_ids:
                user.write({"group_ids": [Command.unlink(sale_group.id)]})
