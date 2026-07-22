import { rpc } from "@web/core/network/rpc";
import { Interaction } from "@web/public/interaction";
import { registry } from "@web/core/registry";

export class EventTrackLocationDisplay extends Interaction {
    static selector = ".o_wevent_location_display";

    setup() {
        this.scheduleRefresh();
    }

    scheduleRefresh() {
        this.refreshTimeout = this.waitForTimeout(async () => {
            await this.refreshContent();
            this.scheduleRefresh();
        }, 30_000);  // TBD: appropriate time interval for refreshing the content
    }

    destroy() {
        clearTimeout(this.refreshTimeout);
    }

    async refreshContent() {
        try {
            const html = await this.waitFor(rpc(this.el.dataset.refreshUrl, {}, { silent: true }));
            const content = new DOMParser()
                .parseFromString(html.trim(), "text/html")
                .body.firstElementChild;
            const currentContent = this.el.querySelector(".o_wevent_location_display_content");
            if (content && currentContent) {
                this.insert(content, currentContent, "beforebegin", false);
                this.services["public.interactions"].stopInteractions(currentContent);
                currentContent.remove();
            }
        } catch {
            // Keep the last successfully loaded schedule visible while offline.
        }
    }
}

registry.category("public.interactions").add(
    "website_event_track_location_display.event_track_location_display",
    EventTrackLocationDisplay
);
