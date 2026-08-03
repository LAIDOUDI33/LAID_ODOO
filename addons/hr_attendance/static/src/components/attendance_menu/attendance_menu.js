import { Component, onWillStart, proxy } from "@odoo/owl";
import { isIosApp } from "@web/core/browser/feature_detection";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";
import { deserializeDateTime, serializeDateTime } from "@web/core/l10n/dates";
import { Time } from "@web/core/l10n/time";
import { _t } from "@web/core/l10n/translation";
import { ConnectionLostError, rpc } from "@web/core/network/rpc";
import { registry } from "@web/core/registry";
import { TimePicker } from "@web/core/time_picker/time_picker";
import { Mutex } from "@web/core/utils/concurrency";
import { useService } from "@web/core/utils/hooks";
import { useDebounced } from "@web/core/utils/timing";
import { formatDateTime, formatFloatTime } from "@web/views/fields/formatters";
import { parseFloatTime } from "@web/views/fields/parsers";
import { AttendanceVideoStream } from "@hr_attendance/components/attendance_video_stream/attendance_video_stream";

const { DateTime } = luxon;

export class ActivityMenu extends Component {
    static components = { Dropdown, TimePicker, AttendanceVideoStream };
    static props = [];
    static template = "hr_attendance.attendance_menu";

    setup() {
        this.ui = useService("ui");
        this.orm = useService("orm");
        this.lazySession = useService("lazy_session");
        this.notification = useService("notification");
        this.dialogService = useService("dialog");
        this.state = proxy({
            employee: null,
            todayAttendanceRecords: [],
            checkedIn: false,
            isDisplayed: false,
            captureCheckInImage: false,
            streamAvailable: null,
            activeAttendanceId: null,
            editingAttendanceId: null,
            inlineEditDirty: false,
            editDraft: {
                checkIn: null,
                checkOut: null,
                breakDuration: "0",
            },
        });

        this.employee = false;
        this.cameraCapture = null;
        this.inlineEditOriginal = null;
        this.inlineEditHasChanges = false;
        this.saveMutex = new Mutex();
        this.scheduleInlineAutosave = useDebounced(this.saveInlineEdit, 400, {
            execBeforeUnmount: true,
        });
        this.dropdown = useDropdownState();

        onWillStart(() => {
            this.lazySession.getValue("attendance_user_data", (employee) => {
                if (employee) {
                    this.employee = employee;
                    this.attendanceCheckInPermission = employee.has_attendance_check_in_ability;
                    this._searchReadEmployeeFill();
                }
            });
        });
    }

    async searchReadEmployee() {
        this.employee = await rpc("/hr_attendance/attendance_user_data");
        this._searchReadEmployeeFill();
    }

    _searchReadEmployeeFill() {
        this.state.employee = this.employee || null;
        if (!this.employee?.id) {
            this.state.isDisplayed = false;
            this.state.todayAttendanceRecords = [];
            return;
        }

        this.state.isDisplayed = this.attendanceCheckInPermission;
        this.state.checkedIn = this.employee.attendance_state === "checked_in";
        this.state.captureCheckInImage =
            this.employee.capture_check_in_image && !this.state.checkedIn;

        this.state.todayAttendanceRecords = [...(this.employee.today_attendance_ids || [])].sort(
            (attendanceA, attendanceB) =>
                deserializeDateTime(attendanceA.check_in).ts -
                deserializeDateTime(attendanceB.check_in).ts
        );

        const fallbackAttendanceId = this.state.todayAttendanceRecords.at(-1)?.id || null;
        if (!this._getAttendanceById(this.state.activeAttendanceId)) {
            this.state.activeAttendanceId = fallbackAttendanceId;
        }
        if (this.state.editingAttendanceId && !this._getAttendanceById(this.state.editingAttendanceId)) {
            this._stopInlineEdit();
        }
    }

