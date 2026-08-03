from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import (
    _generate_hash, _generate_secret, _verify_hash, verifier_matches_challenge, OAUTH_SECRET_INDEX_SIZE,
)
from odoo.exceptions import AccessDenied
from odoo.tools import SQL

from odoo.addons.auth_oauth_server.utils.oauth_utils import get_resource
from odoo.addons.auth_oauth_server.models.oauth_token import TOKEN_TTL_SECONDS
from odoo.addons.auth_oauth_server_base.types.types import TokenGrantResult


class OauthAuthorizationCode(models.Model):
    _name = 'oauth.authorization.code'
    _description = 'OAuth 2.1 Authorization Code'
    _auto = False

    client_id = fields.Many2one('oauth.client', required=True, ondelete='cascade')
    redirect_uri = fields.Char(required=True)
    code_challenge = fields.Char(required=True)
    code_challenge_method = fields.Selection([('S256', 'S256')], required=True, default='S256')
    scope = fields.Char(required=True)
    user_id = fields.Many2one('res.users', required=True, ondelete='cascade')
    expires_at = fields.Datetime(required=True)

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            code_hash varchar NOT NULL,
            code_index varchar(%(index_size)s) NOT NULL CHECK (char_length(code_index) = %(index_size)s),
            client_id integer NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
            redirect_uri varchar NOT NULL,
            code_challenge varchar NOT NULL,
            code_challenge_method varchar NOT NULL,
            scope varchar NOT NULL,
            user_id integer NOT NULL REFERENCES res_users(id) ON DELETE CASCADE,
            expires_at timestamp without time zone NOT NULL
        )
        """, table=table, index_size=OAUTH_SECRET_INDEX_SIZE))
        self.env.cr.execute(SQL(
            "CREATE INDEX IF NOT EXISTS %s ON %s (code_index)",
            SQL.identifier(self._table + "_code_index_index"),
            table,
        ))

    def _generate(self, client, redirect_uri, code_challenge, scope, user, token_ttl_seconds=120):
        code = _generate_secret()
        # sudo => The checks to validate the client, redirect_uri and code_challenge format are done in the controller
        self.env.cr.execute(SQL(
            """
            INSERT INTO %(table)s
                (code_hash, code_index, client_id, redirect_uri, code_challenge, code_challenge_method, scope, user_id, expires_at)
            VALUES
                (%(code_hash)s, %(code_index)s, %(client_id)s, %(redirect_uri)s, %(code_challenge)s, %(code_challenge_method)s, %(scope)s, %(user_id)s, %(expires_at)s)
            """,
            table=SQL.identifier(self._table),
            code_hash=_generate_hash(code),
            code_index=code[:OAUTH_SECRET_INDEX_SIZE],
            client_id=client.id,
            redirect_uri=redirect_uri,
            code_challenge=code_challenge,
            code_challenge_method='S256',
            scope=scope,
            user_id=user.id,
            expires_at=fields.Datetime.now() + timedelta(seconds=token_ttl_seconds),
        ))
        return code

    def _consume(self, code, client, redirect_uri, code_verifier) -> TokenGrantResult:
        """Redeem a single-use authorization code for a freshly minted OAuth token.

        Raises AccessDenied on any mismatch (unknown code, wrong client/redirect_uri,
        expired, or failed PKCE verification). On success the record is unlinked immediately, since a
        redeemed code must never be presented again - a replay then simply finds no matching code.
        """
        record = self._find_by_code(code, client)
        if not record:
            raise AccessDenied("Invalid authorization code")
        if record.expires_at < fields.Datetime.now():
            raise AccessDenied("Authorization code expired")
        # Exact match, port included, even for loopback redirect_uris: unlike the client's
        # registered URI (matched loosely at /authorize), this is the concrete URI the code
        # was actually issued to - it must be the same request end to end.
        if record.redirect_uri != redirect_uri:
            raise AccessDenied("redirect_uri does not match the authorization request")
        if not verifier_matches_challenge(code_verifier, record.code_challenge):
            raise AccessDenied("Invalid PKCE code_verifier")
        user, scope = record.user_id, record.scope
        resource = get_resource(self.env, client.resource_name)
        resource._check_user_access(user)
        record.sudo().unlink()

        access_token, refresh_token = self.env['oauth.token']._generate(client, user, scope)
        return {
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': TOKEN_TTL_SECONDS,
            'refresh_token': refresh_token,
            'scope': scope,
        }

    def _find_by_code(self, code, client):
        self.env.cr.execute(SQL(
            "SELECT id, code_hash FROM %(table)s WHERE code_index = %(code_index)s AND client_id = %(client_id)s",
            table=SQL.identifier(self._table), code_index=code[:OAUTH_SECRET_INDEX_SIZE], client_id=client.id,
        ))
        for row_id, code_hash in self.env.cr.fetchall():
            if _verify_hash(code, code_hash):
                return self.sudo().browse(row_id)
        return self.browse()

    @api.autovacuum
    def _gc_expired_codes(self):
        self.sudo().search([('expires_at', '<', fields.Datetime.now())]).unlink()
