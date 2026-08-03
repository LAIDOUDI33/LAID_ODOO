# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class StockMoveLine(models.Model):
    _inherit = 'stock.move.line'

    project_id = fields.Many2one('project.project', 'Project', compute='_compute_project_id', store=True)

    @api.depends('picking_id.project_id')
    def _compute_project_id(self):
        for move_line in self:
            move_line.project_id = False
            if move_line.picking_id:
                move_line.project_id = move_line.picking_id.project_id
