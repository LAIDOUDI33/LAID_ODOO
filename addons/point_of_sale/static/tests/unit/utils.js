import { uuidv4 } from "@point_of_sale/utils";
import {
    assignDialogTestEnv,
    contains,
    getService,
    makeTestApp,
    mountWithCleanup,
    patchWithCleanup,
    onRpc,
} from "@web/../tests/web_test_helpers";
import { animationFrame, tick, waitFor, waitUntil } from "@odoo/hoot-dom";
import { mountPosApp } from "@point_of_sale/../tests/unit/ui_utils";
import { expect } from "@odoo/hoot";
import { MainComponentsContainer } from "@web/core/main_components_container";

const { DateTime } = luxon;

export const setupPosEnv = async (opts = { setupCashier: true }) => {
    // Do not change these variables, they are in accordance with the demo data
    odoo.pos_session_id = 1;
    odoo.pos_config_id = 1;
    odoo.from_backend = 0;
    odoo.access_token = uuidv4(); // Avoid indexedDB conflicts
    odoo.info = {
        db: `pos-${uuidv4()}`, // Avoid indexedDB conflicts
        isEnterprise: true,
        server_version: "1.0",
    };

    assignDialogTestEnv();
    await makeTestApp();
    onRpc("/css", () => "");
    const store = getService("pos");
    if (opts.setupCashier) {
        store.setCashier(store.user);
    }
    patchWithCleanup(store.router, {
        navigate(routeName, routeParams = {}) {
            this.state.current = routeName;
            this.state.params = routeParams;
        },
    });
    return store;
};

export const getFilledOrder = async (store, data = {}, paid = false, refund = false) => {
    const order = store.addNewOrder(data);
    const product1 = store.models["product.template"].get(5);
    const product2 = store.models["product.template"].get(6);
    let refund1 = false;
    let refund2 = false;

    if (refund) {
        order.is_refund = true;
        const refundedOrder = store.models["pos.order"].create({
            id: `refund_${order.id}`,
            name: `Refund by ${order.name}`,
            pos_session_id: store.session,
            pos_config_id: store.config,
            amount_paid: 185,
            amount_total: 185,
            state: "paid",
        });
        order.refunded_order_id = refundedOrder;
        refund1 = store.models["pos.order.line"].create({
            product_id: product1.product_variant_ids[0],
            price_unit: product1.list_price,
            order_id: refundedOrder,
            qty: 3,
        });
        refund2 = store.models["pos.order.line"].create({
            product_id: product2.product_variant_ids[0],
            price_unit: product2.list_price,
            order_id: refundedOrder,
            qty: 2,
        });
    }
    const date = DateTime.now();
    order.write_date = date;
    order.create_date = date;

    await store.addLineToOrder(
        {
            product_tmpl_id: product1,
            qty: refund ? -3 : 3,
            write_date: date,
            create_date: date,
            refunded_orderline_id: refund1,
        },
        order
    );
    await store.addLineToOrder(
        {
            product_tmpl_id: product2,
            qty: refund ? -2 : 2,
            refunded_orderline_id: refund2,
            write_date: date,
            create_date: date,
        },
        order
    );

    if (paid) {
        const amountTotal = order.priceIncl;
        order.state = "paid";

        store.models["pos.payment"].create({
            amount: amountTotal,
            pos_order_id: order,
            payment_method_id: store.models["pos.payment.method"].find((m) => m.name === "Cash"),
        });
    }

    store.addPendingOrder([order.id]);
    return order;
};

export const makeOrder = (store, overrides = {}) => {
    const order = store.createNewOrder();
    Object.assign(order, {
        state: "draft",
        date_order: DateTime.now(),
        pos_reference: "Order 00001",
        getScreenData: () => ({ name: "ProductScreen" }),
        ...overrides,
    });
    return order;
};

export async function waitUntilOrdersSynced(store, options) {
    await waitUntil(() => !store.syncingOrders.size, options);
    await tick();
}

export const mountPosDialog = async (component, props) => {
    const dialog = getService("dialog");
    const root = await mountWithCleanup(MainComponentsContainer);
    const getComponentInstance = (root) => {
        const flattenedChildren = (comp, acc = {}) => {
            for (const child of Object.values(comp.children)) {
                acc[child.componentName] = child;
                flattenedChildren(child, acc);
            }
            return acc;
        };
        const components = flattenedChildren(root);
        return components[component.name];
    };
    dialog.add(component, props);

    const dialogNode = await waitUntil(() => getComponentInstance(root.__owl__));
    return dialogNode.component;
};

export const expectFormattedPrice = (value, expected) => {
    expect(value).toBe(expected.replaceAll(" ", "\u00a0"));
};

export const dialogActions = async (action, steps = []) => {
    // Launch the action in a promise to be able to await the end of the steps
    await mountWithCleanup(MainComponentsContainer);
    const promise = new Promise((resolve) => {
        const call = async (fn) => {
            const result = await fn();
            resolve(result);
        };
        call(action);
    });

    // Wait for the dialog to be mounted
    await waitFor(".o_dialog");

    // Execute the steps one by one
    for (const step of steps) {
        await step();
        await animationFrame();
    }

    // Return the result of the action
    return await promise;
};

export const createPaymentLine = (store, order, paymentMethod, data = {}) =>
    store.models["pos.payment"].create({
        amount: 10,
        payment_method_id: paymentMethod.id,
        pos_order_id: order.id,
        write_date: DateTime.now(),
        create_date: DateTime.now(),
        ...data,
    });

export const activateMountingDialogs = async (env) => {
    await mountWithCleanup(MainComponentsContainer, { env });
};

export const normalizeFunctionsInObject = (obj) =>
    Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key,
            typeof value === "function" ? "function" : value,
        ])
    );

export async function setupAndMountPosApp(config = {}, opts = { openRegister: true }) {
    const store = await setupPosEnv();
    Object.assign(store.config, config);
    await mountPosApp(store);

    if (opts.openRegister) {
        await contains(".screen-login .btn.open-register-btn").click();
        await animationFrame();
    }

    return store;
}
