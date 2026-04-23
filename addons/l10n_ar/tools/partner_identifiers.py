# Part of Odoo. See LICENSE file for full copyright and licensing details.
from stdnum.ar import cuit as ar_cuit, dni as ar_dni

from odoo.tools.translate import LazyTranslate

_lt = LazyTranslate(__name__)

AR_ADDITIONAL_IDENTIFIERS_METADATA = {
    'AR_AN': {
        'sequence': 11,
        'label': _lt('AN'),
        'help': _lt('Birth certificate / Acta de nacimiento.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CDI': {
        'sequence': 9,
        'label': _lt('CDI'),
        'help': _lt('Identification Code.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CDM': {
        'sequence': 13,
        'label': _lt('CdM'),
        'help': _lt('Migration Certificate / Certificado de migración.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CI': {
        'sequence': 6,
        'label': _lt('CI'),
        'help': _lt("Provincial ID card (Cédula de Identidad); the AFIP document type is derived from the partner's province."),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CIBAR': {
        'sequence': 12,
        'label': _lt('CIBAR'),
        'help': _lt('CI Bs. As. RNP.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CPF': {
        'sequence': 5,
        'label': _lt('CPF'),
        'help': _lt('CI Federal Police.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_CUIL': {
        'sequence': 3,
        'label': _lt('CUIL'),
        'help': _lt('Unique Labor Identification Code (Código Único de Identificación Laboral).'),
        'category': 'CN',
        'validation_function': ar_cuit.validate,
        'countries': ['AR'],
    },
    'AR_DNI': {
        'sequence': 2,
        'label': _lt('DNI'),
        'help': _lt('National Identity Card (Documento Nacional de Identidad).'),
        'placeholder': '34586675',
        'category': 'CN',
        'validation_function': ar_dni.validate,
        'countries': ['AR'],
    },
    'AR_ET': {
        'sequence': 10,
        'label': _lt('ET'),
        'help': _lt('Pending (en trámite).'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_LC': {
        'sequence': 8,
        'label': _lt('LC'),
        'help': _lt('Libreta cívica.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_LE': {
        'sequence': 7,
        'label': _lt('LE'),
        'help': _lt('Libreta de enrolamiento.'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_SIGD': {
        'sequence': 4,
        'label': _lt('SIGD'),
        'help': _lt('Unidentified / global daily sales (Sin identificar / venta global diaria).'),
        'category': 'CN',
        'countries': ['AR'],
    },
    'AR_UPAPP': {
        'sequence': 14,
        'label': _lt('UpApP'),
        'help': _lt('Used by Anses for Padrón.'),
        'category': 'CN',
        'countries': ['AR'],
    },
}

# Map AR-specific additional identifiers to the AFIP catalog code reported on
# EDI/legal documents. {'AR_CUIT': 80} is resolved separately.
AR_IDENTIFIER_TO_AFIP_CODE = {
    'AR_CUIL': '86',
    'AR_DNI': '96',
    'PASSPORT': '94',
    'AR_SIGD': '99',
    'AR_CDI': '87',
    'AR_LE': '89',
    'AR_LC': '90',
    'AR_ET': '92',
    'AR_AN': '93',
    'AR_CIBAR': '95',
    'AR_CDM': '30',
    'AR_UPAPP': '88',
    'AR_CPF': '0',
}

# Map each Argentine state to the AFIP catalog code.
AR_STATE_TO_CI_AFIP_CODE = {
    'B': '1',   # Buenos Aires
    'K': '2',   # Catamarca
    'X': '3',   # Córdoba
    'W': '4',   # Corrientes
    'E': '5',   # Entre Ríos
    'Y': '6',   # Jujuy
    'M': '7',   # Mendoza
    'F': '8',   # La Rioja
    'A': '9',   # Salta
    'J': '10',  # San Juan
    'D': '11',  # San Luis
    'S': '12',  # Santa Fe
    'G': '13',  # Santiago del Estero
    'T': '14',  # Tucumán
    'H': '16',  # Chaco
    'U': '17',  # Chubut
    'P': '18',  # Formosa
    'N': '19',  # Misiones
    'Q': '20',  # Neuquén
    'L': '21',  # La Pampa
    'R': '22',  # Río Negro
    'Z': '23',  # Santa Cruz
    'V': '24',  # Tierra del Fuego
}
