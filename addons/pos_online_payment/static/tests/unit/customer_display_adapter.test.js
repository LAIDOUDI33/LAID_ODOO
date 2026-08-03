import { test, expect } from "@odoo/hoot";
import { getFilledOrder, setupPosEnv } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { CustomerDisplayPosAdapter } from "@point_of_sale/app/customer_display/customer_display_adapter";

definePosModels();

test("formatOrderData", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);

    const adapter = new CustomerDisplayPosAdapter();
    adapter.formatOrderData(order);
    expect(adapter.data.onlinePaymentData).toEqual({});

    order.onlinePaymentData = { status: "pending" };
    adapter.formatOrderData(order);
    expect(adapter.data.onlinePaymentData).toEqual({ status: "pending" });
});
