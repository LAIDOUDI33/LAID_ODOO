# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import UserError

from odoo.addons.base.models.ir_qweb_fields import nl2br_enclose


class WithdrawalRequest(models.TransientModel):
    _name = "withdrawal.request"
    _description = "Withdrawal Request"
    _rec_name = "order_reference"

    email = fields.Char(string="Your Email", required=True)
    order_reference = fields.Char(string="Order Number", required=True)
    recipient_email = fields.Char(string="Recipient Emails")

    def website_form_input_filter(self, request, values):
        order_reference = values.get("order_reference")
        email = values.get("email")
        if order_reference and email:
            if not self.env["sale.order"]._find_by_reference_and_email(order_reference, email):
                raise UserError(
                    self.env._(
                        "We could not find any order matching this email address and order number."
                    )
                )
        values["recipient_email"] = request.params.get("recipient_email")
        values["submitted_params"] = dict(request.params)
        return values

    @api.model_create_multi
    def create(self, vals_list):
        submitted_params_list = [vals.pop("submitted_params", {}) for vals in vals_list]
        records = super().create(vals_list)
        for record, submitted_params in zip(records, submitted_params_list):
            order = self.env["sale.order"]._find_by_reference_and_email(
                record.order_reference, record.email
            )
            if order:
                record = record.with_context(withdrawal_request_params=submitted_params)
                mail_content = record._send_confirmation_customer(order)
                record._notify_withdrawal_request(order)
                record._log_message_on_related_records(order, mail_content)
                # log the withdrawal request fields and their values on the order's chatter
                order._message_log(body=nl2br_enclose(record._build_message_fields(), "p"))
        return records

    def blacklisted_fields(self):
        """Return the list of fields that should not be displayed."""
        return [
            *models.MAGIC_COLUMNS,
            "display_name",
            "model_name",
            "context",
            "website_form_signature",
            "recipient_email",
        ]

    def _send_confirmation_customer(self, order):
        """Send the withdrawal request confirmation email to the customer.

        :return: the subject and body of the message, to be logged on the
            withdrawal request's related records.
        :rtype: dict
        """
        self.ensure_one()
        template = self.env.ref("website_sale.mail_template_sale_withdrawal_request_confirmation")
        # detach the email from the record, so that it is not logged in the chatter
        template.send_mail(
            order.id,
            force_send=True,
            email_values={
                "model": False,
                "res_id": False,
                "email_to": order.partner_id.email_formatted,
            },
        )
        rendered = template._generate_template(order.ids, ["subject", "body_html"])[order.id]
        return {"subject": rendered["subject"], "body": rendered["body_html"]}

    def _notify_withdrawal_request(self, order):
        """Notify the internal team that a withdrawal request was submitted."""
        self.ensure_one()
        if recipient_email := self.recipient_email:
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

    def _log_message_on_related_records(self, order, mail_content):
        """Log the confirmation message on the withdrawal request's related records."""
        self.ensure_one()
        order.message_post(
            subject=mail_content["subject"],
            body=mail_content["body"],
            message_type="comment",
            subtype_xmlid="mail.mt_comment",
        )

    def _build_message_fields(self):
        """Build a string containing the withdrawal request fields and their values."""
        self.ensure_one()
        submitted_params = self.env.context.get("withdrawal_request_params") or {}
        fields_info = self.fields_get(attributes=["string"])
        blacklisted_fields = self.blacklisted_fields()
        return "\n".join([
            self.env._("Withdrawal Requested"),
            *(
                f"{fields_info[name]['string'] if name in fields_info else name}: {value}"
                for name, value in submitted_params.items()
                if name not in blacklisted_fields and isinstance(value, str) and value
            ),
        ])
