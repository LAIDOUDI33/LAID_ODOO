# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Algeria - Tax Declarations (G50/G1/G2/G4)',
    'version': '19.4.1.0.0',
    'category': 'Localization/Accounting Reports',
    'summary': 'Déclarations Fiscales Algériennes: TVA, IRG, TAP, IBS',
    'description': """
Déclarations Fiscales Algériennes pour Odoo 19.4
===================================================
- G50: Déclaration de TVA (Mensuelle/Trimestrielle)
- G1: Déclaration IRG (Retenue à la source)
- G2: Déclaration TAP (Taxe Activité Professionnelle)  
- G4: Déclaration IBS (Impôt Bénéfices Sociétés)

**Fonctionnalités principales :**

• **G50 - TVA** : Calcul automatique de la TVA collectée et déductible
  - Taux normaux: 19%, 9%, 7%
  - Opérations exonérées et exportations
  - Crédit de TVA reportable

• **G1 - IRG** : Retenue à la source sur salaires et honoraires
  - Barème progressif IRG
  - Cotisations CNAS intégrées
  - Attestation fiscale

• **G2 - TAP** : Taxe sur l'Activité Professionnelle
  - Chiffre d'affaires taxable
  - Taux différenciés par activité (1% ou 2%)
  - Exonérations sectorielles

• **G4 - IBS** : Impôt sur les Bénéfices des Sociétés
  - Résultat fiscal imposable
  - Taux IBS 19% (standard) / 26% (activités spécifiques)
  - Acomptes provisionnels trimestriels

**Conforme à :**
• Code des Impôts Directs et Taxes Assimilées (CIDTA)
• Code de la Taxe sur la Valeur Ajoutée (CTVA)
• Arrêté du Ministère des Finances Algérien
• Loi de Finances 2024

Ce module est destiné aux entreprises établies en Algérie.
""",
    'author': 'HASSIBA Suite / LAID ODOO',
    'website': 'https://www.hassiba-suite.dz',
    'license': 'LGPL-3',
    'depends': ['account', 'l10n_dz'],
    'data': [
        # Data files - Tax declaration templates
        'data/l10n_dz_g50_tva.xml',
        'data/l10n_dz_g1_irg.xml',
        'data/l10n_dz_g2_tap.xml',
        'data/l10n_dz_g4_ibs.xml',
        # Views
        'views/report_views.xml',
        # Security
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
