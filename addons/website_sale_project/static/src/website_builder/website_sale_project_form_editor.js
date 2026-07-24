import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";

registry.category("builder.form_editor_actions").add("request_withdrawal", {
    fields: [
        {
            name: "project_id",
            type: "many2one",
            relation: "project.project",
            string: _t("Project"),
            domain: [["is_template", "=", false]],
            createAction: "project.open_view_project_all",
        },
    ],
});
