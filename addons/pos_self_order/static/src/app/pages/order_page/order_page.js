import { Component, onMounted, props, t } from "@odoo/owl";
import { useSelfOrder } from "@pos_self_order/app/services/self_order_service";
import { useService } from "@web/core/utils/hooks";

export class OrderPage extends Component {
    static template = "pos_self_order.OrderPage";
    props = props({ orderAccessToken: t.string() });

    setup() {
        this.selfOrder = useSelfOrder();
        this.router = useService("router");

        onMounted(async () => {
            await this.initOrder();
        });
    }

    async initOrder(retry = true) {
        const order = this.selfOrder.models["pos.order"].find(
            (o) => o.access_token === this.props.orderAccessToken
        );

        if (!order && retry) {
            await this.selfOrder.getUserDataFromServer([this.props.orderAccessToken], {
                pushOrphanedLines: false,
            });
            return this.initOrder(false);
        }

        this.selfOrder.selectedOrderUuid = null;
        if (order?.state === "draft") {
            this.selfOrder.selectedOrderUuid = order.uuid;
        }
        this.router.navigate("default");
    }
}
