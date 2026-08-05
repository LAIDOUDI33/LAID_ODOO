# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Payslip Report (Bulletin de Paie DZ)

from odoo import models, api


class DZPayslipReport(models.AbstractModel):
    _name = 'report.hassiba_suite.dz_payslip_report_template'
    _description = 'Rapport Bulletin de Paie Algérien'
    _inherit = 'report.abstract_report'

    @api.model
    def _get_report_values(self, docids, data=None):
        """Get report data for payslip"""
        payslips = self.env['hr.payslip'].browse(docids)
        
        docs = []
        for slip in payslips:
            docs.append(slip.get_bulletin_data())
        
        return {
            'docs': docs,
            'company': self.env.company,
        }
