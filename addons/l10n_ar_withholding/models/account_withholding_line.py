import datetime
from dateutil.relativedelta import relativedelta

from odoo import api, models, Command


class AccountWithholdingLine(models.AbstractModel):
    _inherit = 'account.withholding.line'

    def _get_withholding_moves(self):
        self.ensure_one()
        if 'payment_register_id' in self._fields and self.payment_register_id:
            return self.payment_register_id.line_ids.move_id
        if 'payment_id' in self._fields and self.payment_id:
            return self.payment_id.invoice_ids
        return self.env['account.move']

    def _get_parent_amount(self):
        self.ensure_one()
        if 'payment_register_id' in self._fields and self.payment_register_id:
            reg = self.payment_register_id
            if reg.withhold == 'withhold':
                moves = self._get_withholding_moves()
                if moves:
                    return sum(moves.mapped('amount_total'))
            return reg.amount
        if 'payment_id' in self._fields and self.payment_id:
            pay = self.payment_id
            if pay.withhold == 'withhold':
                moves = self._get_withholding_moves()
                if moves:
                    return sum(moves.mapped('amount_total'))
            return pay.amount
        return 0.0

    @api.depends('tax_id')
    def _compute_base_amount(self):
        ar_lines = self.filtered(lambda l: l.company_id.country_code == 'AR' and l.tax_id.is_withholding_tax)
        for line in ar_lines:
            moves = line._get_withholding_moves()
            parent_amount = line._get_parent_amount()
            if line.tax_id.l10n_ar_withholding_tax_type == 'iibb_total':
                line.base_amount = parent_amount
            elif moves:
                total_untaxed = sum(moves.mapped('amount_untaxed'))
                total_amount = sum(moves.mapped('amount_total'))
                line.base_amount = parent_amount * total_untaxed / total_amount if total_amount else 0.0
            else:
                line.base_amount = 0.0

        super(AccountWithholdingLine, self - ar_lines)._compute_base_amount()

    @api.depends('base_amount', 'tax_id')
    def _compute_amount(self):
        ar_lines = self.filtered(lambda l: l.company_id.country_code == 'AR' and l.tax_id.is_withholding_tax)
        for line in ar_lines:
            if not line.tax_id:
                line.amount = 0.0
            else:
                line.amount = line._tax_compute_all_helper()[0]

        super(AccountWithholdingLine, self - ar_lines)._compute_amount()

    def _tax_compute_all_helper(self):
        self.ensure_one()
        # Computes the withholding tax amount provided a base and a tax
        # It is equivalent to: amount = self.base * self.tax_id.amount / 100

        parent = (
            self.payment_register_id
            if 'payment_register_id' in self._fields and self.payment_register_id
            else (self.payment_id if 'payment_id' in self._fields and self.payment_id else None)
        )
        if not parent:
            return 0.0, False, False

        payment_date = parent.payment_date if 'payment_date' in parent._fields else parent.date
        partner_id = parent.partner_id
        currency_id = parent.currency_id

        # if it is earnings withholding, then we accumulate the tax base for the period
        if self.tax_id.l10n_ar_withholding_tax_type in ['earnings', 'earnings_scale']:
            to_date = payment_date or datetime.date.today()
            from_date = to_date + relativedelta(day=1)
            # We search for the payments in the same month of the same regimen and the same code.
            domain_same_period_withholdings = [
                ('company_id', 'child_of', self.tax_id.company_id.id),
                ('parent_state', '=', 'posted'),
                ('tax_line_id.l10n_ar_code', '=', self.tax_id.l10n_ar_code),
                ('tax_line_id.l10n_ar_withholding_tax_type', 'in', ['earnings', 'earnings_scale']),
                ('partner_id', '=', partner_id.commercial_partner_id.id),
                ('date', '<=', to_date), ('date', '>=', from_date)]
            if same_period_partner_withholdings := self.env['account.move.line'].sudo()._read_group(domain_same_period_withholdings, ['partner_id'], ['balance:sum']):
                same_period_withholdings = abs(same_period_partner_withholdings[0][1])
            else:
                same_period_withholdings = 0.0
            domain_same_period_base = [
                ('company_id', 'child_of', self.tax_id.company_id.id),
                ('parent_state', '=', 'posted'),
                ('tax_ids.l10n_ar_code', '=', self.tax_id.l10n_ar_code),
                ('tax_ids.l10n_ar_withholding_tax_type', 'in', ['earnings', 'earnings_scale']),
                ('partner_id', '=', partner_id.commercial_partner_id.id),
                ('date', '<=', to_date), ('date', '>=', from_date)]
            if same_period_partner_base := self.env['account.move.line'].sudo()._read_group(domain_same_period_base, ['partner_id'], ['balance:sum']):
                same_period_base = abs(same_period_partner_base[0][1])
            else:
                same_period_base = 0.0
            net_amount = self.base_amount + same_period_base
        else:
            net_amount = self.base_amount
        net_amount = max(0, net_amount - self.tax_id.l10n_ar_non_taxable_amount)
        taxes_res = self.tax_id.with_context(calculate_withholding_taxes=True).compute_all(
            net_amount,
            currency=currency_id,
            quantity=1.0,
            product=False,
            partner=False,
            is_refund=False,
            rounding_method='round_per_line',
        )
        tax_amount = taxes_res['taxes'][0]['amount']
        tax_account_id = taxes_res['taxes'][0]['account_id']
        tax_repartition_line_id = taxes_res['taxes'][0]['tax_repartition_line_id']

        if self.tax_id.l10n_ar_withholding_tax_type in ['earnings', 'earnings_scale']:
            # if it is earnings scale we calculate according to the scale.
            if self.tax_id.l10n_ar_withholding_tax_type == 'earnings_scale':
                escala = self.env['l10n_ar.earnings.scale.line'].search([
                    ('scale_id', '=', self.tax_id.l10n_ar_scale_id.id),
                    ('excess_amount', '<=', net_amount),
                    ('to_amount', '>', net_amount),
                ], limit=1)
                tax_amount = ((net_amount - escala.excess_amount) * escala.percentage / 100) + escala.fixed_amount
            # deduct withholdings from the same period
            tax_amount -= same_period_withholdings

        l10n_ar_minimum_threshold = self.tax_id.l10n_ar_minimum_threshold
        if l10n_ar_minimum_threshold > tax_amount:
            tax_amount = 0.0
        return tax_amount, tax_account_id, tax_repartition_line_id

    def _prepare_withholding_amls_create_values(self):
        res = super()._prepare_withholding_amls_create_values()
        if self.company_id.country_code == 'AR':
            base_account = self.company_id.withholding_tax_base_account_id
            if base_account:
                # Associate all withholding taxes that match this base account to the base line,
                # and clear them from the counterpart line to avoid double counting / cancelation.
                is_outbound = self.payment_id.payment_type == 'outbound'
                for line_vals in res:
                    if line_vals.get('account_id') == base_account.id:
                        balance = line_vals.get('balance', 0.0)
                        if (is_outbound and balance < 0) or (not is_outbound and balance > 0):
                            line_vals['tax_ids'] = [Command.set(self.mapped('tax_id').ids)]
                        else:
                            line_vals['tax_ids'] = []
        return res
