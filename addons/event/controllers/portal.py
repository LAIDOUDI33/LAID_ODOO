from datetime import datetime
from operator import itemgetter

from odoo import _
from odoo.addons.portal.controllers.portal import CustomerPortal, pager as portal_pager
from odoo.exceptions import AccessError, MissingError
from odoo.fields import Domain
from odoo.http import request, route
from odoo.tools import groupby as groupbyelem


class EventPortal(CustomerPortal):

    @route(['/my/events',
            '/my/events/page/<int:page>',
            ], type='http', auth='user', website=True)
    def portal_my_events(self, page=1, filterby=None, groupby='none', sortby=None, **kwargs):
        try:
            request.env['event.registration'].check_access('read')
        except (AccessError, MissingError):
            return request.redirect('/my')

        values = self._prepare_portal_layout_values()
        domain = self._prepare_event_registrations_domain()
        Registration = request.env['event.registration']

        # Filter
        searchbar_filters = {
            'all': {'label': _("All"), 'domain': []},
            'upcoming': {'label': _("Upcoming"), 'domain': [('event_begin_date', '>=', datetime.today())]},
            'past': {'label': _("Past"), 'domain': [('event_begin_date', '<', datetime.today())]},
        }
        if not filterby:
            filterby = 'upcoming'
        domain = Domain.AND([domain, searchbar_filters[filterby]['domain']])

        # Groupby
        searchbar_groupby = {
            'none': {'label': _('None'), 'input': 'none'},
            'event_id': {'label': _('Event'), 'input': 'event_id'},
            'name': {'label': _('Attendee'), 'input': 'name'},
            'state': {'label': _('Status'), 'input': 'state'},
        }

        # Sort
        searchbar_sortings = {
            'date': {'label': _('Date'), 'order': 'event_begin_date'},
            'name': {'label': _('Attendee'), 'order': 'name'},
            'state': {'label': _('Status'), 'order': 'state'},
        }
        if not sortby:
            sortby = 'date'
        sort_order = searchbar_sortings[sortby]['order']

        # Pager
        registration_count = Registration.search_count(domain)
        pager = portal_pager(
            url="/my/events",
            url_args={'filterby': filterby, 'groupby': groupby, 'sortby': sortby},
            total=registration_count,
            page=page,
            step=self._items_per_page
        )

        order = f'{groupby}, {sort_order}' if groupby != 'none' else sort_order
        registrations = Registration.search(domain, order=order, limit=self._items_per_page, offset=pager['offset'])

        if not registrations:
            grouped_registrations = []
        elif groupby != 'none':
            grouped_registrations = [Registration.concat(g) for k, g in groupbyelem(registrations, itemgetter(groupby))]
        else:
            grouped_registrations = [registrations]

        values.update({
            'default_url': '/my/events',
            'page_name': 'event',
            # display
            'pager': pager,
            'grouped_registrations': grouped_registrations,
            # search
            'filterby': filterby,
            'groupby': groupby,
            'sortby': sortby,
            'searchbar_filters': searchbar_filters,
            'searchbar_groupby': searchbar_groupby,
            'searchbar_sortings': searchbar_sortings,
        })
        return request.render("event.portal_my_events", values)

    def _prepare_event_registrations_domain(self):
        """ Registrations booked by the current user or matching their email are visible from portal. """
        partner = request.env.user.partner_id
        return ['|', ('email', '=', partner.email), ('partner_id', '=', partner.id)]

    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        Registration = request.env['event.registration']
        if 'event_registration_count' in counters:
            values['event_registration_count'] = (
                Registration.search_count(self._prepare_event_registrations_domain())
                if Registration.has_access('read')
                else 0
            )
        return values
