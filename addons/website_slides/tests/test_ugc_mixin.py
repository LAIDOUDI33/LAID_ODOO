from odoo.addons.website_slides.tests.common import SlidesCase
from markupsafe import Markup


class TestSlidesUgcMixin(SlidesCase):

    def test_mail_message_create_adds_ugc_nofollow(self):
        """Creating a comment on a slide should add rel='ugc nofollow' to links."""
        body = '<p>Check <a href="https://example.com">this</a> out!</p>'
        message = self.slide.message_post(body=Markup(body))
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)

    def test_mail_message_write_adds_ugc_nofollow(self):
        """Writing to a slide comment should add rel='ugc nofollow' to links."""
        message = self.slide.message_post(body=Markup('<p>No links</p>'))
        message.sudo().write({'body': '<p><a href="https://example.com">click here</a></p>', 'model': 'slide.slide'})
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)
