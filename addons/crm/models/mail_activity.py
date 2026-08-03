# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class MailActivity(models.Model):
    _inherit = "mail.activity"

    def action_create_calendar_event(self):
        """ Small override of the action that creates a calendar.

        If the activity is linked to a crm.lead (through the "opportunity_id" field or via
        "res_model" if the event isn't created yet), we include in the action context the default
        values used when scheduling a meeting from the crm.lead form view.
        e.g: It will set the partner_id of the crm.lead as default attendee of the meeting. """

        action = super(MailActivity, self).action_create_calendar_event()
        opportunity = self.calendar_event_id.opportunity_id
        if not opportunity and self.res_model == 'crm.lead' and self.res_id:
            opportunity = self.env['crm.lead'].browse(self.res_id)
        if opportunity:
            opportunity_action_context = opportunity.action_schedule_meeting(smart_calendar=False).get('context', {})
            if self.calendar_event_id:
                opportunity_action_context['initial_date'] = self.calendar_event_id.start

            action['context'].update(opportunity_action_context)

        return action
