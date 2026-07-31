import { EDITOR_MUTATION_TYPES } from "@html_editor/core/dom_observer_plugin";
import { Plugin } from "@html_editor/plugin";
import { rpc } from "@web/core/network/rpc";
import { registry } from "@web/core/registry";

const HEADER_SEARCHBAR_SELECTOR = ".o_header_searchbar";
const DIRTY_CLASS = "o_dirty_header_search";

/**
 * The header search bar is rendered outside of any savable area, so the DOM
 * changes made by the searchbar options cannot be saved as view arch. This
 * plugin flags the header search bar when one of its options mutates it, then
 * stores the resulting settings on the website record.
 */
export class HeaderSearchbarOptionPlugin extends Plugin {
    static id = "headerSearchbarOption";
    static dependencies = ["domReferenceMap"];

    /** @type {import("plugins").WebsiteResources} */
    resources = {
        on_pending_mutations_staged_handlers: this.handleMutations.bind(this),
        on_ready_to_save_document_handlers: this.onSave.bind(this),
    };

    /**
     * @param {import("@html_editor/core/dom_observer_plugin").SerializedMutation[]} mutations
     */
    handleMutations(mutations) {
        for (const mutation of mutations) {
            if (
                mutation.type === EDITOR_MUTATION_TYPES.ATTRIBUTES &&
                mutation.attributeName === "contenteditable"
            ) {
                continue;
            }
            let targetId = mutation.nodeId;
            if (
                [EDITOR_MUTATION_TYPES.ADD, EDITOR_MUTATION_TYPES.REMOVE].includes(mutation.type) &&
                mutation.parentNodeId
            ) {
                targetId = mutation.parentNodeId; // a removed node is no longer connected
            }
            let targetEl = this.dependencies.domReferenceMap.getNodeById(targetId);
            if (!targetEl?.isConnected) {
                continue;
            }
            if (targetEl.nodeType !== Node.ELEMENT_NODE) {
                targetEl = targetEl.parentElement;
            }
            const searchbarEl = targetEl?.closest(HEADER_SEARCHBAR_SELECTOR);
            if (!searchbarEl || searchbarEl.classList.contains(DIRTY_CLASS)) {
                continue;
            }
            searchbarEl.classList.add(DIRTY_CLASS);
        }
    }

    async onSave() {
        for (const searchbarEl of this.editable.querySelectorAll(`.${DIRTY_CLASS}`)) {
            const inputEl = searchbarEl.querySelector(".search-query");
            const limit = parseInt(inputEl.dataset.limit);
            await rpc("/website/config/header_search", {
                header_search_type: inputEl.dataset.searchType,
                header_search_order_by: inputEl.dataset.orderBy,
                header_search_limit: Number.isNaN(limit) ? 30 : limit,
            });
            searchbarEl.classList.remove(DIRTY_CLASS);
        }
    }
}

registry
    .category("website-plugins")
    .add(HeaderSearchbarOptionPlugin.id, HeaderSearchbarOptionPlugin);
