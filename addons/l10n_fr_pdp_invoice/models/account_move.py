from datetime import date

from odoo import api, fields, models
from odoo.tools.misc import formatLang


MIN_SUPPORTED_PERIOD = date(2026, 1, 1)


class AccountMove(models.Model):
    _inherit = 'account.move'

    l10n_fr_pdp_invoice_snapshot_ids = fields.One2many(
        comodel_name='l10n_fr_pdp.invoice.snapshot',
        inverse_name='move_id',
        groups='base.group_system',
    )
    l10n_fr_pdp_late_payment_penalties_rate = fields.Float(
        string="Late Payment Penalties Rate",
        compute='_compute_l10n_fr_pdp_late_payment_penalties_rate',
        compute_sudo=True,
        digits=(16, 2),
        help="Late payment penalties rate that applied when the invoice was posted.",
    )
    l10n_fr_pdp_late_payment_penalties_period = fields.Date(
        string="Late Payment Penalties Rate Period",
        compute='_compute_l10n_fr_pdp_late_payment_penalties_rate',
        compute_sudo=True,
    )

    @api.depends(
        'l10n_fr_pdp_invoice_snapshot_ids.late_payment_penalties_rate',
        'l10n_fr_pdp_invoice_snapshot_ids.late_payment_penalties_period',
    )
    def _compute_l10n_fr_pdp_late_payment_penalties_rate(self):
        for move in self:
            snapshot = move.l10n_fr_pdp_invoice_snapshot_ids[:1]
            move.l10n_fr_pdp_late_payment_penalties_rate = (
                snapshot.late_payment_penalties_rate if snapshot else 10.0
            )
            move.l10n_fr_pdp_late_payment_penalties_period = (
                snapshot.late_payment_penalties_period if snapshot else False
            )

    def _l10n_fr_pdp_is_late_payment_penalties_applicable(self):
        self.ensure_one()
        return (
            self.is_sale_document(include_receipts=False)
            and self.company_id.l10n_fr_pdp_late_payment_penalties_applicable
        )

    def _l10n_fr_pdp_set_late_payment_penalties_snapshot(
        self,
        rate,
        period_start,
    ):
        snapshot_model = self.env['l10n_fr_pdp.invoice.snapshot'].sudo()
        snapshots = snapshot_model.search([('move_id', 'in', self.ids)])
        snapshot_vals = {
            'late_payment_penalties_rate': rate,
            'late_payment_penalties_period': period_start,
        }
        snapshots.write(snapshot_vals)

        snapshotted_move_ids = set(snapshots.move_id.ids)
        snapshots_to_create = [
            {
                'move_id': move.id,
                **snapshot_vals,
            }
            for move in self
            if move.id not in snapshotted_move_ids
        ]
        if snapshots_to_create:
            snapshot_model.create(snapshots_to_create)

    def _l10n_fr_pdp_set_late_payment_penalties_rate(self):
        applicable_moves = self.filtered(
            lambda move: (
                move.state == 'posted'
                and move._l10n_fr_pdp_is_late_payment_penalties_applicable()
            )
        )
        moves_by_company_and_period = {}
        for move in applicable_moves:
            period_start = move.company_id._l10n_fr_pdp_get_semester_start(
                move.invoice_date or move.date
            )
            if (
                period_start < MIN_SUPPORTED_PERIOD
                and move.company_id.l10n_fr_pdp_late_payment_penalties_automatic
            ):
                continue
            key = (move.company_id, period_start)
            moves_by_company_and_period.setdefault(key, self.env['account.move'])
            moves_by_company_and_period[key] |= move

        for (company, period_start), moves in moves_by_company_and_period.items():
            rate = company._l10n_fr_pdp_get_late_payment_penalties_rate(
                period_start
            )
            if rate is False:
                rate = company.l10n_fr_pdp_late_payment_penalties_rate
                moves._l10n_fr_pdp_set_late_payment_penalties_snapshot(
                    rate,
                    False,
                )
                formatted_rate = formatLang(
                    self.env,
                    rate,
                    digits=0 if rate.is_integer() else 2,
                )
                warning = self.env._(
                    "The late payment penalty rate could not be updated. "
                    "The current rate of %(rate)s%% was used. If necessary, reset "
                    "the invoice to draft and adjust the rate manually in the Accounting "
                    "settings, or contact Odoo Support.",
                    rate=formatted_rate,
                )
                for move in moves:
                    move._message_log(body=warning)
            else:
                moves._l10n_fr_pdp_set_late_payment_penalties_snapshot(
                    rate,
                    period_start,
                )

    def _post(self, soft=True):
        moves = super()._post(soft)
        moves._l10n_fr_pdp_set_late_payment_penalties_rate()
        return moves

    def _l10n_fr_pdp_get_collection_cost_note(self):
        self.ensure_one()
        return self.env._(
            "In the event of late payment, a flat-rate fee of €40 for collection "
            "costs will be charged (Articles L.441-10 and D.441-5 of the Code de commerce)."
        )

    def _l10n_fr_pdp_get_late_payment_penalty_note(self):
        self.ensure_one()
        rate = self.l10n_fr_pdp_late_payment_penalties_rate
        formatted_rate = formatLang(
            self.env,
            rate,
            digits=0 if rate.is_integer() else 2,
        )
        return self.env._(
            "Late payment penalties at an annual rate of %(rate)s%% are applied "
            "if the payment is made after the due date.",
            rate=formatted_rate,
        )

    def _l10n_fr_pdp_get_default_notes(self):
        notes = super()._l10n_fr_pdp_get_default_notes()
        if notes:
            notes['PMD'] = self._l10n_fr_pdp_get_late_payment_penalty_note()
        return notes
