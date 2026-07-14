import { beforeEach, expect, test } from "@odoo/hoot";
import { mockTimeZone } from "@odoo/hoot-mock";
import { defineMailModels } from "@mail/../tests/mail_test_helpers";
import {
    assignDialogTestEnv,
    contains,
    makeTestApp,
    mountWithCleanup,
} from "@web/../tests/web_test_helpers";
import { Mutex } from "@web/core/utils/concurrency";
import { deserializeDateTime } from "@web/core/l10n/dates";
import { ActivityMenu } from "@hr_attendance/components/attendance_menu/attendance_menu";
import { BreakDurationDialog } from "@hr_attendance/components/break_duration_dialog/break_duration_dialog";

defineMailModels();

beforeEach(async () => {
    assignDialogTestEnv();
    await makeTestApp();
});

test("break duration dialog validates and submits whole minutes", async () => {
    await mountWithCleanup(BreakDurationDialog, {
        props: {
            employeeName: "Mitchell Admin",
            onConfirm: (minutes) => expect.step(`confirmed ${minutes}`),
            close: () => expect.step("closed"),
        },
        noMainContainer: true,
    });

    expect("label[for='o_break_duration_minutes']").toHaveCount(1);
    await contains("#o_break_duration_minutes").edit("-1", { instantly: true });
    await contains(".modal-footer .btn-primary").click();

    expect.verifySteps([]);
    expect(".modal").toHaveCount(1);

    await contains("#o_break_duration_minutes").edit("10");
    await contains(".modal-footer .btn-primary").click();

    expect.verifySteps(["confirmed 10", "closed"]);
});

test("the displayed total sums the rounded attendance durations", () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        activeAttendanceId: null,
        employee: {
            break_management_enabled: false,
            last_attendance_worked_hours: 0,
        },
        todayAttendanceRecords: [
            {
                id: 42,
                check_in: "2026-07-13 09:00:00",
                check_out: "2026-07-13 09:00:31",
                worked_hours: 31 / 3600,
            },
            {
                id: 43,
                check_in: "2026-07-13 10:00:00",
                check_out: "2026-07-13 10:00:31",
                worked_hours: 31 / 3600,
            },
        ],
    };
    attendanceMenu._formatAttendanceTime = () => "";

    const details = attendanceMenu.attendanceDetails;

    expect(details.sessions.map((session) => session.durationLabel)).toEqual(["0h01", "0h01"]);
    expect(details.totalDisplay).toBe("0:02");
});

test("opening the systray only edits the latest attendance from today", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        employee: null,
        todayAttendanceRecords: [],
        activeAttendanceId: null,
    };
    attendanceMenu.setStreamAvailable = () => {};
    attendanceMenu.searchReadEmployee = async () => {
        attendanceMenu.state.employee = {
            last_attendance: { id: 41, can_edit: true },
        };
        attendanceMenu.state.todayAttendanceRecords = [{ id: 42, can_edit: true }];
    };
    attendanceMenu.startInlineEdit = (attendanceId) => expect.step(`edit ${attendanceId}`);

    await attendanceMenu.beforeDropdownOpen();

    expect(attendanceMenu.state.activeAttendanceId).toBe(42);
    expect.verifySteps(["edit 42"]);
});

test("inline attendance edits made during a save are serialized", async () => {
    const firstWrite = Promise.withResolvers();
    const scheduledSaves = [];
    const writtenBreakDurations = [];
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.saveMutex = new Mutex();
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: true,
        editDraft: {
            checkIn: {},
            checkOut: {},
            breakDuration: "0",
        },
    };
    attendanceMenu._getAttendanceById = () => null;
    attendanceMenu._parseDateTimeInputValue = () => true;
    attendanceMenu._serializeDateTimeInputValue = () => "2026-07-13 09:00:00";
    attendanceMenu.notification = {
        add(message) {
            throw new Error(message);
        },
    };
    attendanceMenu.searchReadEmployee = async () => {};
    attendanceMenu.scheduleInlineAutosave = () => {
        scheduledSaves.push(attendanceMenu.saveInlineEdit());
    };
    attendanceMenu.orm = {
        async write(model, ids, values) {
            expect(model).toBe("hr.attendance");
            expect(ids).toEqual([42]);
            writtenBreakDurations.push(values.break_duration);
            if (writtenBreakDurations.length === 1) {
                await firstWrite.promise;
            }
        },
    };

    const firstSave = attendanceMenu.saveInlineEdit();
    await Promise.resolve();
    attendanceMenu.onInlineBreakDurationInput("0h30m");
    attendanceMenu.onInlineBreakDurationInput("1h");
    firstWrite.resolve();
    await Promise.all([firstSave, ...scheduledSaves]);

    expect(writtenBreakDurations).toEqual([0, 1]);
});

