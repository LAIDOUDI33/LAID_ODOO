import { MENU_TABS } from "@mail/core/public_web/messaging_menu/messaging_menu_model";
import { Record, fields, syncWithLocalStorage } from "@mail/model/export";

import { router } from "@web/core/browser/router";

const SIDEBAR_WIDTH = 400;

export class DiscussApp extends Record {
    static singleton = true;

    setup() {
        super.setup();
        this.onChange(
            () => [this.thread, this.thread?.channel?.primaryMessagingMenuTab],
            function onChangeThread(thread, primaryMessagingMenuTab) {
                this.lastActiveId = this.store["mail.thread"].localIdToActiveId(thread?.localId);
                if (thread) {
                    const menu = this.store.messagingMenu;
                    if (this.sidebarState?.activeTab?.notEq(menu.bookmarkTab)) {
                        const fallback = this.store.inPublicPage ? menu.channelTab : menu.chatTab;
                        this.sidebarState.activeTab = primaryMessagingMenuTab ?? fallback;
                    }
                }
            },
            // no initial run: it would overwrite the localStorage-restored
            // lastActiveId with undefined (thread is not set yet during the
            // creation of this record)
            { immediate: true, initialRun: false }
        );
    }

    INSPECTOR_WIDTH = 300;
    get sidebarState() {
        // get-or-insert: only seed activeTab on creation, so re-reads do not
        // overwrite the user's selected tab (a plain insert would reset it)
        return (
            this.store.MessagingMenuUIState.get("discuss.sidebar") ??
            this.store.MessagingMenuUIState.insert({
                id: "discuss.sidebar",
                activeTab: this.store.inPublicPage ? MENU_TABS.CHANNEL : MENU_TABS.CHAT,
            })
        );
    }
    isActive = false;
    isMemberPanelOpenByDefault = syncWithLocalStorage(this, true);
    lastActiveId = syncWithLocalStorage(this, undefined);
    thread = fields.One("mail.thread", {
        inverse: "discussAppAsThread",
    });
    hasRestoredThread = false;
    sidebarWidth = syncWithLocalStorage(this, SIDEBAR_WIDTH);

    /**
     * Write the current discuss selection to the URL and action context so it survives
     * browser history navigation. `activeId` is a thread token (e.g. `discuss.channel_10`)
     * when a conversation is open, or a tab token (e.g. `discuss.tab_notification`) when only a tab
     * is selected.
     *
     * @param {string} activeId
     */
    setActiveURL(activeId) {
        router.pushState({ active_id: activeId });
        const action = this.store.env.services.action;
        if (
            this.store.action_discuss_id &&
            action?.currentController?.action.id === this.store.action_discuss_id
        ) {
            // Keep the action stack up to date (used by breadcrumbs).
            action.currentController.action.context.active_id = activeId;
        }
    }

    /** @param {import("@mail/core/common/action").Action} [nextActiveAction] */
    shouldDisableMemberPanelAutoOpenFromClose(nextActiveAction) {
        return true;
    }
}

DiscussApp.register();
