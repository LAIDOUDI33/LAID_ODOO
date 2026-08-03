# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

<<<<<<< 3c6eb613784dc6482a269bc45de071642b03c371
from odoo import _, api, models
||||||| 07b5c04bb7c149ca1a084bf8abdf489c1b264fe5
from collections import defaultdict

from odoo import _, api, models, fields
from odoo.tools.float_utils import float_is_zero, float_round
=======
from collections import defaultdict

from odoo import _, api, models, fields
from odoo.tools.float_utils import float_compare, float_is_zero, float_round
>>>>>>> 54e43839fc5aed5454c8defff7558b6e0e974212
from odoo.exceptions import UserError


class StockMove(models.Model):
    _inherit = 'stock.move'

    @api.depends('bom_line_id')
    def _compute_packaging_uom_id(self):
        super()._compute_packaging_uom_id()
        for move in self:
            if move.bom_line_id and move.bom_line_id.bom_id.type == 'phantom':
                move.packaging_uom_id = move.product_uom

    def _get_cost_ratio(self, quantity):
        self.ensure_one()
        if self.bom_line_id.bom_id.type == "phantom" and self.purchase_line_id.product_id != self.product_id:
            uom_quantity = self.product_uom._compute_quantity(self.quantity, self.product_id.uom_id)
            if not self.product_id.uom_id.is_zero(uom_quantity):
                unit_kit_purchase = 1
                if self.purchase_line_id:
                    active_moves = self.purchase_line_id.move_ids.filtered(lambda m:
                        m.state != 'cancel' and m.product_id == self.product_id and m.picking_id != self.picking_id,
                    )
                    active_quantity = quantity + sum(
                        move.product_uom._compute_quantity(move.quantity, self.product_id.uom_id)
                        for move in active_moves
                    )
                    if active_quantity:
                        purchase_qty = self.purchase_line_id.product_uom_id._compute_quantity(
                            self.purchase_line_id.product_qty,
                            self.purchase_line_id.product_id.uom_id,
                        )
                        unit_kit_purchase = (quantity / active_quantity) * purchase_qty
                return (self.cost_share / 100) * (quantity / uom_quantity) * unit_kit_purchase
        return super()._get_cost_ratio(quantity)

    def _get_value_from_bill(self, aml):
        value = super()._get_value_from_bill(aml)
        if self.bom_line_id.bom_id.type == "phantom":
            value *= (self.cost_share / 100)
        return value

    def _get_quantity_from_bill(self, aml, quantity):
        self.ensure_one()
        if self.bom_line_id.bom_id.type == "phantom":
            return aml.product_uom_id._compute_quantity(quantity, self.product_id.uom_id)
        return super()._get_quantity_from_bill(aml, quantity)

    def _prepare_phantom_move_values(self, bom_line, product_qty, quantity_done):
        vals = super()._prepare_phantom_move_values(bom_line, product_qty, quantity_done)
        if self.purchase_line_id:
            vals['purchase_line_id'] = self.purchase_line_id.id
        return vals

<<<<<<< 3c6eb613784dc6482a269bc45de071642b03c371
||||||| 07b5c04bb7c149ca1a084bf8abdf489c1b264fe5
    def _get_price_unit(self):
        if self.product_id == self.purchase_line_id.product_id or not self.bom_line_id or self._should_ignore_pol_price():
            return super()._get_price_unit()
        line = self.purchase_line_id
        # price_unit here with uom of product
        kit_price_unit = line._get_gross_price_unit()
        bom_line = self.bom_line_id
        bom = bom_line.bom_id
        if line.currency_id != self.company_id.currency_id:
            kit_price_unit = line.currency_id._convert(kit_price_unit, self.company_id.currency_id, self.company_id, fields.Date.context_today(self), round=False)
        cost_share = self.cost_share / 100
        uom_factor = 1.0
        kit_product = bom.product_id or bom.product_tmpl_id

        # Convert uom from product_uom to bom_uom for kit product
        uom_factor = bom.product_uom_id._compute_quantity(uom_factor, kit_product.uom_id)

        # Convert uom from bom_line_uom to product_uom for bom_line
        uom_factor = bom_line.product_id.uom_id._compute_quantity(uom_factor, bom_line.product_uom_id)

        price_unit = kit_price_unit * cost_share * uom_factor * bom.product_qty / bom_line.product_qty
        if self.product_id.lot_valuated:
            return {lot: price_unit for lot in self.lot_ids}
        else:
            return {self.env['stock.lot']: price_unit}

