import { expect, test } from "@odoo/hoot";
import { queryOne } from "@odoo/hoot-dom";
import { contains } from "@web/../tests/web_test_helpers";
import { isHeaderBgBlurAvailable } from "@website/builder/plugins/options/header/header_template_option";
import {
    defineWebsiteModels,
    setupWebsiteBuilder,
} from "@website/../tests/builder/website_helpers";

defineWebsiteModels();

const headerContent = `
    <header id="top" data-anchor="true" data-name="Header">
        <nav class="navbar">Menu Content</nav>
    </header>`;

test("header blur option is only available when the background is not fully opaque", async () => {
    await setupWebsiteBuilder("", { openEditor: false, headerContent });
    const headerEl = queryOne(":iframe #wrapwrap > header");
    const navEl = headerEl.querySelector("nav");
    // The blur is applied on the nav, so only its background is relevant.
    const expectBlur = (navStyle) => {
        navEl.setAttribute("style", navStyle);
        return expect(isHeaderBgBlurAvailable(headerEl));
    };

    expectBlur("background-color: rgb(255, 0, 0)").toBe(false);
    expectBlur("background-color: #ff0000").toBe(false);
    expectBlur("background-color: #ff0000ff").toBe(false);

    expectBlur("").toBe(true);
    expectBlur("background-color: transparent").toBe(true);
    expectBlur("background-color: rgba(255, 0, 0, 0.5)").toBe(true);
    expectBlur("background-color: #ff000080").toBe(true);

    expectBlur("background-image: linear-gradient(rgba(255,0,0,0.5), blue)").toBe(true);
    expectBlur("background-image: linear-gradient(rgba(0,0,0,0.5), rgba(255,255,255,1))").toBe(
        true
    );
    expectBlur("background-image: linear-gradient(#ff000080, #0000ffff)").toBe(true);
    expectBlur("background-image: linear-gradient(#ff0000, #0000ff)").toBe(false);

    expectBlur(
        "background-color: #ff000080; background-image: linear-gradient(#ff0000, #0000ff)"
    ).toBe(false);
    expectBlur(
        "background-color: #ff0000; background-image: linear-gradient(#ff000080, #0000ff)"
    ).toBe(false);
});

test("the blur option is hidden for an opaque header background", async () => {
    const { waitSidebarUpdated } = await setupWebsiteBuilder("", {
        openEditor: true,
        headerContent,
        styleContent: `#wrapwrap > header nav { background-color: rgb(255, 0, 0); }`,
    });
    await contains(":iframe #wrapwrap > header").click();
    await waitSidebarUpdated();
    expect("[data-label='Blur']").not.toHaveCount();
});

test("the blur option is shown for a transparent header background", async () => {
    const { waitSidebarUpdated } = await setupWebsiteBuilder("", {
        openEditor: true,
        headerContent,
        styleContent: `#wrapwrap > header nav { background-color: rgba(255, 0, 0, 0.5); }`,
    });
    await contains(":iframe #wrapwrap > header").click();
    await waitSidebarUpdated();
    expect("[data-label='Blur']").toBeVisible();
});
