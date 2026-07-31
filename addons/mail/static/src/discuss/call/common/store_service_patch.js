import { Store } from "@mail/core/common/store_service";
import { fields } from "@mail/model/export";

import { computed } from "@odoo/owl";
import { router } from "@web/core/browser/router";

import { patch } from "@web/core/utils/patch";

/**
 * Shareable meeting link currently mirrored in the address bar, or `undefined` when not in the
 * full-screen meeting view. Kept in sync by the change observer in the store patch below and
 * read back by the router patch below.
 * @type {string|undefined}
 */
let callShareUrl;

/**
 * The web client's router owns the address bar only when an action state is
 * present (/odoo). On other pages (public chat page, website pages) the address
 * bar holds the page's own URL and a router push would rewrite it.
 */
function routerOwnsAddressBar() {
    return Array.isArray(router.current.actionStack);
}

// The web client's router owns the address bar and recomputes it from the action state on every
// (debounced) push, so directly writing the meeting link with `history.replaceState` is
// immediately overwritten. Instead, teach the router to emit the link itself: its own pushes then
// render it and there is nothing left to race. `actionStack` is only present on the navigation
// state, so message/record link generation (which passes a bare `{ model, resId }`) keeps its
// normal url.
patch(router, {
    stateToUrl(state) {
        if (callShareUrl && Array.isArray(state.actionStack)) {
            const { pathname, search } = new URL(callShareUrl);
            return `${pathname}${search}`;
        }
        return super.stateToUrl(state);
    },
});

/** @type {import("models").Store} */
const StorePatch = {
    setup() {
        super.setup(...arguments);
        this.rtc = fields.One("Rtc");
        this.ringingChannels = fields.Many("discuss.channel");
        // memoized: a repeat with the same boolean (one ringing channel
        // replaced by another) would audibly restart the looping ringtone
        const hasRingingChannels = computed(() => this.ringingChannels.length > 0);
        this.onChange(
            () => [hasRingingChannels()],
            function onChangeRingingChannels(shouldPlay) {
                if (shouldPlay) {
                    this.env.services["mail.sound_effects"].play("call-invitation", { loop: true });
                    return () => this.env.services["mail.sound_effects"].stop("call-invitation");
                }
            }
        );
        this.nextTalkingTime = 1;
        this.fullscreenChannel = fields.One("discuss.channel");
        this.meetingViewOpened = false;
        this.onChange(
            () => [this.hasFullscreenUrl],
            function onChangeHasFullscreenUrl(hasFullscreenUrl) {
                // hasRestoredThread blocks the initial run: pushing the (empty)
                // boot value would delete a ?fullscreen param before it is restored
                if (this.discuss?.hasRestoredThread) {
                    this.hasFullscreenUrlOnUpdate(hasFullscreenUrl);
                }
            }
        );
        /**
         * Shareable link of the full-screen call, mirrored in the address bar while its
         * meeting view is open (and `undefined` otherwise). Depending on both the call and
         * the full-screen state, this recomputes whenever either changes (including when
         * the invitation link resolves, i.e. channel uuid loads), so the address bar stays
         * in sync no matter the order in which they settle as a meeting starts. The patched
         * {@link router.stateToUrl} renders the mirrored value; the push below recomputes
         * the address bar.
         *
         * Only when the router owns the address bar: on the public meeting page the
         * address bar already holds the invitation link, and rewriting it through the
         * web-client router (which has no action state there) would overwrite that
         * link and lock the guest out on reload.
         */
        this.onChange(
            () => [
                this.self_user && this.rtc?.isFullscreen
                    ? this.rtc.localChannel?.invitationLink
                    : undefined,
            ],
            function onChangeShareUrl(shareUrl) {
                // the callShareUrl guard also blocks the initial run: replacing the
                // state with the (empty) boot value would rewrite the address bar
                // for nothing
                if (!routerOwnsAddressBar() || shareUrl === callShareUrl) {
                    return;
                }
                callShareUrl = shareUrl;
                router.replaceState({ fullscreen: this.hasFullscreenUrl ? true : undefined });
            }
        );
    },
    get hasFullscreenUrl() {
        return this.discuss?.thread?.channel?.eq(this.fullscreenChannel);
    },
    /** @param {boolean} hasFullscreenUrl */
    hasFullscreenUrlOnUpdate(hasFullscreenUrl) {
        // the public page writes the address bar itself (@see its override), so
        // the router push is for the web client only
        if (callShareUrl || !routerOwnsAddressBar()) {
            return;
        }
        router.pushState({ fullscreen: hasFullscreenUrl ? true : undefined });
    },
    initialize() {
        super.initialize(...arguments);
        this.rtc = {};
        this.rtc.start();
    },
    sortMembers(m1, m2) {
        const m1HasRtc = Boolean(m1.rtcSession);
        const m2HasRtc = Boolean(m2.rtcSession);
        if (m1HasRtc === m2HasRtc) {
            /**
             * If raisingHand is falsy, it gets an Infinity value so that when
             * we sort by [oldest/lowest-value]-first, falsy values end up last.
             */
            const m1RaisingValue = m1.rtcSession?.raisingHand || Infinity;
            const m2RaisingValue = m2.rtcSession?.raisingHand || Infinity;
            if (m1HasRtc && m1RaisingValue !== m2RaisingValue) {
                return m1RaisingValue - m2RaisingValue;
            } else {
                return super.sortMembers(m1, m2);
            }
        } else {
            return m2HasRtc - m1HasRtc;
        }
    },
};
patch(Store.prototype, StorePatch);
