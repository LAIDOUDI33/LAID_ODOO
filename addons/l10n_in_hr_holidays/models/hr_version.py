# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from odoo import api, models


class HrVersion(models.Model):
    _inherit = 'hr.version'

    @api.model
    def _generate_work_entries_postprocess_adapt_to_calendar(self, vals):
        if vals.pop('_l10n_in_exceptional_day', False):
            return False
        return super()._generate_work_entries_postprocess_adapt_to_calendar(vals)

    def _get_version_work_entries_values(self, date_start, date_stop):
        result = super()._get_version_work_entries_values(date_start, date_stop)

        in_versions = self.filtered(
            lambda version: version.company_id.country_id.code == 'IN'
        )
        if not in_versions:
            return result

        exceptional_days = self.env['hr.leave']._get_exceptional_holidays(date_start, date_stop)
        if not exceptional_days:
            return result

        for version in in_versions:
            tz = ZoneInfo(version._get_tz())

            exceptional_dates = set()
            compensatory_dates = set()

            for holiday in exceptional_days:
                hour_start = holiday.date_from.replace(tzinfo=UTC).astimezone(tz).date()
                hour_end = holiday.date_to.replace(tzinfo=UTC).astimezone(tz).date()

                exceptional_dates.update(
                    hour_start + timedelta(days=i)
                    for i in range((hour_end - hour_start).days + 1)
                )
                if holiday.working_start_date and holiday.working_end_date:
                    comp_start = holiday.working_start_date.date()
                    comp_end = holiday.working_end_date.date()
                    compensatory_dates.update(
                        comp_start + timedelta(days=i)
                        for i in range((comp_end - comp_start).days + 1)
                    )

            version_exceptinal_dates = {
                exceptinal_date
                for exceptinal_date in exceptional_dates
                if date_start.date() <= exceptinal_date <= date_stop.date()
            }

            version_compensatory_dates = {
                compensatory_date
                for compensatory_date in compensatory_dates
                if date_start.date() <= compensatory_date <= date_stop.date()
            }
            if not version_exceptinal_dates and not version_compensatory_dates:
                continue

            approved_leaves = self.env["hr.leave"].sudo().search([
                ("employee_id", "=", version.employee_id.id),
                ("state", "=", "validate"),
                ("date_from", "<=", date_stop),
                ("date_to", ">=", date_start),
            ])

            leave_type_by_date = {}
            for leave in approved_leaves:
                leave_start_date = leave.date_from.replace(tzinfo=UTC).astimezone(tz).date()
                leave_end_date = leave.date_to.replace(tzinfo=UTC).astimezone(tz).date()

                for d in version_exceptinal_dates:
                    if leave_start_date <= d <= leave_end_date:
                        leave_type_by_date[d] = leave.work_entry_type_id

            leave_dates = set(leave_type_by_date.keys())
            attendance_dates = version_exceptinal_dates - leave_dates

            result = [
                vals
                for vals in result
                if not (
                    vals["employee_id"] == version.employee_id
                    and (
                        vals["date_start"].replace(tzinfo=UTC).astimezone(tz).date() in version_exceptinal_dates
                        or
                        (
                            vals["date_start"].replace(tzinfo=UTC).astimezone(tz).date() in version_compensatory_dates
                            and vals["work_entry_type_id"].count_as == "working_time"
                        )
                    )
                )
            ]

            if attendance_dates:
                result += version._l10n_in_get_exceptional_day_attendance_vals(attendance_dates)
            if leave_dates:
                result += version._l10n_in_get_exceptional_day_leave_vals(leave_type_by_date)
        return result

    def _l10n_in_get_attendance_intervals_for_date(self, target_date):
        """Return the (hour_from, hour_to) blocks to use for ``target_date`` when
        converting it to/from an exceptional working day.

        Uses the calendar's fixed weekly attendance lines for that weekday when
        available (dayofweek '0' = Monday ... '6' = Sunday, same indexing as
        ``date.weekday()``). Falls back to a single block of ``hours_per_day``
        hours when the weekday has no scheduled hours at all (e.g. a public
        holiday falling on a weekly day off), so the day still counts as one
        full day in the payslip.
        """
        self.ensure_one()
        calendar = self.resource_calendar_id
        day_lines = calendar.attendance_ids.filtered(
            lambda a: a.dayofweek == str(target_date.weekday()) and a.hour_to > a.hour_from
        )
        if day_lines:
            return [(line.hour_from, line.hour_to) for line in day_lines]
        return [(0, self._get_hours_per_day() or 8.0)]

    def _l10n_in_get_exceptional_day_leave_vals(self, leave_type_by_date):
        """Generate leave work entries for exceptional dates that are covered
        by an approved leave, using the same hour template as a normal
        working day but stamped with the leave's own work entry type.
        """
        self.ensure_one()

        employee = self.employee_id
        tz = ZoneInfo(self._get_tz())

        vals_list = []
        for leave_date, work_entry_type in leave_type_by_date.items():
            if not work_entry_type:
                continue
            day_midnight = datetime.combine(leave_date, time.min, tzinfo=tz)
            for hour_from, hour_to in self._l10n_in_get_attendance_intervals_for_date(leave_date):
                interval_start = day_midnight + timedelta(hours=hour_from)
                interval_stop = day_midnight + timedelta(hours=hour_to)
                vals_list.append({
                    'date_start': interval_start.astimezone(UTC).replace(tzinfo=None),
                    'date_stop': interval_stop.astimezone(UTC).replace(tzinfo=None),
                    'work_entry_type_id': work_entry_type,
                    'employee_id': employee,
                    'version_id': self,
                    'company_id': self.company_id,
                    # Leave work entry types are normally 'count_as': 'absence', which makes
                    # the base engine recompute the duration from the calendar's own weekly
                    # schedule instead of the interval above - and that recompute yields 0
                    # hours on a date the calendar doesn't normally work (e.g. a public
                    # holiday that fell on a weekly day off). This flag tells
                    # _generate_work_entries_postprocess_adapt_to_calendar to keep our
                    # explicit hour_from/hour_to instead.
                    '_l10n_in_exceptional_day': True,
                })
        return vals_list

    def _l10n_in_get_exceptional_day_attendance_vals(self, exceptional_dates):
        self.ensure_one()
        employee = self.employee_id
        tz = ZoneInfo(self._get_tz())
        work_entry_type = self.env.ref('hr_work_entry.in_work_entry_type_attendance')

        vals_list = []
        for exceptional_date in exceptional_dates:
            day_midnight = datetime.combine(exceptional_date, time.min, tzinfo=tz)
            for hour_from, hour_to in self._l10n_in_get_attendance_intervals_for_date(exceptional_date):
                interval_start = day_midnight + timedelta(hours=hour_from)
                interval_stop = day_midnight + timedelta(hours=hour_to)
                vals_list.append({
                    'date_start': interval_start.astimezone(UTC).replace(tzinfo=None),
                    'date_stop': interval_stop.astimezone(UTC).replace(tzinfo=None),
                    'work_entry_type_id': work_entry_type,
                    'employee_id': employee,
                    'version_id': self,
                    'company_id': self.company_id,
                })
        return vals_list
