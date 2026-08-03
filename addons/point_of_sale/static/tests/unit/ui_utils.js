import { animationFrame, press, tick, waitFor, queryAll } from "@odoo/hoot-dom";
import { contains, getService, mountWithCleanup } from "@web/../tests/web_test_helpers";
import { Chrome } from "@point_of_sale/app/pos_app";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

// Config of a plain register: no floor plan, no preset and no tip to get in the way.
export const NON_RESTAURANT_POS_CONFIG = {
    module_pos_restaurant: false,
    set_tip_after_payment: false,
    available_preset_ids: [],
};

const NUMBER_POPUP_TYPE_PREFIX = "number-popup-type-";
const PAYMENT_STATUS_TITLE_PREFIX = "paymentline_status_title_";

// Amounts are rendered with non-breaking spaces, which are impractical to assert on.
function normalizeText(text) {
    return text.replaceAll("\u00a0", " ").trim();
}

export function isMobile() {
    return getService("ui").isSmall;
}

export async function ensurePane(targetPane) {
    if (!isMobile()) {
        return;
    }
    const pos = getService("pos");
    if (pos.mobile_pane !== targetPane) {
        pos.switchPane();
        await animationFrame();
    }
}

export async function ensureTicketPane(targetPane) {
    if (!isMobile()) {
        return;
    }
    const pos = getService("pos");
    if (pos.ticket_screen_mobile_pane !== targetPane) {
        pos.switchPaneTicketScreen();
        await animationFrame();
    }
}

export async function mountPosApp(store) {
    store.session.state = "opened";
    await mountWithCleanup(Chrome, { props: { disableLoader: () => {} } });
    await tick();
    await animationFrame();
}

export async function mountProductScreen(store) {
    return mountWithCleanup(ProductScreen, {
        props: { orderUuid: store.getOrder().uuid },
    });
}

export function queryEl(selector, text) {
    const els = document.querySelectorAll(selector);
    if (!text) {
        return els[0] || null;
    }
    for (const el of els) {
        if (el.textContent.includes(text)) {
            return el;
        }
    }
    return null;
}

export async function clickDisplayedProduct(name) {
    await ensurePane("right");
    await contains(`article.product .product-name:contains("${name}")`).click();
    await animationFrame();
}

export async function clickNumpad(key) {
    await ensurePane("left");
    const label = key === "backspace" ? "⌫" : key;
    await contains(`.numpad button:contains("${label}")`).click();
    await animationFrame();
}

export async function enterNumpadValue(value) {
    for (const char of value.toString().split("")) {
        await clickNumpad(char);
    }
}

export async function sendBufferKeys(...keys) {
    const numberBuffer = getService("number_buffer");
    for (const key of keys.flat()) {
        numberBuffer.sendKey(key);
    }
    numberBuffer.capture();
    await animationFrame();
}

export async function clickPartnerButton() {
    await ensurePane("left");
    await contains(".product-screen .set-partner").click();
    await animationFrame();
    await waitFor(".partner-list");
}

export async function selectCustomer(name) {
    await clickPartnerButton();
    await contains(`.partner-info:contains("${name}")`).click();
    await animationFrame();
}

export async function checkSelectedCustomer(name) {
    if (!isMobile()) {
        await waitFor(`.set-partner:contains("${name}")`);
        await animationFrame();
    } else {
        await contains(".set-partner.btn-outline-secondary").click();
        await animationFrame();
        await queryEl(".partner-info .selected", name);
        await animationFrame();
        await contains(".modal-footer .btn-secondary").click();
        await animationFrame();
    }
}

export async function clickNewOrder() {
    await contains(".floor-screen .btn-new-order").click();
    await animationFrame();
}

export async function clickControlButton(label) {
    await ensurePane("left");
    const btn = [
        ...document.querySelectorAll(".control-buttons button, .control-button, .actionpad button"),
    ].find((el) => el.textContent.includes(label));
    if (btn) {
        await contains(btn).click();
    } else {
        if (isMobile()) {
            await contains(".product-screen .mobile-more-button").click();
        } else {
            await contains(".product-screen .more-btn").click();
        }
        await animationFrame();
        await contains(`.control-buttons-modal .control-button:contains("${label}")`).click();
    }
    await animationFrame();
}

export async function selectPreset(presetName) {
    await ensurePane("left");
    await contains(`.selection-item:contains("${presetName}")`).click();
    await animationFrame();
}

export async function clickOrderButton() {
    await ensurePane("left");
    await contains(".actionpad .submit-order").click();
    await animationFrame();
}

export async function clickPayButton() {
    await ensurePane("left");
    await contains(".actionpad .pay-order-button").click();
    await animationFrame();
}

export async function clickPaymentMethod(name) {
    await contains(`.paymentmethod:contains("${name}")`).click();
    await animationFrame();
}

export async function clickValidatePayment() {
    await contains(".payment-screen .validation-button.highlight").click();
    await tick();
    await animationFrame();
}

