# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - G50 TVA Declaration Report

from odoo import models, api


class G50DeclarationReport(models.AbstractModel):
    _name = 'report.hassiba_suite.g50_declaration_template'
    _description = 'Rapport Déclaration TVA G50'
    _inherit = 'report.abstract_report'

    @api.model
    def _get_report_values(self, docids, data=None):
        """Get report data for G50 declaration"""
        wizards = self.env['tva.declaration.wizard'].browse(docids)
        
        docs = []
        for wiz in wizards:
            # Recalculate to ensure fresh data
            wiz._compute_totals()
            wiz._compute_solde()
            
            docs.append({
                'period_name': f"{dict(wiz._fields['month'].selection).get(wiz.month)} {wiz.year}",
                'company': wiz.company_id,
                'nif': wiz.company_id.nif or '',
                'nis': wiz.company_id.nis or '',
                'rc': wiz.company_id.rc or '',
                'tva_collectee': wiz.tva_collectee,
                'tva_deductible': wiz.tva_deductible,
                'solde_tva': wiz.solde_tva,
                'nb_factures_vente': wiz.nb_factures_vente,
                'nb_factures_achat': wiz.nb_factures_achat,
            })
        
        return {
            'docs': docs,
            'date_impression': fields.Date.today(),
        }
