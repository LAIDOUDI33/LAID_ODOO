import { ChatHub } from "@mail/core/common/chat_hub_model";

import { patch } from "@web/core/utils/patch";

export const CHAT_HUB_WE_SIDEBAR_WIDTH = 288; // Same as $o-we-sidebar-width

patch(ChatHub.prototype, {
    get BUBBLE_START() {
        // Always read super first: it tracks the invalidation counter, needed
        // here because the website edition context is not reactive.
        const bubbleStart = super.BUBBLE_START;
        if (this.store.env.services["website"]?.context?.edition) {
            return CHAT_HUB_WE_SIDEBAR_WIDTH;
        }
        return bubbleStart;
    },
});
