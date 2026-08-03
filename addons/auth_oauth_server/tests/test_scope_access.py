from odoo.exceptions import AccessDenied
from odoo.tests import tagged

from .common import OauthServerCommon


@tagged('post_install', '-at_install')
class TestScopeAccess(OauthServerCommon):

    def test_internal_user_in_required_group_can_access_resource(self):
        self.resource._check_user_access(self.internal_user)  # must not raise

    def test_portal_user_cannot_access_any_resource(self):
        with self.assertRaises(AccessDenied):
            self.resource._check_user_access(self.portal_user)

    def test_group_restricted_resource_denies_users_without_the_group(self):
        restricted = self.env['oauth.resource'].create({
            'name': 'restricted2', 'label': 'Restricted', 'apikey_scope': 'restricted2',
            'group_ids': [self.env.ref('base.group_system').id],
        })
        with self.assertRaises(AccessDenied):
            restricted._check_user_access(self.internal_user)

    def test_group_restricted_resource_allows_users_with_the_group(self):
        restricted = self.env['oauth.resource'].create({
            'name': 'restricted3', 'label': 'Restricted', 'apikey_scope': 'restricted3',
            'group_ids': [self.env.ref('base.group_system').id],
        })
        admin = self.env.ref('base.user_admin')
        restricted._check_user_access(admin)  # must not raise
