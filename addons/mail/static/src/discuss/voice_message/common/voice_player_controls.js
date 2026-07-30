import { Component, t, useProps } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { useService } from "@web/core/utils/hooks";

export class VoicePlayerControls extends Component {
    static template = "mail.VoicePlayerControls";
    static components = { Dropdown, DropdownItem };

    setup() {
        super.setup();
        this.playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        this.store = useService("mail.store");
        this.props = useProps({
            attachment: t.instanceOf(this.store["ir.attachment"].Class),
        });
        /** @type {import("@mail/discuss/voice_message/common/voice_message_service").VoiceMessageService} */
        this.voiceMessageService = useService("discuss.voice_message");
    }

    get voice() {
        return this.props.attachment.voice_ids?.[0];
    }

    get activePlayer() {
        const player = this.voiceMessageService?.activePlayer;
        return player?.props.attachment === this.props.attachment ? player : null;
    }

    get playbackRate() {
        return this.voice?.playbackRate ?? 1;
    }

    setPlaybackRate(rate) {
        if (this.voice) {
            this.voice.playbackRate = rate;
            this.voice.showControls = true;
            this.activePlayer?.applySettings();
        }
    }

    get volume() {
        return this.voice?.volume ?? 1;
    }

    get volumePercent() {
        return Math.round(this.volume * 100);
    }

    get volumeIcon() {
        if (this.volume === 0) {
            return "volume_off";
        }
        return this.volume < 0.5 ? "volume_down" : "volume_up";
    }

    setVolume(volume) {
        if (this.voice) {
            this.voice.volume = parseFloat(volume);
            this.voice.showControls = true;
            this.activePlayer?.applySettings();
        }
    }
}
