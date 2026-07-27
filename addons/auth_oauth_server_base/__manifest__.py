{
    'name': 'OAuth 2.1 Authorization Server (base)',
    'category': 'Technical',
    'summary': 'Shared HTTP surface for OAuth 2.1 authorization servers exposed per-resource',
    'description': """
OAuth 2.1 Authorization Server - base
=======================================
Not meant to be used on its own. Factors out the parts of an OAuth 2.1 authorization server
that are identical regardless of what actually issues the tokens: the authorization server metadata document,
the Dynamic Client Registration, and the token endpoint's grant-type dispatch.

Also provides the oauth.client model (registered clients: client_id, client_secret,
redirect_uris, resource_name, ...), shared the same way - each concrete deployment may extend
it with whatever extra fields it needs since only one of these deployments is ever installed
in a given database.
""",
    'author': 'Odoo S.A.',
    'depends': ['base', 'web'],
    'data': [
        'security/ir.access.csv',
    ],
    'auto_install': False,
    'license': 'LGPL-3',
}
