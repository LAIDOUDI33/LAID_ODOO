import { PosStore } from "@point_of_sale/app/services/pos_store";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(PosStore.prototype, {
    setPartnerToCurrentOrder(partner) {
        if (this.config.l10n_eg_edi_pos_enable && partner?.is_company) {
            this.dialog.add(AlertDialog, {
                title: _t("ETA Error"),
                body: _t(
                    "ETA receipts are not applicable to Company Customers. Please create an Invoice for them and synchronize it to the ETA by going to Accounting > Invoices."
                ),
            });
            return;
        }
        return super.setPartnerToCurrentOrder(...arguments);
    },
});
