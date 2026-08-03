# Part of Odoo. See LICENSE file for full copyright and licensing details.
import odoo.tests

from odoo.addons.pos_self_order.tests.self_order_common_test import SelfOrderCommonTest


@odoo.tests.tagged("post_install", "-at_install")
class TestSelfOrderUrl(SelfOrderCommonTest):
    def setUp(self):
        super().setUp()
        self.pos_config.write({
            "self_ordering_mode": "mobile",
            "self_ordering_pay_after": "each",
        })
        self.pos_config.with_user(self.pos_user).open_ui()
        self.pos_config.current_session_id.set_opening_control(0, "")

    def _create_order(self, **kwargs):
        vals = {
            "session_id": self.pos_config.current_session_id.id,
            "amount_total": 0.0,
            "amount_tax": 0.0,
            "amount_return": 0.0,
            "amount_paid": 0.0,
            "preset_id": self.in_preset.id,
        }
        vals.update(kwargs)
        return self.env["pos.order"].create(vals)

    # --- _get_self_order_route ----------------------------------------------------------

    def test_get_self_order_route_consultation(self):
        self.pos_config.write({"self_ordering_mode": "consultation"})
        route = self.pos_config._get_self_order_route(table_id=self.pos_table_1.id)
        self.assertEqual(route, f"/pos-self/{self.pos_config.id}")

        order = self._create_order()
        route = self.pos_config._get_self_order_route(order=order)
        self.assertEqual(route, f"/pos-self/{self.pos_config.id}")

    def test_get_self_order_route_mobile(self):
        route = self.pos_config._get_self_order_route()
        self.assertEqual(
            route,
            f"/pos-self/{self.pos_config.id}?access_token={self.pos_config.access_token}",
        )

        route = self.pos_config._get_self_order_route(table_id=self.pos_table_1.id)
        self.assertEqual(
            route,
            f"/pos-self/{self.pos_config.id}"
            f"?access_token={self.pos_config.access_token}"
            f"&table_identifier={self.pos_table_1.identifier}",
        )

        order = self._create_order()
        route = self.pos_config._get_self_order_route(table_id=self.pos_table_1.id, order=order)
        self.assertEqual(
            route,
            f"/pos-self/{self.pos_config.id}/order/{order.access_token}"
            f"?access_token={self.pos_config.access_token}",
        )

    def test_get_self_order_route_kiosk(self):
        self.pos_config.write({"self_ordering_mode": "kiosk"})
        route = self.pos_config._get_self_order_route(table_id=self.pos_table_1.id)
        self.assertEqual(
            route,
            f"/pos-self/{self.pos_config.id}?access_token={self.pos_config.access_token}",
        )

        order = self._create_order()
        route = self.pos_config._get_self_order_route(order=order)
        self.assertEqual(
            route,
            f"/pos-self/{self.pos_config.id}?access_token={self.pos_config.access_token}",
        )

    # --- _get_self_order_url ------------------------------------------------------------

    def test_get_self_order_url_title_variants(self):
        no_context_url = self.pos_config._get_self_order_url()
        table_url = self.pos_config._get_self_order_url(table_id=self.pos_table_1.id)
        order = self._create_order()
        order_url = self.pos_config._get_self_order_url(order=order)

        link_no_context = self.env["link.tracker"].search([("short_url", "=", no_context_url)])
        link_table = self.env["link.tracker"].search([("short_url", "=", table_url)])
        link_order = self.env["link.tracker"].search([("short_url", "=", order_url)])

        self.assertEqual(link_no_context.title, f"Self Order {self.pos_config.name}")
        self.assertEqual(link_table.title, f"Self Order {self.pos_config.name} - Table id {self.pos_table_1.id}")
        self.assertEqual(link_order.title, f"Self Order {self.pos_config.name} - Order {order.tracking_number}")

        order_no_tracking = self._create_order(pos_reference="manually-set-reference")
        self.assertFalse(order_no_tracking.tracking_number)
        order_url = self.pos_config._get_self_order_url(order=order_no_tracking)
        link_order = self.env["link.tracker"].search([("short_url", "=", order_url)])

        self.assertEqual(link_order.title, f"Self Order {self.pos_config.name}")

    def test_get_self_order_url_reuses_link_tracker_for_the_same_url(self):
        url_1 = self.pos_config._get_self_order_url(table_id=self.pos_table_1.id)
        url_2 = self.pos_config._get_self_order_url(table_id=self.pos_table_1.id)

        self.assertEqual(url_1, url_2)
        self.assertEqual(len(self.env["link.tracker"].search([("short_url", "=", url_1)])), 1)

    # --- get_dynamic_qr_url ------------------------------------------------------

    def test_get_dynamic_qr_url(self):
        self.pos_config.write({
            "self_ordering_mode": "mobile",
            "self_ordering_pay_after": "meal",
            "self_ordering_service_mode": "table",
        })
        order = self._create_order()

        # Normal case
        url = self.pos_config.get_dynamic_qr_url(order.id)
        self.assertEqual(
            url,
            self.pos_config.get_base_url() + f"/pos-self/{self.pos_config.id}/order/{order.access_token}"
            f"?access_token={self.pos_config.access_token}",
        )

        # Wrong mode.
        self.pos_config.self_ordering_mode = "consultation"
        self.assertFalse(self.pos_config.get_dynamic_qr_url(order.id))
        self.pos_config.self_ordering_mode = "mobile"

        # Wrong pay_after.
        self.pos_config.self_ordering_pay_after = "each"
        self.assertFalse(self.pos_config.get_dynamic_qr_url(order.id))
        self.pos_config.self_ordering_pay_after = "meal"

        # Unknown order id.
        self.assertFalse(self.pos_config.get_dynamic_qr_url(order.id + 100000))

        # Order belongs to a different config.
        other_config = self.env["pos.config"].create({"name": "Other config"})
        order.config_id = other_config.id
        self.assertFalse(self.pos_config.get_dynamic_qr_url(order.id))
        order.config_id = self.pos_config.id

        # Order no longer draft.
        order.state = "paid"
        self.assertFalse(self.pos_config.get_dynamic_qr_url(order.id))
