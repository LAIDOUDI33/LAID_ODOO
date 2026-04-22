from random import randint

from odoo import api, fields, models, _
from odoo.exceptions import AccessError


class CalendarCalendarUser(models.Model):
    _name = 'calendar.calendar.user'
    _description = 'Calendar User Manager'

    _unique_user_per_calendar = models.UniqueIndex('(user_id, calendar_id)')
    _single_primary_calendar_per_user = models.UniqueIndex('(user_id) WHERE is_primary')

    calendar_id = fields.Many2one('calendar.calendar', string='Calendar', ondelete='cascade', required=True)
    user_id = fields.Many2one('res.users', string='User', ondelete='cascade', required=True)
    is_primary = fields.Boolean('Primary')
    label = fields.Char('Label')

    # Access roles matching those of Google Calendar
    access_role = fields.Selection([
        ('owner', 'Owner'),
        ('reader', 'Read'),
        ('writer', 'Write'),
        ('freeBusyReader', 'Free/Busy Reader'),
    ], required=True)

    # Filter values
    filter_color = fields.Integer(string='Color', default=1)
    is_filter_active = fields.Boolean('Active', default=True)
    is_filter_checked = fields.Boolean('Checked', default=True)

    def _default_color(self):
        return randint(1, 11)

    @api.model_create_multi
    def create(self, vals_list):
        """ A user may only insert a membership row on a calendar they already own. The exception is a brand-new
        calendar that has no membership rows at all yet. """
        if not self.env.su:
            for vals in vals_list:
                calendar = self.env['calendar.calendar'].browse(vals.get('calendar_id'))
                existing_users = calendar.sudo().calendar_user_ids
                if not existing_users:
                    continue  # Creating a new calendar
                if any(user.access_role == 'owner' and user.user_id.id == self.env.uid for user in existing_users):
                    continue
                raise AccessError(_("Only the owner of a calendar can grant access to other users."))

        # Assign a random unused color to each new filter.
        for vals in vals_list:
            if not vals.get('filter_color'):
                vals['filter_color'] = self._default_color()

        return super().create(vals_list)

    def write(self, vals):
        blacklisted_fields = [k for k in vals if k not in self._get_writeable_fields()]
        if blacklisted_fields and not self.env.su:
            raise AccessError(_("These fields cannot be modified: %(fields)s", fields=", ".join(blacklisted_fields)))

        return super().write(vals)

    def unlink(self):
        for record in self:
            """ If we unlink the last user from a calendar, we should also delete the calendar."""
            if record.calendar_id.active and len(record.calendar_id.calendar_user_ids) == 1:
                record.calendar_id.sudo().unlink()  # This will cascade delete this record as well, no need to call super
            else:
                super().unlink()

    @api.model
    def _get_writeable_fields(self):
        return {'is_filter_active', 'is_filter_checked', 'filter_color', 'label'}

    @api.model
    def toggle_filter(self, calendar_id):
        calendar_filter = self.search([('calendar_id', '=', calendar_id), ('user_id', '=', self.env.user.id)])
        calendar_filter.is_filter_active = not calendar_filter.is_filter_active
        calendar_filter.is_filter_checked = True
