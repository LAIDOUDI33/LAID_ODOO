import { test, expect } from "@odoo/hoot";
import { setupPosEnv, getFilledOrder, createPaymentLine } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { patchWithCleanup } from "@web/../tests/web_test_helpers";

definePosModels();

test("getQrPopupProps", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);
    const paymentline = createPaymentLine(store, order, display);

    patchWithCleanup(paymentline, {
        getCurrentFrameLanguage() {
            return "fr";
        },
    });

    expect(paymentline.getQrPopupProps()).toMatchObject({ frameLanguage: "fr" });
});

test("getCurrentFrameLanguage", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);
    const paymentline = createPaymentLine(store, order, display);

    // No language on the order's user: defaults to "fr".
    expect(paymentline.getCurrentFrameLanguage()).toBe("fr");

    order.user_id.lang = "nl_BE";
    expect(paymentline.getCurrentFrameLanguage()).toBe("nl");

    order.user_id.lang = "fr_FR";
    expect(paymentline.getCurrentFrameLanguage()).toBe("fr");

    // Unsupported language: falls back to "fr".
    order.user_id.lang = "en_US";
    expect(paymentline.getCurrentFrameLanguage()).toBe("fr");
});

test("handlePaymentResponse", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);
    const sticker = store.models["pos.payment.method"].get(5);

    const paymentlineDisplay = createPaymentLine(store, order, display, {
        payment_status: "pending",
        qr_code: "http://example.com/qr-display",
    });
    const paymentlineSticker = createPaymentLine(store, order, sticker, {
        payment_status: "pending",
        qr_code: "http://example.com/qr-sticker",
    });

    // Display failed payment
    const resDisplayFail = paymentlineDisplay.handlePaymentResponse(false);
    expect(resDisplayFail).toBe(false);
    expect(paymentlineDisplay.payment_status).toBe("retry");
    expect(store.customerDisplayQrData).toBe(null);

    // Sticker failed payment
    const resStickerFail = paymentlineSticker.handlePaymentResponse(false);
    expect(resStickerFail).toBe(false);
    expect(paymentlineSticker.payment_status).toBe("retry");
    expect(store.customerDisplayQrData).toBe(null);

    // Display successful payment
    const resDisplaySuccess = paymentlineDisplay.handlePaymentResponse(true);
    expect(resDisplaySuccess).toBe(false);
    expect(paymentlineDisplay.payment_status).toBe("waitingScan");
    expect(store.customerDisplayQrData.qrCode).toBe("http://example.com/qr-display");

    // Sticker successful payment
    const resStickerSuccess = paymentlineSticker.handlePaymentResponse(true);
    expect(resStickerSuccess).toBe(false);
    expect(paymentlineSticker.payment_status).toBe("waitingScan");
    expect(store.customerDisplayQrData.qrCode).toBe("http://example.com/qr-sticker");
});

test("handlePaymentCancelResponse", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);

    const opts = { payment_status: "waitingScan", qr_code: "http://example.com/qr" };
    const paymentline = createPaymentLine(store, order, display, opts);
    store.updateCustomerDisplayQrData("http://example.com/qr");

    // Failed cancellation
    const resCancelFail = paymentline.handlePaymentCancelResponse(false);
    expect(resCancelFail).toBe(false);
    expect(store.customerDisplayQrData.qrCode).toBe("http://example.com/qr");

    // Successful cancellation
    const resCancelSuccess = paymentline.handlePaymentCancelResponse(true);
    expect(resCancelSuccess).toBe(true);
    expect(store.customerDisplayQrData).toBe(null);
});

test("forceDone", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);

    const opts = { payment_status: "waitingScan", qr_code: "http://example.com/qr" };
    const paymentline = createPaymentLine(store, order, display, opts);
    store.updateCustomerDisplayQrData("http://example.com/qr");

    paymentline.forceDone();
    expect(paymentline.payment_status).toBe("done");
    expect(paymentline.qr_code).toBeEmpty();
    expect(store.customerDisplayQrData).toBe(null);
});

test("forceCancel", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const display = store.models["pos.payment.method"].get(4);

    const opts = {
        payment_status: "waitingScan",
        qr_code: "http://example.com/qr",
        bancontact_id: "bancontact_1",
    };
    const paymentline = createPaymentLine(store, order, display, opts);
    store.updateCustomerDisplayQrData("http://example.com/qr");

    paymentline.forceCancel();
    expect(paymentline.payment_status).toBe("retry");
    expect(paymentline.bancontact_id).toBeEmpty();
    expect(paymentline.qr_code).toBeEmpty();
    expect(store.customerDisplayQrData).toBe(null);
});
