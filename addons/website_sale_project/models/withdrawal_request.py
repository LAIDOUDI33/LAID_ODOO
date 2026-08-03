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
    task_id = fields.Many2one(comodel_name="project.task")

    def blacklisted_fields(self):
        return [*super().blacklisted_fields(), "project_id", "task_id"]

    def _notify_withdrawal_request(self, order):
        """Notify the internal team that a withdrawal request was submitted.

        If a project is configured, a task is also created.
        """
        if self.project_id and self.project_id.id != 0:
            self.task_id = self.env["project.task"].sudo().create({
                "name": self.env._(
                    "Withdrawal Request %(order_reference)s", order_reference=self.order_reference,
                ),
                "project_id": self.project_id.id,
                "description": nl2br_enclose(self._build_message_fields(), "p"),
            })
        super()._notify_withdrawal_request(order)

    def _log_message_on_related_records(self, order, mail_content):
        """Extend to also log the confirmation message on the created task."""
        super()._log_message_on_related_records(order, mail_content)
        if self.task_id:
            self.task_id.message_post(
                subject=mail_content["subject"],
                body=mail_content["body"],
            )
