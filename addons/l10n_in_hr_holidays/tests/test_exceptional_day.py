# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import date

from odoo import Command
from odoo.exceptions import ValidationError
from odoo.tests import tagged, TransactionCase


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestExceptionalDay(TransactionCase):
    """Tests for the "exceptional day" feature: a public holiday marked as
    is_exceptional_days becomes a working day (with a compensatory day off on
    working_start_date/working_end_date), and both sides must be reflected
    correctly in the generated work entries.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.indian_company = cls.env['res.company'].create({
            'name': 'Test Indian Company - Exceptional Day',
            'country_id': cls.env.ref('base.in').id,
            'tz': 'Asia/Kolkata',
        })
        cls.test_calendar = cls.env['resource.calendar'].create({
            'name': 'Test 9-13 14-18 Calendar',
            'company_id': cls.indian_company.id,
            'attendance_ids': [
                Command.create({
                    'dayofweek': str(day),
                    'hour_from': hour_from,
                    'hour_to': hour_to,
                })
                for day in range(5)
                for hour_from, hour_to in ((9, 13), (14, 18))
            ],
        })
        cls.indian_company.resource_calendar_id = cls.test_calendar
        cls.env = cls.env(context=dict(cls.env.context, allowed_company_ids=cls.indian_company.ids))

        cls.employee = cls.env['hr.employee'].create({
            'name': 'Kavya',
            'country_id': cls.env.ref('base.in').id,
            'company_id': cls.indian_company.id,
            'resource_calendar_id': cls.test_calendar.id,
            'contract_date_start': date(2020, 1, 1),
        })

        cls.attendance_work_entry_type = cls.env.ref('hr_work_entry.in_work_entry_type_attendance')

        cls.public_holiday_work_entry_type = cls.env['hr.work.entry.type'].create({
            'name': 'Test Public Holiday',
            'code': 'Test Public Holiday',
            'count_as': 'absence',
            'requires_allocation': False,
        })

        cls.sick_leave_work_entry_type = cls.env['hr.work.entry.type'].create({
            'name': 'Test Sick Time Off',
            'code': 'Test Sick Time Off',
            'count_as': 'absence',
            'requires_allocation': False,
            'request_unit': 'day',
            'unit_of_measure': 'day',
        })

    def _create_exceptional_day(self, holiday_date, working_start_date, working_end_date):
        return self.env['resource.calendar.leaves'].create({
            'name': 'Test Exceptional Public Holiday',
            'date_from': f'{holiday_date} 00:00:00',
            'date_to': f'{holiday_date} 23:59:59',
            'resource_id': False,
            'company_id': self.indian_company.id,
            'work_entry_type_id': self.public_holiday_work_entry_type.id,
            'is_exceptional_days': True,
            'working_start_date': working_start_date,
            'working_end_date': working_end_date,
        })

    def _work_entries_on(self, target_date):
        vals = self.employee.generate_work_entries(target_date, target_date)
        return [v for v in vals if v['date'] == target_date]

    def test_exceptional_weekday_without_leave_becomes_attendance(self):
        """A public holiday on a weekday (2025-08-15, Friday), marked as an
        exceptional day, is a working day: it should generate an Attendance
        entry instead of the Public Holiday one when no leave is taken on it.
        """
        self._create_exceptional_day('2025-08-15', date(2025, 8, 18), date(2025, 8, 18))

        entries = self._work_entries_on(date(2025, 8, 15))
        work_entry_types = {entry['work_entry_type_id'] for entry in entries}

        self.assertNotIn(self.public_holiday_work_entry_type, work_entry_types)
        self.assertIn(self.attendance_work_entry_type, work_entry_types)
        self.assertEqual(
            sum(entry['duration'] for entry in entries if entry['work_entry_type_id'] == self.attendance_work_entry_type),
            8.0,
        )

    def test_exceptional_weekday_with_leave_becomes_leave(self):
        """If the employee takes an approved leave on the exceptional day, the
        work entry should carry the leave's own type instead of Attendance or
        Public Holiday, so it is correctly reflected as a leave in the payslip.
        """
        self._create_exceptional_day('2025-08-15', date(2025, 8, 18), date(2025, 8, 18))

        leave = self.env['hr.leave'].create({
            'name': 'Sick Leave',
            'employee_id': self.employee.id,
            'work_entry_type_id': self.sick_leave_work_entry_type.id,
            'request_date_from': '2025-08-15',
            'request_date_to': '2025-08-15',
        })
        self.assertEqual(leave.state, 'validate')
        self.assertEqual(leave.number_of_days, 1.0, "Leave on the exceptional day should cost exactly one day")

        entries = self._work_entries_on(date(2025, 8, 15))
        work_entry_types = {entry['work_entry_type_id'] for entry in entries}

        self.assertNotIn(self.public_holiday_work_entry_type, work_entry_types)
        self.assertNotIn(self.attendance_work_entry_type, work_entry_types)
        self.assertIn(self.sick_leave_work_entry_type, work_entry_types)
        self.assertEqual(
            sum(entry['duration'] for entry in entries if entry['work_entry_type_id'] == self.sick_leave_work_entry_type),
            8.0,
        )

    def test_exceptional_weekend_with_leave_uses_hours_per_day_fallback(self):
        """A public holiday falling on a weekend (2025-08-16, Saturday) has no
        scheduled hours in the weekly template. Leave taken on it should still
        be counted, using a full hours_per_day block as a fallback so it isn't
        silently dropped from the payslip.
        """
        self._create_exceptional_day('2025-08-16', date(2025, 8, 25), date(2025, 8, 25))

        leave = self.env['hr.leave'].create({
            'name': 'Sick Leave on holiday weekend',
            'employee_id': self.employee.id,
            'work_entry_type_id': self.sick_leave_work_entry_type.id,
            'request_date_from': '2025-08-16',
            'request_date_to': '2025-08-16',
        })
        self.assertEqual(leave.state, 'validate')

        entries = self._work_entries_on(date(2025, 8, 16))
        leave_entries = [entry for entry in entries if entry['work_entry_type_id'] == self.sick_leave_work_entry_type]

        self.assertTrue(leave_entries, "Leave taken on the exceptional weekend day should generate a work entry")
        self.assertEqual(sum(entry['duration'] for entry in leave_entries), self.test_calendar.hours_per_day)

    def test_compensatory_day_is_not_counted_as_worked(self):
        """The compensatory day off (2025-08-18, Monday) should not generate an
        Attendance entry, otherwise the employee would be credited for both the
        exceptional working day and its compensatory day off.
        """
        self._create_exceptional_day('2025-08-15', date(2025, 8, 18), date(2025, 8, 18))

        entries = self._work_entries_on(date(2025, 8, 18))
        attendance_entries = [entry for entry in entries if entry['work_entry_type_id'] == self.attendance_work_entry_type]

        self.assertFalse(attendance_entries, "The compensatory day off should not be counted as worked")

    def test_exceptional_day_and_compensatory_day_do_not_double_count(self):
        """End-to-end regression: taking leave on the exceptional day and
        having a compensatory day off in the same month must not inflate the
        total number of worked/leave days for that month by one extra day.
        """
        self._create_exceptional_day('2025-08-15', date(2025, 8, 18), date(2025, 8, 18))
        leave = self.env['hr.leave'].create({
            'name': 'Sick Leave',
            'employee_id': self.employee.id,
            'work_entry_type_id': self.sick_leave_work_entry_type.id,
            'request_date_from': '2025-08-15',
            'request_date_to': '2025-08-15',
        })
        self.assertEqual(leave.state, 'validate')

        vals = self.employee.generate_work_entries(date(2025, 8, 1), date(2025, 8, 31))
        duration_by_date = {v['date']: (v['work_entry_type_id'], v['duration']) for v in vals}

        self.assertEqual(
            duration_by_date.get(date(2025, 8, 15)),
            (self.sick_leave_work_entry_type, 8.0),
            "15 August should be recorded as a leave day, not attendance or public holiday",
        )
        self.assertNotIn(
            date(2025, 8, 18), duration_by_date,
            "18 August (the compensatory day off) should not generate any work entry",
        )

    def test_compensatory_dates_required_when_exceptional(self):
        """Marking a record as an exceptional day without a compensatory
        off range should be rejected."""
        with self.assertRaises(ValidationError):
            self.env['resource.calendar.leaves'].create({
                'name': 'Missing compensatory dates',
                'date_from': '2025-09-05 00:00:00',
                'date_to': '2025-09-05 23:59:59',
                'resource_id': False,
                'company_id': self.indian_company.id,
                'work_entry_type_id': self.public_holiday_work_entry_type.id,
                'is_exceptional_days': True,
            })

    def test_compensatory_date_must_be_a_working_day(self):
        """The compensatory off date must be a day the calendar normally
        works; a weekend can't be used to compensate an exceptional day."""
        with self.assertRaises(ValidationError):
            self._create_exceptional_day('2025-09-05', date(2025, 9, 7), date(2025, 9, 7))
