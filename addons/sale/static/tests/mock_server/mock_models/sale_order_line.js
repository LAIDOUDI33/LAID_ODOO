import { fields, models } from "@web/../tests/web_test_helpers";

export class SaleOrderLine extends models.ServerModel {
    _name = "sale.order.line";

    product_and_description = fields.Text({
        compute: "_computeProductAndDescription",
    });

    // directly set `name` to `product_and_description` to avoid complications with `display_name`
    _computeProductAndDescription() {
        for (const record of this) {
            record.product_and_description = record.name;
        }
    }
}
