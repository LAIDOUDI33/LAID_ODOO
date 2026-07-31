import { fields, Record } from "@mail/model/export";

import { immediateEffect, untrack } from "@odoo/owl";

/**
 * @typedef {object} ServerSessionInfo
 * @property {boolean} [is_camera_on]
 * @property {boolean} [is_screen_sharing_on]
 * @property {boolean} [is_muted]
 * @property {boolean} [is_deaf]
 */

/**
 * @typedef {object} SessionInfo
 * @property {boolean} [isSelfMuted]
 * @property {boolean} [isDeaf]
 * @property {boolean} [isTalking]
 * @property {boolean} [isRaisingHand]
 * @property {boolean} [isCameraOn]
 * @property {boolean} [isScreenSharingOn]
 */

export class RtcSession extends Record {
    static _name = "discuss.channel.rtc.session";
    /** @type {Map<number, PromiseWithResolvers<import("models").RtcSession|undefined>>} */
    static awaitedRecords = new Map();

    static _insert() {
        /** @type {import("models").RtcSession} */
        const session = super._insert(...arguments);
        session.channel?.rtc_session_ids.add(session);
        return session;
    }

    /** @returns {Promise<import("models").RtcSession>} */
    static async getWhenReady(id) {
        const session = this.get(id);
        if (session) {
            return session;
        }
        const sessionPromise = this.awaitedRecords.get(id)?.promise;
        if (sessionPromise) {
            return sessionPromise;
        }
        const promiseWithResolvers = Promise.withResolvers();
        this.awaitedRecords.set(id, promiseWithResolvers);
        const timeout = setTimeout(() => {
            promiseWithResolvers.resolve();
            this.awaitedRecords.delete(id);
        }, 120_000);
        // resolve when the record shows up in the reactive records map
        const localId = this.localId(id);
        const stop = immediateEffect(() => {
            const record = this.records[localId];
            if (record) {
                untrack(() => {
                    promiseWithResolvers.resolve(record);
                    this.awaitedRecords.delete(id);
                });
            }
        });
        promiseWithResolvers.promise.then(() => {
            clearTimeout(timeout);
            stop();
        });
        return promiseWithResolvers.promise;
    }

    setup() {
        super.setup();
        // a session belongs to its channel member: unlinked from it, it is deleted
        this.onRelationChange(
            () => this.channel_member_id,
            ({ removed }) => {
                if (removed.length && !this.channel_member_id) {
                    this.delete();
                }
            }
        );
        this.onChange(
            () => [this.isVideoStreaming],
            function onChangeIsVideoStreaming(isVideoStreaming) {
                if (
                    isVideoStreaming &&
                    this.channel?.channel_type === "chat" &&
                    this.store.rtc.selfSession?.in(this.channel.rtc_session_ids)
                ) {
                    this.channel.focusAvailableVideo();
                }
            },
            { immediate: true }
        );
        this.onChange(
            () => [this.is_screen_sharing_on],
            function onChangeIsScreenSharingOn(is_screen_sharing_on) {
                if (
                    this.eq(this.channel?.activeRtcSession) &&
                    this.mainVideoStreamType === "screen" &&
                    !is_screen_sharing_on
                ) {
                    this.channel.activeRtcSession = undefined;
                }
            },
            { immediate: true }
        );
        this.onChange(
            () => [this.isLocallyMuted],
            function onChangeIsLocallyMuted(isLocallyMuted) {
                if (this.audioElement) {
                    this.audioElement.muted = isLocallyMuted || this.store.rtc.selfSession?.is_deaf;
                }
            },
            { immediate: true }
        );
        this.onChange(
            () => [this.isTalking],
            function onChangeIsTalking(isTalking) {
                if (isTalking && !this.isMute) {
                    this.talkingTime = this.store.nextTalkingTime++;
                }
                this.channel?.updateCallFocusStack(this);
            },
            { immediate: true }
        );
    }

    delete() {
        if (this.eq(this.store.rtc.localSession)) {
            this.store.rtc.notifyServerDisconnect();
            this.store.rtc.endCall();
        }
        this.store.rtc.disconnect(this);
        super.delete(...arguments);
    }

