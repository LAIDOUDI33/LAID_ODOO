# Part of Odoo. See LICENSE file for full copyright and licensing details.

import pytz

from calendar import monthrange
from collections import defaultdict
<<<<<<< 42becee9017170852d48fb659a633c236341d045
from datetime import datetime, timedelta, time
from dateutil.rrule import rrule, DAILY
from dateutil.relativedelta import relativedelta, MO, SU
from itertools import chain
||||||| 94b3cdd32bc53d7d30e9b26a69a9c70f5dc11b3e
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
=======
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta, MO, SU
>>>>>>> 91f754e6c64f972fa81af60de4fd8a9cf300a1b2
from operator import itemgetter
from pytz import timezone, utc
from random import randint

from odoo import models, fields, api, exceptions, _
from odoo.exceptions import AccessError
from odoo.fields import Domain
from odoo.http import request
from odoo.tools import convert, float_is_zero, format_duration, format_time, format_datetime
from odoo.tools.date_utils import sum_intervals
from odoo.tools.intervals import Intervals

def get_google_maps_url(latitude, longitude):
    return "https://maps.google.com?q=%s,%s" % (latitude, longitude)


class HrAttendance(models.Model):
    _name = 'hr.attendance'
    _description = "Attendance"
    _order = "check_in desc"
    _inherit = ["mail.thread"]

    def _default_employee(self):
        if self.env.user.has_group('hr_attendance.group_hr_attendance_user'):
            return self.env.user.employee_id

    employee_id = fields.Many2one('hr.employee', string="Employee", default=_default_employee, required=True,
        ondelete='cascade', index=True, group_expand='_read_group_employee_id')
    department_id = fields.Many2one('hr.department', string="Department", related="employee_id.department_id",
        readonly=True)
    manager_id = fields.Many2one(comodel_name='hr.employee', related="employee_id.parent_id", readonly=True,
        export_string_translation=False)
    attendance_manager_id = fields.Many2one('res.users', related="employee_id.attendance_manager_id",
        export_string_translation=False)
    is_manager = fields.Boolean(compute="_compute_is_manager")
    check_in = fields.Datetime(string="Check In", default=fields.Datetime.now, required=True, tracking=True, index=True)
    check_out = fields.Datetime(string="Check Out", tracking=True)
    date = fields.Date(string="Date", compute='_compute_date', store=True, index=True, precompute=True, required=True)
    worked_hours = fields.Float(string='Worked Hours', compute='_compute_worked_hours', store=True, readonly=True)
    color = fields.Integer(compute='_compute_color')
    overtime_hours = fields.Float(string="Worked Extra Hours", compute='_compute_overtime_hours', store=True)
    overtime_status = fields.Selection(selection=[('to_approve', "To Approve"),
                                                  ('approved', "Approved"),
                                                  ('refused', "Refused")], compute="_compute_overtime_status", store=True, tracking=True, readonly=False)
    validated_overtime_hours = fields.Float(string="Validated Extra Hours", compute='_compute_validated_overtime_hours', tracking=True, store=True, readonly=True)
    in_latitude = fields.Float(string="Latitude", digits=(10, 7), readonly=True, aggregator=None)
    in_longitude = fields.Float(string="Longitude", digits=(10, 7), readonly=True, aggregator=None)
    in_location = fields.Char(help="Based on GPS-Coordinates if available or on IP Address")
    in_ip_address = fields.Char(string="IP Address", readonly=True)
    in_browser = fields.Char(string="Browser", readonly=True)
    in_mode = fields.Selection(string="Mode",
                               selection=[('kiosk', "Kiosk"),
                                          ('systray', "Systray"),
                                          ('manual', "Manual"),
                                          ('technical', 'Technical')],
                               readonly=True,
                               default='manual')
    out_latitude = fields.Float(digits=(10, 7), readonly=True, aggregator=None)
    out_longitude = fields.Float(digits=(10, 7), readonly=True, aggregator=None)
    out_location = fields.Char(help="Based on GPS-Coordinates if available or on IP Address")
    out_ip_address = fields.Char(readonly=True)
    out_browser = fields.Char(readonly=True)
    out_mode = fields.Selection(selection=[('kiosk', "Kiosk"),
                                           ('systray', "Systray"),
                                           ('manual', "Manual"),
                                           ('technical', 'Technical'),
                                           ('auto_check_out', 'Automatic Check-Out')],
                                readonly=True,
                                default='manual')
    expected_hours = fields.Float(string="Regular Hours", compute="_compute_expected_hours", store=True, aggregator="sum")
    device_tracking_enabled = fields.Boolean(related="employee_id.company_id.attendance_device_tracking")
    linked_overtime_ids = fields.Many2many('hr.attendance.overtime.line', compute='_compute_linked_overtime_ids', readonly=False)

    @api.depends("check_in", "employee_id")
    def _compute_date(self):
        for attendance in self:
            if not attendance.employee_id or not attendance.check_in:  # weird precompute edge cases. Never after creation
                attendance.date = datetime.today()
                continue
            tz = timezone(attendance.employee_id._get_tz())
            attendance.date = utc.localize(attendance.check_in).astimezone(tz).date()

    @api.depends("worked_hours", "overtime_hours")
    def _compute_expected_hours(self):
        for attendance in self:
            attendance.expected_hours = attendance.worked_hours - attendance.overtime_hours

    def _compute_color(self):
        for attendance in self:
            if attendance.check_out:
                attendance.color = 1 if attendance.worked_hours > 16 or attendance.out_mode == 'technical' else 0
            else:
                attendance.color = 1 if attendance.check_in < (datetime.today() - timedelta(days=1)) else 10

    @api.depends('check_in', 'check_out', 'employee_id')
    def _compute_overtime_status(self):
        for attendance in self:
            if not attendance.linked_overtime_ids:
                attendance.overtime_status = False
            elif all(attendance.linked_overtime_ids.mapped(lambda ot: ot.status == 'approved')):
                attendance.overtime_status = 'approved'
            elif all(attendance.linked_overtime_ids.mapped(lambda ot: ot.status == 'refused')):
                attendance.overtime_status = 'refused'
            else:
                attendance.overtime_status = 'to_approve'

    @api.depends('check_in', 'check_out', 'employee_id')
    def _compute_overtime_hours(self):
        for attendance in self:
            attendance.overtime_hours = sum(attendance.linked_overtime_ids.mapped('duration'))

    @api.depends('check_in', 'check_out', 'employee_id')
    def _compute_validated_overtime_hours(self):
        for attendance in self:
            attendance.validated_overtime_hours = sum(attendance.linked_overtime_ids.filtered_domain([('status', '=', 'approved')]).mapped('manual_duration'))

    @api.depends('check_in', 'check_out', 'employee_id')
    def _compute_linked_overtime_ids(self):
        overtimes_by_attendance = self._linked_overtimes().grouped(lambda ot: (ot.employee_id, ot.time_start))
        for attendance in self:
            attendance.linked_overtime_ids = overtimes_by_attendance.get((attendance.employee_id, attendance.check_in), False)

    @api.depends('employee_id', 'check_in', 'check_out')
    def _compute_display_name(self):
        tz = request.httprequest.cookies.get('tz') if request else None
        for attendance in self:
            if not attendance.check_out:
                attendance.display_name = _(
                    "From %s",
                    format_time(self.env, attendance.check_in, time_format=None, tz=tz, lang_code=self.env.lang),
                )
            else:
                attendance.display_name = _(
                    "%(worked_hours)s (%(check_in)s-%(check_out)s)",
                    worked_hours=format_duration(attendance.worked_hours),
                    check_in=format_time(self.env, attendance.check_in, time_format=None, tz=tz, lang_code=self.env.lang),
                    check_out=format_time(self.env, attendance.check_out, time_format=None, tz=tz, lang_code=self.env.lang),
                )

    @api.depends('employee_id')
    def _compute_is_manager(self):
        have_manager_right = self.env.user.has_group('hr_attendance.group_hr_attendance_user')
        have_officer_right = self.env.user.has_group('hr_attendance.group_hr_attendance_officer')
        for attendance in self:
            attendance.is_manager = have_manager_right or \
                (have_officer_right and attendance.attendance_manager_id.id == self.env.user.id)

    def _get_employee_calendar(self):
        self.ensure_one()
        return self.employee_id.resource_calendar_id or self.employee_id.company_id.resource_calendar_id

    @api.depends('check_in', 'check_out')
    def _compute_worked_hours(self):
        """ Computes the worked hours of the attendance record.
            The worked hours of resource with flexible calendar is computed as the difference
            between check_in and check_out, without taking into account the lunch_interval"""
        for attendance in self:
            if attendance.check_out and attendance.check_in and attendance.employee_id:
                attendance.worked_hours = attendance._get_worked_hours_in_range(attendance.check_in, attendance.check_out)
            else:
                attendance.worked_hours = False

    def _get_worked_hours_in_range(self, start_dt, end_dt):
        """Returns the amount of hours worked because of this attendance during the
        interval defined by [start_dt, end_dt]

        :param start_dt: datetime starting the interval.
        :param end_dt: datetime ending the interval.
        :returns: float, hours worked
        """
        self.ensure_one()
        calendar = self._get_employee_calendar()
        resource = self.employee_id.resource_id
        tz = timezone(resource.tz) if not calendar else timezone(calendar.tz)
        start_dt_tz = utc.localize(max(self.check_in, start_dt)).astimezone(tz)
        end_dt_tz = utc.localize(min(self.check_out, end_dt)).astimezone(tz)

        if end_dt_tz < start_dt_tz:
            return 0.0

        lunch_intervals = []
        if not resource._is_flexible():
            lunch_intervals = self.employee_id._employee_attendance_intervals(start_dt_tz, end_dt_tz, lunch=True)
        attendance_intervals = Intervals([(start_dt_tz, end_dt_tz, self)]) - lunch_intervals
        return sum_intervals(attendance_intervals)

    @api.constrains('check_in', 'check_out')
    def _check_validity_check_in_check_out(self):
        """ verifies if check_in is earlier than check_out. """
        for attendance in self:
            if attendance.check_in and attendance.check_out:
                if attendance.check_out < attendance.check_in:
                    raise exceptions.ValidationError(_('"Check Out" time cannot be earlier than "Check In" time.'))

    @api.constrains('check_in', 'check_out', 'employee_id')
    def _check_validity(self):
        """ Verifies the validity of the attendance record compared to the others from the same employee.
            For the same employee we must have :
                * maximum 1 "open" attendance record (without check_out)
                * no overlapping time slices with previous employee records
        """
        for attendance in self:
            # we take the latest attendance before our check_in time and check it doesn't overlap with ours
            last_attendance_before_check_in = self.env['hr.attendance'].search([
                ('employee_id', '=', attendance.employee_id.id),
                ('check_in', '<=', attendance.check_in),
                ('id', '!=', attendance.id),
            ], order='check_in desc', limit=1)
            if last_attendance_before_check_in and last_attendance_before_check_in.check_out and last_attendance_before_check_in.check_out > attendance.check_in:
                raise exceptions.ValidationError(_("Cannot create new attendance record for %(empl_name)s, the employee was already checked in on %(datetime)s",
                                                   empl_name=attendance.employee_id.name,
                                                   datetime=format_datetime(self.env, attendance.check_in, dt_format=False)))

            if not attendance.check_out:
                # if our attendance is "open" (no check_out), we verify there is no other "open" attendance
                no_check_out_attendances = self.env['hr.attendance'].search([
                    ('employee_id', '=', attendance.employee_id.id),
                    ('check_out', '=', False),
                    ('id', '!=', attendance.id),
                ], order='check_in desc', limit=1)
                if no_check_out_attendances:
                    raise exceptions.ValidationError(_("Cannot create new attendance record for %(empl_name)s, the employee hasn't checked out since %(datetime)s",
                                                       empl_name=attendance.employee_id.name,
                                                       datetime=format_datetime(self.env, no_check_out_attendances.check_in, dt_format=False)))
            else:
                # we verify that the latest attendance with check_in time before our check_out time
                # is the same as the one before our check_in time computed before, otherwise it overlaps
                last_attendance_before_check_out = self.env['hr.attendance'].search([
                    ('employee_id', '=', attendance.employee_id.id),
                    ('check_in', '<', attendance.check_out),
                    ('id', '!=', attendance.id),
                ], order='check_in desc', limit=1)
                if last_attendance_before_check_out and last_attendance_before_check_in != last_attendance_before_check_out:
                    raise exceptions.ValidationError(_("Cannot create new attendance record for %(empl_name)s, the employee was already checked in on %(datetime)s",
                                                       empl_name=attendance.employee_id.name,
                                                       datetime=format_datetime(self.env, last_attendance_before_check_out.check_in, dt_format=False)))

    @api.model
    def _get_day_start_and_day(self, employee, dt):  # TODO probably no longer need by the end
        # Returns a tuple containing the datetime in naive UTC of the employee's start of the day
        # and the date it was for that employee
        if not dt.tzinfo:
            calendar_tz = employee._get_calendar_tz_batch(dt)[employee.id]
            date_employee_tz = pytz.utc.localize(dt).astimezone(pytz.timezone(calendar_tz))
        else:
            date_employee_tz = dt
        start_day_employee_tz = date_employee_tz.replace(hour=0, minute=0, second=0)
        return (start_day_employee_tz.astimezone(pytz.utc).replace(tzinfo=None), start_day_employee_tz.date())

    def _get_week_date_range(self):
        assert self
        dates = self.mapped('date')
        date_start, date_end = min(dates), max(dates)
        date_start = date_start - relativedelta(days=date_start.weekday())
        date_end = date_end + relativedelta(days=6 - date_end.weekday())
        return date_start, date_end

    def _get_overtimes_to_update_domain(self):
        if not self:
            return Domain.FALSE
        domain_list = []
        for employee, attendances in self.filtered(lambda att: att.check_out).grouped('employee_id').items():
            tz = timezone(employee.tz)
            local_check_in = utc.localize(min(attendances.mapped('check_in'))).astimezone(tz)
            local_check_out = utc.localize(max(attendances.mapped('check_out'))).astimezone(tz)
            rulesets = attendances.mapped(lambda att: att.employee_id.sudo()._get_version(att.date)).ruleset_id
            # append this domain only for weekly rules
            if any(rule.quantity_period == 'week' for rule in rulesets.sudo().rule_ids):
                date_from = local_check_in.date() + relativedelta(weekday=MO(-1))
                date_to = local_check_out.date() + relativedelta(weekday=SU)
            else:
                date_from = local_check_in.date()
                date_to = local_check_out.date()

