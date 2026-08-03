# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import defaultdict
from odoo import fields, models


class ProductLabelLayout(models.TransientModel):
    _inherit = 'product.label.layout'

    move_ids = fields.Many2many('stock.move')
    print_packaging = fields.Boolean(
        'Print Packaging',
        help="Print labels with each delivery order line's packaging.",
    )
    move_quantity = fields.Selection([
        ('move', 'Operation Quantities'),
        ('custom', 'Custom')], string="Quantity to print", required=True, default='custom')

    def _get_move_label_packaging(self, move):
        return move.packaging_uom_id if self.print_packaging else self.env['uom.uom']

    def _prepare_report_data(self):
        xml_id, data = super()._prepare_report_data()

        if not self.move_ids:
            return xml_id, data

        if self.move_quantity == 'custom':
            if self.print_packaging:
                data['quantity_by_product'] = {}
                data['custom_barcodes'] = defaultdict(list)
                for move in self.move_ids:
                    data['custom_barcodes'][move.product_id.id].append((
                        move.product_id.barcode or '',
                        self.custom_quantity,
                        self._get_move_label_packaging(move).id,
                    ))
        else:
            quantities = defaultdict(int)
            if all(ml.uom_id.is_zero(ml.quantity) for ml in self.move_ids.move_line_ids):
                if self.print_packaging:
                    custom_barcodes = defaultdict(list)
                    for move in self.move_ids:
                        use_reserved = move.uom_id.compare(move.quantity, 0) > 0
                        useable_qty = move.quantity if use_reserved else move.product_uom_qty
                        if not move.uom_id.is_zero(useable_qty):
                            custom_barcodes[move.product_id.id].append((
                                move.product_id.barcode or '',
                                int(useable_qty),
                                self._get_move_label_packaging(move).id,
                            ))
                    data['quantity_by_product'] = {}
                    data['custom_barcodes'] = custom_barcodes
                else:
                    for move in self.move_ids:
                        use_reserved = move.uom_id.compare(move.quantity, 0) > 0
                        useable_qty = move.quantity if use_reserved else move.product_uom_qty
                        if not move.uom_id.is_zero(useable_qty):
                            quantities[move.product_id.id] += useable_qty
                    data['quantity_by_product'] = {p: int(q) for p, q in quantities.items()}
            elif self.move_ids.move_line_ids:
                custom_barcodes = defaultdict(list)
                uom_unit = self.env.ref('uom.product_uom_unit', raise_if_not_found=False)
                for line in self.move_ids.move_line_ids:
                    packaging = self._get_move_label_packaging(line.move_id)
                    if line.uom_id._has_common_reference(uom_unit):
                        if (line.lot_id or line.lot_name) and int(line.quantity):
                            custom_barcodes[line.product_id.id].append((
                                line.lot_id.name or line.lot_name,
                                int(line.quantity),
                                packaging.id,
                            ))
                        elif self.print_packaging:
                            custom_barcodes[line.product_id.id].append((
                                line.product_id.barcode or '',
                                int(line.quantity),
                                packaging.id,
                            ))
                        else:
                            quantities[line.product_id.id] += line.quantity
                    else:
                        if self.print_packaging:
                            custom_barcodes[line.product_id.id].append((
                                line.product_id.barcode or '',
                                1,
                                packaging.id,
                            ))
                        else:
                            quantities[line.product_id.id] = 1
                # Pass only products with some quantity done to the report
                data['quantity_by_product'] = {p: int(q) for p, q in quantities.items() if q}
                data['custom_barcodes'] = custom_barcodes
        return xml_id, data
