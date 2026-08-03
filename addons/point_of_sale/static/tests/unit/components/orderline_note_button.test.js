import { expect, test } from "@odoo/hoot";
import { setupPosEnv, dialogActions } from "../utils";
import { definePosModels } from "../data/generate_model_definitions";
import { mountWithCleanup, contains, patchWithCleanup } from "@web/../tests/web_test_helpers";
import { click } from "@odoo/hoot-dom";
import {
    NoteButton,
    InternalNoteButton,
} from "@point_of_sale/app/screens/product_screen/control_buttons/orderline_note_button/orderline_note_button";
import { OrderSummary } from "@point_of_sale/app/screens/product_screen/order_summary/order_summary";

definePosModels();

test("orderline_note_button.js", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    const productTmplCombo = store.models["product.template"].get(7);

    const productComboSteps = [
        () => click("#article_product_8"), // Wood Chair 1/2
        () => click("#article_product_8"), // Wood Chair 2/2
        () => click("#article_product_10"), // Wood desk
        () => click(".confirm"), // Confirm combo configuration
    ];
    const lineAction = async () =>
        await store.addLineToCurrentOrder({
            product_tmpl_id: productTmplCombo,
            qty: 1,
        });
    const line = await dialogActions(lineAction, productComboSteps);
    expect(order.lines[0].qty).toBe(1);
    expect(order.lines[1].qty).toBe(2);
    expect(order.lines[2].qty).toBe(1);
    const orderSummary = await mountWithCleanup(OrderSummary, { props: {} });
    orderSummary._setValue(4);
    expect(order.lines[0].qty).toBe(4);
    expect(order.lines[1].qty).toBe(8);
    expect(order.lines[2].qty).toBe(4);
    const comp = await mountWithCleanup(InternalNoteButton, { props: { label: "" } });
    await comp.setChanges(line, '[{"1":"Test","colorIndex":0}]');
    order.updateLastOrderChange();
    orderSummary._setValue(9);

    const noteAction = async () => await comp.setChanges(line, '[{"2":"Test","colorIndex":0}]');
    await dialogActions(noteAction, productComboSteps);
    // Check quantity
    expect(order.lines[0].qty).toBe(4);
    expect(order.lines[1].qty).toBe(8);
    expect(order.lines[2].qty).toBe(4);
    expect(order.lines[3].qty).toBe(5);
    expect(order.lines[4].qty).toBe(10);
    expect(order.lines[5].qty).toBe(5);

    // Check notes (only on parent lines)
    expect(order.lines[0].note).toBe('[{"1":"Test","colorIndex":0}]');
    expect(order.lines[3].note).toBe('[{"2":"Test","colorIndex":0}]');
});

test("cancelling the general note popup does not erase the existing note", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    order.general_customer_note = "Existing note";

    const comp = await mountWithCleanup(NoteButton, { props: { label: "Note" } });
    const result = await dialogActions(
        () => comp.onClick(),
        [() => contains(".modal-footer .btn-secondary").click()]
    );

    expect(result.confirmed).toBe(false);
    expect(order.general_customer_note).toBe("Existing note");
});

test("confirming the general note popup updates the note and syncs self-orders", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    order.general_customer_note = "Existing note";
    order.source = "mobile"; // makes order.isSelfOrder true

    const syncedOrders = [];
    patchWithCleanup(store, {
        async syncAllOrders(options) {
            syncedOrders.push(...options.orders);
        },
    });

    const comp = await mountWithCleanup(NoteButton, { props: { label: "Note" } });
    const result = await dialogActions(
        () => comp.onClick(),
        [
            () => contains(".modal textarea").edit("New note"),
            () => contains(".modal-footer .btn-primary").click(),
        ]
    );

    expect(result.confirmed).toBe(true);
    expect(order.general_customer_note).toBe("New note");
    expect(syncedOrders).toEqual([order]);
});

test("cancelling the orderline note popup does not change the line's note", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    const product1 = store.models["product.template"].get(5);
    const line = await store.addLineToOrder({ product_tmpl_id: product1, qty: 1 }, order);
    line.setCustomerNote("Existing line note");
    order.selectOrderline(line);

    const comp = await mountWithCleanup(NoteButton, { props: { label: "Note" } });
    const result = await dialogActions(
        () => comp.onClick(),
        [() => contains(".modal-footer .btn-secondary").click()]
    );

    expect(result.confirmed).toBe(false);
    expect(line.getCustomerNote()).toBe("Existing line note");
});