<<<<<<< 42becee9017170852d48fb659a633c236341d045
            domain_list.append(Domain.AND([
                Domain('employee_id', '=', employee.id),
                Domain('check_in', '<=', datetime.combine(date_to, datetime.max.time()).replace(tzinfo=tz).astimezone(utc).replace(tzinfo=None)),
                Domain('check_out', '>=', datetime.combine(date_from, datetime.min.time()).replace(tzinfo=tz).astimezone(utc).replace(tzinfo=None)),
            ]))
        if not domain_list:
            return Domain.FALSE
        return Domain.OR(domain_list) if len(domain_list) > 1 else domain_list[0]
||||||| 94b3cdd32bc53d7d30e9b26a69a9c70f5dc11b3e
    def _update_overtime(self, employee_attendance_dates=None):
        if employee_attendance_dates is None:
            employee_attendance_dates = self._get_attendances_dates()
=======
    def _update_overtime(self, employee_attendance_dates=None):
        if employee_attendance_dates is None:
            employee_attendance_dates = self._get_attendances_dates()
        employee_attendance_dates = {
            employee: attendance_dates
            for employee, attendance_dates in employee_attendance_dates.items()
            if not employee.sudo().is_fully_flexible
        }
        expanded_attendance_dates = dict(employee_attendance_dates)
        # Collect week boundaries per flexible employee, then fetch all attendances in a single query
        flexible_emp_data = {}
        for emp in list(employee_attendance_dates.keys()):
            calendar = emp.resource_calendar_id or emp.company_id.resource_calendar_id
            if calendar and calendar.flexible_hours and calendar.full_time_required_hours:
                employee_tz = pytz.timezone(emp._get_tz())
                week_starts = set()
                for attendance_tuple in employee_attendance_dates[emp]:
                    attendance_date = attendance_tuple[1]
                    week_starts.add(attendance_date + relativedelta(weekday=MO(-1)))

                if week_starts:
                    min_week_start = min(week_starts)
                    max_week_start = max(week_starts)
                    min_week_start_utc = employee_tz.localize(datetime.combine(min_week_start, datetime.min.time())).astimezone(pytz.utc).replace(tzinfo=None)
                    max_week_end_utc = employee_tz.localize(datetime.combine(max_week_start + relativedelta(weekday=SU(1)), datetime.max.time())).astimezone(pytz.utc).replace(tzinfo=None)
                    flexible_emp_data[emp] = {
                        'week_starts': week_starts,
                        'min_utc': min_week_start_utc,
                        'max_utc': max_week_end_utc,
                    }

        if flexible_emp_data:
            att_groups = self.env['hr.attendance']._read_group(
                domain=[
                    ('employee_id', 'in', [emp.id for emp in flexible_emp_data]),
                    ('check_in', '>=', min(d['min_utc'] for d in flexible_emp_data.values())),
                    ('check_in', '<=', max(d['max_utc'] for d in flexible_emp_data.values())),
                ],
                groupby=['employee_id'],
                aggregates=['id:recordset'],
            )
            att_by_emp = dict(att_groups)
            for emp, emp_data in flexible_emp_data.items():
                week_dates_to_add = set()
                for att in att_by_emp.get(emp, self.browse()):
                    day_start_tuple = att._get_day_start_and_day(emp, att.check_in)
                    week_start = day_start_tuple[1] + relativedelta(weekday=MO(-1))
                    if week_start in emp_data['week_starts']:
                        week_dates_to_add.add(day_start_tuple)
                expanded_attendance_dates[emp] = expanded_attendance_dates.get(emp, set()) | week_dates_to_add

        employee_attendance_dates = expanded_attendance_dates
