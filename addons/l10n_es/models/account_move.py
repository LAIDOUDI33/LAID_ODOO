# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, api


class AccountMove(models.Model):
    _inherit = 'account.move'

    _INVOICE_TYPES_BY_USE = {
        'sale': ['F1', 'F2', 'F4'],
        'purchase': ['F1', 'F2', 'F4', 'F5', 'F6', 'LC'],
        'credit_note': ['R1', 'R2', 'R3', 'R4', 'R5'],
    }

    l10n_es_original_invoice_credited = fields.Char(string='Original Invoice Credited', store=False)

    l10n_es_invoice_type_available = fields.Char(
        string='Invoice Types Available',
        compute='_compute_l10n_es_invoice_type_available')

    l10n_es_invoice_type = fields.Selection(
        selection='l10n_es_invoice_type_selection',
        compute='_compute_l10n_es_invoice_type',
        store=True, readonly=False,
        copy=False,
        help="BOE-A-1992-28740. Law 37/1992, of 28 December, on Value "
            "Added Tax. Article 80. Modification of the taxable base.")

    l10n_es_available_regime_codes = fields.Char(
        string="Available VAT Regime Codes",
        compute="_compute_l10n_es_regime_available",
        help="Technical field to enable a dynamic selection of the field \"VAT Regime Code\"",
    )
    l10n_es_regime_code = fields.Selection(
        string="VAT Regime Code",
        selection="_l10n_es_regime_code_selection",
        compute="_compute_l10n_es_regime_codes",
        readonly=False,
        store=True,
    )
    l10n_es_regime_code_additional = fields.Selection(
        string="VAT Regime Code (Additional)",
        selection="_l10n_es_regime_code_selection",
        compute="_compute_l10n_es_regime_codes",
        readonly=False,
        store=True,
    )

    def _l10n_es_is_dua(self):
        self.ensure_one()
        return any(t.l10n_es_type == 'dua' for t in self.invoice_line_ids.tax_ids.flatten_taxes_hierarchy())

    @api.model
    def _l10n_es_refund_reason_selection(self):
        return [
            ('R1', "R1: Art. 80.1, 80.2, 80.6 and rights founded error"),
            ('R2', "R2: Art. 80.3"),
            ('R3', "R3: Art. 80.4"),
            ('R4', "R4: Art. 80 - other"),
            ('R5', "R5: Corrective invoice for simplified invoices"),
        ]

    @api.model
    def l10n_es_invoice_type_selection(self):
        return sorted([
            ('F1', 'F1 Factura'),
            ('F2', 'F2 Factura Simplificada'),
            ('F4', 'F4 Asiento Resumen de Facturas'),
            ('F5', 'F5 Importaciones (DUA)'),
            ('F6', 'F6 Justificantes Contables'),
            ('LC', 'LC Aduanas'),
            *self._l10n_es_refund_reason_selection()
        ])

    @api.depends('move_type')
    def _compute_l10n_es_invoice_type_available(self):
        for move in self:
            if move.move_type == 'out_invoice':
                move.l10n_es_invoice_type_available = ','.join(code for code in self._INVOICE_TYPES_BY_USE['sale'])
            elif move.move_type == 'in_invoice':
                move.l10n_es_invoice_type_available = ','.join(code for code in self._INVOICE_TYPES_BY_USE['purchase'])
            elif move.move_type in ('out_refund', 'in_refund'):
                move.l10n_es_invoice_type_available = ','.join(
                    code for code in self._INVOICE_TYPES_BY_USE['credit_note'])
            else:
                move.l10n_es_invoice_type_available = ''

    # 'l10n_es_invoice_type' only applies to a Spanish company's moves, and hinges on two legal
    # criteria: whether the customer is identified (has a VAT number) and whether the taxable
    # amount stays under the simplified-invoice limit. For Spanish customer invoices/refunds we
    # force the value in both directions:
    #   * no VAT and under the limit -> the move must be simplified (F2/R5);
    #   * VAT and over the limit      -> the move cannot be simplified, normalise back to F1/R4.
    # In the ambiguous middle (VAT under the limit, or no VAT over the limit) we keep whatever value
    # is already set, only picking a default (on VAT presence) when none is. When normalising *out*
    # of the simplified zone we only replace a stale simplified default (F2/R5); a deliberate
    # document type or refund reason (F4/F5/F6/LC, R1/R2/R3) is never overridden.
    #
    # This VAT+amount criterion is sale side only: it's the issuer's call to make on what they
    # send out. On the purchase side the type is whatever the supplier's own document states, so
    # we never infer it from our partner's VAT — vendor bills/refunds simply default to F1/R4,
    # with the special purchase regimes (F5 DUA, F6 REAGYP) detected from the invoice's taxes
    # instead.
    #
    # 'invoice_line_ids.price_total' is a dependency on purpose: the limit check must be
    # re-evaluated whenever the total changes, including once the move is confirmed. This is what
    # lets the type flip back from F2 to F1 when an invoice legitimately grows past the limit. It's
    # a line-level field on purpose too, rather than the move-level 'amount_total_signed': during
    # onchange (e.g. right after adding a line in the UI) that aggregate is itself derived through
    # several more compute hops and can still be stale by the time this method runs, even though
    # it's declared as one of its own dependencies — the line-level total doesn't have that issue.
    @api.depends('move_type', 'partner_id', 'invoice_line_ids.price_total',
                 'invoice_line_ids.tax_ids.l10n_es_type', 'amount_total_signed')
    def _compute_l10n_es_invoice_type(self):
        simplified_partner = self.env.ref('l10n_es.partner_simplified', raise_if_not_found=False)
        europe = self.env.ref('base.europe')
        for move in self:
            if move.state == 'posted' and move.l10n_es_invoice_type:
                continue

            if move.country_code != 'ES':
                move.l10n_es_invoice_type = False
                continue

            currency = move.currency_id or move.company_id.currency_id

            # Signals that force the move to a simplified type regardless of amount/VAT, for
            # every move type.
            explicit_simplified = (
                (not move.partner_id and move.move_type in ('in_receipt', 'out_receipt'))
                or (simplified_partner and move.partner_id == simplified_partner)
            )

            # VAT + amount-limit criterion, sale side only (see the comment on the method above).
            explicit_regular = False
            if (move.move_type in ('out_invoice', 'out_refund')
                    and move.commercial_partner_id.country_id in europe.country_ids):
                has_vat = bool(move.commercial_partner_id.vat)
                taxable_amount = sum(move.invoice_line_ids.filtered(
                    lambda line: line.display_type == 'product').mapped('price_total'))
                under_limit = currency.compare_amounts(
                    taxable_amount, move.company_id.l10n_es_simplified_invoice_limit) <= 0
                explicit_simplified = explicit_simplified or (not has_vat and under_limit)
                explicit_regular = has_vat and not under_limit

            if move.move_type in ('out_invoice', 'in_invoice'):
                if explicit_simplified:
                    move.l10n_es_invoice_type = 'F2'
                elif explicit_regular and move.l10n_es_invoice_type in (False, 'F2'):
                    move.l10n_es_invoice_type = 'F1'
                elif move.move_type == 'out_invoice' and not move.l10n_es_invoice_type:
                    move.l10n_es_invoice_type = 'F1' if move.commercial_partner_id.vat else 'F2'
                elif move.move_type == 'in_invoice' and not move.l10n_es_invoice_type:
                    move.l10n_es_invoice_type = 'F1'
                # Vendor bills under the REAGYP or DUA regimes must be classified F6/F5
                # respectively. Same guard as above: only auto-adjust while still at the generic
                # default, never override an explicit user choice.
                if move.move_type == 'in_invoice' and move.l10n_es_invoice_type in (False, 'F1'):
                    reagyp = move.invoice_line_ids.tax_ids.filtered(lambda t: t.l10n_es_type == 'sujeto_agricultura')
                    if reagyp:
                        move.l10n_es_invoice_type = 'F6'
                    elif move._l10n_es_is_dua():
                        move.l10n_es_invoice_type = 'F5'
            elif move.move_type in ('out_refund', 'in_refund'):
                if explicit_simplified:
                    move.l10n_es_invoice_type = 'R5'
                elif explicit_regular and move.l10n_es_invoice_type in (False, 'R5'):
                    move.l10n_es_invoice_type = 'R4'
                elif move.move_type == 'out_refund' and not move.l10n_es_invoice_type:
                    move.l10n_es_invoice_type = 'R4' if move.commercial_partner_id.vat else 'R5'
                elif move.move_type == 'in_refund' and not move.l10n_es_invoice_type:
                    move.l10n_es_invoice_type = 'R4'
            elif move.move_type in ('out_receipt', 'in_receipt'):
                # Receipts don't have a legal invoice type of their own; 'F2' is only kept here so
                # consumers (e.g. the VAT record books) can tell a simplified one from the rest the
                # same way they do for actual invoices, via 'l10n_es_invoice_type in (F2, R5)'.
                move.l10n_es_invoice_type = 'F2' if (
                    explicit_simplified or move.l10n_es_invoice_type in ('F2', 'R5')) else False
            else:
                move.l10n_es_invoice_type = False

    @api.depends(
        'move_type', 'invoice_line_ids.tax_ids',
        'invoice_line_ids.tax_ids.l10n_es_available_regime_codes',
    )
    def _compute_l10n_es_regime_available(self):
        for move in self:
            tax = move._l10n_es_regime_representative_tax()
            if tax:
                move.l10n_es_available_regime_codes = tax.l10n_es_available_regime_codes
            else:
                use = move._l10n_es_regime_get_use()
                valid = self.env['account.tax']._l10n_es_regime_available_codes(use, company=move.company_id)
                move.l10n_es_available_regime_codes = ','.join(valid) if valid else False

    @api.depends(
        'move_type', 'invoice_line_ids.tax_ids',
        'invoice_line_ids.tax_ids.l10n_es_regime_code',
        'company_id.l10n_es_special_vat_regime',
    )
    def _compute_l10n_es_regime_codes(self):
        for move in self:
            if move.state == 'posted' and move.l10n_es_regime_code:
                continue
            tax = move._l10n_es_regime_representative_tax()
            move.l10n_es_regime_code = tax.l10n_es_regime_code or self.env['account.tax']._l10n_es_special_vat_regime_codes(
                company=move.company_id).get(move.company_id.l10n_es_special_vat_regime, '01')

    @api.model
    def _l10n_es_regime_code_selection(self):
        # Reuse account.tax's catalog (already extended by each installed EDI module) instead of
        # duplicating it here.
        return self.env['account.tax']._l10n_es_regime_code_selection()

    def _l10n_es_regime_get_use(self):
        self.ensure_one()
        return 'sale' if self.move_type in ('out_invoice', 'out_refund') else 'purchase'

    def _l10n_es_regime_representative_tax(self):
        """
        Return the tax whose VAT regime code/applicability represents this move.

        A "recargo de equivalencia" tax always accompanies a main VAT tax on the same line rather
        than being used alone; when one is present anywhere on the move it takes priority, since
        it means the whole operation falls under that regime (e.g. VeriFactu's '18_iva'/'18_igic'
        codes) — not just the specific line it's charged on.
        """
        self.ensure_one()
        product_lines = self.invoice_line_ids.filtered(lambda line: line.display_type == 'product')
        recargo_tax = product_lines.tax_ids.filtered(lambda tax: tax.l10n_es_type == 'recargo')
        if recargo_tax:
            return recargo_tax[0]
        return next(
            (t for line in product_lines for t in line.tax_ids),
            self.env['account.tax']
        )

    def _reverse_moves(self, default_values_list=None, cancel=False):
        default_values_list = default_values_list or [{}] * len(self)
        for move, default_values in zip(self, default_values_list):
            is_simplified = move.l10n_es_invoice_type in ('F2', 'R5')
            default_values.setdefault('l10n_es_invoice_type', 'R5' if is_simplified else 'R4')
        return super()._reverse_moves(
            default_values_list=default_values_list,
            cancel=cancel,
        )
