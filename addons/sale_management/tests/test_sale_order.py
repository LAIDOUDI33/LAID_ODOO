# Part of Odoo. See LICENSE file for full copyright and licensing details.

from itertools import chain

from odoo.fields import Command
from odoo.tests import Form, tagged

from odoo.addons.http_routing.tests.common import MockRequest
from odoo.addons.sale_management.controllers.portal import CustomerPortal
from odoo.addons.sale_management.tests.common import SaleManagementCommon

DISCOUNT = 50
NO_TAX_INCL_VALUES = [
    {"margin": 16.67, "margin_percent": 0.25, "price_unit": 66.67},
    {"margin": 25.0, "margin_percent": 1 / 3, "price_unit": 75},
    {"margin": 50.0, "margin_percent": 0.5, "price_unit": 100},
    {"margin": 75.0, "margin_percent": 0.6, "price_unit": 125},
    {"margin": 150.0, "margin_percent": 0.75, "price_unit": 200},
]
NO_TAX_INCL_DISCOUNT_VALUES = [
    {**values, "price_unit": values["price_unit"] / (1 - DISCOUNT / 100)}
    for values in NO_TAX_INCL_VALUES
]

TAX_INCL_VALUES = [
    {"margin": -16.67, "margin_percent": -0.50, "price_unit": 50, "purchase_price": 50},
    {"margin": 16.67, "margin_percent": 0.25, "price_unit": 100, "purchase_price": 50},
    {"margin": 33.33, "margin_percent": 0.4, "price_unit": 125, "purchase_price": 50},
    {"margin": 50.0, "margin_percent": 0.5, "price_unit": 150, "purchase_price": 50},
    {"margin": 83.33, "margin_percent": 0.625, "price_unit": 200, "purchase_price": 50},
    {"margin": 283.33, "margin_percent": 0.85, "price_unit": 500, "purchase_price": 50},
]
TAX_INCL_DISCOUNT_VALUES = [
    {**values, "price_unit": values["price_unit"] / (1 - DISCOUNT / 100)}
    for values in TAX_INCL_VALUES
]


