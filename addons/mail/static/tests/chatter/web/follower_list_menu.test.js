import {
    click,
    contains,
    defineMailModels,
    hover,
    insertText,
    openFormView,
    scroll,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";

import { describe, expect, test } from "@odoo/hoot";
import { animationFrame, queryOne, tick } from "@odoo/hoot-dom";
import { mockService, serverState } from "@web/../tests/web_test_helpers";
import { range } from "@web/core/utils/numbers";

describe.current.tags("desktop");
defineMailModels();

test("base rendering not editable", async () => {
    await start();
    await openFormView("res.partner", undefined, {});
    await contains(".o-mail-Followers");
    await contains(".o-mail-Followers-button:disabled");
    await contains(".o-mail-Followers-dropdown", { count: 0 });
    await click(".o-mail-Followers-button");
    await contains(".o-mail-Followers-dropdown", { count: 0 });
});

test("base rendering editable", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({});
    await start();
    await openFormView("res.partner", partnerId);
    await contains(".o-mail-Followers");
    await contains(".o-mail-Followers-button");
    await contains(".o-mail-Followers-button:first:enabled");
    await contains(".o-mail-Followers-dropdown", { count: 0 });
    await click(".o-mail-Followers-button");
    await contains(".o-mail-Followers-dropdown");
});

test('click on "add followers" button', async () => {
    const pyEnv = await startServer();
    const [partnerId_1, partnerId_2, partnerId_3] = pyEnv["res.partner"].create([
        { name: "Partner1" },
        { name: "François Perusse" },
        { name: "Partner3" },
    ]);
    pyEnv["mail.followers"].create({
        partner_id: partnerId_2,
        email: "bla@bla.bla",
        is_active: true,
        res_id: partnerId_1,
        res_model: "res.partner",
    });
    mockService("action", {
        doAction(action, options) {
            if (action?.res_model !== "mail.followers.edit") {
                return super.doAction(...arguments);
            }
            expect.step("action:open_view");
            expect(action.context.default_res_model).toBe("res.partner");
            expect(action.context.default_res_ids).toEqual([partnerId_1]);
            expect(action.res_model).toBe("mail.followers.edit");
            expect(action.type).toBe("ir.actions.act_window");
            pyEnv["mail.followers"].create({
                partner_id: partnerId_3,
                email: "bla@bla.bla",
                is_active: true,
                name: "Wololo",
                res_id: partnerId_1,
                res_model: "res.partner",
            });
            options.onClose();
        },
    });
    await start();
    await openFormView("res.partner", partnerId_1);
    await contains(".o-mail-Followers");
    await contains(".o-mail-Followers-counter:text('1')");
    await click(".o-mail-Followers-button");
    await contains(".o-mail-Followers-dropdown");
    await click("a:text('Add Followers')");
    await contains(".o-mail-Followers-dropdown", { count: 0 });
    await expect.waitForSteps(["action:open_view"]);
    await contains(".o-mail-Followers-counter:text('2')");
    await click(".o-mail-Followers-button");
    await contains(".o-mail-Follower", { count: 2 });
    await contains(".o-mail-Follower:eq(0):text('François Perusse')");
    await contains(".o-mail-Follower:eq(1):text('Partner3')");
});

test("click on remove follower", async () => {
    const pyEnv = await startServer();
    const [partnerId_1, partnerId_2] = pyEnv["res.partner"].create([
        { name: "Partner1" },
        { name: "Partner2" },
    ]);
    pyEnv["mail.followers"].create({
        partner_id: partnerId_2,
        email: "bla@bla.bla",
        is_active: true,
        name: "Wololo",
        res_id: partnerId_1,
        res_model: "res.partner",
    });
    await start();
    await openFormView("res.partner", partnerId_1);
    await click(".o-mail-Followers-button");
    await contains(".o-mail-Follower");
    await click("[title='Remove this follower']");
    await contains(".o-mail-Follower", { count: 0 });
    await contains(".o-mail-Followers-dropdown");
});

test("Load 20 followers at once", async () => {
    const pyEnv = await startServer();
    const partnerIds = pyEnv["res.partner"].create(
        range(80).map((i) => ({ display_name: `Partner${i}`, name: `Partner${i}` }))
    );
    pyEnv["mail.followers"].create(
        range(80).map((i) => ({
            is_active: true,
            partner_id: i === 0 ? serverState.partnerId : partnerIds[i],
            res_id: partnerIds[0],
            res_model: "res.partner",
        }))
    );
    await start();
    await openFormView("res.partner", partnerIds[0]);
    await contains("button[title='Show Followers']:text('80')");
    await click("[title='Show Followers']");
    await contains(".o-mail-Follower", { count: 20 });
    await contains("button[title='Show Followers']:text('80')");
    await contains(".o-mail-FollowerList-list > div:nth-child(1):text('Partner1')");
    await contains(".o-mail-FollowerList-list > div:nth-child(2):text('Partner10')");
    await contains(".o-mail-FollowerList-list > div:nth-child(3):text('Partner11')");
    await contains(".o-mail-Followers-dropdown:has(:text('Load more'))");
    await animationFrame();
    await contains(".o-mail-Follower", { count: 20 });
    const initialScrollTop = queryOne(".o-mail-Followers-dropdown").scrollTop;
    await click(".o-mail-Followers-dropdown .btn:text('Load more')");
    await contains(".o-mail-Follower", { count: 40 });
    expect(queryOne(".o-mail-Followers-dropdown").scrollTop).toBe(initialScrollTop);
    await hover(".o-mail-Follower:first");
    await scroll(".o-mail-Followers-dropdown", "bottom");
    const scrollTop = queryOne(".o-mail-Followers-dropdown").scrollTop;
    await contains(".o-mail-Follower", { count: 60 });
    expect(queryOne(".o-mail-Followers-dropdown").scrollTop).toBe(scrollTop);
    await tick();
    await scroll(".o-mail-Followers-dropdown", "bottom");
    await contains(".o-mail-Follower", { count: 79 });
    await contains(".o-mail-Followers-dropdown:has(:text('Load more'))", { count: 0 });
});

