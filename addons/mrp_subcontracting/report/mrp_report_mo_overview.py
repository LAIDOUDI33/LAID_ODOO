from odoo import models


class ReportMrpReport_Mo_Overview(models.AbstractModel):
    _inherit = 'report.mrp.report_mo_overview'

    def _include_pdf_specifics(self, doc, data=None):
        result = super()._include_pdf_specifics(doc, data)
        if result['show_availabilities'] and result['summary'].get('is_subcontract'):
            result['footer_colspan'] += 1
        return result

    def _get_mo_summary(self, production, components, operations, current_mo_cost, current_bom_cost, current_real_cost, remaining_cost_share):
        data = super()._get_mo_summary(
            production, components, operations, current_mo_cost, current_bom_cost, current_real_cost, remaining_cost_share)
        if not production.subcontractor_id:
            return data

        product = production.product_id.with_context(location=production.location_src_id.id)
        data['is_subcontract'] = True
        if product.is_storable:
            data['subcontract_free_qty'] = product.uom_id._compute_quantity(
                max(product.free_qty, 0), production.uom_id,
            )
            data['subcontract_qty_on_hand'] = product.uom_id._compute_quantity(
                product.qty_available, production.uom_id,
            )
        return data

    def _format_component_move(self, production, move_raw, replenishments, replenish_data, level, index):
        data = super()._format_component_move(
            production, move_raw, replenishments, replenish_data, level, index)
        if not production.subcontractor_id:
            return data

        product = move_raw.product_id.with_context(location=production.location_src_id.id)
        data['receipt'] = self._check_planned_start(
            production.date_start, self._get_component_receipt(product, move_raw, replenishments, replenish_data),
        )
        if product.is_storable:
            data['subcontract_free_qty'] = move_raw.product_id.uom_id._compute_quantity(
                max(product.free_qty, 0), move_raw.uom_id,
            )
            data['subcontract_qty_on_hand'] = move_raw.product_id.uom_id._compute_quantity(
                product.qty_available, move_raw.uom_id,
            )
        return data

    def _get_location_ids(self, production, replenish_data):
        if production.subcontractor_id:
            return [loc['id'] for loc in self.env['stock.location'].search_fetch(
                [('id', 'child_of', production.location_src_id.id)],
                ['id'],
            )]
        return super()._get_location_ids(production, replenish_data)
