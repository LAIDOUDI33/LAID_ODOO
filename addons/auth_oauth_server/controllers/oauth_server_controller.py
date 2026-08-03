from urllib.parse import quote

from odoo import http
from odoo.addons.auth_oauth_server_base.controllers.oauth_server_controller_base import (
    NO_FRAME_HEADERS,
    OauthServerControllerBase,
)
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import oauth_base_url

from odoo.addons.auth_oauth_server.utils.oauth_utils import get_resource
from odoo.addons.auth_oauth_server_base.types.types import TokenGrantResult
from odoo.http import request


class OauthServerController(OauthServerControllerBase):

    # ------------------------------------------------------
    # Authorization server metadata
    # ------------------------------------------------------

    def _supported_scopes(self, resource_name: str) -> list[str]:
        return [get_resource(self.env, resource_name).apikey_scope]

    # ------------------------------------------------------
    # Client Registration
    # ------------------------------------------------------

    def _check_resource(self, resource_name: str) -> None:
        get_resource(self.env, resource_name)

    # ------------------------------------------------------
    # Authorization Code Generation
    # ------------------------------------------------------

    def _handle_authorize_request(self, client, params: dict):
        resource = get_resource(self.env, client.resource_name)

        if request.env.user._is_public():
            return self._redirect_to_login()
        resource._check_user_access(request.env.user)

        response = request.render('auth_oauth_server.consent', {
            'client': client,
            'resource': resource,
            'params': params,
        })
        response.headers.update(NO_FRAME_HEADERS)
        return response

    def _redirect_to_login(self):
        # request.httprequest.url includes query params so it has to be url_encoded using quote.
        # Otherwise, the query params of request.httprequest.url will be interpretted as query
        # params of the final url '/web/login?redirect...'.
        response = request.redirect(f'/web/login?redirect={quote(request.httprequest.url)}')
        response.headers.update(NO_FRAME_HEADERS)
        return response

    @http.route('/oauth/authorize/submit_consent', type='http', auth='public', methods=['POST'])
    def submit_consent(self, **params):
        client = self._resolve_client_for_authorize(params)
        resource = get_resource(self.env, client.resource_name)
        resource._check_user_access(request.env.user)

        if params['allow'] != '1':
            return request.redirect_query(params['redirect_uri'], {
                'error': 'access_denied', 'state': params.get('state', ''),
            }, local=False)
        return self._issue_code_and_redirect(client, resource, resource.apikey_scope, params)

    def _issue_code_and_redirect(self, client, resource, scope: str, params: dict):
        code = request.env['oauth.authorization.code']._generate(
            client=client,
            redirect_uri=params['redirect_uri'],
            code_challenge=params['code_challenge'],
            scope=scope,
            user=request.env.user,
        )
        return request.redirect_query(params['redirect_uri'], {
            'code': code, 'state': params.get('state', ''), 'iss': f'{oauth_base_url(self.env)}/oauth/{resource.name}',
        }, local=False)

    # ------------------------------------------------------
    # Exchanging Authorization Code / Refresh Token for an Access Token
    # ------------------------------------------------------

    def _redeem_authorization_code(self, client, params: dict) -> TokenGrantResult:
        return request.env['oauth.authorization.code']._consume(
            code=params['code'],
            client=client,
            redirect_uri=params['redirect_uri'],
            code_verifier=params['code_verifier'],
        )

    def _redeem_refresh_token(self, client, params: dict) -> TokenGrantResult:
        return request.env['oauth.token']._rotate(params['refresh_token'], client)

    # ------------------------------------------------------
    # Revoke Access / Refresh Tokens
    # ------------------------------------------------------

    def _handle_revoke_request(self, client, token: str) -> None:
        oauth_token = request.env['oauth.token'].sudo()
        token_record = oauth_token._find_by_access_token(token, client) or oauth_token._find_by_refresh_token(token, client)
        if token_record:
            token_record._revoke()
