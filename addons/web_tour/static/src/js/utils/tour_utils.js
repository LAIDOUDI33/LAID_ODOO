/**
 * @param {HTMLElement} element
 * @returns {HTMLElement | null}
 */
export function getScrollParent(element) {
    if (!element) {
        return null;
    }
    // We cannot only rely on the fact that the element’s scrollHeight is
    // greater than its clientHeight. This might not be the case when a step
    // starts, and the scrollbar could appear later. For example, when clicking
    // on a "building block" in the "building block previews modal" during a
    // tour (in website edit mode). When the modal opens, not all "building
    // blocks" are loaded yet, and the scrollbar is not present initially.
    const overflowY = window.getComputedStyle(element).overflowY;
    const isScrollable =
        overflowY === "auto" ||
        overflowY === "scroll" ||
        (overflowY === "visible" && element === element.ownerDocument.scrollingElement);
    if (isScrollable) {
        return element;
    } else {
        return getScrollParent(element.parentNode);
    }
}

export function isInPage(element) {
    if (!element || !element.isConnected) {
        return false;
    }
    const doc = element.ownerDocument;
    if (doc === document) {
        return document.body.contains(element);
    }
    if (doc.defaultView && doc.defaultView.frameElement) {
        const iframe = doc.defaultView.frameElement;
        return document.body.contains(iframe);
    }
    return false;
}

/**
 * Like {@link Node.contains}, but also returns true when `element` is inside
 * an iframe nested (at any depth) within `container`, since `Node.contains`
 * never crosses frame boundaries.
 * @param {Node} container
 * @param {HTMLElement} [element]
 * @returns {boolean}
 */
export function containsAcrossFrames(container, element) {
    let current = element;
    while (current) {
        if (container.contains(current)) {
            return true;
        }
        current = current.ownerDocument?.defaultView?.frameElement;
    }
    return false;
}
