from datetime import datetime, timedelta

from freezegun import freeze_time

from odoo.tests import tagged

from .common import TestL10nEgEdiPosCommon
from odoo.addons.l10n_eg_edi_pos.exceptions import L10nEgEdiError


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestL10nEgEdiPosTokenCache(TestL10nEgEdiPosCommon):

    def test_cached_token_returned_without_http(self):
        """A cached access_token whose expiry is comfortably in the future is
        returned without an http call."""
        self.eg_pos_config.sudo().write({
            'l10n_eg_edi_pos_access_token': 'precached-token',
            'l10n_eg_edi_pos_token_expiry': datetime.now() + timedelta(hours=1),
        })
        with self._assert_no_eta_call():
            token = self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertEqual(token, 'precached-token')

    def test_token_within_60s_of_expiry_triggers_reauth(self):
        """A cached token whose expiry is within 60 s of now triggers a re-auth;
        the cache is updated with the new token and expiry."""
        self.eg_pos_config.sudo().write({
            'l10n_eg_edi_pos_access_token': 'stale-token',
            'l10n_eg_edi_pos_token_expiry': datetime.now() + timedelta(seconds=30),
        })
        with self._mock_eta(token='fresh-token', expires_in=3600):
            token = self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertEqual(token, 'fresh-token')
        self.assertEqual(self.eg_pos_config.sudo().l10n_eg_edi_pos_access_token, 'fresh-token')

    def test_response_missing_access_token_or_expires_in_raises_without_caching(self):
        """An auth response missing ``access_token`` or ``expires_in`` raises and
        leaves the cache untouched."""
        self.eg_pos_config.sudo().write({
            'l10n_eg_edi_pos_access_token': False,
            'l10n_eg_edi_pos_token_expiry': False,
        })
        with self._mock_eta(auth_response={'data': {}}), self.assertRaises(L10nEgEdiError):
            self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertFalse(self.eg_pos_config.sudo().l10n_eg_edi_pos_access_token)
        self.assertFalse(self.eg_pos_config.sudo().l10n_eg_edi_pos_token_expiry)

    def test_successful_auth_persists_expiry_as_now_plus_expires_in(self):
        """A successful auth at frozen time T sets
        ``l10n_eg_edi_pos_token_expiry == T + expires_in seconds``."""
        self.eg_pos_config.sudo().write({
            'l10n_eg_edi_pos_access_token': False,
            'l10n_eg_edi_pos_token_expiry': False,
        })
        frozen = datetime(2026, 1, 1, 12, 0, 0)
        with freeze_time(frozen), self._mock_eta(token='fresh-token', expires_in=3600):
            token = self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertEqual(token, 'fresh-token')
        self.assertEqual(
            self.eg_pos_config.sudo().l10n_eg_edi_pos_token_expiry,
            frozen + timedelta(seconds=3600),
        )

    def _seed_cached_token(self):
        """Put a comfortably valid token in the cache and return the config in sudo."""
        config_sudo = self.eg_pos_config.sudo()
        config_sudo.write({
            'l10n_eg_edi_pos_access_token': 'cached-token',
            'l10n_eg_edi_pos_token_expiry': datetime.now() + timedelta(hours=1),
        })
        return config_sudo

    def test_changing_a_credential_field_clears_the_cached_token(self):
        """Changing any credential or environment field drops the token and its expiry."""
        new_values = {
            'l10n_eg_edi_pos_client_id': 'other-client-id',
            'l10n_eg_edi_pos_client_secret': 'other-client-secret',
            'l10n_eg_edi_pos_serial_number': 'POS-SN-002',
            'l10n_eg_edi_pos_preprod': False,
        }
        for field_name, new_value in new_values.items():
            with self.subTest(field=field_name):
                config_sudo = self._seed_cached_token()
                original_value = config_sudo[field_name]
                config_sudo.write({field_name: new_value})
                self.assertFalse(config_sudo.l10n_eg_edi_pos_access_token)
                self.assertFalse(config_sudo.l10n_eg_edi_pos_token_expiry)
                config_sudo.write({field_name: original_value})

    def test_rewriting_a_credential_with_its_current_value_keeps_the_cached_token(self):
        """A settings save that does not actually change a credential keeps the token."""
        config_sudo = self._seed_cached_token()
        config_sudo.write({
            'l10n_eg_edi_pos_client_id': config_sudo.l10n_eg_edi_pos_client_id,
            'l10n_eg_edi_pos_client_secret': config_sudo.l10n_eg_edi_pos_client_secret,
            'l10n_eg_edi_pos_serial_number': config_sudo.l10n_eg_edi_pos_serial_number,
            'l10n_eg_edi_pos_preprod': config_sudo.l10n_eg_edi_pos_preprod,
        })
        self.assertEqual(config_sudo.l10n_eg_edi_pos_access_token, 'cached-token')
        self.assertTrue(config_sudo.l10n_eg_edi_pos_token_expiry)

    def test_writing_last_uuid_keeps_the_cached_token(self):
        """The receipt chain head is written on every accepted receipt, so it must
        never invalidate the token."""
        config_sudo = self._seed_cached_token()
        config_sudo.l10n_eg_edi_pos_last_uuid = 'chain-head-uuid'
        self.assertEqual(config_sudo.l10n_eg_edi_pos_access_token, 'cached-token')
        with self._assert_no_eta_call():
            token = self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertEqual(token, 'cached-token')

    def test_token_is_reauthenticated_after_a_credential_change(self):
        """Once cleared, the next token request authenticates with the new credentials."""
        config_sudo = self._seed_cached_token()
        config_sudo.l10n_eg_edi_pos_client_secret = 'rotated-client-secret'
        with self._mock_eta(token='fresh-token', expires_in=3600):
            token = self.eg_pos_config._l10n_eg_edi_pos_get_token()
        self.assertEqual(token, 'fresh-token')
        self.assertEqual(config_sudo.l10n_eg_edi_pos_access_token, 'fresh-token')
