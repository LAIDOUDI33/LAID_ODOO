import { Gif } from "@mail/core/common/gif";
import { MessageSearchState } from "@mail/core/common/message_search_hook";

import { Component, props, signal, t } from "@odoo/owl";
import { isMobileOS } from "@web/core/browser/feature_detection";

import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { download } from "@web/core/network/download";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { useFileViewer } from "@web/core/file_viewer/file_viewer_hook";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { url } from "@web/core/utils/urls";

import { attClassObjectToString } from "@mail/utils/common/format";
import { propComputed } from "@mail/utils/common/hooks";

class Actions extends Component {
    static components = { Dropdown, DropdownItem };
    static template = "mail.Actions";
    props = props({
        actions: t.array(
            t.object({
                label: t.string(),
                icon: t.string(),
                onSelect: t.function([t.instanceOf(Event)]),
            })
        ),
    });

    setup() {
        super.setup();
        this.actionsMenuState = useDropdownState();
    }
}

/** @param {import("models").Store} store */
export const unlinkAttachmentType = (store) =>
    t.function([t.object({ attachment: t.instanceOf(store["ir.attachment"].Class) })]);

export class AttachmentList extends Component {
    static components = { Actions, Gif };
    static template = "mail.AttachmentList";

    // make this available for class evaluation in the template
    attClassObjectToString = attClassObjectToString;
    rootRef = signal(null);

    setup() {
        super.setup();
        this.store = useService("mail.store");
        this.unlinkAttachment = props.static("unlinkAttachment", unlinkAttachmentType(this.store));
        this.attachments = propComputed(
            "attachments",
            t.array(t.instanceOf(this.store["ir.attachment"].Class))
        );
        this.messageSearch = propComputed(
            "messageSearch",
            t.instanceOf(MessageSearchState).optional()
        );
        this.ui = useService("ui");
        this.dialog = useService("dialog");
        this.fileViewer = useFileViewer(this.rootRef);
        this.actionsMenuState = useDropdownState();
        this.isMobileOS = isMobileOS();
    }

    /**
     * @param {import("models").Attachment} attachment
     */
    getImageUrl(attachment) {
        if (attachment.uploading && attachment.tmpUrl) {
            return attachment.tmpUrl;
        }
        return url(attachment.urlRoute, {
            ...attachment.urlQueryParams,
        });
    }

    /**
     * @param {import("models").Attachment} attachment
     */
    canDownload(attachment) {
        return !attachment.uploading && !this.env.inComposer;
    }

    /**
     * @param {MouseEvent} ev
     * @param {{ attachment: import("models").Attachment }} param1
     */
    onClickDownload(ev, { attachment }) {
        download({
            data: {},
            url: attachment.downloadUrl,
        });
    }

    /**
     * @param {MouseEvent} ev
     * @param {{ attachment: import("models").Attachment }} param1
     */
    onClickUnlink(ev, { attachment }) {
        if (this.env.inComposer) {
            return this.unlinkAttachment({ attachment });
        }
        this.dialog.add(ConfirmationDialog, {
            title: _t("Delete Attachment"),
            body: _t(
                'Are you sure you want to delete "%s"?\nThis action cannot be undone.',
                attachment.name
            ),
            confirmLabel: _t("Delete Attachment"),
            cancel: () => {},
            confirm: () => this.onConfirmUnlink({ attachment }),
        });
    }

    /**
     * @param {MouseEvent} ev
     * @param {{ attachment: import("models").Attachment }} param1
     */
    onClickAttachment(ev, { attachment }) {
        this.fileViewer.open(attachment, this.attachments());
    }

    /**
     * @param {{ attachment: import("models").Attachment }} param0
     */
    onConfirmUnlink({ attachment }) {
        this.unlinkAttachment({ attachment });
    }

    onImageLoaded() {
        this.env.onImageLoaded?.();
    }

    get isInChatWindowAndIsAlignedRight() {
        return this.env.inChatWindow && this.env.alignedRight;
    }

    get isInChatWindowAndIsAlignedLeft() {
        return this.env.inChatWindow && !this.env.alignedRight;
    }

    getActions(attachment) {
        const res = [];
        if (this.showDelete(attachment)) {
            res.push({
                label: _t("Remove"),
                icon: "fa fa-trash",
                onSelect: (ev) => this.onClickUnlink(ev, { attachment }),
            });
        }
        if (this.canDownload(attachment)) {
            res.push({
                label: _t("Download"),
                icon: "fa fa-download",
                onSelect: (ev) => this.onClickDownload(ev, { attachment }),
            });
        }
        return res;
    }

    showDelete(attachment) {
        // in the composer they should all be implicitly deletable
        if (this.env.inComposer) {
            return true;
        }
        if (!attachment.isDeletable) {
            return false;
        }
        // in messages users are expected to delete the message instead of just the attachment
        return (
            !this.env.message ||
            this.env.message.hasTextContent ||
            (this.env.message && this.attachments().length > 1)
        );
    }

    /**
     * @param {import("models").Attachment} attachment
     */
    showUploaded(attachment) {
        return !attachment.isImage && !attachment.uploading && this.env.inComposer;
    }
}
