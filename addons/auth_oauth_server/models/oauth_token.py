from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import (
    _generate_hash, _generate_secret, _verify_hash, OAUTH_SECRET_INDEX_SIZE,
)
from odoo.exceptions import AccessDenied
from odoo.tools import SQL

from odoo.addons.auth_oauth_server_base.types.types import TokenGrantResult

# Shared by the apikey's own expiration and its backing refresh token's rotation window
TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60


class OauthToken(models.Model):
    _name = 'oauth.token'
    _description = 'OAuth 2.1 Refresh Token'
    _auto = False

    client_id = fields.Many2one('oauth.client', required=True, ondelete='cascade')
    user_id = fields.Many2one('res.users', required=True, ondelete='cascade')
    scope = fields.Char(required=True)
    access_token_id = fields.Many2one('res.users.apikeys', required=True)
    expires_at = fields.Datetime(required=True)

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            refresh_token_hash varchar NOT NULL,
            refresh_token_index varchar(%(index_size)s) NOT NULL CHECK (char_length(refresh_token_index) = %(index_size)s),
            client_id integer NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
            user_id integer NOT NULL REFERENCES res_users(id) ON DELETE CASCADE,
            scope varchar NOT NULL,
            access_token_id integer NOT NULL REFERENCES res_users_apikeys(id) ON DELETE CASCADE,
            expires_at timestamp without time zone NOT NULL
        )
        """, table=table, index_size=OAUTH_SECRET_INDEX_SIZE))
        self.env.cr.execute(SQL(
            "CREATE INDEX IF NOT EXISTS %s ON %s (refresh_token_index)",
            SQL.identifier(self._table + "_refresh_token_index_index"),
            table,
        ))

    def _generate(self, client, user, scope, token_ttl_seconds=TOKEN_TTL_SECONDS):
        access_token, access_token_id = self.env['res.users.apikeys'].with_user(user).sudo()._generate(
            scope=scope,
            name=f'OAuth: {client.client_name}',
            expiration_date=fields.Datetime.now() + timedelta(seconds=TOKEN_TTL_SECONDS)
        )
        refresh_token = _generate_secret()
        self.env.cr.execute(SQL(
            """
            INSERT INTO %(table)s
                (refresh_token_hash, refresh_token_index, client_id, user_id, access_token_id, scope, expires_at)
            VALUES
                (%(refresh_token_hash)s, %(refresh_token_index)s, %(client_id)s, %(user_id)s, %(access_token_id)s, %(scope)s, %(expires_at)s)
            """,
            table=SQL.identifier(self._table),
            refresh_token_hash=_generate_hash(refresh_token),
            refresh_token_index=refresh_token[:OAUTH_SECRET_INDEX_SIZE],
            client_id=client.id,
            user_id=user.id,
            access_token_id=access_token_id,
            scope=scope,
            expires_at=fields.Datetime.now() + timedelta(seconds=token_ttl_seconds),
        ))
        return access_token, refresh_token

    def _rotate(self, token, client) -> TokenGrantResult:
        """Redeem a single-use refresh token grant for an access token,
        and revoke the apikey the old refresh token was backed by.

        Raises AccessDenied if the token is unknown or expired. On success the
        record is unlinked immediately, since a redeemed refresh token must never
        be presented again - a replay then simply finds no matching token.
        """
        record = self._find_by_refresh_token(token, client)
        if not record:
            raise AccessDenied("Invalid refresh token")
        if record.expires_at < fields.Datetime.now():
            raise AccessDenied("Refresh token is expired")
        user, scope = record.user_id, record.scope
        record._revoke()

        new_access_token, new_refresh_token = self._generate(client, user, scope)

        return {
            'access_token': new_access_token,
            'token_type': 'Bearer',
            'expires_in': TOKEN_TTL_SECONDS,
            'refresh_token': new_refresh_token,
            'scope': scope,
        }

    def _find_by_refresh_token(self, refresh_token, client):
        self.env.cr.execute(SQL(
            "SELECT id, refresh_token_hash FROM %(table)s WHERE refresh_token_index = %(index)s AND client_id = %(client_id)s",
            table=SQL.identifier(self._table), index=refresh_token[:OAUTH_SECRET_INDEX_SIZE], client_id=client.id,
        ))
        for row_id, refresh_token_hash in self.env.cr.fetchall():
            if _verify_hash(refresh_token, refresh_token_hash):
                return self.sudo().browse(row_id)
        return self.browse()

    def _find_by_access_token(self, access_token, client):
        """Find the live grant backing the access token `access_token`, if any.

        :returns: the matching record, or an empty recordset if `access_token` isn't a live apikey,
            or its grant doesn't belong to the same user/client as the apikey.
        """
        user_id, access_token_id = self.env['res.users.apikeys']._find_by_key(access_token)
        if not access_token_id:
            return self.browse()
        record = self.sudo().search([
            ('access_token_id', '=', access_token_id),
            ('client_id', '=', client.id),
        ], limit=1)
        if record.user_id.id == user_id:
            return record
        return self.browse()

    def _revoke(self):
        """Remove the apikey backing this grant, and unlink the grant itself."""
        # Removing the apikey will cascade to the current record.
        self.access_token_id.sudo()._remove()

    @api.autovacuum
    def _gc_stale_refresh_tokens(self):
        self.sudo().search([('expires_at', '<', fields.Datetime.now())]).unlink()