test("opening and searching follower list refreshes the follower count", async () => {
    const pyEnv = await startServer();
    const threadId = pyEnv["res.partner"].create({ name: "Thread" });
    const partnerIds = pyEnv["res.partner"].create(
        range(22).map((i) => ({
            email: `partner${i}@example.com`,
            name: `Partner${i}`,
        }))
    );
    pyEnv["mail.followers"].create(
        [serverState.partnerId, ...partnerIds.slice(0, 19)].map((partnerId) => ({
            is_active: true,
            partner_id: partnerId,
            res_id: threadId,
            res_model: "res.partner",
        }))
    );
    await start();
    await openFormView("res.partner", threadId);
    await contains(".o-mail-Followers-counter:text('20')");

    pyEnv["mail.followers"].create({
        is_active: true,
        partner_id: partnerIds[19],
        res_id: threadId,
        res_model: "res.partner",
    });
    await click("[title='Show Followers']");

    await contains(".o-mail-Followers-counter:text('21')");
    await contains("input[placeholder='Search by name or email']", { count: 0 });
    await contains(".o-mail-Follower", { count: 20 });
    await contains(".o-mail-Followers-dropdown .btn:text('Load more')", { count: 0 });
    await click("[title='Show Followers']");

    pyEnv["mail.followers"].create({
        is_active: true,
        partner_id: partnerIds[20],
        res_id: threadId,
        res_model: "res.partner",
    });
    await click("[title='Show Followers']");

    await contains(".o-mail-Followers-counter:text('22')");
    await contains("input[placeholder='Search by name or email']");
    await contains(".o-mail-Followers-dropdown .btn:text('Load more')");

    pyEnv["mail.followers"].create({
        is_active: true,
        partner_id: partnerIds[21],
        res_id: threadId,
        res_model: "res.partner",
    });
    await insertText("input[placeholder='Search by name or email']", "Partner21");

    await contains(".o-mail-Followers-counter:text('23')");
    await contains(".o-mail-Follower", { count: 1, text: "Partner21" });
    await click("[title='Clear']");
    await contains(".o-mail-Follower", { count: 20 });
    await insertText("input[placeholder='Search by name or email']", "partner21@example.com");
    await contains(".o-mail-Follower", { count: 1, text: "Partner21" });
});

test("Load 100 recipients at once", async () => {
    const pyEnv = await startServer();
    const partnerIds = pyEnv["res.partner"].create(
        range(210).map((i) => ({
            display_name: `Partner${i}`,
            name: `Partner${i}`,
            email: `partner${i}@example.com`,
        }))
    );
    pyEnv["mail.followers"].create(
        range(210).map((i) => ({
            is_active: true,
            partner_id: i === 0 ? serverState.partnerId : partnerIds[i],
            res_id: partnerIds[0],
            res_model: "res.partner",
        }))
    );
    await start();
    await openFormView("res.partner", partnerIds[0]);
    await contains("button[title='Show Followers']:text('210')");
});

test('Show "Add follower" and subtypes edition/removal buttons on all followers if user has write access', async () => {
    const pyEnv = await startServer();
    const [partnerId_1, partnerId_2] = pyEnv["res.partner"].create([
        { name: "Partner1" },
        { name: "Partner2" },
    ]);
    pyEnv["mail.followers"].create([
        {
            is_active: true,
            partner_id: serverState.partnerId,
            res_id: partnerId_1,
            res_model: "res.partner",
        },
        {
            is_active: true,
            partner_id: partnerId_2,
            res_id: partnerId_1,
            res_model: "res.partner",
        },
    ]);
    await start();
    await openFormView("res.partner", partnerId_1);
    await click(".o-mail-Followers-button");
    await contains("a:text('Add Followers')");
    await contains(":nth-child(1 of .o-mail-Follower)", {
        contains: [["[title='Edit Notification Preferences']"], ["[title='Remove this follower']"]],
    });
});

test('Show "No Followers" dropdown-item if there are no followers and user does not have write access', async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ hasWriteAccess: false });
    await start();
    await openFormView("res.partner", partnerId);
    await click(".o-mail-Followers-button");
    await contains("div.disabled:text('No Followers')");
});
