from odoo import fields, models
from odoo.exceptions import AccessDenied


class OauthResource(models.Model):
    _name = 'oauth.resource'
    _description = 'OAuth 2.1 Protected Resource'

    name = fields.Char(required=True, index=True)
    label = fields.Char(required=True, help="Shown to the user on the consent screen.")
    apikey_scope = fields.Char(
        required=True,
        help="Value written to res.users.apikeys.scope for credentials minted under this resource.",
    )
    group_ids = fields.Many2many(
        'res.groups',
        help="The user needs to be in at least one of these access groups to be able to use OAuth under this resource."
    )
    active = fields.Boolean(default=True)

    _name_unique = models.Constraint('unique(name)', "The resource name must be unique.")

    def _check_user_access(self, user):
        """Raise AccessDenied if `user` is not allowed to obtain a credential for this resource."""
        self.ensure_one()
        if self.group_ids and not (self.group_ids & user.all_group_ids):
            raise AccessDenied(
                f"You do not have the required access rights for the '{self.name}' scope.")
