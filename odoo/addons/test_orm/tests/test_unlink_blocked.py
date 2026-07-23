from odoo.exceptions import ValidationError
from odoo.tests import tagged, TransactionCase


@tagged('at_install', '-post_install')
class TestUnlinkBlocked(TransactionCase):
    """ Test that unlink() turns a foreign key RESTRICT violation into a
    friendly, translated ValidationError carrying structured data for the
    web client (see BaseModel._raise_unlink_blocked_error). """

    def test_single_record_not_archivable(self):
        parent = self.env['test_orm.unlink_blocked.parent'].create({'name': 'Parent'})
        self.env['test_orm.unlink_blocked.child'].create({'parent_id': parent.id})

        with self.assertRaises(ValidationError) as cm:
            parent.unlink()

        # the wording shown to the end user is built by the web client from
        # `context`; the exception's own message is whatever the pre-existing
        # `_sql_error_to_message` mechanism produces and isn't asserted here.
        self.assertEqual(cm.exception.context, {
            'unlink_blocked': True,
            'archivable': False,
            'blocked_ids': [parent.id],
            'model_name': 'Test ORM Unlink Blocked Child',
        })
        self.assertTrue(parent.exists())

    def test_single_record_archivable(self):
        Parent = self.env['test_orm.unlink_blocked.archivable_parent']
        parent = Parent.create({'name': 'Parent'})
        self.env['test_orm.unlink_blocked.child'].create({'archivable_parent_id': parent.id})

        with self.assertRaises(ValidationError) as cm:
            parent.unlink()

        self.assertEqual(cm.exception.context, {
            'unlink_blocked': True,
            'archivable': True,
            'blocked_ids': [parent.id],
            'model_name': 'Test ORM Unlink Blocked Child',
        })
        self.assertTrue(parent.exists())

    def test_multi_record_partial_blocked(self):
        Parent = self.env['test_orm.unlink_blocked.parent']
        blocked = Parent.create({'name': 'Blocked'})
        free = Parent.create({'name': 'Free'})
        self.env['test_orm.unlink_blocked.child'].create({'parent_id': blocked.id})

        with self.assertRaises(ValidationError) as cm:
            (blocked + free).unlink()

        self.assertEqual(cm.exception.context, {
            'unlink_blocked': True,
            'archivable': False,
            'blocked_ids': [blocked.id],
            'model_name': 'Test ORM Unlink Blocked Child',
        })
        # all-or-nothing: nothing got deleted, including the unblocked record
        self.assertTrue(blocked.exists())
        self.assertTrue(free.exists())

    def test_unlink_still_works_without_reference(self):
        parent = self.env['test_orm.unlink_blocked.parent'].create({'name': 'Parent'})
        parent.unlink()
        self.assertFalse(parent.exists())
