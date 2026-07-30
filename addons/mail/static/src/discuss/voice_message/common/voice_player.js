import {
    Component,
    onMounted,
    onWillUnmount,
    props,
    proxy,
    signal,
    status,
    types,
} from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { clamp } from "@web/core/utils/numbers";
import { url } from "@web/core/utils/urls";
import { useOnChange } from "@mail/utils/common/hooks";

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 3;
const BAR_RADIUS = 1.5;
const WAVE_AMPLITUDE = 0.65;
const WAVE_COLOR = "#7775";

export class VoicePlayer extends Component {
    static template = "mail.VoicePlayer";

    playRequestId = 0;
    lastPos = 0;
    /** @type {string} */
    progressColor;
    duration = 0;
    isAudioLoading = false;
    /** @type {string} */
    audioUrl;
    /** @type {number[]} */
    peaks;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    barCount;
    /** @type {HTMLElement} */
    wrapper;
    /** @type {HTMLElement} */
    progressWave;
    /** @type {HTMLAudioElement} */
    audioEl;
    /** @type {CanvasRenderingContext2D} */
    waveCtx;
    /** @type {CanvasRenderingContext2D} */
    progressCtx;
    wrapperRef = signal.ref();
    drawerRef = signal.ref();
    waveRef = signal.ref();
    progressRef = signal.ref();
    audioRef = signal.ref();

