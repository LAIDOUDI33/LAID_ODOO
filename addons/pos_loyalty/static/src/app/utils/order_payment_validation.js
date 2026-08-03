import OrderPaymentValidation from "@point_of_sale/app/utils/order_payment_validation";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(OrderPaymentValidation.prototype, {
    async finalizeValidation() {
        // Validation has passed but the order isn't sent yet: create the gift card / eWallet
        // cards funded by this order now, so each line carries a real card_id when it syncs.
        if (!(await this.createPaymentProgramCards())) {
            return false;
        }
        return super.finalizeValidation(...arguments);
    },
    /**
     * Resolve the payment-program marker (`payment_program_id`) left on trigger-product lines
     * into real loyalty cards and stamp them on the lines. Deferred to here (instead of at
     * add-line time) so we never create cards for orders that get edited or abandoned.
     * @returns {Promise<boolean>} false when creation failed and the order must not be sent.
     */
    async createPaymentProgramCards() {
        const lines = this.order
            .getOrderlines()
            .filter((line) => line.payment_program_id && !line.card_id);
        if (!lines.length) {
            return true;
        }
        const requests = lines.map((line) => ({
            program_id: line.payment_program_id.id,
            partner_id: this.order.getPartner()?.id || false,
            code: line.gift_code || false,
        }));
        try {
            const result = await this.pos.data.call("loyalty.card", "create_pos_cards", [
                requests,
                this.pos.config.id,
            ]);
            const payload = { "loyalty.card": result["loyalty.card"] };
            this.pos.data.synchronizeServerDataInIndexedDB(payload);
            this.pos.models.loadConnectedData(payload);
            result.card_ids.forEach((cardId, index) => {
                lines[index].card_id = this.pos.models["loyalty.card"].get(cardId);
            });
            return true;
        } catch (error) {
            this.pos.dialog.add(AlertDialog, {
                title: _t("Loyalty card creation failed"),
                body:
                    error?.data?.message ||
                    error?.message ||
                    _t("The gift card or eWallet could not be created. Please try again."),
            });
            return false;
        }
    },
});
