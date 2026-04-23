# Part of Odoo. See LICENSE file for full copyright and licensing details.

import enum
import stdnum
from odoo import _, api, fields, models

from odoo.addons.l10n_ec.tools.partner_identifiers import EC_ADDITIONAL_IDENTIFIERS_METADATA


def verify_final_consumer(vat):
    return vat == '9' * 13  # final consumer is identified with 9999999999999


class PartnerIdTypeEc(enum.Enum):
    """
    Ecuadorian partner identification type/code for ATS and SRI.
    """

    IN_RUC = '01'
    IN_CEDULA = '02'
    IN_PASSPORT = '03'
    OUT_RUC = '04'
    OUT_CEDULA = '05'
    OUT_PASSPORT = '06'
    FINAL_CONSUMER = '07'
    FOREIGN = '08'

    @classmethod
    def get_ats_code_for_partner(cls, partner, move_type):
        """
        Returns ID code for move and partner based on subset of Table 2 of SRI's ATS specification
        """
        partner_id_type = partner._l10n_ec_get_identification_type()
        if partner.vat and verify_final_consumer(partner.vat):
            return cls.FINAL_CONSUMER
        elif move_type.startswith('in_'):
            return {
                'ruc': cls.IN_RUC,  # includes final consumer
                'cedula': cls.IN_CEDULA,
                'passport': cls.IN_PASSPORT,
                'foreign': cls.IN_PASSPORT,
            }.get(partner_id_type)
        elif move_type.startswith('out_'):
            return {
                'ruc': cls.OUT_RUC,  # includes final consumer
                'cedula': cls.OUT_CEDULA,
                'passport': cls.OUT_PASSPORT,
                'foreign': cls.OUT_PASSPORT,
            }.get(partner_id_type)


class ResPartner(models.Model):
    _inherit = "res.partner"

    @api.model
    def _get_all_additional_identifiers_metadata(self):
        return {**super()._get_all_additional_identifiers_metadata(), **EC_ADDITIONAL_IDENTIFIERS_METADATA}

    l10n_ec_vat_validation = fields.Char(
        string="VAT Error message validation",
        compute="_compute_l10n_ec_vat_validation",
        help="Error message when validating the Ecuadorian VAT",
    )

    @api.depends("vat", "country_id", "additional_identifiers")
    def _compute_l10n_ec_vat_validation(self):
        ruc = stdnum.util.get_cc_module("ec", "ruc")
        for partner in self:
            partner.l10n_ec_vat_validation = False
            if partner.country_code != 'EC' or not partner.vat or verify_final_consumer(partner.vat):
                continue
            if partner._get_additional_identifier('EC_DNI'):
                continue
            if not ruc.is_valid(partner.vat):
                partner.l10n_ec_vat_validation = _(
                    "The VAT %s seems to be invalid as the tenth digit doesn't comply with the validation algorithm "
                    "(SRI has stated that this validation is not required anymore for some VAT numbers)", partner.vat)

    def _l10n_ec_get_identification_type(self):
        """Maps the partner's identification to Ecuadorian ATS codes."""
        self.ensure_one()
        if self._get_additional_identifier('EC_DNI'):
            return 'cedula'
        if self._get_additional_identifier('PASSPORT'):
            return 'passport'
        if self.country_code == 'EC' and self.vat:
            return 'ruc'
        return 'foreign'
