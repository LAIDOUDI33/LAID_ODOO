from odoo import http
from odoo.tools.image import image_data_uri

from odoo.addons.payment.controllers.payment_status import PaymentStatus


class PosPaymentStatus(PaymentStatus):

    @http.route()
    def display_status(self, **_kwargs):
        """Override the payment status page to add specific POS behavior."""
        response = super().display_status(**_kwargs)
        monitored_tx = self._get_monitored_transaction()
        if monitored_tx and monitored_tx.pos_order_id:
            response.template = "pos_online_payment.pos_payment_status"
        return response

    def _prepare_payment_status_values(self, tx):
        values = super()._prepare_payment_status_values(tx)
        if tx and tx.pos_order_id:
            order_sudo = tx.pos_order_id  # `tx` is already sudoed by the controller.
            config_sudo = order_sudo.config_id
            values.update({
                'pos_tracking_number': order_sudo.tracking_number,
                'pos_is_restaurant': config_sudo.module_pos_restaurant,
                'pos_primary_color': config_sudo.self_ordering_primary_color,
                'pos_logo': config_sudo.logo and image_data_uri(config_sudo.logo),
                'pos_company_name': config_sudo.company_id.name,
            })
        return values
