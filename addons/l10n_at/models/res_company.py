import stdnum.at.tin
import stdnum.exceptions

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ResCompany(models.Model):
    _inherit = 'res.company'

    l10n_at_stnr = fields.Char(
        string="Steuernummer",
        help="Tax number (Steuernummer / Abgabenkontonummer). Scheme: FF-BBB/UUUUP, e.g.: 59-119/9013 https://de.wikipedia.org/wiki/Abgabenkontonummer",
        tracking=True,
    )

    def write(self, vals):
        if (
            'account_fiscal_country_id' in vals
            and (austrian_companies := self.filtered(lambda c: c.account_fiscal_country_id.code == 'AT'))
            and self.env['res.country'].browse(vals['account_fiscal_country_id']).code != 'AT'
            and self.env['account.move'].search_count([('company_id', 'in', austrian_companies.ids)], limit=1)
        ):
            raise ValidationError(_("You cannot change the fiscal country."))

        return super().write(vals)

    @api.constrains('l10n_at_stnr')
    def _validate_l10n_at_stnr(self):
        for record in self:
            record.get_l10n_at_stnr_national()

    def get_l10n_at_stnr_national(self):
        self.ensure_one()
        if self.l10n_at_stnr and self.country_code == 'AT':
            try:
                return stdnum.at.tin.validate(self.l10n_at_stnr)
            except stdnum.exceptions.ValidationError:
                raise ValidationError(_("Your company's SteuerNummer is not valid"))

        return self.l10n_at_stnr or None