    get attendanceDetails() {
        const attendance = this._getAttendanceById(this.state.activeAttendanceId);
        if (!this.state.todayAttendanceRecords.length) {
            return null;
        }
        let totalDisplayMinutes = 0;
        const sessions = this.state.todayAttendanceRecords.map((att) => {
            const checkInDate = deserializeDateTime(att.check_in);
            const checkOutDate = att.check_out ? deserializeDateTime(att.check_out) : null;
            const duration = att.check_out
                ? att.worked_hours
                : this.state.employee.last_attendance_worked_hours;
            const displayMinutes = Math.round((duration || 0) * 60);
            totalDisplayMinutes += displayMinutes;
            return {
                id: att.id,
                selected: att.id === this.state.activeAttendanceId,
                rangeLabel: `${this._formatAttendanceTime(checkInDate)} - ${
                    checkOutDate ? this._formatAttendanceTime(checkOutDate) : _t("Now")
                }`,
                durationLabel: formatFloatTime(displayMinutes, {
                    numeric: true,
                    unit: "minutes",
                }).replace(":", "h"),
            };
        });
        const entries = [];
        if (attendance?.check_in) {
            const checkIn = deserializeDateTime(attendance.check_in);
            const checkOut = attendance.check_out ? deserializeDateTime(attendance.check_out) : null;
            entries.push(
                {
                    key: "check_in",
                    label: _t("Check In"),
                    time: this._formatAttendanceTime(checkIn),
                    location: attendance.in_location || false,
                    pending: false,
                },
                {
                    key: "check_out",
                    label: _t("Check Out"),
                    time: checkOut ? this._formatAttendanceTime(checkOut) : _t("Pending"),
                    location: checkOut ? attendance.out_location || false : false,
                    pending: !checkOut,
                }
            );
        }
        return {
            id: attendance?.id || null,
            entries,
            showBreakSummary: Boolean(this.state.employee.break_management_enabled),
            selectedBreakDisplay: attendance?.break_duration
                ? formatFloatTime(attendance.break_duration, { numeric: true })
                : _t("No break"),
            breakDisplay: formatFloatTime(this.state.employee.break_today, { numeric: true }),
            totalDisplay: formatFloatTime(totalDisplayMinutes, {
                numeric: true,
                unit: "minutes",
            }),
            sessions,
        };
    }

