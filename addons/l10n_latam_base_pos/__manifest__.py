# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'LATAM Base - Point of Sale',
    'version': '1.0',
    'category': 'Accounting/Localizations/Point of Sale',
    'author': 'Odoo S.A.',
    'summary': 'Bridge module for LATAM Identification Types in Point of Sale',
    'depends': [
        'l10n_latam_base',
        'point_of_sale',
    ],
    'data': [
        'views/res_partner_views.xml',
    ],
    'auto_install': True,
    'license': 'LGPL-3',
}
