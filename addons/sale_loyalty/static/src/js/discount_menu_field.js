import { patch } from "@web/core/utils/patch";
import { DiscountMenuField } from "@sale/js/discount_menu_field";

patch(DiscountMenuField.prototype, {

    async openCouponWizard() {
        this.actionService.doAction("sale_loyalty.sale_loyalty_coupon_wizard_action", {
            additionalContext: {
                active_id: this.props.record.resId,
                active_model: "sale.order",
            },
            onClose: async () => {
                await this.props.record.load();
            },
        });
    },

    async openRewardWizard() {
        const action = await this.orm.call(
            "sale.order", "action_open_reward_wizard", [this.props.record.resId]
        );
        if (typeof action === "object") {
            await this.actionService.doAction(action, {
                onClose: async () => {
                    await this.props.record.load();
                },
            });
        }
    },
});
