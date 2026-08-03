from unittest.mock import patch

from odoo.tests import tagged
from odoo.tools import SQL

from .common import CLIENT_REDIRECT_URI, FAKE_DB_URL, REAL_CODE, ProxyCommon, _FakeResponse

OTHER_DB_URL = 'https://other-fake-odoo.example.com'
CLIENT_VERIFIER = 'client-own-verifier'


@tagged('post_install', '-at_install')
class TestToken(ProxyCommon):

    def _register_inbound_client(self, redirect_uri=CLIENT_REDIRECT_URI):
        client_id = self._register_client(redirect_uri=redirect_uri)['client_id']
        return self.env['oauth.client'].search([('client_id', '=', client_id)])

    def _seed_remote_client(self, db_url=FAKE_DB_URL):
        return self.env['oauth.proxy.remote.client']._register_remote_client(
            db_url=db_url, odoo_client_id='odoo-client-abc', odoo_client_secret='odoo-secret',
        )

    def _seed_code(self, code, remote_client, client_record, redirect_uri=CLIENT_REDIRECT_URI):
        self.env['oauth.proxy.authorization.code']._store(code, remote_client, client_record, redirect_uri=redirect_uri)

    def _seed_refresh_token(self, refresh_token, remote_client, client_record, access_token='old-access-token'):
        self.env['oauth.proxy.token']._store(access_token, refresh_token, remote_client, client_record)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_authorization_code_grant_is_relayed_and_returned_verbatim(self, mock_post):
        inbound_client = self._register_inbound_client()
        self._seed_code(REAL_CODE, self._seed_remote_client(), inbound_client)
        mock_post.return_value = _FakeResponse(200, {
            'access_token': 'odoo-raw-apikey', 'refresh_token': 'odoo-raw-refresh',
            'token_type': 'Bearer', 'scope': 'read write', 'expires_in': 600,
        })
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': inbound_client.client_id,
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': CLIENT_VERIFIER,
        })
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body['access_token'], 'odoo-raw-apikey')
        self.assertEqual(body['refresh_token'], 'odoo-raw-refresh')

        upstream_call = mock_post.call_args
        self.assertTrue(upstream_call.args[0].startswith(f'{FAKE_DB_URL}/oauth/token'))
        self.assertEqual(upstream_call.kwargs['data']['code'], REAL_CODE)
        self.assertEqual(upstream_call.kwargs['data']['client_id'], 'odoo-client-abc')
        # The redirect_uri presented to the target database must match the proxy's own
        # callback, since that's what was used when the code was issued.
        self.assertEqual(upstream_call.kwargs['data']['redirect_uri'], self._callback_url())
        # No proxy-side PKCE pair: the client's own verifier passes straight through.
        self.assertEqual(upstream_call.kwargs['data']['code_verifier'], CLIENT_VERIFIER)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_token_exchange_records_routing_entries(self, mock_post):
        inbound_client = self._register_inbound_client()
        self._seed_code(REAL_CODE, self._seed_remote_client(), inbound_client)
        mock_post.return_value = _FakeResponse(200, {
            'access_token': 'odoo-raw-apikey', 'refresh_token': 'odoo-raw-refresh',
            'token_type': 'Bearer', 'scope': 'read', 'expires_in': 600,
        })
        self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': inbound_client.client_id,
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': CLIENT_VERIFIER,
        })

        token_row = self.env['oauth.proxy.token'].search([])
        self.assertEqual(len(token_row), 1)
        self.assertEqual(token_row.remote_client_id.db_url, FAKE_DB_URL)
        self.assertEqual(token_row.client_id, inbound_client)
        # access_token_hash isn't an ORM field (kept out of the ORM on purpose, see
        # oauth.proxy.token's _auto=False): read it back with raw SQL to assert it's never
        # stored in plaintext.
        self.env.cr.execute(SQL(
            "SELECT access_token_hash FROM %(table)s WHERE id = %(id)s",
            table=SQL.identifier(token_row._table), id=token_row.id,
        ))
        [access_token_hash] = self.env.cr.fetchone()
        self.assertNotEqual(access_token_hash, 'odoo-raw-apikey')

        found_row = self.env['oauth.proxy.token']._find_by_access_token('odoo-raw-apikey', inbound_client)
        self.assertEqual(found_row.remote_client_id.db_url, FAKE_DB_URL)
        self.assertTrue(self.env['oauth.proxy.token']._find_by_refresh_token('odoo-raw-refresh', inbound_client))

        # The code itself must be single-use: it can no longer be found once redeemed.
        self.assertFalse(self.env['oauth.proxy.authorization.code']._find(REAL_CODE, inbound_client, CLIENT_REDIRECT_URI))

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_code_routes_to_the_database_it_was_issued_by(self, mock_post):
        # The same inbound client has completed authorization flows against two different
        # target databases; redeeming a code must relay to the database that issued it,
        # not to whichever remote registration happens to be found first.
        inbound_client = self._register_inbound_client()
        self._seed_code('code-for-db-one', self._seed_remote_client(FAKE_DB_URL), inbound_client)
        self._seed_code('code-for-db-two', self._seed_remote_client(OTHER_DB_URL), inbound_client)
        mock_post.return_value = _FakeResponse(200, {
            'access_token': 'apikey', 'token_type': 'Bearer', 'scope': 'read', 'expires_in': 600,
        })

        self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': 'code-for-db-two', 'client_id': inbound_client.client_id,
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': CLIENT_VERIFIER,
        })

        self.assertTrue(mock_post.call_args.args[0].startswith(f'{OTHER_DB_URL}/oauth/token'))

    def test_code_redeemed_with_wrong_redirect_uri_is_rejected(self):
        inbound_client = self._register_inbound_client()
        self._seed_code(REAL_CODE, self._seed_remote_client(), inbound_client)

        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': inbound_client.client_id,
            'redirect_uri': 'https://attacker.example.com/callback', 'code_verifier': CLIENT_VERIFIER,
        })
        self.assertEqual(response.status_code, 400)
        # The code must still be usable with the redirect_uri it was actually issued to.
        self.assertTrue(self.env['oauth.proxy.authorization.code']._find(REAL_CODE, inbound_client, CLIENT_REDIRECT_URI))

    def test_malformed_code_is_rejected(self):
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': 'not-a-valid-code-at-all',
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': 'v',
        })
        self.assertEqual(response.status_code, 400)

    def test_code_with_unknown_client_id_is_rejected(self):
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': 'never-registered',
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': 'v',
        })
        self.assertEqual(response.status_code, 400)

    def test_code_for_client_with_no_remote_registration_is_rejected(self):
        # A real inbound client, but this proxy never recorded a code for it.
        inbound_client = self._register_inbound_client()
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': inbound_client.client_id,
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': 'v',
        })
        self.assertEqual(response.status_code, 400)

    def test_code_belonging_to_another_client_is_rejected(self):
        owner_client = self._register_inbound_client()
        self._seed_code(REAL_CODE, self._seed_remote_client(), owner_client)

        other_client_id = self._register_client(redirect_uri='https://other-client.example.com/callback')['client_id']
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE, 'client_id': other_client_id,
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': 'v',
        })
        self.assertEqual(response.status_code, 400)

    def test_confidential_client_authorization_code_requires_correct_secret(self):
        registration = self._register_client(auth_method='client_secret_post')
        inbound_client = self.env['oauth.client'].search([('client_id', '=', registration['client_id'])])
        self._seed_code(REAL_CODE, self._seed_remote_client(), inbound_client)

        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'code': REAL_CODE,
            'client_id': inbound_client.client_id, 'client_secret': 'wrong-secret',
            'redirect_uri': CLIENT_REDIRECT_URI, 'code_verifier': 'v',
        })
        self.assertEqual(response.status_code, 400)

    @patch('odoo.addons.auth_oauth_server_proxy.controllers.oauth_server_controller.requests.post')
    def test_refresh_token_grant_is_relayed_via_routing_table(self, mock_post):
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_refresh_token('old-refresh-token', remote_client, inbound_client, access_token='old-access-token')
        mock_post.return_value = _FakeResponse(200, {
            'access_token': 'new-apikey', 'refresh_token': 'new-refresh',
            'token_type': 'Bearer', 'scope': 'read', 'expires_in': 600,
        })

        response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'refresh_token': 'old-refresh-token',
            'client_id': inbound_client.client_id,
        })
        self.assertEqual(response.status_code, 200, response.text)
        upstream_call = mock_post.call_args
        self.assertEqual(upstream_call.kwargs['data']['client_id'], 'odoo-client-abc')
        self.assertEqual(upstream_call.kwargs['data']['refresh_token'], 'old-refresh-token')

        # The redeemed pair is gone; only the freshly relayed one is routable now.
        self.assertFalse(self.env['oauth.proxy.token']._find_by_refresh_token('old-refresh-token', inbound_client))
        self.assertFalse(self.env['oauth.proxy.token']._find_by_access_token('old-access-token', inbound_client))
        new_token_row = self.env['oauth.proxy.token']._find_by_access_token('new-apikey', inbound_client)
        self.assertTrue(new_token_row)
        self.assertEqual(new_token_row.remote_client_id.db_url, FAKE_DB_URL)

    def test_unknown_refresh_token_is_rejected(self):
        response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'refresh_token': 'never-seen-before',
        })
        self.assertEqual(response.status_code, 400)

    def test_refresh_token_requires_matching_client_id(self):
        inbound_client = self._register_inbound_client()
        remote_client = self._seed_remote_client()
        self._seed_refresh_token('some-refresh-token', remote_client, inbound_client)

        other_client_id = self._register_client(redirect_uri='https://other-client.example.com/callback')['client_id']
        response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'refresh_token': 'some-refresh-token', 'client_id': other_client_id,
        })
        self.assertEqual(response.status_code, 400)
        # Rejected before redemption, so the original owner's pair must still be routable.
        self.assertTrue(self.env['oauth.proxy.token']._find_by_refresh_token('some-refresh-token', inbound_client))

    def test_confidential_client_refresh_requires_correct_secret(self):
        registration = self._register_client(auth_method='client_secret_post')
        inbound_client = self.env['oauth.client'].search([('client_id', '=', registration['client_id'])])
        remote_client = self._seed_remote_client()
        self._seed_refresh_token('confidential-refresh-token', remote_client, inbound_client)

        response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'refresh_token': 'confidential-refresh-token',
            'client_id': inbound_client.client_id, 'client_secret': 'wrong-secret',
        })
        self.assertEqual(response.status_code, 400)