>>>>>>> 91f754e6c64f972fa81af60de4fd8a9cf300a1b2

    def _get_overtime_domain_from_attendance_domain(self, attendance_domain):
        overtime_domain = []
        for leaf in attendance_domain:
            if isinstance(leaf, (list, tuple)) and len(leaf) == 3:
                field, operator, value = leaf
                if field == 'check_in':
                    field = 'time_start'
                elif field == 'check_out':
                    field = 'time_stop'
                overtime_domain.append((field, operator, value))
            else:
                overtime_domain.append(leaf)
        return overtime_domain

    def _update_overtime(self, attendance_domain=None):
        if not attendance_domain:
            attendance_domain = self._get_overtimes_to_update_domain()

        overtime_domain = self._get_overtime_domain_from_attendance_domain(attendance_domain)
        all_overtime_lines = self.env['hr.attendance.overtime.line'].search(overtime_domain)
        manual_overtimes = set(all_overtime_lines.filtered(
            lambda l: l.manual_duration != l.duration or l.status == 'to_approve'
        ).mapped(lambda l: (l.employee_id.id, l.date)))
        all_overtime_lines.unlink()
        all_attendances = (self | self.env['hr.attendance'].search(attendance_domain)).filtered_domain([('check_out', '!=', False)])
        if not all_attendances:
            return

        start_check_in = min(all_attendances.mapped('check_in')).date() - relativedelta(days=1)  # for timezone
        min_check_in = utc.localize(datetime.combine(start_check_in, datetime.min.time()))

        start_check_out = max(all_attendances.mapped('check_out')).date() + relativedelta(days=1)
        max_check_out = utc.localize(datetime.combine(start_check_out, datetime.max.time()))  # for timezone

        version_periods_by_employee = all_attendances.employee_id.sudo()._get_version_periods(min_check_in, max_check_out)
        attendances_by_employee = all_attendances.grouped('employee_id')
        attendances_by_ruleset = defaultdict(lambda: self.env['hr.attendance'])
        for employee, emp_attendance in attendances_by_employee.items():
            for attendance in emp_attendance:
                version_sudo = employee.sudo()._get_version(attendance._get_localized_times()[0])
                ruleset_sudo = version_sudo.ruleset_id
                if ruleset_sudo:
                    attendances_by_ruleset[ruleset_sudo] += attendance
        employees = all_attendances.employee_id
        schedules_intervals_by_employee = employees._get_schedules_by_employee_by_work_type(min_check_in, max_check_out, version_periods_by_employee)
        overtime_vals_list = []
