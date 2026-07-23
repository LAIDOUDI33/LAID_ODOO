from odoo import fields, models


class TestOrmUnlinkBlockedParent(models.Model):
    _name = 'test_orm.unlink_blocked.parent'
    _description = 'Test ORM Unlink Blocked Parent (not archivable)'

    name = fields.Char()


class TestOrmUnlinkBlockedArchivableParent(models.Model):
    _name = 'test_orm.unlink_blocked.archivable_parent'
    _description = 'Test ORM Unlink Blocked Parent (archivable)'

    name = fields.Char()
    active = fields.Boolean(default=True)


class TestOrmUnlinkBlockedChild(models.Model):
    _name = 'test_orm.unlink_blocked.child'
    _description = 'Test ORM Unlink Blocked Child'

    parent_id = fields.Many2one('test_orm.unlink_blocked.parent', ondelete='restrict')
    archivable_parent_id = fields.Many2one('test_orm.unlink_blocked.archivable_parent', ondelete='restrict')
