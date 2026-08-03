# Part of Odoo. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from odoo.exceptions import ValidationError
from odoo.tests import tagged

from odoo.addons.payment.tests.http_common import PaymentHttpCommon
from odoo.addons.payment_razorpay.controllers.onboarding import RazorpayController
from odoo.addons.payment_razorpay.tests.common import RazorpayCommon


@tagged("post_install", "-at_install")
class TestRazorpayOnboarding(RazorpayCommon, PaymentHttpCommon):
    def test_onboarding_authorization_error_renders_template(self):
        """Test that an error during authorization renders the generalized
        authorization error template."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(RazorpayController.OAUTH_RETURN_URL)
        params = {
            "provider_id": self.provider.id,
            "authorization_code": "dummy_auth_code",
            "csrf_token": self.csrf_token(),
        }
        with patch.object(
            type(self.provider),
            "_send_api_request",
            side_effect=ValidationError("Invalid Razorpay credentials"),
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Razorpay", response.text)
        self.assertIn("Invalid Razorpay credentials", response.text)
        self.assertIn("An error occurred while linking your Razorpay", response.text)
        self.assertIn("account with Odoo.", response.text)

    def test_onboarding_authorization_success_redirects(self):
        """Test that successful authorization redirects to the provider action form."""
        self.authenticate(self.admin_user.login, self.admin_user.password)
        url = self._build_url(RazorpayController.OAUTH_RETURN_URL)
        params = {
            "provider_id": self.provider.id,
            "authorization_code": "dummy_auth_code",
            "csrf_token": self.csrf_token(),
        }
        mock_response = {
            "expires_in": 3600,
            "razorpay_account_id": "dummy_acc_id",
            "public_token": "dummy_pub_token",
            "refresh_token": "dummy_ref_token",
            "access_token": "dummy_acc_token",
        }
        with (
            patch.object(type(self.provider), "_send_api_request", return_value=mock_response),
            patch.object(type(self.provider), "action_razorpay_create_webhook"),
        ):
            response = self._make_http_get_request(url, params=params)

        self.assertEqual(response.status_code, 200)  # requests follows redirect to 200
        action = self.env.ref("payment.action_payment_provider")
        self.assertIn(f"/odoo/action-{action.id}/{self.provider.id}", response.url)
