import { Many2OneUomField } from "@uom/components/many2one_uom/many2one_uom_field";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useRecordObserver } from "@web/model/relational_model/utils";
import { useEnv } from "@web/owl2/utils";
import { buildM2OFieldDescription } from "@web/views/fields/many2one/many2one_field";

export function hasCommonReference(uom1, uom2) {
    const reference1 = uom1.parent_path.split("/", 1)[0];
    return reference1 !== undefined && reference1 === uom2.parent_path.split("/", 1)[0];
}

export class SectionUomField extends Many2OneUomField {
    setup() {
        super.setup();
        this.env = useEnv();
        useRecordObserver((record) => {
            const uom = record.data[this.props.name];
            if (
                uom?.factor !== undefined
                && ![undefined, uom.factor, 0].includes(this.lastUom?.factor)
                && hasCommonReference(this.lastUom, uom)
            ) {
                const ratio = uom.factor / this.lastUom.factor;
                void this.env.updateSectionLinesQty(record, ratio);
            }
            this.lastUom = uom;
        });
    }
}

const m2oUomField = registry.category("fields").get("many2one_uom");
export const sectionUomField = {
    ...m2oUomField,
    ...buildM2OFieldDescription(SectionUomField),
    displayName: _t("Section UoM"),
    relatedFields: [
        { name: "factor", type: "float" },
        { name: "parent_path", type: "char" },
    ],
};

registry.category("fields").add("section_uom", sectionUomField);
