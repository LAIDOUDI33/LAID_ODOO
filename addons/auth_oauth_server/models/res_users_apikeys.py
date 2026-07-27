from odoo import models
from odoo.addons.base.models.res_users import INDEX_SIZE, KEY_CRYPT_CONTEXT
from odoo.tools import SQL


class ResUsersApikeys(models.Model):
    _inherit = 'res.users.apikeys'

    def _find_by_key(self, key):
        """Find the res.users.apikeys record matching the plaintext `key`.

        res.users.apikeys is _auto=False and keeps its index/key columns out of the
        ORM, so this can't be expressed as a domain search.

        :returns: the (user_id, apikey_id) of the matching record, or (None, None) if `key` matches no record.
        """
        self.env.cr.execute(SQL(
            "SELECT id, user_id, key FROM %(table)s WHERE index = %(index)s",
            table=SQL.identifier(self._table), index=key[:INDEX_SIZE],
        ))
        for row_id, user_id, row_key in self.env.cr.fetchall():
            if KEY_CRYPT_CONTEXT.verify(key, row_key):
                return user_id, row_id
        return None, None