<<<<<<< 42becee9017170852d48fb659a633c236341d045
        for ruleset_sudo, ruleset_attendances in attendances_by_ruleset.items():
            attendances_dates = list(chain(*ruleset_attendances._get_dates().values()))
            overtime_vals_list.extend([
                {
                    **val,
                    'status': 'to_approve'
                } if (val['employee_id'], val['date']) in manual_overtimes else val
                for val in ruleset_sudo.rule_ids._generate_overtime_vals_v2(min(attendances_dates), max(attendances_dates), ruleset_attendances, schedules_intervals_by_employee)
||||||| 94b3cdd32bc53d7d30e9b26a69a9c70f5dc11b3e
        affected_employees = self.env['hr.employee']
        for emp, attendance_dates in employee_attendance_dates.items():
            # get_attendances_dates returns the date translated from the local timezone without tzinfo,
            # and contains all the date which we need to check for overtime
            attendance_domain = []
            for attendance_date in attendance_dates:
                attendance_domain = OR([attendance_domain, [
                    ('check_in', '>=', attendance_date[0]), ('check_in', '<', attendance_date[0] + timedelta(hours=24)),
                ]])
            attendance_domain = AND([[('employee_id', '=', emp.id)], attendance_domain])

            # Attendances per LOCAL day
            attendances_per_day = defaultdict(lambda: self.env['hr.attendance'])
            all_attendances = self.env['hr.attendance'].search(attendance_domain)
            for attendance in all_attendances:
                check_in_day_start = attendance._get_day_start_and_day(attendance.employee_id, attendance.check_in)
                attendances_per_day[check_in_day_start[1]] += attendance

            # As _attendance_intervals_batch and _leave_intervals_batch both take localized dates we need to localize those date
            start = pytz.utc.localize(min(attendance_dates, key=itemgetter(0))[0])
            stop = pytz.utc.localize(max(attendance_dates, key=itemgetter(0))[0] + timedelta(hours=24))

            # Retrieve expected attendance intervals
            expected_attendances = emp._employee_attendance_intervals(start, stop)

            # working_times = {date: [(start, stop)]}
            working_times = defaultdict(lambda: [])
            for expected_attendance in expected_attendances:
                # Exclude resource.calendar.attendance
                working_times[expected_attendance[0].date()].append(expected_attendance[:2])

            overtimes = self.env['hr.attendance.overtime'].sudo().search([
                ('employee_id', '=', emp.id),
                ('date', 'in', [day_data[1] for day_data in attendance_dates]),
                ('adjustment', '=', False),
=======
        affected_employees = self.env['hr.employee']
        for emp, attendance_dates in employee_attendance_dates.items():
            # get_attendances_dates returns the date translated from the local timezone without tzinfo,
            # and contains all the date which we need to check for overtime
            attendance_domain = []
            for attendance_date in attendance_dates:
                attendance_domain = OR([attendance_domain, [
                    ('check_in', '>=', attendance_date[0]), ('check_in', '<', attendance_date[0] + timedelta(hours=24)),
                ]])
            attendance_domain = AND([[('employee_id', '=', emp.id)], attendance_domain])

            # Attendances per LOCAL day
            attendances_per_day = defaultdict(lambda: self.env['hr.attendance'])
            all_attendances = self.env['hr.attendance'].search(attendance_domain)
            for attendance in all_attendances:
                check_in_day_start = attendance._get_day_start_and_day(attendance.employee_id, attendance.check_in)
                attendances_per_day[check_in_day_start[1]] += attendance

            # As _attendance_intervals_batch and _leave_intervals_batch both take localized dates we need to localize those date
            start = pytz.utc.localize(min(attendance_dates, key=itemgetter(0))[0])
            stop = pytz.utc.localize(max(attendance_dates, key=itemgetter(0))[0] + timedelta(hours=24))

            # Retrieve expected attendance intervals
            calendar = emp.resource_calendar_id or emp.company_id.resource_calendar_id
            expected_attendances = emp._employee_attendance_intervals(start, stop)

            # working_times = {date: [(start, stop)]}
            working_times = defaultdict(lambda: [])
            for expected_attendance in expected_attendances:
                # Exclude resource.calendar.attendance
                working_times[expected_attendance[0].date()].append(expected_attendance[:2])

            overtimes = self.env['hr.attendance.overtime'].sudo().search([
                ('employee_id', '=', emp.id),
                ('date', 'in', [day_data[1] for day_data in attendance_dates]),
                ('adjustment', '=', False),
>>>>>>> 91f754e6c64f972fa81af60de4fd8a9cf300a1b2
            ])
<<<<<<< 42becee9017170852d48fb659a633c236341d045
        self.env['hr.attendance.overtime.line'].create(overtime_vals_list)
        self.env.add_to_compute(self._fields['overtime_hours'], all_attendances)
        self.env.add_to_compute(self._fields['expected_hours'], all_attendances)
        self.env.add_to_compute(self._fields['validated_overtime_hours'], all_attendances)
        self.env.add_to_compute(self._fields['overtime_status'], all_attendances)
||||||| 94b3cdd32bc53d7d30e9b26a69a9c70f5dc11b3e

            company_threshold = emp.company_id.overtime_company_threshold / 60.0
            employee_threshold = emp.company_id.overtime_employee_threshold / 60.0

            for day_data in attendance_dates:
                attendance_date = day_data[1]
                attendances = attendances_per_day.get(attendance_date, self.browse())
                unfinished_shifts = attendances.filtered(lambda a: not a.check_out)
                overtime_duration = 0
                overtime_duration_real = 0
                # Overtime is not counted if any shift is not closed or if there are no attendances for that day,
                # this could happen when deleting attendances.

                # No overtime computed for fully flexible employees
                if emp.sudo().is_fully_flexible:
                    continue

                if not unfinished_shifts and attendances:
                    # The employee usually doesn't work on that day
                    if not working_times[attendance_date]:
                        # User does not have any resource_calendar_attendance for that day (week-end for example)
                        overtime_duration = sum(attendances.mapped('worked_hours'))
                        overtime_duration_real = overtime_duration
                    # The employee usually work on that day
                    else:
                        # Count time before, during and after 'working hours'
                        pre_work_time, work_duration, post_work_time, planned_work_duration = attendances._get_pre_post_work_time(emp, working_times, attendance_date)
                        # Overtime within the planned work hours + overtime before/after work hours is > company threshold
                        total_overtime_duration = pre_work_time + work_duration + post_work_time - planned_work_duration
                        if total_overtime_duration > company_threshold and total_overtime_duration > 0:
                            company_overtime_duration = total_overtime_duration
                        else:
                            company_overtime_duration = 0

                        if total_overtime_duration < 0 and abs(total_overtime_duration) > employee_threshold:
                            employee_overtime_duration = total_overtime_duration
                        else:
                            employee_overtime_duration = 0
                        overtime_duration = employee_overtime_duration + company_overtime_duration
                        # Global overtime including the thresholds
                        overtime_duration_real = sum(attendances.mapped('worked_hours')) - planned_work_duration

                overtime = overtimes.filtered(lambda o: o.date == attendance_date)
                if not float_is_zero(overtime_duration, 2) or unfinished_shifts:
                    # Do not create if any attendance doesn't have a check_out, update if exists
                    if unfinished_shifts:
                        overtime_duration = 0
                    if not overtime and overtime_duration:
                        overtime_vals_list.append({
                            'employee_id': emp.id,
                            'date': attendance_date,
                            'duration': overtime_duration,
                            'duration_real': overtime_duration_real,
                        })
                    elif overtime:
                        overtime.sudo().write({
                            'duration': overtime_duration,
                            'duration_real': overtime_duration
                        })
                        affected_employees |= overtime.employee_id
                elif overtime:
                    overtime_to_unlink |= overtime
        created_overtimes = self.env['hr.attendance.overtime'].sudo().create(overtime_vals_list)
        employees_worked_hours_to_compute = (affected_employees.ids +
                                             created_overtimes.employee_id.ids +
                                             overtime_to_unlink.employee_id.ids)
        overtime_to_unlink.sudo().unlink()
        to_recompute = self.search([('employee_id', 'in', employees_worked_hours_to_compute)])
        # for automatically validated attendances, avoid recomputing extra hours if user has changed its value
        validated_modified = to_recompute.filtered(lambda att: att.employee_id.company_id.attendance_overtime_validation == 'no_validation'
                                                        and float_compare(att.overtime_hours, att.validated_overtime_hours, precision_digits=2))
        self.env.add_to_compute(self._fields['overtime_hours'],
                                to_recompute)
        self.env.add_to_compute(self._fields['validated_overtime_hours'],
                                to_recompute - validated_modified)
        self.env.add_to_compute(self._fields['expected_hours'],
                                to_recompute)

    def _get_pre_post_work_time(self, employee, working_times, attendance_date):
        pre_work_time, work_duration, post_work_time = 0, 0, 0
        company_threshold = employee.company_id.overtime_company_threshold / 60.0
        employee_threshold = employee.company_id.overtime_employee_threshold / 60.0
        # Compute start and end time for that day
        planned_start_dt, planned_end_dt = False, False
        planned_work_duration = 0
        for calendar_attendance in working_times[attendance_date]:
            planned_start_dt = min(planned_start_dt, calendar_attendance[0]) if planned_start_dt else calendar_attendance[0]
            planned_end_dt = max(planned_end_dt, calendar_attendance[1]) if planned_end_dt else calendar_attendance[1]
            planned_work_duration += (calendar_attendance[1] - calendar_attendance[0]).total_seconds() / 3600.0
        for attendance in self:
            # consider check_in as planned_start_dt if within threshold
            # if delta_in < 0: Checked in after supposed start of the day
            # if delta_in > 0: Checked in before supposed start of the day
            local_check_in = pytz.utc.localize(attendance.check_in)
            delta_in = (planned_start_dt - local_check_in).total_seconds() / 3600.0

            # Started before or after planned date within the threshold interval
            if (delta_in > 0 and delta_in <= company_threshold) or\
                (delta_in < 0 and abs(delta_in) <= employee_threshold):
                local_check_in = planned_start_dt
            local_check_out = pytz.utc.localize(attendance.check_out)

            # same for check_out as planned_end_dt
            delta_out = (local_check_out - planned_end_dt).total_seconds() / 3600.0
            # if delta_out < 0: Checked out before supposed start of the day
            # if delta_out > 0: Checked out after supposed start of the day

            # Finised before or after planned date within the threshold interval
            if (delta_out > 0 and delta_out <= company_threshold) or\
                (delta_out < 0 and abs(delta_out) <= employee_threshold):
                local_check_out = planned_end_dt

            # There is an overtime at the start of the day
            if local_check_in < planned_start_dt:
                pre_work_time += (min(planned_start_dt, local_check_out) - local_check_in).total_seconds() / 3600.0
            # Interval inside the working hours -> Considered as working time
            if local_check_in <= planned_end_dt and local_check_out >= planned_start_dt:
                start_dt = max(planned_start_dt, local_check_in)
                stop_dt = min(planned_end_dt, local_check_out)
                work_duration += (stop_dt - start_dt).total_seconds() / 3600.0
                # remove lunch time from work duration
                if not employee.sudo().is_flexible:
                    lunch_intervals = employee._employee_attendance_intervals(start_dt, stop_dt, lunch=True)
                    work_duration -= sum((i[1] - i[0]).total_seconds() / 3600.0 for i in lunch_intervals)

            # There is an overtime at the end of the day
            if local_check_out > planned_end_dt:
                post_work_time += (local_check_out - max(planned_end_dt, local_check_in)).total_seconds() / 3600.0
        return pre_work_time, work_duration, post_work_time, planned_work_duration
=======

            company_threshold = emp.company_id.overtime_company_threshold / 60.0
            employee_threshold = emp.company_id.overtime_employee_threshold / 60.0

            is_flexible = bool(calendar and calendar.flexible_hours)
            has_weekly_cap = bool(calendar and calendar.full_time_required_hours)
            is_weekly_flexible = is_flexible and has_weekly_cap
            weekly_limit = calendar.full_time_required_hours if is_weekly_flexible else 0.0

            weekly_expected_hours = defaultdict(float)

            for day_data in sorted(attendance_dates, key=lambda x: x[1]):
                attendance_date = day_data[1]
                attendances = attendances_per_day.get(attendance_date, self.browse())
                unfinished_shifts = attendances.filtered(lambda a: not a.check_out)
                overtime_duration = 0
                overtime_duration_real = 0
                # Overtime is not counted if any shift is not closed or if there are no attendances for that day,
                # this could happen when deleting attendances.

                if not unfinished_shifts and attendances:
                    if is_weekly_flexible:
                        # For flexible schedules with weekly limits, calculate overtime based on weekly cap
                        week_key = attendance_date + relativedelta(weekday=MO(-1))
                        expected_hours_so_far_this_week = weekly_expected_hours[week_key]
                        hours_today = sum(attendances.mapped('worked_hours'))

                        # Calculate expected hours for today based on:
                        # 1. hours_per_day from calendar
                        # 2. remaining weekly hours allowed - weekly cap based on expected hours
                        # Expected is the minimum of these two (what they should work, capped by weekly limit)
                        hours_per_day = calendar.hours_per_day or 0.0
                        hours_remaining_this_week = max(0.0, weekly_limit - expected_hours_so_far_this_week)
                        expected_hours_today = min(hours_per_day, hours_remaining_this_week)
                        weekly_expected_hours[week_key] = expected_hours_so_far_this_week + expected_hours_today
                        overtime_duration = hours_today - expected_hours_today
                        overtime_duration_real = overtime_duration
                    # For flexible schedules without weekly limits, calculate based on hours_per_day
                    elif is_flexible:
                        hours_today = sum(attendances.mapped('worked_hours'))
                        hours_per_day = calendar.hours_per_day or 8.0
                        overtime_duration = hours_today - hours_per_day
                        overtime_duration_real = overtime_duration
                    # For non-flexible schedules: check if it's a weekend/non-working day
                    elif not working_times[attendance_date]:
                        # User does not have any resource_calendar_attendance for that day (week-end for example)
                        overtime_duration = sum(attendances.mapped('worked_hours'))
                        overtime_duration_real = overtime_duration
                    else:
                        # Count time before, during and after 'working hours'
                        pre_work_time, work_duration, post_work_time, planned_work_duration = attendances._get_pre_post_work_time(emp, working_times, attendance_date)
                        # Overtime within the planned work hours + overtime before/after work hours is > company threshold
                        total_overtime_duration = pre_work_time + work_duration + post_work_time - planned_work_duration
                        if total_overtime_duration > company_threshold and total_overtime_duration > 0:
                            company_overtime_duration = total_overtime_duration
                        else:
                            company_overtime_duration = 0

                        if total_overtime_duration < 0 and abs(total_overtime_duration) > employee_threshold:
                            employee_overtime_duration = total_overtime_duration
                        else:
                            employee_overtime_duration = 0
                        overtime_duration = employee_overtime_duration + company_overtime_duration
                        # Global overtime including the thresholds
                        overtime_duration_real = sum(attendances.mapped('worked_hours')) - planned_work_duration

                overtime = overtimes.filtered(lambda o: o.date == attendance_date)
                if not float_is_zero(overtime_duration, 2) or unfinished_shifts:
                    # Do not create if any attendance doesn't have a check_out, update if exists
                    if unfinished_shifts:
                        overtime_duration = 0
                    if not overtime and overtime_duration:
                        overtime_vals_list.append({
                            'employee_id': emp.id,
                            'date': attendance_date,
                            'duration': overtime_duration,
                            'duration_real': overtime_duration_real,
                        })
                    elif overtime:
                        overtime.sudo().write({
                            'duration': overtime_duration,
                            'duration_real': overtime_duration
                        })
                        affected_employees |= overtime.employee_id
                elif overtime:
                    overtime_to_unlink |= overtime
        created_overtimes = self.env['hr.attendance.overtime'].sudo().create(overtime_vals_list)
        employees_worked_hours_to_compute = (affected_employees.ids +
                                             created_overtimes.employee_id.ids +
                                             overtime_to_unlink.employee_id.ids)
        overtime_to_unlink.sudo().unlink()
        to_recompute = self.search([('employee_id', 'in', employees_worked_hours_to_compute)])
        # for automatically validated attendances, avoid recomputing extra hours if user has changed its value
        validated_modified = to_recompute.filtered(lambda att: att.employee_id.company_id.attendance_overtime_validation == 'no_validation'
                                                        and float_compare(att.overtime_hours, att.validated_overtime_hours, precision_digits=2))
        self.env.add_to_compute(self._fields['overtime_hours'],
                                to_recompute)
        self.env.add_to_compute(self._fields['validated_overtime_hours'],
                                to_recompute - validated_modified)
        self.env.add_to_compute(self._fields['expected_hours'],
                                to_recompute)

    def _get_pre_post_work_time(self, employee, working_times, attendance_date):
        pre_work_time, work_duration, post_work_time = 0, 0, 0
        company_threshold = employee.company_id.overtime_company_threshold / 60.0
        employee_threshold = employee.company_id.overtime_employee_threshold / 60.0
        # Compute start and end time for that day
        planned_start_dt, planned_end_dt = False, False
        planned_work_duration = 0
        for calendar_attendance in working_times[attendance_date]:
            planned_start_dt = min(planned_start_dt, calendar_attendance[0]) if planned_start_dt else calendar_attendance[0]
            planned_end_dt = max(planned_end_dt, calendar_attendance[1]) if planned_end_dt else calendar_attendance[1]
            planned_work_duration += (calendar_attendance[1] - calendar_attendance[0]).total_seconds() / 3600.0
        for attendance in self:
            # consider check_in as planned_start_dt if within threshold
            # if delta_in < 0: Checked in after supposed start of the day
            # if delta_in > 0: Checked in before supposed start of the day
            local_check_in = pytz.utc.localize(attendance.check_in)
            delta_in = (planned_start_dt - local_check_in).total_seconds() / 3600.0

            # Started before or after planned date within the threshold interval
            if (delta_in > 0 and delta_in <= company_threshold) or\
                (delta_in < 0 and abs(delta_in) <= employee_threshold):
                local_check_in = planned_start_dt
            local_check_out = pytz.utc.localize(attendance.check_out)

            # same for check_out as planned_end_dt
            delta_out = (local_check_out - planned_end_dt).total_seconds() / 3600.0
            # if delta_out < 0: Checked out before supposed start of the day
            # if delta_out > 0: Checked out after supposed start of the day

            # Finised before or after planned date within the threshold interval
            if (delta_out > 0 and delta_out <= company_threshold) or\
                (delta_out < 0 and abs(delta_out) <= employee_threshold):
                local_check_out = planned_end_dt

            # There is an overtime at the start of the day
            if local_check_in < planned_start_dt:
                pre_work_time += (min(planned_start_dt, local_check_out) - local_check_in).total_seconds() / 3600.0
            # Interval inside the working hours -> Considered as working time
            if local_check_in <= planned_end_dt and local_check_out >= planned_start_dt:
                start_dt = max(planned_start_dt, local_check_in)
                stop_dt = min(planned_end_dt, local_check_out)
                work_duration += (stop_dt - start_dt).total_seconds() / 3600.0
                # remove lunch time from work duration
                if not employee.sudo().is_flexible:
                    lunch_intervals = employee._employee_attendance_intervals(start_dt, stop_dt, lunch=True)
                    work_duration -= sum((i[1] - i[0]).total_seconds() / 3600.0 for i in lunch_intervals)

            # There is an overtime at the end of the day
            if local_check_out > planned_end_dt:
                post_work_time += (local_check_out - max(planned_end_dt, local_check_in)).total_seconds() / 3600.0
        return pre_work_time, work_duration, post_work_time, planned_work_duration
>>>>>>> 91f754e6c64f972fa81af60de4fd8a9cf300a1b2

    @api.model_create_multi
    def create(self, vals_list):
        res = super().create(vals_list)
        res._update_overtime()
        return res

    def write(self, vals):
        if vals.get('employee_id') and \
            vals['employee_id'] not in self.env.user.employee_ids.ids and \
            not self.env.user.has_group('hr_attendance.group_hr_attendance_manager') and \
            self.env['hr.employee'].sudo().browse(vals['employee_id']).attendance_manager_id.id != self.env.user.id:
            raise AccessError(_("Do not have access, user cannot edit the attendances that are not their own or if they are not the attendance manager of the employee."))
        domain_pre = self._get_overtimes_to_update_domain()
        result = super().write(vals)
        if any(field in vals for field in ['employee_id', 'check_in', 'check_out']):
            # Merge attendance dates before and after write to recompute the
            # overtime if the attendances have been moved to another day
            domain_post = self._get_overtimes_to_update_domain()
            self._update_overtime(Domain.OR([domain_pre, domain_post]))
        return result

    def unlink(self):
        domain = self._get_overtimes_to_update_domain()
        res = super().unlink()
        self.exists()._update_overtime(domain)
        return res

    def copy(self, default=None):
        raise exceptions.UserError(_('You cannot duplicate an attendance.'))

    def action_in_attendance_maps(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'url': get_google_maps_url(self.in_latitude, self.in_longitude),
            'target': 'new'
        }

    def action_out_attendance_maps(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'url': get_google_maps_url(self.out_latitude, self.out_longitude),
            'target': 'new'
        }

    def get_kiosk_url(self):
        return self.get_base_url() + "/hr_attendance/" + self.env.company.attendance_kiosk_key

    @api.model
    def has_demo_data(self):
        if not self.env.user.has_group("hr_attendance.group_hr_attendance_user"):
            return True
        # This record only exists if the scenario has been already launched
        demo_tag = self.env.ref('hr_attendance.resource_calendar_std_38h', raise_if_not_found=False)
        return bool(demo_tag) or bool(self.env['ir.module.module'].search_count([('demo', '=', True)]))

    def _load_demo_data(self):
        if self.has_demo_data():
            return
        env_sudo = self.sudo().with_context({}).env
        env_sudo['hr.employee']._load_scenario()
        # Load employees, schedules, departments and partners
        convert.convert_file(env_sudo, 'hr_attendance', 'data/scenarios/hr_attendance_scenario.xml', None, mode='init')

        employee_sj = self.env.ref('hr.employee_sj')
        employee_mw = self.env.ref('hr.employee_mw')
        employee_eg = self.env.ref('hr.employee_eg')

        # Retrieve employee from xml file
        # Calculate attendances records for the previous month and the current until today
        now = datetime.now()
        previous_month_datetime = (now - relativedelta(months=1))
        date_range = now.day + monthrange(previous_month_datetime.year, previous_month_datetime.month)[1]
        city_coordinates = (50.27, 5.31)
        city_coordinates_exception = (51.01, 2.82)
        city_dict = {
                    'latitude': city_coordinates_exception[0],
                    'longitude': city_coordinates_exception[1],
                    'city': 'Rellemstraat'
                }
        city_exception_dict = {
            'latitude': city_coordinates[0],
            'longitude': city_coordinates[1],
            'city': 'Waillet'
        }
        attendance_values = []
        for i in range(1, date_range):
            check_in_date = now.replace(hour=6, minute=0, second=randint(0, 59)) + timedelta(days=-i, minutes=randint(-2, 3))
            if check_in_date.weekday() not in range(0, 5):
                continue
            check_out_date = now.replace(hour=10, minute=0, second=randint(0, 59)) + timedelta(days=-i, minutes=randint(-2, -1))
            check_in_date_after_lunch = now.replace(hour=11, minute=0, second=randint(0, 59)) + timedelta(days=-i, minutes=randint(-2, -1))
            check_out_date_after_lunch = now.replace(hour=15, minute=0, second=randint(0, 59)) + timedelta(days=-i, minutes=randint(1, 3))

            # employee_eg doesn't work on friday
            eg_data = []
            if check_in_date.weekday() != 4:
                # employee_eg will compensate her work's hours between weeks.
                if check_in_date.isocalendar().week % 2:
                    employee_eg_hours = {
                        'check_in_date': check_in_date + timedelta(hours=1),
                        'check_out_date': check_out_date,
                        'check_in_date_after_lunch': check_in_date_after_lunch,
                        'check_out_date_after_lunch': check_out_date_after_lunch + timedelta(hours=-1),
                    }
                else:
                    employee_eg_hours = {
                        'check_in_date': check_in_date,
                        'check_out_date': check_out_date,
                        'check_in_date_after_lunch': check_in_date_after_lunch,
                        'check_out_date_after_lunch': check_out_date_after_lunch + timedelta(hours=1, minutes=30),
                    }
                eg_data = [{
                    'employee_id': employee_eg.id,
                    'check_in': employee_eg_hours['check_in_date'],
                    'check_out': employee_eg_hours['check_out_date'],
                    'in_mode': "kiosk",
                    'out_mode': "kiosk"
                }, {
                    'employee_id': employee_eg.id,
                    'check_in': employee_eg_hours['check_in_date_after_lunch'],
                    'check_out': employee_eg_hours['check_out_date_after_lunch'],
                    'in_mode': "kiosk",
                    'out_mode': "kiosk",
                }]

            # calculate GPS coordination for employee_mw (systray attendance)
            if randint(1, 10) == 1:
                city_data = city_exception_dict
            else:
                city_data = city_dict
            mw_data = [{
                'employee_id': employee_mw.id,
                'check_in': check_in_date,
                'check_out': check_out_date,
                'in_mode': "systray",
                'out_mode': "systray",
                'in_longitude': city_data['longitude'],
                'out_longitude': city_data['longitude'],
                'in_latitude': city_data['latitude'],
                'out_latitude': city_data['latitude'],
                'in_location': city_data['city'],
                'out_location': city_data['city'],
                'in_ip_address': "127.0.0.1",
                'out_ip_address': "127.0.0.1",
                'in_browser': 'chrome',
                'out_browser': 'chrome'
            }, {
                'employee_id': employee_mw.id,
                'check_in': check_in_date_after_lunch,
                'check_out': check_out_date_after_lunch,
                'in_mode': "systray",
                'out_mode': "systray",
                'in_longitude': city_data['longitude'],
                'out_longitude': city_data['longitude'],
                'in_latitude': city_data['latitude'],
                'out_latitude': city_data['latitude'],
                'in_location': city_data['city'],
                'out_location': city_data['city'],
                'in_ip_address': "127.0.0.1",
                'out_ip_address': "127.0.0.1",
                'in_browser': 'chrome',
                'out_browser': 'chrome'
            }]
            sj_data = [{
                'employee_id': employee_sj.id,
                'check_in': check_in_date + timedelta(minutes=randint(-10, -5)),
                'check_out': check_out_date,
                'in_mode': "manual",
                'out_mode': "manual"
            }, {
                'employee_id': employee_sj.id,
                'check_in': check_in_date_after_lunch,
                'check_out': check_out_date_after_lunch + timedelta(hours=1, minutes=randint(-20, 10)),
                'in_mode': "manual",
                'out_mode': "manual"
            }]
            attendance_values.extend(eg_data + mw_data + sj_data)
        self.env['hr.attendance'].create(attendance_values)
        return {
            'type': 'ir.actions.client',
            'tag': 'reload',
        }

    def action_try_kiosk(self):
        if not self.env.user.has_group("hr_attendance.group_hr_attendance_user"):
            return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'message': _("You don't have the rights to execute that action."),
                        'type': 'info',
                    }
            }
        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': self.env.company.attendance_kiosk_url + '?from_trial_mode=True'
        }

    def _read_group_employee_id(self, resources, domain):
        user_domain = Domain(self.env.context.get('user_domain') or Domain.TRUE)
        employee_domain = Domain('company_id', 'in', self.env.context.get('allowed_company_ids', []))
        if not self.env.user.has_group('hr_attendance.group_hr_attendance_user'):
            employee_domain &= Domain('attendance_manager_id', '=', self.env.user.id)
        if user_domain.is_true():
            # Workaround to make it work only for list view.
            if 'gantt_start_date' in self.env.context:
                return self.env['hr.employee'].search(employee_domain)
            return resources & self.env['hr.employee'].search(employee_domain)
        else:
            employee_name_domain = Domain.OR(
                Domain('name', condition.operator, condition.value)
                for condition in user_domain.iter_conditions()
                if condition.field_expr == 'employee_id'
            )
            return resources | self.env['hr.employee'].search(employee_name_domain & employee_domain)

    def _linked_overtimes(self):
        return self.env['hr.attendance.overtime.line'].search([
            ('time_start', 'in', self.mapped('check_in')),
            ('employee_id', 'in', self.employee_id.ids),
        ])

    def action_approve_overtime(self):
        self.linked_overtime_ids.action_approve()

    def action_refuse_overtime(self):
        self.linked_overtime_ids.action_refuse()

    def _cron_auto_check_out(self):
        def check_in_tz(attendance):
            """Returns check-in time in calendar's timezone."""
            return attendance.check_in.astimezone(pytz.timezone(attendance.employee_id._get_version(attendance.date)._get_tz()))

        to_verify = self.env['hr.attendance'].search(
            [('check_out', '=', False),
             ('employee_id.company_id.auto_check_out', '=', True),
             ('employee_id.resource_calendar_id.flexible_hours', '=', False)]
        )

        if not to_verify:
            return

        to_verify_min_date = min(to_verify.mapped('check_in')).replace(hour=0, minute=0, second=0)
        previous_attendances = self.env['hr.attendance'].search([
                    ('employee_id', 'in', to_verify.mapped('employee_id').ids),
                    ('check_in', '>', to_verify_min_date),
                    ('check_out', '!=', False)
        ])

        mapped_previous_duration = defaultdict(lambda: defaultdict(float))
        for previous in previous_attendances:
            mapped_previous_duration[previous.employee_id][check_in_tz(previous).date()] += previous.worked_hours

        all_companies = to_verify.employee_id.company_id

        for company in all_companies:
            max_tol = company.auto_check_out_tolerance
            to_verify_company = to_verify.filtered(lambda a: a.employee_id.company_id.id == company.id)

            for att in to_verify_company:

                employee_timezone = pytz.timezone(att.employee_id._get_version(att.date)._get_tz())
                check_in_datetime = check_in_tz(att)
                now_datetime = fields.Datetime.now().astimezone(employee_timezone)
                current_attendance_duration = (now_datetime - check_in_datetime).total_seconds() / 3600
                previous_attendances_duration = mapped_previous_duration[att.employee_id][check_in_datetime.date()]

                check_in_day_start = check_in_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                expected_worked_hours = sum_intervals(
                    att.employee_id._get_expected_attendances(
                        check_in_day_start,
                        check_in_day_start + timedelta(days=1),
                    )
                )

                # Attendances where Last open attendance time + previously worked time on that day + tolerance greater than the attendances hours (including lunch) in his calendar
                if (current_attendance_duration + previous_attendances_duration - max_tol) > expected_worked_hours:
                    att.check_out = check_in_datetime.replace(hour=23, minute=59, second=59).astimezone(utc).replace(tzinfo=None)
                    excess_hours = att.worked_hours - (expected_worked_hours + max_tol - previous_attendances_duration)
                    att.write({
                        "check_out": max(att.check_out - relativedelta(hours=excess_hours), att.check_in + relativedelta(seconds=1)),
                        "out_mode": "auto_check_out"
                    })
                    att.message_post(
                        body=_('This attendance was automatically checked out because the employee exceeded the allowed time for their scheduled work hours.')
                    )

    def _cron_absence_detection(self):
        """
        Objective is to create technical attendances on absence days to have negative overtime created for that day
        """
        yesterday = datetime.today().replace(hour=0, minute=0, second=0) - relativedelta(days=1)
        companies = self.env['res.company'].search([('absence_management', '=', True)])
        if not companies:
            return

        checked_in_employees = self.env['hr.attendance.overtime.line'].search([('date', '=', yesterday)]).employee_id

        technical_attendances_vals = []
        absent_employees = self.env['hr.employee'].search([
            ('id', 'not in', checked_in_employees.ids),
            ('company_id', 'in', companies.ids),
            ('resource_calendar_id.flexible_hours', '=', False),
            ('current_version_id.contract_date_start', '<=', fields.Date.today() - relativedelta(days=1))
        ])

        for emp in absent_employees:
            local_day_start = pytz.timezone(emp._get_tz()).localize(yesterday)
            check_in_utc = local_day_start.astimezone(pytz.utc)
            technical_attendances_vals.append({
                'check_in': check_in_utc.strftime('%Y-%m-%d %H:%M:%S'),
                'check_out': (check_in_utc + relativedelta(seconds=1)).strftime('%Y-%m-%d %H:%M:%S'),
                'in_mode': 'technical',
                'out_mode': 'technical',
                'employee_id': emp.id
            })

        technical_attendances = self.env['hr.attendance'].create(technical_attendances_vals)
        to_unlink = technical_attendances.filtered(lambda a: float_is_zero(a.overtime_hours, 3))

        body = _('This attendance was automatically created to cover an unjustified absence on that day.')
        for technical_attendance in technical_attendances - to_unlink:
            technical_attendance.message_post(body=body)

        to_unlink.unlink()

    def _get_localized_times(self):
        self.ensure_one()
        tz = timezone(self.employee_id.sudo()._get_version(self.check_in.date()).tz)
        localized_start = utc.localize(self.check_in).astimezone(tz).replace(tzinfo=None)
        localized_end = utc.localize(self.check_out).astimezone(tz).replace(tzinfo=None)
        return localized_start, localized_end

    def _get_dates(self):
        result = {}
        for attendance in self:
            localized_start, localized_end = attendance._get_localized_times()
            result[attendance] = list(rrule(DAILY, dtstart=localized_start.date(), until=localized_end.date()))
        return result

    def _get_attendance_by_periods_by_employee(self):
        attendance_by_employee_by_day = defaultdict(lambda: defaultdict(lambda: Intervals([], keep_distinct=True)))
        attendance_by_employee_by_week = defaultdict(lambda: defaultdict(lambda: Intervals([], keep_distinct=True)))

        for attendance in self.sorted('check_in'):
            employee = attendance.employee_id
            check_in, check_out = attendance._get_localized_times()
            for day in rrule(dtstart=check_in.date(), until=check_out.date(), freq=DAILY):
                week_date = day + relativedelta(days=6 - day.weekday())

                start_datetime = datetime.combine(day, time.min)
                stop_datetime_for_day = datetime.combine(day, time.max)
                day_interval = Intervals([(start_datetime, stop_datetime_for_day, self.env['resource.calendar'])])

                stop_datetime_for_week = datetime.combine(week_date, time.max)
                week_interval = Intervals([(start_datetime, stop_datetime_for_week, self.env['resource.calendar'])])

                attendance_interval = Intervals([(check_in, check_out, attendance)])
                intersected_day_interval = attendance_interval & day_interval
                intersected_week_interval = attendance_interval & week_interval
                if intersected_day_interval:
                    attendance_by_employee_by_day[employee][day] |= intersected_day_interval
                if intersected_week_interval:
                    attendance_by_employee_by_week[employee][week_date] |= intersected_week_interval

        return {
            'day': attendance_by_employee_by_day,
            'week': attendance_by_employee_by_week
        }
