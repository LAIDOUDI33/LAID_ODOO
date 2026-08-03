import { patch } from "@web/core/utils/patch";
import { ThreadAction } from "@mail/core/common/thread_actions";

patch(ThreadAction.prototype, {
    _condition({ action, channel, owner, store }) {
        if (
            action.id === "create-lead" &&
            channel?.channel_type === "livechat" &&
            channel.self_member_id?.livechat_member_type !== "visitor" &&
            store.has_access_create_lead &&
            !owner.isDiscussSidebarChannelActions
        ) {
            return true;
        }
        return super._condition(...arguments);
    },
});
