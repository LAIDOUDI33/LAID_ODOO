import { useLayoutEffect } from "@web/owl2/utils";
import { Discuss } from "@mail/core/public_web/discuss_app/discuss_app";

import { asyncComputed, onWillStart, proxy } from "@odoo/owl";

import { useService } from "@web/core/utils/hooks";
import { FormRenderer } from "@web/views/form/form_renderer";

export class LivechatSessionFormRenderer extends FormRenderer {
    static template = "im_livechat.LivechatDiscuss";
    static components = {
        ...FormRenderer.components,
        Discuss,
    };

    setup() {
        super.setup();
        this.store = proxy(useService("mail.store"));
        this.channel = asyncComputed(() => this.getChannel(this.props));
        onWillStart(() => this.channel.currentPromise());
        useLayoutEffect(
            (channel) => {
                if (channel) {
                    channel.shadowedBySelf++;
                    return () => channel.shadowedBySelf--;
                }
            },
            () => [this.channel()]
        );
    }

    /**
     * Restore the discuss channel according to record id in the props if
     * necessary.
     *
     * @param {Props} props
     */
    async getChannel(props) {
        return await this.store["discuss.channel"].getOrFetch(props.record.resId);
    }

    redirectToSessions() {
        this.env.services.action.doAction("im_livechat.discuss_channel_action", {
            clearBreadcrumbs: true,
        });
    }
}
