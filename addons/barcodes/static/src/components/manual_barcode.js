import { BarcodeDialog } from "@web/core/barcode/barcode_dialog";
import { BarcodeInput } from "./barcode_input";
import { useProps, t } from "@odoo/owl";

export class ManualBarcodeScanner extends BarcodeDialog {
    static template = "barcodes.ManualBarcodeScanner";
    static components = {
        ...BarcodeDialog.components,
        BarcodeInput,
    };

    props = useProps({
        ...BarcodeDialog.props,
        placeholder: t.string().optional(),
    });
}
