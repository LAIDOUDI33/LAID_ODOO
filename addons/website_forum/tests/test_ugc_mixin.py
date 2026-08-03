from odoo.tests import tagged

from odoo.addons.website_forum.tests.common import TestForumCommon


@tagged("forum_internals")
class TestForumUgcMixin(TestForumCommon):
    def test_forum_comment_create_adds_ugc_nofollow(self):
        """Creating a comment on a forum post should add rel='ugc nofollow' to links."""
        body = '<p>Check <a href="https://example.com">this</a> out</p>'
        message = self.env["forum.post.comment"].create(
            {"body": body, "post_id": self.post.id}
        )
        self.assertIn("ugc", message.body)
        self.assertIn("nofollow", message.body)

    def test_mail_message_write_adds_ugc_nofollow(self):
        """Writing to a forum post comment should add rel='ugc nofollow' to links."""
        body = "This comment has no links."
        message = self.env["forum.post.comment"].create(
            {"body": body, "post_id": self.post.id}
        )
        message.write({"body": '<p>Visit <a href="https://example.com">here</a></p>'})
        self.assertIn("ugc", message.body)
        self.assertIn("nofollow", message.body)
