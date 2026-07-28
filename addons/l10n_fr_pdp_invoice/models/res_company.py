import logging

import psycopg2

from odoo import api, fields, models
from odoo.exceptions import AccessError

from odoo.addons.iap.tools import iap_tools
from odoo.addons.l10n_fr_pdp.utils import drom_com_territories


_logger = logging.getLogger(__name__)


class ResCompany(models.Model):
    _inherit = 'res.company'

    l10n_fr_pdp_invoice_company_ids = fields.One2many(
        comodel_name='l10n_fr_pdp.invoice.company',
        inverse_name='company_id',
        groups='base.group_system',
    )
    l10n_fr_pdp_late_payment_penalties_rate = fields.Float(
        string="Late Payment Penalties Rate",
        compute='_compute_l10n_fr_pdp_late_payment_penalties_settings',
        compute_sudo=True,
        inverse='_inverse_l10n_fr_pdp_late_payment_penalties_rate',
        digits=(16, 2),
        help="Calculated as the ECB MRO rate + 10 points. If manually edited, it won't be recomputed automatically, you'll need to update it yourself.",
    )
    l10n_fr_pdp_late_payment_penalties_automatic = fields.Boolean(
        string="Update Late Payment Penalties Automatically",
        compute='_compute_l10n_fr_pdp_late_payment_penalties_settings',
        compute_sudo=True,
        inverse='_inverse_l10n_fr_pdp_late_payment_penalties_automatic',
    )
    l10n_fr_pdp_late_payment_penalties_period = fields.Date(
        string="Rate Applicable Since",
        compute='_compute_l10n_fr_pdp_late_payment_penalties_settings',
        compute_sudo=True,
    )
    l10n_fr_pdp_late_payment_penalties_applicable = fields.Boolean(
        compute='_compute_l10n_fr_pdp_late_payment_penalties_applicable',
    )

    @api.depends(
        'l10n_fr_pdp_invoice_company_ids.late_payment_penalties_rate',
        'l10n_fr_pdp_invoice_company_ids.late_payment_penalties_automatic',
        'l10n_fr_pdp_invoice_company_ids.late_payment_penalties_period',
    )
    def _compute_l10n_fr_pdp_late_payment_penalties_settings(self):
        for company in self:
            settings = company.l10n_fr_pdp_invoice_company_ids[:1]
            company.l10n_fr_pdp_late_payment_penalties_rate = (
                settings.late_payment_penalties_rate if settings else 10.0
            )
            company.l10n_fr_pdp_late_payment_penalties_automatic = (
                settings.late_payment_penalties_automatic if settings else True
            )
            company.l10n_fr_pdp_late_payment_penalties_period = (
                settings.late_payment_penalties_period if settings else False
            )

    def _inverse_l10n_fr_pdp_late_payment_penalties_rate(self):
        for company in self:
            rate = company.l10n_fr_pdp_late_payment_penalties_rate
            settings = company._l10n_fr_pdp_get_or_create_invoice_company()
            settings.late_payment_penalties_rate = rate

    def _inverse_l10n_fr_pdp_late_payment_penalties_automatic(self):
        for company in self:
            automatic = company.l10n_fr_pdp_late_payment_penalties_automatic
            settings = company._l10n_fr_pdp_get_or_create_invoice_company()
            settings.late_payment_penalties_automatic = automatic

    @api.depends('account_fiscal_country_id')
    def _compute_l10n_fr_pdp_late_payment_penalties_applicable(self):
        for company in self:
            territory_type = drom_com_territories.get_territory_type(
                company.account_fiscal_country_id.code
            )
            company.l10n_fr_pdp_late_payment_penalties_applicable = (
                territory_type in drom_com_territories.E_INVOICING_ZONES
            )

    def _l10n_fr_pdp_get_or_create_invoice_company(self):
        self.ensure_one()
        invoice_company_model = self.env['l10n_fr_pdp.invoice.company']
        invoice_company = invoice_company_model.search([
            ('company_id', '=', self.id),
        ], limit=1)
        if not invoice_company:
            try:
                with self.env.cr.savepoint():
                    invoice_company = invoice_company_model.create({
                        'company_id': self.id,
                    })
            except psycopg2.errors.UniqueViolation:
                invoice_company = invoice_company_model.search([
                    ('company_id', '=', self.id),
                ], limit=1)
        return invoice_company

    @api.model
    def _l10n_fr_pdp_get_semester_start(self, reference_date=None):
        reference_date = fields.Date.to_date(reference_date or fields.Date.today())
        return reference_date.replace(
            month=1 if reference_date.month <= 6 else 7,
            day=1,
        )

    def _l10n_fr_pdp_fetch_late_payment_penalties_rate(self, period_start):
        self.ensure_one()
        edi_mode = self._get_peppol_edi_mode()
        if edi_mode == 'demo':
            return self.l10n_fr_pdp_late_payment_penalties_rate

        server_url = self.env['account_edi_proxy_client.user']._get_server_url(
            proxy_type='pdp',
            edi_mode=edi_mode,
        )
        try:
            response = iap_tools.iap_jsonrpc(
                f'{server_url}/api/pdp/1/late_payment_penalty_rate',
                params={
                    'period_start': fields.Date.to_string(period_start),
                },
            )
            rate = self._l10n_fr_pdp_parse_late_payment_penalties_rate_response(
                response,
                period_start,
            )
        except (AccessError, KeyError, TypeError, ValueError) as error:
            _logger.warning(
                "Unable to update the late payment penalty rate from IAP for %s: %s",
                self.display_name,
                error,
            )
            return False
        return rate

    def _l10n_fr_pdp_parse_late_payment_penalties_rate_response(
        self,
        response,
        period_start,
    ):
        response_period = fields.Date.to_date(response['period_start'])
        if response_period != period_start:
            raise ValueError("The IAP response does not match the requested period.")
        return float(response['late_payment_penalty_rate'])

    def _l10n_fr_pdp_set_automatic_late_payment_penalties_rate(
        self,
        rate,
        period_start,
    ):
        self.ensure_one()
        invoice_company = (
            self.sudo()._l10n_fr_pdp_get_or_create_invoice_company()
        )
        invoice_company.with_context(
            l10n_fr_pdp_automatic_rate_update=True,
        ).write({
            'late_payment_penalties_rate': rate,
            'late_payment_penalties_automatic': True,
            'late_payment_penalties_period': period_start,
        })

    def _l10n_fr_pdp_get_late_payment_penalties_rate(self, period_start):
        self.ensure_one()
        if not self.l10n_fr_pdp_late_payment_penalties_automatic:
            return self.l10n_fr_pdp_late_payment_penalties_rate
        if self.l10n_fr_pdp_late_payment_penalties_period == period_start:
            return self.l10n_fr_pdp_late_payment_penalties_rate

        rate = self._l10n_fr_pdp_fetch_late_payment_penalties_rate(period_start)
        if rate is False:
            return False
        if period_start == self._l10n_fr_pdp_get_semester_start():
            self._l10n_fr_pdp_set_automatic_late_payment_penalties_rate(
                rate,
                period_start,
            )
        return rate
