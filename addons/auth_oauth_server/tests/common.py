import json
import re

from odoo.tests import HttpCase, new_test_user

from odoo.addons.auth_oauth_server_base.utils.oauth_utils import challenge_from_verifier

REDIRECT_URI = 'https://client.example.com/callback'
CSRF_TOKEN_RE = re.compile(r'name="csrf_token"\s+value="([^"]+)"')


class OauthServerCommon(HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.resource = cls.env['oauth.resource'].create({
            'name': 'testns',
            'label': 'Test Resource',
            'apikey_scope': 'testns',
            'group_ids': [cls.env.ref('base.group_user').id],
        })
        cls.internal_user = new_test_user(cls.env, login='internal_user', groups='base.group_user')
        cls.portal_user = new_test_user(cls.env, login='portal_user', groups='base.group_portal')

    def _register_client(self, redirect_uris=(REDIRECT_URI,), resource='testns', auth_method='client_secret_post'):
        response = self.url_open(f'/oauth/register/{resource}', data=json.dumps({
            'client_name': 'Test Client',
            'redirect_uris': list(redirect_uris),
            'token_endpoint_auth_method': auth_method,
        }), headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _authorize_params(self, client_id, **overrides):
        verifier = 'a' * 64
        params = {
            'client_id': client_id,
            'redirect_uri': REDIRECT_URI,
            'response_type': 'code',
            'code_challenge': challenge_from_verifier(verifier),
            'code_challenge_method': 'S256',
            # `scope` is not read by the server (a resource is a single, all-or-nothing
            # scope) - kept here only because a real client would still send one.
            'scope': 'read write',
            'state': 'xyz',
        }
        params.update(overrides)
        return params, verifier

    def _login_as(self, login):
        self.authenticate(login, login)

    def _submit_consent(self, params, allow='1'):
        """GET the consent page to obtain a session-bound CSRF token (the /authorize
        route requires one, since submitting it is a real logged-in session action, not
        a bearer-authenticated API call), then POST the approval/denial."""
        consent_page = self.url_open('/oauth/authorize', params=params)
        match = CSRF_TOKEN_RE.search(consent_page.text)
        self.assertTrue(match, "consent page did not render a csrf_token field")

        data = dict(params)
        data['allow'] = allow
        data['csrf_token'] = match.group(1)
        return self.url_open('/oauth/authorize/submit_consent', data=data, allow_redirects=False)
