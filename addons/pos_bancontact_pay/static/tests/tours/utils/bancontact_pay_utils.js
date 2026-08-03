/* global posmodel */

// -------------------------------
// Bancontact payment callbacks
// -------------------------------
export function mockCallbackBancontactPay(bancontact_id, status) {
    const delay = 200; // ms
    return [
        {
            content: `wait for ${delay} ms`,
            trigger: "body",
            run: async () => {
                await new Promise((resolve) => setTimeout(resolve, delay));
            },
        },
        {
            content: "mock scan QR code",
            trigger: "body",
            run: async () => {
                const configId = posmodel.config.id;
                fetch(`/bancontact_pay/webhook?config_id=${configId}&mode=test`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: bancontact_id, status: status }),
                });
            },
        },
        {
            content: `wait for ${delay} ms`,
            trigger: "body",
            run: async () => {
                await new Promise((resolve) => setTimeout(resolve, delay));
            },
        },
    ].flat();
}

// -------------------------------
// Console error mocking
// -------------------------------
/**
 * Temporarily disables `console.error` during a test run.
 *
 * This helper is used when mocking failed Bancontact API responses.
 * In that scenario, the error is intentionally thrown and bubbles up,
 * which would normally trigger `console.error`.
 *
 * In the test environment, logging an error causes the backend to record
 * the error and marks the tour as failed, even though the failure is expected
 * and the test itself is successful.
 *
 * This setup step silences `console.error` to prevent false-negative test
 * failures caused by expected Bancontact HTTP errors.
 *
 * @param {Object} memo
 *   Mutable object used to store the original `console.error` reference
 *   so it can be restored during teardown.
 */
export function setupBancontactErrorHttp(memo) {
    return {
        content: "setup Bancontact error http mocking",
        trigger: "body",
        run: () => {
            memo.consoleError = console.error;
            console.error = () => {};
        },
    };
}

/**
 * Restores the original `console.error` after Bancontact HTTP error mocking.
 *
 * This teardown step re-enables normal error logging once the test is done,
 * ensuring that real errors are logged correctly outside of the mocked
 * Bancontact failure scenario.
 *
 * @param {Object} memo
 *   Mutable object used to store the original `console.error` reference.
 */
export function teardownBancontactErrorHttp(memo) {
    return {
        content: "teardown Bancontact error http mocking",
        trigger: "body",
        run: () => {
            console.error = memo.consoleError;
            memo.consoleError = null;
        },
    };
}
