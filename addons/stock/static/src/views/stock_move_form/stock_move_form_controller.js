import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { FormController } from "@web/views/form/form_controller";
import { formView } from "@web/views/form/form_view";

export class StockMoveFormController extends FormController {
    setup() {
        super.setup();
    }

    async save(params) {
        await this.model._askChanges();
        const packageData = {};
        for (const { data } of this.model.root.data.move_line_ids.records) {
            const resPackageId = data.result_package_id?.id;
            if (!resPackageId || resPackageId == data.package_id?.id) {
                continue;
            }
            packageData[resPackageId] ??= 0;
            packageData[resPackageId] += data.quantity_product_uom;
        }

        if (Object.keys(packageData).length) {
            const overweightPackages = await this.orm.call(
                "stock.move",
                "get_overweight_packages",
                [this.model.root.resId, packageData]
            );

            if (overweightPackages.length) {
                return this.dialogService.add(ConfirmationDialog, {
                    title: _t("Warning"),
                    body: _t(
                        "The total weight of the following packages exceeds the maximum weight allowed for the selected package type: %s. Do you want to proceed anyway?",
                        overweightPackages.join(", ")
                    ),
                    confirmLabel: _t("Confirm"),
                    confirm: () => super.save(params),
                    cancel: () => {},
                });
            }
        }
        return super.save(params);
    }
}

export const StockMoveFormView = {
    ...formView,
    Controller: StockMoveFormController,
};

registry.category("views").add("sm_form", StockMoveFormView);
