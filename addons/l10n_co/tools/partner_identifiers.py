# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

# Map a Colombian identifier to its DIAN code used in EDI documents and the exogenous reports.
CO_FOREIGN_ID_DIAN_CODE = '42'   # Documento de identificación extranjero (typed foreign id)
CO_FOREIGN_VAT_DIAN_CODE = '50'  # NIT de otro país (foreign tax number on vat)
CO_IDENTIFIER_TO_DIAN_CODE = {
    'CO_NIT': '31',
    'CO_CC': '13',
    'CO_RC': '11',
    'CO_TI': '12',
    'CO_TE': '21',
    'CO_CE': '22',
    'CO_NIUP': '91',
    'CO_PEP': '47',
    'CO_PPT': '48',
    'PASSPORT': '41',
}

CO_ADDITIONAL_IDENTIFIERS_METADATA = {
    'CO_CC': {
        'sequence': 2,
        'label': _lt('Cédula de ciudadanía'),
        'help': _lt('Colombian citizenship ID card (Cédula de ciudadanía).'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_CE': {
        'sequence': 6,
        'label': _lt('Cédula de extranjería'),
        'help': _lt('Colombian foreigner ID card (Cédula de extranjería).'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_NIUP': {
        'sequence': 7,
        'label': _lt('NIUP'),
        'help': _lt('Número de Identificación Único Personal.'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_PEP': {
        'sequence': 8,
        'label': _lt('PEP'),
        'help': _lt('Permiso Especial de Permanencia.'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_PPT': {
        'sequence': 9,
        'label': _lt('PPT'),
        'help': _lt('Permiso por Protección Temporal.'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_RC': {
        'sequence': 3,
        'label': _lt('Registro Civil'),
        'help': _lt('Colombian civil registration document (Registro Civil).'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_TE': {
        'sequence': 5,
        'label': _lt('Tarjeta de extranjería'),
        'help': _lt('Colombian foreigner card (Tarjeta de extranjería).'),
        'category': 'CN',
        'countries': ['CO'],
    },
    'CO_TI': {
        'sequence': 4,
        'label': _lt('Tarjeta de Identidad'),
        'help': _lt('Colombian identity card for minors (Tarjeta de Identidad).'),
        'category': 'CN',
        'countries': ['CO'],
    },
}
