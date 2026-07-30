import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";

registry.category("builder.form_editor_actions").add("request_withdrawal", {
    fields: [
        {
            name: "recipient_email",
            type: "char",
            required: false,
            string: _t("Recipient Emails"),
            help: _t("Email addresses of the recipients of the withdrawal request notification"),
        },
    ],
});
