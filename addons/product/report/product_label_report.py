from collections import defaultdict
from io import BytesIO

import markupsafe
from PIL import Image

from odoo import _, models
from odoo.exceptions import UserError


_ZPL_BARCODE_DIMENSIONS = {
    'normal': (447, 80),
    'alternative': (396, 64),
    'small': (244, 70),
    'jewelry': (175, 76),
}


class ReportProductLabelBase(models.AbstractModel):
    _name = 'report.product.label.base'
    _description = 'Base Product Label Report'

    def _show_base_unit_price(self):
        return self.env['res.groups']._is_feature_enabled('product.group_show_uom_price')

    def _prepare_zpl_barcode_graphic(self, barcode, width, height):
        barcode_png = self.env['ir.actions.report'].barcode(
            'Code128',
            barcode,
            width=width,
            height=height,
            quiet=False,
        )
        with Image.open(BytesIO(barcode_png)) as barcode_image:
            image = barcode_image.convert('L')
        bytes_per_row = (width + 7) // 8
        graphic = bytearray(bytes_per_row * height)
        pixels = image.load()
        for y in range(height):
            row_offset = y * bytes_per_row
            for x in range(width):
                if pixels[x, y] < 128:
                    graphic[row_offset + x // 8] |= 0x80 >> (x % 8)

        return {
            'bytes_per_row': bytes_per_row,
            'data': graphic.hex().upper(),
            'total_bytes': len(graphic),
        }

    def _prepare_label(self, product, barcode, pricelist, extra_html, price_included, packaging=None):
        currency_id = pricelist.currency_id or product.currency_id
        price = pricelist._get_product_price(
            product,
            1,
            currency=currency_id,
            uom=packaging,
        )
        base_unit_price = (
            product._get_base_unit_price(price)
            if self._show_base_unit_price() and product.base_unit_count and product.base_unit_name
            else 0
        )
        return {
            'barcode': barcode,
            'identifier_text': barcode or '',
            'base_unit_name': product.base_unit_name or '',
            'base_unit_price': base_unit_price,
            'product_code': product.default_code or '',
            'currency_id': currency_id,
            'extra_html': extra_html,
            'invisible': False,
            'label_class': 'o_label_with_price' if price_included else 'o_label_without_meta_block',
            'price': price,
            'price_included': price_included,
            'packaging_name': packaging.display_name if packaging else '',
            'title': product.display_name if product.is_product_variant else product.name,
        }

    def _prepare_invisible_label(self):
        return {'invisible': True}

    def _prepare_labels(self, quantity_by_product, pricelist, extra_html, price_included, packaging=None):
        labels = []
        for product, barcodes_qtys in quantity_by_product.items():
            for barcode_qty in barcodes_qtys:
                barcode, quantity = barcode_qty[:2]
                label_packaging = self.env['uom.uom'].browse(barcode_qty[2]) if len(barcode_qty) > 2 else packaging
                for _qty in range(quantity):
                    labels.append(self._prepare_label(
                        product, barcode, pricelist, extra_html, price_included, label_packaging
                    ))
        return labels

    def _organize_labels(self, labels, rows=1, columns=1):
        slots_per_page = rows * columns
        if not labels:
            return []

        organized_pages = []
        for page_start in range(0, len(labels), slots_per_page):
            page_labels = list(labels[page_start:page_start + slots_per_page])
            while len(page_labels) < slots_per_page:
                page_labels.append(self._prepare_invisible_label())
            organized_pages.append([
                page_labels[row_start:row_start + columns]
                for row_start in range(0, slots_per_page, columns)
            ])
        return organized_pages

    def _get_report_label_values(self, labels, rows, columns):
        label_pages = self._organize_labels(labels, rows=rows, columns=columns)
        return {
            'label_pages': label_pages,
            'page_numbers': len(label_pages),
        }

    def _get_product_model(self, data):
        if data.get('active_model') == 'product.template':
            return self.env['product.template'].with_context(display_default_code=False)
        if data.get('active_model') == 'product.product':
            return self.env['product.product'].with_context(display_default_code=False)
        raise UserError(_('Product model not defined, Please contact your administrator.'))

    def _build_quantity_by_product(self, Product, docids, data):
        quantity_by_product = defaultdict(list)
        if data.get("studio") and docids:
            products = self.env['product.template'].with_context(display_default_code=False).browse(docids)
            for product in products:
                quantity_by_product[product].append((product.barcode, 1))

        qty_by_product_in = data.get('quantity_by_product')
        if qty_by_product_in:
            products = Product.search([('id', 'in', [int(p) for p in qty_by_product_in])], order='name desc')
            for product in products:
                # from js report action handler, int keys are converted to str, but from report_action method, kept as int
                q = qty_by_product_in.get(str(product.id)) or qty_by_product_in.get(product.id)
                quantity_by_product[product].append((product.barcode, q))
        if data.get('custom_barcodes'):
            for product, barcodes_qtys in data.get('custom_barcodes').items():
                quantity_by_product[Product.browse(int(product))] += barcodes_qtys
        return quantity_by_product

    def _get_report_values(self, docids, data):
        layout_wizard = self.env['product.label.layout'].browse(data.get('layout_wizard'))
        if not layout_wizard:
            return {}

        Product = self._get_product_model(data)
        quantity_by_product = self._build_quantity_by_product(Product, docids, data)
        report_values = {
            'quantity': quantity_by_product,
            'price_included': data.get('price_included'),
            'extra_html': layout_wizard.extra_html,
            'pricelist': layout_wizard.pricelist_id,
        }
        labels = self._prepare_labels(
            quantity_by_product, layout_wizard.pricelist_id, layout_wizard.extra_html,
            data.get('price_included'), layout_wizard.packaging_id,
        )
        report_values.update(self._get_report_label_values(labels, layout_wizard.rows, layout_wizard.columns))

        return report_values


class ReportProductReport_Producttemplatelabel2x7(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel2x7'
    _inherit = 'report.product.label.base'
    _description = 'Product Label Report 2x7'


class ReportProductReport_Producttemplatelabel2x7Qr(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel2x7_qr'
    _inherit = 'report.product.label.base'
    _description = 'Product QR Label Report 2x7'


class ReportProductReport_Producttemplatelabel4x7(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel4x7'
    _inherit = 'report.product.label.base'
    _description = 'Product Label Report 4x7'


class ReportProductReport_Producttemplatelabel4x7Qr(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel4x7_qr'
    _inherit = 'report.product.label.base'
    _description = 'Product QR Label Report 4x7'


class ReportProductReport_Producttemplatelabel4x12(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel4x12'
    _inherit = 'report.product.label.base'
    _description = 'Product Label Report 4x12'


class ReportProductReport_Producttemplatelabel4x12Qr(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel4x12_qr'
    _inherit = 'report.product.label.base'
    _description = 'Product QR Label Report 4x12'


class ReportProductReport_Producttemplatelabel_Dymo(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel_dymo'
    _inherit = 'report.product.label.base'
    _description = 'Product Label Report'

    def _get_report_label_values(self, labels, rows, columns):
        return {
            'dymo_labels': labels,
            'page_numbers': len(labels),
        }


class ReportProductReport_Producttemplatelabel_DymoQr(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel_dymo_qr'
    _inherit = 'report.product.report_producttemplatelabel_dymo'
    _description = 'Product QR Label Report Dymo'


class ReportProductReport_Producttemplatelabel_Zpl(models.AbstractModel):
    _name = 'report.product.report_producttemplatelabel_zpl'
    _inherit = 'report.product.label.base'
    _description = 'Product Label Report ZPL'

    def _get_report_values(self, docids, data):
        Product = self._get_product_model(data)

        layout_wizard = self.env['product.label.layout'].browse(data.get('layout_wizard'))
        barcode_format = data['barcode_format']
        zpl_template = data['zpl_template']
        barcode_quantities_by_product = self._build_quantity_by_product(Product, docids, data)
        quantity_by_product = defaultdict(list)
        for product, barcode_quantities in barcode_quantities_by_product.items():
            for barcode_quantity in barcode_quantities:
                barcode, quantity = barcode_quantity[:2]
                packaging = (
                    self.env['uom.uom'].browse(barcode_quantity[2])
                    if len(barcode_quantity) > 2
                    else layout_wizard.packaging_id
                )
                quantity_by_product[product].append({
                    'barcode': markupsafe.Markup(barcode) if barcode else '',
                    'barcode_graphic': (
                        self._prepare_zpl_barcode_graphic(
                            barcode,
                            *_ZPL_BARCODE_DIMENSIONS[zpl_template],
                        )
                        if barcode and barcode_format == 'barcode'
                        else False
                    ),
                    'quantity': quantity,
                    'packaging': packaging,
                    'display_name_markup': markupsafe.Markup(product.display_name),
                    'default_code_markup': markupsafe.Markup(product.default_code) if product.default_code else '',
                })
        data['quantity'] = quantity_by_product
        data['pricelist'] = layout_wizard.pricelist_id
        data['packaging'] = layout_wizard.packaging_id
        data['show_base_unit_price'] = self._show_base_unit_price()

        return data
