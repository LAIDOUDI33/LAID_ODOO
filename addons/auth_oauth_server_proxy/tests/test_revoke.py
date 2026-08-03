from unittest.mock import patch

import requests
from odoo.tests import tagged

from .common import CLIENT_REDIRECT_URI, FAKE_DB_URL, ProxyCommon, _FakeResponse


@tagged('post_install', '-at_install')
class TestRevoke(ProxyCommon):

    def _register_inbound_client(self, redirect_uri=CLIENT_REDIRECT_URI):
        client_id = self._register_client(redirect_uri=redirect_uri)['client_id']
        return self.env['oauth.client'].search([('client_id', '=', client_id)])

    def _seed_remote_client(self):
        return self.env['oauth.proxy.remote.client']._register_remote_client(
            db_url=FAKE_DB_URL, odoo_client_id='odoo-client-abc', odoo_client_secret='odoo-secret',
        )

    def _seed_token(self, access_token, remote_client, client_record, refresh_token):
        self.env['oauth.proxy.token']._store(access_token, refresh_token, remote_client, client_record)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_relays_refresh_token_and_forgets_routing_entry(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {})
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('some-access-token', remote_client, inbound_client, refresh_token='some-refresh-token')

        response = self.url_open('/oauth/revoke', data={
            'token': 'some-refresh-token', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)

        upstream_call = mock_post.call_args
        self.assertTrue(upstream_call.args[0].startswith(f'{FAKE_DB_URL}/oauth/revoke'))
        self.assertEqual(upstream_call.kwargs['data']['token'], 'some-refresh-token')
        self.assertEqual(upstream_call.kwargs['data']['client_id'], 'odoo-client-abc')

        self.assertFalse(self.env['oauth.proxy.token']._find_by_refresh_token('some-refresh-token', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_relays_access_token_too(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {})
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('some-apikey', remote_client, inbound_client, refresh_token='some-apikey-refresh')

        response = self.url_open('/oauth/revoke', data={
            'token': 'some-apikey', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        mock_post.assert_called_once()
        self.assertFalse(self.env['oauth.proxy.token']._find_by_access_token('some-apikey', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoking_access_token_also_removes_the_paired_refresh_token(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {})
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('paired-access-token', remote_client, inbound_client, refresh_token='paired-refresh-token')

        response = self.url_open('/oauth/revoke', data={
            'token': 'paired-access-token', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.env['oauth.proxy.token']._find_by_access_token('paired-access-token', inbound_client))
        self.assertFalse(self.env['oauth.proxy.token']._find_by_refresh_token('paired-refresh-token', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoking_refresh_token_also_removes_the_paired_access_token(self, mock_post):
        mock_post.return_value = _FakeResponse(200, {})
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('paired-access-token-2', remote_client, inbound_client, refresh_token='paired-refresh-token-2')

        response = self.url_open('/oauth/revoke', data={
            'token': 'paired-refresh-token-2', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.env['oauth.proxy.token']._find_by_refresh_token('paired-refresh-token-2', inbound_client))
        self.assertFalse(self.env['oauth.proxy.token']._find_by_access_token('paired-access-token-2', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_of_unknown_token_still_returns_success(self, mock_post):
        inbound_client = self._register_inbound_client()

        response = self.url_open('/oauth/revoke', data={
            'token': 'never-seen-before', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        mock_post.assert_not_called()

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_requires_matching_client_id(self, mock_post):
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('someone-elses-access-token', remote_client, inbound_client, refresh_token='someone-elses-token')

        other_client_id = self._register_client(redirect_uri='https://other-client.example.com/callback')['client_id']
        response = self.url_open('/oauth/revoke', data={
            'token': 'someone-elses-token', 'client_id': other_client_id,
        })
        self.assertEqual(response.status_code, 200)
        mock_post.assert_not_called()
        self.assertTrue(self.env['oauth.proxy.token']._find_by_refresh_token('someone-elses-token', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_with_unknown_client_still_returns_success(self, mock_post):
        response = self.url_open('/oauth/revoke', data={
            'token': 'some-token', 'client_id': 'never-registered',
        })
        self.assertEqual(response.status_code, 200)
        mock_post.assert_not_called()

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_keeps_routing_entry_when_upstream_relay_fails(self, mock_post):
        mock_post.side_effect = requests.ConnectionError
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('some-access-token', remote_client, inbound_client, refresh_token='some-refresh-token')

        response = self.url_open('/oauth/revoke', data={
            'token': 'some-refresh-token', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        # The upstream call failed, so the token might still be valid there - the proxy
        # must not forget its routing entry, or it'd lose track of a live token.
        self.assertTrue(self.env['oauth.proxy.token']._find_by_refresh_token('some-refresh-token', inbound_client))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_revoke_keeps_routing_entry_when_upstream_returns_error(self, mock_post):
        mock_post.return_value = _FakeResponse(400, {'error': 'invalid_client'})
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_token('some-access-token', remote_client, inbound_client, refresh_token='some-refresh-token')

        response = self.url_open('/oauth/revoke', data={
            'token': 'some-refresh-token', 'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.env['oauth.proxy.token']._find_by_refresh_token('some-refresh-token', inbound_client))
