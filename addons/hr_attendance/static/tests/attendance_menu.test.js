import { beforeEach, expect, test } from "@odoo/hoot";
import { makeTestApp } from "@web/../tests/web_test_helpers";
import { Mutex } from "@web/core/utils/concurrency";
import { ActivityMenu } from "@hr_attendance/components/attendance_menu/attendance_menu";

beforeEach(async () => {
    await makeTestApp();
});

test("collapsing an attendance keeps the session list visible", () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        activeAttendanceId: null,
        employee: {
            break_management_enabled: true,
            hours_today: 1,
            last_attendance_worked_hours: 1,
        },
        todayAttendanceRecords: [
            {
                id: 42,
                check_in: "2026-07-13 09:00:00",
                check_out: "2026-07-13 10:00:00",
                worked_hours: 1,
                break_duration: 0,
            },
        ],
    };
    attendanceMenu._formatAttendanceTime = () => "";

    const details = attendanceMenu.attendanceDetails;

    expect(details.id).toBe(null);
    expect(details.sessions).toHaveLength(1);
    expect(details.sessions[0].selected).toBe(false);
});

test("inline attendance edits made during a save are coalesced", async () => {
    const firstWrite = Promise.withResolvers();
    const writtenBreakDurations = [];
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        editingAttendanceId: 42,
        editDraft: {
            checkIn: {},
            checkOut: {},
            breakDuration: "0",
        },
    };
    attendanceMenu.inlineEditSavePending = false;
    attendanceMenu.saveMutex = new Mutex();
    attendanceMenu._parseDateTimeInputValue = () => true;
    attendanceMenu._serializeDateTimeInputValue = () => "2026-07-13 09:00:00";
    attendanceMenu.notification = {
        add(message) {
            throw new Error(message);
        },
    };
    attendanceMenu.searchReadEmployee = async () => {};
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

    const savePromise = attendanceMenu.saveInlineEdit();
    await Promise.resolve();
    attendanceMenu.state.editDraft.breakDuration = "0h30m";
    attendanceMenu.saveInlineEdit();
    attendanceMenu.state.editDraft.breakDuration = "1h";
    attendanceMenu.saveInlineEdit();
    firstWrite.resolve();
    await savePromise;

    expect(writtenBreakDurations).toEqual([0, 1]);
});

test("discard restores the attendance values from before inline editing", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    const originalValues = {
        check_in: "2026-07-13 09:00:00",
        check_out: "2026-07-13 10:00:00",
        break_duration: 0,
    };
    attendanceMenu.state = { editingAttendanceId: 42 };
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
    expect(attendanceMenu.inlineEditHasChanges).toBe(false);
});

test("invalid inline break durations are reported instead of throwing", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        editingAttendanceId: 42,
        editDraft: {
            checkIn: {},
            checkOut: {},
            breakDuration: "invalid",
        },
    };
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

    await attendanceMenu._saveInlineEdit();

    expect.verifySteps(["notified"]);
});

test("check-out waits for pending inline attendance changes", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        checkedIn: true,
        editingAttendanceId: 42,
    };
    attendanceMenu.employee = { device_tracking_enabled: false };
    attendanceMenu.flushInlineAutosave = async () => expect.step("flush autosave");
    attendanceMenu.dropdown = { close: () => expect.step("close") };
    attendanceMenu.checking = async () => expect.step("check out");

    await attendanceMenu.signInOut();

    expect.verifySteps(["flush autosave", "close", "check out"]);
});

test("check-out is not toggled again when inline editing already closed the attendance", async () => {
    const attendanceMenu = Object.create(ActivityMenu.prototype);
    attendanceMenu.state = {
        checkedIn: true,
        editingAttendanceId: 42,
    };
    attendanceMenu.inlineEditOriginal = {};
    attendanceMenu.inlineEditHasChanges = true;
    attendanceMenu.flushInlineAutosave = async () => {
        attendanceMenu.state.checkedIn = false;
        expect.step("flush autosave");
    };
    attendanceMenu.dropdown = { close: () => expect.step("close") };
    attendanceMenu.checking = async () => expect.step("unexpected toggle");

    await attendanceMenu.signInOut();

    expect.verifySteps(["flush autosave", "close"]);
    expect(attendanceMenu.state.editingAttendanceId).toBe(null);
    expect(attendanceMenu.inlineEditOriginal).toBe(null);
    expect(attendanceMenu.inlineEditHasChanges).toBe(false);
});
