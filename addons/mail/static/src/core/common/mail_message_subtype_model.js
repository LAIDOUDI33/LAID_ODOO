import { fields } from "@mail/model/misc";
import { Record } from "@mail/model/record";

export class MailMessageSubtype extends Record {
    static _name = "mail.message.subtype";

    /** @type {string} */
    description;
    /** @type {number} */
    id;
    /** @type {string} */
    name;
    // This field is not correctly named. To be read as "parent of"
    parent_id = fields.One("mail.message.subtype");
}
MailMessageSubtype.register();
