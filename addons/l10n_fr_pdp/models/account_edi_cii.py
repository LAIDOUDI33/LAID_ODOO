from odoo import models


class AccountEdiCii(models.AbstractModel):
    _inherit = "account.edi.cii"

    def _cii_add_exchanged_document_node(self, vals):
        super()._cii_add_exchanged_document_node(vals)

        vals['document_node']['rsm:ExchangedDocument']['ram:BusinessProcessSpecifiedDocumentContextParameter'] = {
            'ram:ID': {'_text': self._l10n_fr_pdp_get_profile_id(vals)}
        }
