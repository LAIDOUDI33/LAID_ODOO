/* global posmodel */

// Once the pay/refund notification has been pushed to the Paymob terminal, the
// terminal's result reaches Odoo through Paymob's callback on
// /pos_paymob/notification. In a tour there is no terminal, so we post the
// callback ourselves to simulate Paymob notifying us of the outcome.
//
// The callback's merchant_order_id routes the result back: the controller reads
// it as "<session_id>_<payment_method_id>_<order_uuid>_<timestamp>". A sale
// callback carries the sale order's uuid; a refund callback carries the original
// sale's uuid (Paymob gives no link to the refund order).
async function postPaymobCallback(obj, { hmac = "" } = {}) {
    // A sale callback must carry an hmac query arg (verified server-side; the
    // test patches _verify_hmac to accept it). A reversal is confirmed by an
    // authenticated inquiry instead, so it needs no hmac.
    const url = hmac ? `/pos_paymob/notification?hmac=${hmac}` : "/pos_paymob/notification";
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obj }),
    });
    if (!resp.ok) {
        throw new Error(`Paymob callback failed with status ${resp.status}`);
    }
}

function merchantOrderId(paymentMethodId, orderUuid) {
    const sessionId = posmodel.config.current_session_id.id;
    // Trailing timestamp is ignored by the controller (per-attempt uniqueness).
    return `${sessionId}_${paymentMethodId}_${orderUuid}_0`;
}

// Simulate a successful sale callback for the pending Paymob payment line.
export async function mockPaymobSaleCallback(transactionId = 7000001) {
    const line = posmodel.getPendingPaymentLine("paymob");
    await postPaymobCallback(
        {
            id: transactionId,
            success: true,
            is_refunded: false,
            is_voided: false,
            amount_cents: Math.round(line.amount * 100),
            order: {
                merchant_order_id: merchantOrderId(
                    line.payment_method_id.id,
                    line.pos_order_id.uuid,
                ),
            },
            source_data: { pan: "2345", sub_type: "MasterCard", type: "card" },
            data: { message: "Approved" },
        },
        { hmac: "test-signature" },
    );
}

// Simulate a successful refund callback. It carries the ORIGINAL sale's uuid,
// captured onto the refund line by updateRefundPaymentLine.
export async function mockPaymobRefundCallback(transactionId = 7000002) {
    const line = posmodel.getPendingPaymentLine("paymob");
    await postPaymobCallback({
        id: transactionId,
        is_refunded: true,
        is_voided: false,
        order: {
            merchant_order_id: merchantOrderId(
                line.payment_method_id.id,
                line.uiState.paymobRefundOrderUuid,
            ),
        },
    });
}
