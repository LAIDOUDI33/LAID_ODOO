# Part of Odoo. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from odoo.exceptions import ValidationError
from odoo.tests import tagged

from odoo.addons.payment.tests.http_common import PaymentHttpCommon
from odoo.addons.payment_payu import const
from odoo.addons.payment_payu.tests.common import PayuCommon


@tagged("post_install", "-at_install")
class TestPayUOnboarding(PayuCommon, PaymentHttpCommon):
    def test_onboarding_authorization_error_renders_template(self):
        """Test that an error during authorization renders the generalized
        authorization error template."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(const.OAUTH_RETURN_ROUTE)
        params = {
            "provider_id": self.provider.id,
            "auth_code": "dummy_auth_code",
            "merchant_id": "dummy_merchant_id",
            "csrf_token": self.csrf_token(),
        }
        with patch.object(
            type(self.provider),
            "_send_api_request",
            side_effect=ValidationError("Invalid PayU credentials"),
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)
        self.assertIn("PayU", response.text)
        self.assertIn("Invalid PayU credentials", response.text)
        self.assertIn("An error occurred while linking your PayU", response.text)
        self.assertIn("account with Odoo", response.text)

    def test_onboarding_authorization_success_redirects(self):
        """Test that successful authorization redirects to the provider action form."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(const.OAUTH_RETURN_ROUTE)
        params = {
            "provider_id": self.provider.id,
            "auth_code": "dummy_auth_code",
            "merchant_id": "dummy_merchant_id",
            "csrf_token": self.csrf_token(),
        }
        mock_token_response = {"access_token": "dummy_access_token"}
        mock_credentials_response = {
            "data": {"credentials": {"prod_key": "dummy_prod_key", "prod_salt": "dummy_prod_salt"}}
        }
        with patch.object(
            type(self.provider),
            "_send_api_request",
            side_effect=[mock_token_response, mock_credentials_response],
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)  # requests follows redirect to 200
        action = self.env.ref("payment.action_payment_provider")
        self.assertIn(f"/odoo/action-{action.id}/{self.provider.id}", response.url)
