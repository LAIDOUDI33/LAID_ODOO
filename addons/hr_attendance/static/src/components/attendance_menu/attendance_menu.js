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
        this.inlineEditSavePending = false;
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

        const fallbackAttendanceId =
            this.state.employee.last_attendance?.id ||
            this.state.todayAttendanceRecords.at(-1)?.id ||
            null;
        if (!this._getAttendanceById(this.state.activeAttendanceId)) {
            this.state.activeAttendanceId = fallbackAttendanceId;
        }
        if (this.state.editingAttendanceId && !this._getAttendanceById(this.state.editingAttendanceId)) {
            this.state.editingAttendanceId = null;
        }
    }

    get attendanceDetails() {
        const attendance = this._getAttendanceById(this.state.activeAttendanceId);
        if (!this.state.todayAttendanceRecords.length) {
            return null;
        }
        const sessions = this.state.todayAttendanceRecords.map((att) => {
            const checkInDate = deserializeDateTime(att.check_in);
            const checkOutDate = att.check_out ? deserializeDateTime(att.check_out) : null;
            const duration = att.check_out
                ? att.worked_hours
                : this.state.employee.last_attendance_worked_hours;
            return {
                id: att.id,
                selected: att.id === this.state.activeAttendanceId,
                rangeLabel: `${this._formatAttendanceTime(checkInDate)} - ${
                    checkOutDate ? this._formatAttendanceTime(checkOutDate) : _t("Now")
                }`,
                durationLabel: formatFloatTime(duration || 0, { numeric: true }).replace(":", "h"),
            };
        });
        const breakDuration = this.state.todayAttendanceRecords.reduce(
            (total, record) => total + (record.check_out ? record.break_duration || 0 : 0),
            0
        );
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
            breakDisplay: formatFloatTime(breakDuration, { numeric: true }),
            totalDisplay: formatFloatTime(this.state.employee.hours_today, { numeric: true }),
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
            (this.state.employee?.last_attendance?.id === attendanceId
                ? this.state.employee.last_attendance
                : null)
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
        const latestAttendance = this.state.employee?.last_attendance;
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
        return serializeDateTime(dateTime.set({ second: 0, millisecond: 0 }));
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
    }

    onInlineDateTimeChange(fieldName, value) {
        this.updateInlineDateTimeDraft(fieldName, value);
        this.inlineEditHasChanges = true;
        this.scheduleInlineAutosave();
    }

    onInlineBreakDurationInput(value) {
        this.state.editDraft.breakDuration = value;
        this.inlineEditHasChanges = true;
        this.scheduleInlineAutosave();
    }

    async flushInlineAutosave() {
        this.scheduleInlineAutosave.cancel(true);
        await this.saveMutex.getUnlockedDef();
    }

    async selectAttendance(attendanceId) {
        if (this.state.activeAttendanceId === attendanceId) {
            await this.flushInlineAutosave();
            this.state.editingAttendanceId = null;
            this.state.activeAttendanceId = null;
            this.inlineEditOriginal = null;
            this.inlineEditHasChanges = false;
            return;
        }
        if (this.state.editingAttendanceId && this.state.editingAttendanceId !== attendanceId) {
            await this.flushInlineAutosave();
            this.startInlineEdit(attendanceId);
            return;
        }
        if (this.state.editingAttendanceId) {
            return;
        }
        const attendance = this._getAttendanceById(attendanceId);
        if (attendance) {
            if (attendance.can_edit) {
                this.startInlineEdit(attendance.id);
            } else {
                this.state.activeAttendanceId = attendance.id;
            }
        }
    }

    startInlineEdit(attendanceId = this.state.activeAttendanceId) {
        const attendance = this._getAttendanceById(attendanceId);
        if (!(attendance && attendance.can_edit)) {
            return;
        }
        this.state.activeAttendanceId = attendance.id;
        this.state.editingAttendanceId = attendance.id;
        this.state.editDraft.checkIn = deserializeDateTime(attendance.check_in);
        this.state.editDraft.checkOut = attendance.check_out ? deserializeDateTime(attendance.check_out) : null;
        this.state.editDraft.breakDuration = formatFloatTime(
            Math.max(attendance.break_duration || 0, 0)
        );
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

    async discardInlineEdit() {
        this.scheduleInlineAutosave.cancel();
        await this.saveMutex.getUnlockedDef();
        const original = this.inlineEditOriginal;
        try {
            if (original && this.inlineEditHasChanges) {
                await this.orm.write("hr.attendance", [original.attendanceId], original.values);
                await this.searchReadEmployee();
            }
            this.state.editingAttendanceId = null;
            this.inlineEditOriginal = null;
            this.inlineEditHasChanges = false;
            this.dropdown.close();
        } catch (error) {
            this.notification.add(
                error?.data?.message || error?.message || _t("Could not discard the attendance changes."),
                {
                    title: _t("Attendance Error"),
                    type: "danger",
                }
            );
        }
    }

    saveInlineEdit() {
        this.inlineEditSavePending = true;
        return this.saveMutex.exec(async () => {
            if (!this.inlineEditSavePending) {
                return;
            }
            this.inlineEditSavePending = false;
            await this._saveInlineEdit();
        });
    }

    async _saveInlineEdit() {
        const attendanceId = this.state.editingAttendanceId;
        if (!attendanceId) {
            return;
        }
        if (!this._parseDateTimeInputValue(this.state.editDraft.checkIn)) {
            this.notification.add(_t("Check-in is required."), {
                title: _t("Attendance Error"),
                type: "danger",
            });
            return;
        }
        try {
            const vals = {
                check_in: this._serializeDateTimeInputValue(this.state.editDraft.checkIn),
                check_out: this.state.editDraft.checkOut
                    ? this._serializeDateTimeInputValue(this.state.editDraft.checkOut)
                    : false,
                break_duration: this.state.editDraft.checkOut
                    ? Math.max(parseFloatTime(this.state.editDraft.breakDuration) || 0, 0)
                    : 0,
            };
            await this.orm.write("hr.attendance", [attendanceId], vals);
            await this.searchReadEmployee();
        } catch (error) {
            this.notification.add(
                error?.data?.message || error?.message || _t("Could not update this attendance."),
                {
                    title: _t("Attendance Error"),
                    type: "danger",
                }
            );
        }
    }

    async checking({ latitude = false, longitude = false, checkInImage = null } = {}) {
        try {
            this.employee = await rpc("/hr_attendance/systray_check_in_out", {
                latitude,
                longitude,
                check_in_image: checkInImage,
            });
            this._searchReadEmployeeFill();
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
            await this.flushInlineAutosave();
            if (attendanceWasCheckedIn && !this.state.checkedIn) {
                this.state.editingAttendanceId = null;
                this.inlineEditOriginal = null;
                this.inlineEditHasChanges = false;
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
