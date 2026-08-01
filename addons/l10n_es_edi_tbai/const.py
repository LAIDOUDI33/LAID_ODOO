# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

# TicketBAI-exclusive additions to the shared VAT regime catalog (see l10n_es/models/account_tax.py),
# per the official TicketBAI/LROE "ClaveRegimenIvaOpTrascendencia" spec. Sale side only. '12_sale'
# and '13_sale' are also valid for TicketBAI, but shared with SII (same meaning) so they live as
# `_REGIME_CODES_SII_TBAI_SALE_EXTRA` on l10n_es' account.tax instead of being duplicated here.
TBAI_EXTRA_LABELS = {
    '19': _lt("19 - Activities under the Special Regime for Agriculture, Livestock and Fisheries (REAGYP)"),
    '51': _lt("51 - Equivalence surcharge"),
    '52': _lt("52 - Simplified regime"),
    '53': _lt("53 - Operations by persons/entities not considered businesses or professionals for VAT purposes"),
    '54': _lt("54 - Operations from a permanent establishment for indirect tax purposes in Canarias, Ceuta or Melilla"),
}

TBAI_EXTRA_CODES_SALE = ['19', '51', '52', '53', '54']
