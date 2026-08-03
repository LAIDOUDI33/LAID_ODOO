from odoo.addons.website_blog.tests.common import TestWebsiteBlogCommon
from markupsafe import Markup


class TestBlogUgcMixin(TestWebsiteBlogCommon):

    def test_mail_message_create_adds_ugc_nofollow(self):
        """Creating a comment on a blog post should add rel='ugc nofollow' to links."""
        body = '<p>Check <a href="https://example.com">this</a> blog post</p>'
        message = self.test_blog_post.message_post(body=Markup(body))
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)

    def test_mail_message_write_adds_ugc_nofollow(self):
        """Writing to a blog post comment should add rel='ugc nofollow' to links."""
        message = self.test_blog_post.message_post(body=Markup('<p>No links</p>'))
        message.sudo().write({'body': '<p><a href="https://example.com">click here</a></p>', 'model': 'blog.post'})
        self.assertIn('ugc', message.body)
        self.assertIn('nofollow', message.body)
