import { test, expect, describe } from "@odoo/hoot";
import { animationFrame } from "@odoo/hoot-dom";
import { mountWithCleanup, onRpc, MockServer } from "@web/../tests/web_test_helpers";
import { OrderPage } from "@pos_self_order/app/pages/order_page/order_page";
import { setupSelfPosEnv, getFilledSelfOrder } from "../utils";
import { definePosSelfModels } from "../data/generate_model_definitions";

definePosSelfModels();

describe("initOrder", () => {
    test("order not known locally yet, fetches it from the server then selects it", async () => {
        const store = await setupSelfPosEnv();
        const orderId = MockServer.env["pos.order"].create({
            config_id: store.config.id,
            session_id: store.session.id,
            access_token: "test-access-token",
            state: "draft",
        });
        onRpc("/pos-self-order/get-user-data/", () =>
            MockServer.env["pos.order"].read_pos_data([orderId], {}, store.config.id)
        );

        await mountWithCleanup(OrderPage, {
            props: { orderAccessToken: "test-access-token" },
        });
        await animationFrame();

        const order = store.models["pos.order"].find((o) => o.access_token === "test-access-token");
        expect(order).not.toBe(undefined);
        expect(store.selectedOrderUuid).toBe(order.uuid);
    });

    test("order found locally and still draft, selects it", async () => {
        const store = await setupSelfPosEnv();
        const order = await getFilledSelfOrder(store);
        store.selectedOrderUuid = null;

        await mountWithCleanup(OrderPage, {
            props: { orderAccessToken: order.access_token },
        });
        await animationFrame();

        expect(store.selectedOrderUuid).toBe(order.uuid);
    });

    test("order found locally but no longer draft, does not select it", async () => {
        const store = await setupSelfPosEnv();
        const order = await getFilledSelfOrder(store);
        order.state = "paid";
        store.selectedOrderUuid = order.uuid;

        await mountWithCleanup(OrderPage, {
            props: { orderAccessToken: order.access_token },
        });
        await animationFrame();

        expect(store.selectedOrderUuid).toBe(null);
    });

    test("order never found even after retrying, selects nothing", async () => {
        const store = await setupSelfPosEnv();
        onRpc("/pos-self-order/get-user-data/", () => ({}));

        await mountWithCleanup(OrderPage, {
            props: { orderAccessToken: "does-not-exist" },
        });
        await animationFrame();

        expect(store.selectedOrderUuid).toBe(null);
    });

    test("joining a foreign order via QR drops this device's own unrelated draft without merging its lines into it", async () => {
        const store = await setupSelfPosEnv();
        // This device's own pre-existing, unrelated draft order with its own lines.
        const ownOrder = await getFilledSelfOrder(store);
        expect(ownOrder.lines.length).toBe(2);

        const joinedOrderId = MockServer.env["pos.order"].create({
            config_id: store.config.id,
            session_id: store.session.id,
            access_token: "joined-order-token",
            state: "draft",
        });
        onRpc("/pos-self-order/get-user-data/", () =>
            MockServer.env["pos.order"].read_pos_data([joinedOrderId], {}, store.config.id)
        );

        await mountWithCleanup(OrderPage, {
            props: { orderAccessToken: "joined-order-token" },
        });
        await animationFrame();

        const joinedOrder = store.models["pos.order"].find(
            (o) => o.access_token === "joined-order-token"
        );
        expect(joinedOrder).not.toBe(undefined);
        expect(store.selectedOrderUuid).toBe(joinedOrder.uuid);

        // The device only ever tracks one order: the old unrelated draft is gone locally...
        expect(store.models["pos.order"].find((o) => o.uuid === ownOrder.uuid)).toBe(undefined);
        // ...but its lines were NOT stolen and reparented onto the joined order.
        expect(joinedOrder.lines.length).toBe(0);
    });
});
