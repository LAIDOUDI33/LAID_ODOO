# Part of Odoo. See LICENSE file for full copyright and licensing details.

from freezegun import freeze_time

from odoo.tests import tagged

from odoo.addons.website_sale.tests.common import WebsiteSaleCommon


@tagged("post_install", "-at_install")
class TestAutoUnpublishOutOfStock(WebsiteSaleCommon):
    """Auto (un)publishing based on stock availability."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env["res.config.settings"].create({"group_unpublish_out_of_stock": True}).set_values()

    def test_auto_unpublish_and_republish_on_stock_change(self):
        """A product auto-unpublishes when it runs out of stock, and auto-republishes when
        restocked."""
        variant = self._create_product(
            is_storable=True,
            allow_out_of_stock_order=False,
            website_published=True,
            website_id=self.website.id,
            qty_available=0,
        )
        template = variant.product_tmpl_id
        self.assertFalse(template.is_published)

        variant.qty_available = 5
        self.env.invalidate_all()
        self.env.add_to_compute(template._fields["is_published"], template)
        self.assertTrue(template.is_published)
        self.assertFalse(template.auto_unpublished_date)

    def test_continue_selling_prevents_unpublish(self):
        """A product with Continue Selling on must never be auto-unpublished, even out of stock."""
        variant = self._create_product(
            is_storable=True,
            allow_out_of_stock_order=True,
            website_published=True,
            website_id=self.website.id,
            qty_available=0,
        )
        template = variant.product_tmpl_id
        self.assertTrue(template.is_published)
        self.assertFalse(template.auto_unpublished_date)

    def test_manual_republish_lifecycle(self):
        """Once a merchant manually republishes a product while it's out of stock, it must stay
        published, even through later restock/sold-out cycles."""
        with freeze_time("2026-01-01 10:00:00"):
            variant = self._create_product(
                is_storable=True,
                allow_out_of_stock_order=False,
                website_published=True,
                website_id=self.website.id,
                qty_available=0,
            )
            template = variant.product_tmpl_id
            self.assertFalse(template.is_published)

        with freeze_time("2026-01-01 11:00:00"):
            template.is_published = True  # Merchant manually republishes while still OOS.

        with freeze_time("2026-01-01 12:00:00"):
            self.env.invalidate_all()
            self.env.add_to_compute(template._fields["is_published"], template)
            self.assertTrue(template.is_published)  # Manually republished, so kept published.

        with freeze_time("2026-01-01 13:00:00"):
            variant.qty_available = 5  # Restocked.
            self.env.invalidate_all()
            self.env.add_to_compute(template._fields["is_published"], template)
            self.assertTrue(template.is_published)

        with freeze_time("2026-01-01 14:00:00"):
            variant.qty_available = 0  # Sells out again.
            self.env.invalidate_all()
            self.env.add_to_compute(template._fields["is_published"], template)
            self.assertTrue(template.is_published)  # Still kept published.
