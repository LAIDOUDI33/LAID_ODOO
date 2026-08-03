import { models } from "@web/../tests/web_test_helpers";

export class ProductTemplateAttributeLine extends models.ServerModel {
    _name = "product.template.attribute.line";

    _load_pos_data_fields() {
        return ["display_name", "attribute_id", "product_template_value_ids"];
    }

    _load_pos_data_dependencies() {
        return ["product.template", "product.template.attribute.value"];
    }

    _records = [
        {
            id: 3,
            attribute_id: 10,
            product_template_value_ids: [5, 6],
            write_date: "2023-06-01 10:00:00",
        },
        {
            id: 4,
            attribute_id: 11,
            product_template_value_ids: [7],
            write_date: "2023-06-01 10:00:00",
        },
        {
            id: 5,
            attribute_id: 7,
            product_template_value_ids: [8, 9],
            write_date: "2023-06-01 10:00:00",
        },
        {
            id: 6,
            attribute_id: 12,
            product_template_value_ids: [10],
            write_date: "2023-06-01 10:00:00",
        },
    ];
}
