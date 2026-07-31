# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo.tools.partner_identifier_validation import uy_ci_validate, uy_nie_validate
from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

UY_ADDITIONAL_IDENTIFIERS_METADATA = {
    'UY_CI': {
        'sequence': 3,
        'label': _lt('CI'),
        'help': _lt('Cédula de Identidad (Uruguayan ID card).'),
        'placeholder': '3:402.010-1',
        'category': 'CN',
        'validation_function': uy_ci_validate,
        'countries': ['UY'],
    },
    'UY_DNI': {
        'sequence': 5,
        'label': _lt('DNI'),
        'help': _lt('Documento Nacional de Identidad (AR, BR, CL or PY).'),
        'category': 'CN',
        'countries': ['UY'],
    },
    'UY_NIE': {
        'sequence': 1,
        'label': _lt('NIE'),
        'help': _lt('Foreigner Identity Number.'),
        'placeholder': '93:402.010-1',
        'category': 'CN',
        'validation_function': uy_nie_validate,
        'countries': ['UY'],
    },
    'UY_NIFE': {
        'sequence': 6,
        'label': _lt('NIFE'),
        'help': _lt('Foreign tax identification number.'),
        'category': 'CN',
        'countries': ['UY'],
    },
    'UY_OTR': {
        'sequence': 4,
        'label': _lt('Otros'),
        'help': _lt('Other identification document.'),
        'category': 'CN',
        'countries': ['UY'],
    },
}
