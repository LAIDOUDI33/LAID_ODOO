import { _t } from "@web/core/l10n/translation";
import { OrderSummary } from "@point_of_sale/app/screens/product_screen/order_summary/order_summary";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ManageGiftCardPopup } from "@pos_loyalty/app/components/popups/manage_giftcard_popup/manage_giftcard_popup";

patch(OrderSummary.prototype, {
    /**
     * A loyalty reward line removes itself as soon as its quantity reaches 0 (see the
     * `pos.order.line` setQuantity override), which then auto-selects the next line. This
     * will reset the numpad buffer whenver a line is removed
     */
    async updateSelectedOrderline(params) {
        const order = this.pos.getOrder();
        const editedLine = order?.getSelectedOrderline();
        if (editedLine?.gift_code && params.key !== "Backspace" && params.key !== "Delete") {
            this.dialog.add(AlertDialog, {
                title: _t("Gift Card"),
                body: _t("You cannot change the quantity or the price of a physical gift card."),
            });
            return;
        }
        const editedRewardId = editedLine?.is_reward_line ? editedLine.reward_id?.id : null;
        await super.updateSelectedOrderline(params);
        if (
            editedRewardId &&
            order &&
            !order.getOrderlines().some((line) => line.reward_id?.id === editedRewardId)
        ) {
            this.numberBuffer.reset();
            this.pos.numpadMode = "quantity";
        }
    },
    /**
     * Turn a gift-card sale line into a physical gift card: the cashier enters the card's
     * printed code and amount. The code is client-only and is read into the
     * `create_pos_cards` request at validation, where the real card is created/resolved
     * with it.
     */
    manageGiftCard(line) {
        this.dialog.add(ManageGiftCardPopup, {
            title: _t("Sell/Manage physical gift card"),
            placeholder: _t("Enter Gift Card Number"),
            line,
            getPayload: (code, amount) => {
                code = code.trim();
                amount = parseFloat(amount);
                if (isNaN(amount)) {
                    return;
                }
                // A card code is unique: reject it when another line on this order already
                // claims it, otherwise both lines would try to create the same card.
                const duplicate = this.currentOrder
                    .getOrderlines()
                    .some((other) => other !== line && other.gift_code === code);
                if (duplicate) {
                    this.dialog.add(AlertDialog, {
                        title: _t("Validation Error"),
                        body: _t("A coupon/loyalty card must have a unique code."),
                    });
                    return;
                }
                line.setUnitPrice(amount);
                line.gift_code = code;
                this.pos.selectOrderLine(this.currentOrder, line);
            },
        });
    },
});
