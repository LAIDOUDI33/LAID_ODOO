import { Thread } from "@mail/core/common/thread_model";

import { patch } from "@web/core/utils/patch";

export const REVIEW_INITIAL_LIMIT = 3;
export const REVIEW_LOAD_MORE_LIMIT = 10;

patch(Thread.prototype, {
    setup() {
        super.setup();
        /** @type {number} */
        this.selectedRating;
        this.ratingChatter = false;
        this.reviewChatter = false;
        this.rating_stats = undefined;
    },

    get initialFetchLimit() {
        if (this.reviewChatter) {
            return REVIEW_INITIAL_LIMIT;
        }
        return super.initialFetchLimit;
    },

    get moreFetchLimit() {
        if (this.reviewChatter) {
            return REVIEW_LOAD_MORE_LIMIT;
        }
        return super.moreFetchLimit;
    },

    getFetchNewMessagesAfter() {
        if (this.ratingChatter) {
            return undefined;
        }
        return super.getFetchNewMessagesAfter();
    },

    getFetchParams() {
        const params = super.getFetchParams(...arguments);
        if (this.ratingChatter && this.selectedRating) {
            params["rating_value"] = this.selectedRating;
        }
        return params;
    },
});
