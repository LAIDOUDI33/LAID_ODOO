from datetime import datetime, timedelta
from freezegun import freeze_time

from odoo import fields
from odoo.addons.website_event.tests.common import TestEventOnlineCommon
from odoo.tests.common import HttpCase, tagged, users


class TestLocationDisplaySchedule(TestEventOnlineCommon):

    @users('user_eventmanager')
    def test_location_display_schedule(self):
        event = self.event_0.with_env(self.env)
        website = self.env['website'].get_current_website()
        event.write({
            'is_published': True,
            'website_track': True,
        })
        location = self.env['event.track.location'].create({'name': 'Main Stage'})
        tracks = self.env['event.track'].create([
            {
                'name': 'Finished',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 8),
                'duration': 1,
                'is_published': True,
            }, {
                'name': 'Live',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 10),
                'duration': 1,
                'is_published': True,
            }, {
                'name': 'Next',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 12),
                'duration': 0.5,
                'is_published': True,
            }, {
                'name': 'Later',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 13),
                'duration': 0.5,
                'is_published': True,
            }, {
                'name': 'Third upcoming track',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 14),
                'duration': 0.5,
                'is_published': True,
            }, {
                'name': 'Unpublished',
                'event_id': event.id,
                'location_id': location.id,
                'date': datetime(2025, 3, 5, 10, 30),
                'duration': 0.5,
                'is_published': False,
            },
        ])

        with freeze_time(datetime(2025, 3, 5, 10, 15)):
            schedule = location._get_location_display_schedule(website)
        self.assertEqual(schedule['live_track'], tracks[1])
        self.assertEqual(schedule['live_status'], 'live')
        self.assertEqual(schedule['upcoming_tracks'], tracks[2:4])
        self.assertNotIn(tracks[5], schedule['tracks_today'])

        with freeze_time(datetime(2025, 3, 5, 11, 30)):
            gap_schedule = location._get_location_display_schedule(website)
        self.assertFalse(gap_schedule['live_track'])
        self.assertEqual(gap_schedule['live_status'], 'gap')

        with freeze_time(datetime(2025, 3, 5, 15)):
            finished_schedule = location._get_location_display_schedule(website)
        self.assertFalse(finished_schedule['upcoming_tracks'])
        self.assertEqual(finished_schedule['live_status'], 'finished')

        empty_location = self.env['event.track.location'].create({'name': 'Empty Stage'})
        with freeze_time(datetime(2025, 3, 5, 10, 15)):
            empty_schedule = empty_location._get_location_display_schedule(website)
        self.assertEqual(empty_schedule['live_status'], 'none')

        self.assertEqual(location.location_display_url, f'/event/location-display/{location.id}')


@tagged('post_install', '-at_install')
class TestLocationDisplayHttp(TestEventOnlineCommon, HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.event_0.write({
            'is_published': True,
            'website_track': True,
        })

    def test_location_display_page(self):
        location = self.env['event.track.location'].create({'name': 'Main Stage'})
        live_track = self.env['event.track'].create({
            'name': 'Live HTTP Track',
            'event_id': self.event_0.id,
            'location_id': location.id,
            'date': fields.Datetime.now() - timedelta(minutes=5),
            'duration': 1,
            'is_published': True,
            'partner_name': 'Test Speaker',
            'partner_function': 'Engineer',
            'partner_company_name': 'Example Company',
        })
        display_url = location.location_display_url

        response = self.url_open(display_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Main Stage', response.text)
        self.assertIn(live_track.name, response.text)
        self.assertIn('Test Speaker', response.text)
        self.assertIn(f'{display_url}/content', response.text)

        content_response = self.url_open(f'{display_url}/content', json={'params': {}})
        self.assertEqual(content_response.status_code, 200)
        self.assertIn('o_wevent_location_display_content', content_response.json()['result'])