test("discard restores the attendance values from before autosaving", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    const originalValues = {
        check_in: "2026-07-13 09:00:00",
        check_out: "2026-07-13 10:00:00",
        break_duration: 0,
    };
    attendanceMenu.state = { editingAttendanceId: 42, inlineEditDirty: false };
    attendanceMenu.inlineEditOriginal = { attendanceId: 42, values: originalValues };
    attendanceMenu.inlineEditHasChanges = true;
    attendanceMenu.scheduleInlineAutosave = Object.assign(() => {}, {
        cancel: () => expect.step("cancel autosave"),
    });
    attendanceMenu.saveMutex = new Mutex();
    attendanceMenu.orm = {
        async write(model, ids, values) {
            expect(model).toBe("hr.attendance");
            expect(ids).toEqual([42]);
            expect(values).toEqual(originalValues);
            expect.step("restore values");
        },
    };
    attendanceMenu.searchReadEmployee = async () => expect.step("refresh");
    attendanceMenu.dropdown = { close: () => expect.step("close") };
    attendanceMenu.notification = {
        add(message) {
            throw new Error(message);
        },
    };

    await attendanceMenu.discardInlineEdit();

    expect.verifySteps(["cancel autosave", "restore values", "refresh", "close"]);
    expect(attendanceMenu.state.editingAttendanceId).toBe(null);
    expect(attendanceMenu.inlineEditOriginal).toBe(null);
});

test("changing checkout preserves check-in seconds and schedules an autosave", () => {
    mockTimeZone(0);
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: false,
        todayAttendanceRecords: [
            {
                id: 42,
                check_in: "2026-07-21 09:00:37",
                check_out: "2026-07-21 10:00:00",
            },
        ],
        editDraft: {
            checkIn: deserializeDateTime("2026-07-21 09:00:37"),
            checkOut: deserializeDateTime("2026-07-21 10:00:00"),
            breakDuration: "0",
        },
    };
    attendanceMenu.scheduleInlineAutosave = () => expect.step("schedule autosave");

    attendanceMenu.updateInlineDateTimeDraft("checkOut", {
        hour: 11,
        minute: 30,
        second: 0,
    });

    expect(attendanceMenu._serializeDateTimeInputValue(attendanceMenu.state.editDraft.checkOut)).toBe(
        "2026-07-21 11:30:00"
    );
    expect(attendanceMenu._serializeDateTimeInputValue(attendanceMenu.state.editDraft.checkIn)).toBe(
        "2026-07-21 09:00:37"
    );
    expect(attendanceMenu.state.editingAttendanceId).toBe(42);
    expect.verifySteps(["schedule autosave"]);
});

test("invalid inline break durations are reported instead of throwing", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.saveMutex = new Mutex();
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: true,
        editDraft: {
            checkIn: {},
            checkOut: {},
            breakDuration: "invalid",
        },
    };
    attendanceMenu._getAttendanceById = () => null;
    attendanceMenu._parseDateTimeInputValue = () => true;
    attendanceMenu._serializeDateTimeInputValue = () => "2026-07-13 09:00:00";
    attendanceMenu.orm = {
        write() {
            throw new Error("The invalid value should not be written.");
        },
    };
    attendanceMenu.notification = {
        add(message) {
            expect(message).toInclude("invalid");
            expect.step("notified");
        },
    };

    await attendanceMenu.saveInlineEdit();

    expect.verifySteps(["notified"]);
});

test("a rejected inline edit keeps the local draft", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.saveMutex = new Mutex();
    const attendance = {
        id: 42,
        check_in: "2026-07-21 11:26:00",
        check_out: false,
        break_duration: 0,
    };
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: true,
        editDraft: {
            checkIn: deserializeDateTime("2026-07-21 12:00:00"),
            checkOut: null,
            breakDuration: "0",
        },
        todayAttendanceRecords: [attendance],
    };
    attendanceMenu.orm = {
        async write() {
            throw new Error("The attendance overlaps another entry.");
        },
    };
    attendanceMenu.notification = {
        add(message) {
            expect(message).toBe("The attendance overlaps another entry.");
            expect.step("notified");
        },
    };

    await attendanceMenu.saveInlineEdit();

    expect.verifySteps(["notified"]);
    expect(attendanceMenu._serializeDateTimeInputValue(attendanceMenu.state.editDraft.checkIn)).toBe(
        "2026-07-21 12:00:00"
    );
    expect(attendanceMenu.state.editDraft.checkOut).toBe(null);
});

