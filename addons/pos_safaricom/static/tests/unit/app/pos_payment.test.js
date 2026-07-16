import { test, expect } from "@odoo/hoot";
import { setupPosEnv, getFilledOrder, createPaymentLine } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";

definePosModels();

test("getQrPopupProps", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const paymentMethod = store.models["pos.payment.method"].get(1);
    const paymentline = createPaymentLine(store, order, paymentMethod, { qr_code: "test-qr" });

    expect(paymentline.getQrPopupProps()).toEqual({
        qrCode: "test-qr",
        amount: "$\u00a010.00",
        provider: paymentMethod.payment_provider,
        name: paymentMethod.name,
    });
});
