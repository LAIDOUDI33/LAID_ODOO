from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from odoo.tests import tagged

from .common import CLIENT_REDIRECT_URI, FAKE_DB_URL, RESOURCE, ProxyCommon, _FakeResponse


@tagged('post_install', '-at_install')
class TestAuthorize(ProxyCommon):

    def test_unregistered_redirect_uri_is_rejected(self):
        client_id = self._register_client()['client_id']
        params = self._authorize_params(client_id, redirect_uri='https://evil.example.com/callback')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 400)

    def test_missing_db_url_shows_form_not_frameable(self):
        client_id = self._register_client()['client_id']
        response = self.url_open('/oauth/authorize', params=self._authorize_params(client_id))
        self.assertEqual(response.status_code, 200)
        self.assertIn('name="db_url"', response.text)
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_authorize_redirects_to_odoo_via_the_proxy_callback(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client()['client_id']

        params = self._authorize_params(client_id)
        response = self._submit_db_url(params, FAKE_DB_URL)
        self.assertIn(response.status_code, (302, 303))
        location = response.headers['Location']
        query = parse_qs(urlsplit(location).query)
        self.assertTrue(location.startswith(f'{FAKE_DB_URL}/oauth/authorize'))
        # No proxy-side PKCE pair: the client's own challenge passes straight through.
        self.assertEqual(query['code_challenge'][0], 'client-own-challenge')

        # redirect_uri and state, however, are the proxy's own: the target database
        # must call back through the proxy so it can route the code to this db_url, and
        # the client's real state is only restored once the proxy relays the code onward.
        self.assertEqual(query['redirect_uri'][0], self._callback_url())
        self.assertNotEqual(query['state'][0], 'client-state-xyz')

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_db_url_form_is_asked_again_on_every_authorize_call(self, mock_post):
        # A single inbound client can be used against several target databases, so the
        # proxy cannot assume which one is meant and must always ask, even after a
        # previous flow already registered a remote client for this client_id.
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client()['client_id']

        first = self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)
        self.assertIn(first.status_code, (302, 303))

        second = self.url_open('/oauth/authorize', params=self._authorize_params(client_id), allow_redirects=False)
        self.assertEqual(second.status_code, 200)
        self.assertIn('name="db_url"', second.text)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_remote_registration_is_reused_not_repeated(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client()['client_id']

        self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)
        # Same client, same target database: the existing remote_client is reused, no new DCR call.
        self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)
        self.assertEqual(mock_post.call_count, 1)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_registers_with_the_proxys_own_callback_uri(self, mock_post):
        # The proxy registers itself once per database with its own fixed callback, never
        # the inbound client's redirect_uris - that's what lets one registration be shared
        # by every inbound client targeting this same database.
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client(redirect_uris=[CLIENT_REDIRECT_URI, 'https://client.example.com/other-callback'])['client_id']

        self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)

        registration_call = mock_post.call_args
        self.assertTrue(registration_call.args[0].startswith(f'{FAKE_DB_URL}/oauth/register/{RESOURCE}'))
        self.assertEqual(registration_call.kwargs['json']['redirect_uris'], [self._callback_url()])

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_callback_relays_code_to_client_with_its_own_state(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client()['client_id']
        self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)

        response = self.url_open('/oauth/authorize/callback', params={
            'code': 'the-real-code', 'state': self._get_pending_state(client_id),
        }, allow_redirects=False)
        self.assertIn(response.status_code, (302, 303))
        location = response.headers['Location']
        self.assertTrue(location.startswith(CLIENT_REDIRECT_URI))
        query = parse_qs(urlsplit(location).query)
        self.assertEqual(query['code'][0], 'the-real-code')
        self.assertEqual(query['state'][0], 'client-state-xyz')

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_callback_relays_consent_denial_to_client(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {'client_id': 'odoo-client-abc', 'client_secret': 'odoo-secret'})
        client_id = self._register_client()['client_id']
        self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)

        response = self.url_open('/oauth/authorize/callback', params={
            'error': 'access_denied', 'state': self._get_pending_state(client_id),
        }, allow_redirects=False)
        self.assertIn(response.status_code, (302, 303))
        query = parse_qs(urlsplit(response.headers['Location']).query)
        self.assertEqual(query['error'][0], 'access_denied')
        self.assertEqual(query['state'][0], 'client-state-xyz')

    def test_callback_with_unknown_state_is_rejected(self):
        response = self.url_open('/oauth/authorize/callback', params={'code': 'x', 'state': 'never-seen'})
        self.assertEqual(response.status_code, 400)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_target_database_without_this_resource_fails_cleanly(self, mock_post):
        # e.g. the target Odoo database has no OAuth 2.1 authorization server exposing
        # this resource - it 404s the registration call. This must surface as a clean,
        # actionable error, not an unhandled 500.
        mock_post.return_value = _FakeResponse(404, {'error': 'not_found'})
        client_id = self._register_client()['client_id']

        response = self._submit_db_url(self._authorize_params(client_id), FAKE_DB_URL)
        self.assertEqual(response.status_code, 400)
