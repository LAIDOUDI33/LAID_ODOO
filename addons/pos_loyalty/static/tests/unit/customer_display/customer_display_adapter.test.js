import { test, expect } from "@odoo/hoot";
import { patchWithCleanup } from "@web/../tests/web_test_helpers";
import { getFilledOrder, setupPosEnv } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { CustomerDisplayPosAdapter } from "@point_of_sale/app/customer_display/customer_display_adapter";

definePosModels();

test("formatOrderData", async () => {
    const store = await setupPosEnv();
    const order = await getFilledOrder(store);
    const points = [{ couponId: 1, points: 10 }];
    patchWithCleanup(order, {
        getLoyaltyPoints() {
            return points;
        },
    });

    const adapter = new CustomerDisplayPosAdapter();
    adapter.formatOrderData(order);

    expect(adapter.data.loyaltyData).toBe(points);

    patchWithCleanup(order, {
        getLoyaltyPoints() {
            return false;
        },
    });

    adapter.formatOrderData(order);
    expect(adapter.data.loyaltyData).toEqual([]);
});
