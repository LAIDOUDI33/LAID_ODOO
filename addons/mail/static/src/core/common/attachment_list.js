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
import { formatDate } from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { url } from "@web/core/utils/urls";

import { attClassObjectToString } from "@mail/utils/common/format";

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

export class AttachmentList extends Component {
    static components = { Actions, Dropdown, Gif };
    static template = "mail.AttachmentList";

    // make these available for class evaluation in the template
    attClassObjectToString = attClassObjectToString;
    formatDate = formatDate;
    rootRef = signal.ref();

    setup() {
        super.setup();
        this.store = useService("mail.store");
        this.props = props({
            attachments: t.array(t.instanceOf(this.store["ir.attachment"].Class)),
            groupDuplicates: t.boolean().optional(false),
            messageSearch: t.instanceOf(MessageSearchState).optional(),
            unlinkAttachments: t.function([
                t.array(t.instanceOf(this.store["ir.attachment"].Class)),
            ]),
        });
        this.ui = useService("ui");
        this.dialog = useService("dialog");
        this.fileViewer = useFileViewer(this.rootRef);
        this.actionsMenuState = useDropdownState();
        this.isMobileOS = isMobileOS();
    }

    /**
     * Attachments to display, each of them standing for every attachment
     * sharing its content. Duplicates are only grouped when the
     * `groupDuplicates` prop is set, e.g. in the chatter attachment box where
     * a signature image repeated on every message would otherwise bury the
     * relevant files.
     *
     * @type {{ attachment: import("models").Attachment, duplicates: import("models").Attachment[] }[]}
     */
    get attachmentGroups() {
        const keyOf = (attachment) =>
            this.props.groupDuplicates && attachment.checksum
                ? `checksum-${attachment.checksum}`
                : `id-${attachment.id}`;
        const duplicatesByKey = new Map();
        for (const attachment of this.props.attachments) {
            const key = keyOf(attachment);
            if (!duplicatesByKey.has(key)) {
                duplicatesByKey.set(key, []);
            }
            duplicatesByKey.get(key).push(attachment);
        }
        const groups = [];
        for (const attachment of this.props.attachments) {
            const duplicates = duplicatesByKey.get(keyOf(attachment));
            if (attachment.eq(duplicates.at(-1))) {
                groups.push({ attachment, duplicates });
            }
        }
        return groups;
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
     * @param {import("models").Attachment} attachment
     */
    onClickDownload(attachment) {
        download({
            data: {},
            url: attachment.downloadUrl,
        });
    }

    hasUnlinkConfirmation(attachment) {
        return true;
    }

    /**
     * @param {import("models").Attachment[]} attachments every attachment the
     *  clicked one stands for, itself alone most of the time
     */
    onClickUnlink(attachments) {
        if (this.env.inComposer) {
            this.props.unlinkAttachments(attachments);
            return true;
        }
        if (!attachments.some((attachment) => this.hasUnlinkConfirmation(attachment))) {
            this.onConfirmUnlink(attachments);
            return true;
        }
        const areCopies = attachments.length > 1;
        return new Promise((resolve) => {
            this.dialog.add(ConfirmationDialog, {
                title: areCopies ? _t("Delete Attachments") : _t("Delete Attachment"),
                body: areCopies
                    ? _t(
                          'Are you sure you want to delete the %(count)s copies of "%(name)s"?\nThis action cannot be undone.',
                          { count: attachments.length, name: attachments[0].name }
                      )
                    : _t(
                          'Are you sure you want to delete "%s"?\nThis action cannot be undone.',
                          attachments[0].name
                      ),
                confirmLabel: areCopies ? _t("Delete Attachments") : _t("Delete Attachment"),
                cancel: () => resolve(false),
                confirm: () => {
                    this.onConfirmUnlink(attachments);
                    resolve(true);
                },
            });
        });
    }

    /**
     * @param {import("models").Attachment} attachment
     */
    onClickAttachment(attachment) {
        const attachments = this.attachmentGroups.map((group) => group.attachment);
        this.fileViewer.open(attachment, attachments, {
            onUnlink: (file) => this.onClickUnlink([file]),
            canUnlink: (file) => this.showDelete(file),
        });
    }

    /**
     * @param {import("models").Attachment[]} attachments
     */
    async onConfirmUnlink(attachments) {
        await this.props.unlinkAttachments(attachments);
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

    getActions(attachment, duplicates = [attachment]) {
        const res = [];
        if (this.showDelete(attachment)) {
            res.push({
                label: _t("Remove"),
                icon: "delete",
                icon_class: "oi-filled",
                onSelect: () => this.onClickUnlink(duplicates),
            });
        }
        if (this.canDownload(attachment)) {
            res.push({
                label: _t("Download"),
                icon: "download",
                onSelect: () => this.onClickDownload(attachment),
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
            (this.env.message && this.props.attachments.length > 1)
        );
    }

    /**
     * @param {import("models").Attachment} attachment
     */
    showUploaded(attachment) {
        return !attachment.isImage && !attachment.uploading && this.env.inComposer;
    }
}
