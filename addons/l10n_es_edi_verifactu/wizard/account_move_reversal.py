from odoo import models


class AccountMoveReversal(models.TransientModel):
    _inherit = 'account.move.reversal'

    def _modify_default_reverse_values(self, origin_move):
        # EXTEND 'account'
        values = super()._modify_default_reverse_values(origin_move)
        values['l10n_es_edi_verifactu_substituted_entry_id'] = origin_move.id
        # The substituting move keeps Odoo's own move_type 'out_invoice'/'out_refund', but for
        # VeriFactu it is still a corrective record (TipoRectificativa='S' distinguishes it from a
        # plain credit note's 'I') — it needs the same R4/R5 invoice type as any other correction,
        # which the base compute never assigns on its own since it never treats an 'out_invoice' as
        # a correction.
        values['l10n_es_invoice_type'] = 'R5' if origin_move.l10n_es_invoice_type in ('F2', 'R5') else 'R4'
        return values
