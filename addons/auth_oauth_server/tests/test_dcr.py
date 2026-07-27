import json

from odoo.tests import tagged

from .common import REDIRECT_URI, OauthServerCommon


@tagged('post_install', '-at_install')
class TestDcr(OauthServerCommon):

    def test_register_returns_client_id_and_secret(self):
        result = self._register_client()
        self.assertTrue(result['client_id'])
        self.assertTrue(result['client_secret'])

    def test_register_without_auth_method_defaults_to_confidential(self):
        # RFC 7591's own default (client_secret_basic) applies when the field is
        # omitted entirely - it must never silently fall back to a public client.
        response = self.url_open('/oauth/register/testns', data=json.dumps({
            'client_name': 'x', 'redirect_uris': [REDIRECT_URI],
        }), headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertTrue(response.json()['client_secret'])

    def test_register_allows_explicit_none_auth_method(self):
        # 'none' is never the default (see test above), but a client may still request
        # it explicitly and register as public, with no client_secret returned.
        response = self.url_open('/oauth/register/testns', data=json.dumps({
            'client_name': 'x', 'redirect_uris': [REDIRECT_URI], 'token_endpoint_auth_method': 'none',
        }), headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertNotIn('client_secret', response.json())

    def test_register_rejects_http_redirect_uri(self):
        response = self.url_open('/oauth/register/testns', data='{"client_name": "x", "redirect_uris": ["http://client.example.com/callback"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_client_metadata')

    def test_register_allows_http_loopback_redirect_uri(self):
        # RFC 8252 §7.3: native apps can't host a fixed HTTPS endpoint, so http:// is
        # allowed for the loopback interface.
        response = self.url_open('/oauth/register/testns', data='{"client_name": "x", "redirect_uris": ["http://127.0.0.1:8080/cb"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)

    def test_register_rejects_http_non_loopback_redirect_uri(self):
        # The loopback exception only covers the loopback interface, not "localhost"
        # (its resolution can be hijacked) or any other host.
        response = self.url_open('/oauth/register/testns', data='{"client_name": "x", "redirect_uris": ["http://localhost:8080/cb"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 400)

    def test_register_requires_at_least_one_redirect_uri(self):
        response = self.url_open('/oauth/register/testns', data='{"client_name": "x", "redirect_uris": []}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 400)

    def test_unknown_resource_is_not_found(self):
        response = self.url_open('/oauth/register/does-not-exist', data='{"client_name": "x", "redirect_uris": ["https://a.example.com/cb"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 404)

    def test_redirect_uri_not_in_whitelist_is_rejected_at_authorize(self):
        client_id = self._register_client(redirect_uris=[REDIRECT_URI])['client_id']
        self._login_as('internal_user')
        params, _verifier = self._authorize_params(client_id, redirect_uri='https://evil.example.com/callback')
        response = self.url_open('/oauth/authorize', params=params)
        self.assertEqual(response.status_code, 400)
