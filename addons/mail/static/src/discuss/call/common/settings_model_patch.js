import { ResUsersSettings } from "@mail/core/common/res_users_settings_model";

import { patch } from "@web/core/utils/patch";

patch(ResUsersSettings.prototype, {
    /** @param {import("models").RtcSession} rtcSession */
    getVolume(rtcSession) {
        return (
            rtcSession.volume ??
            this.volume_settings_ids.find(
                (volume) =>
                    volume.partner_id?.eq(rtcSession.partner_id) ||
                    volume.guest_id?.eq(rtcSession.guest_id)
            )?.volume ??
            0.5
        );
    },
});
