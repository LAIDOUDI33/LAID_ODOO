# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models

from odoo.addons.l10n_co.tools.partner_identifiers import (
    CO_ADDITIONAL_IDENTIFIERS_METADATA,
    CO_FOREIGN_ID_DIAN_CODE,
    CO_FOREIGN_VAT_DIAN_CODE,
    CO_IDENTIFIER_TO_DIAN_CODE,
)

FINAL_CONSUMER_VAT = '222222222222'  # 'Consumidor Final', the generic partner used in B2C


class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def _get_all_additional_identifiers_metadata(self):
        return {**super()._get_all_additional_identifiers_metadata(), **CO_ADDITIONAL_IDENTIFIERS_METADATA}

    l10n_co_dian_code = fields.Char(
        string='CO Identification Type Code',
        compute='_compute_l10n_co_identification',
        store=True,
        readonly=True,
    )
    l10n_co_id_number = fields.Char(
        string='CO Identification Number',
        compute='_compute_l10n_co_identification',
        store=True,
        readonly=True,
    )

    @api.depends(
        'vat', 'country_id', 'additional_identifiers',
        'commercial_partner_id.vat', 'commercial_partner_id.country_id',
        'commercial_partner_id.additional_identifiers',
    )
    def _compute_l10n_co_identification(self):
        for partner in self:
            vals = partner._get_preferred_legal_entity_identifier_vals()
            key = vals.get('key')
            if key in CO_IDENTIFIER_TO_DIAN_CODE:  # CO NIT (vat) or a CO person identifier
                dian_code = CO_IDENTIFIER_TO_DIAN_CODE[key]
            elif vals.get('category') in ('TIN', 'VAT', 'GST'):  # foreign tax id
                dian_code = CO_FOREIGN_VAT_DIAN_CODE
            elif key:  # foreign typed identifier
                dian_code = CO_FOREIGN_ID_DIAN_CODE
            else:  # no determinable identification → foreign NIT (pre-refactor default)
                dian_code = CO_FOREIGN_VAT_DIAN_CODE

            partner.l10n_co_dian_code = dian_code
            partner.l10n_co_id_number = vals.get('value', '')

    @api.depends(
        'vat', 'country_id', 'additional_identifiers',
        'commercial_partner_id.vat', 'commercial_partner_id.country_id',
        'commercial_partner_id.additional_identifiers',
    )
    def _compute_is_company(self):
        co_partners = self.filtered(lambda p: p.country_code == 'CO')
        for partner in co_partners:
            partner.is_company = partner._get_preferred_legal_entity_identifier_vals().get('key') == 'CO_NIT'
        super(ResPartner, self - co_partners)._compute_is_company()
