# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.tests import tagged

from odoo.addons.payment_payfast.tests.common import PayfastCommon


@tagged("post_install", "-at_install")
class TestPaymentProvider(PayfastCommon):
    def test_only_zar_is_a_supported_currency(self):
        supported_currencies = self.payfast._get_supported_currencies()
        self.assertTrue(supported_currencies)
        self.assertTrue(all(currency.name == "ZAR" for currency in supported_currencies))

    def test_outgoing_signature_matches_reference_value(self):
        """Test against a signature computed independently, to catch any unintended change to
        the signing algorithm (field encoding, ordering, passphrase handling, ...).

        The values are deliberately inserted out of `SIGNATURE_FIELDS_ORDER`, so that matching
        the reference value also proves the signature follows that order rather than the dict's
        insertion order."""
        values = {
            "item_name": self.reference,
            "cell_number": "+27821234567",  # Regression test for the leading '+' encoding.
            "merchant_key": self.payfast.payfast_merchant_key,
            "name_last": "Buyer",
            "m_payment_id": self.reference,
            "email_address": "norbert.buyer@example.com",
            "merchant_id": self.payfast.payfast_merchant_id,
            "notify_url": "http://localhost:8069/payment/payfast/notify",
            "amount": f"{self.amount:.2f}",
            "return_url": "http://localhost:8069/payment/payfast/return",
            "name_first": "Norbert",
            "cancel_url": "http://localhost:8069/payment/payfast/cancel",
        }
        signature = self.payfast._payfast_generate_signature(values)
        self.assertEqual(signature, "9d013e3159cf8a45847211d49d14f612")

    def test_incoming_signature_matches_reference_value(self):
        """Test against a signature computed independently, on a realistic ITN payload."""
        signature = self.payfast._payfast_generate_signature(self.notification_data, incoming=True)
        self.assertEqual(signature, self.notification_data["signature"])

    def test_build_request_url_appends_testing_param_only_in_sandbox(self):
        base_url = "https://api.payfast.co.za/subscriptions/dummy_token/adhoc"

        self.payfast.is_live = False
        self.assertEqual(
            self.payfast._build_request_url("subscriptions/dummy_token/adhoc"),
            f"{base_url}?testing=true",
        )

        self.payfast.is_live = True
        self.assertEqual(
            self.payfast._build_request_url("subscriptions/dummy_token/adhoc"), base_url
        )

    def test_build_request_headers_signs_the_request(self):
        """The signature must cover the headers merged with the JSON body, not the `testing`
        query param appended to the URL, so that its value doesn't depend on the live mode."""
        payload = {"amount": 11111, "item_name": self.reference}
        headers = self.payfast._build_request_headers(
            "POST", "subscriptions/dummy_token/adhoc", payload
        )
        self.assertEqual(
            headers["signature"],
            self.payfast._payfast_generate_api_signature({
                "merchant-id": headers["merchant-id"],
                "version": headers["version"],
                "timestamp": headers["timestamp"],
                **payload,
            }),
        )
