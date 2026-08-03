import { Plugin } from "@html_editor/plugin";
import { registry } from "@web/core/registry";

/**
 * Best-guess LCP marking.
 *
 * Websites lazy-load every image by default. On save, this plugin flags the
 * best-guess LCP <img> for desktop and for mobile with `data-lcp-desktop` /
 * `data-lcp-mobile`. The server (ir.qweb `_post_processing_att`) turns the
 * marker matching the request's device into loading="eager" + fetchpriority.
 */
export class LcpMarkingPlugin extends Plugin {
    static id = "lcpMarking";
    resources = {
        on_will_save_handlers: this.markLcp.bind(this),
    };

    markLcp(editableEl = this.editable) {
        if (!editableEl) {
            return;
        }
        for (const markedEl of editableEl.querySelectorAll(
            "[data-lcp-desktop], [data-lcp-mobile]"
        )) {
            markedEl.removeAttribute("data-lcp-desktop");
            markedEl.removeAttribute("data-lcp-mobile");
        }

        const candidates = this.getEligibleImages(editableEl);
        const desktopEl = this.largest(candidates);
        if (desktopEl) {
            desktopEl.setAttribute("data-lcp-desktop", "1");
        }
        const mobileEl = this.largest(
            candidates.filter((c) => !c.el.closest(".o_snippet_mobile_invisible"))
        );
        if (mobileEl) {
            mobileEl.setAttribute("data-lcp-mobile", "1");
        }
    }

    getEligibleImages(editableEl) {
        const viewportHeight = editableEl.ownerDocument?.defaultView?.innerHeight || 0;
        const eligible = [];
        for (const imgEl of editableEl.querySelectorAll("img")) {
            const rect = imgEl.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                continue;
            }
            if (viewportHeight && (rect.top >= viewportHeight || rect.bottom <= 0)) {
                continue;
            }
            eligible.push({ el: imgEl, area: rect.width * rect.height });
        }
        return eligible;
    }

    largest(candidates) {
        let bestEl = null;
        let bestArea = 0;
        for (const { el, area } of candidates) {
            if (area > bestArea) {
                bestArea = area;
                bestEl = el;
            }
        }
        return bestEl;
    }
}

registry.category("website-plugins").add(LcpMarkingPlugin.id, LcpMarkingPlugin);
