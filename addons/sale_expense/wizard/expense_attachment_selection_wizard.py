from odoo import api, fields, models
from odoo.exceptions import UserError


class ExpenseAttachmentSelectionWizard(models.TransientModel):
    _name = 'expense.attachment.selection.wizard'
    _description = "Attachment Selection"

    sale_order_id = fields.Many2one('sale.order')
    selected_attachments = fields.Json(
        compute='_compute_selected_attachments',
        readonly=False,
        store=True,
    )

    @api.depends('sale_order_id.expense_ids.attachment_ids')
    def _compute_selected_attachments(self):
        order2attachments = self.sale_order_id._get_attachments_not_linked_yet({order.id: order.expense_ids.attachment_ids for order in self.sale_order_id})
        for wizard in self:
            wizard.selected_attachments = [{
                'id': attachment.id,
                'name': attachment.name,
                'selected': True,
            } for attachment in order2attachments.get(wizard.sale_order_id.id, [])]

    def action_import_attachments(self):
        self.ensure_one()
        # check if user has access to selected attachments, and if all attachments are effectively linked to expenses
        attachment_ids = [attachment['id'] for attachment in self.selected_attachments if attachment['selected']]
        attachments = self.sale_order_id.expense_ids.attachment_ids.filtered(lambda a: a.id in attachment_ids)

        if not attachments:
            raise UserError(self.env._("Please select at least one attachment to import."))

        Attachment = self.env['ir.attachment'].sudo()
        post_message = self.env._("The following expense receipts were attached from reinvoiced expenses.")

        for wizard in self:
            order = wizard.sale_order_id
            attachment_vals_list = []
            for attachment in attachments:
                attachment_vals = attachment.copy_data({
                    'res_model': order._name,
                    'res_id': order.id,
                    'raw': attachment.raw,
                })[0]
                attachment_vals_list.append(attachment_vals)

            if attachment_vals_list:
                created_attachments = Attachment.create(attachment_vals_list)
                order.message_post(
                    body=post_message,
                    attachment_ids=created_attachments.ids,
                    subtype_xmlid='mail.mt_note',
                )
