import re

from odoo import models


def _l10n_es_cif_regex(letters=None):
    """CIF = 1 letter + 7 digits + checksum (digit or letter) (e.g., A12345674)"""
    admitted_letters = "ABCDEFGHJNPQRSUVW"
    if letters is None:
        letters = admitted_letters
    else:
        letters = letters.upper()
        invalid = set(letters) - set(admitted_letters)
        if invalid:
            raise ValueError(
                f"Lettere non valide per il CIF: {''.join(sorted(invalid))} "
                f"(ammesse: {admitted_letters})"
            )
    return re.compile(rf"[{letters}]\d{{7}}[0-9A-J]")


L10N_ES_DNI_RE = re.compile(r"\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]")  # DNI = 8 digits + checksum letter (e.g., 12345678Z)
L10N_ES_NIE_RE = re.compile(r"[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]")  # NIE = 1 letter (X/Y/Z) + 7 digits + checksum letter (e.g., X1234567L)


class ResPartner(models.Model):
    _inherit = 'res.partner'

    def _l10n_es_is_foreign(self):
        self.ensure_one()

        return self.country_id.code not in ('ES', False) or (self.vat or '').startswith("ESN")

    def _l10n_es_edi_get_partner_info(self):
        """ Used in SII and Veri*factu"""
        self.ensure_one()
        eu_country_codes = set(self.env.ref('base.europe').country_ids.mapped('code'))

        partner_info = {}
        IDOtro_ID = self.vat or 'NO_DISPONIBLE'

        if (not self.country_id or self.country_id.code == 'ES') and self.vat:
            # ES partner with VAT.
            partner_info['NIF'] = self.vat.removeprefix('ES')
            if self.env.context.get('error_1117'):
                partner_info['IDOtro'] = {'IDType': '07', 'ID': IDOtro_ID}

        elif self.country_id.code in eu_country_codes and self.vat:
            # European partner.
            partner_info['IDOtro'] = {'IDType': '02', 'ID': IDOtro_ID}
        else:
            partner_info['IDOtro'] = {'ID': IDOtro_ID}
            if self.vat:
                partner_info['IDOtro']['IDType'] = '04'
            else:
                partner_info['IDOtro']['IDType'] = '06'
            if self.country_id:
                partner_info['IDOtro']['CodigoPais'] = self.country_id.code
        return partner_info

    def _compute_is_company(self):
        """
        Determines whether the Spanish VAT corresponds to a legal entity (CIF format)
        or to an individual (DNI/NIE format).
        """
        super()._compute_is_company()
        for partner in self:
            country_code, vat_number = self._split_vat(partner.vat or '')
            if partner.commercial_partner_id != partner or country_code not in ('ES', '') or len(vat_number) != 9:
                continue
            if _l10n_es_cif_regex().fullmatch(vat_number):
                partner.is_company = True
            elif L10N_ES_DNI_RE.fullmatch(vat_number) or L10N_ES_NIE_RE.fullmatch(vat_number):
                partner.is_company = False
