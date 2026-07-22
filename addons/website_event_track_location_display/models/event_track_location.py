from datetime import UTC
from zoneinfo import ZoneInfo

from odoo import fields, models


class EventTrackLocation(models.Model):
    _inherit = 'event.track.location'

    location_display_url = fields.Char("Location Display Link", compute='_compute_location_display_url')

    def _compute_location_display_url(self):
        for location in self:
            location.location_display_url = f'/event/location-display/{location.id}' if location.id else False

    def _get_location_display_schedule(self, website):
        """Return the location schedule that is currently relevant.

        Locations are shared between events. Prefer an event with a track today,
        then fall back to the next event using the location. A track's own event
        timezone is always used to decide what "today" means.
        """
        self.ensure_one()
        now = fields.Datetime.now()
        domain = [
            ('date', '!=', False),
            ('date_end', '!=', False),
            ('event_id.is_published', '=', True),
            ('event_id.website_id', 'in', (False, website.id)),
            ('event_id.website_track', '=', True),
            ('is_published', '=', True),
            ('location_id', '=', self.id),
        ]
        tracks = self.env['event.track'].sudo().search(domain, order='date, id')

        def is_today(track):
            event_tz = ZoneInfo(track.event_id.date_tz or 'UTC')
            local_today = now.replace(tzinfo=UTC).astimezone(event_tz).date()
            return track.date.replace(tzinfo=UTC).astimezone(event_tz).date() == local_today

        tracks_today = tracks.filtered(is_today)
        live_tracks = tracks_today.filtered(lambda track: track.date <= now < track.date_end)
        upcoming_tracks = tracks_today.filtered(lambda track: track.date > now)
        past_tracks = tracks_today.filtered(lambda track: track.date_end <= now)

        if live_tracks:
            event = live_tracks[0].event_id
        elif upcoming_tracks:
            event = upcoming_tracks[0].event_id
        elif past_tracks:
            event = past_tracks[-1].event_id
        else:
            future_tracks = tracks.filtered(lambda track: track.date > now)
            event = (future_tracks[:1] or tracks[-1:]).event_id

        event_tracks_today = tracks_today.filtered(lambda track: track.event_id == event)
        live_track = event_tracks_today.filtered(lambda track: track.date <= now < track.date_end)[:1]
        upcoming_tracks = event_tracks_today.filtered(lambda track: track.date > now)[:2]

        live_status = 'none'
        if live_track:
            live_status = 'live'
        elif upcoming_tracks:
            live_status = 'gap'
        elif event_tracks_today:
            live_status = 'finished'

        return {
            'event': event,
            'live_track': live_track,
            'live_status': live_status,
            'tracks_today': event_tracks_today,
            'upcoming_tracks': upcoming_tracks,
        }
