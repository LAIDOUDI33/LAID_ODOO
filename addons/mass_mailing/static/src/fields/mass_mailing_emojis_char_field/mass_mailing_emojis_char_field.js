import {
    emojisCharField,
    EmojisCharField,
} from "@mail/views/web/fields/emojis_char_field/emojis_char_field";
import { registry } from "@web/core/registry";

export class MassMailingEmojisCharField extends EmojisCharField {
    static template = "mass_mailing.MassMailingEmojisCharField";
}

export const massMailingEmojisCharField = {
    ...emojisCharField,
    component: MassMailingEmojisCharField,
};

registry.category("fields").add("mailing_char_emojis", massMailingEmojisCharField);
