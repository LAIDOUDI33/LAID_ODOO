import { patch } from "@web/core/utils/patch";
import { PosTicketPrinterService } from "@point_of_sale/app/services/pos_ticket_printer_service";

patch(PosTicketPrinterService.prototype, {
    async printDynamicQrReceipt({ order, qrCode, url, webFallback = true } = {}) {
        const generator = this.getGenerator({ models: this.data.models, order });
        const data = generator.generateDynamicQrData({ qrCode, url });
        const iframe = await this.generateIframe("pos_self_order.DynamicQrReceipt", data);
        return await this.printWithFallback({ iframe, webFallback });
    },
});
