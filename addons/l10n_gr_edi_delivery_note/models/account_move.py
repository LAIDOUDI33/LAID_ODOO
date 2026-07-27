from odoo import api, fields, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    l10n_gr_edi_correlated_picking_ids = fields.Many2many(
        'stock.picking',
        compute='_compute_l10n_gr_edi_correlated_picking_ids',
        string='Correlated Delivery Notes',
    )

    @api.depends('move_type', 'invoice_line_ids.sale_line_ids.move_ids.picking_id.l10n_gr_edi_mark')
    def _compute_l10n_gr_edi_correlated_picking_ids(self):
        for move in self:
            if move.move_type == 'out_invoice':  # There will be delivery notes only in cases of out_invoices
                pickings = move.invoice_line_ids.mapped('sale_line_ids.move_ids.picking_id')
                move.l10n_gr_edi_correlated_picking_ids = pickings.filtered(lambda p: p.l10n_gr_edi_mark and p.picking_type_code == 'outgoing')
            else:
                move.l10n_gr_edi_correlated_picking_ids = False

    @api.model
    def _l10n_gr_edi_get_header_correlate(self, move):
        if move.l10n_gr_edi_correlation_id:
            return super()._l10n_gr_edi_get_header_correlate(move)
        correlated_invoices = move.l10n_gr_edi_correlated_picking_ids.mapped('l10n_gr_edi_mark')
        return correlated_invoices[0] if correlated_invoices else ''  # ATM due to a limitation in AADE API we can only return one correlated invoice
