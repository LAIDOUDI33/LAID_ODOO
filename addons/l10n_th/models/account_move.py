from odoo import models


class AccountMove(models.Model):
    _inherit = "account.move"

    def _get_name_invoice_report(self):
        self.ensure_one()
        if self.company_id.account_fiscal_country_id.code == 'TH':
            return 'l10n_th.report_invoice_document'
        return super()._get_name_invoice_report()

    def _l10n_th_get_credit_debit_note_amounts(self):
        self.ensure_one()

        if original_move := self.reversed_entry_id:
            original_amount = original_move.amount_untaxed - sum(
                original_move.reversal_move_ids.filtered(
                    lambda move: (
                        move.state == 'posted'
                        and move.invoice_date <= self.invoice_date
                        and move != self
                    )
                ).mapped('amount_untaxed')
            )
            corrected_amount = original_amount - self.amount_untaxed

        elif 'debit_origin_id' in self._fields and (original_move := self.debit_origin_id):
            original_amount = original_move.amount_untaxed + sum(
                original_move.debit_note_ids.filtered(
                    lambda move: (
                        move.state == 'posted'
                        and move.invoice_date <= self.invoice_date
                        and move != self
                    )
                ).mapped('amount_untaxed')
            )
            corrected_amount = original_amount + self.amount_untaxed

        else:
            return []

        return [
            {
                'label': self.env._("Original Amount"),
                'amount': original_amount,
            },
            {
                'label': self.env._("Correct Amount"),
                'amount': corrected_amount,
            },
        ]
