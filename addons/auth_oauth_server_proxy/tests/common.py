import json
import re

import requests
from odoo.tests import HttpCase

FAKE_DB_URL = 'https://fake-odoo.example.com'
CLIENT_REDIRECT_URI = 'https://client.example.com/callback'
RESOURCE = 'testns'
REAL_CODE = 'the-real-odoo-secret'  # this proxy never inspects the code's content, only relays it
CSRF_TOKEN_RE = re.compile(r'name="csrf_token"\s+value="([^"]+)"')


class ProxyCommon(HttpCase):

    def _callback_url(self):
        return f"{self.env['ir.config_parameter'].sudo().get_str('web.base.url')}/oauth/authorize/callback"

    def _register_client(self, redirect_uri=CLIENT_REDIRECT_URI, redirect_uris=None, auth_method='none', resource_name=RESOURCE):
        response = self.url_open(f'/oauth/register/{resource_name}', data=json.dumps({
            'client_name': 'Test Client',
            'redirect_uris': redirect_uris if redirect_uris is not None else [redirect_uri],
            'token_endpoint_auth_method': auth_method,
        }), headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _authorize_params(self, client_id, **overrides):
        params = {
            'client_id': client_id,
            'redirect_uri': CLIENT_REDIRECT_URI,
            'response_type': 'code',
            'code_challenge': 'client-own-challenge',
            'code_challenge_method': 'S256',
            'scope': 'read',
            'state': 'client-state-xyz',
        }
        params.update(overrides)
        return params

    def _submit_db_url(self, params, db_url):
        """GET the db_url page to obtain a session-bound CSRF token (the /authorize
        route requires one, since submitting it is a real logged-in session action, not
        a bearer-authenticated API call), then POST the chosen db_url."""
        form_page = self.url_open('/oauth/authorize', params=params)
        match = CSRF_TOKEN_RE.search(form_page.text)
        self.assertTrue(match, "db_url page did not render a csrf_token field")

        data = dict(params)
        data['db_url'] = db_url
        data['csrf_token'] = match.group(1)
        return self.url_open('/oauth/authorize/submit_db_url', data=data, allow_redirects=False)

    def _get_pending_state(self, client_id):
        """The opaque `state` this proxy generated for the most recent submit_db_url of `client_id`,
        needed to simulate the target database's callback in tests."""
        client = self.env['oauth.client'].search([('client_id', '=', client_id)], limit=1)
        pending = self.env['oauth.proxy.pending.authorize'].search([('client_id', '=', client.id)], limit=1)
        return pending.state_token


class _FakeResponse:
    def __init__(self, status_code, json_body):
        self.status_code = status_code
        self._json_body = json_body
        self.text = json.dumps(json_body)
        self.content = self.text.encode()
        self.headers = {'Content-Type': 'application/json'}

    def json(self):
        return self._json_body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f'HTTP {self.status_code}', response=self)
