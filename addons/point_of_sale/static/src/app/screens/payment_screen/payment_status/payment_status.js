import { Component, props, t } from "@odoo/owl";
import { PriceFormatter } from "@point_of_sale/app/components/price_formatter/price_formatter";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { _t } from "@web/core/l10n/translation";

export class PaymentScreenStatus extends Component {
    static template = "point_of_sale.PaymentScreenStatus";
    props = props({
        order: t.instanceOf(PosOrder),
    });
    static components = { PriceFormatter };

    setup() {
        this.pos = usePos();
    }

    get currentTip() {
        return this.pos.getTip();
    }

    get tipLabel() {
        let label = "Tip";
        if (this.currentTip.type === "percent") {
            label = _t(`Tip (%s%)`, this.currentTip.value);
        }
        return label;
    }

    get tipText() {
        return this.env.utils.formatCurrency(this.currentTip.amount);
    }

    get changeText() {
        return this.env.utils.formatCurrency(this.props.order.getChange());
    }

    get isComplete() {
        return this.order.hasRemainingDue && this.order.orderHasZeroRemaining;
    }

    get isIncompleteAndPositive() {
        return !this.isComplete && this.order.remainingDue > 0;
    }

    get order() {
        return this.props.order;
    }

    get showStatus() {
        return Boolean(this.order.remainingDue || this.order.change);
    }

    get amountText() {
        return this.env.utils.formatCurrency(this.order.remainingDueAmount);
    }
}
