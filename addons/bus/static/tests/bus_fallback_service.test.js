import {
    addBusServiceListeners,
    defineBusModels,
    startBusService,
} from "@bus/../tests/bus_test_helpers";
import { WEBSOCKET_CLOSE_CODES, WORKER_STATE } from "@bus/workers/websocket_worker";
import { describe, expect, test } from "@odoo/hoot";
import { runAllTimers, advanceTime, microTick } from "@odoo/hoot-dom";
import { getService, makeMockEnv, MockServer } from "@web/../tests/web_test_helpers";
import { getWebSocketWorker } from "./mock_websocket";

defineBusModels();
describe.current.tags("desktop");

const fallbackMethod = () => {
    expect.step("fallbackMethod called");
};

test("bus fallback is started when disconnected", async () => {
    addBusServiceListeners(
        ["BUS:CONNECT", () => expect.step("BUS:CONNECT")],
        ["BUS:DISCONNECT", () => expect.step("BUS:DISCONNECT")],
        ["BUS:RECONNECT", () => expect.step("BUS:RECONNECT")]
    );

    await makeMockEnv();
    const worker = getWebSocketWorker();
    const busFallbackService = getService("bus_fallback_service");
    // Use an interval much larger than the worker's reconnect delay (up to
    // 1s, see RECONNECT_JITTER in websocket_worker.js)
    busFallbackService.registerFallback(fallbackMethod, 5000);

    startBusService();
    await runAllTimers();
    await expect.waitForSteps(["BUS:CONNECT"]);
    expect(worker.state).toBe(WORKER_STATE.CONNECTED);
    expect(busFallbackService.state).toBe(false);

    MockServer.env["bus.bus"]._simulateDisconnection(WEBSOCKET_CLOSE_CODES.KEEP_ALIVE_TIMEOUT);
    await expect.waitForSteps(["fallbackMethod called"]);
    expect(busFallbackService.state).toBe(true);
    await expect.waitForSteps(["BUS:DISCONNECT"]);
    expect(worker.state).toBe(WORKER_STATE.DISCONNECTED);

    // Bounded on purpose: a bare runAllTimers() advances to the furthest
    // currently pending timer, which would be this fallback's own 5000ms
    // reschedule (registered above) rather than just the reconnect retry.
    await advanceTime(1000);
    await expect.waitForSteps(["BUS:RECONNECT"]);
    expect(busFallbackService.state).toBe(false);
    expect(worker.state).toBe(WORKER_STATE.CONNECTED);
});

test("bus fallback interval is respected", async () => {
    await makeMockEnv();
    const busFallbackService = getService("bus_fallback_service");
    const worker = getWebSocketWorker();
    expect(worker.state).toBe(WORKER_STATE.IDLE);
    busFallbackService.registerFallback(fallbackMethod, 100);

    busFallbackService.startFallbacks();
    // runFallback reschedules its next call one microtask tick after the
    // immediate call resolves, so without settling that tick first,
    // advanceTime computes its virtual-clock jump before the 2nd call's
    await microTick();
    await advanceTime(150);
    await expect.waitForSteps(["fallbackMethod called", "fallbackMethod called"]);
    busFallbackService.stopFallbacks();

    await runAllTimers();
    expect.step("No more fallbackMethod called");
    await expect.waitForSteps(["No more fallbackMethod called"]);
});
