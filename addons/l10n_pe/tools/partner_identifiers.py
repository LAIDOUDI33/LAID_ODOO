# Part of Odoo. See LICENSE file for full copyright and licensing details.
from stdnum.pe import cui as pe_cui

from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

# Map an identifier key to the SUNAT vat code reported on the EDI document
# (catalogue 06). RUC is the primary identifier, stored on `vat` (country=PE).
# SUNAT code '4' (Carnet de extranjería) is reported for an identifier from another country.
PE_FOREIGN_SUNAT_CODE = '4'
PE_IDENTIFIER_TO_SUNAT_CODE = {
    'PE_RUC': '6',
    'PE_DNI': '1',
    'PASSPORT': '7',
    'PE_NDTD': '0',
    'PE_DIC': 'A',
    'PE_IDCR': 'B',
    'PE_TIN': 'C',
    'PE_IN': 'D',
    'PE_TAM': 'E',
    'PE_PTP': 'F',
    'PE_SP': 'G',
    'PE_CPP': 'H',
}

PE_ADDITIONAL_IDENTIFIERS_METADATA = {
    'PE_CPP': {
        'sequence': 12,
        'label': _lt('License Permit Temp. Perman.'),
        'help': _lt('Carné Permiso Temp. Perman.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_DIC': {
        'sequence': 5,
        'label': _lt('Diplomatic Identity Card'),
        'help': _lt('Cédula Diplomática de identidad.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_DNI': {
        'sequence': 3,
        'label': _lt('DNI'),
        'help': _lt('National Identity Document.'),
        'placeholder': '40000004',
        'category': 'CN',
        'validation_function': pe_cui.validate,
        'countries': ['PE'],
    },
    'PE_IDCR': {
        'sequence': 6,
        'label': _lt('Identity document of the country of residence'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_IN': {
        'sequence': 8,
        'label': _lt('Identification Number'),
        'help': _lt('IN - Doc Trib PP. JJ.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_NDTD': {
        'sequence': 4,
        'label': _lt('Non-Domiciled Tax Document'),
        'help': _lt('Document without RUC from another country.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_PTP': {
        'sequence': 10,
        'label': _lt('PTP'),
        'help': _lt('Temporary Residence Permit (Permiso de residencia temporal).'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_SP': {
        'sequence': 11,
        'label': _lt('Safe Passage'),
        'help': _lt('Salvoconducto.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_TAM': {
        'sequence': 9,
        'label': _lt('TAM'),
        'help': _lt('Andean Immigration Card.'),
        'category': 'CN',
        'countries': ['PE'],
    },
    'PE_TIN': {
        'sequence': 7,
        'label': _lt('Tax Identification Number'),
        'help': _lt('TIN – Doc Trib PP.NN.'),
        'category': 'CN',
        'countries': ['PE'],
    },
}
