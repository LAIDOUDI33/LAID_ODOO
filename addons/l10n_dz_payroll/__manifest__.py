# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Algeria - Payroll & Social Security (CNAS/CASNOS)',
    'version': '19.4.1.0.0',
    'category': 'Localization/Human Resources',
    'description': """
Paie Algérienne pour Odoo 19.4
==============================
- Calcul Salaire Net selon législation algérienne
- Cotisations CNAS (Part Patronale 26%, Salariale 9%)
- IRG Barème progressif (0% à 35%)
- Congés payés (30 jours/an minimum)
- Allocations familiales
- Bulletin de paie arabe/français

**Caractéristiques principales :**

• **Salaire de Base** : SMIG = 20,000 DZD (configurable)
• **Primes** : Ancienneté, Logement, Transport, Responsabilité
• **Allocations Familiales** : 250 DZD/enfant (max 3 enfants)
• **Heures Supplémentaires** : Majoration 50% / 100%
• **Cotisations CNAS Patronales** :
  - Sécurité Sociale : 26%
  - Accident de Travail : variable par secteur
  - Taxe d'Apprentissage : 2%
  - Taxe Formation Continue : 1.6%
  - CACOBAT (Chômage) : 1%
  - Œuvres Sociales : 3%

• **Cotisations Salariales** :
  - CNAS Salariale : 9%
  - IRG (Impôt sur Revenu Global) : Barème progressif

• **Barème IRG Mensuel** :
  - Tranche 1: 0 - 22,500 DZD → 0%
  - Tranche 2: 22,501 - 75,000 DZD → 10%
  - Tranche 3: 75,001 - 120,000 DZD → 20%
  - Tranche 4: 120,001 - 200,000 DZD → 30%
  - Tranche 5: > 200,000 DZD → 35%
  + Abattement: 40% du salaire imposable (max 1,500 DZD/mois)
  + 1 part = 5,000 DZD (personne à charge)

• **Types de Contrats** : CDI, CDD, CTT, Quotidien
• **Bulletin de Paie** : Format bilingue Arabe/Français
• **Attestation CNAS** : Génération automatique

**Conforme à :**
• Loi 90-11 du 21 avril 1990 (Code du Travail)
• Ordonnance 95-01 relative aux assurances sociales
• Loi de Finances 2024 (SMIG 20,000 DZD)

Ce module est destiné aux entreprises établies en Algérie.
""",
    'author': 'HASSIBA Suite / LAID ODOO',
    'website': 'https://www.hassiba-suite.dz',
    'license': 'LGPL-3',
    'depends': ['hr_payroll', 'l10n_dz'],
    'data': [
        # Salary Rule Categories
        'data/hr_salary_rule_category_dz.xml',
        
        # Contribution Registers
        'data/contribution_register_dz.xml',
        
        # Salary Rules
        'data/hr_salary_rules_dz.xml',
        
        # Contract Types
        'data/hr_contract_dz.xml',
        
        # Views
        'views/payslip_views.xml',
        'views/report_templates.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
