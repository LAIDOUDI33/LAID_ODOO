from odoo import api, fields, models
from odoo.tools import SQL


class OauthProxyRemoteClient(models.Model):
    _name = 'oauth.proxy.remote.client'
    _description = 'OAuth Proxy - The registered oauth.client of the proxy on a target Odoo database'
    _auto = False  # so we can have a secret column: see odoo_client_secret in init()

    db_url = fields.Char(required=True, index=True)
    odoo_client_id = fields.Char(required=True)

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            db_url varchar NOT NULL,
            odoo_client_id varchar NOT NULL,
            odoo_client_secret varchar,
            CONSTRAINT oauth_proxy_remote_client_db_url_unique UNIQUE (db_url)
        )
        """, table=table))

    @api.model
    def _register_remote_client(self, db_url, odoo_client_id, odoo_client_secret):
        """Register this proxy's oauth.client on the target database at `db_url`.

        `odoo_client_secret` is kept in plaintext, not hashed: this proxy has to present it
        back to the target Odoo database on every token exchange, so it must stay reversible.
        """
        self.env.cr.execute(SQL(
            """
            INSERT INTO %(table)s (db_url, odoo_client_id, odoo_client_secret)
            VALUES (%(db_url)s, %(odoo_client_id)s, %(odoo_client_secret)s)
            RETURNING id
            """,
            table=SQL.identifier(self._table),
            db_url=db_url, odoo_client_id=odoo_client_id, odoo_client_secret=odoo_client_secret,
        ))
        [new_id] = self.env.cr.fetchone()
        return self.browse(new_id)

    def _get_client_secret(self):
        self.ensure_one()
        self.env.cr.execute(SQL(
            "SELECT odoo_client_secret FROM %(table)s WHERE id = %(id)s",
            table=SQL.identifier(self._table), id=self.id,
        ))
        [odoo_client_secret] = self.env.cr.fetchone()
        return odoo_client_secret
