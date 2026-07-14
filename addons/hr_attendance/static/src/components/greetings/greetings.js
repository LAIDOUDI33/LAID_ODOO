import { Component, onWillDestroy } from "@odoo/owl";
import { deserializeDateTime } from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { sprintf } from "@web/core/utils/strings";

export class KioskGreetings extends Component {
    static template = "hr_attendance.public_kiosk_greetings";
    static props = {
        employeeData: { type: Object },
        kioskReturn: { type: Function },
        kioskContinueBreak: { type: Function, optional: true },
    };

    setup() {
        this.formatDateTime = registry.category("formatters").get("datetime");
        this.formatFloatTime = registry.category("formatters").get("float_time");
        const employeeData = this.props.employeeData;
        this.employeeName = employeeData.employee_name;
        this.employeeAvatar = employeeData.employee_avatar;
        this.hoursToday = this.formatFloatTime(employeeData.hours_today);
        this.attendance = employeeData.attendance;
        this.checkInTime = this.formatDateTime(
            this.attendance.check_in && deserializeDateTime(this.attendance.check_in)
        );
        this.checkOutTime = this.formatDateTime(
            this.attendance.check_out && deserializeDateTime(this.attendance.check_out)
        );
        this.isCheckOut = Boolean(this.attendance.check_out);
        this.isEmployeeSingleCheckIn = employeeData.is_employee_single_checkin;
        this.showContinueOptions = this.isCheckOut && employeeData.break_management_enabled;
        this.greetingTitle = this.isCheckOut ? _t("Goodbye") : _t("Welcome");
        this.statusAlertClass = this.isCheckOut ? "alert-info" : "alert-success";
        this.statusMessage = this.isCheckOut
            ? sprintf(_t("Checked out at %s"), this.checkOutTime)
            : sprintf(_t("Checked in at %s"), this.checkInTime);
        this.secondarySummaryLabel = this.isCheckOut
            ? _t("Hours Today")
            : _t("Hours Previously Today");
        if (employeeData.display_overtime) {
            this.overtimeToday = this.formatFloatTime(employeeData.overtime_today);
            this.totalOvertime = this.formatFloatTime(employeeData.total_overtime);
        }
        this.kioskDelay = setTimeout(() => {
            this.props.kioskReturn(true);
        }, employeeData.kiosk_delay);
        onWillDestroy(() => this.clearKioskDelay());
    }

    clearKioskDelay() {
        clearTimeout(this.kioskDelay);
    }

    continueBreak() {
        this.clearKioskDelay();
        this.props.kioskContinueBreak?.();
    }
}