    // Server data
    channel_member_id = fields.One("discuss.channel.member", { inverse: "rtcSession" });
    get partner_id() {
        return this.channel_member_id?.partner_id;
    }
    get guest_id() {
        return this.channel_member_id?.guest_id;
    }
    get persona() {
        return this.partner_id || this.guest_id;
    }
    /** @type {boolean} */
    is_camera_on;
    /** @type {boolean} */
    is_screen_sharing_on;
    /** @type {number} */
    id;
    /** @type {boolean} */
    is_deaf;
    /** @type {boolean} */
    is_muted;
    // Client data
    isLocallyMuted = false;
    /** @type {HTMLAudioElement} */
    audioElement;
    /** @type {MediaStream} */
    audioStream;
    /** @type {RTCDataChannel} */
    dataChannel;
    audioError;
    videoError;
    /** @type {number} value between 0 and 1 that represents volume in % */
    talkingVolume = 0;
    isTalking = false;
    get isActuallyTalking() {
        return this.isTalking && !this.isMute;
    }
    get isVideoStreaming() {
        return this.is_screen_sharing_on || this.is_camera_on;
    }
    get shortStatus() {
        if (this.is_screen_sharing_on) {
            return "live";
        }
        if (this.is_deaf) {
            return "deafen";
        }
        if (this.isMute) {
            return "mute";
        }
        return undefined;
    }
    talkingTime = 0;
    localVolume;
    /** @type {RTCPeerConnection} */
    peerConnection;
    /** @type {Date|undefined} */
    raisingHand;
    videoComponentCount = 0;
    /** @type {Map<import("@mail/discuss/call/common/rtc_service").VideoType, MediaStream>} */
    videoStreams = new Map();
    /** @type {import("@mail/discuss/call/common/rtc_service").VideoType} */
    mainVideoStreamType;
    /**
     * Represents the sequence of the last valid connection with that session. This can be used to
     * compare connection attempts (if they follow the last valid connection) and to validate information
     * (if they match the sequence).
     *
     *  @type {number}
     */
    sequence = 0;
    // RTC stats
    connectionState;
    logStep;

    get channel() {
        return this.channel_member_id?.channel_id?.channel;
    }

    get isMute() {
        return this.is_muted || this.is_deaf;
    }

    get mainVideoStream() {
        return this.isMainVideoStreamActive && this.videoStreams.get(this.mainVideoStreamType);
    }

    get isMainVideoStreamActive() {
        if (!this.mainVideoStreamType) {
            return false;
        }
        return this.mainVideoStreamType === "camera"
            ? this.is_camera_on
            : this.is_screen_sharing_on;
    }

    get hasVideo() {
        return this.is_screen_sharing_on || this.is_camera_on;
    }

    getStream(type) {
        const isActive = type === "camera" ? this.is_camera_on : this.is_screen_sharing_on;
        return isActive && this.videoStreams.get(type);
    }

    /** @returns {SessionInfo} */
    get info() {
        return {
            isSelfMuted: this.is_muted,
            isRaisingHand: Boolean(this.raisingHand),
            isDeaf: this.is_deaf,
            isTalking: this.isTalking,
            isCameraOn: this.is_camera_on,
            isScreenSharingOn: this.is_screen_sharing_on,
        };
    }

    /**
     * @returns {string}
     */
    get name() {
        return this.channel_member_id?.name;
    }

    /**
     * @returns {number} float
     */
    get volume() {
        return this.audioElement?.volume || this.localVolume;
    }

    /** @param {number} value */
    set volume(value) {
        if (this.audioElement) {
            this.audioElement.volume = value;
        }
        this.localVolume = value;
    }

    async playAudio() {
        if (!this.audioElement) {
            return;
        }
        if (this.store.settings.audioOutputDeviceId) {
            // skipping, it will use the default device.
            await this.audioElement.setSinkId(this.store.settings.audioOutputDeviceId).catch();
        }
        try {
            await this.audioElement.play();
            this.audioError = undefined;
        } catch (error) {
            this.audioError = error.name;
        }
    }

    /**
     * @param {import("@mail/discuss/call/common/rtc_service").StreamType} type
     * @param {boolean} state
     */
    updateStreamState(type, state) {
        if (type === "camera") {
            this.is_camera_on = state;
        } else if (type === "screen") {
            this.is_screen_sharing_on = state;
        }
    }
}

RtcSession.register();
