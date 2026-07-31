import uuid
from urllib.parse import urlsplit

from odoo import api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools import SQL

from odoo.addons.auth_oauth_server_base.types.types import ClientRegistrationResult, ClientType
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_secret, _generate_hash, _verify_hash

# Only IP literals count - "localhost" is excluded since its resolution can be hijacked (DNS rebinding, hosts file).
LOOPBACK_HOSTS = {'127.0.0.1', '::1'}


class OauthClient(models.Model):
    _name = 'oauth.client'
    _description = 'OAuth 2.1 Client Application'
    _auto = False

    client_id = fields.Char(required=True, index=True, copy=False, readonly=True)
    client_name = fields.Char(required=True)
    client_type = fields.Selection(
        [('public', 'Public'), ('confidential', 'Confidential')],
        required=True, readonly=True,
    )
    redirect_uris = fields.Text(
        required=True,
        help="One redirect URI per line. Must be HTTPS, except for RFC 8252 http:// loopback URIs.",
    )
    resource_name = fields.Char(
        required=True, readonly=True,
        help="The resource namespace this client registered under (e.g. rpc, mcp, etc)",
    )

    def init(self):
        table = SQL.identifier(self._table)
        self.env.cr.execute(SQL("""
        CREATE TABLE IF NOT EXISTS %(table)s (
            id serial primary key,
            client_id varchar NOT NULL,
            client_name varchar NOT NULL,
            client_type varchar NOT NULL,
            client_secret_hash varchar,
            redirect_uris text NOT NULL,
            resource_name varchar NOT NULL,
            CONSTRAINT oauth_client_client_id_unique UNIQUE (client_id)
        )
        """, table=table))

    @api.model
    def _register_client(self, resource_name: str, client_name: str, redirect_uris: list[str], client_type: ClientType = 'public') -> ClientRegistrationResult:
        """Register a new OAuth client (RFC 7591 Dynamic Client Registration).

        :returns: dict with `client_id` and, for confidential clients `client_secret`.
        """
        self._validate_redirect_uris(redirect_uris)
        vals = {
            'client_id': uuid.uuid4().hex,
            'client_name': client_name,
            'client_type': client_type,
            'redirect_uris': '\n'.join(redirect_uris),
            'resource_name': resource_name,
        }
        client = self.sudo().create(vals)

        client_secret = None
        if client_type == 'confidential':
            client_secret = _generate_secret()
            client._set_client_secret_hash(_generate_hash(client_secret))

        result: ClientRegistrationResult = {'client_id': client.client_id}
        if client_secret:
            result['client_secret'] = client_secret
        return result

    def _set_client_secret_hash(self, client_secret_hash):
        self.ensure_one()
        self.env.cr.execute(SQL(
            "UPDATE %(table)s SET client_secret_hash = %(hash)s WHERE id = %(id)s",
            table=SQL.identifier(self._table), hash=client_secret_hash, id=self.id,
        ))

    def _get_client_secret_hash(self):
        self.ensure_one()
        self.env.cr.execute(SQL(
            "SELECT client_secret_hash FROM %(table)s WHERE id = %(id)s",
            table=SQL.identifier(self._table), id=self.id,
        ))
        [client_secret_hash] = self.env.cr.fetchone()
        return client_secret_hash

    def _validate_redirect_uris(self, redirect_uris):
        if not redirect_uris:
            raise ValidationError("At least one redirect_uri is required.")

        for uri in redirect_uris:
            if not self._is_secure_redirect_uri(uri):
                raise ValidationError(
                    f"Invalid redirect_uri {uri!r}: only https:// URIs are allowed "
                    "(or http:// for a loopback address)."
                )

    def _is_secure_redirect_uri(self, uri: str) -> bool:
        parts = urlsplit(uri)
        if parts.scheme == 'https' and parts.hostname:
            return True
        return parts.scheme == 'http' and parts.hostname in LOOPBACK_HOSTS

    def _verify_client_secret(self, client_secret: str | None) -> bool:
        self.ensure_one()
        if not client_secret:
            return False
        client_secret_hash = self._get_client_secret_hash()
        if not client_secret_hash:
            return False
        return _verify_hash(client_secret, client_secret_hash)

    def _is_redirect_uri_registered(self, redirect_uri: str) -> bool:
        """Whether `redirect_uri` matches one of this client's registered URIs.

        RFC 8252 §7.3: A native app (desktop or mobile, as opposed to a web app run through a browser) can't
        host a fixed HTTPS redirect endpoint and uses loopback redirect URIs with plain HTTP instead.
        Also, a registered loopback URI matches regardless of port, since a native app binds a new ephemeral
        port on every run and can't pre-register it. Every other URI must match port included.
        """
        self.ensure_one()
        if not redirect_uri:
            return False

        registered_uris = [uri.strip() for uri in self.redirect_uris.splitlines()]
        if redirect_uri in registered_uris:
            return True

        redirect_uri_parts = urlsplit(redirect_uri)
        for candidate_uri in registered_uris:
            candidate_uri_parts = urlsplit(candidate_uri)
            if (
                candidate_uri_parts.scheme == 'http'
                and candidate_uri_parts.hostname in LOOPBACK_HOSTS
                and redirect_uri_parts.scheme == candidate_uri_parts.scheme
                and redirect_uri_parts.hostname == candidate_uri_parts.hostname
                and redirect_uri_parts.path == candidate_uri_parts.path
            ):
                return True

        return False
