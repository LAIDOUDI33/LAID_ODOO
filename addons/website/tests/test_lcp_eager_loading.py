from unittest.mock import MagicMock, patch

from odoo.tests.common import TransactionCase, tagged

from odoo.addons.website.models import ir_http as website_ir_http


@tagged("post_install", "-at_install")
class TestLcpEagerLoading(TransactionCase):
    def _mock_request(self, user_agent):
        req = MagicMock()
        req.httprequest.user_agent.string = user_agent
        return req

    def test_is_mobile_request(self):
        IrHttp = self.env["ir.http"]
        android = (
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
        )
        iphone = (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
            "Mobile/15E148 Safari/604.1"
        )
        desktop = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        )
        with patch.object(website_ir_http, "request", self._mock_request(android)):
            self.assertTrue(IrHttp._is_mobile_request())
        with patch.object(website_ir_http, "request", self._mock_request(iphone)):
            self.assertTrue(IrHttp._is_mobile_request())
        with patch.object(website_ir_http, "request", self._mock_request(desktop)):
            self.assertFalse(IrHttp._is_mobile_request())
        with patch.object(website_ir_http, "request", None):
            self.assertFalse(IrHttp._is_mobile_request())

    def _render_img(self, arch, **context):
        website = self.env.ref("base.default_website")
        view = self.env["ir.ui.view"].create(
            {
                "name": "lcp-test",
                "type": "qweb",
                "arch_db": '<t t-name="lcp-test">%s</t>' % arch,
            },
        )
        return self.env["ir.qweb"]._render(
            view.id,
            {},
            website_id=website.id,
            **context,
        )

    def test_lcp_desktop_marker_on_desktop_request(self):
        rendered = self._render_img(
            '<img src="/web/image/1" data-lcp-desktop="1"/>',
            is_mobile=False,
        )
        self.assertIn('loading="eager"', rendered)
        self.assertIn('fetchpriority="high"', rendered)
        self.assertNotIn("data-lcp-desktop", rendered)

    def test_lcp_desktop_marker_on_mobile_request(self):
        rendered = self._render_img(
            '<img src="/web/image/1" data-lcp-desktop="1"/>',
            is_mobile=True,
        )
        self.assertIn('loading="lazy"', rendered)
        self.assertNotIn("fetchpriority", rendered)
        self.assertNotIn("data-lcp-desktop", rendered)

    def test_lcp_mobile_marker_on_mobile_request(self):
        rendered = self._render_img(
            '<img src="/web/image/1" data-lcp-mobile="1"/>',
            is_mobile=True,
        )
        self.assertIn('loading="eager"', rendered)
        self.assertIn('fetchpriority="high"', rendered)
        self.assertNotIn("data-lcp-mobile", rendered)

    def test_template_cache_keys_include_is_mobile(self):
        self.assertIn("is_mobile", self.env["ir.qweb"]._get_template_cache_keys())
