import { proxy, useEffect, useListener } from "@odoo/owl";
import { resolveRefEl } from "@web/core/utils/ref_utils";
import { useLayoutEffect } from "@web/owl2/utils";

export function useDropdownAutoVisibility(overlayState, popoverRef) {
    if (!overlayState) {
        return;
    }
    const state = proxy(overlayState);
    const getEl = () => resolveRefEl(popoverRef);
    useEffect(() => {
        const isOverlayVisible = state.isOverlayVisible;
        const el = getEl();
        if (el) {
            if (!isOverlayVisible) {
                el.style.visibility = "hidden";
            } else {
                el.style.visibility = "visible";
            }
        }
    });
}

export function useToolbarDropdownFocus(dropdown, buttonRef) {
    useListener(
        document,
        "keydown",
        (ev) => {
            if (ev.key === "Escape" && dropdown.isOpen) {
                const onKeyUp = (ev) => {
                    if (ev.key === "Escape" && !dropdown.isOpen) {
                        resolveRefEl(buttonRef)?.focus();
                    }
                };

                document.addEventListener("keyup", onKeyUp, {
                    capture: true,
                    once: true,
                });
            }
        },
        { capture: true }
    );
}

/**
 * Previews a toolbar dropdown item while it is hovered or navigated to, and
 * reverts the preview when the pointer leaves the menu or the dropdown closes.
 *
 * @param {Object} params
 * @param {Object} params.dropdown state of the dropdown, as returned by `useDropdownState`
 * @param {() => any[]} params.getItems
 * @param {(item: any) => void} params.preview
 * @param {(item: any) => void} params.commit
 * @param {() => void} params.revert
 */
export function useToolbarDropdownPreview({ dropdown, getItems, preview, commit, revert }) {
    const reactiveDropdown = proxy(dropdown);
    /** @type {import("@web/core/navigation/navigation").Navigator} */
    let navigator;
    let activeEl;

    const resetPreview = () => {
        navigator?._setActiveItem(-1);
        activeEl = undefined;
        revert();
    };

    let wasOpen = false;
    useLayoutEffect(
        () => {
            if (wasOpen && !reactiveDropdown.isOpen) {
                resetPreview();
            }
            wasOpen = reactiveDropdown.isOpen;
        },
        () => [reactiveDropdown.isOpen]
    );

    return {
        commit(item) {
            activeEl = undefined;
            commit(item);
        },
        reset: resetPreview,
        navigationOptions: {
            onUpdated: (nav) => {
                navigator = nav;
            },
            onItemActivated: (el) => {
                if (el === activeEl) {
                    return;
                }
                activeEl = el;
                const item = getItems()[Number(el.dataset.previewIndex)];
                if (item) {
                    preview(item);
                    el.focus();
                }
            },
        },
    };
}
