# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Algeria - Accounting',
    'version': '19.4.1.0.0',
    'category': 'Localization/Accounting',
    'description': """
Algerian Accounting Module (l10n_dz) - Localisation Comptable Algérie
======================================================================

Plan Comptable National (PCN) Algérie conforme au SCF (Système Comptable Financier)

**Caractéristiques principales :**

• **Plan Comptable Complet** : PCN algérien avec tous les comptes SCF
• **TVA** : Taux normaux 19%, réduit 9%, exonérations, import/export
• **TAP** : Taxe sur l'Activité Professionnelle (1%, 2%)
• **IRG** : Impôt sur le Revenu Global (barème progressif, retenue à la source)
• **IBS** : Impôt sur les Bénéfices des Sociétés (19%, 26%)
• **CNAS** : Cotisations sociales salariales et patronales
• **CASNOS** : Cotisations non-salariés
• **Timbre Fiscal** : Droits de timbre sur documents
• **58 Wilayas** : Toutes les provinces algériennes
• **Groupes de pays** : Maghreb, Ligue Arabe, UE, Afrique

**Déclarations fiscales supportées :**
• G50 - Déclaration TVA
• G1 - Déclaration IRG
• G2 - Déclaration TAP
• G4 - Déclaration IBS

**Conforme à :**
• Arrêté du 26 juillet 2008 portant SCF
• Loi de Finances Complémentaire 2009
• Ordonnance 75-35 du 29 avril 1975 (TAP)
• Loi de Finances 2024 (IBS 19%)

Ce module s'applique aux entreprises établies en Algérie.
""",
    'author': 'Osis / HASSIBA Suite ERP',
    'website': 'https://www.hassiba-suite.dz',
    'license': 'LGPL-3',
    'depends': ['account'],
    'data': [
        # Chart of Accounts
        'data/account_chart_template_data.xml',
        'data/account.account.template.csv',
        'data/account_chart_template_post_data.xml',
        
        # Tax Templates
        'data/account_tax_data.xml',
        'data/account_tax_algeria.xml',  # Enhanced Algerian taxes
        
        # Fiscal Positions
        'data/account_fiscal_position_template_data.xml',
        'data/account_chart_template_configuration_data.xml',
        
        # Geographic Data
        'data/res_country_dz.xml',            # Algeria country + DZD currency
        'data/res_country_state_dz.csv',      # 58 Wilayas
        'data/res_country_group_dz.xml',      # Trade groups (Maghreb, Arab League, EU)
    ],
}
