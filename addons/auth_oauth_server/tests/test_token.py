import base64

from odoo.tests import tagged

from .common import REDIRECT_URI, OauthServerCommon


@tagged('post_install', '-at_install')
class TestToken(OauthServerCommon):

    def _get_code(self, client_id, verifier, **overrides):
        params, _v = self._authorize_params(client_id, **overrides)
        response = self._submit_consent(params)
        location = response.headers['Location']
        return location.split('code=')[1].split('&')[0]

    def test_full_authorization_code_exchange_mints_apikey(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)

        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body['scope'], 'testns')
        self.assertEqual(body['token_type'], 'Bearer')

        uid = self.env['res.users.apikeys']._check_credentials(scope='testns', key=body['access_token'])
        self.assertEqual(uid, self.internal_user.id)

    def test_client_secret_basic_authenticates_via_authorization_header(self):
        # client_secret_basic sends client_id/client_secret only in the HTTP Basic
        # Authorization header, never in the body - confirms authenticate_client's
        # header-based fallback actually works end to end.
        registration = self._register_client(auth_method='client_secret_basic')
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)

        basic = base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }, headers={'Authorization': f'Basic {basic}'})
        self.assertEqual(response.status_code, 200, response.text)

    def test_missing_client_id_is_rejected(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(response.status_code, 400)

    def test_wrong_client_secret_is_rejected(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        code = self._get_code(client_id, 'a' * 64)
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': 'wrong-secret',
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': 'a' * 64,
        })
        self.assertEqual(response.status_code, 400)

    def test_wrong_code_verifier_is_rejected(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        code = self._get_code(client_id, 'a' * 64)
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': 'wrong-verifier',
        })
        self.assertEqual(response.status_code, 400)

    def test_code_cannot_be_redeemed_twice(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        token_params = {
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }
        first = self.url_open('/oauth/token', data=token_params)
        self.assertEqual(first.status_code, 200)
        second = self.url_open('/oauth/token', data=token_params)
        self.assertEqual(second.status_code, 400)

    def test_redirect_uri_mismatch_at_token_is_rejected(self):
        registration = self._register_client(redirect_uris=[REDIRECT_URI, 'https://other.example.com/cb'])
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': 'https://other.example.com/cb', 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(response.status_code, 400)

    def test_loopback_redirect_uri_port_must_match_exactly_at_token(self):
        # The RFC 8252 port-wildcard only applies to matching against the client's
        # registered URI at /authorize. At /token, the redirect_uri must be the exact one
        # the code was issued to, port included - otherwise a code obtained for one
        # ephemeral listener could be redeemed against another.
        registration = self._register_client(redirect_uris=['http://127.0.0.1:8080/cb'])
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier, redirect_uri='http://127.0.0.1:54321/cb')

        wrong_port = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': 'http://127.0.0.1:9999/cb', 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(wrong_port.status_code, 400)

    def test_loopback_redirect_uri_succeeds_at_token_with_matching_port(self):
        registration = self._register_client(redirect_uris=['http://127.0.0.1:8080/cb'])
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier, redirect_uri='http://127.0.0.1:54321/cb')

        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': 'http://127.0.0.1:54321/cb', 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(response.status_code, 200, response.text)

    def test_refresh_token_rotation_mints_new_apikey_and_revokes_old(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        first = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }).json()

        second = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'client_id': client_id, 'client_secret': client_secret,
            'refresh_token': first['refresh_token'],
        })
        self.assertEqual(second.status_code, 200, second.text)
        second_body = second.json()
        self.assertNotEqual(second_body['access_token'], first['access_token'])

        old_uid = self.env['res.users.apikeys']._check_credentials(scope='testns', key=first['access_token'])
        self.assertIsNone(old_uid)
        new_uid = self.env['res.users.apikeys']._check_credentials(scope='testns', key=second_body['access_token'])
        self.assertEqual(new_uid, self.internal_user.id)

    def test_replayed_refresh_token_is_rejected(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        first = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }).json()
        second = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'client_id': client_id, 'client_secret': client_secret,
            'refresh_token': first['refresh_token'],
        }).json()

        # The first refresh token is single-use: replaying it after rotation is rejected,
        # but the second (currently valid) apikey derived from it is unaffected.
        replay = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'client_id': client_id, 'client_secret': client_secret,
            'refresh_token': first['refresh_token'],
        })
        self.assertEqual(replay.status_code, 400)

        uid = self.env['res.users.apikeys']._check_credentials(scope='testns', key=second['access_token'])
        self.assertEqual(uid, self.internal_user.id)

    def test_access_denied_at_redemption_if_user_lost_resource_access(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        self.internal_user.write({'group_ids': [(3, self.env.ref('base.group_user').id)]})

        response = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        })
        self.assertEqual(response.status_code, 400)

    def test_revoke_disables_the_refresh_token(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        tokens = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }).json()

        revoke_response = self.url_open('/oauth/revoke', data={
            'client_id': client_id, 'client_secret': client_secret, 'token': tokens['refresh_token'],
        })
        self.assertEqual(revoke_response.status_code, 200)

        refresh_response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'client_id': client_id, 'client_secret': client_secret,
            'refresh_token': tokens['refresh_token'],
        })
        self.assertEqual(refresh_response.status_code, 400)

    def test_revoke_disables_the_access_token(self):
        registration = self._register_client()
        client_id, client_secret = registration['client_id'], registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(client_id, verifier)
        tokens = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }).json()

        revoke_response = self.url_open('/oauth/revoke', data={
            'client_id': client_id, 'client_secret': client_secret, 'token': tokens['access_token'],
        })
        self.assertEqual(revoke_response.status_code, 200)
        self.assertIsNone(self.env['res.users.apikeys']._check_credentials(scope='testns', key=tokens['access_token']))

        # Revoking the apikey also cleans up its paired refresh token.
        refresh_response = self.url_open('/oauth/token', data={
            'grant_type': 'refresh_token', 'client_id': client_id, 'client_secret': client_secret,
            'refresh_token': tokens['refresh_token'],
        })
        self.assertEqual(refresh_response.status_code, 400)

    def test_revoke_of_access_token_requires_matching_client(self):
        # RFC 7009 2.2: a client presenting a token it doesn't own must still see 200 -
        # the caller can't be allowed to distinguish "not yours" from "revoked".
        owner_registration = self._register_client()
        owner_client_id, owner_secret = owner_registration['client_id'], owner_registration['client_secret']
        self._login_as('internal_user')
        verifier = 'a' * 64
        code = self._get_code(owner_client_id, verifier)
        tokens = self.url_open('/oauth/token', data={
            'grant_type': 'authorization_code', 'client_id': owner_client_id, 'client_secret': owner_secret,
            'redirect_uri': REDIRECT_URI, 'code': code, 'code_verifier': verifier,
        }).json()

        other_registration = self._register_client()
        other_client_id, other_secret = other_registration['client_id'], other_registration['client_secret']
        revoke_response = self.url_open('/oauth/revoke', data={
            'client_id': other_client_id, 'client_secret': other_secret, 'token': tokens['access_token'],
        })
        self.assertEqual(revoke_response.status_code, 200)

        uid = self.env['res.users.apikeys']._check_credentials(scope='testns', key=tokens['access_token'])
        self.assertEqual(uid, self.internal_user.id)
