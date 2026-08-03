import { expect, test } from "@odoo/hoot";
import { press } from "@odoo/hoot-dom";
import { advanceTime } from "@odoo/hoot-mock";
import { setupAndMountPosApp } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import * as PosUiUtils from "@point_of_sale/../tests/unit/ui_utils";
import * as DiscountUiUtils from "@pos_discount/../tests/unit/ui_utils";

const Utils = { ...PosUiUtils, ...DiscountUiUtils };

definePosModels();

test("pos_discount_numpad: apply a fixed then a percentage global discount", async () => {
    const store = await setupAndMountPosApp(Utils.NON_RESTAURANT_POS_CONFIG);
    store.config.discount_pc = 20;
    Utils.setFlatProductPrice(store, 25);

    await Utils.clickDisplayedProduct("TEST");
    await Utils.sendBufferKeys("4");

    const order = store.getOrder();
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0].qty).toBe(4);
    expect(order.totalDue).toBe(100);

    // The popup starts on the configured percentage.
    await Utils.openDiscountPopup();
    expect(Utils.dialogTitle()).toBe("Discount");
    expect(Utils.numberPopupValue()).toBe("20 %");

    await Utils.sendBufferKeys("1", "0");
    await Utils.clickNumberPopupType("fixed");
    expect(Utils.selectedNumberPopupType()).toBe("fixed");
    expect(Utils.numberPopupValue()).toBe("$ 10.00");

    await press("Enter");
    expect(Utils.discountLines(order)).toHaveLength(1);
    expect(order.globalDiscountPc).toEqual({ value: 10, type: "fixed" });
    expect(order.totalDue).toBe(90);
    await advanceTime(150);
    expect(Utils.getOrderTotal()).toInclude("90");

    // Reopening the popup starts over from the configured percentage.
    await Utils.openDiscountPopup();
    expect(Utils.numberPopupValue()).toBe("20 %");

    await Utils.sendBufferKeys("2", "5");
    expect(Utils.selectedNumberPopupType()).toBe("percent");
    expect(Utils.numberPopupValue()).toBe("25 %");

    await press("Enter");
    expect(Utils.discountLines(order)).toHaveLength(1);
    expect(order.globalDiscountPc).toEqual({ value: 25, type: "percent" });
    expect(order.totalDue).toBe(75);
    await advanceTime(150);
    expect(Utils.getOrderTotal()).toInclude("75");

    await Utils.clickControlButton("Cancel Order");
    await Utils.confirmDialog();
    expect(store.getOrder().lines).toHaveLength(0);
});
