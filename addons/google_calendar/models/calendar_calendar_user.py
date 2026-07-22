from odoo import fields, models


class CalendarCalendarUser(models.Model):
    _inherit = 'calendar.calendar.user'

    google_sync_enabled = fields.Boolean(default=True)

    def _get_writeable_fields(self):
        return super()._get_writeable_fields() | {'google_sync_enabled'}
