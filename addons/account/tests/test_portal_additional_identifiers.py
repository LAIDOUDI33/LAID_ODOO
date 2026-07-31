# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.tests import HttpCase, tagged
from odoo.tools import mute_logger, urls

from odoo.addons.base.tests.common import BaseCommon


@tagged('-at_install', 'post_install')
class TestPortalAdditionalIdentifiers(BaseCommon, HttpCase):
    """The additional identifiers (citizen numbers, passport, ...) of the new partner
    identifiers system must be parsed, validated and saved from the checkout / portal
    address form submission.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.country_br = cls.quick_ref('base.br')
        if 'enforce_cities' in cls.env['res.country']._fields:
            # `base_address_extended` makes 'city_id' mandatory on BR addresses.
            cls.country_br.sudo().enforce_cities = False
        cls.portal_user = cls._create_new_portal_user()
        cls.partner = cls.portal_user.partner_id
        cls.default_address_values = {
            'name': 'Customer',
            'email': 'customer@example.com',
            'street': 'Av. Paulista 1000',
            'city': 'São Paulo',
            'zip': '01310-100',
            'country_id': cls.country_br.id,
            'phone': '+5511333333333',
        }
        cls.submit_url = urls.urljoin(cls.base_url(), '/my/address/submit')

    def _submit(self, values):
        payload = {k: (str(v) if isinstance(v, float) else v) for k, v in values.items()}
        return self.url_open(self.submit_url, data=payload).json()

    def _base_values(self, **extra):
        return {
            **self.default_address_values,
            'csrf_token': self.csrf_token(),
            'partner_id': self.partner.id,
            **extra,
        }

    def test_additional_identifier_saved(self):
        """A submitted additional identifier is stored in `additional_identifiers`."""
        self.authenticate(self.portal_user.login, self.portal_user.login)
        res = self._submit(self._base_values(BR_CN='39053344705'))
        self.assertEqual(res, {'redirectUrl': '/my/addresses'})
        self.assertEqual(self.partner.additional_identifiers, {'BR_CN': '39053344705'})

    def test_additional_identifier_removed(self):
        """Submitting an empty value clears a previously saved identifier."""
        self.partner.sudo().additional_identifiers = {'BR_CN': '39053344705'}
        self.authenticate(self.portal_user.login, self.portal_user.login)
        res = self._submit(self._base_values(BR_CN=''))
        self.assertEqual(res, {'redirectUrl': '/my/addresses'})
        self.assertFalse(self.partner.additional_identifiers)

    @mute_logger('odoo.http')
    def test_invalid_additional_identifier_rejected(self):
        """An invalid identifier value highlights its own input and is not saved."""
        self.authenticate(self.portal_user.login, self.portal_user.login)
        res = self._submit(self._base_values(BR_CN='not-a-cpf'))
        self.assertIn('BR_CN', res['invalid_fields'])
        self.assertFalse(self.partner.additional_identifiers)

    @mute_logger('odoo.http')
    def test_individual_identifier_conflicts_with_vat(self):
        """A citizen number cannot be combined with a VAT number."""
        self.authenticate(self.portal_user.login, self.portal_user.login)
        res = self._submit(self._base_values(
            vat='16727230000197',  # valid BR CNPJ (a company identifier)
            BR_CN='39053344705',  # an individual identifier
        ))
        self.assertIn('BR_CN', res['invalid_fields'])
