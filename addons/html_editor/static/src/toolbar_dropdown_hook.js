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

export function useToolbarDropdownPreview({ overlay, dropdown, preview, commit, revert }) {
    const reactiveDropdown = proxy(dropdown);
    useLayoutEffect(
        () => {
            if (!reactiveDropdown.isOpen) {
                resetPreview();
            }
        },
        () => [reactiveDropdown.isOpen]
    );

    let focusedItem;

    const setPreviewActive = (isPreviewActive) => {
        overlay?.bus?.trigger("previewChange", { isPreviewActive });
    };

    const previewItem = (item) => {
        setPreviewActive(true);
        preview(item);
    };

    const resetPreview = () => {
        setPreviewActive(false);
        revert();
    };

    return {
        commit(item) {
            setPreviewActive(false);
            commit(item);
        },
        reset: resetPreview,
        preview(ev, item) {
            const target = ev.target;
            if (focusedItem === target) {
                focusedItem = undefined;
                return;
            }
            focusedItem = target;
            previewItem(item);
            if (document.activeElement !== target) {
                target.focus();
            }
        },
    };
}
