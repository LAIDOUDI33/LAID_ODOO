# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import defaultdict
from datetime import UTC, datetime, time

from odoo import models


class HrTimeRuleSourceMixin(models.AbstractModel):
    """Mixin for hr.attendance and hr.leave models to support time rule evaluation."""

    _name = 'hr.time.rule.source.mixin'
    _description = 'Time Rule Source Mixin'

    # subclasses declare these
    _time_rule_source_field = ''      # m2o from output to source
    _time_rule_span_start_field = ''  # span start field name
    _time_rule_span_end_field = ''    # span end field name
    _time_rule_write_ctx = {'skip_time_rules': True, 'tracking_disable': True}

    def _get_source_records_for_time_rules(self, employees, start_dt, end_dt):
        """Return validated records overlapping [start_dt, end_dt] for employees."""
        raise NotImplementedError

    def _get_time_rule_end_write_vals(self, end_utc, stop_local):
        """Write vals dict for updating the span-end field.

        end_utc is the new UTC end datetime; stop_local is the same instant as a
        naive datetime in the employee's tz.  Leave overrides to also write
        request_date_to / request_hour_to.
        """
        return {self._time_rule_span_end_field: end_utc}

    def _get_time_rule_deficit_occupied(self, employee_id, start_utc, period_end_utc):
        """Return Intervals of existing records that occupy [start_utc, period_end_utc].

        Used by the deficit go-around algorithm to find free slots.
        """
        raise NotImplementedError

    def _get_time_rule_output_vals(self, rule, df, dt, pp):
        """Create vals for a new time rule output record.

        df/dt are UTC datetimes; pp is a frozenset of premium pay rule IDs.
        """
        raise NotImplementedError

    def _get_time_rule_remainder_vals(self, df, dt):
        """Create vals for a remainder record (source's original type, trimmed span).

        df/dt are UTC datetimes. work_entry_type_id is intentionally omitted;
        the caller fills it with the source's original WET before creating.
        """
        raise NotImplementedError


    def _collect_time_rule_outputs(self, rules, ranges_by_employee):
        all_excess = defaultdict(lambda: defaultdict(list))
        all_deficit = defaultdict(lambda: defaultdict(list))
        if not rules:
            return all_excess, all_deficit

        by_range = defaultdict(list)
        for employee, (date_from, date_to) in ranges_by_employee.items():
            start_dt = datetime.combine(date_from, time.min).replace(tzinfo=UTC)
            end_dt = datetime.combine(date_to, time.max).replace(tzinfo=UTC)
            by_range[start_dt, end_dt].append(employee)

        for (start_dt, end_dt), employees in by_range.items():
            employee_rs = self.env['hr.employee'].browse([e.id for e in employees])
            sources = self._get_source_records_for_time_rules(employee_rs, start_dt, end_dt)
            if not sources:
                continue

            excess, deficit = rules._evaluate_rules(sources, start_dt, end_dt)

            for emp, by_src in excess.items():
                for src, items in by_src.items():
                    all_excess[emp][src].extend(items)
            for emp, by_src in deficit.items():
                for src, items in by_src.items():
                    all_deficit[emp][src].extend(items)

        return all_excess, all_deficit
