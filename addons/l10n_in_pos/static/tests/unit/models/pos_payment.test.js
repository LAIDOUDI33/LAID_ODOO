import { test, expect } from "@odoo/hoot";
import { getFilledOrder, setupPosEnv, createPaymentLine } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";

definePosModels();

test("getQrPopupProps", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const card = store.models["pos.payment.method"].get(2);
    const paymentline = createPaymentLine(store, order, card);

    let props = paymentline.getQrPopupProps();
    expect(props.paymentMethod.upi_identifier).toBe("");
    expect(props.paymentMethod._qr_payment_icon_urls).toEqual([]);

    card.upi_identifier = "merchant@upi";
    card._qr_payment_icon_urls = [[1, "/icon1.png"]];
    props = paymentline.getQrPopupProps();
    expect(props.paymentMethod.upi_identifier).toBe("merchant@upi");
    expect(props.paymentMethod._qr_payment_icon_urls).toEqual([[1, "/icon1.png"]]);
});
