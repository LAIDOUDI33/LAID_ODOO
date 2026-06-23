import { registry } from "@web/core/registry";
import { FilterableSelectionField, filterableSelectionField } from "@web/views/fields/selection/filterable_selection_field";

class NonFocusableSelectionField extends FilterableSelectionField {
    static template = "account_peppol.NonFocusableSelectionField";
}

export const nonFocusableSelectionField = {
    ...filterableSelectionField,
    component: NonFocusableSelectionField,
};

registry.category("fields").add("peppol_non_focusable_selection", nonFocusableSelectionField);
