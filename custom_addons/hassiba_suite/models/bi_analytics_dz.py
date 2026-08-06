# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Business Intelligence Module for Algeria

from odoo import models, fields, api, _
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


class BIDashboardDZ(models.Model):
    _name = 'bi.dashboard.dz'
    _description = 'Tableau de Bord BI HASSIBA'
    _auto = False

    # This is a virtual model for dashboard aggregation
    name = fields.Char(string='Période')
    
    # HR KPIs
    total_employees = fields.Integer(string='Total Employés')
    new_hires_month = fields.Integer(string='Nouvelles Embauches')
    departures_month = fields.Integer(string='Départs')
    turnover_rate = fields.Float(string="Taux de Rotation (%)")
    
    # Payroll KPIs
    masse_salariale = fields.Float(string='Masse Salariale (DZD)')
    salaire_moyen = fields.Float(string='Salaire Moyen (DZD)')
    total_cnas = fields.Float(string='Total CNAS (DZD)')
    total_irg = fields.Float(string='Total IRG (DZD)')
    cout_employe_moyen = fields.Float(string="Coût Employé Moyen (DZD)")
    
    # Finance KPIs
    chiffre_affaires = fields.Float(string="Chiffre d'Affaires (DZD)")
    tva_collectee = fields.Float(string='TVA Collectée (DZD)')
    tva_deductible = fields.Float(string='TVA Déductible (DZD)')
    solde_tva = fields.Float(string='Solde TVA (DZD)')
    benefice_net = fields.Float(string='Bénéfice Net (DZD)')
    marge_nette_pct = fields.Float(string="Marge Nette (%)")
    
    # Sales KPIs
    nb_factures = fields.Integer(string='Nombre Factures')
    panier_moyen = fields.Float(string="Panier Moyen (DZD)")
    top_client_ca = fields.Char(string='Top Client')
    
    # Production KPIs
    production_qty = fields.Float(string='Quantité Produite')
    production_value = fields.Float(string='Valeur Production (DZD))
    taux_rendement = fields.Float(string="Taux de Rendement (%)")
    cout_production_unitaire = fields.Float(string='Coût Unitaire Production (DZD)')
    
    # Maintenance KPIs
    equipements_actifs = fields.Integer(string='Équipements Actifs')
    interventions_mois = fields.Integer(string='Interventions du Mois')
    temps_arret_total = fields.Float(string="Temps d'Arrêt Total (h)")
    disponibilite_pct = fields.Float(string='Disponibilité (%)')
    cout_maintenance_mois = fields.Float(string='Coût Maintenance Mois (DZD)')


class BIReportGenerator(models.TransientModel):
    _name = 'bi.report.generator.dz'
    _description = 'Générateur de Rapports BI HASSIBA'

    # Report Type
    type_rapport = fields.Selection([
        ('mensuel', 'Rapport Mensuel Complet'),
        ('trimestriel', 'Rapport Trimestriel'),
        ('annuel', 'Rapport Annuel'),
        ('hr', 'Rapport RH & Paie'),
        ('finance', 'Rapport Financier'),
        ('production', 'Rapport Production'),
        ('maintenance', 'Rapport Maintenance'),
        ('commercial', 'Rapport Commercial'),
        ('tva', 'Déclaration TVA G50'),
    ], string='Type de Rapport', required=True)
    
    # Period
    date_from = fields.Date(
        string='Date Début',
        default=lambda self: (fields.Date.today().replace(day=1)))
    date_to = fields.Date(
        string='Date Fin',
        default=fields.Date.today
    )
    
    company_id = fields.Many2one(
        'res.company',
        string='Société',
        default=lambda self: self.env.company
    )
    
    # Options
    include_graphiques = fields.Boolean(
        string='Inclure Graphiques',
        default=True
    )
    include_details = fields.Boolean(
        string='Inclure Détails',
        default=True
    )
    format_export = fields.Selection([
        ('pdf', 'PDF'),
        ('xlsx', 'Excel (XLSX)'),
        ('html', 'HTML'),
    ], string="Format d'Export", default='pdf')

    # Computed Data
    data_resume = fields.Text(
        string='Résumé des Données',
        compute='_compute_data'
    )

    @api.depends('type_rapport', 'date_from', 'date_to')
    def _compute_data(self):
        """Generate report summary data"""
        for report in self:
            lines = []
            
            if report.type_rapport in ['mensuel', 'trimestriel', 'annuel', 'finance']:
                # Finance data
                invoices = self.env['account.move'].search([
                    ('move_type', '=', 'out_invoice'),
                    ('state', '=', 'posted'),
                    ('invoice_date', '>=', report.date_from),
                    ('invoice_date', '<=', report.date_to),
                ])
                ca = sum(inv.amount_total for inv in invoices)
                tva_col = sum(inv.amount_tax for inv in invoices)
                lines.append(f"CA: {ca:,.2f} DZD")
                lines.append(f"TVA Collectée: {tva_col:,.2f} DZD")
                lines.append(f"Nb Factures: {len(invoices)}")

            if report.type_rapport in ['mensuel', 'trimestriel', 'annuel', 'hr']:
                # HR/Payroll data
                payslips = self.env['hr.payslip'].search([
                    ('state', '=', 'done'),
                    ('date_to', '>=', report.date_from),
                    ('date_to', '<=', report.date_to),
                ])
                masse_sal = sum(ps.montant_brut for ps in payslips if hasattr(ps, 'montant_brut'))
                lines.append(f"Masse Salariale: {masse_sal:,.2f} DZD")
                lines.append(f"Bulletins: {len(payslips)}")

            if report.type_rapport == 'production':
                productions = self.env['mrp.production'].search([
                    ('state', '=', 'done'),
                    ('date_planned_start', '>=', report.date_from),
                    ('date_planned_start', '<=', report.date_to),
                ])
                lines.append(f"Ordres Terminés: {len(productions)}")

            if report.type_rapport == 'maintenance':
                interventions = self.env['maintenance.intervention.dz'].search([
                    ('date_creation', '>=', report.date_from),
                    ('date_creation', '<=', report.date_to),
                ])
                lines.append(f"Interventions: {len(interventions)}")

            report.data_resume = '\n'.join(lines) if lines else 'Aucune donnée disponible'

    def action_generer_rapport(self):
        """Generate and return the report"""
        self.ensure_one()
        
        # Create or update a bi.report.record with computed data
        record = self.env['bi.report.record.dz'].create({
            'name': f"{dict(self._fields['type_rapport'].selection).get(self.type_rapport)} - {self.date_from} au {self.date_to}",
            'type_rapport': self.type_rapport,
            'date_from': self.date_from,
            'date_to': self.date_to,
            'company_id': self.company_id.id,
            'data_json': self._get_report_data_json(),
        })
        
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'bi.report.record.dz',
            'res_id': record.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def _get_report_data_json(self):
        """Get all report data as JSON structure"""
        import json
        
        data = {
            'period': {
                'from': str(self.date_from),
                'to': str(self.date_to),
            },
            'company': self.company_id.name,
        }
        
        # Add finance data
        invoices = self.env['account.move'].search([
            ('move_type', '=', 'out_invoice'),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', self.date_from),
            ('invoice_date', '<=', self.date_to),
        ])
        data['finance'] = {
            'nb_factures': len(invoices),
            'chiffre_affaires': sum(inv.amount_total for inv in invoices),
            'tva_collectee': sum(inv.amount_tax for inv in invoices),
            'top_clients': [],
        }
        
        # Top 5 clients by CA
        clients_data = {}
        for inv in invoices:
            key = inv.partner_id.id
            if key not in clients_data:
                clients_data[key] = {'name': inv.partner_id.name, 'total': 0}
            clients_data[key]['total'] += inv.amount_total
        sorted_clients = sorted(clients_data.values(), key=lambda x: x['total'], reverse=True)[:5]
        data['finance']['top_clients'] = sorted_clients

        # Add HR data
        payslips = self.env['hr.payslip'].search([
            ('state', '=', 'done'),
            ('date_to', '>=', self.date_from),
            ('date_to', '<=', self.date_to),
        ])
        data['hr'] = {
            'nb_bulletins': len(payslips),
            'masse_salariale': sum(getattr(ps, 'montant_brut', 0) for ps in payslips),
            'total_cnas': sum(getattr(ps, 'montant_cnas_patronal', 0) for ps in payslips),
            'total_irg': sum(getattr(ps, 'montant_irg', 0) for ps in payslips),
        }
        
        # Add sales by wilaya
        wilaya_data = {}
        for inv in invoices:
            wilaya = inv.partner_id.wilaya_id.name if inv.partner_id.wilaya_id else 'Non défini'
            if wilaya not in wilaya_data:
                wilaya_data[wilaya] = {'count': 0, 'total': 0}
            wilaya_data[wilaya]['count'] += 1
            wilaya_data[wilaya]['total'] += inv.amount_total
        data['sales_by_wilaya'] = wilaya_data

        return json.dumps(data, ensure_ascii=False, indent=2)


class BIReportRecord(models.Model):
    _name = 'bi.report.record.dz'
    _description = 'Enregistrement Rapport BI'
    _order = 'create_date desc'

    name = fields.Char(string='Nom du Rapport')
    type_rapport = fields.Selection([
        ('mensuel', 'Rapport Mensuel Complet'),
        ('trimestriel', 'Rapport Trimestriel'),
        ('annuel', 'Rapport Annuel'),
        ('hr', 'Rapport RH & Paie'),
        ('finance', 'Rapport Financier'),
        ('production', 'Rapport Production'),
        ('maintenance', 'Rapport Maintenance'),
        ('commercial', 'Rapport Commercial'),
        ('tva', 'Déclaration TVA G50'),
    ], string='Type de Rapport')
    
    date_from = fields.Date(string='Date Début')
    date_to = fields.Date(string='Date Fin')
    company_id = fields.Many2one('res.company', string='Société')
    
    data_json = fields.Text(string='Données (JSON)')
    
    state = fields.Selection([
        ('brouillon', 'Brouillon'),
        ('genere', 'Généré'),
        ('exporte', 'Exporté'),
    ], string='État', default='genere')
    
    create_uid = fields.Many2one('res.users', string='Créé par', readonly=True)
    create_date = fields.Datetime(string='Date Création', readonly=True)

    def action_export_pdf(self):
        """Export to PDF"""
        self.ensure_one()
        return self.env.ref('hassiba_suite.bi_report_pdf').report_action(self)

    def action_export_xlsx(self):
        """Export to Excel"""
        self.ensure_one()
        # Would need xlsx report defined
        raise UserError(_('Export Excel en cours de développement'))


class BIKPIWidget(models.Model):
    _name = 'bi.kpi.widget.dz'
    _description = 'Widget KPI Personnalisable'

    name = fields.Char(string='Nom du Widget', required=True)
    
    widget_type = fields.Selection([
        ('number', 'Nombre Simple'),
        ('progress', 'Barre de Progression'),
        ('graph_line', 'Graphique Lignes'),
        ('graph_bar', 'Graphique Barres'),
        ('graph_pie', 'Graphique Camembert'),
        ('list', 'Liste'),
        ('comparison', 'Comparaison'),
    ], string='Type de Widget', required=True, default='number')
    
    # Data Source
    model_source = fields.Char(
        string='Modèle Source',
        help='Ex: hr.payslip, account.move, mrp.production'
    )
    field_measure = fields.Char(
        string='Champ Mesure',
        help='Ex: montant_brut, amount_total, product_qty'
    )
    field_aggregation = fields.Selection([
        ('sum', 'Somme'),
        ('avg', 'Moyenne'),
        ('count', 'Compte'),
        ('min', 'Minimum'),
        ('max', 'Maximum'),
    ], string='Agrégation', default='sum')
    
    # Display
    kpi_label = fields.Chars(string='Libellé KPI', size=100)
    suffixe = fields.Char(
        string='Suffixe',
        help='Ex: DZD, %, h, unités'
    )
    prefixe = fields.Char(
        string='Préfixe',
        help='Ex: €, $, DA'
    )
    couleur = fields.Selection([
        ('primary', 'Bleu'),
        ('success', 'Vert'),
        ('warning', 'Orange'),
        ('danger', 'Rouge'),
        ('info', 'Cyan'),
        ('secondary', 'Gris'),
    ], string='Couleur', default='primary')
    
    # Filters
    domain_filter = fields.Char(
        string='Filtre Domain',
        help='Domain Odoo. Ex: [("state", "=", "done")]'
    )
    
    # Target/Goal
    valeur_cible = fields.Float(
        string='Valeur Cible',
        help='Pour les widgets progression/comparaison'
    )
    
    # Position on Dashboard
    sequence = fields.Integer(string='Ordre', default=10)
    dashboard_id = fields.Many2one(
        'bi.dashboard.config.dz',
        string='Tableau de Bord'
    )
    
    # Computed Value
    current_value = fields.Float(
        string='Valeur Actuelle',
        compute='_compute_value'
    )
    variation_pct = fields.Float(
        string='Variation (%)',
        compute='_compute_variation'
    )

    @api.depends('model_source', 'field_measure', 'field_aggregation', 'domain_filter')
    def _compute_value(self):
        """Compute KPI value from source"""
        for widget in self:
            try:
                if not widget.model_source or not widget.field_measure:
                    widget.current_value = 0
                    continue
                
                model = self.env[widget.model_source]
                domain = []
                
                if widget.domain_filter:
                    import ast
                    try:
                        domain = ast.literal_eval(widget.domain_filter)
                    except:
                        domain = []
                
                records = model.search(domain)
                
                if widget.field_aggregation == 'sum':
                    widget.current_value = sum(records.mapped(widget.field_measure)) if records else 0
                elif widget.field_aggregation == 'avg':
                    values = records.mapped(widget.field_measure)
                    widget.current_value = sum(values) / len(values) if values else 0
                elif widget.field_aggregation == 'count':
                    widget.current_value = len(records)
                elif widget.field_aggregation == 'min':
                    values = records.mapped(widget.field_measure)
                    widget.current_value = min(values) if values else 0
                elif widget.field_aggregation == 'max':
                    values = records.mapped(widget.field_measure)
                    widget.current_value = max(values) if values else 0
            except Exception as e:
                widget.current_value = 0

    @api.depends('current_value', 'valeur_cible')
    def _compute_variation(self):
        for widget in self:
            if widget.valeur_cible and widget.current_value:
                widget.variation_pct = round(
                    ((widget.current_value - widget.valeur_cible) / widget.valeur_cible) * 100, 2
                )
            else:
                widget.variation_pct = 0


class BIDashboardConfig(models.Model):
    _name = 'bi.dashboard.config.dz'
    _description = 'Configuration Tableau de Bord Personnalisé'

    name = fields.Char(string='Nom du Tableau de Bord', required=True)
    
    description = fields.Text(string='Description')
    
    active = fields.Boolean(string='Actif', default=True)
    
    is_default = fields.Boolean(
        string='Tableau de Bord par Défaut',
        default=False
    )
    
    layout = fields.Selection([
        ('grid_2x2', 'Grille 2x2'),
        ('grid_3x2', 'Grille 3x2'),
        ('grid_4x1', 'Grille 4 Colonnes'),
        ('full_width', 'Pleine Largeur'),
    ], string='Disposition', default='grid_2x2')
    
    refresh_interval = fields.Integer(
        string="Rafrîchissement (minutes)",
        default=30,
        help='Fréquence de rafraîchissement automatique des données'
    )
    
    widget_ids = fields.One2many(
        'bi.kpi.widget.dz',
        'dashboard_id',
        string='Widgets'
    )
    
    user_ids = fields.Many2many(
        'res.users',
        'dashboard_user_rel',
        'dashboard_id',
        'user_id',
        string='Utilisateurs Autorisés'
    )
    
    nb_widgets = fields.Integer(
        string='Nombre de Widgets',
        compute='_compute_nb_widgets'
    )
    
    @api.depends('widget_ids')
    def _compute_nb_widgets(self):
        for dashboard in self:
            dashboard.nb_widgets = len(dashboard.widget_ids)

    def action_view_dashboard(self):
        """Open dashboard view"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.name,
            'res_model': 'bi.dashboard.config.dz',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'current',
            'context': dict(self.env.context, dashboard_preview=True),
        }


# ==============================
# ANALYTIC VIEWS / PIVOT HELPERS  
# ==============================

class BISalesAnalytics(models.Model):
    _name = 'bi.sales.analytics.dz'
    _description = 'Analyse des Ventes par Région (DZ)'
    
    # This is computed via Python for simplicity and compatibility
    name = fields.Char(string='Période')
    wilaya_id = fields.Many2one('dz.wilaya', string='Wilaya')
    partner_id = fields.Many2one('res.partner', string='Client')
    month = fields.Integer(string='Mois')
    year = fields.Integer(string='Année')
    
    # Measures
    nb_factures = fields.Integer(string='Nombre Factures')
    chiffre_affaires = fields.Float(string="Chiffre d'Affaires (DZD)")
    montant_tva = fields.Float(string='Montant TVA (DZD)')
    panier_moyen = fields.Float(string='Panier Moyen (DZD)')
    
    @api.model
    def action_refresh_analytics(self):
        """Refresh sales analytics data from invoices"""
        # Delete old records
        self.search([]).unlink()
        
        # Get all posted invoices
        invoices = self.env['account.move'].search([
            ('move_type', '=', 'out_invoice'),
            ('state', '=', 'posted'),
        ])
        
        # Group by wilaya and month
        from collections import defaultdict
        grouped = defaultdict(lambda: {
            'count': 0, 
            'ca': 0, 
            'tva': 0,
            'partners': set()
        })
        
        for inv in invoices:
            key = (
                inv.partner_id.wilaya_id.id if inv.partner_id.wilaya_id else None,
                inv.invoice_date.month if inv.invoice_date else 1,
                inv.invoice_date.year if inv.invoice_date else 2024,
            )
            grouped[key]['count'] += 1
            grouped[key]['ca'] += inv.amount_total
            grouped[key]['tva'] += inv.amount_tax
        
        # Create records
        for (wilaya_id, month, year), data in grouped.items():
            self.create({
                'name': f'{month}/{year}',
                'wilaya_id': wilaya_id,
                'month': month,
                'year': year,
                'nb_factures': data['count'],
                'chiffre_affaires': data['ca'],
                'montant_tva': data['tva'],
                'panier_moyen': data['ca'] / max(data['count'], 1),
            })
