from odoo import models, api


class BaseDocumentLayout(models.TransientModel):
    _inherit = "base.document.layout"

    @api.onchange('report_layout_id')
    def _onchange_report_layout_id(self):
        res = super()._onchange_report_layout_id()
        self._apply_es_paperformat()
        return res

    def _adapt_paperformat(self):
        default_paperformat = self.env['report.paperformat']
        paperformat_a4_euro = self.env.ref('base.paperformat_euro', raise_if_not_found=False) or default_paperformat
        paperformat_a4_es_folder = self.env.ref('l10n_es.paperformat_l10n_es_a4_folder', raise_if_not_found=False) or default_paperformat
        es_wizards = self.filtered(lambda w: w.company_id.country_code == 'ES')
        for wizard in es_wizards:
            if wizard.paperformat_id in (paperformat_a4_euro | paperformat_a4_es_folder):
                if paperformat_a4_es_folder and wizard.report_layout_id.name == 'Folder':
                    wizard.paperformat_id = paperformat_a4_es_folder
                else:
                    wizard.paperformat_id = paperformat_a4_euro
        super(BaseDocumentLayout, self - es_wizards)._adapt_paperformat()
