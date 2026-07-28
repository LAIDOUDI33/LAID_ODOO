from odoo.tests import common


class TestUgcMixin(common.TransactionCase):
    def test_do_not_modify_html_without_links(self):
        mixin = self.env["website.ugc.mixin"]
        html = "<p>Hello world</p>"
        result = mixin._add_rel_values_to_links(html, {'ugc', 'nofollow'})
        self.assertEqual(result, html)

    def test_do_not_modify_plain_text(self):
        mixin = self.env["website.ugc.mixin"]
        html = "There aren't any tags here."
        result = mixin._add_rel_values_to_links(html, {'ugc', 'nofollow'})
        self.assertEqual(result, html)

    def test_add_ugc_no_follow_to_link(self):
        mixin = self.env["website.ugc.mixin"]
        html = '<p>Check <a href="https://example.com">this</a> out</p>'
        result = mixin._add_rel_values_to_links(html, {'ugc', 'nofollow'})
        self.assertIn("ugc", result)
        self.assertIn("nofollow", result)

    def test_add_ugc_no_follow_to_links_existing_rel(self):
        mixin = self.env["website.ugc.mixin"]
        html = '<a href="https://example.com" rel="noreferrer">link</a>'
        result = mixin._add_rel_values_to_links(html, {'ugc', 'nofollow'})
        self.assertIn("ugc", result)
        self.assertIn("nofollow", result)
        self.assertIn("noreferrer", result)

    def test_add_ugc_no_follow_to_links_multiple_links(self):
        mixin = self.env["website.ugc.mixin"]
        html = (
            '<p><a href="https://a.com">A</a></p>'
            '<p><a href="https://b.com" rel="nofollow">B</a></p>'
            '<p><a href="https://c.com">C</a></p>'
        )
        result = mixin._add_rel_values_to_links(html, {'ugc', 'nofollow'})
        self.assertEqual(result.count("ugc"), 3)
        self.assertEqual(result.count("nofollow"), 3)
