# Part of Odoo. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from odoo.exceptions import ValidationError
from odoo.tests import tagged

from odoo.addons.payment.tests.http_common import PaymentHttpCommon
from odoo.addons.payment_mercado_pago import const
from odoo.addons.payment_mercado_pago.tests.common import MercadoPagoCommon


@tagged("post_install", "-at_install")
class TestMercadoPagoOnboarding(MercadoPagoCommon, PaymentHttpCommon):
    def test_onboarding_authorization_error_renders_template(self):
        """Test that an error during authorization renders the generalized
        authorization error template."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(const.OAUTH_RETURN_ROUTE)
        params = {
            "provider_id": self.provider.id,
            "authorization_code": "dummy_auth_code",
            "csrf_token": self.csrf_token(),
        }
        with patch.object(
            type(self.provider),
            "_send_api_request",
            side_effect=ValidationError("Invalid Mercado Pago credentials"),
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Mercado Pago", response.text)
        self.assertIn("Invalid Mercado Pago credentials", response.text)
        self.assertIn("An error occurred while linking your Mercado Pago", response.text)
        self.assertIn("account with Odoo.", response.text)

    def test_onboarding_authorization_success_redirects(self):
        """Test that successful authorization redirects to the provider action form."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(const.OAUTH_RETURN_ROUTE)
        params = {
            "provider_id": self.provider.id,
            "authorization_code": "dummy_auth_code",
            "csrf_token": self.csrf_token(),
        }
        mock_response = {
            "expires_in": 3600,
            "access_token": "dummy_access_token",
            "refresh_token": "dummy_refresh_token",
            "public_key": "dummy_public_key",
        }
        with (
            patch.object(type(self.provider), "_send_api_request", return_value=mock_response),
            patch.object(type(self.provider), "_inverse_mercado_pago_account_country_id"),
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)  # requests follows redirect to 200
        action = self.env.ref("payment.action_payment_provider")
        self.assertIn(f"/odoo/action-{action.id}/{self.provider.id}", response.url)
