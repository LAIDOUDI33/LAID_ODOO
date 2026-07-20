# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.exceptions import AccessError, UserError
from odoo.fields import Command
from odoo.tests import tagged

from odoo.addons.l10n_ph.tests.common import TestPhCommon


@tagged("post_install_l10n", "post_install", "-at_install")
class TestDiscountPrivilegeSale(TestPhCommon):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        discount_group = cls.env.ref("l10n_ph.group_l10n_ph_discount_privilege")
        cls.env.user.write({"group_ids": [Command.link(discount_group.id)]})
        # Ensure the test user can create sale orders and access the sale module.
        sale_group = cls.env.ref("sales_team.group_sale_salesman")
        cls.env.user.write({"group_ids": [Command.link(sale_group.id)]})

        ChartTemplate = cls.env["account.chart.template"].with_company(
            cls.company_data["company"],
        )
        cls.tax_sale_12 = ChartTemplate.ref("l10n_ph_tax_sale_12")
        cls.tax_sale_0_exempt = ChartTemplate.ref("l10n_ph_tax_sale_0_exempt")
        cls.tax_sale_0_exempt_sc_pwd = ChartTemplate.ref(
            "l10n_ph_tax_sale_0_exempt_sc_pwd",
        )
        cls.fpos_sc_pwd = ChartTemplate.ref(
            "l10n_ph_fiscal_position_discount_privileges",
        )
        cls.base_tax = cls.tax_sale_12

        cls.tax_incl = cls._create_tax(
            "12% VAT INCL",
            12,
            price_include_override="tax_included",
        )
        # Make the 0% exempt tax recognize our custom tax_incl as an original tax
        # so the FP's tax_map maps tax_incl → 0% exempt for SC/PWD privileged lines.
        cls.tax_sale_0_exempt_sc_pwd.write(
            {
                "original_tax_ids": [Command.link(cls.tax_incl.id)],
            },
        )
        cls.special_discount_account = cls.company_data["default_account_revenue"].copy(
            {
                "name": "Discount Privilege Account",
            },
        )
        cls.privilege = (
            cls.env["l10n_ph.discount.privilege"]
            .sudo()
            .create(
                {
                    "name": "Senior Citizen",
                    "discount_amount": 20.0,
                    "fiscal_position_id": cls.fpos_sc_pwd.id,
                    "account_id": cls.special_discount_account.id,
                },
            )
        )
        cls.privilege_without_tax = (
            cls.env["l10n_ph.discount.privilege"]
            .sudo()
            .create(
                {
                    "name": "Senior Citizen VAT EXCL",
                    "discount_amount": 20.0,
                    "account_id": cls.special_discount_account.id,
                },
            )
        )
        cls.privilege_with_categories = (
            cls.env["l10n_ph.discount.privilege"]
            .sudo()
            .create(
                {
                    "name": "PWD Category Scoped",
                    "discount_amount": 20.0,
                    "fiscal_position_id": cls.fpos_sc_pwd.id,
                    "account_id": cls.special_discount_account.id,
                    "applied_to_category_ids": [Command.set([])],
                },
            )
        )

        cls.category_a = cls.env["product.category"].create({"name": "Category A"})
        cls.category_b = cls.env["product.category"].create({"name": "Category B"})
        cls.product_a = cls.env["product.product"].create(
            {
                "name": "Product A",
                "categ_id": cls.category_a.id,
                "list_price": 120.0,
            },
        )
        cls.product_b = cls.env["product.product"].create(
            {
                "name": "Product B",
                "categ_id": cls.category_b.id,
                "list_price": 220.0,
            },
        )
        cls.privilege_with_categories.write(
            {"applied_to_category_ids": [Command.set(cls.category_a.ids)]},
        )

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    @classmethod
    def _create_tax(
        cls,
        name,
        amount,
        amount_type="percent",
        type_tax_use="sale",
        tax_exigibility="on_invoice",
        **kwargs,
    ):
        vals = {
            "name": name,
            "amount": amount,
            "amount_type": amount_type,
            "type_tax_use": type_tax_use,
            "tax_exigibility": tax_exigibility,
            "invoice_repartition_line_ids": [
                Command.create({"factor_percent": 100, "repartition_type": "base"}),
                Command.create({"factor_percent": 100, "repartition_type": "tax"}),
            ],
            "refund_repartition_line_ids": [
                Command.create({"factor_percent": 100, "repartition_type": "base"}),
                Command.create({"factor_percent": 100, "repartition_type": "tax"}),
            ],
        }
        vals.update(kwargs)
        return cls.env["account.tax"].create(vals)

    def _soline_vals(
        self,
        *,
        name="Line",
        product=None,
        quantity=1.0,
        price_unit=100.0,
        tax=None,
        discount=0.0,
        **extra,
    ):
        vals = {
            "name": name,
            "product_id": (product or self.product_a).id,
            "product_uom_qty": quantity,
            "price_unit": price_unit,
        }
        if tax is None:
            tax = self.base_tax
        if tax:
            vals["tax_ids"] = [Command.set(tax.ids)]
        if discount:
            vals["discount"] = discount
        vals.update(extra)
        return vals

    def _create_so(self, *line_vals, **extra):
        vals = {
            "partner_id": self.partner_a.id,
            "order_line": [Command.create(v) for v in line_vals],
        }
        vals.update(extra)
        return self.env["sale.order"].create(vals)

    def _create_wizard(self, sale_order, **vals):
        return self.env["l10n_ph.discount.privilege.wizard"].create(
            {"order_id": sale_order.id, **vals},
        )

    # -------------------------------------------------------------------------
    # Wizard wiring / opening
    # -------------------------------------------------------------------------

    def test_open_wizard_action_returns_correct_action(self):
        """Opening the SC/PWD wizard from an SO pre-creates a wizard."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        action = so.action_open_discount_privilege_wizard()
        self.assertEqual(action["res_model"], "l10n_ph.discount.privilege.wizard")
        self.assertIn("res_id", action)
        wizard = self.env["l10n_ph.discount.privilege.wizard"].browse(action["res_id"])
        self.assertTrue(wizard.exists())
        self.assertEqual(wizard.order_id, so)
        self.assertEqual(wizard.line_ids.sale_order_line_id, so.order_line)

    def test_wizard_line_displays_label_and_category(self):
        """Wizard lines opened from an SO show the SO line Label and Product
        Category (resolved from sale_order_line_id, not invoice_line_id)."""
        so = self._create_so(
            self._soline_vals(
                name="My SO Line", product=self.product_a, price_unit=100.0,
            ),
        )
        wizard = self._create_wizard(so)
        line = wizard.line_ids
        self.assertEqual(line.name, "My SO Line")
        self.assertEqual(line.category_id, self.category_a)

    # -------------------------------------------------------------------------
    # Applying a privilege on a sale order (end-to-end writes to SO lines)
    # -------------------------------------------------------------------------

    def test_apply_on_draft_so(self):
        """Applying an FP privilege on a draft SO: sets discount, privilege id,
        maps taxes via FP. In tax_excluded mode price_unit stays unchanged."""
        so = self._create_so(
            self._soline_vals(name="Line A", product=self.product_a, price_unit=100.0),
        )
        wizard = self._create_wizard(
            so,
            privilege_id=self.privilege.id,
            apply_on="all",
        )
        wizard.action_confirm()

        line = so.order_line
        self.assertEqual(line.l10n_ph_discount_privilege_id, self.privilege)
        self.assertEqual(line.discount, 20.0)
        # FP maps 12% VAT → 0% SC/PWD exempt
        self.assertEqual(line.tax_ids, self.tax_sale_0_exempt_sc_pwd)
        # In tax_excluded mode the price_unit is NOT adjusted (the original
        # 12% VAT is not price-included, so the divisor is 1.0).
        self.assertAlmostEqual(line.price_unit, 100.0, places=2)
        # price_total = 80.0 (100 * 0.80 with 0% tax)
        # special_discount = 80 * 20 / 80 = 20.0
        self.assertAlmostEqual(line.l10n_ph_special_discount_amount, 20.0, places=2)

    def test_apply_on_draft_so_non_fp(self):
        """Applying a non-FP privilege keeps original taxes and uses discount."""
        so = self._create_so(
            self._soline_vals(name="Line A", product=self.product_a, price_unit=100.0),
        )
        wizard = self._create_wizard(
            so,
            privilege_id=self.privilege_without_tax.id,
            apply_on="all",
        )
        wizard.action_confirm()

        line = so.order_line
        self.assertEqual(line.l10n_ph_discount_privilege_id, self.privilege_without_tax)
        self.assertEqual(line.discount, 20.0)
        # No FP: original 12% VAT is preserved
        self.assertEqual(line.tax_ids, self.base_tax)
        self.assertAlmostEqual(line.price_unit, 100.0, places=2)
        # discount amount: price_total * discount / (100 - discount)
        # price_total = price_subtotal + price_tax = 80 + 9.6 = 89.6
        self.assertAlmostEqual(line.l10n_ph_special_discount_amount, 22.4, places=2)

    def test_confirm_writes_privilege_to_so_lines(self):
        """Confirming the wizard writes privilege and discount to SO lines
        according to the selected scope."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
            self._soline_vals(name="B", product=self.product_b, price_unit=200.0),
        )
        wiz = self._create_wizard(
            so,
            privilege_id=self.privilege.id,
            apply_on="product_category",
            category_ids=[Command.set(self.category_a.ids)],
        )
        wiz.action_confirm()
        line_a, line_b = so.order_line.sorted("sequence")
        self.assertEqual(line_a.l10n_ph_discount_privilege_id, self.privilege)
        self.assertEqual(line_a.discount, 20.0)
        self.assertFalse(line_b.l10n_ph_discount_privilege_id)
        self.assertEqual(line_b.discount, 0.0)

    # -------------------------------------------------------------------------
    # State guards (sale-order specific)
    # -------------------------------------------------------------------------

    def test_state_guard_draft_so_succeeds(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        self.assertEqual(so.state, "draft")
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertTrue(so.order_line.l10n_ph_discount_privilege_id)

    def test_state_guard_sent_so_succeeds(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        so.write({"state": "sent"})
        self.assertEqual(so.state, "sent")
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertTrue(so.order_line.l10n_ph_discount_privilege_id)

    def test_state_guard_confirmed_so(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        so.action_confirm()
        self.assertEqual(so.state, "sale")
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        with self.assertRaises(UserError):
            wiz.action_confirm()

    def test_cannot_remove_on_confirmed_so(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        so.action_confirm()
        with self.assertRaises(UserError):
            wiz.action_remove_all()

    # -------------------------------------------------------------------------
    # Removing privileges (writes back to SO lines)
    # -------------------------------------------------------------------------

    def test_remove_all_restores_original_discount(self):
        """action_remove_all restores previous discount, clears privilege,
        restores original taxes and price_unit."""
        so = self._create_so(
            self._soline_vals(
                name="A",
                product=self.product_a,
                price_unit=100.0,
                discount=10.0,
            ),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertEqual(so.order_line.discount, 20.0)

        wiz.action_remove_all()
        line = so.order_line
        self.assertFalse(line.l10n_ph_discount_privilege_id)
        self.assertEqual(line.discount, 10.0)
        self.assertEqual(line.tax_ids, self.base_tax)
        self.assertAlmostEqual(line.price_unit, 100.0, places=2)

    def test_remove_line_restores_original_discount(self):
        """Per-line removal restores previous state (SO line source)."""
        so = self._create_so(
            self._soline_vals(
                name="A",
                product=self.product_a,
                price_unit=100.0,
                discount=10.0,
            ),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertEqual(so.order_line.discount, 20.0)

        wiz.line_ids.action_remove_line_discount()
        line = so.order_line
        self.assertFalse(line.l10n_ph_discount_privilege_id)
        self.assertEqual(line.discount, 10.0)

    def test_remove_line_without_privilege_succeeds(self):
        """action_remove_line_discount works even when no privilege is set."""
        so = self._create_so(
            self._soline_vals(
                name="A",
                product=self.product_a,
                price_unit=100.0,
                discount=20.0,
                l10n_ph_discount_privilege_id=self.privilege.id,
            ),
        )
        wiz = self._create_wizard(so)
        self.assertFalse(wiz.privilege_id)
        wiz.line_ids.action_remove_line_discount()
        self.assertEqual(so.order_line.discount, 0.0)
        self.assertFalse(so.order_line.l10n_ph_discount_privilege_id)

    # -------------------------------------------------------------------------
    # Invoice propagation (sale-order specific behaviour)
    # -------------------------------------------------------------------------

    def test_invoice_propagation(self):
        """Privileged SO creates invoice lines with privilege fields."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        so.action_confirm()
        invoice = so._create_invoices()
        inv_line = invoice.invoice_line_ids
        self.assertEqual(inv_line.l10n_ph_discount_privilege_id, self.privilege)
        self.assertTrue(inv_line.l10n_ph_original_tax_ids)
        self.assertAlmostEqual(inv_line.l10n_ph_original_price_unit, 100.0, places=2)
        self.assertEqual(inv_line.l10n_ph_discount_privilege_previous_discount, 0.0)
        self.assertEqual(inv_line.discount, 20.0)

    def test_invoice_propagation_discount_allocation(self):
        """Invoice from privileged SO has discount-allocation journal items."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(
            so, privilege_id=self.privilege_without_tax.id, apply_on="all",
        )
        wiz.action_confirm()
        so.action_confirm()
        invoice = so._create_invoices()
        invoice.action_post()
        inv_line = invoice.invoice_line_ids
        # Non-FP privilege: discount on VAT-inclusive total
        # 100 * 1.12 * 0.20 = 22.4
        self.assertRecordValues(
            invoice.line_ids.filtered(
                lambda line: line.display_type == "discount",
            ).sorted("amount_currency"),
            [
                {
                    "account_id": inv_line.account_id.id,
                    "amount_currency": -22.4,
                },
                {
                    "account_id": self.special_discount_account.id,
                    "amount_currency": 22.4,
                },
            ],
        )

    # -------------------------------------------------------------------------
    # Company consistency (shared action_confirm guard, exercised on SO)
    # -------------------------------------------------------------------------

    def test_company_consistency(self):
        other_company = self.env["res.company"].create(
            {
                "name": "Other Company",
                "country_id": self.env.ref("base.ph").id,
            },
        )
        other_account = self.env["account.account"].create({
            "name": "Other Discount Account",
            "code": "999998",
            "account_type": "income",
            "company_ids": [(4, other_company.id)],
        })
        other_privilege = (
            self.env["l10n_ph.discount.privilege"]
            .sudo()
            .create(
                {
                    "name": "Other Company Privilege",
                    "discount_amount": 20.0,
                    "company_id": other_company.id,
                    "account_id": other_account.id,
                },
            )
        )
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(
            so,
            privilege_id=other_privilege.id,
            apply_on="all",
        )
        with self.assertRaises(UserError):
            wiz.action_confirm()

    # -------------------------------------------------------------------------
    # l10n_ph_has_discount_privilege computed (sale.order specific field)
    # -------------------------------------------------------------------------

    def test_has_discount_privilege_computed(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        self.assertFalse(so.l10n_ph_has_discount_privilege)

        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertTrue(so.l10n_ph_has_discount_privilege)

        wiz.action_remove_all()
        self.assertFalse(so.l10n_ph_has_discount_privilege)

    def test_has_discount_privilege_confirmed_so_false(self):
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        so.action_confirm()
        self.assertFalse(so.l10n_ph_has_discount_privilege)

    # -------------------------------------------------------------------------
    # Non-PH guard (sale.order specific)
    # -------------------------------------------------------------------------

    def test_non_ph_guard(self):
        other_company = self.env["res.company"].create(
            {
                "name": "Non-PH Company",
                "country_id": self.env.ref("base.us").id,
            },
        )
        so = self.env["sale.order"].create(
            {
                "partner_id": self.partner_a.id,
                "company_id": other_company.id,
                "order_line": [
                    Command.create(
                        {
                            "name": "A",
                            "product_id": self.product_a.id,
                            "product_uom_qty": 1.0,
                            "price_unit": 100.0,
                        },
                    ),
                ],
            },
        )
        action = so.action_open_discount_privilege_wizard()
        self.assertEqual(action, {"type": "ir.actions.act_window_close"})

    # -------------------------------------------------------------------------
    # Security / access (sale module specific)
    # -------------------------------------------------------------------------

    def _create_salesman(self, login, enable_privileges=True):
        """Create a salesman. When ``enable_privileges`` is True the user also
        opts into the per-user "Discount Privileges (Sales)" group (mirroring
        the Sales settings toggle)."""
        group_ids = [Command.link(self.env.ref("sales_team.group_sale_salesman").id)]
        if enable_privileges:
            group_ids.append(
                Command.link(
                    self.env.ref("l10n_ph_sale.group_l10n_ph_discount_privilege_sale").id,
                ),
            )
        return self.env["res.users"].create(
            {
                "name": "Salesman",
                "login": login,
                "email": login,
                "company_id": self.company_data["company"].id,
                "company_ids": [Command.set(self.company_data["company"].ids)],
                "group_ids": group_ids,
            },
        )

    def test_security_salesman_can_read_privilege(self):
        """An enabled salesman can read discount privilege definitions."""
        salesman = self._create_salesman("sale_man_test@example.com")
        privilege = (
            self.env["l10n_ph.discount.privilege"]
            .with_user(salesman)
            .search([("id", "=", self.privilege.id)])
        )
        self.assertTrue(privilege)

    def test_security_salesman_cannot_create_privilege(self):
        """A salesman cannot create discount privilege definitions."""
        salesman = self._create_salesman("sale_man2@example.com")
        with self.assertRaises(AccessError):
            self.env["l10n_ph.discount.privilege"].with_user(salesman).create(
                {
                    "name": "Should Not Create",
                    "discount_amount": 10.0,
                    "account_id": self.special_discount_account.id,
                    "company_id": self.company_data["company"].id,
                },
            )

    def test_security_salesman_can_use_wizard(self):
        """An enabled salesman can create and use the discount privilege wizard."""
        salesman = self._create_salesman("sale_man3@example.com")
        # Create SO as the salesman so record rules allow write access
        so = (
            self.env["sale.order"]
            .with_user(salesman)
            .create(
                {
                    "partner_id": self.partner_a.id,
                    "user_id": salesman.id,
                    "order_line": [
                        Command.create(
                            {
                                "name": "A",
                                "product_id": self.product_a.id,
                                "product_uom_qty": 1.0,
                                "price_unit": 100.0,
                                "tax_ids": [Command.set(self.base_tax.ids)],
                            },
                        ),
                    ],
                },
            )
        )
        wizard = (
            self.env["l10n_ph.discount.privilege.wizard"]
            .with_user(salesman)
            .create(
                {
                    "order_id": so.id,
                    "privilege_id": self.privilege_without_tax.id,
                    "apply_on": "all",
                },
            )
        )
        wizard.with_user(salesman).action_confirm()
        self.assertTrue(so.order_line.l10n_ph_discount_privilege_id)

    def test_security_plain_salesman_cannot_use_wizard(self):
        """A salesman who has NOT enabled Discount Privileges (Sales) has no
        access at all: cannot read privilege definitions nor open/use the apply
        wizard. Enabling is per internal user, not automatic for all salesmen
        (spec #2)."""
        salesman = self._create_salesman("plain_salesman@example.com", enable_privileges=False)
        with self.assertRaises(AccessError):
            self.env["l10n_ph.discount.privilege"].with_user(salesman).search(
                [("id", "=", self.privilege.id)],
            )
        so = (
            self.env["sale.order"]
            .with_user(salesman)
            .create(
                {
                    "partner_id": self.partner_a.id,
                    "order_line": [
                        Command.create(
                            self._soline_vals(
                                name="A", product=self.product_a, price_unit=100.0,
                            ),
                        ),
                    ],
                },
            )
        )
        with self.assertRaises(AccessError):
            self.env["l10n_ph.discount.privilege.wizard"].with_user(salesman).create(
                {"order_id": so.id, "apply_on": "all"},
            )

    def test_security_salesman_not_in_accounting_group(self):
        """A salesman does NOT get the accounting privilege group."""
        salesman = self._create_salesman("pure_salesman@example.com")
        account_group = self.env.ref("l10n_ph.group_l10n_ph_discount_privilege")
        self.assertNotIn(account_group.id, salesman.group_ids.ids)

    def test_config_enable_adds_user_to_sale_group(self):
        """The Sales settings toggle opts the current user into the sale group
        (per-user enablement, spec #2)."""
        sale_group = self.env.ref("l10n_ph_sale.group_l10n_ph_discount_privilege_sale")
        self.env.user.write({"group_ids": [Command.unlink(sale_group.id)]})
        self.assertNotIn(sale_group.id, self.env.user.group_ids.ids)
        self.env["res.config.settings"].create(
            {"l10n_ph_enable_discount_privilege_sale": True},
        ).execute()
        self.assertIn(sale_group.id, self.env.user.group_ids.ids)

    # -------------------------------------------------------------------------
    # Spec #3.1: a privileged line's discount cannot be manually overridden.
    # -------------------------------------------------------------------------

    def test_order_line_discount_locked_with_privilege(self):
        """Once a Discount Privilege is applied, the line's regular discount
        cannot be manually changed (the privilege defines the discount)."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertEqual(so.order_line.discount, 20.0)
        with self.assertRaises(UserError):
            so.order_line.write({"discount": 5.0})

    def test_order_line_discount_unlocked_after_removal(self):
        """After the privilege is removed the discount is editable again."""
        so = self._create_so(
            self._soline_vals(
                name="A", product=self.product_a, price_unit=100.0, discount=10.0,
            ),
        )
        wiz = self._create_wizard(so, privilege_id=self.privilege.id, apply_on="all")
        wiz.action_confirm()
        self.assertEqual(so.order_line.discount, 20.0)
        wiz.action_remove_all()
        self.assertEqual(so.order_line.discount, 10.0)
        # now editable again
        so.order_line.write({"discount": 7.0})
        self.assertEqual(so.order_line.discount, 7.0)

    # -------------------------------------------------------------------------
    # Spec #3.2: privileged lines are excluded from the global/line discounts
    # (no double discounting). Fixed-amount discount is unaffected in behaviour.
    # -------------------------------------------------------------------------

    def test_line_discount_skips_privileged_lines(self):
        """'On All Order Lines' discount does not override privileged lines."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0, discount=10.0),
            self._soline_vals(name="B", product=self.product_b, price_unit=200.0, discount=0.0),
        )
        wiz = self._create_wizard(
            so,
            privilege_id=self.privilege.id,
            apply_on="product",
            product_ids=[Command.set(self.product_a.ids)],
        )
        wiz.action_confirm()
        privileged = so.order_line.filtered("l10n_ph_discount_privilege_id")
        self.assertEqual(len(privileged), 1)
        self.assertEqual(privileged.discount, 20.0)

        discount_wiz = self.env["sale.order.discount"].create(
            {
                "sale_order_id": so.id,
                "discount_type": "sol_discount",
                "discount_percentage": 0.1,
            },
        )
        discount_wiz.action_apply_discount()

        line_a = so.order_line.filtered(lambda line: line.product_id == self.product_a)
        line_b = so.order_line.filtered(lambda line: line.product_id == self.product_b)
        # Privileged line keeps its privilege discount (not overridden to 10%).
        self.assertEqual(line_a.discount, 20.0)
        # Non-privileged line receives the 10% line discount.
        self.assertEqual(line_b.discount, 10.0)

    def test_global_discount_excludes_privileged_lines(self):
        """Global discount does not consume privileged lines' amounts."""
        so = self._create_so(
            self._soline_vals(name="A", product=self.product_a, price_unit=100.0),
            self._soline_vals(name="B", product=self.product_b, price_unit=200.0),
        )
        wiz = self._create_wizard(
            so,
            privilege_id=self.privilege.id,
            apply_on="product",
            product_ids=[Command.set(self.product_a.ids)],
        )
        wiz.action_confirm()
        privileged = so.order_line.filtered("l10n_ph_discount_privilege_id")
        self.assertEqual(len(privileged), 1)
        self.assertEqual(privileged.discount, 20.0)

        discount_wiz = self.env["sale.order.discount"].create(
            {
                "sale_order_id": so.id,
                "discount_type": "so_discount",
                "discount_percentage": 0.1,
            },
        )
        discount_wiz.action_apply_discount()

        # The privileged line's discount is unchanged by the global discount.
        self.assertEqual(privileged.discount, 20.0)
        # A global discount line was still created for the remaining (non-privileged) lines.
        discount_product = so.company_id.sale_discount_product_id
        self.assertTrue(
            so.order_line.filtered(lambda line: line.product_id == discount_product),
        )
