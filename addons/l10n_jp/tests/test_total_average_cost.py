from datetime import timedelta

from odoo import Command, fields
from odoo.tests import tagged
from odoo.tests.common import TransactionCase


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestTotalAverageCost(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.category = cls.env['product.category'].create({
            'name': 'JP Test Category',
            'property_cost_method': 'standard',
        })
        cls.product = cls.env['product.product'].create({
            'name': 'JP Test Product',
            'categ_id': cls.category.id,
            'standard_price': 100.0,
        })
        cls.supplier_loc = cls.env.ref('stock.stock_location_suppliers')
        cls.stock_loc = cls.env.ref('stock.stock_location_stock')
        cls.today = fields.Date.today()

    def _create_move(self, qty, price, date, src_loc, dest_loc):
        return self.env['stock.move'].create({
            'product_id': self.product.id,
            'product_uom_qty': qty,
            'quantity': qty,
            'location_id': src_loc.id,
            'location_dest_id': dest_loc.id,
            'price_unit': price,
            'state': 'done',
            'date': date,
        })

    def _set_currency_rate(self, currency, rate, date):
        existing = self.env['res.currency.rate'].search([
            ('currency_id', '=', currency.id),
            ('name', '=', date),
        ], limit=1)
        if existing:
            existing.rate = rate
        else:
            self.env['res.currency.rate'].create({
                'name': date,
                'rate': rate,
                'currency_id': currency.id,
            })

    def _create_purchase(self, currency, qty, price_unit):
        supplier = self.env['res.partner'].create({'name': 'JP Foreign Supplier'})
        order = self.env['purchase.order'].create({
            'partner_id': supplier.id,
            'currency_id': currency.id,
            'order_line': [
                Command.create({
                    'product_id': self.product.id,
                    'product_qty': qty,
                    'price_unit': price_unit,
                }),
            ],
        })
        order.button_confirm()
        order.picking_ids.button_validate()
        move = order.picking_ids.move_ids
        self.assertEqual(move.state, 'done')
        self.assertEqual(move.quantity, qty)
        return move

    def test_total_average_cost_calculation(self):
        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        self._create_move(10, 125.0, self.today, self.supplier_loc, self.stock_loc)
        self._create_move(25, 110.0, self.today, self.supplier_loc, self.stock_loc)
        self._create_move(5, 125.0, self.today, self.stock_loc, self.supplier_loc)

        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()
        self.assertAlmostEqual(self.product.standard_price, 102.88, places=2)

    def test_foreign_currency_purchase(self):
        """Purchases made in a foreign currency are valued in the company currency."""
        if 'purchase.order' not in self.env:
            self.skipTest("purchase module not installed")

        foreign_currency = self.env.ref('base.EUR')
        company_currency = self.env.company.currency_id
        self.assertNotEqual(foreign_currency, company_currency)
        self._set_currency_rate(foreign_currency, 2.0, self.today - timedelta(days=1))
        expected_purchase_val = foreign_currency._convert(
            10 * 125.0, company_currency, self.env.company, self.today)
        self.assertNotAlmostEqual(expected_purchase_val, 10 * 125.0)

        self._create_purchase(foreign_currency, 10, 125.0)

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(
            self.product.standard_price,
            (100 * 100.0 + expected_purchase_val) / 110,
            places=2,
        )

    def test_purchase_price_at_move_date(self):
        """The purchase value is taken from the purchase order line and converted at
        the move date, like the perpetual valuation does: an exchange rate change
        between the purchase order and the receipt must be reflected in the total
        average cost."""
        if 'purchase.order' not in self.env:
            self.skipTest("purchase module not installed")

        foreign_currency = self.env.ref('base.EUR')
        company_currency = self.env.company.currency_id
        self.assertNotEqual(foreign_currency, company_currency)
        self._set_currency_rate(foreign_currency, 2.0, self.today - timedelta(days=1))
        self._set_currency_rate(foreign_currency, 4.0, self.today + timedelta(days=1))

        move = self._create_purchase(foreign_currency, 10, 125.0)
        move.date = self.today + timedelta(days=2)

        receipt_date = self.today + timedelta(days=2)
        expected_purchase_val = foreign_currency._convert(
            10 * 125.0, company_currency, self.env.company, receipt_date)
        self.assertNotAlmostEqual(
            expected_purchase_val,
            foreign_currency._convert(10 * 125.0, company_currency, self.env.company, self.today),
        )

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': receipt_date,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(
            self.product.standard_price,
            (100 * 100.0 + expected_purchase_val) / 110,
            places=2,
        )

    def test_dropship_purchase_included(self):
        """Drop-shipped goods are purchased and sold in the same period, without ever
        entering the stock: they are part of the goods available for sale and thus of
        the total average cost base (総平均法)."""
        customer_loc = self.env.ref('stock.stock_location_customers')

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        self._create_move(10, 125.0, self.today, self.supplier_loc, customer_loc)

        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(self.product.standard_price, 102.27, places=2)

    def test_dropship_return_deducted(self):
        customer_loc = self.env.ref('stock.stock_location_customers')

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        self._create_move(10, 125.0, self.today, self.supplier_loc, customer_loc)
        self._create_move(5, 125.0, self.today, customer_loc, self.supplier_loc)

        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(self.product.standard_price, 101.19, places=2)

    def test_dropship_outside_period_ignored(self):
        """A drop-ship of a previous period has already been expensed then and must not
        affect the current total average cost."""
        customer_loc = self.env.ref('stock.stock_location_customers')

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        self._create_move(10, 125.0, self.today - timedelta(days=5), self.supplier_loc, customer_loc)

        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(self.product.standard_price, 100.0, places=2)

    def test_transit_receipt_included(self):
        """A receipt transiting through a transit location (e.g. a cross-company
        replenishment) is part of the goods available for sale and thus of the
        total average cost base."""
        transit_loc = self.env['stock.location'].create({
            'name': 'JP Transit',
            'usage': 'transit',
        })

        self._create_move(100, 100.0, self.today - timedelta(days=10), self.supplier_loc, self.stock_loc)
        self._create_move(10, 125.0, self.today - timedelta(days=1), self.supplier_loc, transit_loc)
        self._create_move(10, 125.0, self.today, transit_loc, self.stock_loc)

        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today - timedelta(days=2),
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()

        self.assertAlmostEqual(self.product.standard_price, 102.27, places=2)

    def test_zero_qty_handling(self):
        wizard = self.env['l10n_jp.total.average.cost.wizard'].create({
            'category_id': self.category.id,
            'date_from': self.today,
            'date_to': self.today,
        })
        wizard.action_apply_total_average_cost()
        self.assertEqual(self.product.standard_price, 100.0)
