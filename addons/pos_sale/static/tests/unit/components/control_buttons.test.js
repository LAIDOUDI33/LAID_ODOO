import { test, expect } from "@odoo/hoot";
import { animationFrame } from "@odoo/hoot-dom";
import { setupPosEnv } from "@point_of_sale/../tests/unit/utils";
import { mountWithCleanup } from "@web/../tests/web_test_helpers";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";

definePosModels();

test("disables Quotation / Order for self-orders", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    await mountWithCleanup(ControlButtons, { props: { showRemainingButtons: true } });

    expect("button:contains('Quotation')").not.toHaveAttribute("disabled");

    order.source = "mobile";
    await animationFrame();

    expect("button:contains('Quotation')").toHaveAttribute("disabled");
});
