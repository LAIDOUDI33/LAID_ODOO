import { Plugin } from "@html_editor/plugin";
import { withSequence } from "@html_editor/utils/resource";
import { EDITOR_MUTATION_TYPES } from "@html_editor/core/dom_observer_plugin";

/**
 * @typedef { Object } DirtMarkShared
 * @property { DirtMarkPlugin['ignoreDirty'] } ignoreDirty
 */

export class DirtMarkPlugin extends Plugin {
    static id = "dirtMarkPlugin";
    static shared = ["ignoreDirty"];
    static dependencies = ["domReferenceMap"];

    /** @type {import("plugins").BuilderResources} */
    resources = {
        on_pending_mutations_staged_handlers: this.handleMutations.bind(this),
        on_editor_started_handlers: this.startObserving.bind(this),
        clean_for_save_processors: (rootEl) => {
            rootEl.classList.remove("o_dirty");
            return rootEl;
        },
        // Do not change the sequence of this resource, it must stay the first
        // one to avoid marking dirty when not needed during the drag and drop.
        on_prepare_drag_handlers: withSequence(0, this.ignoreDirty.bind(this)),
    };

    setup() {
        this.canObserve = false;
    }

    startObserving() {
        this.canObserve = true;
    }
    /**
     * Handles the flag of the closest savable element to the mutation as dirty
     *
     * @param {import("@html_editor/core/dom_observer_plugin").SerializedMutation[]} mutations - The observed mutations
     */
    handleMutations(mutations) {
        if (!this.canObserve) {
            return;
        }
        for (const mutation of mutations) {
            if (
                mutation.type === EDITOR_MUTATION_TYPES.ATTRIBUTES &&
                mutation.attributeName === "contenteditable"
            ) {
                continue;
            }
            let targetId = mutation.nodeId;
            // TODO: Wouldn't doing this only for "remove" be enough?
            if (
                [EDITOR_MUTATION_TYPES.ADD, EDITOR_MUTATION_TYPES.REMOVE].includes(mutation.type) &&
                mutation.parentNodeId
            ) {
                targetId = mutation.parentNodeId;
            }
            let targetEl = this.dependencies.domReferenceMap.getNodeById(targetId);
            if (!targetEl.isConnected) {
                continue;
            }
            if (targetEl.nodeType !== Node.ELEMENT_NODE) {
                targetEl = targetEl.parentElement;
            }
            if (!targetEl) {
                continue;
            }
            const savableEl = targetEl.closest(".o_savable");
            if (
                !savableEl ||
                savableEl.classList.contains("o_dirty") ||
                savableEl.hasAttribute("data-oe-readonly")
            ) {
                continue;
            }
            savableEl.classList.add("o_dirty");
        }
    }

    /**
     * Prevents elements to be marked as dirty until it is reactivated with the
     * returned callback.
     *
     * @returns {Function}
     */
    ignoreDirty() {
        this.canObserve = false;
        return () => {
            this.canObserve = true;
        };
    }
}
