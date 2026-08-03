from urllib.parse import unquote

from odoo.tests import tagged

from .common import REDIRECT_URI, OauthServerCommon


@tagged('post_install', '-at_install')
class TestAuthorize(OauthServerCommon):

    def test_not_logged_in_redirects_to_login(self):
        client_id = self._register_client()['client_id']
        params, _verifier = self._authorize_params(client_id)
        response = self.url_open('/oauth/authorize', params=params, allow_redirects=False)
        self.assertIn(response.status_code, (302, 303))
        self.assertIn('/web/login', response.headers['Location'])

    def test_consent_screen_is_shown_and_not_frameable(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id)
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.resource.label, response.text)
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')
        self.assertIn("frame-ancestors 'none'", response.headers.get('Content-Security-Policy', ''))

    def test_consent_approval_issues_code_with_iss(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id)
        response = self._submit_consent(params)
        self.assertIn(response.status_code, (302, 303))
        location = unquote(response.headers['Location'])
        self.assertTrue(location.startswith(REDIRECT_URI))
        self.assertRegex(location, r'[?&]code=')
        self.assertIn('iss=', location)
        self.assertIn('/oauth/testns', location)

    def test_consent_denial_redirects_with_access_denied(self):
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id)
        response = self._submit_consent(params, allow='0')
        self.assertIn('error=access_denied', response.headers['Location'])

    def test_arbitrary_requested_scope_is_ignored(self):
        # A resource is a single, all-or-nothing scope: whatever the client asks for in
        # `scope` has no effect, and is never validated or rejected.
        client_id = self._register_client()['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id, scope='read delete_everything')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 200)

    def test_portal_user_is_denied_access_to_resource(self):
        client_id = self._register_client()['client_id']
        self._login_as('portal_user')
        params, _verifier = self._authorize_params(client_id)
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 403)

    def test_resource_group_restriction_is_enforced(self):
        self.env['oauth.resource'].create({
            'name': 'restricted', 'label': 'Restricted', 'apikey_scope': 'restricted',
            'group_ids': [self.env.ref('base.group_system').id],
        })
        client_id = self._register_client(resource='restricted')['client_id']

        self._login_as('internal_user')  # not a system user
        params, _verifier = self._authorize_params(client_id)
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 403)

    def test_loopback_redirect_uri_matches_regardless_of_registered_port(self):
        # RFC 8252 §7.3: a native app registers its loopback redirect_uri once but binds
        # a different ephemeral port on every run, so the port must be ignored at match time.
        client_id = self._register_client(redirect_uris=['http://127.0.0.1:8080/cb'])['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id, redirect_uri='http://127.0.0.1:54321/cb')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 200)

    def test_loopback_redirect_uri_path_mismatch_is_still_rejected(self):
        client_id = self._register_client(redirect_uris=['http://127.0.0.1:8080/cb'])['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id, redirect_uri='http://127.0.0.1:54321/other')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 400)
