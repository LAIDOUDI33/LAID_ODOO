{
    'name': 'OAuth 2.1 Authorization Server Proxy',
    'category': 'Technical',
    'summary': 'Generic OAuth 2.1 proxy in front of any Odoo database, for any resource',
    'description': """
OAuth 2.1 Authorization Server Proxy
=====================================
A standalone Odoo deployment that lets third-party clients connect to a protected API on
some other Odoo database (e.g. `ai_mcp`'s `/mcp` endpoint, exposed through
`auth_oauth_server`'s resource mechanism) through a proper OAuth 2.1 flow, instead of
manually pasting a raw API key.

This proxy only ever mediates the browser-based authorize leg and relays the token
exchange; once a client has an access token, traffic to the actual protected resource is
forwarded with no inspection or enforcement on this proxy's part - that is entirely the
target database's responsibility.

This module is intentionally generic: it has no knowledge of any particular protected
resource. It accepts Dynamic Client Registration and authorize/token requests under any
resource name and blindly relays them to whichever target database it is pointed at,
under that same resource name - it is up to the target database to recognize (or reject)
that resource. Other modules plug into it by contributing the actual protected endpoint
and its RFC 9728 protected resource metadata (e.g. ai_mcp_oauth_server_proxy does this
for MCP).

Implements, towards the third-party client:
    - RFC 8414 Authorization Server Metadata
    - RFC 7591 Dynamic Client Registration
    - RFC 7636 PKCE (S256 only)

And acts as an OAuth 2.1 client towards the target Odoo database's auth_oauth_server.
""",
    'author': 'Odoo S.A.',
    'depends': ['base', 'web', 'auth_oauth_server_base'],
    'data': [
        'security/ir.access.csv',
        'views/db_url_form_templates.xml',
    ],
    'auto_install': False,
    'license': 'LGPL-3',
}
