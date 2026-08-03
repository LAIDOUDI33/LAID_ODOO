from odoo import _, api, fields, models
from odoo.exceptions import UserError


class L10nPkEdiSroItem(models.Model):
    _name = "l10n_pk_edi.sro.item"
    _description = "Pakistan Statutory Regulatory Order Item"

    name = fields.Char()
    sro_id = fields.Many2one("l10n_pk_edi.sro", string="Statutory Regulatory Order Schedule")

    @api.constrains('name', 'sro_id')
    def _constraint_sro_item_name(self):
        groups = self._read_group(
            domain=[
                ('sro_id', 'in', self.mapped('sro_id').ids),
                ('name', 'in', self.mapped('name')),
            ],
            groupby=['name', 'sro_id'],
            aggregates=['__count'],
        )
        if any(count > 1 for _name, _sro_id, count in groups):
            raise UserError(_("Statutory Regulatory Order item names must be unique within the same Statutory Regulatory Order Schedule."))
