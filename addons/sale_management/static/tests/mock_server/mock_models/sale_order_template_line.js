import { fields, models } from "@web/../tests/web_test_helpers";

export class SaleOrderTemplateLine extends models.ServerModel {
    _name = "sale.order.template.line";

    label = fields.Text({
        compute: "_computeProductAndDescription",
        readonly: false,
    });

    // directly set `name` to `label` to avoid complications with `display_name`
    _computeProductAndDescription() {
        for (const record of this) {
            record.label = record.name;
        }
    }
}
