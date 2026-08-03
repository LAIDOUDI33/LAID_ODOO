from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_hash, _verify_hash, OAUTH_SECRET_INDEX_SIZE
from odoo.tools import SQL


class OauthProxyAuthorizationCode(models.Model):
    _name = 'oauth.proxy.authorization.code'
    _description = 'Routing table for authorization codes this proxy relays'
    _auto = False  # so we can have a secret column: see code_hash/code_index in init()

    redirect_uri = fields.Char(
        required=True,
        help="The inbound client's redirect_uri this code was issued to; must match the one "
             "presented when the code is redeemed.",
    )
    remote_client_id = fields.Many2one('oauth.proxy.remote.client', required=True, ondelete='cascade')
    client_id = fields.Many2one(
        'oauth.client', required=True, ondelete='cascade',
        help="The inbound client this code was issued to",
    )
    create_date = fields.Datetime(readonly=True)

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            code_index varchar(%(index_size)s) NOT NULL CHECK (char_length(code_index) = %(index_size)s),
            code_hash varchar NOT NULL,
            redirect_uri varchar NOT NULL,
            remote_client_id integer NOT NULL REFERENCES oauth_proxy_remote_client(id) ON DELETE CASCADE,
            client_id integer NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
            create_date timestamp without time zone DEFAULT (now() at time zone 'utc')
        )
        """, table=table, index_size=OAUTH_SECRET_INDEX_SIZE))
        self.env.cr.execute(SQL(
            "CREATE INDEX IF NOT EXISTS %s ON %s (code_index)",
            SQL.identifier(self._table + "_code_index_index"),
            table,
        ))

    @api.model
    def _store(self, code, remote_client, client, redirect_uri):
        self.env.cr.execute(SQL(
            """
            INSERT INTO %(table)s (code_index, code_hash, redirect_uri, remote_client_id, client_id)
            VALUES (%(code_index)s, %(code_hash)s, %(redirect_uri)s, %(remote_client_id)s, %(client_id)s)
            """,
            table=SQL.identifier(self._table),
            code_index=code[:OAUTH_SECRET_INDEX_SIZE],
            code_hash=_generate_hash(code),
            redirect_uri=redirect_uri,
            remote_client_id=remote_client.id,
            client_id=client.id,
        ))

    @api.model
    def _find(self, code, client, redirect_uri):
        self.env.cr.execute(SQL(
            "SELECT id, code_hash FROM %(table)s WHERE code_index = %(code_index)s AND client_id = %(client_id)s AND redirect_uri = %(redirect_uri)s",
            table=SQL.identifier(self._table), code_index=code[:OAUTH_SECRET_INDEX_SIZE], client_id=client.id, redirect_uri=redirect_uri,
        ))
        for row_id, code_hash in self.env.cr.fetchall():
            if _verify_hash(code, code_hash):
                return self.sudo().browse(row_id)
        return None

    @api.autovacuum
    def _gc_abandoned_codes(self):
        self.sudo().search([('create_date', '<', fields.Datetime.now() - timedelta(minutes=2))]).unlink()
