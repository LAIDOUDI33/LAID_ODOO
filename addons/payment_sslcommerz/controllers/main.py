# Part of Odoo. See LICENSE file for full copyright and licensing details.

import pprint

from odoo import http
from odoo.exceptions import ValidationError
from odoo.http import request

from odoo.addons.payment.logging import get_payment_logger
from odoo.addons.payment_sslcommerz import const

_logger = get_payment_logger(__name__, const.SENSITIVE_KEYS)


class SSLCommerzController(http.Controller):
    @http.route(
        const.PAYMENT_RETURN_ROUTE,
        type="http",
        auth="public",
        methods=["GET", "POST"],
        csrf=False,
        save_session=False,
    )
    def sslcommerz_return(self, **data):
        """Process the customer redirection from SSLCOMMERZ for all payment outcomes.

        :param dict data: The payment data.
        """
        _logger.info("Handling redirection from SSLCOMMERZ with data:\n%s", pprint.pformat(data))
        self._verify_and_process(data)
        return request.redirect("/payment/status")

    @http.route(const.IPN_ROUTE, type="http", auth="public", methods=["POST"], csrf=False)
    def sslcommerz_ipn(self, **data):
        """Process the payment data sent by SSLCOMMERZ through the IPN (Instant Payment
        Notification), SSLCOMMERZ's server-to-server equivalent of a webhook.

        :param dict data: The payment data.
        :return: An empty response to acknowledge the notification.
        :rtype: str
        """
        _logger.info("Notification received from SSLCOMMERZ with data:\n%s", pprint.pformat(data))
        self._verify_and_process(data)
        return ""

    def _verify_and_process(self, data):
        """Verify the payment data and record the transaction update, if any.

        :param dict data: The payment data.
        :return: None
        """
        tx_sudo = self.env["payment.transaction"].sudo()._search_by_reference("sslcommerz", data)
        if not tx_sudo:
            return

        if val_id := data.get("val_id"):
            try:
                verified_data = tx_sudo._send_api_request(
                    "GET",
                    "/validator/api/validationserverAPI.php",
                    params={
                        "val_id": val_id,
                        "store_id": tx_sudo.provider_id.sslcommerz_store_id,
                        "store_passwd": tx_sudo.provider_id.sslcommerz_store_passwd,
                    },
                )
            except ValidationError:
                _logger.error("Unable to verify the payment data; discarding the notification.")
                return
            data.update(verified_data)
        elif data.get("status") in const.PAYMENT_STATUS_MAPPING["done"]:
            _logger.warning(
                "Preventing a success notification to update a tx received without a val_id."
            )
            return

        tx_sudo._record(data)
