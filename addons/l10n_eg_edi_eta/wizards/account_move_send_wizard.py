import json

from odoo import _, models
from odoo.fields import Datetime


class AccountMoveSendWizard(models.TransientModel):
    _inherit = 'account.move.send.wizard'

    def action_send_and_print(self, allow_fallback_pdf=False):
        result_action = super().action_send_and_print(allow_fallback_pdf=allow_fallback_pdf)
        # generate e-invoice json
        einvoice_json = self.move_id._generate_l10n_eg_edi_json()
        self.env['ir.attachment'].create({
            'name': _('ETA_INVOICE_DOC_%s', self.move_id.name),
            'res_id': self.move_id.id,
            'res_model': self.move_id._name,
            'res_field': 'l10n_eg_eta_json_doc_file',
            'type': 'binary',
            'raw': json.dumps({'request': einvoice_json}).encode(),
            'mimetype': 'application/json',
        })
        self.move_id.l10n_eg_signing_time = Datetime.now()
        # sign and send invoice
        thumb_drive = self.env['l10n_eg_edi.thumb.drive'].search(
            [('user_id', '=', self.env.user.id), ('company_id', '=', self.company_id.id)]
        )
        sign_action = thumb_drive.action_sign_and_send_eta_invoice({
            self.move_id.id: {
                'invoice': einvoice_json,
                'signing_time': self.move_id.l10n_eg_signing_time,
            },
        })
        if result_action:
            sign_action['params']['next'] = result_action
        return sign_action
