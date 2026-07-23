# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, api, fields, models
from odoo.exceptions import UserError
from odoo.tools import BinaryBytes, file_open

# Format table expressed as width x height in inch.
ZPL_FORMAT_SIZE = {
    'normal': (2.25, 1.25),
    'small': (1.25, 1.00),
    'alternative': (2.00, 1.00),
    'jewelry': (2.20, 0.50),
}


class ProductLabelLayout(models.TransientModel):
    _name = 'product.label.layout'
    _description = 'Choose the sheet layout to print the labels'

    @api.model
    def _get_zpl_label_placeholder(self):
        with file_open('product/static/img/zpl_label_placeholder.png', 'rb') as f:
            return BinaryBytes(f.read())

    barcode_format = fields.Selection([
        ('barcode', 'Barcode 1D'),
        ('qr', 'QR Code'),
    ], string="Type", default='barcode')
    print_format = fields.Selection([
        ('dymo', 'Dymo'),
        ('2x7', '2 x 7'),
        ('4x7', '4 x 7'),
        ('4x12', '4 x 12'),
        ('zpl', 'ZPL Labels'),
    ], string="Format", default='2x7', required=True)
    zpl_template = fields.Selection([
        ('normal', 'Normal (2.25" x 1.25")'),
        ('small', 'Small (1.25" x 1.00")'),
        ('alternative', 'Alternative (2.00" x 1.00")'),
        ('jewelry', 'Jewelry (2.20" x 0.50")'),
    ], string="ZPL Template", default='normal', required=True)
    zpl_preview = fields.Image('ZPL Preview', readonly=True, default=_get_zpl_label_placeholder)
    with_price = fields.Boolean('Print With Price', default=True)
    custom_quantity = fields.Integer('Copies', default=1, required=True)
    product_ids = fields.Many2many('product.product')
    product_tmpl_ids = fields.Many2many('product.template')
    product_uom_ids = fields.Many2many('product.uom')
    available_packaging_ids = fields.Many2many('uom.uom', compute='_compute_available_packaging_ids')
    packaging_id = fields.Many2one(
        'uom.uom',
        string='Packaging',
        domain="[('id', 'in', available_packaging_ids)]",
    )
    extra_html = fields.Html('Extra Content', default='')
    rows = fields.Integer(compute='_compute_dimensions')
    columns = fields.Integer(compute='_compute_dimensions')
    pricelist_id = fields.Many2one('product.pricelist', string="Pricelist")

    def _get_available_packagings(self):
        self.ensure_one()

        default_packaging = self.env['uom.uom'].browse(self.env.context.get('default_packaging_id'))
        products = self.product_ids | self.product_uom_ids.product_id
        templates = self.product_tmpl_ids | products.product_tmpl_id
        template_products = products or templates.product_variant_ids

        packagings = default_packaging
        if products:
            for product in products:
                seller_uom = product.seller_ids.filtered(
                    lambda seller: not seller.product_id or seller.product_id == product
                ).uom_id
                packagings |= product._get_available_uoms() | seller_uom
        else:
            for template in templates:
                packagings |= template._get_available_uoms() | template.seller_ids.uom_id

        Bom = self.env.get('mrp.bom')
        if Bom is not None and templates:
            finished_product_boms = Bom.search([
                '|',
                ('product_id', 'in', template_products.ids),
                '&',
                ('product_id', '=', False),
                ('product_tmpl_id', 'in', templates.ids),
            ])
            packagings |= finished_product_boms.uom_id

        return packagings

    @api.depends('product_ids', 'product_tmpl_ids', 'product_uom_ids')
    def _compute_available_packaging_ids(self):
        for wizard in self:
            wizard.available_packaging_ids = wizard._get_available_packagings()

    @api.depends('print_format')
    def _compute_dimensions(self):
        for wizard in self:
            if 'x' in wizard.print_format:
                columns, rows = wizard.print_format.split('x')
                wizard.columns = columns.isdigit() and int(columns) or 1
                wizard.rows = rows.isdigit() and int(rows) or 1
            else:
                wizard.columns, wizard.rows = 1, 1

    def _prepare_report_data(self):
        if self.custom_quantity <= 0:
            raise UserError(_('You need to set a positive quantity.'))

        xml_id = f'product.report_product_template_label_{self.print_format}'
        if self.barcode_format == 'qr' and self.print_format != 'zpl':
            xml_id += '_qr'

        active_model = ''
        custom_barcodes = {}
        if self.product_uom_ids:
            products = self.product_uom_ids.product_id.ids
            active_model = 'product.product'
            for product_uom in self.product_uom_ids:
                custom_barcodes.setdefault(product_uom.product_id.id, []).append((
                    product_uom.barcode,
                    self.custom_quantity,
                ))
        elif self.product_tmpl_ids:
            products = self.product_tmpl_ids.ids
            active_model = 'product.template'
        elif self.product_ids:
            products = self.product_ids.ids
            active_model = 'product.product'
        else:
            raise UserError(_("No product to print, if the product is archived please unarchive it before printing its label."))

        # Build data to pass to the report
        data = {
            'active_model': active_model,
            'layout_wizard': self.id,
            'price_included': self.with_price,
            'zpl_template': self.zpl_template,
            'barcode_format': self.barcode_format,
        }
        if custom_barcodes:
            data['custom_barcodes'] = custom_barcodes
        else:
            data['quantity_by_product'] = {p: self.custom_quantity for p in products}
        return xml_id, data

    def _save_user_defaults(self):
        self.ensure_one()
        IrDefault = self.env['ir.default'].sudo()
        IrDefault.set(self._name, 'barcode_format', self.barcode_format, user_id=self.env.uid)
        IrDefault.set(self._name, 'print_format', self.print_format, user_id=self.env.uid)

    def process(self):
        self.ensure_one()
        xml_id, data = self._prepare_report_data()
        report_action = self.env.ref(xml_id).report_action(None, data=data, config=False)
        self._save_user_defaults()
        report_action.update({'close_on_report_download': True})
        return report_action
