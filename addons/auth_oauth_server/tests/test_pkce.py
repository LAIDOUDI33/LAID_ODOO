from odoo.tests import tagged

from odoo.addons.auth_oauth_server_base.utils.oauth_utils import challenge_from_verifier, verifier_matches_challenge
from .common import OauthServerCommon


@tagged('post_install', '-at_install')
class TestPkce(OauthServerCommon):

    def test_challenge_matches_its_own_verifier(self):
        verifier = 'a' * 64
        challenge = challenge_from_verifier(verifier)
        self.assertTrue(verifier_matches_challenge(verifier, challenge))

    def test_wrong_verifier_does_not_match(self):
        challenge = challenge_from_verifier('a' * 64)
        self.assertFalse(verifier_matches_challenge('b' * 64, challenge))

    def test_missing_verifier_does_not_match(self):
        challenge = challenge_from_verifier('a' * 64)
        self.assertFalse(verifier_matches_challenge('', challenge))

    def test_authorize_rejects_missing_code_challenge(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id)
        del params['code_challenge']
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 400)

    def test_authorize_rejects_plain_challenge_method(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id, code_challenge_method='plain')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 400)
