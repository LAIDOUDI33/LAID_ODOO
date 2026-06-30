import { registry } from "@web/core/registry";
import { stepUtils } from "@web_tour/tour_utils";
import { drag, hover } from "@odoo/hoot-dom";

// Drag the end border of the full-day leave to the next day's cell, then wait
// until the leave visibly spans two days (the resize wrote through the backend
// and the calendar reloaded).
async function resizeLeaveByOneDay() {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const event = document.querySelector(".fc-daygrid-block-event");
    const startCell = event.closest(".fc-daygrid-day[data-date]");
    const nextDate = luxon.DateTime.fromISO(startCell.dataset.date)
        .plus({ days: 1 })
        .toFormat("yyyy-MM-dd");
    const targetCell = document.querySelector(`.fc-daygrid-day[data-date='${nextDate}']`);
    if (!targetCell) {
        throw new Error(`No day cell for ${nextDate} in the current month grid`);
    }

    // Reveal the hover-only resize handle and make it grabbable.
    await hover(".fc-event-main", { root: event });
    const resizer = event.querySelector(".fc-event-resizer-end");
    Object.assign(resizer.style, {
        display: "block",
        position: "absolute",
        width: "8px",
        height: "100%",
        right: "0",
        top: "0",
    });

    const { drop, moveTo } = await drag(resizer);
    await moveTo(targetCell);
    await drop(targetCell);

    // Wait for the reload: the leave should now span ~2 day cells.
    for (let i = 0; i < 50; i++) {
        await sleep(100);
        const ev = document.querySelector(".fc-daygrid-block-event");
        const cell = document.querySelector(".fc-daygrid-day[data-date]");
        if (
            ev &&
            cell &&
            ev.getBoundingClientRect().width > cell.getBoundingClientRect().width * 1.4
        ) {
            return;
        }
    }
    throw new Error("The leave did not extend after the resize drag");
}

registry.category("web_tour.tours").add("time_off_resize_month_tour", {
    steps: () => [
        stepUtils.showAppsMenuItem(),
        {
            content: "Open Time Off app",
            trigger: '.o_app[data-menu-xmlid="hr_holidays.menu_hr_holidays_root"]',
            run: "click",
        },
        {
            content: "Open the scale selector",
            trigger: ".scale_button_selection",
            run: "click",
        },
        {
            content: "Switch to Month view",
            trigger: ".o_scale_button_month",
            run: "click",
        },
        {
            content: "Month grid is shown",
            trigger: ".fc-dayGridMonth-view",
        },
        {
            content: "The full-day leave is a resizable all-day event; resize it",
            trigger: ".fc-daygrid-block-event.fc-event-resizable",
            run: resizeLeaveByOneDay,
        },
    ],
});
