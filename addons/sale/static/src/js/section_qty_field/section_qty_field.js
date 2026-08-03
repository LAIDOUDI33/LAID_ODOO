import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useRecordObserver } from "@web/model/relational_model/utils";
import { useEnv } from "@web/owl2/utils";
import { FloatField, floatField } from "@web/views/fields/float/float_field";

export class SectionQtyField extends FloatField {
    setup() {
        super.setup();
        this.env = useEnv();
        useRecordObserver((record) => {
            const quantity = record.data[this.props.name];
            if (![undefined, quantity, 0].includes(this.lastQuantity)) {
                const ratio = quantity / this.lastQuantity;
                void this.env.updateSectionLinesQty(record, ratio);
            }
            this.lastQuantity = quantity;
        });
    }
}

export const sectionQtyField = {
    ...floatField,
    component: SectionQtyField,
    displayName: _t("Section Quantity"),
    supportedTypes: ["float"],
};

registry.category("fields").add("section_qty", sectionQtyField);
