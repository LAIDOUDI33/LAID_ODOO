# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo.tools.partner_identifier_validation import gt_cui_validate
from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

GT_ADDITIONAL_IDENTIFIERS_METADATA = {
    'GT_CUI': {
        'sequence': 1,
        'label': _lt('CUI'),
        'help': _lt('Guatemalan unique identification code.'),
        'placeholder': '1234567890101',
        'category': 'CN',
        'validation_function': gt_cui_validate,
        'countries': ['GT'],
    },
}
