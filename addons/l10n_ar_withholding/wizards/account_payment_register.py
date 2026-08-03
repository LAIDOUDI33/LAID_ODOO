# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging

from odoo import models, fields, api, Command
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class AccountPaymentRegister(models.TransientModel):
    _inherit = 'account.payment.register'

    @api.model
    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        if 'withhold' in fields_list:
            company = self.env.company
            if company.country_code == 'AR':
                res['withhold'] = 'withhold_pay'
        return res

    @api.depends('can_edit_wizard', 'source_amount', 'source_amount_currency', 'source_currency_id', 'company_id', 'currency_id', 'payment_date', 'installments_mode', 'l10n_latam_move_check_ids.amount', 'l10n_latam_new_check_ids.amount', 'payment_method_code')
    def _compute_amount(self):
        super()._compute_amount()
        for wizard in self:
            checks = wizard.l10n_latam_new_check_ids if wizard.filtered(lambda x: x._is_latam_check_payment(check_subtype='new_check')) else wizard.l10n_latam_move_check_ids
            checks_amount = sum(checks.mapped('amount'))
            currency_id = wizard.currency_id or wizard.company_currency_id
            if not currency_id.is_zero(checks_amount) and currency_id.compare_amounts(checks_amount, wizard.withholding_net_amount) != 0:
                if wizard.partner_type == 'supplier':
                    original_amount = wizard.amount
                    f_delta = checks_amount - wizard.withholding_net_amount
                    if f_delta < 0:
                        # Removing withholdings can result in an overshoot of the initial amount
                        wizard.amount = checks_amount
                        f_delta = checks_amount - wizard.withholding_net_amount
                    d = f_delta
                    f_previous = wizard.withholding_net_amount
                    wizard.amount += d
                    wizard.env.add_to_compute(wizard.withholding_line_ids._fields['base_amount'], wizard.withholding_line_ids)
                    wizard.env.add_to_compute(wizard.withholding_line_ids._fields['amount'], wizard.withholding_line_ids)
                    wizard._compute_withholding_net_amount()
                    for i in range(201):
                        f_delta = checks_amount - wizard.withholding_net_amount
                        if currency_id.is_zero(f_delta):
                            break
                        der = ((wizard.withholding_net_amount - f_previous) / d) if abs(d) >= 0.01 else 1.0
                        if currency_id.is_zero(der):
                            i = 200
                            break
                        d = max(f_delta / der, 0.01)
                        f_previous = wizard.withholding_net_amount
                        wizard.amount += d
                        wizard.env.add_to_compute(wizard.withholding_line_ids._fields['base_amount'], wizard.withholding_line_ids)
                        wizard.env.add_to_compute(wizard.withholding_line_ids._fields['amount'], wizard.withholding_line_ids)
                        wizard._compute_withholding_net_amount()
                    if i == 200:
                        # Adjustment failed, resetting
                        wizard.amount = original_amount

    @api.depends('withholding_net_amount', 'l10n_latam_new_check_ids.amount', 'l10n_latam_move_check_ids.amount', 'can_edit_wizard', 'can_group_payments', 'group_payment')
    def _compute_actionable_errors(self):
        super()._compute_actionable_errors()
        for wizard in self:
            if wizard.company_id.country_code != 'AR':
                continue
            actionable_errors = dict(wizard.actionable_errors or {})
            if not wizard.can_edit_wizard or (wizard.can_group_payments and not wizard.group_payment):
                actionable_errors['l10n_ar_withholding_grouping_warning'] = {
                    'message': wizard.env._("You can't register withholdings when paying invoices of different partners or same partner without grouping"),
                    'level': 'info',
                }
            currency_id = wizard.currency_id or wizard.company_currency_id
            checks = wizard.l10n_latam_new_check_ids if wizard.filtered(lambda x: x._is_latam_check_payment(check_subtype='new_check')) else wizard.l10n_latam_move_check_ids
            checks_amount = sum(checks.mapped('amount'))
            if not currency_id.is_zero(checks_amount) and currency_id.compare_amounts(checks_amount, wizard.withholding_net_amount) != 0:
                actionable_errors['l10n_ar_adjustment_warning'] = {
                    'message': wizard.env._("Adjust total amount or withholdings amount so that the check amount is the correct one."),
                    'level': 'warning',
                }
            wizard.actionable_errors = actionable_errors

    @api.depends('withholding_payment_account_id', 'withhold')
    def _compute_withholding_outstanding_account_id(self):
        super()._compute_withholding_outstanding_account_id()
        for wizard in self:
            if wizard.company_id.country_code == 'AR' and wizard.withhold != 'payment' and not wizard.withholding_outstanding_account_id and not wizard.withholding_payment_account_id:
                account_ref = 'account_journal_payment_debit_account_id' if wizard.payment_type == 'inbound' else 'account_journal_payment_credit_account_id'
                chart_template = wizard.with_context(allowed_company_ids=wizard.company_id.root_id.ids).env['account.chart.template']
                wizard.withholding_outstanding_account_id = (
                    chart_template.ref(account_ref, raise_if_not_found=False)
                    or wizard.company_id.transfer_account_id
                )

    @api.depends('partner_id', 'payment_date')
    def _compute_withholding_line_ids(self):
        super()._compute_withholding_line_ids()
        for wizard in self:
            if wizard.company_id.country_code != 'AR' or not wizard.display_withholding or not wizard.can_edit_wizard:
                continue
            date = wizard.payment_date or fields.Date.context_today(self)
            partner_taxes = self.env['l10n_ar.partner.tax'].search([
                *self.env['l10n_ar.partner.tax']._check_company_domain(wizard.company_id),
                '|', ('from_date', '<=', date), ('from_date', '=', False),
                '|', ('to_date', '>=', date), ('to_date', '=', False),
                ('partner_id', '=', wizard.partner_id.commercial_partner_id.id),
                ('tax_id.is_withholding_tax', '=', True),
                ('tax_id.type_tax_use', '=', 'purchase' if wizard.partner_type == 'supplier' else 'sale'),
                ('tax_id.active', '=', True)
            ])
            existing_tax_ids = wizard.withholding_line_ids.mapped('tax_id')
            new_lines = []
            for partner_tax in partner_taxes:
                if partner_tax.tax_id not in existing_tax_ids:
                    new_lines.append(Command.create({
                        'tax_id': partner_tax.tax_id.id,
                    }))
            if new_lines:
                wizard.withholding_line_ids = [
                    Command.link(line.id) if isinstance(line.id, int)
                    else Command.create(line._convert_to_write(line._cache))
                    for line in wizard.withholding_line_ids
                ] + new_lines

    @api.depends('company_id.country_code', 'withholding_line_ids.withholding_sequence_id')
    def _compute_withholding_hide_name(self):
        super()._compute_withholding_hide_name()
        for wizard in self:
            if wizard.company_id.country_code == 'AR':
                wizard.withholding_hide_name = False

    def action_create_payments(self):
        if self.withhold != 'withhold' and self.withholding_line_ids and not self.payment_method_line_id.payment_account_id:
            raise ValidationError(self.env._("A payment cannot have withholding if the payment method has no outstanding accounts"))
        return super().action_create_payments()
