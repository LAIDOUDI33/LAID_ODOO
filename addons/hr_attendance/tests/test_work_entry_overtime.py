# Part of Odoo. See LICENSE file for full copyright and licensing details.
from datetime import date, datetime

from odoo.tests.common import TransactionCase, tagged


@tagged('work_entry_overtime')
class TestWorkentryOvertime(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        leave_wet = cls.env.ref('hr_work_entry.generic_work_entry_type_leave')
        cls.calendar = cls.env['resource.calendar'].create({
            'name': '40h/week Mon-Fri',
            'attendance_ids': [
                (0, 0, {'dayofweek': wd, 'hour_from': h, 'hour_to': h + 4})
                for wd in ['0', '1', '2', '3', '4']
                for h in [8, 13]
            ] + [
                (0, 0, {'dayofweek': wd, 'hour_from': h, 'hour_to': h + 4,
                        'work_entry_type_id': leave_wet.id})
                for wd in ['5', '6']
                for h in [8, 13]
            ],
        })
        cls.env.company.resource_calendar_id = cls.calendar

        cls.att_type = cls.env.company._get_default_attendance_work_entry_type()
        cls.env.company.attendance_work_entry_type_id = cls.att_type
        cls.overtime_type = cls.env.ref('hr_work_entry.generic_work_entry_type_overtime')

        cls.env['hr.time.rule'].search([]).write({'active': False})

        cls.employee = cls.env['hr.employee'].create({
            'name': 'Richard',
            'tz': 'UTC',
            'date_version': '2020-01-01',
            'contract_date_start': '2020-01-01',
            'wage': 3000,
            'resource_calendar_id': cls.calendar.id,
        })
        cls.version = cls.employee.version_id

    def test_calendar_with_leave_days(self):
        self.env['hr.time.rule'].create({
            'name': 'Weekend overtime',
            'working_hours_mode': 'schedule_day',
            'threshold_operator': 'exceed',
            'calendar_source': 'employee',
            'work_entry_type_id': self.overtime_type.id,
            'condition_work_entry_type_ids': [self.att_type.id],
        })

        self.env['hr.attendance'].create({
            'employee_id': self.employee.id,
            'check_in': datetime(2021, 1, 2, 8, 0),   # Saturday
            'check_out': datetime(2021, 1, 2, 11, 0),  # 3 hours
        })

        vals = self.version.generate_work_entries(date(2021, 1, 2), date(2021, 1, 2))
        overtime = [v for v in vals if v['work_entry_type_id'] == self.overtime_type]
        self.assertEqual(len(overtime), 1, 'Overtime should be generated')
        self.assertEqual(overtime[0]['duration'], 3, 'Should have 3 hours of overtime')
