from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_hash, _verify_hash, OAUTH_SECRET_INDEX_SIZE


class OauthProxyToken(models.Model):
    _name = 'oauth.proxy.token'
    _description = 'Routing table for access/refresh token pairs this proxy relays'

    access_token_index = fields.Char(required=True, index=True)
    access_token_hash = fields.Char(required=True, groups=fields.NO_ACCESS)
    refresh_token_index = fields.Char(required=True, index=True)
    refresh_token_hash = fields.Char(required=True, groups=fields.NO_ACCESS)
    remote_client_id = fields.Many2one('oauth.proxy.remote.client', required=True, ondelete='cascade')
    client_id = fields.Many2one(
        'oauth.client', required=True, ondelete='cascade',
        help="The inbound client this token pair was issued to.",
    )

    @api.model
    def _store(self, access_token, refresh_token, remote_client, client):
        self.sudo().create({
            'access_token_index': access_token[:OAUTH_SECRET_INDEX_SIZE],
            'access_token_hash': _generate_hash(access_token),
            'refresh_token_index': refresh_token[:OAUTH_SECRET_INDEX_SIZE],
            'refresh_token_hash': _generate_hash(refresh_token),
            'remote_client_id': remote_client.id,
            'client_id': client.id,
        })

    @api.model
    def _find_by_access_token(self, access_token, client=None):
        domain = [('access_token_index', '=', access_token[:OAUTH_SECRET_INDEX_SIZE])]
        if client:
            domain.append(('client_id', '=', client.id))
        candidates = self.sudo().search(domain)
        for record in candidates:
            if _verify_hash(access_token, record.access_token_hash):
                return record
        return None

    @api.model
    def _find_by_refresh_token(self, refresh_token, client):
        candidates = self.sudo().search([
            ('refresh_token_index', '=', refresh_token[:OAUTH_SECRET_INDEX_SIZE]),
            ('client_id', '=', client.id)
        ])
        for record in candidates:
            if _verify_hash(refresh_token, record.refresh_token_hash):
                return record
        return None

    @api.autovacuum
    def _gc_stale_tokens(self):
        self.sudo().search([('create_date', '<', fields.Datetime.now() - timedelta(days=30))]).unlink()
