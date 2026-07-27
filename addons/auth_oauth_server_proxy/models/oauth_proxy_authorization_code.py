from datetime import timedelta

from odoo import api, fields, models
from odoo.addons.auth_oauth_server_base.utils.oauth_utils import _generate_hash, _verify_hash, OAUTH_SECRET_INDEX_SIZE


class OauthProxyAuthorizationCode(models.Model):
    _name = 'oauth.proxy.authorization.code'
    _description = 'Routing table for authorization codes this proxy relays'

    code_index = fields.Char(required=True, index=True)
    code_hash = fields.Char(required=True, groups=fields.NO_ACCESS)
    redirect_uri = fields.Char(
        required=True,
        help="The inbound client's redirect_uri this code was issued to; must match the one "
             "presented when the code is redeemed.",
    )
    remote_client_id = fields.Many2one('oauth.proxy.remote.client', required=True, ondelete='cascade')
    client_id = fields.Many2one(
        'oauth.client', required=True, ondelete='cascade',
        help="The inbound client this code was issued to",
    )

    @api.model
    def _store(self, code, remote_client, client, redirect_uri):
        self.sudo().create({
            'code_index': code[:OAUTH_SECRET_INDEX_SIZE],
            'code_hash': _generate_hash(code),
            'redirect_uri': redirect_uri,
            'remote_client_id': remote_client.id,
            'client_id': client.id,
        })

    @api.model
    def _find(self, code, client, redirect_uri):
        candidates = self.sudo().search([
            ('code_index', '=', code[:OAUTH_SECRET_INDEX_SIZE]),
            ('client_id', '=', client.id),
            ('redirect_uri', '=', redirect_uri)
        ])
        for record in candidates:
            if _verify_hash(code, record.code_hash):
                return record
        return None

    @api.autovacuum
    def _gc_abandoned_codes(self):
        self.sudo().search([('create_date', '<', fields.Datetime.now() - timedelta(minutes=2))]).unlink()
