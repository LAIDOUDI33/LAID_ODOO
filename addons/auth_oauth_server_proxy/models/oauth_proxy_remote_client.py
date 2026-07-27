from odoo import fields, models


class OauthProxyRemoteClient(models.Model):
    _name = 'oauth.proxy.remote.client'
    _description = 'OAuth Proxy - The registered oauth.client of the proxy on a target Odoo database'

    db_url = fields.Char(required=True, index=True)
    odoo_client_id = fields.Char(required=True)
    odoo_client_secret = fields.Char(
        groups=fields.NO_ACCESS,
        help="Plaintext, not hashed: this proxy has to present it back to the target "
             "Odoo database on every token exchange, so it must stay reversible.",
    )

    _db_url_unique = models.Constraint(
        'unique(db_url)',
        "Only one registration is kept per target database, shared by every inbound client.",
    )
