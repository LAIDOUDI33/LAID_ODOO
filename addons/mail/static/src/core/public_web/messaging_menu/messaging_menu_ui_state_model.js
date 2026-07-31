import { fields } from "@mail/model/misc";
import { Record } from "@mail/model/record";

import { computed } from "@odoo/owl";

export class MessagingMenuUIState extends Record {
    static id = "id";

    setup() {
        super.setup();
        this.assignComputed("activeTab", function computeActiveTab() {
            if (
                this.activeTab?.isShown ||
                // A hideWhenZeroCounter tab can transiently report a zero
                // counter while its content loads: a fetched record already
                // exists in the store (so it left `init_counter_ids`) but is
                // not linked to the tab yet. Keep the current tab in that
                // window instead of switching away; once loading settles, the
                // counter is reliable.
                (this.activeTab &&
                    !this.activeTab.hidden &&
                    this.activeTab.getLoadStatus(this.selectedFilter) === "loading")
            ) {
                return this.activeTab;
            }
            return this.store.messagingMenu?.sortedVisibleTabs[0];
        });
        this.onChange(
            () => [this.activeTab],
            function onChangeActiveTab() {
                this.selectedFilter = this.activeTab?.defaultFilter;
            },
            { immediate: true }
        );
        /**
         * Trigger for the initial tab content load. It recomputes whenever the tab/filter to
         * show changes, or when this state becomes ready to load (see `_isReadyForInitialLoad`).
         */
        // memoized: the trigger derives a string from several reads and must
        // only fire loadMore when it actually changes
        const initialLoadTrigger = computed(() => {
            if (!this._isReadyForInitialLoad() || !this.activeTab) {
                return null;
            }
            return `${this.activeTab.id}::${this.selectedFilter?.id ?? ""}`;
        });
        this.onChange(
            () => [initialLoadTrigger()],
            function onChangeInitialLoadTrigger(trigger) {
                if (trigger) {
                    this._ensureTabOrFilterInitialLoad();
                }
            },
            { immediate: true }
        );
    }

    activeTab = fields.One("MessagingMenuTab");
    /** @type {?import("@mail/core/public_web/messaging_menu/messaging_menu_tab_model").MessagingMenuTabFilter} */
    selectedFilter;
    /** @type {string} */
    id;

    /**
     * Handles an explicit tab selection by the user.
     *
     * Unlike setting `activeTab` programmatically, selecting a tab clears the selected
     * thread. This is separate from `onChangeActiveTab` to avoid clearing threads during
     * programmatic thread-to-tab synchronization.
     *
     * @param {import("models").MessagingMenuTab} tab
     */
    selectTab(tab) {
        this.activeTab = tab;
    }

    /**
     * Whether this state may perform its initial content load. Overridden for the discuss
     * sidebar, which must wait until the thread has been restored from the URL so that
     * `activeTab` has settled on its final value before loading.
     */
    _isReadyForInitialLoad() {
        return true;
    }

    _ensureTabOrFilterInitialLoad() {
        if (this.activeTab.getLoadStatus(this.selectedFilter) === "new") {
            this.activeTab.loadMore({ filter: this.selectedFilter });
        }
    }
}
MessagingMenuUIState.register();
