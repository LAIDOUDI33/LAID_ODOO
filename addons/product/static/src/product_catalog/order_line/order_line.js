import { _t } from "@web/core/l10n/translation";
import { onWillRender } from "@web/owl2/utils";
import { Component, onMounted, Portal, signal } from "@odoo/owl";
import { formatFloat, formatMonetary } from "@web/views/fields/formatters";

export class ProductCatalogOrderLine extends Component {
    static template = "product.ProductCatalogOrderLine";
    static props = {
        isSample: { type: Boolean, optional: true },
        productId: Number,
        quantity: Number,
        minimumQuantity: { type: Number, optional: true },
        price: Number,
        uomId: { type: Number, optional: true },
        productUomId: { type: Number, optional: true },
        availableUoms: { type: Array, optional: true },
        code: { type: String, optional: true },
        readOnly: { type: Boolean, optional: true },
        warning: { type: String, optional: true },
    };
    static components = { Portal };

    portalTarget = signal(null);
    rev = 0;

    setup() {
        this.hasMultipleUoms = this.props.availableUoms && this.props.availableUoms.length > 1;
        onMounted(() => {
            this.portalTarget.set(document.querySelector(`#product-${this.props.productId}-price`));
        });
        onWillRender(() => {
            this.rev++;
        });
    }

    /**
     * Focus input text when clicked
     * @param {Event} ev
     */
    _onFocus(ev) {
        ev.target.select();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    isInOrder() {
        return this.props.quantity !== 0;
    }

    get disableRemove() {
        return false;
    }

    get disabledButtonTooltip() {
        if (this.disableRemove) {
            return _t(
                "You cannot decrease the quantity below %(minimum_quantity)s.",
                { minimum_quantity : this.props.minimumQuantity }
            );
        }
        return "";
    }

    get price() {
        const { currencyId, digits } = this.env;
        return formatMonetary(this.props.price, { currencyId, digits });
    }

    get productUnitPrice() {
        const { currencyId, digits } = this.env;
        const productUnitPrice = this.props.price * (this.productUomFactor || 1);
        return formatMonetary(productUnitPrice, { currencyId, digits });
    }

    get quantity() {
        const digits = [false, this.env.precision];
        const options = { digits, decimalPoint: ".", thousandsSep: "" };
        return parseFloat(formatFloat(this.props.quantity, options));
    }

    get uom() {
        return this.props.availableUoms?.find((elem) => elem.id == this.props.uomId);
    }

    get uomDisplayName() {
        return this.uom.display_name;
    }

    get productUom() {
        return this.props.availableUoms?.find((elem) => elem.id == this.props.productUomId)
    }

    get productUomDisplayName() {
        return this.productUom.display_name;
    }

    get productUomFactor() {
        return this.productUom.factor / this.uom.factor;
    }

    get uomSelectStyle() {
        const name = this.props.uomDisplayName || "";
        return `width: ${name.length + 5}ch;`;
    }

    onUomChange(ev) {
        this.env.setUom(parseInt(ev.target.value));
    }

    get showPrice() {
        return true;
    }

    get displayPriceByProductUoM() {
        return (
            this.uomDisplayName != this.productUomDisplayName
            && this.productUnitPrice
            && this.productUomDisplayName
            && this.showPrice
        );
    }
}
