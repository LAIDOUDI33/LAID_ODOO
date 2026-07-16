import { test, expect } from "@odoo/hoot";
import { getFilledOrder, setupPosEnv, createPaymentLine } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";

definePosModels();

test("getQrPopupProps", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const card = store.models["pos.payment.method"].get(2);
    const paymentline = createPaymentLine(store, order, card);

    const props = paymentline.getQrPopupProps();
    expect(props.paymentMethod.id).toBe(card.id);
    expect(props.order.uuid).toBe(order.uuid);
});
