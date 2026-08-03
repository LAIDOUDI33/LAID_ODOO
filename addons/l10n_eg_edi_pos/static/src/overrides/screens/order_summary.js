import { OrderSummary } from "@point_of_sale/app/screens/product_screen/order_summary/order_summary";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";

patch(OrderSummary.prototype, {
    setup() {
        super.setup(...arguments);
        this.notification = useService("notification");
    },
    async setLinePrice(line, price) {
        await super.setLinePrice(line, price);
        if (!line.product_id.to_weight && line.price_unit < 0) {
            this._notifyEtaNegativeUnsupported();
        }
    },
    _setValue(val) {
        super._setValue(...arguments);
        const line = this.currentOrder.getSelectedOrderline();
        if (line && !line.refunded_orderline_id && line.qty < 0) {
            this._notifyEtaNegativeUnsupported();
        }
    },
    _notifyEtaNegativeUnsupported() {
        if (!this.pos.config.l10n_eg_edi_pos_enable) {
            return;
        }
        this.notification.add(
            _t("Negative values are not yet supported by ETA for e-Receipt submission"),
            { type: "warning" }
        );
    },
});
