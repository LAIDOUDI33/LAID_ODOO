from odoo import api, fields, models
from odoo.tools import float_compare


class L10nFrPdpInvoiceCompany(models.Model):
    _name = 'l10n_fr_pdp.invoice.company'
    _description = 'French PDP Invoice Company Settings'

    company_id = fields.Many2one(
        comodel_name='res.company',
        required=True,
        ondelete='cascade',
    )
    late_payment_penalties_rate = fields.Float(
        string="Late Payment Penalties Rate",
        default=10.0,
        digits=(16, 2),
        required=True,
    )
    late_payment_penalties_automatic = fields.Boolean(
        string="Update Late Payment Penalties Automatically",
        default=True,
    )
    late_payment_penalties_period = fields.Date(
        string="Rate Applicable Since",
        readonly=True,
    )

    _sql_constraints = [
        (
            'company_id_unique',
            'unique(company_id)',
            "Late payment penalty settings already exist for this company.",
        ),
    ]

    def _invalidate_company_fields(self):
        self.company_id.invalidate_recordset([
            'l10n_fr_pdp_late_payment_penalties_rate',
            'l10n_fr_pdp_late_payment_penalties_automatic',
            'l10n_fr_pdp_late_payment_penalties_period',
        ])

    @api.model_create_multi
    def create(self, vals_list):
        settings = super().create(vals_list)
        settings._invalidate_company_fields()
        return settings

    def write(self, vals):
        automatic_update = self.env.context.get('l10n_fr_pdp_automatic_rate_update')
        for settings in self:
            settings_vals = dict(vals)
            if not automatic_update:
                if (
                    'late_payment_penalties_rate' in vals
                    and float_compare(
                        settings.late_payment_penalties_rate,
                        vals['late_payment_penalties_rate'],
                        precision_digits=2,
                    )
                ):
                    settings_vals.update({
                        'late_payment_penalties_automatic': False,
                        'late_payment_penalties_period': False,
                    })
                elif (
                    'late_payment_penalties_automatic' in vals
                    and settings.late_payment_penalties_automatic != vals['late_payment_penalties_automatic']
                ):
                    settings_vals['late_payment_penalties_period'] = False
            super(L10nFrPdpInvoiceCompany, settings).write(settings_vals)
        self._invalidate_company_fields()
        return True

    @api.ondelete(at_uninstall=False)
    def _unlink_invalidate_company_fields(self):
        self._invalidate_company_fields()
