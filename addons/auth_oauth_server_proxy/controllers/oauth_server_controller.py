import requests
from urllib.parse import urlsplit
from werkzeug.exceptions import BadRequest

from odoo import http
from odoo.http import request
from odoo.exceptions import AccessDenied

from odoo.addons.auth_oauth_server_base.controllers.oauth_server_controller_base import (
    NO_FRAME_HEADERS, OauthServerControllerBase,
)
from odoo.addons.auth_oauth_server_base.types.types import TokenGrantResult
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_secret, oauth_base_url


class OauthServerProxyController(OauthServerControllerBase):

    # ------------------------------------------------------
    # Authorization Code Generation
    # ------------------------------------------------------

    def _handle_authorize_request(self, client, params: dict):
        self._check_resource(client.resource_name)
        response = request.render('auth_oauth_server_proxy.db_url_form', {'params': params})
        response.headers.update(NO_FRAME_HEADERS)
        return response

    @http.route('/oauth/authorize/submit_db_url', type='http', auth='public', methods=['POST'])
    def submit_db_url(self, **params):
        client = self._resolve_client_for_authorize(params)
        self._check_resource(client.resource_name)

        parsed_url = urlsplit(params['db_url'].strip().rstrip('/'))
        if parsed_url.scheme != 'https' or not parsed_url.netloc:
            raise BadRequest("Invalid Odoo server URL: must be https://")

        return self._redirect_to_remote_authorize(client, params['db_url'], params)

    def _redirect_to_remote_authorize(self, client, db_url: str, params: dict):
        remote_client = self._get_or_register_remote_client(db_url, client.resource_name)
        state_token = _generate_secret()
        request.env['oauth.proxy.pending.authorize'].sudo().create({
            'client_id': client.id,
            'client_state': params.get('state', ''),
            'client_redirect_uri': params['redirect_uri'],
            'state_token': state_token,
            'remote_client_id': remote_client.id,
        })
        return request.redirect_query(f'{db_url}/oauth/authorize', {
            'client_id': remote_client.odoo_client_id,
            'redirect_uri': self._callback_url(),
            'response_type': 'code',
            'scope': params.get('scope', ''),
            'state': state_token,
            'code_challenge': params['code_challenge'],
            'code_challenge_method': params['code_challenge_method'],
        }, local=False)

    def _get_or_register_remote_client(self, db_url: str, resource_name: str):
        """Return this proxy's oauth client already registered against `db_url`, registering a new
        one if needed. That registration is shared by every inbound client targeting this database."""
        remote_client = request.env['oauth.proxy.remote.client'].sudo().search([('db_url', '=', db_url)], limit=1)
        if remote_client:
            return remote_client

        return self._register_remote_client(db_url, resource_name)

    def _register_remote_client(self, db_url: str, resource_name: str):
        try:
            response = requests.post(
                f'{db_url}/oauth/register/{resource_name}',
                json={
                    'client_name': f'OAuth Server Proxy ({resource_name})',
                    'redirect_uris': [self._callback_url()],
                    'token_endpoint_auth_method': 'client_secret_post',
                },
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            raise BadRequest(
                f"Could not register with {db_url!r} for resource {resource_name!r}."
                "Make sure that Odoo database exposes an OAuth 2.1 authorization "
                "server for this resource."
            ) from e

        body = response.json()
        return request.env['oauth.proxy.remote.client'].sudo()._register_remote_client(
            db_url=db_url, odoo_client_id=body['client_id'], odoo_client_secret=body['client_secret'],
        )

    @http.route('/oauth/authorize/callback', type='http', auth='public', methods=['GET'])
    def authorize_callback(self, **params):
        """The target database redirects here once the user has authenticated and consented."""
        pending = request.env['oauth.proxy.pending.authorize'].sudo().search(
            [('state_token', '=', params.get('state'))], limit=1,
        )
        if not pending:
            raise BadRequest("Unknown or expired authorization flow")

        (
            client,
            client_redirect_uri,
            client_state,
            remote_client
        ) = (
            pending.client_id,
            pending.client_redirect_uri,
            pending.client_state,
            pending.remote_client_id,
        )
        pending.unlink()

        code = params.get('code')
        if not code:
            redirect_params = {'error': params.get('error', 'server_error'), 'state': client_state}
            if params.get('error_description'):
                redirect_params['error_description'] = params['error_description']
            return request.redirect_query(client_redirect_uri, redirect_params, local=False)

        request.env['oauth.proxy.authorization.code'].sudo()._store(code, remote_client, client, redirect_uri=client_redirect_uri)
        return request.redirect_query(client_redirect_uri, {'code': code, 'state': client_state}, local=False)

    def _callback_url(self) -> str:
        return f'{oauth_base_url(self.env)}/oauth/authorize/callback'

    # ------------------------------------------------------
    # Exchanging Authorization Code / Refresh Token for an Access Token
    # ------------------------------------------------------

    def _redeem_authorization_code(self, client, params: dict) -> TokenGrantResult:
        self._check_resource(client.resource_name)
        code = params['code']
        code_record = request.env['oauth.proxy.authorization.code'].sudo()._find(code, client, params['redirect_uri'])
        if not code_record:
            raise AccessDenied("Unknown or already-redeemed authorization code")
        remote_client = code_record.remote_client_id
        code_record.unlink()

        upstream_params = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self._callback_url(),
            'code_verifier': params['code_verifier'],
            'client_id': remote_client.odoo_client_id,
            'client_secret': remote_client._get_client_secret(),
        }
        return self._relay_token_request(client, remote_client, upstream_params)

    def _redeem_refresh_token(self, client, params: dict) -> TokenGrantResult:
        refresh_token = params['refresh_token']
        token_record = request.env['oauth.proxy.token'].sudo()._find_by_refresh_token(refresh_token, client)
        if not token_record:
            raise AccessDenied("Unknown refresh token")

        self._check_resource(client.resource_name)
        remote_client = token_record.remote_client_id
        token_record.unlink()

        upstream_params = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': remote_client.odoo_client_id,
            'client_secret': remote_client._get_client_secret(),
        }
        return self._relay_token_request(client, remote_client, upstream_params)

    def _relay_token_request(self, client, remote_client, upstream_params: dict) -> TokenGrantResult:
        response = requests.post(f'{remote_client.db_url}/oauth/token', data=upstream_params, timeout=10)
        if response.status_code != 200:
            raise AccessDenied(response.text)

        tokens = response.json()
        request.env['oauth.proxy.token'].sudo()._store(
            tokens['access_token'], tokens['refresh_token'], remote_client, client,
        )
        return tokens

    # ------------------------------------------------------
    # Revoke Access / Refresh Tokens
    # ------------------------------------------------------

    def _handle_revoke_request(self, client, token: str) -> None:
        proxy_token = request.env['oauth.proxy.token'].sudo()
        token_record = proxy_token._find_by_access_token(token, client) or proxy_token._find_by_refresh_token(token, client)
        if not token_record:
            return

        remote_client = token_record.remote_client_id
        upstream_params = {
            'token': token,
            'client_id': remote_client.odoo_client_id,
            'client_secret': remote_client._get_client_secret(),
        }
        try:
            response = requests.post(f'{remote_client.db_url}/oauth/revoke', data=upstream_params, timeout=10)
        except requests.RequestException:
            # RFC 7009: the caller must see success regardless.
            return
        if response.status_code != 200:
            return
        token_record.unlink()

    # ------------------------------------------------------
    # Generic helpers
    # ------------------------------------------------------

    def _check_resource(self, resource_name: str) -> None:
        """This generic proxy has no resource catalog of its own, so any resource name is
        accepted; a bridge module fronting one specific protected resource (e.g.
        ai_mcp_oauth_server_proxy) should override this to reject anything else, raising NotFound."""
        return None
