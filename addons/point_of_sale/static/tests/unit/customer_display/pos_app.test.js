import { test, expect } from "@odoo/hoot";
import { animationFrame } from "@odoo/hoot-dom";
import { setupAndMountPosApp, getFilledOrder, createPaymentLine } from "../utils";
import { definePosModels } from "../data/generate_model_definitions";

definePosModels();

test("customer display QR is cleared when the selected order changes", async () => {
    const store = await setupAndMountPosApp();
    const orderA = store.getOrder();
    const orderB = await getFilledOrder(store);

    store.setOrder(orderA);
    await animationFrame();

    store.updateCustomerDisplayQrData("data:image/png;base64,fakeqr");
    await animationFrame();
    expect(store.customerDisplayQrData?.qrCode).toBe("data:image/png;base64,fakeqr");

    // Switching to a different order must drop the previous order's QR
    store.setOrder(orderB);
    await animationFrame();

    expect(store.customerDisplayQrData).toBe(null);
});

test("customer display QR falls back to the new order's selected in-progress QR payment", async () => {
    const store = await setupAndMountPosApp();
    const orderA = store.getOrder();
    const orderB = await getFilledOrder(store);

    const paymentMethod = store.models["pos.payment.method"].get(1);
    const payment = createPaymentLine(store, orderB, paymentMethod, {
        qr_code: "data:image/png;base64,orderb-qr",
        payment_status: "waitingScan",
    });
    orderB.selectPaymentline(payment);

    store.setOrder(orderA);
    await animationFrame();
    store.updateCustomerDisplayQrData("data:image/png;base64,ordera-qr");
    await animationFrame();
    expect(store.customerDisplayQrData?.qrCode).toBe("data:image/png;base64,ordera-qr");

    // Switching to orderB must show ITS own in-progress QR payment, not just clear to null.
    store.setOrder(orderB);
    await animationFrame();

    expect(store.customerDisplayQrData?.qrCode).toBe("data:image/png;base64,orderb-qr");
});

test("customer display QR survives an unrelated re-render of the same order", async () => {
    const store = await setupAndMountPosApp();
    const order = store.getOrder();
    store.setOrder(order);
    await animationFrame();

    store.updateCustomerDisplayQrData("data:image/png;base64,fakeqr");
    await animationFrame();

    // Re-assigning the same order must not clear the QR, only an actual order change should.
    store.setOrder(order);
    await animationFrame();

    expect(store.customerDisplayQrData?.qrCode).toBe("data:image/png;base64,fakeqr");
});
