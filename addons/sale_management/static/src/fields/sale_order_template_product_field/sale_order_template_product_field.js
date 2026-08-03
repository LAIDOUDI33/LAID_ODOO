import { registry } from "@web/core/registry";
import { serializeDateTime, today } from "@web/core/l10n/dates";
import {
    SaleOrderLineProductField,
    saleOrderLineProductField,
} from "@sale/js/sale_product_field/sale_product_field";

export class SaleOrderTemplateLineProductField extends SaleOrderLineProductField {
    get isProductClickable() {
        return false;
    }

    _getOrderLines() {
        return this.props.record.model.root.data.sale_order_template_line_ids;
    }

    _getSoDate() {
        return serializeDateTime(today());
    }

    _getAdditionalDialogProps() {
        const props = super._getAdditionalDialogProps();
        // A quotation template has no customer/company context, so prices are
        // not relevant here (and the currency would be ambiguous for templates
        // shared across companies). Hide prices in the configurator.
        props.options = { ...props.options, showPrice: false };
        return props;
    }

    _getAdditionalRpcParams() {
        // Prices are hidden in the configurator for templates (see `_getAdditionalDialogProps`),
        // so skip server-side price computation entirely.
        return { ...super._getAdditionalRpcParams(), show_price: false };
    }

    _openGridConfigurator(edit = false, data) {
        // Grid/matrix selection isn't supported for templates, use the regular dialog instead.
        return this._openProductConfigurator({ edit, data });
    }
}

export const saleOrderTemplateProductField = {
    ...saleOrderLineProductField,
    component: SaleOrderTemplateLineProductField,
    fieldDependencies: [
        { name: "product_id", type: "many2one" },
        { name: "product_uom_id", type: "many2one" },
        { name: "product_uom_qty", type: "float" },
        { name: "is_configurable_product", type: "boolean" },
        { name: "product_template_attribute_value_ids", type: "many2many" },
    ],
};

registry.category("fields").add("sotl_product_many2one", saleOrderTemplateProductField);
