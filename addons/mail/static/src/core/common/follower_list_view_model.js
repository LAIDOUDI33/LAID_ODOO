import { fields, Record } from "@mail/model/export";
import { ConnectionAbortedError, rpc } from "@web/core/network/rpc";

/**
 * Holds the follower list state owned by a single FollowerList component.
 *
 * Keeping the relation on this record prevents independently rendered follower
 * lists from sharing their loaded pages through the thread model.
 */
export class FollowerListView extends Record {
    followers = fields.Many("mail.followers");
    /** @type {number} */
    followersCount;
    /** @type {number} */
    id;
    thread = fields.One("mail.thread");

    get isFullyLoaded() {
        return this.followers.length >= this.followersCount;
    }

    /**
     * Fetches and appends the next page of followers.
     *
     * Follower records are normalized in the global store, while their ordered
     * relation remains scoped to this view.
     *
     * @param {Object} options
     * @param {AbortSignal} options.abortSignal Signal used to cancel the RPC when
     * the component owning this view is destroyed, preventing a stale response
     * from updating the deleted view.
     */
    loadFollowers({ abortSignal }) {
        if (abortSignal.aborted) {
            console.warn("FollowerListView.loadFollowers aborted before starting");
            return;
        }
        const request = rpc("/mail/thread/get_followers", {
            thread_id: this.thread.id,
            thread_model: this.thread.model,
            offset: this.followers.length,
        });
        const abortRequest = () => request.abort();
        abortSignal.addEventListener("abort", abortRequest, { once: true });
        return request
            .then(({ follower_ids, followers_count, store_data }) => {
                if (abortSignal.aborted) {
                    console.warn("FollowerListView.loadFollowers aborted after request");
                    return;
                }
                this.store.insert(store_data);
                this.followersCount = followers_count ?? this.followersCount;
                this.followers.add(...follower_ids);
            })
            .catch((error) => {
                if (!(error instanceof ConnectionAbortedError)) {
                    throw error;
                }
            })
            .finally(() => abortSignal.removeEventListener("abort", abortRequest));
    }
}

FollowerListView.register();