test("editing a break keeps the attendance checkout", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.saveMutex = new Mutex();
    const checkIn = { name: "check-in" };
    const checkOut = { name: "check-out" };
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: true,
        editDraft: {
            checkIn,
            checkOut: null,
            breakDuration: "0h10",
        },
    };
    attendanceMenu._getAttendanceById = () => ({
        id: 42,
        check_out: "2026-07-21 11:12:00",
    });
    attendanceMenu._getAttendanceFieldDateTime = (attendance, fieldName) =>
        fieldName === "checkOut" ? checkOut : null;
    attendanceMenu._parseDateTimeInputValue = (value) => value;
    attendanceMenu._serializeDateTimeInputValue = (value) =>
        value === checkIn ? "2026-07-21 10:34:00" : "2026-07-21 11:12:00";
    attendanceMenu.searchReadEmployee = async () => {};
    attendanceMenu.notification = {
        add(message) {
            throw new Error(message);
        },
    };
    attendanceMenu.orm = {
        async write(model, ids, values) {
            expect(model).toBe("hr.attendance");
            expect(ids).toEqual([42]);
            expect(values).toEqual({
                check_in: "2026-07-21 10:34:00",
                check_out: "2026-07-21 11:12:00",
                break_duration: 10 / 60,
            });
            expect.step("saved");
        },
    };

    await attendanceMenu.saveInlineEdit();

    expect.verifySteps(["saved"]);
});

test("a refresh failure does not report a successful write as failed", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.saveMutex = new Mutex();
    attendanceMenu.state = {
        editingAttendanceId: 42,
        inlineEditDirty: true,
        editDraft: {
            checkIn: {},
            checkOut: {},
            breakDuration: "0",
        },
    };
    attendanceMenu._getAttendanceById = () => null;
    attendanceMenu._parseDateTimeInputValue = () => true;
    attendanceMenu._serializeDateTimeInputValue = () => "2026-07-13 09:00:00";
    attendanceMenu.orm = { write: async () => expect.step("saved") };
    attendanceMenu.searchReadEmployee = async () => {
        throw new Error("refresh failed");
    };
    attendanceMenu.notification = {
        add(message, options) {
            expect(message).toInclude("saved");
            expect(options.type).toBe("warning");
            expect.step("refresh warning");
        },
    };

    const result = await attendanceMenu.saveInlineEdit();

    expect(result).toBe(true);
    expect(attendanceMenu.state.editingAttendanceId).toBe(42);
    expect.verifySteps(["saved", "refresh warning"]);
});

test("check-out saves pending inline attendance changes", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        checkedIn: true,
        editingAttendanceId: 42,
    };
    attendanceMenu.employee = { device_tracking_enabled: false };
    attendanceMenu.flushInlineAutosave = async () => {
        expect.step("save attendance");
        return true;
    };
    attendanceMenu.dropdown = { close: () => expect.step("close") };
    attendanceMenu.checking = async () => expect.step("check out");

    await attendanceMenu.signInOut();

    expect.verifySteps(["save attendance", "close", "check out"]);
});

test("check-out is not toggled again when inline editing already closed the attendance", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        checkedIn: true,
        editingAttendanceId: 42,
    };
    attendanceMenu.flushInlineAutosave = async () => {
        attendanceMenu.state.checkedIn = false;
        expect.step("save attendance");
        return true;
    };
    attendanceMenu.dropdown = { close: () => expect.step("close") };
    attendanceMenu.checking = async () => expect.step("unexpected toggle");

    await attendanceMenu.signInOut();

    expect.verifySteps(["save attendance", "close"]);
    expect(attendanceMenu._attendanceInProgress).toBe(false);
});

test("a failed inline save re-enables check-in/out", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        checkedIn: true,
        editingAttendanceId: 42,
    };
    attendanceMenu.flushInlineAutosave = async () => false;
    attendanceMenu.checking = async () => expect.step("unexpected check out");

    await attendanceMenu.signInOut();

    expect.verifySteps([]);
    expect(attendanceMenu._attendanceInProgress).toBe(false);
});
