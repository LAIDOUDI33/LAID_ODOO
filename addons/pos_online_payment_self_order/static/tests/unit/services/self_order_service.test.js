import { test, describe, expect } from "@odoo/hoot";
import { patchWithCleanup } from "@web/../tests/web_test_helpers";
import { setupSelfPosEnv, getFilledSelfOrder } from "@pos_self_order/../tests/unit/utils";
import { definePosSelfModels } from "@pos_self_order/../tests/unit/data/generate_model_definitions";
import { session } from "@web/session";

definePosSelfModels();

describe("getOnlinePaymentUrl", () => {
    test("pay route params", async () => {
        patchWithCleanup(session, { base_url: "http://localhost:8069" });
        const store = await setupSelfPosEnv("mobile", "table", "each");
        const order = await getFilledSelfOrder(store);

        const url = new URL(store.getOnlinePaymentUrl(order, false));
        expect(url.pathname).toBe(`/pos/pay/${order.id}`);
        expect(url.searchParams.get("access_token")).toBe(order.access_token);
    });

    test("exit route params", async () => {
        patchWithCleanup(session, { base_url: "http://localhost:8069" });
        const store = await setupSelfPosEnv("mobile", "table", "each");
        const order = await getFilledSelfOrder(store);
        const table = store.models["restaurant.table"].getFirst();
        table.identifier = "test-table-identifier";
        const getExitRoute = (url) => new URL(url).searchParams.get("exit_route");

        // exitRoute=false (kiosk): no exit route building at all.
        expect(getExitRoute(store.getOnlinePaymentUrl(order, false))).toBe(session.base_url);

        // "each": exits through the order confirmation page, no table_identifier without a scanned table.
        const eachExit = new URL(getExitRoute(store.getOnlinePaymentUrl(order)));
        expect(eachExit.pathname).toBe(
            `/pos-self/${store.config.id}/confirmation/${order.access_token}/order`
        );
        expect(eachExit.searchParams.get("access_token")).toBe(store.access_token);
        expect(eachExit.searchParams.get("table_identifier")).toBeEmpty();

        // "each" with a table scanned: table_identifier is carried on the exit route.
        store.router.addTableIdentifier(table);
        const eachTableExit = new URL(getExitRoute(store.getOnlinePaymentUrl(order)));
        expect(eachTableExit.searchParams.get("table_identifier")).toBe(table.identifier);

        // "meal": exits straight to the landing page, no confirmation subpath, no table_identifier at all.
        store.config.self_ordering_pay_after = "meal";
        const mealExit = new URL(getExitRoute(store.getOnlinePaymentUrl(order)));
        expect(mealExit.pathname).toBe(`/pos-self/${store.config.id}`);
        expect(mealExit.searchParams.get("access_token")).toBe(store.access_token);
        expect(mealExit.searchParams.get("table_identifier")).toBeEmpty();
    });
});

test("sendDraftOrderToServer updateLastOrderChange", async () => {
    const store = await setupSelfPosEnv();
    const order = await getFilledSelfOrder(store);

    store.config.self_ordering_mode = "mobile";
    const product4 = store.models["product.template"].get(11);
    await store.addToCart(product4, 1, "");
    await store.sendDraftOrderToServer();
    expect(Object.keys(order.prep_order_ids)).toHaveLength(0);

    store.config.self_ordering_pay_after = "meal";
    const product3 = store.models["product.template"].get(10);
    await store.addToCart(product3, 1, "");
    await store.sendDraftOrderToServer();
    expect(Object.keys(order.prep_order_ids[0].prep_line_ids)).toHaveLength(4);
});
