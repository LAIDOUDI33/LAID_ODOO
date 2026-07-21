{
    "name": "Philippines - Sale Discount Privileges",
    "summary": "Extends Philippine SC/PWD discount privileges to sale orders.",
    "description": """
Extends the Philippine SC/PWD discount privilege feature (from the l10n_ph
accounting module) onto sale orders. Lets sales users apply statutory senior
citizen / person-with-disability discounts on quotations and sale orders, with
the applied privilege and recomputed price/tax carrying over to the invoice.
""",
    "category": "Accounting/Localizations",
    "version": "1.0",
    "author": "Odoo S.A.",
    "depends": [
        "l10n_ph",
        "sale",
    ],
    "auto_install": True,
    "data": [
        "security/security.xml",
        "security/ir.access.csv",
        "wizard/l10n_ph_discount_privilege_wizard_views.xml",
        "views/sale_order_views.xml",
        "views/sale_res_config_settings_views.xml",
    ],
    "license": "LGPL-3",
}
