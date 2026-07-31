from odoo import http
from odoo.exceptions import AccessDenied, ValidationError
from odoo.http import request
from werkzeug.exceptions import BadRequest, default_exceptions

from odoo.addons.auth_oauth_server_base.utils.oauth_utils import oauth_base_url
from odoo.addons.auth_oauth_server_base.types.types import AuthMethod, ClientRegistrationResult, ClientType, TokenGrantResult

# Anti-clickjacking: the human-facing pages of an OAuth 2.1 authorization server (login screen, consent screen) must never be
# embeddable in an iframe by a third-party page - only opened as a normal top-level navigation or new tab.
NO_FRAME_HEADERS = {
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
}


CONFIDENTIAL_AUTH_METHODS = ('client_secret_basic', 'client_secret_post')


class OauthServerControllerBase(http.Controller):
    """Shared HTTP surface for an OAuth 2.1 authorization server.
    Concrete controllers subclass this and only implement the template methods below."""

    # ------------------------------------------------------
    # Authorization server metadata
    # ------------------------------------------------------

    @http.route(
        '/.well-known/oauth-authorization-server/oauth/<string:resource_name>',
        type='http', auth='public', methods=['GET'],
    )
    def authorization_server_metadata(self, resource_name: str):
        base_url = oauth_base_url(self.env)
        metadata = {
            'issuer': f'{base_url}/oauth/{resource_name}',
            'registration_endpoint': f'{base_url}/oauth/register/{resource_name}',
            'authorization_endpoint': f'{base_url}/oauth/authorize',
            'token_endpoint': f'{base_url}/oauth/token',
            'revocation_endpoint': f'{base_url}/oauth/revoke',
            'response_types_supported': ['code'],
            'grant_types_supported': ['authorization_code', 'refresh_token'],
            'code_challenge_methods_supported': ['S256'],
            'token_endpoint_auth_methods_supported': self._supported_token_endpoint_auth_methods(),
            'scopes_supported': self._supported_scopes(resource_name),
        }
        return request.make_json_response(metadata)

    def _supported_scopes(self, resource_name: str) -> list[str]:
        """Scopes advertised for `resource_name`."""
        return []

    # ------------------------------------------------------
    # Client Registration
    # ------------------------------------------------------

    @http.route('/oauth/register/<string:resource_name>', type='http', auth='public', methods=['POST'], csrf=False)
    def register(self, resource_name: str, **params):
        payload = request.get_json_data()
        redirect_uris = payload['redirect_uris']
        client_name = payload.get('client_name') or 'Unnamed OAuth client'
        auth_method = payload.get('token_endpoint_auth_method', 'client_secret_basic')
        if auth_method not in self._supported_token_endpoint_auth_methods():
            self._raise_oauth_error('invalid_client_metadata', f"Unsupported token_endpoint_auth_method {auth_method!r}")
        client_type: ClientType = 'confidential' if auth_method in CONFIDENTIAL_AUTH_METHODS else 'public'

        try:
            result = self._register_client(resource_name, client_name, redirect_uris, client_type)
        except ValidationError as e:
            self._raise_oauth_error('invalid_client_metadata', str(e))
        return request.make_json_response(
            self._build_dcr_response(result, client_name, redirect_uris, auth_method), status=201
        )

    def _supported_token_endpoint_auth_methods(self) -> list[AuthMethod]:
        return ['none', 'client_secret_basic', 'client_secret_post']

    def _register_client(self, resource_name: str, client_name: str, redirect_uris: list[str], client_type: ClientType) -> ClientRegistrationResult:
        """Register the client under the resource whose name is `resource_name`. Raises ValidationError if the registration request is invalid."""
        self._check_resource(resource_name)
        return request.env['oauth.client']._register_client(resource_name, client_name, redirect_uris, client_type)

    def _check_resource(self, resource_name: str) -> None:
        """Raise if `resource_name` isn't valid for this deployment."""
        raise NotImplementedError

    def _build_dcr_response(self, result: ClientRegistrationResult, client_name: str, redirect_uris: list[str], auth_method: AuthMethod) -> dict:
        response = {
            'client_id': result['client_id'],
            'client_name': client_name,
            'redirect_uris': redirect_uris,
            'token_endpoint_auth_method': auth_method,
            'grant_types': ['authorization_code', 'refresh_token'],
            'response_types': ['code'],
        }
        if 'client_secret' in result:
            response['client_secret'] = result['client_secret']
        return response

    # ------------------------------------------------------
    # Authorization Code Generation
    # ------------------------------------------------------

    @http.route('/oauth/authorize', type='http', auth='public', methods=['GET'])
    def authorize(self, **params):
        client = self._resolve_client_for_authorize(params)
        return self._handle_authorize_request(client, params)

    def _resolve_client_for_authorize(self, params: dict):
        """Resolve and validate the client for an /authorize request or its POST-back
        (e.g. submitting consent, or - for a proxy - submitting a target db_url)."""
        client = self._find_client_by_id(params.get('client_id'))
        self._validate_authorize_request(client, params)
        return client

    def _validate_authorize_request(self, client, params: dict) -> None:
        if not client:
            raise BadRequest("Unknown client_id")
        if not client._is_redirect_uri_registered(params['redirect_uri']):
            raise BadRequest("redirect_uri is not registered for this client")
        if params.get('response_type') != 'code':
            raise BadRequest("Only response_type=code is supported")
        if params['code_challenge_method'] != 'S256' or not params['code_challenge']:
            raise BadRequest("PKCE with S256 is required (OAuth 2.1)")

    def _handle_authorize_request(self, client, params: dict):
        """Handle a validated authorization request to obtain an authorization code."""
        raise NotImplementedError

    # ------------------------------------------------------
    # Exchanging Authorization Code / Refresh Token for an Access Token
    # ------------------------------------------------------

    @http.route('/oauth/token', type='http', auth='public', methods=['POST'], csrf=False)
    def token(self, **params):
        try:
            client = self._authenticate_client(params)
        except AccessDenied as e:
            self._raise_oauth_error('invalid_client', str(e), status=401)

        grant_type = params['grant_type']
        try:
            if grant_type == 'authorization_code':
                result = self._redeem_authorization_code(client, params)
            elif grant_type == 'refresh_token':
                result = self._redeem_refresh_token(client, params)
            else:
                self._raise_oauth_error('unsupported_grant_type')
        except AccessDenied as e:
            self._raise_oauth_error('invalid_grant', str(e))
        return request.make_json_response(result)

    def _redeem_authorization_code(self, client, params: dict) -> TokenGrantResult:
        """Redeem an authorization_code for an access token on behalf of the already-authenticated `client`."""
        raise NotImplementedError

    def _redeem_refresh_token(self, client, params: dict) -> TokenGrantResult:
        """Redeem a refresh_token for a new access token and revoke the old access token,
        on behalf of the already-authenticated `client`."""
        raise NotImplementedError

    # ------------------------------------------------------
    # Revoke Access / Refresh Tokens
    # ------------------------------------------------------

    @http.route('/oauth/revoke', type='http', auth='public', methods=['POST'], csrf=False)
    def revoke(self, **params):
        try:
            client = self._authenticate_client(params)
        except AccessDenied as e:
            self._raise_oauth_error('invalid_client', str(e), status=401)

        self._handle_revoke_request(client, params['token'])
        # RFC 7009: always report success for an authenticated request, regardless of
        # whether the token itself was valid, to avoid letting a caller probe for its existence.
        return request.make_json_response({})

    def _handle_revoke_request(self, client, token: str) -> None:
        """Revoke `token` (if it exists) on behalf of the authenticated `client`."""
        raise NotImplementedError

    # ------------------------------------------------------
    # Generic helpers
    # ------------------------------------------------------

    def _authenticate_client(self, params: dict):
        """Resolve and authenticate the client presenting this request, from either the
        client_id/client_secret request params or an HTTP Basic Authorization header.

        Raises AccessDenied if the client is unknown or if a confidential client's secret
        doesn't check out.
        """
        auth_header = request.httprequest.authorization
        client_id = params.get('client_id') or (auth_header.username if auth_header else None)
        client = self._find_client_by_id(client_id)
        if not client:
            raise AccessDenied("Unknown client_id")

        if client.client_type == 'confidential':
            secret = params.get('client_secret') or (auth_header.password if auth_header else None)
            if not client._verify_client_secret(secret):
                raise AccessDenied("Invalid client credentials")
        return client

    def _find_client_by_id(self, client_id):
        """Look up a registered client by its public client_id, or an empty recordset if unknown."""
        # sudo => Registered clients should be able to call these endpoints to identify themselves
        return request.env['oauth.client'].sudo().search([('client_id', '=', client_id)], limit=1)

    def _raise_oauth_error(self, error: str, description: str | None = None, status: int = 400) -> None:
        body = {'error': error}
        if description:
            body['error_description'] = description
        exception_cls = default_exceptions.get(status, BadRequest)
        raise exception_cls(response=request.make_json_response(body, status=status))
