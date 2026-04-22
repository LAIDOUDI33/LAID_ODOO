# Part of Odoo. See LICENSE file for full copyright and licensing details.
from . import controllers
from . import models
from . import wizard


def initialize_primary_calendars(env):
    # Create a primary calendar for each user
    users = env['res.users'].with_context(active_test=False).search(
        [('calendar_user_ids', 'not any', [('is_primary', '=', True)]),
         ('share', '=', False)]
    )
    users._generate_primary_calendar()
