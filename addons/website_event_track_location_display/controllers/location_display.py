from werkzeug.exceptions import NotFound

from odoo import http, tools
from odoo.http import request


class EventTrackLocationDisplayController(http.Controller):

    def _get_location_display_values(self, location_id):
        location = request.env['event.track.location'].sudo().browse(location_id).exists()
        if not location:
            raise NotFound()
        website = request.website
        schedule = location._get_location_display_schedule(website=website)
        return {
            'location': location,
            'website': website,
            'format_track_time': lambda track: '%s – %s' % (
                tools.format_time(request.env, track.date, tz=track.event_id.date_tz, time_format='short'),
                tools.format_time(request.env, track.date_end, tz=track.event_id.date_tz, time_format='short'),
            ),
            **schedule,
        }

    @http.route('/event/location-display/<int:location_id>', type='http', auth='public', website=True, sitemap=False, readonly=True)
    def location_display(self, location_id):
        response = request.render(
            'website_event_track_location_display.event_track_location_display',
            self._get_location_display_values(location_id)
        )
        response.headers['Cache-Control'] = 'no-store'
        return response

    @http.route('/event/location-display/<int:location_id>/content', type='jsonrpc', auth='public', website=True, sitemap=False, readonly=True)
    def location_display_content(self, location_id):
        return request.env['ir.ui.view']._render_template(
            'website_event_track_location_display.event_track_location_display_content',
            self._get_location_display_values(location_id),
        )
