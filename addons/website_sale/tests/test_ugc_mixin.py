from odoo.tests import common
from markupsafe import Markup


class TestSaleUgcMixin(common.TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.product_template = cls.env['product.template'].create({
            'name': 'Test Product',
        })

    def test_mail_message_create_adds_ugc_nofollow(self):
        """Creating a comment on a product should add rel='ugc nofollow' to links."""
        body = '<p>Check <a href="https://example.com">this</a> product</p>'
        message = self.product_template.message_post(body=Markup(body))
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)

    def test_mail_message_write_adds_ugc_nofollow(self):
        """Writing to a product comment should add rel='ugc nofollow' to links."""
        message = self.product_template.message_post(body=Markup('<p>No links</p>'))
        message.write({'body': '<p><a href="https://example.com">click here</a></p>', 'model': 'product.template'})
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)
