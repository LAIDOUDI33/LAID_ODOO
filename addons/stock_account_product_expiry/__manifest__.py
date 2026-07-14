{
    'name': "Stock Account Product Expiry",
    'category': 'Supply Chain/Inventory',
    'description': 'Add the option to display the expiration date on the invoice',
    'depends': ['stock_account', 'product_expiry'],
    'data': [
        'security/stock_account_product_expiry_security.xml',
        'views/report_invoice.xml',
        'views/res_config_settings.xml',
    ],
    'auto_install': True,
    'license': 'LGPL-3',
    'author': 'Odoo S.A.',
}
