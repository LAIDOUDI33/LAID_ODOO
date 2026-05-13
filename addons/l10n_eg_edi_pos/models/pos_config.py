from datetime import datetime, timedelta

from odoo import api, fields, models

from odoo.addons.l10n_eg_edi_pos.exceptions import L10nEgEdiError


class PosConfig(models.Model):
    _inherit = 'pos.config'

    l10n_eg_edi_pos_enable = fields.Boolean(string="Submit POS receipts to ETA")
    l10n_eg_edi_pos_client_id = fields.Char()
    l10n_eg_edi_pos_client_secret = fields.Char()
    l10n_eg_edi_pos_serial_number = fields.Char()
    l10n_eg_edi_pos_preprod = fields.Boolean(string="Use Pre-production Environment")
    l10n_eg_edi_pos_access_token = fields.Char(readonly=True)
    l10n_eg_edi_pos_token_expiry = fields.Datetime(readonly=True)
    l10n_eg_edi_pos_last_uuid = fields.Char(readonly=True)

    @api.model
    def _l10n_eg_get_backend_only_fields(self):
        return [
            'l10n_eg_edi_pos_client_id',
            'l10n_eg_edi_pos_client_secret',
            'l10n_eg_edi_pos_serial_number',
            'l10n_eg_edi_pos_access_token',
            'l10n_eg_edi_pos_token_expiry',
            'l10n_eg_edi_pos_last_uuid',
        ]

    @api.model
    def _load_pos_data_read(self, records, config):
        data = super()._load_pos_data_read(records, config)
        for record in data:
            for field_name in self._l10n_eg_get_backend_only_fields():
                record.pop(field_name, None)
        return data

    @api.model
    def _l10n_eg_get_credential_fields(self):
        return [
            'l10n_eg_edi_pos_client_id',
            'l10n_eg_edi_pos_client_secret',
            'l10n_eg_edi_pos_serial_number',
            'l10n_eg_edi_pos_preprod',
        ]

    def write(self, vals):
        credential_fields = self._l10n_eg_get_credential_fields()
        stale_token_configs = self.filtered(
            lambda config: (config.l10n_eg_edi_pos_access_token or config.l10n_eg_edi_pos_token_expiry)
            and any(field in vals and vals[field] != config[field] for field in credential_fields),
        )
        res = super().write(vals)
        if stale_token_configs:
            stale_token_configs.write({
                'l10n_eg_edi_pos_access_token': False,
                'l10n_eg_edi_pos_token_expiry': False,
            })
        return res

    def _l10n_eg_edi_pos_get_token(self):
        """
            :return: a valid ETA access token, from the cache when it is still fresh
            :raises L10nEgEdiError: if a new token could not be obtained
        """
        self.ensure_one()
        if (
            self.l10n_eg_edi_pos_access_token
            and self.l10n_eg_edi_pos_token_expiry
            and self.l10n_eg_edi_pos_token_expiry > datetime.now() + timedelta(seconds=60)
        ):
            return self.l10n_eg_edi_pos_access_token
        return self._l10n_eg_edi_pos_authenticate()

    def _l10n_eg_edi_pos_build_auth_request(self):
        """
            returns {
                'body': {...},
                'header': {...},
            }
        """
        self.ensure_one()
        return {
            'body': {
                'grant_type': 'client_credentials',
                'client_id': self.l10n_eg_edi_pos_client_id,
                'client_secret': self.l10n_eg_edi_pos_client_secret,
            },
            'header': {
                'posserial': self.l10n_eg_edi_pos_serial_number,
                'pososversion': 'os',
                'posmodelframework': '1',
                'presharedkey': self.l10n_eg_edi_pos_client_id,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }

    def _l10n_eg_edi_pos_authenticate(self):
        """
            :return: a freshly issued ETA access token, cached on the config
            :raises L10nEgEdiError: if the authentication response is unusable
        """
        self.ensure_one()
        request_data = self._l10n_eg_edi_pos_build_auth_request()
        response = self.env['account.edi.format']._l10n_eg_eta_connect_to_server(
            request_data,
            '/connect/token',
            'POST',
            is_access_token_req=True,
            production_enviroment=not self.l10n_eg_edi_pos_preprod,
        )

        data = response.get('data') or {}
        if (error := response.get('error')) or 'access_token' not in data:
            raise L10nEgEdiError(error or self.env._("ETA authentication response is missing the access token."))

        try:
            expiry = datetime.now() + timedelta(seconds=int(data['expires_in']))
        except (KeyError, ValueError, TypeError):
            raise L10nEgEdiError(self.env._("ETA authentication response is missing a valid expires_in."))

        self.write({
            'l10n_eg_edi_pos_access_token': data['access_token'],
            'l10n_eg_edi_pos_token_expiry': expiry,
        })

        return data['access_token']
