import { test, expect } from "@odoo/hoot";
import { mountWithCleanup } from "@web/../tests/web_test_helpers";
import { ProductCard } from "@pos_self_order/app/components/product_card/product_card";
import { setupSelfPosEnv } from "../utils";
import { definePosSelfModels } from "../data/generate_model_definitions";

definePosSelfModels();

test("selectProduct", async () => {
    const store = await setupSelfPosEnv();
    store.computeAvailableCategories();
    const models = store.models;

    {
        const product = models["product.template"].get(5);
        const comp = await mountWithCleanup(ProductCard, {
            props: { product },
        });

        comp.selectProduct();
        expect(store.currentOrder.lines).toHaveLength(1);
        expect(store.currentOrder.lines[0].product_id.id).toBe(5);
    }
    {
        // Will not add the product, it will redirect to combo selection page
        const comboProduct = models["product.template"].get(7);
        const comp = await mountWithCleanup(ProductCard, {
            props: { product: comboProduct },
        });

        comp.selectProduct();
        expect(store.currentOrder.lines).toHaveLength(1);

        // Combo Product with one choice
        models["product.combo.item"].get(1).delete();
        models["product.combo.item"].get(4).delete();
        comboProduct.combo_ids.forEach((c) => (c.qty_max = 1));
        comp.selectProduct();
        // Combo parent + 2 children products + first line
        expect(store.currentOrder.lines).toHaveLength(4);
    }
});
