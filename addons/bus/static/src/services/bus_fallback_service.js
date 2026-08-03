import { browser } from "@web/core/browser/browser";
import { registry } from "@web/core/registry";
import { WORKER_STATE } from "@bus/workers/websocket_worker";
import { reactive } from "@odoo/owl";

/**
 * This service allows to register fallback methods that will be called
 * while the bus is disconnected. It is called immediately upon disconnection
 * then again `interval` milliseconds after the previous call completes,
 * only on the main tab and only while the browser is online.
 */
export const busFallbackService = {
    dependencies: ["bus_service"],
    start(env, { bus_service }) {
        const fallbacks = new Map();

        /**
         * Register a fallback method to be called while the bus is
         * disconnected. It is called immediately upon disconnection, then
         * again `interval` milliseconds after the previous call completes,
         * only on the main tab and only while the browser is online.
         *
         * @param {function} fallbackMethod
         * @param {number} interval in milliseconds
         */
        function registerFallback(fallbackMethod, interval = 10000) {
            if (fallbacks.has(fallbackMethod)) {
                return;
            }

            fallbacks.set(fallbackMethod, { interval, timeoutId: null, active: false });
            if (bus_service.workerState === WORKER_STATE.DISCONNECTED) {
                startFallbacks();
            }
        }

        /**
         * Unregister a fallback method.
         *
         * @param {function} fallbackMethod
         */
        function unregisterFallback(fallbackMethod) {
            const fallback = fallbacks.get(fallbackMethod);
            if (fallback) {
                browser.clearTimeout(fallback.timeoutId);
                fallbacks.delete(fallbackMethod);
            }
        }

        /**
         * Run one fallback call, then schedule the next one `interval`
         * milliseconds after it completes, so that calls never overlap even
         * when the method takes longer than the interval (e.g. a request
         * timing out because the server is unreachable).
         *
         * @param {function} fallbackMethod
         * @param {{ interval: number, timeoutId: number|null, active: boolean }} fallback
         */
        async function runFallback(fallbackMethod, fallback) {
            fallback.timeoutId = null;

            if (bus_service.workerState === WORKER_STATE.CONNECTED) {
                state.state = false;
                return;
            }

            if (browser.navigator.onLine) {
                try {
                    await fallbackMethod();
                } catch {
                    // Failures are expected while the bus is down, retry at
                    // the next tick.
                }
            }

            // Stopped, or unregistered (possibly re-registered), while the
            // call was in flight.
            if (fallbacks.get(fallbackMethod) !== fallback) {
                return;
            }

            fallback.timeoutId = browser.setTimeout(
                () => runFallback(fallbackMethod, fallback),
                fallback.interval
            );
        }

        /**
         * Start all registered fallback methods if this tab is the main tab
         * and the bus is disconnected. While the browser is offline, the
         * scheduling keeps running but the calls themselves are skipped.
         */
        async function startFallbacks() {
            state.state = true;
            for (const [fallbackMethod, fallback] of fallbacks) {
                if (fallback.active) {
                    continue;
                }

                fallback.active = true;
                runFallback(fallbackMethod, fallback);
            }
        }

        function stopFallbacks() {
            state.state = false;
            for (const fallback of fallbacks.values()) {
                browser.clearTimeout(fallback.timeoutId);
                fallback.timeoutId = null;
                fallback.active = false;
            }
        }

        bus_service.addEventListener("BUS:WORKER_STATE_UPDATED", (data) => {
            const state = data.detail;
            if (state === WORKER_STATE.DISCONNECTED) {
                startFallbacks();
            } else if (state === WORKER_STATE.CONNECTED) {
                stopFallbacks();
            }
        });

        const state = reactive({
            state: false,
            registerFallback,
            unregisterFallback,
            startFallbacks,
            stopFallbacks,
        });

        return state;
    },
};

registry.category("services").add("bus_fallback_service", busFallbackService);
