from odoo import fields, models


class L10nJpTotalAverageCostWizard(models.TransientModel):
    _name = 'l10n_jp.total.average.cost.wizard'
    _description = 'JGAAP Total Average Cost Evaluator'

    category_id = fields.Many2one('product.category', string='Category', required=True)
    date_from = fields.Date(string='Start Date', required=True, default=fields.Date.context_today)
    date_to = fields.Date(string='End Date', required=True, default=fields.Date.context_today)

    def action_apply_total_average_cost(self):
        products = self.env['product.product'].search([
            ('categ_id', 'child_of', self.category_id.id),
        ]).filtered(lambda p: p.cost_method == 'standard')
        for product in products:
            moves = self.env['stock.move'].search([
                ('product_id', '=', product.id),
                ('company_id', '=', self.env.company.id),
                ('state', '=', 'done'),
                ('date', '<=', fields.Datetime.to_datetime(self.date_to).replace(hour=23, minute=59, second=59)),
            ])
            init_qty = 0.0
            purchases_qty = purchases_val = returns_qty = returns_val = 0.0
            for m in moves:
                m_date = m.date.date()
                qty = m.quantity_product_uom
                if m_date < self.date_from:
                    if m.location_dest_id.usage == 'internal' and m.location_id.usage != 'internal':
                        init_qty += qty
                    elif m.location_id.usage == 'internal' and m.location_dest_id.usage != 'internal':
                        init_qty -= qty
                else:
                    # purchase
                    if m.location_id.usage in ('supplier', 'transit') and m.location_dest_id.usage == 'internal':
                        purchases_qty += qty
                        purchases_val += qty * self._get_purchase_unit_price(m)
                    # purchase return
                    elif m.location_id.usage == 'internal' and m.location_dest_id.usage == 'supplier':
                        returns_qty += qty
                        returns_val += qty * self._get_purchase_unit_price(m)
                    # drop-ship: the goods are purchased and sold without ever entering
                    # the stock, but they are part of the goods available for sale and
                    # thus of the total average cost base (総平均法)
                    elif m.location_id.usage == 'supplier' and m.location_dest_id.usage == 'customer':
                        purchases_qty += qty
                        purchases_val += qty * self._get_purchase_unit_price(m)
                    # drop-ship return
                    elif m.location_id.usage == 'customer' and m.location_dest_id.usage == 'supplier':
                        returns_qty += qty
                        returns_val += qty * self._get_purchase_unit_price(m)

            init_val = init_qty * product.standard_price
            tot_qty = init_qty + purchases_qty - returns_qty
            tot_val = init_val + purchases_val - returns_val
            if tot_qty > 0:
                product.standard_price = tot_val / tot_qty

    def _get_purchase_unit_price(self, move):
        """Unit price of a purchase move, in the company currency, taken from its
        purchase order line and converted at the move date, so that exchange rate
        fluctuations between the purchase order and the receipt are accounted for,
        like the perpetual valuation does. Returns use the price of the move they
        return from. Falls back on the price stored on the move for moves that
        are not linked to a purchase order line.

        The evaluation is limited to the company the wizard is run in, and to
        the purchase order price: landed costs and billed price differences are
        perpetual-valuation concepts and are out of scope, as are drop-shipped
        goods transiting through a cross-company location.
        """
        self.ensure_one()
        if move.origin_returned_move_id:
            return self._get_purchase_unit_price(move.origin_returned_move_id)
        if 'purchase_line_id' in self.env['stock.move']._fields and move.purchase_line_id:
            return move.purchase_line_id._get_stock_move_price_unit(move.date.date())
        return move.price_unit
