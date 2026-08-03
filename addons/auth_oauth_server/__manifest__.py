{
    'name': 'OAuth 2.1 Authorization Server',
    'category': 'Technical',
    'summary': 'Turns this Odoo database into a generic OAuth 2.1 Authorization Server',
    'description': """
OAuth 2.1 Authorization Server
===============================
Lets third-party applications obtain a scoped, time-limited API key on behalf of an Odoo
user through the standard OAuth 2.1 authorization code flow (PKCE mandatory), instead of
the user manually generating and sharing a raw API key.

Implements:
    - RFC 8414 Authorization Server Metadata (one virtual issuer per registered resource)
    - RFC 7591 Dynamic Client Registration
    - RFC 7636 PKCE (S256 only)
    - RFC 7009 Token Revocation
    - RFC 9207 Authorization Server Issuer Identification

This module is intentionally generic: it has no knowledge of any particular protected
resource (e.g. MCP). Other modules plug into it by declaring an oauth.resource
(e.g. "mcp"); this module only authenticates the user, obtains consent, and mints a
res.users.apikeys credential.
""",
    'author': 'Odoo S.A.',
    'depends': ['base', 'web', 'auth_oauth_server_base'],
    'data': [
        'security/ir.access.csv',
        'views/oauth_consent_templates.xml',
    ],
    'auto_install': False,
    'license': 'LGPL-3',
}
