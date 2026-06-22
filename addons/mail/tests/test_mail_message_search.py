from odoo.tests import TransactionCase, tagged


@tagged("mail_message", "post_install", "-at_install")
class TestMailMessageSearch(TransactionCase):
    message_body = [
        '<p>"hello world"</p>',
        "<p>it's a test</p>",
        "<p>java`script</p>",
        "<p>&lt;hii&gt;</p>",
    ]
    search_terms = [
        "&quot;hello world&quot;",
        "it&#x27;s",
        "java&#x60;script",
        "&lt;hii&gt;",
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.channel = cls.env["discuss.channel"].create(
            {
                "name": "Test Search Channel",
                "channel_type": "channel",
            },
        )
        cls.MailMessage = cls.env["mail.message"]
        created_messages = cls.MailMessage.create(
            [
                {
                    "model": "discuss.channel",
                    "res_id": cls.channel.id,
                    "message_type": "comment",
                    "body": body,
                }
                for body in cls.message_body
            ],
        )

        cls.messages = {message.body: message for message in created_messages}

    def test_message_search_matches_html_encoded_quotes(self):
        for body, search_term in zip(self.message_body, self.search_terms):
            with self.subTest(search_term=search_term):
                result = self.MailMessage._message_fetch(
                    domain=[],
                    thread=self.channel,
                    search_term=search_term,
                )
                self.assertIn(self.messages[body], result["messages"])
