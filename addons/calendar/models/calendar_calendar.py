from odoo import api, Command, fields, models, _
from odoo.exceptions import UserError, AccessError


class CalendarCalendar(models.Model):
    _name = 'calendar.calendar'
    _description = 'Calendar'

    @api.model
    def default_get(self, fields):
        defaults = super().default_get(fields)

        if 'calendar_user_ids' not in defaults and 'calendar_user_ids' in fields:
            defaults['calendar_user_ids'] = [Command.create({
                'user_id': self.env.user.id,
                'access_role': 'owner',
                'is_filter_active': True,
                'is_filter_checked': True,
                'label': _('Calendar')
            })]

        return defaults

    # All user membership records of this calendar
    calendar_user_ids = fields.One2many('calendar.calendar.user', inverse_name='calendar_id', string='Users')
    owner_ids = fields.Many2many('res.users', compute='_compute_owners')
    shared_with_users = fields.Many2many('res.users', string="Shared with", compute='_compute_shared_with_users',
        inverse='_inverse_shared_with_users', domain="[('id', 'not in', owner_ids)]")
    """
    Access roles based on those of Google Calendar
                owner - has full access to the calendar, can read/write/delete events and change the calendar settings
               writer - can read/write/delete events, but cannot edit settings like calendar privacy
               reader - can read events, but cannot write or delete them
       freeBusyReader - can only see event timeslots marked as Busy, without any event details
    """
    # The current user's membership record of this calendar, if any
    calendar_user_id = fields.Many2one(
        'calendar.calendar.user',
        string='Current calendar membership record',
        compute='_compute_calendar_user',
        search='_search_calendar_user_id',
    )
    color = fields.Integer(related='calendar_user_id.filter_color', readonly=False, string='Color')
    display_name = fields.Char(compute='_compute_display_name', inverse='_inverse_display_name')
    is_primary = fields.Boolean(related='calendar_user_id.is_primary')
    user_access_role = fields.Selection(related='calendar_user_id.access_role', readonly=False)
    user_has_read_access = fields.Boolean(compute='_compute_user_has_read_access', search="_search_user_has_read_access")
    user_has_write_access = fields.Boolean(compute='_compute_user_has_write_access', search="_search_user_has_write_access")

    event_ids = fields.One2many('calendar.event', 'calendar_id', "Events")
    recurrence_ids = fields.One2many('calendar.recurrence', 'calendar_id', "Recurrences")

    calendar_default_privacy = fields.Selection(
        [('public', 'Public by default'),
         ('private', 'Private by default'),
         ('confidential', 'Internal users only')],
        default='private',
    )

    @api.ondelete(at_uninstall=False)
    def _unlink_except_primary(self):
        if self.calendar_user_ids.filtered('is_primary'):
            raise UserError(_("A primary calendar cannot be deleted."))

    def write(self, vals):
        """ Forbid the calendar default privacy update from different users for keeping private events secured. """
        if 'calendar_default_privacy' in vals:
            if any(self.env.user not in calendar.owner_ids for calendar in self):
                raise AccessError(
                    _("You are not allowed to change the default privacy of a calendar you do not own."))
        return super().write(vals)

    @api.depends_context('uid')
    @api.depends('calendar_user_ids')
    def _compute_calendar_user(self):
        """ Gets the calendar user record for the current user, if present."""
        for calendar in self:
            calendar.calendar_user_id = calendar.calendar_user_ids.filtered(lambda c: c.user_id == self.env.user)

    @api.model
    def _search_calendar_user_id(self, operator, value):
        return [('calendar_user_ids.user_id', operator, value)]

    @api.depends('calendar_user_ids.user_id', 'calendar_user_ids.access_role')
    def _compute_shared_with_users(self):
        for calendar in self:
            # Do not include the owner(s) in this list, as we do not want the user to be able to remove themselves.
            # Doing so could lead to accidental cascade deletion of the calendar
            calendar.shared_with_users = calendar.calendar_user_ids.filtered(lambda cu: cu.access_role != 'owner').user_id

    def _inverse_shared_with_users(self):
        for calendar in self:
            non_owner_calendar_users = calendar.calendar_user_ids.filtered(lambda cu: cu.access_role != 'owner')
            users_before = non_owner_calendar_users.user_id
            users_after = calendar.shared_with_users
            users_to_remove = users_before - users_after
            users_to_add = users_after - users_before

            if users_to_remove:
                non_owner_calendar_users.filtered(lambda cu: cu.user_id in users_to_remove).unlink()

            create_vals = []
            for user in users_to_add:
                create_vals += {
                    'access_role': 'writer',
                    'calendar_id': calendar.id,
                    'label': calendar.display_name,
                    'user_id': user.id,
                }
            self.env['calendar.calendar.user'].create(create_vals)

    @api.depends_context('uid')
    def _compute_display_name(self):
        for calendar in self:
            calendar.display_name = calendar.calendar_user_id.label

    def _inverse_display_name(self):
        for calendar in self.filtered('calendar_user_id'):
            calendar.calendar_user_id.label = calendar.display_name

    @api.depends('calendar_user_ids.access_role', 'calendar_user_ids.user_id')
    def _compute_owners(self):
        for calendar in self:
            calendar.owner_ids = calendar.calendar_user_ids.filtered(lambda l: l.access_role == 'owner').mapped('user_id')

    @api.depends_context('uid')
    @api.depends('user_access_role')
    def _compute_user_has_read_access(self):
        for calendar in self:
            calendar.user_has_read_access = calendar.user_access_role in ('owner', 'writer', 'reader', 'freeBusyReader')

    @api.depends_context('uid')
    @api.depends('user_access_role')
    def _compute_user_has_write_access(self):
        for calendar in self:
            calendar.user_has_write_access = calendar.user_access_role in ('owner', 'writer')

    def _search_user_has_read_access(self, operator, value):
        # The ORM will optimize the domain leaf
        # before calling the search method:
        # = True | != False -> in [True]
        # != True | = False -> not in [True]
        if operator not in ('in', 'not in'):
            return NotImplemented

        return [('id', operator, self.env.user.calendar_ids.ids)]

    def _search_user_has_write_access(self, operator, value):
        if operator not in ('in', 'not in'):
            return NotImplemented

        return [('id', operator, self.env.user.writable_calendar_ids.ids)]
