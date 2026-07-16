import { patch } from "@web/core/utils/patch";
import { GeneratePrinterData } from "@point_of_sale/app/utils/printer/generate_printer_data";

/**
 * This class is a JS copy of the class PosOrderReceipt in Python.
 */
patch(GeneratePrinterData.prototype, {
    generateReceiptData() {
        const data = super.generateReceiptData(...arguments);
        data.conditions.from_self = ["mobile", "kiosk"].includes(this.order.source);
        return data;
    },
    generateDynamicQrData({ qrCode }) {
        return {
            company: this.company.raw,
            config: this.config.raw,
            order: this.order.raw,
            image: {
                logo: this.config.receiptLogoUrl,
            },
            qrCode,
            extra_data: {
                ...this.commonExtraData,
                cashier_name: this.order.getCashierName(),
                formated_date_order: this.order.formatDateOrTime("date_order", "datetime"),
                table_name: this.order.table_id?.getName(),
            },
        };
    },
});
