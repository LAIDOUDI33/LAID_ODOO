# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Localization for Odoo 19

{
    'name': 'HASSIBA Suite ERP Algeria',
    'version': '19.3.2.0.0',
    'summary': 'ERP complet adapté au contexte algérien - Paie CNAS/CASNOS/IRG, TVA SCF',
    'description': """
HASSIBA Suite ERP - Solution ERP complète pour entreprises algériennes
======================================================================

Module de localisation algérienne complet pour Odoo 19:

**Gestion des Ressources Humaines & Paie:**
- Calcul automatique CNAS (Caisse Nationale de Sécurité Sociale)
- Calcul CASNOS (Caisse de Retraite Non-Salariés)
- Tables IRG à jour (Impôt sur Revenu Global)
- Bulletin de paie officiel format algérien
- Contrats de travail CDD/CDI conformes

**Comptabilité & Fiscalité:**
- Plan comptable SCF (Système Comptable Financier)
- Déclaration TVA G50/G41
- Bilan comptable format réglementaire
- Gestion multi-devises avec DZD par défaut

**Données Algériennes:**
- 58 Wilayas avec codes officiels
- Codes fiscaux: NIF, NIS, RC, AI
- Configuration TVA: 9%, 19%, exonérations

**Interface:**
- Bilingue Français / Arabe
- Tableau de bord KPIs personnalisé
- Rapports PDF format officiels

Conformité: Législation du travail algérienne + Normes SCF appliquées
    """,
    'author': 'LAIDOUDI',
    'website': 'https://github.com/LAIDOUDI33/LAID_ODOO',
    'category': 'Localization/Algeria',
    'license': 'LGPL-3',
    
    'depends': [
        'base',
        'account',
        'hr',
        'hr_contract',
        'hr_payroll',
        'sale',
        'purchase',
        'stock',
        'crm',
        'mrp',
        'l10n_dz',
        'board',
        'web',
        'report',
        'base_vat',
        'partner_contact',
    ],
    
    'data': [
        # Data Files - Algerian Localization
        'data/wilayas_data.xml',
        'data/communes_data.xml',
        'data/tax_configuration.xml',
        'data/irg_tables.xml',
        'data/cnas_rates.xml',
        'data/legal_holidays_dz.xml',
        # View Files - UI Extensions
        'views/menu_items.xml',
        'views/res_partner_views.xml',
        'views/hr_views.xml',
        'views/hr_payslip_views.xml',
        'views/account_views.xml',
        'views/dashboard_views.xml',
        # NEW: MRP Production Views
        'views/mrp_views.xml',
        # NEW: Maintenance Views
        'views/maintenance_views.xml',
        # NEW: BI Analytics Views
        'views/bi_views.xml',
        # NEW: CRM Enhanced Views
        'views/crm_views.xml',
        # Report Templates (QWeb PDF)
        'reports/report_templates.xml',
        # Security Configuration
        'security/ir.model.access.csv',
        'security/security.xml',
    ],
    
    'demo': [
        'demo/company_demo.xml',
    ],
    
    'installable': True,
    'auto_install': False,
    'application': True,
    
    'images': [
        'static/images/hassiba_banner.png',
    ],
    
    'web': True,
}
