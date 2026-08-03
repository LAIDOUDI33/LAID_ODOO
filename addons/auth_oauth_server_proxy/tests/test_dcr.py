from odoo.tests import tagged

from .common import RESOURCE, ProxyCommon


@tagged('post_install', '-at_install')
class TestDcr(ProxyCommon):

    def test_register_returns_client_id(self):
        result = self._register_client()
        self.assertTrue(result['client_id'])
        self.assertNotIn('client_secret', result)

    def test_register_confidential_client_returns_secret(self):
        result = self._register_client(auth_method='client_secret_post')
        self.assertTrue(result['client_secret'])

    def test_register_rejects_http_redirect_uri(self):
        response = self.url_open(f'/oauth/register/{RESOURCE}', data='{"client_name": "x", "redirect_uris": ["http://client.example.com/callback"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_client_metadata')

    def test_register_accepts_any_resource_name(self):
        # This proxy has no resource catalog of its own - it is a pure relay, so any
        # resource name is accepted here; whether it's a real resource is entirely up
        # to whichever target database it eventually gets pointed at.
        response = self.url_open('/oauth/register/some-other-resource', data='{"client_name": "x", "redirect_uris": ["https://client.example.com/callback"]}',
                                  headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 201, response.text)

    def test_authorization_server_metadata_is_resource_scoped(self):
        response = self.url_open(f'/.well-known/oauth-authorization-server/oauth/{RESOURCE}')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['authorization_endpoint'].endswith('/oauth/authorize'))
        self.assertTrue(body['token_endpoint'].endswith('/oauth/token'))
        self.assertTrue(body['registration_endpoint'].endswith(f'/oauth/register/{RESOURCE}'))
