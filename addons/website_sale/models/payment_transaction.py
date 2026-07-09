# Part of Odoo. See LICENSE file for full copyright and licensing details.

from urllib.parse import urlencode

from markupsafe import Markup

from odoo import models


class PaymentTransaction(models.Model):
    _inherit = "payment.transaction"

    def _process(self, payment_data):
        """Override of `payment` to allow retrying if the transaction is canceled or has an error,
        by redirecting the user back to the payment page."""
        super()._process(payment_data)
        if self.sale_order_ids.website_id:
            if self.state in ["cancel", "error"]:
                default_msg = self.env._("Payment was not successful, please try again.")
                params = {
                    "payment_msg": self.state_message or default_msg,
                    "payment_msg_type": "danger",
                }
                self.landing_route = f"/shop/payment?{urlencode(params)}"
            elif self.sale_order_ids._is_awaiting_split_payment():
                params = {
                    "payment_msg": self.env._(
                        "A payment of %(formatted_amount)s has been processed. "
                        "Continue with the next payment to confirm your order.",
                        formatted_amount=self.currency_id.format(self.amount),
                    ),
                    "payment_msg_type": "success",
                }
                self.landing_route = f"/shop/payment?{urlencode(params)}"

    def _get_status_message(self, *, order=None, **kwargs):
        """Override of `payment` to add custom messages for website orders.

        :param sale.order order: The current cart linked to the transaction.
        """
        # TODO-PDA self = last tx. Does it make sense with split payments?
        # Consider if any pending and not is_paid, display the finalize your payment page on
        # shop/confirmation.
        if order and order.website_id:
            if (
                self.state == "done"
                and not order._is_paid_or_in_payment()
            ):
                return Markup("<p>%s</p>") % self.env._(
                    "Unfortunately your order cannot be confirmed as the amount of your payment"
                    " does not match the amount of your cart. Please contact the responsible of"
                    " the shop for more information."
                )
            if self.state == "pending" and self._requires_payment_instructions():
                return Markup("<p>%s</p>") % self.env._(
                    "Your order will be confirmed after payment is received."
                )
        return super()._get_status_message(order=order, **kwargs)
