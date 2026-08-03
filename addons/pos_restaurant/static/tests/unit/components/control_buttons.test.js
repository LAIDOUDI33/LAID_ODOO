import { expect, test } from "@odoo/hoot";
import { animationFrame } from "@odoo/hoot-dom";
import { mountWithCleanup } from "@web/../tests/web_test_helpers";
import { setupPosEnv } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";

definePosModels();

test("showAddCourse", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    const comp = await mountWithCleanup(ControlButtons, { props: {} });

    expect(comp.showAddCourse).toBe(true);

    store.config.module_pos_restaurant = false;
    expect(comp.showAddCourse).toBe(false);
    store.config.module_pos_restaurant = true;
    order.is_refund = true;
    expect(comp.showAddCourse).toBe(false);
    order.is_refund = false;

    store.config.use_course_allocation = true;
    expect(comp.showAddCourse).toBe(false);
    store.config.use_course_allocation = false;

    const compWithRemainingButtons = await mountWithCleanup(ControlButtons, {
        props: { showRemainingButtons: true },
    });
    expect(compWithRemainingButtons.showAddCourse).toBe(false);
});

test("disables Transfer/Merge, Transfer Course and Set Order Name for self-orders", async () => {
    const store = await setupPosEnv();
    const order = store.addNewOrder();
    store.addCourse();
    await mountWithCleanup(ControlButtons, { props: { showRemainingButtons: true } });

    expect("button:contains('Transfer / Merge')").not.toHaveAttribute("disabled");
    expect("button:contains('Transfer Course')").not.toHaveAttribute("disabled");
    expect("button:contains('Set Order Name')").not.toHaveAttribute("disabled");

    order.source = "mobile";
    await animationFrame();

    expect("button:contains('Transfer / Merge')").toHaveAttribute("disabled");
    expect("button:contains('Transfer Course')").toHaveAttribute("disabled");
    expect("button:contains('Set Order Name')").toHaveAttribute("disabled");
});
