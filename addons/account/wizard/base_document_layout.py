from odoo import api, Command, fields, models
from odoo.addons.web.models.base_document_layout import DEFAULT_PRIMARY, DEFAULT_SECONDARY

ACCOUNT_DOCUMENT_LAYOUT_COMPANY_FIELDS = {
    'logo',
    'report_header',
    'report_footer',
    'company_details',
    'paperformat_id',
    'external_report_layout_id',
    'font',
    'primary_color',
    'secondary_color',
    'report_tables_id',
    'qr_code',
    'vat',
}


class BaseDocumentLayout(models.TransientModel):
    _inherit = 'base.document.layout'

    from_invoice = fields.Boolean()
    qr_code = fields.Boolean(related='company_id.qr_code', readonly=False)
    vat = fields.Char(related='company_id.vat', readonly=False,)
    account_number = fields.Char(compute='_compute_account_number', inverse='_inverse_account_number',)
    country_code = fields.Char(related="company_id.account_fiscal_country_id.code")
    can_configure_later = fields.Boolean(compute='_compute_can_configure_later')

    def document_layout_save(self):
        """Save layout and onboarding step progress, return super() result"""
        res = super(BaseDocumentLayout, self).document_layout_save()
        if step := self.env.ref('account.onboarding_onboarding_step_base_document_layout', raise_if_not_found=False):
            for company_id in self.company_id:
                step.sudo().with_company(company_id).action_set_just_done()
            # When we finish the configuration of the layout, we want the dialog size to be reset to large
            # which is the default behaviour.
            if res.get('context'):
                res['context']['dialog_size'] = 'large'
        return res

    def _get_preview_template(self):
        if (
            self.env.context.get('active_model') == 'account.move'
            and self.env.context.get('active_id')
        ):
            return 'account.report_invoice_wizard_iframe'
        return super()._get_preview_template()

    def _get_render_information(self, styles):
        res = super()._get_render_information(styles)

        if (
            self.env.context.get('active_model') == 'account.move'
            and (active_id := self.env.context.get('active_id'))
        ):
            res['o'] = self.env['account.move'].browse(active_id)

        if self._get_preview_template() in [
            'web.report_invoice_wizard_preview',
            'account.report_invoice_wizard_iframe'
        ]:
            res.update({
                'qr_code': self.qr_code,
                'account_number': self.account_number,
            })

        return res

    @api.depends('partner_id', 'account_number')
    def _compute_account_number(self):
        for record in self:
            if record.partner_id.bank_ids:
                record.account_number = record.partner_id.bank_ids[0].account_number or ''
            else:
                record.account_number = ''

    @api.depends('qr_code', 'account_number')
    def _compute_preview(self):
        # EXTENDS 'web' to add invoice fields to the preview and render the invoice layout configurator with sudo
        if not self.env.context.get('account_document_layout_configurator'):
            return super()._compute_preview()

        styles = self._get_asset_style()
        for wizard in self:
            if wizard.report_layout_id:
                render_wizard = wizard.sudo()
                wizard.preview = self.env['ir.ui.view'].sudo()._render_template(
                    render_wizard._get_preview_template(),
                    render_wizard._get_render_information(styles),
                )
            else:
                wizard.preview = False

    @api.depends_context('can_configure_later')
    def _compute_can_configure_later(self):
        can_configure_later = bool(self.env.context.get('can_configure_later'))
        for wizard in self:
            wizard.can_configure_later = can_configure_later

    def _inverse_account_number(self):
        for record in self:
            if record.partner_id.bank_ids and record.account_number:
                bank = record.partner_id.bank_ids[0]
                if bank.account_number != record.account_number:
                    bank.allow_out_payment = False
                    bank.account_number = record.account_number
                    bank.allow_out_payment = True
            elif record.account_number:
                record.partner_id.bank_ids += self.env['res.partner.bank']._find_or_create_bank_account(
                    account_number=record.account_number,
                    partner=record.partner_id, allow_company_account_creation=True,
                    company=record.company_id,
                )

    @api.model
    def _extract_company_layout_vals(self, vals):
        company_vals = {}
        for field_name in ACCOUNT_DOCUMENT_LAYOUT_COMPANY_FIELDS:
            if field_name in vals:
                company_vals[field_name] = vals.pop(field_name)

        if 'report_layout_id' in vals:
            report_layout = self.env['report.layout'].sudo().browse(vals['report_layout_id'])
            company_vals['external_report_layout_id'] = report_layout.view_id.id if report_layout else False

        return company_vals

    @api.onchange('company_id')
    def _onchange_company_id(self):
        if not self.env.context.get('account_document_layout_configurator'):
            return super()._onchange_company_id()

        for wizard in self:
            company = wizard.company_id.sudo()
            wizard.logo = company.logo
            wizard.report_header = company.report_header
            wizard.report_footer = company.report_footer if isinstance(company.report_footer, str) else wizard.report_footer
            wizard.company_details = company.company_details if isinstance(company.company_details, str) else wizard.company_details
            wizard.paperformat_id = company.paperformat_id
            wizard.external_report_layout_id = company.external_report_layout_id
            wizard.font = company.font
            wizard.primary_color = company.primary_color
            wizard.secondary_color = company.secondary_color

            external_layout = company.external_report_layout_id
            wizard_layout = self.env['report.layout'].sudo()
            if external_layout:
                wizard_layout = wizard_layout.search([
                    ('view_id.key', '=', external_layout.key),
                ], limit=1)

            wizard.report_layout_id = wizard_layout or self.env['report.layout'].sudo().search([], limit=1)

            if not wizard.primary_color:
                wizard.primary_color = wizard.logo_primary_color or DEFAULT_PRIMARY
            if not wizard.secondary_color:
                wizard.secondary_color = wizard.logo_secondary_color or DEFAULT_SECONDARY

    @api.onchange('report_layout_id')
    def _onchange_report_layout_id(self):
        if not self.env.context.get('account_document_layout_configurator'):
            return super()._onchange_report_layout_id()

        for wizard in self:
            wizard.external_report_layout_id = wizard.report_layout_id.sudo().view_id

    def _get_asset_style(self):
        if not self.env.context.get('account_document_layout_configurator'):
            return super()._get_asset_style()

        return self.env['ir.qweb'].sudo()._render('web.styles_company_report', {
            'company_ids': self.sudo(),
        }, raise_if_not_found=False)

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get('account_document_layout_configurator'):
            return super().create(vals_list)

        vals_list = [dict(vals) for vals in vals_list]
        company_vals_list = [
            self._extract_company_layout_vals(vals)
            for vals in vals_list
        ]

        self.check_access('create')
        records = super(BaseDocumentLayout, self.sudo()).create(vals_list).with_env(self.env)

        for record, company_vals in zip(records, company_vals_list):
            if company_vals:
                record.company_id.sudo().write(company_vals)

        return records

    def write(self, vals):
        if not self.env.context.get('account_document_layout_configurator'):
            return super().write(vals)

        vals = dict(vals)
        company_vals = self._extract_company_layout_vals(vals)

        res = super().write(vals)

        if company_vals:
            self.mapped('company_id').sudo().write(company_vals)

        return res

    def action_configure_later(self):
        self.ensure_one()
        report_action = self.env.context.get('report_action')
        if not report_action:
            return {'type': 'ir.actions.act_window_close'}

        self.check_access('write')
        self.company_id.sudo().external_report_layout_id = False
        return report_action
