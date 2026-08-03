from odoo import fields, models
from odoo.exceptions import UserError


class AccountMove(models.Model):
    _inherit = 'account.move'

    # BOE related field
    l10n_in_boe_feature_enabled = fields.Boolean(related='company_id.l10n_in_boe_feature')

    def action_l10n_in_open_boe_wizard(self):

        if not any(self.mapped('l10n_in_boe_feature_enabled')):
            raise UserError(self.env._("The Bill of Entry feature is not enabled for your company."))

        if len(self.company_id) > 1:
            raise UserError(
                self.env._(
                    "All selected records must belong to the same company to create a Bill of Entry.",
                ),
            )

        if len(self.commercial_partner_id) > 1:
            raise UserError(
                self.env._(
                    "All selected records must belong to the same vendor to create a Bill of Entry.",
                ),
            )

        if len(self.currency_id) > 1:
            raise UserError(
                self.env._(
                    "All selected records must have same document currency to create a Bill of Entry.",
                ),
            )

        for move in self:
            if move.move_type != 'in_invoice':
                raise UserError(
                    self.env._(
                        "You can only create a Bill of Entry for Vendor Bills.",
                    ),
                )

            if move.state != 'posted':
                raise UserError(
                    self.env._(
                        "All selected records must be posted to create a Bill of Entry.",
                    ),
                )

            if move.l10n_in_gst_treatment != 'overseas':
                raise UserError(
                    self.env._(
                        "All selected bills must have their GST Treatment set to 'Overseas' to create a Bill of Entry.",
                    ),
                )

        move = self.filtered(lambda move: move.l10n_in_shipping_bill_number)[:1]
        return {
            'type': 'ir.actions.act_window',
            'name': self.env._("Create Bill Of Entry"),
            'res_model': 'l10n_in.boe.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_move_ids': self.ids,
                'default_l10n_in_shipping_bill_number': move.l10n_in_shipping_bill_number,
                'default_l10n_in_shipping_bill_date': move.l10n_in_shipping_bill_date,
                'default_l10n_in_shipping_port_code_id': move.l10n_in_shipping_port_code_id.id,
            },
        }
