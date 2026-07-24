import {
    CopyClipboardURLField,
    copyClipboardURLField,
    copyClipboardFieldProps,
} from "@web/views/fields/copy_clipboard/copy_clipboard_field";

import { props, t } from "@odoo/owl";
import { registry } from "@web/core/registry";


export class CopyClipboardURLAnchorField extends CopyClipboardURLField {
    props = props({
        ...copyClipboardFieldProps,
        text: t.string().optional(),
    });
}

export const copyClipboardURLAnchorField = {
    ...copyClipboardURLField,
    component: CopyClipboardURLAnchorField,
    extractProps: (fieldInfo) => ({
        ...copyClipboardURLField.extractProps(fieldInfo),
        text: fieldInfo.options.text,
    }),
};

registry.category("fields").add("CopyClipboardURLAnchor", copyClipboardURLAnchorField);
