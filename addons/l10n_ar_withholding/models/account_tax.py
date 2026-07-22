from odoo import api, fields, models
from odoo.exceptions import ValidationError


class AccountTax(models.Model):
    _inherit = 'account.tax'

    l10n_ar_withholding_tax_type = fields.Selection(
        string='WTH Tax',
        selection=[
            ('earnings', 'Earnings'),
            ('earnings_scale', 'Earnings Scale'),
            ('iibb_untaxed', 'IIBB Untaxed'),
            ('iibb_total', 'IIBB Total Amount'),
        ]
    )
    l10n_ar_code = fields.Char('ARCA Code')
    l10n_ar_non_taxable_amount = fields.Float(
        string='Non Taxable Amount',
        digits='Account',
        help="Until this base amount, the tax is not applied."
    )
    l10n_ar_minimum_threshold = fields.Float(
        string="Minimum Treshold",
        help="If the calculated withholding tax amount is lower than minimum withholding threshold then it is 0.0.")
    l10n_ar_state_id = fields.Many2one(
        'res.country.state', string="Jurisdiction", ondelete='restrict', domain="[('country_id', '=?', country_id)]")
    l10n_ar_scale_id = fields.Many2one(
        comodel_name='l10n_ar.earnings.scale',
        string="Scale", help="Earnings table scale if tax type is 'Earnings Scale'."
    )

    @api.constrains('is_withholding_tax', 'l10n_ar_withholding_tax_type')
    def _check_l10n_ar_withholding_tax_type_alignment(self):
        for tax in self:
            if tax.company_id.country_code == 'AR' and tax.l10n_ar_withholding_tax_type and not tax.is_withholding_tax:
                raise ValidationError(self.env._("A tax cannot have an Argentine withholding tax type if it is not a withholding tax."))

    def _prepare_base_line_tax_repartition_grouping_key(self, base_line, base_line_grouping_key, tax_data, tax_rep_data):
        """ Override to keep withholding lines with a 0% tax.
        These lines are important for the Argentinian localization and as the withholding table is not editable,
        if they are removed, then there's no way to re-add them afterwards.
        """
        res = super()._prepare_base_line_tax_repartition_grouping_key(base_line, base_line_grouping_key, tax_data, tax_rep_data)
        record = base_line['record']
        if isinstance(record, models.Model) and record._name == "account.move.line":
            if any(tax.country_code == 'AR' and tax.is_withholding_tax for tax in record.tax_ids):
                res["__keep_zero_line"] = True
        return res

    @api.model
    def _add_tax_details_in_base_line(self, base_line, company, rounding_method=None):
        if self.env.context.get('calculate_withholding_taxes'):
            base_line['calculate_withholding_taxes'] = True
        super()._add_tax_details_in_base_line(base_line, company, rounding_method=rounding_method)
