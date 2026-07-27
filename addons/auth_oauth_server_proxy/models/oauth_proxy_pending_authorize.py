from datetime import timedelta

from odoo import api, fields, models


class OauthProxyPendingAuthorize(models.Model):
    _name = 'oauth.proxy.pending.authorize'
    _description = 'OAuth Proxy - In-flight authorize round trip to a target Odoo database'

    state_token = fields.Char(
        required=True, index=True,
        help="Opaque value this proxy sends as `state` to the target database, so its "
             "callback can be matched back to this pending flow.",
    )
    remote_client_id = fields.Many2one('oauth.proxy.remote.client', required=True, ondelete='cascade')
    client_id = fields.Many2one(
        'oauth.client', required=True, ondelete='cascade',
        help="The inbound client this authorization flow was started for.",
    )
    client_redirect_uri = fields.Char(required=True, help="The inbound client's own redirect_uri to forward the result to.")
    client_state = fields.Char(help="The inbound client's own `state` param to forward back unchanged.")

    _state_token_unique = models.Constraint(
        'unique(state_token)',
        "Only one pending flow per state token.",
    )

    @api.autovacuum
    def _gc_abandoned_flows(self):
        stale_before = fields.Datetime.now() - timedelta(minutes=15)
        self.sudo().search([('create_date', '<', stale_before)]).unlink()
