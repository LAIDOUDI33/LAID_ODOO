# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models

from odoo.addons.base.models.ir_qweb_fields import nl2br_enclose


class WithdrawalRequest(models.TransientModel):
    _inherit = "withdrawal.request"

    project_id = fields.Many2one(
        comodel_name="project.project",
        string="Project",
        domain=[("is_template", "=", False)],
    )

    def forbidden_fields(self):
        return [*super().forbidden_fields(), "project_id"]

    def _notify_withdrawal_request(self, order):
        """Notify the internal team that a withdrawal request has been made
        by creating a task in the project.
        """
        if not self.project_id or self.project_id.id == 0:
            return super()._notify_withdrawal_request(order)
        task = self.env["project.task"].sudo().create({
            "name": self.env._(
                "Withdrawal Request %(order_reference)s", order_reference=self.order_reference,
            ),
            "project_id": self.project_id.id,
            "description": nl2br_enclose(self._build_message_fields(), "p"),
        })
        mail_values = self.env.context.get("withdrawal_confirmation_mail")
        if mail_values:
            task.message_post(
                subject=mail_values["subject"],
                body=mail_values["body"],
            )
        return task
