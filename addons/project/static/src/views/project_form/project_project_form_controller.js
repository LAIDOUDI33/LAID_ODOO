import { useLayoutEffect } from "@web/owl2/utils";
import { onWillStart, props, t } from "@odoo/owl";
import { user } from "@web/core/user";
import { formControllerProps } from "@web/views/form/form_controller";
import { _t } from "@web/core/l10n/translation";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { FormControllerWithHTMLExpander } from '@resource/views/form_with_html_expander/form_controller_with_html_expander'
import { ProjectTemplateDropdown } from "../components/project_template_dropdown";

export class ProjectProjectFormController extends FormControllerWithHTMLExpander {
    static components = {
        ...FormControllerWithHTMLExpander.components,
        ProjectTemplateDropdown,
    };
    props = props({
        ...formControllerProps,
        focusTitle: t.boolean().optional(false),
    });

    setup() {
        super.setup();
        onWillStart(async () => {
            this.isProjectManager = await user.hasGroup('project.group_project_manager');
            this.featuresToObserve = await this.orm.call(
                this.modelParams.config.resModel,
                "check_features_enabled",
                []
            );
        });

        if (this.props.focusTitle) {
            useLayoutEffect(
                (el) => {
                    if (el) {
                        const title = this.rootRef.el.querySelector("#name_0");
                        if (title) {
                            title.focus();
                        }
                    }
                },
                () => [this.rootRef.el]
            );
        }
    }

    async onWillSaveRecord(record, changes) {
        const prevAccountId = record._values.account_id?.id;
        const newAccountId = "account_id" in changes ? changes.account_id : prevAccountId;
        const timesheetsEnabled = "allow_timesheets" in changes
            ? changes.allow_timesheets
            : record.data.allow_timesheets ?? false;
        const isAccountRemoved = !!prevAccountId && !newAccountId;
        if (isAccountRemoved && timesheetsEnabled) {
            const confirmed = await new Promise(resolve => {
                this.dialogService.add(ConfirmationDialog, {
                    title: _t("Warning"),
                    body: _t(
                        "The Timesheets feature requires an analytic account for the Project plan. Removing it will disable the feature. Are you sure you want to continue?"
                    ),
                    confirmLabel: _t("Proceed"),
                    cancelLabel: _t("Cancel"),
                    confirm: () => resolve(true),
                    cancel: () => resolve(false),
                });
            });
            if (confirmed) {
                changes.allow_timesheets = false;
            } else {
                return false;
            }
        }
        return super.onWillSaveRecord(...arguments);
    }

    getStaticActionMenuItems() {
        const actionMenuItems = super.getStaticActionMenuItems(...arguments);
        if (actionMenuItems.archive.isAvailable) {
            actionMenuItems.archive.isAvailable = () => this.isProjectManager;
        }
        return actionMenuItems;
    }

    /**
     * @override
     */
    async onRecordSaved(record, changes) {
        await super.onRecordSaved(...arguments);
        const updatedFields = Object.keys(this.featuresToObserve).filter(
            (fName) => fName in changes
        );
        if (updatedFields.length) {
            const updatedFeatures = await record.model.orm.call(
                record.resModel,
                "check_features_enabled",
                [updatedFields]
            );
            if (
                Object.entries(updatedFeatures).some(
                    ([fName, value]) => value !== this.featuresToObserve[fName]
                )
            ) {
                this.model.action.doAction("reload_context");
            }
        }
    }
}
