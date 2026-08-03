from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_hash, _verify_hash, OAUTH_SECRET_INDEX_SIZE
from odoo.tools import SQL


class OauthProxyToken(models.Model):
    _name = 'oauth.proxy.token'
    _description = 'Routing table for access/refresh token pairs this proxy relays'
    _auto = False

    remote_client_id = fields.Many2one('oauth.proxy.remote.client', required=True, ondelete='cascade')
    client_id = fields.Many2one(
        'oauth.client', required=True, ondelete='cascade',
        help="The inbound client this token pair was issued to.",
    )
    create_date = fields.Datetime(readonly=True)

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            access_token_index varchar(%(index_size)s) NOT NULL CHECK (char_length(access_token_index) = %(index_size)s),
            access_token_hash varchar NOT NULL,
            refresh_token_index varchar(%(index_size)s) NOT NULL CHECK (char_length(refresh_token_index) = %(index_size)s),
            refresh_token_hash varchar NOT NULL,
            remote_client_id integer NOT NULL REFERENCES oauth_proxy_remote_client(id) ON DELETE CASCADE,
            client_id integer NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
            create_date timestamp without time zone DEFAULT (now() at time zone 'utc')
        )
        """, table=table, index_size=OAUTH_SECRET_INDEX_SIZE))
        self.env.cr.execute(SQL(
            """
            CREATE INDEX IF NOT EXISTS %(access_token_index_name)s ON %(table)s (access_token_index);
            CREATE INDEX IF NOT EXISTS %(refresh_token_index_name)s ON %(table)s (refresh_token_index);
            """,
            access_token_index_name=SQL.identifier(self._table + "_access_token_index_index"),
            refresh_token_index_name=SQL.identifier(self._table + "_refresh_token_index_index"),
            table=table,
        ))

    @api.model
    def _store(self, access_token, refresh_token, remote_client, client):
        self.env.cr.execute(SQL(
            """
            INSERT INTO %(table)s
                (access_token_index, access_token_hash, refresh_token_index, refresh_token_hash, remote_client_id, client_id)
            VALUES
                (%(access_token_index)s, %(access_token_hash)s, %(refresh_token_index)s, %(refresh_token_hash)s, %(remote_client_id)s, %(client_id)s)
            """,
            table=SQL.identifier(self._table),
            access_token_index=access_token[:OAUTH_SECRET_INDEX_SIZE],
            access_token_hash=_generate_hash(access_token),
            refresh_token_index=refresh_token[:OAUTH_SECRET_INDEX_SIZE],
            refresh_token_hash=_generate_hash(refresh_token),
            remote_client_id=remote_client.id,
            client_id=client.id,
        ))

    @api.model
    def _find_by_access_token(self, access_token, client=None):
        conditions = [SQL("access_token_index = %s", access_token[:OAUTH_SECRET_INDEX_SIZE])]
        if client:
            conditions.append(SQL("client_id = %s", client.id))

        self.env.cr.execute(SQL(
            "SELECT id, access_token_hash FROM %(table)s WHERE %(where)s",
            table=SQL.identifier(self._table), where=SQL(" AND ").join(conditions),
        ))
        for row_id, access_token_hash in self.env.cr.fetchall():
            if _verify_hash(access_token, access_token_hash):
                return self.sudo().browse(row_id)
        return None

    @api.model
    def _find_by_refresh_token(self, refresh_token, client):
        self.env.cr.execute(SQL(
            "SELECT id, refresh_token_hash FROM %(table)s WHERE refresh_token_index = %(index)s AND client_id = %(client_id)s",
            table=SQL.identifier(self._table), index=refresh_token[:OAUTH_SECRET_INDEX_SIZE], client_id=client.id,
        ))
        for row_id, refresh_token_hash in self.env.cr.fetchall():
            if _verify_hash(refresh_token, refresh_token_hash):
                return self.sudo().browse(row_id)
        return None

    @api.autovacuum
    def _gc_stale_tokens(self):
        self.sudo().search([('create_date', '<', fields.Datetime.now() - timedelta(days=30))]).unlink()
