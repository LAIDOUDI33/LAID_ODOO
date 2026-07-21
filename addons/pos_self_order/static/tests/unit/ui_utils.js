import { contains } from "@web/../tests/web_test_helpers";
import { waitFor } from "@odoo/hoot-dom";
import { expect } from "@odoo/hoot";

export const clickBtn = (buttonName) =>
    contains(`.btn:contains(${buttonName}):not(:disabled)`).click();

export const hasBtn = (buttonName) => waitFor(`.btn:contains(${buttonName})`);

// Usage: await Utils.page.isProductList();
export const page = {
    isLanding: () => waitFor(".o_pos_landing_footer"),
    isEatingLocation: () => waitFor(".o_self_eating_location_box"),
    isProductList: () => waitFor(".o_self_product_list_page"),
    isProduct: () => waitFor(".o_self_product_page"),
    isCombo: () => waitFor(".o_self_combo_page"),
    isOptionalProduct: () => waitFor(".o_self_optional_product_page"),
    isConfirmation: () => waitFor(".confirmation-page"),
};

export const clickProduct = (productName) =>
    contains(`.o_self_product_card span:contains('${productName}')`).click();

export const expectProductCardQty = (productName, qty) =>
    expect(
        `.o_self_product_card:has(.self_order_product_name:contains(${productName})):has(.badge:contains(${qty}))`
    ).toBeVisible();

export const setupAttribute = async (attributes, clickAddToCart = true) => {
    for (const { name, value } of attributes) {
        await contains(
            `.o_self_product_page_attributes h2:contains("${name}") + div.row button:contains("${value}")`
        ).click();
    }
    if (clickAddToCart) {
        await clickBtn("Add to cart");
    }
};

export const setupCombo = async (products) => {
    for (const { product, qty, attributes } of products) {
        await clickProduct(product);
        if (qty && qty > 1) {
            for (let i = 1; i < qty; i++) {
                await clickProduct(product);
            }
        }
        if (attributes?.length > 0) {
            await setupAttribute(attributes, false);
        }
        await clickBtn("Next");
    }
    await clickBtn("Add to cart");
};

export const hasCartItem = async ({ productName, qty, price, attributes, combos }) => {
    let selector = `.product-cart-item:has(div:contains(${productName}))`;
    if (qty) {
        selector += `:has(.btn-group .o-so-tabular-nums:contains(${qty}))`;
    }
    if (price) {
        selector += `:has(.line-price:contains(${price}))`;
    }
    for (const attr of attributes || []) {
        selector += `:has(div:contains(${attr}))`;
    }
    for (const comboLine of combos || []) {
        selector += `:has(div:contains(${comboLine}))`;
    }
    await waitFor(selector);
    expect(selector).toBeVisible();
};

export const cartTotalIs = async (total) => {
    const selector = `.order-price span:contains(${total})`;
    await waitFor(selector);
    expect(selector).toBeVisible();
};

export const confirmCart = async (products, total) => {
    const cartItemAsserts = products.map((p) => hasCartItem(p));
    if (total !== undefined) {
        cartItemAsserts.push(cartTotalIs(total));
    }
    await Promise.all(cartItemAsserts);
};