    get todayDateLabel() {
        return DateTime.now().toLocaleString({
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    _getAttendanceById(attendanceId) {
        if (!attendanceId) {
            return null;
        }
        return (
            this.state.todayAttendanceRecords.find((attendance) => attendance.id === attendanceId) ||
            null
        );
    }

    setCameraCapture(capturePicture) {
        this.cameraCapture = capturePicture;
    }

    setStreamAvailable(isAvailable) {
        this.state.streamAvailable = isAvailable;
    }

    get showVideoStream() {
        return this.state.captureCheckInImage && this.state.streamAvailable !== false;
    }

    async beforeDropdownOpen() {
        this.setStreamAvailable(null);
        await this.searchReadEmployee();
        const latestAttendance = this.state.todayAttendanceRecords.at(-1);
        if (latestAttendance) {
            this.state.activeAttendanceId = latestAttendance.id;
            if (latestAttendance.can_edit) {
                this.startInlineEdit(latestAttendance.id);
            }
        }
    }

    _formatAttendanceTime(dateTime) {
        return formatDateTime(dateTime, { showDate: false });
    }

    _parseDateTimeInputValue(value) {
        return value?.isValid ? value : null;
    }

    _getAttendanceFieldDateTime(attendance, fieldName) {
        const attendanceField = fieldName === "checkIn" ? "check_in" : "check_out";
        return attendance?.[attendanceField] ? deserializeDateTime(attendance[attendanceField]) : null;
    }

    _getInlineTimeValue(dateTime) {
        const value = this._parseDateTimeInputValue(dateTime);
        return value ? new Time(value.toObject()) : null;
    }

    _getInlineEditBaseDate(fieldName) {
        const currentDraftValue = this._parseDateTimeInputValue(this.state.editDraft[fieldName]);
        if (currentDraftValue) {
            return currentDraftValue;
        }
        const attendance = this._getAttendanceById(this.state.editingAttendanceId);
        const attendanceValue = this._getAttendanceFieldDateTime(attendance, fieldName);
        if (attendanceValue) {
            return attendanceValue;
        }
        if (fieldName === "checkOut") {
            return (
                this._parseDateTimeInputValue(this.state.editDraft.checkIn) ||
                this._getAttendanceFieldDateTime(attendance, "checkIn")
            );
        }
        return null;
    }

    _serializeDateTimeInputValue(inputValue) {
        const dateTime = this._parseDateTimeInputValue(inputValue);
        if (!dateTime) {
            return false;
        }
        return serializeDateTime(dateTime);
    }

    updateInlineDateTimeDraft(fieldName, value) {
        const baseDate = this._getInlineEditBaseDate(fieldName);
        const timeValue = Time.from(value);
        let nextDateTime = baseDate && timeValue ? baseDate.set(timeValue.toObject()) : null;
        if (fieldName === "checkOut" && nextDateTime) {
            const originalCheckOut = this._getAttendanceFieldDateTime(
                this._getAttendanceById(this.state.editingAttendanceId),
                "checkOut"
            );
            const checkInDateTime = this._parseDateTimeInputValue(this.state.editDraft.checkIn);
            if (!originalCheckOut && checkInDateTime && nextDateTime < checkInDateTime) {
                nextDateTime = nextDateTime.plus({ days: 1 });
            }
        }
        this.state.editDraft[fieldName] = nextDateTime;
        this.state.inlineEditDirty = true;
        this.scheduleInlineAutosave();
    }

    onInlineBreakDurationInput(value) {
        this.state.editDraft.breakDuration = value;
        this.state.inlineEditDirty = true;
        this.scheduleInlineAutosave();
    }

    flushInlineAutosave() {
        this.scheduleInlineAutosave.cancel();
        return this.saveInlineEdit();
    }

    async selectAttendance(attendanceId) {
        const collapseAttendance = this.state.activeAttendanceId === attendanceId;
        const wasEditing = Boolean(this.state.editingAttendanceId);
        if (wasEditing && !(await this.flushInlineAutosave())) {
            return;
        }
        if (collapseAttendance) {
            this._stopInlineEdit();
            this.state.activeAttendanceId = null;
            return;
        }
        if (wasEditing) {
            this.startInlineEdit(attendanceId);
            return;
        }
        const attendance = this._getAttendanceById(attendanceId);
        if (!attendance) {
            return;
        }
        if (attendance.can_edit) {
            this.startInlineEdit(attendance.id);
        } else {
            this.state.activeAttendanceId = attendance.id;
        }
    }

    startInlineEdit(attendanceId = this.state.activeAttendanceId) {
        const attendance = this._getAttendanceById(attendanceId);
        if (!attendance?.can_edit) {
            return;
        }
        this.state.activeAttendanceId = attendance.id;
        this.state.editingAttendanceId = attendance.id;
        this._setInlineEditDraft(attendance);
        this.state.inlineEditDirty = false;
        this.inlineEditOriginal = {
            attendanceId: attendance.id,
            values: {
                check_in: attendance.check_in,
                check_out: attendance.check_out || false,
                break_duration: attendance.break_duration || 0,
            },
        };
        this.inlineEditHasChanges = false;
    }

    _setInlineEditDraft(attendance) {
        this.state.editDraft.checkIn = deserializeDateTime(attendance.check_in);
        this.state.editDraft.checkOut = attendance.check_out
            ? deserializeDateTime(attendance.check_out)
            : null;
        this.state.editDraft.breakDuration = formatFloatTime(attendance.break_duration || 0);
    }

    _stopInlineEdit() {
        this.state.editingAttendanceId = null;
        this.state.inlineEditDirty = false;
        this.inlineEditOriginal = null;
        this.inlineEditHasChanges = false;
    }

    async discardInlineEdit() {
        this.scheduleInlineAutosave.cancel();
        return this.saveMutex.exec(async () => {
            try {
                if (this.inlineEditOriginal && this.inlineEditHasChanges) {
                    await this.orm.write(
                        "hr.attendance",
                        [this.inlineEditOriginal.attendanceId],
                        this.inlineEditOriginal.values
                    );
                    await this.searchReadEmployee();
                }
                this._stopInlineEdit();
                this.dropdown.close();
            } catch (error) {
                this._notifyInlineEditError(error);
            }
        });
    }

    saveInlineEdit() {
        return this.saveMutex.exec(() => this._saveInlineEdit());
    }

    async _saveInlineEdit() {
        const attendanceId = this.state.editingAttendanceId;
        if (!attendanceId) {
            return true;
        }
        if (!this.state.inlineEditDirty) {
            return true;
        }
        const draft = this.state.editDraft;
        if (!this._parseDateTimeInputValue(draft.checkIn)) {
            this.notification.add(_t("Check-in is required."), {
                title: _t("Attendance Error"),
                type: "danger",
            });
            return false;
        }
        this.state.inlineEditDirty = false;
        try {
            const attendance = this._getAttendanceById(attendanceId);
            const checkOut =
                this._parseDateTimeInputValue(draft.checkOut) ||
                this._getAttendanceFieldDateTime(attendance, "checkOut");
            const vals = {
                check_in: this._serializeDateTimeInputValue(draft.checkIn),
                check_out: checkOut ? this._serializeDateTimeInputValue(checkOut) : false,
                break_duration: checkOut
                    ? parseFloatTime(draft.breakDuration) || 0
                    : 0,
            };
            await this.orm.write("hr.attendance", [attendanceId], vals);
            this.inlineEditHasChanges = true;
        } catch (error) {
            this.state.inlineEditDirty = true;
            this._notifyInlineEditError(error);
            return false;
        }
        try {
            await this.searchReadEmployee();
        } catch {
            this.notification.add(_t("Attendance saved, but the display could not be refreshed."), {
                title: _t("Attendance Error"),
                type: "warning",
            });
            return true;
        }
        if (!this.state.inlineEditDirty) {
            const attendance = this._getAttendanceById(attendanceId);
            if (attendance) {
                this._setInlineEditDraft(attendance);
            }
        }
        return true;
    }

    _notifyInlineEditError(error) {
        this.notification.add(
            error?.data?.message || error?.message || _t("Could not update this attendance."),
            {
                title: _t("Attendance Error"),
                type: "danger",
            }
        );
    }

    async checking({ latitude = false, longitude = false, checkInImage = null } = {}) {
        try {
            this.employee = await rpc("/hr_attendance/systray_check_in_out", {
                latitude,
                longitude,
                check_in_image: checkInImage,
            });
            this._searchReadEmployeeFill();
            this._stopInlineEdit();
            const latestAttendance = this.state.todayAttendanceRecords.at(-1);
            if (this.dropdown.isOpen && latestAttendance?.can_edit) {
                this.startInlineEdit(latestAttendance.id);
            }
            if (this.employee?.notification?.message) {
                this.notification.add(this.employee.notification.message, {
                    type: this.employee.notification.type,
                });
            }
        } catch (error) {
            if (error instanceof ConnectionLostError) {
                this.notification.add(_t("Connection lost. Check in/out could not be recorded."), {
                    title: _t("Attendance Error"),
                    type: "danger",
                    sticky: false,
                });
            } else {
                throw error;
            }
        } finally {
            this._attendanceInProgress = false;
        }
    }

    confirmChecking(checkInImage = null) {
        this.dialogService.add(ConfirmationDialog, {
            body: _t(
                "Unable to get a valid location. Do you want to proceed with your check-in/out anyway?"
            ),
            confirmLabel: _t("Proceed Anyway"),
            confirm: async () => await this.checking({ checkInImage }),
            cancel: () => (this._attendanceInProgress = false),
        });
    }

    get closeSystrayOnCheckIn() {
        return true;
    }

    async signInOut() {
        if (this._attendanceInProgress) {
            return;
        }
        this._attendanceInProgress = true;
        const attendanceWasCheckedIn = this.state.checkedIn;
        if (this.state.editingAttendanceId) {
            if (!(await this.flushInlineAutosave())) {
                this._attendanceInProgress = false;
                return;
            }
            if (attendanceWasCheckedIn && !this.state.checkedIn) {
                this._stopInlineEdit();
                this.dropdown.close();
                this._attendanceInProgress = false;
                return;
            }
        }
        const checkInImage = this.cameraCapture?.();
        if (this.closeSystrayOnCheckIn) {
            this.dropdown.close();
        }

        const trackingEnabled = this.employee && this.employee.device_tracking_enabled;
        if (trackingEnabled && !isIosApp() && navigator.geolocation && navigator.onLine) {
            // iOS app lacks permissions to call `getCurrentPosition`
            navigator.geolocation.getCurrentPosition(
                async ({ coords: { latitude, longitude } }) => {
                    await this.checking({ latitude, longitude, checkInImage });
                },
                () => {
                    this.confirmChecking(checkInImage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                }
            );
        } else if (trackingEnabled) {
            this.confirmChecking(checkInImage);
        } else {
            await this.checking({ checkInImage });
        }
    }
}

export const systrayAttendance = {
    Component: ActivityMenu,
};

registry
    .category("systray")
    .add("hr_attendance.attendance_menu", systrayAttendance, { sequence: 70 });
