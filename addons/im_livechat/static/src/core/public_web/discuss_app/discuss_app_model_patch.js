import { DiscussApp } from "@mail/core/public_web/discuss_app/discuss_app_model";
import { fields, syncWithLocalStorage } from "@mail/model/export";

import { patch } from "@web/core/utils/patch";

patch(DiscussApp.prototype, {
    setup(env) {
        super.setup(...arguments);
        this.livechats = fields.Many("discuss.channel", { inverse: "appAsLivechats" });
        this.isLivechatInfoPanelOpenByDefault = syncWithLocalStorage(this, true);
    },
    shouldDisableMemberPanelAutoOpenFromClose(nextActiveAction) {
        if (nextActiveAction?.id === "livechat-info") {
            return false;
        }
        return super.shouldDisableMemberPanelAutoOpenFromClose(...arguments);
    },
});
