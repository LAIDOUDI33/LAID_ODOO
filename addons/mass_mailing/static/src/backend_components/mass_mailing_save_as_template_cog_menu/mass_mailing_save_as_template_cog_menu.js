import { Component } from "@odoo/owl";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { useDropdownCloser } from "@web/core/dropdown/dropdown_hooks";
import { _t } from "@web/core/l10n/translation";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

const cogMenuRegistry = registry.category("cogMenu");

export class MassMailingSaveAsTemplateCogMenu extends Component {
    static template = "mass_mailing.MassMailingSaveAsTemplateCogMenu";
    static components = { DropdownItem };

    setup() {
        this.actionService = useService("action");
        this.orm = useService("orm");
        this.dialog = useService("dialog");
        this.dropdown = useDropdownCloser();
        this.label = _t("Save as Template");
    }

    saveConfirmationDialogProps() {
        const subject = this.env.model.root.data.subject;
        const modelName = this.env.model.root.data.mailing_model_id?.display_name;
        const title = _t("Similar template found!");
        const body = _t(
            `A similar template with subject %s and model %s already exists.\n\nDo you want to proceed ?`,
            subject,
            modelName
        );
        return {
            title: title,
            body: body,
            confirm: async () => {
                await this.createTemplate();
                this.dropdown.closeAll();
            },
            confirmLabel: _t("Save"),
            confirmClass: "btn-primary",
            cancel: () => this.dropdown.closeAll(),
            cancelLabel: _t("Do not save"),
        };
    }

    async createTemplate() {
        const action = await this.orm.call("mailing.mailing", "action_save_as_template", [
            [this.env.model.root.resId],
        ]);
        await this.actionService.doAction(action);
    }

    async isSimilarTemplateExists(data) {
        const count = await this.orm.searchCount("mailing.mailing", [
            ["id", "!=", data.id],
            ["subject", "=", data.subject],
            ["mailing_model_id", "=", data.modelId],
        ]);
        return count > 0;
    }

    async saveAsTemplate() {
        const res = await this.env.model.root.save();
        if (!res) {
            return;
        }
        const data = this.env.model.root.data;
        const exists = await this.isSimilarTemplateExists({
            id: this.env.model.root.resId,
            subject: data.subject,
            modelId: data.mailing_model_id?.id,
        });
        if (exists) {
            this.dialog.add(ConfirmationDialog, this.saveConfirmationDialogProps());
        } else {
            await this.createTemplate();
            this.dropdown.closeAll();
        }
    }
}

export const MassMailingSaveAsTemplateCogMenuItem = {
    Component: MassMailingSaveAsTemplateCogMenu,
    groupNumber: 4,
    isDisplayed: async ({ config, searchModel }) =>
        searchModel.resModel === "mailing.mailing" &&
        !searchModel.globalContext.default_is_template &&
        config.viewType == "form" &&
        config.actionType === "ir.actions.act_window",
};

cogMenuRegistry.add("save-as-template-menu", MassMailingSaveAsTemplateCogMenuItem, {
    sequence: 10,
});
