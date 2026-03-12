import { fields, Record } from "@mail/model/export";

export class WebsiteTrack extends Record {
    static _name = "website.track";

    res_model = fields.Attr();
    res_id = fields.Attr();
    visit_datetime = fields.Datetime();
}

WebsiteTrack.register();
