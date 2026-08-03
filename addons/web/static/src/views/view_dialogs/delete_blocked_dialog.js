import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";

import { Component, t, useProps } from "@odoo/owl";

export class DeleteBlockedDialog extends Component {
    static components = { Dialog };
    static template = "web.DeleteBlockedDialog";
    props = useProps({
        close: t.function(),
        message: t.string(),
        onArchive: t.function().optional(),
        blockedIds: t.array(t.number()).optional(),
        viewBlockedRecords: t.function().optional(),
    });

    get archiveHint() {
        return this.props.blockedIds
            ? _t("How about archiving them instead?")
            : _t("How about archiving it instead?");
    }

    async onArchiveClick() {
        await this.props.onArchive();
        this.props.close();
    }

    onViewBlockedRecordsClick(ev) {
        ev.preventDefault();
        this.props.viewBlockedRecords(this.props.blockedIds);
        this.props.close();
    }
}