    setup() {
        super.setup();
        this.store = useService("mail.store");
        this.props = props({
            attachment: types.instanceOf(this.store["ir.attachment"].Class),
        });
        /** @type {import("@mail/discuss/voice_message/common/voice_message_service").VoiceMessageService} */
        this.voiceMessageService = useService("discuss.voice_message");
        this.notification = useService("notification");
        this.state = proxy({
            paused: true,
            playing: false,
            repeat: false,
            currentTime: "00:00",
            totalTime: "00:00",
        });
        useOnChange(
            () => [this.props.attachment.uploading],
            () => {
                if (!this.props.attachment.uploading) {
                    this.loadAudio();
                }
            },
            { initialRun: false }
        );
        onMounted(() => {
            this.initElements();
            this.audioEl = this.audioRef();
            this.audioEl.addEventListener("ended", () => this.pause({ end: true }));
            this.wrapper.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.props.attachment.uploading || this.isAudioLoading) {
                    return;
                }
                const clientX = (e.targetTouches ? e.targetTouches[0] : e).clientX;
                const bcr = this.wrapper.getBoundingClientRect();
                const progressPixels = clientX - bcr.left;
                const progress = clamp(progressPixels / this.wrapper.scrollWidth, 0, 1);
                this.seekTo(progress);
            });
            if (!this.props.attachment.uploading) {
                this.loadAudio();
            }
        });
        onWillUnmount(() => {
            if (this.state.playing) {
                this.pause();
            }
            this.destroyAudio();
        });
    }

    get voice() {
        return this.props.attachment.voice_ids?.[0];
    }

    get playIconClass() {
        if (this.state.playing) {
            return "fa-pause";
        }
        return this.state.repeat ? "fa-refresh" : "fa-play";
    }

    get playTitle() {
        if (this.state.playing) {
            return _t("Pause");
        }
        return this.state.repeat ? _t("Replay") : _t("Play");
    }

    initElements() {
        this.wrapper = this.wrapperRef();
        this.progressWave = this.drawerRef();
        this.progressColor = getComputedStyle(this.wrapper).getPropertyValue("--primary");
        this.width = this.wrapper.clientWidth;
        this.height = this.wrapper.clientHeight;
        // Fill the available width with evenly spaced bars (bar + gap)
        this.barCount = Math.max(1, Math.round((this.width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
        this.waveCtx = this.setupCanvas(this.waveRef(), WAVE_COLOR);
        this.progressCtx = this.setupCanvas(this.progressRef(), this.progressColor);
    }

    setupCanvas(canvas, color) {
        const ratio = window.devicePixelRatio || 1;
        // Scale the backing canvas to the device pixel ratio for sharper rendering.
        canvas.width = Math.round(this.width * ratio);
        canvas.height = Math.round(this.height * ratio);
        canvas.style.width = `${this.width}px`;
        canvas.style.height = `${this.height}px`;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        return ctx;
    }

    loadAudio() {
        if (this.isAudioLoading) {
            return;
        }
        this.isAudioLoading = true;
        return this._loadAudio()
            .catch((err) => {
                this.notification.add(err?.message, { type: "warning" });
            })
            .finally(() => {
                this.isAudioLoading = false;
            });
    }

    async _loadAudio() {
        this.destroyAudio();
        const blob = await this.fetchFile();
        const audioUrl = URL.createObjectURL(blob);
        this.audioUrl = audioUrl;
        if (this.audioEl) {
            this.audioEl.src = audioUrl;
        }
        const audioCtx = new browser.AudioContext();
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = await audioCtx.decodeAudioData(arrayBuffer);
            this.duration = buffer.duration;
            this.state.totalTime = this.generateTime(Math.round(buffer.duration));
            this.setVisualTime(0);
            this.peaks = this.getPeaks(buffer);
            this.onProgress(0);
            this.drawWave(this.peaks);
            this.applySettings();
        } finally {
            try {
                await audioCtx.close();
            } catch (err) {
                if (err.name !== "InvalidStateError") {
                    this.notification.add(err?.message, { type: "warning" });
                }
            }
        }
    }

    async fetchFile() {
        const audioUrl = url(this.props.attachment.urlRoute, {
            ...this.props.attachment.urlQueryParams,
        });
        const response = await browser.fetch(audioUrl);
        if (!response.ok) {
            throw new Error("HTTP error status: " + response.status);
        }
        return response.blob();
    }

    getPeaks(buffer) {
        const peaks = [];
        // Number of audio samples represented by each bar.
        const sampleSize = buffer.length / this.barCount;
        // Sample roughly 10 points per bar instead of every sample.
        // This significantly reduces processing while preserving the visual shape.
        const sampleStep = Math.max(1, Math.floor(sampleSize / 10));
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < this.barCount; i++) {
            const start = Math.floor(i * sampleSize);
            const end = Math.floor(start + sampleSize);
            let max = 0;
            for (let j = start; j < end; j += sampleStep) {
                const value = Math.abs(channel[j]);
                if (value > max) {
                    max = value;
                }
            }
            peaks[i] = max;
        }
        return peaks;
    }

    drawWave(peaks) {
        return browser.requestAnimationFrame(() => {
            this.drawLineToContext(this.waveCtx, peaks);
            this.drawLineToContext(this.progressCtx, peaks);
        });
    }

    drawLineToContext(ctx, peaks) {
        const { width, height } = ctx.canvas;
        const ratio = width / this.width;
        const maxPeak = Math.max(...peaks) || 1;
        const barWidth = Math.round(BAR_WIDTH * ratio);
        const radius = BAR_RADIUS * ratio;
        // distance between the left edges of consecutive bars evenly distributed across the canvas width.
        const pitch = (width + BAR_GAP * ratio) / peaks.length;
        ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
            // Scale each bar relative to the loudest peak, cap it to a fraction of the canvas height,
            // and enforce a minimum height so sections with silence remain visible.
            const barHeight = Math.round(
                Math.max(BAR_MIN_HEIGHT * ratio, (peaks[i] / maxPeak) * height * WAVE_AMPLITUDE)
            );
            const x = Math.round(i * pitch);
            const y = Math.round((height - barHeight) / 2);
            ctx.roundRect(x, y, barWidth, barHeight, radius);
        }
        ctx.fill();
    }

    play() {
        this.voiceMessageService.activePlayer?.pause();
        this.voiceMessageService.activePlayer = this;
        this.voice.showControls = true;
        if (this.state.repeat) {
            this.seekTo(0);
        }
        this.state.repeat = false;
        this.applySettings();
        const requestId = ++this.playRequestId;
        this.audioEl
            .play()
            .then(() => {
                if (this.playRequestId !== requestId) {
                    return;
                }
                this.state.playing = true;
                this.state.paused = false;
                this.trackPlaybackProgress();
            })
            .catch(() => {
                if (this.playRequestId !== requestId) {
                    return;
                }
                this.voiceMessageService.activePlayer = null;
                this.state.paused = true;
                this.state.playing = false;
            });
    }

    pause(options) {
        this.playRequestId++;
        this.voiceMessageService.activePlayer = null;
        if (options?.end) {
            this.state.repeat = true;
            this.setVisualTime(Math.round(this.duration));
            this.onProgress(1);
        }
        this.audioEl?.pause();
        if (!options?.continue) {
            this.state.paused = true;
            this.state.playing = false;
        }
    }

    seekTo(progress) {
        this.state.repeat = false;
        this.voice.showControls = true;
        const elapsedTime = progress * this.duration;
        this.audioEl.currentTime = elapsedTime;
        this.setVisualTime(Math.floor(elapsedTime));
        this.onProgress(progress);
    }

    trackPlaybackProgress() {
        if (status(this) === "destroyed") {
            return;
        }
        const time = this.audioEl?.currentTime ?? 0;
        if (this.state.playing) {
            this.setVisualTime(Math.floor(time));
            this.onProgress(Math.min(time / this.duration, 1));
            browser.requestAnimationFrame(() => this.trackPlaybackProgress());
        }
    }

    onProgress(progress) {
        // Only update when playback progresses by a visible pixel.
        const position = Math.round(progress * this.width);
        if (position < this.lastPos || position - this.lastPos >= 1) {
            this.lastPos = position;
            this.progressWave.style.width = position + "px";
        }
    }

    applySettings() {
        if (this.audioEl) {
            this.audioEl.playbackRate = this.voice?.playbackRate ?? 1;
            this.audioEl.volume = this.voice?.volume ?? 1;
        }
    }

    setVisualTime(currentInSecond) {
        this.state.currentTime = this.generateTime(currentInSecond);
    }

    generateTime(timeInSecond) {
        const second = timeInSecond % 60;
        const minute = Math.floor(timeInSecond / 60);
        return `${String(minute).padStart(2, "0")} : ${String(second).padStart(2, "0")}`;
    }

    destroyAudio() {
        this.playRequestId++;
        this.audioEl?.pause();
        if (this.audioEl) {
            this.audioEl.removeAttribute("src");
            this.audioEl.load();
        }
        this.state.paused = true;
        this.state.playing = false;
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
            this.audioUrl = "";
        }
        this.duration = 0;
        this.peaks = null;
        this.lastPos = 0;
        if (this.progressWave) {
            this.progressWave.style.width = "0px";
        }
        for (const ctx of [this.waveCtx, this.progressCtx]) {
            ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    onClickPlayPause() {
        if (this.props.attachment.uploading || this.isAudioLoading) {
            return;
        }
        if (this.state.paused) {
            this.play();
        } else {
            this.pause();
        }
    }
}