export async function clickNextOrder() {
    await contains(".feedback-screen .validation").click();
    await animationFrame();
}

export async function clickSplitButton() {
    await clickControlButton("Split");
}

export async function clickSplitOrderline(productName) {
    await contains(`.splitbill-screen .orderline .product-name:contains("${productName}")`).click();
    await animationFrame();
}

export async function clickSplitAction(buttonName) {
    await contains(`.splitbill-screen .pay-button button:contains("${buttonName}")`).click();
    await animationFrame();
}

export async function clickOrders() {
    await contains(".pos-leftheader .orders-button").click();
    await animationFrame();
}

export async function clickRegister() {
    await contains(".pos-leftheader .register-label").click();
    await animationFrame();
}

export async function selectTicketOrder(reference) {
    await ensureTicketPane("left");
    await contains(`.ticket-screen .order-row:contains("${reference}")`).click();
    await animationFrame();
}

export async function loadSelectedOrder() {
    if (isMobile()) {
        await ensureTicketPane("left");
        await contains(".ticket-screen .load-order-button").click();
    } else {
        await contains(".ticket-screen .pads .btn-primary").click();
    }
    await animationFrame();
}

export async function clickTicketReviewButton() {
    await ensureTicketPane("left");
    await contains(".ticket-screen .review-button").click();
    await animationFrame();
}

export async function clickTicketAction(buttonText) {
    await ensureTicketPane("right");
    await contains(`.ticket-screen .pads button:contains("${buttonText}")`).click();
    await animationFrame();
}

export async function clickTicketNumpad(key) {
    if (isMobile()) {
        await ensureTicketPane("right");
    }
    const label = key === "backspace" ? "⌫" : key;
    await contains(`.ticket-screen .numpad button:contains("${label}")`).click();
    await animationFrame();
}

export async function clickDeleteOrderOnTicket(orderRef) {
    await ensureTicketPane("left");
    if (orderRef) {
        await selectTicketOrder(orderRef);
    }
    if (isMobile()) {
        const row = document.querySelector(`.ticket-screen .order-row.highlight [name="delete"]`);
        if (row) {
            await contains(row).click();
        } else {
            await contains(`.ticket-screen .order-row.highlight [data-icon='delete']`).click();
        }
    } else {
        if (orderRef) {
            await contains(
                `.ticket-screen .order-row:contains("${orderRef}") .delete-column button`
            ).click();
        } else {
            await contains(".ticket-screen .order-row .delete-column button").click();
        }
    }
    await animationFrame();
}

export async function confirmDialog(buttonText) {
    await waitFor(".modal");
    if (buttonText) {
        await contains(`.modal .btn:contains("${buttonText}")`).click();
    } else {
        await contains(".modal .btn-primary").click();
    }
    await animationFrame();
}

export async function cancelDialog() {
    await waitFor(".modal");
    await contains(".modal .btn-secondary").click();
    await animationFrame();
}

export async function addCustomerNote(text) {
    await clickControlButton("Customer Note");
    await waitFor(".modal textarea");
    await contains(".modal textarea").edit(text);
    await contains(".modal .btn-primary").click();
    await animationFrame();
}

export async function clickRefundButton() {
    await clickControlButton("Refund");
    await animationFrame();
}

export async function selectComboItem(productName) {
    await contains(
        `.modal label.combo-item article.product:has(.product-name:contains("${productName}"))`
    ).click();
    await animationFrame();
}

export async function confirmCombo() {
    await contains(".modal footer button.confirm").click();
    await animationFrame();
}

export async function clickOrderline(productName) {
    await ensurePane("left");
    await contains(`.orderline .product-name:contains("${productName}")`).click();
    await animationFrame();
}

export function getOrderTotal() {
    const el = document.querySelector(".order-summary .total");
    return el ? el.textContent.trim() : "";
}

export function getOrderlineNames() {
    return queryAll(".orderline .product-name").map((el) => el.textContent.trim());
}

export function dialogTitle() {
    const el = document.querySelector(".modal .modal-title");
    return el ? normalizeText(el.textContent) : null;
}

export async function dialogBody() {
    await waitFor(".modal .modal-body");
    return normalizeText(document.querySelector(".modal .modal-body").textContent);
}

// ----- Number popup ----- //
export function numberPopupValue() {
    const el = document.querySelector(".modal .popup-input .input-value");
    return el ? normalizeText(el.textContent) : null;
}

export async function clickNumberPopupType(name) {
    await contains(`.modal .number-popup-types .${NUMBER_POPUP_TYPE_PREFIX}${name}`).click();
    await animationFrame();
}

export function selectedNumberPopupType() {
    const el = document.querySelector(".modal .number-popup-types .number-popup-type.text-primary");
    const type = el && [...el.classList].find((cls) => cls.startsWith(NUMBER_POPUP_TYPE_PREFIX));
    return type ? type.slice(NUMBER_POPUP_TYPE_PREFIX.length) : null;
}