@tagged("-at_install", "post_install")
class TestSaleOrder(SaleManagementCommon):
    _test_user_groups = (
        "product.group_product_manager",
        "sales_team.group_sale_manager",  # FIXME: use sales_team.group_sale_salesman
        # FIXME: base.group_erp_manager is required because the discount wizard auto-creates the
        # company's discount product on first use (sale/wizard/sale_order_discount.py
        # _get_discount_product, requires company.has_access("write")). Business logic ->
        # test_optional_section_discount_line_not_editable_on_portal. Prefer the user-level group
        # 'base.group_user' once that flow no longer requires res.company write access.
        "base.group_erp_manager",
    )

    _test_user_name = "Test Sales & Product Manager"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # some variables to ease asserts in tests
        cls.pub_product_price = 100.0
        cls.pl_product_price = 80.0
        cls._enable_discounts()
        cls.tpl_discount = 10.0
        cls.pl_discount = (
            (cls.pub_product_price - cls.pl_product_price) * 100 / cls.pub_product_price
        )
        cls.merged_discount = 100.0 - (100.0 - cls.pl_discount) * (100.0 - cls.tpl_discount) / 100.0

        cls.pub_option_price = 200.0
        cls.pl_option_price = 100.0
        cls.tpl_option_discount = 20.0
        cls.pl_option_discount = (
            (cls.pub_option_price - cls.pl_option_price) * 100 / cls.pub_option_price
        )
        cls.merged_option_discount = (
            100.0 - (100.0 - cls.pl_option_discount) * (100.0 - cls.tpl_option_discount) / 100.0
        )

        # create some products
        cls.product_1, cls.optional_product = cls.env["product.product"].create([
            {
                "name": "Product 1",
                "lst_price": cls.pub_product_price,
                "description_sale": "This is a product description",
            },
            {"name": "Optional product", "lst_price": cls.pub_option_price},
        ])

        # create some quotation templates
        cls.quotation_template_no_discount = cls.env["sale.order.template"].create({
            "name": "A quotation template",
            "sale_order_template_line_ids": [
                Command.create({"product_id": cls.product_1.id}),
                Command.create({
                    "name": "Optional products",
                    "display_type": "line_section",
                    "is_optional": True,
                    "sequence": 11,  # to be sure optional products are last in the template
                }),
                Command.create({"product_id": cls.optional_product.id, "sequence": 12}),
            ],
        })

        # create two pricelist with different discount policies (same total price)
        pricelist_rule_values = [
            Command.create({
                "name": "Product 1 premium price",
                "applied_on": "1_product",
                "product_tmpl_id": cls.product_1.product_tmpl_id.id,
                "compute_price": "fixed",
                "fixed_price": cls.pl_product_price,
            }),
            Command.create({
                "name": "Optional product premium price",
                "applied_on": "1_product",
                "product_tmpl_id": cls.optional_product.product_tmpl_id.id,
                "compute_price": "fixed",
                "fixed_price": cls.pl_option_price,
            }),
        ]
        percentage_pricelist_rule_values = [
            Command.create({
                "name": "Product 1 premium price",
                "applied_on": "1_product",
                "product_tmpl_id": cls.product_1.product_tmpl_id.id,
                "compute_price": "percentage",
                "percent_price": cls.pl_discount,
            }),
            Command.create({
                "name": "Optional product premium price",
                "applied_on": "1_product",
                "product_tmpl_id": cls.optional_product.product_tmpl_id.id,
                "compute_price": "percentage",
                "percent_price": cls.pl_option_discount,
            }),
        ]

        (cls.discount_included_price_list, cls.discount_excluded_price_list) = cls.env[
            "product.pricelist"
        ].create([
            {"name": "Discount included Pricelist", "item_ids": pricelist_rule_values},
            {"name": "Discount excluded Pricelist", "item_ids": percentage_pricelist_rule_values},
        ])

        # variable kept to reduce code diff
        cls.sale_order = cls._create_so(order_line=[])

        cls.product_50_margin = cls._create_product(
            list_price=100.0, standard_price=50.0, taxes_id=[Command.set([])]
        )
        tax_group = cls.env["account.tax.group"].sudo().create({"name": "Tax Group A"})
        cls.tax_included, cls.tax_excluded, cls.tax_default = cls.env["account.tax"].create([
            {
                "name": "Tax with price include",
                "amount": 50,
                "price_include_override": "tax_included",
                "tax_group_id": tax_group.id,
            },
            {
                "name": "Tax with price exclude",
                "amount": 50,
                "price_include_override": "tax_excluded",
                "tax_group_id": tax_group.id,
            },
            {"name": "Tax with default", "amount": 50, "tax_group_id": tax_group.id},
        ])

        cls.so = cls._create_so(
            order_line=[Command.create({"product_id": cls.product_50_margin.id})]
        )
        cls.sol = cls.so.order_line

    def test_01_template_without_pricelist(self):
        """
        This test checks that without any rule in the pricelist, the public price
        of the product is used in the sale order after selecting a
        quotation template.
        """
        # first case, without discount in the quotation template
        self.sale_order.write({"sale_order_template_id": self.quotation_template_no_discount.id})
        self.sale_order._onchange_sale_order_template_id()

        self.assertEqual(
            len(self.sale_order.order_line),
            3,
            "The sale order shall contains the same number of lines asthe quotation template.",
        )

        self.assertEqual(
            self.sale_order.order_line[0].product_id.id,
            self.product_1.id,
            "The sale order shall contains the same products as thequotation template.",
        )

        self.assertEqual(
            self.sale_order.order_line[0].price_unit,
            self.pub_product_price,
            "Without any price list and discount, the public price ofthe product shall be used.",
        )

        optional_lines = self._get_optional_product_lines(self.sale_order)

        self.assertEqual(
            len(optional_lines),
            1,
            "The sale order shall contains the same number of optional products as"
            "the quotation template.",
        )

        self.assertEqual(
            optional_lines[0].product_id.id,
            self.optional_product.id,
            "The sale order shall contains the same optional products as thequotation template.",
        )

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pub_option_price,
            "Without any price list and discount, the public price of"
            "the optional product shall be used.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].product_id.id,
            self.optional_product.id,
            "The sale order shall contains the same products as thequotation template.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].price_unit,
            self.pub_option_price,
            "Without any price list and discount, the public price of"
            "the optional product shall be used.",
        )

    def test_02_template_with_discount_included_pricelist(self):
        """
        This test checks that with a 'discount included' price list,
        the price used in the sale order is computed according to the
        price list.
        """
        # first case, without discount in the quotation template
        self.sale_order.write({
            "pricelist_id": self.discount_included_price_list.id,
            "sale_order_template_id": self.quotation_template_no_discount.id,
        })
        self.sale_order._onchange_sale_order_template_id()

        self.assertEqual(
            self.sale_order.order_line[0].price_unit,
            self.pl_product_price,
            "If a pricelist is set, the product price shall be computedaccording to it.",
        )

        optional_lines = self._get_optional_product_lines(self.sale_order)

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pl_option_price,
            "If a pricelist is set, the optional product price shallbe computed according to it.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].price_unit,
            self.pl_option_price,
            "If a pricelist is set, the optional product price shallbe computed according to it.",
        )

    def test_03_template_with_discount_excluded_pricelist(self):
        """
        This test checks that with a 'discount excluded' price list,
        the price used in the sale order is the product public price and
        the discount is computed according to the price list.
        """
        self.sale_order.write({
            "pricelist_id": self.discount_excluded_price_list.id,
            "sale_order_template_id": self.quotation_template_no_discount.id,
        })
        self.sale_order._onchange_sale_order_template_id()

        self.assertEqual(
            self.sale_order.order_line[0].price_unit,
            self.pub_product_price,
            "If a pricelist is set without discount included, the unit "
            "price shall be the public product price.",
        )

        self.assertEqual(
            self.sale_order.order_line[0].price_subtotal,
            self.pl_product_price,
            "If a pricelist is set without discount included, the subtotal "
            "price shall be the price computed according to the price list.",
        )

        self.assertEqual(
            self.sale_order.order_line[0].discount,
            self.pl_discount,
            "If a pricelist is set without discount included, the discount "
            "shall be computed according to the price unit and the subtotal."
            "price",
        )

        optional_lines = self._get_optional_product_lines(self.sale_order)

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pub_option_price,
            "If a pricelist is set without discount included, the unit "
            "price shall be the public optional product price.",
        )

        self.assertEqual(
            optional_lines[0].discount,
            self.pl_option_discount,
            "If a pricelist is set without discount included, the discount "
            "shall be computed according to the optional price unit and"
            "the subtotal price.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].price_unit,
            self.pub_option_price,
            "If a pricelist is set without discount included, the unit "
            "price shall be the public optional product price.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].price_subtotal,
            self.pl_option_price,
            "If a pricelist is set without discount included, the subtotal "
            "price shall be the price computed according to the price list.",
        )

        self.assertEqual(
            self.sale_order.order_line[2].discount,
            self.pl_option_discount,
            "If a pricelist is set without discount included, the discount "
            "shall be computed according to the price unit and the subtotal."
            "price",
        )

    def test_04_update_pricelist_option_line(self):
        """Check that option line's are correctly updated after a pricelist update."""
        self.sale_order.write({"sale_order_template_id": self.quotation_template_no_discount.id})
        self.sale_order._onchange_sale_order_template_id()

        optional_lines = self._get_optional_product_lines(self.sale_order)

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pub_option_price,
            "If no pricelist is set, the unit price shall be the option's product price.",
        )

        self.assertEqual(
            optional_lines[0].discount, 0, "If no pricelist is set, the discount should be 0."
        )

        self.sale_order.write({"pricelist_id": self.discount_included_price_list.id})
        self.sale_order._recompute_prices()

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pl_option_price,
            "If a pricelist is set with discount included,"
            " the unit price shall be the option's product discounted price.",
        )

        self.assertEqual(
            optional_lines[0].discount,
            0,
            "If a pricelist is set with discount included, the discount should be 0.",
        )

        self.sale_order.write({"pricelist_id": self.discount_excluded_price_list.id})
        self.sale_order._recompute_prices()

        self.assertEqual(
            optional_lines[0].price_unit,
            self.pub_option_price,
            "If a pricelist is set without discount included,"
            " the unit price shall be the option's product sale price.",
        )

        self.assertEqual(
            optional_lines[0].discount,
            self.pl_option_discount,
            "If a pricelist is set without discount included,"
            " the discount should be correctly computed.",
        )

    def test_option_price_unit_is_not_recomputed(self):
        """
        Verifies that user defined price unit for optional products remains the same after
        update of quantities.
        """
        sale_order_with_option = self.env["sale.order"].create({
            "partner_id": self.partner.id,
            "order_line": [
                Command.create({
                    "display_type": "line_section",
                    "name": "Optional products",
                    "is_optional": True,
                }),
                Command.create({"product_id": self.optional_product.id}),
            ],
        })

        optional_product_line = self._get_optional_product_lines(sale_order_with_option)

        optional_product_line.price_unit = 100
        # after changing the quantity of the product, the price unit should not be recomputed
        optional_product_line.product_uom_qty = 10
        self.assertEqual(optional_product_line.price_unit, 100)

    def test_reload_template_translations(self):
        """Check quotation template are reloaded with correct translations on partner change."""
        # Add some display type lines to the template
        self.quotation_template_no_discount.sale_order_template_line_ids = [
            Command.create({"name": "Section 1", "display_type": "line_section"}),
            Command.create({"name": "Note 1", "display_type": "line_note"}),
        ]
        # Remove product description to ease comparing before/after translations
        self.product_1.description_sale = None

        # Commence activation of Dutch vernacular
        self.env["res.lang"].sudo()._activate_lang("nl_NL")
        partner_NL = self.partner.copy({"lang": "nl_NL", "name": "Pieter-Jan Hollandman"})
        names_EN = ["Product 1", "Section 1", "Note 1", "Optional products", "Optional product"]
        names_NL = ["Artikel 1", "Sectie 1", "Nota 1", "Optionele producten", "Optioneel product"]
        trans_dict = dict(zip(names_EN, names_NL))
        for record in chain(
            self.quotation_template_no_discount.sale_order_template_line_ids,
            self.quotation_template_no_discount.sale_order_template_line_ids.product_id,
        ):
            if not record.name:
                continue
            record.with_context(lang="nl_NL").name = trans_dict[record.name]

        # Create sale order form (and a way to retrieve line names)
        def get_form_field_names(form):
            return [
                form.order_line.edit(0).name,
                form.order_line.edit(1).name,
                form.order_line.edit(2).name,
                form.order_line.edit(3).name,
                form.order_line.edit(4).name,
            ]

        order_form = Form(self.sale_order.browse())
        order_form.sale_order_template_id = self.quotation_template_no_discount

        # Sanity check English names
        self.assertSequenceEqual(
            get_form_field_names(order_form),
            names_EN,
            "Lines should be displayed in English for an American partner",
        )

        # Go Dutch
        order_form.partner_id = partner_NL
        self.assertSequenceEqual(
            get_form_field_names(order_form),
            names_NL,
            "Lines should be displayed in Dutch for a Dutch partner",
        )

        # Edit a line & change back to American partner
        with order_form.order_line.edit(0) as order_line:
            order_line.product_uom_qty += 1
        order_form.partner_id = self.partner
        self.assertSequenceEqual(
            get_form_field_names(order_form), names_NL, "Lines shouldn't change when edited"
        )

        # Reload template manually
        order_form.sale_order_template_id = self.quotation_template_no_discount
        self.assertSequenceEqual(
            get_form_field_names(order_form),
            names_EN,
            "Lines should change after manual template reload",
        )

        order_form.partner_id = partner_NL

        # Reload template, save, and change partner again
        order_form.sale_order_template_id = self.quotation_template_no_discount
        order_form.save()
        order_form.partner_id = self.partner
        self.assertSequenceEqual(
            get_form_field_names(order_form), names_NL, "Lines shouldn't change once saved"
        )

    def test_product_description_no_template_description(self):
        """
        Test case for when the product has a description, but the quotation template line does not.
        The final sale order line should use the product's description.
        """
        quotation_template_no_description = self.empty_order_template
        quotation_template_no_description.sale_order_template_line_ids = [
            Command.create({"product_id": self.product_1.id, "name": False})
        ]
        sale_order = self._create_so(order_line=[])
        sale_order.sale_order_template_id = quotation_template_no_description
        sale_order._onchange_sale_order_template_id()
        self.assertEqual(
            sale_order.order_line[0].name,
            f"{self.product_1.name}\n{self.product_1.description_sale}",
            "Sale order line should use product's description when no quotation template \
            description is set.",
        )

    def test_product_description_with_template_description(self):
        """
        Test case for when both the product and the quotation template line have descriptions.
        The final sale order line should use the template's description.
        """
        quotation_template_with_description = self.empty_order_template
        quotation_template_with_description.sale_order_template_line_ids = [
            Command.create({
                "product_id": self.product_1.id,
                "name": "This is a template description",
            })
        ]
        sale_order = self._create_so(order_line=[])
        sale_order.sale_order_template_id = quotation_template_with_description
        sale_order._onchange_sale_order_template_id()
        self.assertEqual(
            sale_order.order_line[0].name,
            self.product_1.display_name
            + "\n"
            + quotation_template_with_description.sale_order_template_line_ids[0].name,
            "The sale order line should use the quotation template's description "
            "(with product display_name) when both product and the quotation template descriptions"
            " are set.",
        )

    def test_warning_quotation(self):
        """Ensure "warning for the change of your quotation's company" isn't triggered
        during the creation of a quotation when a quotation template is set as default.
        """
        quotation_template = self.empty_order_template
        quotation_template.sale_order_template_line_ids = [
            Command.create({"product_id": self.product.id})
        ]
        self.env["ir.default"].sudo().set(
            "sale.order", "sale_order_template_id", quotation_template.id
        )
        try:
            with self.assertLogs("odoo.tests.form.onchange") as log_catcher:
                Form(self.env["sale.order"])
        except AssertionError:
            pass
        self.assertEqual(len(log_catcher.output), 0, "Form creation shouldn't trigger a warning")

    def test_show_update_pricelist_false_on_sale_order_open(self):
        """Ensure the update pricelist button is disabled when opening a sale order
        with a default quotation template applied.
        """
        self._enable_pricelists()
        quotation_template = self.env["sale.order.template"].create({
            "name": "Test Quotation Template",
            "sale_order_template_line_ids": [Command.create({"product_id": self.product.id})],
        })
        self.env["ir.default"].sudo().set(
            "sale.order", "sale_order_template_id", quotation_template.id
        )
        with Form(self.env["sale.order"]) as sale_order_form:
            self.assertTrue(sale_order_form.sale_order_template_id)
            self.assertTrue(sale_order_form.order_line)
            sale_order_form.partner_id = self.partner

    def test_optional_section_discount_line_not_editable_on_portal(self):
        so = self.env["sale.order"].create({
            "partner_id": self.partner.id,
            "order_line": [
                Command.create({
                    "name": "Optional Section",
                    "display_type": "line_section",
                    "is_optional": True,
                }),
                Command.create({"product_id": self.product.id, "price_unit": 200}),
            ],
        })
        wizard = self.env["sale.order.discount"].create({
            "sale_order_id": so.id,
            "discount_type": "so_discount",
            "discount_percentage": 0.1,
        })
        wizard.action_apply_discount()
        self.assertTrue(
            so.order_line[1]._can_be_edited_on_portal(),
            "Optional section line should be editable on portal",
        )
        self.assertFalse(
            so.order_line[2]._can_be_edited_on_portal(),
            "Discount line on optional section should not be editable on portal",
        )

    def test_optional_lines_discount_is_not_recomputed_on_portal(self):
        sale_order_with_option = self.env["sale.order"].create({
            "partner_id": self.partner.id,
            "order_line": [
                Command.create({
                    "display_type": "line_section",
                    "name": "Optional products",
                    "is_optional": True,
                }),
                Command.create({"product_id": self.optional_product.id}),
            ],
        })

        optional_product_line = self._get_optional_product_lines(sale_order_with_option)
        optional_product_line.discount = 20

        with MockRequest(self.env):
            CustomerPortal().portal_quote_option_update(
                sale_order_with_option.id, optional_product_line.id, input_quantity=10
            )
            self.assertEqual(optional_product_line.discount, 20)

    def test_sale_margin(self):
        """Test that margin fields are always available in sale_management."""
        self.product.standard_price = 700.0
        order = self._create_so(
            order_line=[
                Command.create({
                    "price_unit": 1000.0,
                    "product_uom_qty": 10.0,
                    "product_id": self.product.id,
                })
            ]
        )
        # Confirm the sales order.
        order.action_confirm()
        # Verify that margin field gets bind with the value.
        self.assertEqual(order.margin, 3000.00, "Sales order profit should be 6000.00")
        self.assertEqual(order.margin_percent, 0.3, "Sales order margin should be 30%")

    def test_negative_margin(self):
        """Test the margin when sales price is less then cost."""
        self.service_product.standard_price = 40.0

        order = self._create_so(
            order_line=[
                Command.create({
                    "price_unit": 20.0,
                    "product_uom_qty": 1.0,
                    "state": "draft",
                    "product_id": self.service_product.id,
                }),
                Command.create({
                    "price_unit": -100.0,
                    "purchase_price": 0.0,
                    "product_uom_qty": 1.0,
                    "state": "draft",
                    "product_id": self.product.id,
                }),
            ]
        )
        # Confirm the sales order.
        order.action_confirm()
        # Verify that margin field of Sale Order Lines gets bind with the value.
        self.assertEqual(order.order_line[0].margin, -20.00, "Sales order profit should be -20.00")
        self.assertEqual(
            order.order_line[0].margin_percent, -1, "Sales order margin percentage should be -100%"
        )
        self.assertEqual(
            order.order_line[1].margin, -100.00, "Sales order profit should be -100.00"
        )
        self.assertEqual(
            order.order_line[1].margin_percent,
            1.00,
            "Sales order margin should be 100% when the cost is zero and price defined",
        )
        # Verify that margin field gets bind with the value.
        self.assertEqual(order.margin, -120.00, "Sales order margin should be -120.00")
        self.assertEqual(order.margin_percent, 1.5, "Sales order margin should be 150%")

    def test_margin_no_cost(self):
        """Test the margin when cost is 0 margin percentage should always be 100%."""
        order = self._create_so(
            order_line=[
                Command.create({
                    "product_id": self.product.id,
                    "price_unit": 70.0,
                    "product_uom_qty": 1.0,
                })
            ]
        )

        # Verify that margin field of Sale Order Lines gets bind with the value.
        self.assertEqual(order.order_line[0].margin, 70.00, "Sales order profit should be 70.00")
        self.assertEqual(
            order.order_line[0].margin_percent,
            1.0,
            "Sales order margin percentage should be 100.00",
        )
        # Verify that margin field gets bind with the value.
        self.assertEqual(order.margin, 70.00, "Sales order profit should be 70.00")
        self.assertEqual(
            order.margin_percent, 1.00, "Sales order margin percentage should be 100.00"
        )

    def test_margin_considering_product_qty(self):
        """Test the margin and margin percentage when product with multiple quantity."""
        self.service_product.standard_price = 50.0

        order = self._create_so(
            order_line=[
                Command.create({
                    "price_unit": 100.0,
                    "product_uom_qty": 3.0,
                    "product_id": self.service_product.id,
                }),
                Command.create({
                    "price_unit": -50.0,
                    "product_uom_qty": 1.0,
                    "product_id": self.product.id,
                }),
            ]
        )

        # Confirm the sales order.
        order.action_confirm()
        # Verify that margin field of Sale Order Lines gets bind with the value.
        self.assertEqual(order.order_line[0].margin, 150.00, "Sales order profit should be 150.00")
        self.assertEqual(
            order.order_line[0].margin_percent, 0.5, "Sales order margin should be 100%"
        )
        self.assertEqual(order.order_line[1].margin, -50.00, "Sales order profit should be -50.00")
        self.assertEqual(
            order.order_line[1].margin_percent, 1.0, "Sales order margin should be 100%"
        )
        # Verify that margin field gets bind with the value.
        self.assertEqual(order.margin, 100.00, "Sales order profit should be 100.00")
        self.assertEqual(order.margin_percent, 0.4, "Sales order margin should be 40%")

    def test_sale_margin_order_copy(self):
        """When we copy a sales order, its margins should be update to meet the current costs."""
        # We buy at a specific price today and our margins go according to that
        self.product.standard_price = 500.0
        order = self._create_so(
            order_line=[
                Command.create({
                    "price_unit": 1000.0,
                    "product_uom_qty": 10.0,
                    "product_id": self.product.id,
                })
            ]
        )
        self.assertAlmostEqual(500.0, order.order_line.purchase_price)
        self.assertAlmostEqual(5000.0, order.order_line.margin)
        self.assertAlmostEqual(0.5, order.order_line.margin_percent)
        # Later on, the cost of our product changes and so will the following sale
        # margins do.
        self.product.standard_price = 750.0
        following_sale = order.copy()
        self.assertAlmostEqual(750.0, following_sale.order_line.purchase_price)
        self.assertAlmostEqual(2500.0, following_sale.order_line.margin)
        self.assertAlmostEqual(0.25, following_sale.order_line.margin_percent)

    def test_margin_onchanges_no_tax(self):
        self.assertRecordValues(
            self.sol,
            [
                {
                    "price_unit": 100.0,
                    "purchase_price": 50,
                    "margin": 50,
                    "margin_percent": 0.5,
                    "tax_ids": [],
                }
            ],
        )
        self._test_margin_onchange("margin", NO_TAX_INCL_VALUES)
        self._test_margin_onchange("margin_percent", NO_TAX_INCL_VALUES)

        self.sol.discount = DISCOUNT
        self._test_margin_onchange("margin", NO_TAX_INCL_DISCOUNT_VALUES)
        self._test_margin_onchange("margin_percent", NO_TAX_INCL_DISCOUNT_VALUES)

    def test_margin_onchanges_tax_excl(self):
        self.product_50_margin.taxes_id = [Command.link(self.tax_excluded.id)]
        self.so._recompute_taxes()
        self.assertRecordValues(
            self.sol,
            [
                {
                    "price_unit": 100.0,
                    "purchase_price": 50.0,
                    "margin": 50,
                    "margin_percent": 0.5,
                    "tax_ids": [self.tax_excluded.id],
                }
            ],
        )
        # Price excluded taxes should not have any impact on the margin computation
        self._test_margin_onchange("margin", NO_TAX_INCL_VALUES)
        self._test_margin_onchange("margin_percent", NO_TAX_INCL_VALUES)

        self.sol.discount = DISCOUNT
        self._test_margin_onchange("margin", NO_TAX_INCL_DISCOUNT_VALUES)
        self._test_margin_onchange("margin_percent", NO_TAX_INCL_DISCOUNT_VALUES)

    def test_margin_onchanges_tax_incl(self):
        self.product_50_margin.taxes_id = [Command.link(self.tax_included.id)]
        self.so._recompute_taxes()
        self.assertRecordValues(
            self.sol,
            [
                {
                    "price_unit": 100.0,
                    "purchase_price": 50.0,
                    "margin": 16.67,
                    "margin_percent": 0.25,
                    "tax_ids": [self.tax_included.id],
                    "price_tax": 33.33,
                }
            ],
        )
        self._test_margin_onchange("margin", TAX_INCL_VALUES)
        self._test_margin_onchange("margin_percent", TAX_INCL_VALUES)
        self.sol.discount = 50
        self._test_margin_onchange("margin", TAX_INCL_DISCOUNT_VALUES)
        self._test_margin_onchange("margin_percent", TAX_INCL_DISCOUNT_VALUES)

    def test_margin_onchanges_tax_incl_excl(self):
        self.product_50_margin.taxes_id = [
            Command.link(self.tax_excluded.id),
            Command.link(self.tax_included.id),
        ]
        self.so._recompute_taxes()
        self.assertRecordValues(
            self.sol,
            [
                {
                    "price_unit": 100.0,
                    "purchase_price": 50.0,
                    "margin": 16.67,
                    "margin_percent": 0.25,
                    "tax_ids": [self.tax_excluded.id, self.tax_included.id],
                }
            ],
        )
        # Price excluded taxes should not have any impact on the margin computation
        self._test_margin_onchange("margin", TAX_INCL_VALUES[1:])
        self._test_margin_onchange("margin_percent", TAX_INCL_VALUES[1:])

    def test_margin_onchanges_document_tax_mode(self):
        self.product_50_margin.taxes_id = [Command.link(self.tax_default.id)]
        self.so._recompute_taxes()
        self.assertRecordValues(
            self.sol,
            [
                {
                    "price_unit": 100.0,
                    "purchase_price": 50.0,
                    "margin": 50,
                    "margin_percent": 0.5,
                    "tax_ids": [self.tax_default.id],
                    "document_tax_mode": "tax_excluded",
                }
            ],
        )
        # Price excluded taxes should not have any impact on the margin computation
        self._test_margin_onchange("margin", NO_TAX_INCL_VALUES)
        self._test_margin_onchange("margin_percent", NO_TAX_INCL_VALUES)

        # When price_include_override is not set, the tax policy depends on the document_tax_mode
        self.sol.order_id.document_tax_mode = "tax_included"
        self._test_margin_onchange("margin", TAX_INCL_VALUES)
        self._test_margin_onchange("margin_percent", TAX_INCL_VALUES)

    def _test_margin_onchange(self, fname, vals_list):
        with Form(self.so) as so_form, so_form.order_line.edit(0) as sol_form:
            for values in vals_list:
                sol_form[fname] = values[fname]
                for k, v in values.items():
                    delta = 0.02 if k != "margin_percent" else 0.01
                    self.assertAlmostEqual(
                        sol_form[k],
                        v,
                        msg=f"{k} doesn't match ({fname}: {values[fname]})",
                        delta=delta,
                    )

    def test_margin_fields_always_present(self):
        """Margin fields are always available without any setting or module toggle."""
        order = self._create_so(
            order_line=[
                Command.create({
                    "product_id": self.product.id,
                    "price_unit": 100.0,
                    "product_uom_qty": 1.0,
                })
            ]
        )
        # Fields must exist on every sale order without requiring sale_margin or any setting
        self.assertIn("margin", order._fields)
        self.assertIn("margin_percent", order._fields)
        self.assertIn("purchase_price", order.order_line._fields)
