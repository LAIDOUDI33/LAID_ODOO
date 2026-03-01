from odoo import _, api, fields, models
from odoo.exceptions import UserError

from odoo.addons.l10n_pk_edi.data.l10n_pk_edi_data import SALE_TYPE


class L10nPkEdiSro(models.Model):
    _name = "l10n_pk_edi.sro"
    _description = "Pakistan Statutory Regulatory Order"

    name = fields.Char(string="Statutory Regulatory Order Schedule")
    sro_item_ids = fields.One2many("l10n_pk_edi.sro.item", 'sro_id', string="Statutory Regulatory Order Items")
    l10n_pk_edi_sale_type = fields.Selection(selection=SALE_TYPE, string="Sale Type", required=True)

    @api.constrains('name', 'l10n_pk_edi_sale_type')
    def _constraint_sro_name(self):
        groups = self._read_group(
            domain=[
                ('name', 'in', self.mapped('name')),
                ('l10n_pk_edi_sale_type', 'in', self.mapped('l10n_pk_edi_sale_type')),
            ],
            groupby=['name', 'l10n_pk_edi_sale_type'],
            aggregates=['__count'],
        )
        if any(count > 1 for _name, _sale_type, count in groups):
            raise UserError(_("Statutory Regulatory Order with the same name already exist for this Sale type."))