// The popup footer is squeezed out of view in the test fixture, so the hotkey is
// used instead of the confirm button.
export async function confirmNumberPopup() {
    await press("Enter");
    await animationFrame();
}

// ----- Orders ----- //
export async function createFloatingOrder() {
    await contains(".pos-leftheader .list-plus-btn").click();
    await waitFor(".product-screen");
    await animationFrame();
}

// The order tabs collapse into a dialog as soon as they do not fit the header,
// which is always the case in the test fixture.
export async function clickFloatingOrder(name) {
    const button = `.floating-order-container button:contains("${name}")`;
    const toggle = document.querySelector(".pos-leftheader .list-container-items > button");
    if (toggle) {
        await contains(toggle).click();
        await waitFor(".modal .list-container-items");
        await contains(`.modal ${button}`).click();
    } else {
        await contains(`.pos-leftheader ${button}`).click();
    }
    await animationFrame();
}

export function setFlatProductPrice(store, price) {
    store.models["product.pricelist.item"].get(1).fixed_price = price;
    store.models["product.template"].get(5).taxes_id = [];
}

// ----- Payment lines ----- //
// `.paymentlines` also holds the status block of the selected line, so `nth`
// counts it in.
function paymentlineSelector({ name, amount, nth, selected } = {}) {
    const selectedSelector = selected ? ".selected" : "";
    const nameSelector = name ? `:has(.payment-name:contains("${name}"))` : "";
    const amountSelector = amount ? `:has(.payment-amount:contains("${amount}"))` : "";
    const nthSelector = nth ? `:nth-of-type(${nth})` : "";

    return `.paymentlines .paymentline${nthSelector}${selectedSelector}${nameSelector}${amountSelector}`;
}

export async function clickPaymentline(opts) {
    await contains(`${paymentlineSelector(opts)} .payment-infos`).click();
    await animationFrame();
}

export async function deletePaymentline(opts) {
    await contains(`${paymentlineSelector(opts)} .delete-button`).click();
    await animationFrame();
}

export function countPaymentlines() {
    return document.querySelectorAll(".paymentlines .paymentline").length;
}

export function selectedPaymentline() {
    const line = document.querySelector(".paymentlines .paymentline.selected");
    if (!line) {
        return null;
    }
    return {
        name: normalizeText(line.querySelector(".payment-name").textContent),
        amount: normalizeText(line.querySelector(".payment-amount").textContent),
    };
}

export function actionState() {
    const title = document.querySelector(".paymentline_status .paymentline_status_title");
    const state =
        title && [...title.classList].find((cls) => cls.startsWith(PAYMENT_STATUS_TITLE_PREFIX));
    return state ? state.slice(PAYMENT_STATUS_TITLE_PREFIX.length) : null;
}

// `.paymentline_status` fades in through a CSS animation, and animations are
// disabled in the fixture, so its buttons keep `opacity: 0` and never pass the
// visibility check.
async function clickActionButton(id) {
    await contains(`.paymentline_status_actions .paymentline_status_actions_button_${id}`, {
        visible: false,
    }).click();
    await animationFrame();
    await animationFrame();
}

export async function clickSendButton() {
    await clickActionButton("send");
}

export async function clickRetryButton() {
    await clickActionButton("retry");
}

export async function clickCancelButton() {
    await clickActionButton("cancel");
}

export async function clickForceDoneButton() {
    await clickActionButton("force_done");
}

// ----- QR code popup ----- //
export function isQrPopupShown() {
    return Boolean(document.querySelector(".modal .o_qr_popup"));
}

export async function qrPopupAmount() {
    await waitFor(".modal .o_qr_popup .qr-code-amount");
    return normalizeText(document.querySelector(".modal .o_qr_popup .qr-code-amount").textContent);
}

export async function closeQrPopup() {
    await contains(".o_qr_popup .qr-code-popup-footer .cancel-button").click();
    await animationFrame();
}

export async function showQrPopup(opts) {
    await contains(`${paymentlineSelector(opts)} .paymentline_show_qr_code`).click();
    await animationFrame();
}

export function isShowQrPopupDisabled(opts) {
    return (
        queryAll(`${paymentlineSelector(opts)} .paymentline_show_qr_code[disabled]`).length === 1
    );
}

// ----- Notifications ----- //
export function notifications() {
    return [...document.querySelectorAll(".o_notification")].map((el) => ({
        type: [...el.querySelector(".o_notification_bar").classList]
            .find((cls) => cls.startsWith("bg-"))
            .slice("bg-".length),
        message: normalizeText(el.querySelector(".o_notification_content").textContent),
    }));
}

export async function closeNotifications() {
    for (const button of [...document.querySelectorAll(".o_notification_close")]) {
        await contains(button).click();
    }
    await animationFrame();
}
