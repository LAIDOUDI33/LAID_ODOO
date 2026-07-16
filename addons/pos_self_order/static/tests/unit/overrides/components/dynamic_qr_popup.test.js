import { expect, test } from "@odoo/hoot";
import { mountWithCleanup, patchWithCleanup } from "@web/../tests/web_test_helpers";
import { getFilledOrder } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { setupPoSEnvForSelfOrder } from "@pos_self_order/../tests/unit/utils";
import { DynamicQrPopup } from "@pos_self_order/overrides/components/dynamic_qr_popup/dynamic_qr_popup";

definePosModels();

test("printQrCode builds the receipt data and prints it", async () => {
    const store = await setupPoSEnvForSelfOrder();
    const order = await getFilledOrder(store);
    const table = store.models["restaurant.table"].get(2);
    order.table_id = table;

    let capturedTemplate = null;
    let capturedData = null;
    let printedIframe = null;
    patchWithCleanup(store.ticketPrinter, {
        async generateIframe(template, data) {
            capturedTemplate = template;
            capturedData = data;
            return "fake_iframe";
        },
        async printWithFallback({ iframe }) {
            printedIframe = iframe;
        },
    });

    const comp = await mountWithCleanup(DynamicQrPopup, {
        props: {
            qrCode: "data:image/png;base64,fakeqr",
            url: "http://example.com/pos-self/1/order/abc",
            order,
        },
    });

    await comp.printQrCode();

    expect(printedIframe).toBe("fake_iframe");
    expect(capturedTemplate).toBe("pos_self_order.DynamicQrReceipt");
    expect(capturedData).toMatchObject({
        order: order.raw,
        qrCode: "data:image/png;base64,fakeqr",
        extra_data: {
            vat_label: "TIN",
            cashier_name: order.getCashierName(),
            formated_date_order: order.formatDateOrTime("date_order", "datetime"),
            table_name: table.getName(),
        },
    });
    expect(capturedData.company).toEqual(store.company.raw);
    expect(capturedData.config).toEqual(store.config.raw);
});
