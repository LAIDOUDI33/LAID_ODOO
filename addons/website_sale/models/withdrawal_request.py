# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.http import request as http_request

from odoo.addons.base.models.ir_qweb_fields import nl2br_enclose


class WithdrawalRequest(models.TransientModel):
    _name = "withdrawal.request"
    _description = "Withdrawal Request"
    _rec_name = "order_reference"

    email = fields.Char(string="Your Email", required=True)
    order_reference = fields.Char(string="Order Number", required=True)

    def website_form_input_filter(self, request, values):
        order_reference = values.get("order_reference")
        email = values.get("email")
        if order_reference and email:
            order = self.env["sale.order"]._find_by_reference_and_email(order_reference, email)
            if not order:
                raise UserError(
                    self.env._(
                        "We could not find any order matching this email address and order number."
                    )
                )
        return values

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for record in records:
            order = self.env["sale.order"]._find_by_reference_and_email(
                record.order_reference, record.email
            )
            if order:
                mail_values = order._send_withdrawal_request_confirmation_email()
                record.with_context(
                    withdrawal_confirmation_mail=mail_values
                )._notify_withdrawal_request(order)
                order._message_log(body=nl2br_enclose(record._build_message_fields(), "p"))
        return records

    def forbidden_fields(self):
        """Return the list of fields that should not be displayed."""
        return [
            *models.MAGIC_COLUMNS,
            "display_name",
            "model_name",
            "context",
            "website_form_signature",
        ]

    def _build_message_fields(self):
        """Build a string containing the withdrawal request fields and their values."""
        self.ensure_one()
        if not http_request:
            return ""
        fields_info = self.fields_get(attributes=["string"])
        return "\n".join([
            self.env._("Withdrawal Requested"),
            *(
                f"{fields_info[name]['string'] if name in fields_info else name}: {value}"
                for name, value in http_request.params.items()
                if name not in self.forbidden_fields() and isinstance(value, str) and value
            ),
        ])

    def _notify_withdrawal_request(self, order):
        """Notify the internal team that a withdrawal request was submitted."""
        self.ensure_one()
        recipient_email = self.env.company.email or self.env.user.email
        if not recipient_email:
            return
        template = self.env.ref("website_sale.mail_template_withdrawal_request_notification")
        order_access_link = order._notify_get_action_link(
            "view", model="sale.order", res_id=order.id
        )
        template.with_context(order_access_link=order_access_link).send_mail(
            self.id,
            force_send=True,
            email_values={
                "email_to": recipient_email,
                "email_from": self.env.company.email_formatted or self.env.user.email_formatted,
            },
        )