=======
    def _get_price_unit(self):
        if self.product_id == self.purchase_line_id.product_id or not self.bom_line_id or self._should_ignore_pol_price():
            return super()._get_price_unit()
        line = self.purchase_line_id
        # price_unit here with uom of product
        kit_price_unit = line._get_gross_price_unit()
        if line.currency_id != self.company_id.currency_id:
            kit_price_unit = line.currency_id._convert(kit_price_unit, self.company_id.currency_id, self.company_id, fields.Date.context_today(self), round=False)
        purchase_qty = self.purchase_line_id.product_uom_id._compute_quantity(
            self.purchase_line_id.product_qty,
            self.purchase_line_id.product_id.uom_id,
        )
        cost_share = self.cost_share / 100
        price_unit = kit_price_unit * cost_share * purchase_qty * self._get_kit_ratio()
        if self.product_id.lot_valuated:
            return {lot: price_unit for lot in self.lot_ids}
        else:
            return {self.env['stock.lot']: price_unit}

    def _get_kit_ratio(self):
        self.ensure_one()
        kit_ratio = 1
        if self.bom_line_id.bom_id.type == "phantom" and self.purchase_line_id and self.purchase_line_id.product_id != self.product_id:
            active_demand = self.product_qty
            for move in self.purchase_line_id.move_ids:
                if (
                    move.state != 'cancel'
                    and move.product_id == self.product_id
                    and move.picking_id != self.picking_id
                    and move.bom_line_id == self.bom_line_id
                    and float_compare(move.cost_share, self.cost_share, precision_digits=6) == 0
                ):
                    active_demand += move.product_qty
            if not float_is_zero(1, precision_rounding=self.product_id.uom_id.rounding):
                kit_ratio = (1 / active_demand)
        return kit_ratio

    def _merge_moves_fields(self):
        res = super()._merge_moves_fields()
        if not self.env.context.get('merge_extra'):
            res['cost_share'] = sum(self.mapped('cost_share'))
        return res

>>>>>>> 54e43839fc5aed5454c8defff7558b6e0e974212
    def _get_valuation_price_and_qty(self, related_aml, to_curr):
        valuation_price_unit_total, valuation_total_qty = super()._get_valuation_price_and_qty(related_aml, to_curr)
        boms = self.env['mrp.bom']._bom_find(related_aml.product_id, company_id=related_aml.company_id.id, bom_type='phantom')
        if related_aml.product_id in boms:
            kit_bom = boms[related_aml.product_id]
            order_qty = related_aml.product_id.uom_id._compute_quantity(related_aml.quantity, kit_bom.product_uom_id)
            filters = {
                'incoming_moves': lambda m: m.location_id.usage == 'supplier' and (not m.origin_returned_move_id or (m.origin_returned_move_id and m.to_refund)),
                'outgoing_moves': lambda m: m.location_id.usage != 'supplier' and m.to_refund
            }
            valuation_total_qty = self._compute_kit_quantities(related_aml.product_id, order_qty, kit_bom, filters)
            valuation_total_qty = kit_bom.product_uom_id._compute_quantity(valuation_total_qty, related_aml.product_id.uom_id)
            if related_aml.product_uom_id.rounding or related_aml.product_id.uom_id.is_zero(valuation_total_qty):
                raise UserError(_('Odoo is not able to generate the anglo saxon entries. The total valuation of %s is zero.', related_aml.product_id.display_name))
        return valuation_price_unit_total, valuation_total_qty

    def _get_qty_received_without_self(self):
        line = self.purchase_line_id
        if line and line.qty_received_method == 'stock_moves' and line.state != 'cancel' and any(move.product_id != line.product_id for move in line.move_ids):
            kit_bom = self.env['mrp.bom']._bom_find(line.product_id, company_id=line.company_id.id, bom_type='phantom').get(line.product_id)
            if kit_bom:
                return line._compute_kit_quantities_from_moves(line.move_ids - self, kit_bom)
        return super()._get_qty_received_without_self()
