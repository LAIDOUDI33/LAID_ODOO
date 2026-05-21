# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models
from odoo.addons.l10n_es_edi_tbai.const import TBAI_EXTRA_CODES_SALE, TBAI_EXTRA_LABELS


class AccountTax(models.Model):
    _inherit = 'account.tax'

    @api.model
    def _l10n_es_regime_code_labels(self):
        labels = super()._l10n_es_regime_code_labels()
        labels.update(TBAI_EXTRA_LABELS)
        return labels

    @api.model
    def _l10n_es_regime_available_codes(self, use, applicability=None, company=None):
        company = company or self.env.company
        codes = super()._l10n_es_regime_available_codes(use, applicability=applicability, company=company)
        if use == 'sale' and company.l10n_es_tbai_is_enabled:
            extra = self._REGIME_CODES_SII_TBAI_SALE_EXTRA + TBAI_EXTRA_CODES_SALE
            codes = codes + [code for code in extra if code not in codes]
        return codes

    @api.depends('company_id.l10n_es_tbai_is_enabled')
    def _compute_l10n_es_regime_available(self):
        super()._compute_l10n_es_regime_available()

    @api.depends('company_id.l10n_es_tbai_is_enabled')
    def _compute_l10n_es_regime_codes(self):
        super()._compute_l10n_es_regime_codes()
