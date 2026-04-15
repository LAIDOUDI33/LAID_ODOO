import { describe, expect, test } from "@odoo/hoot";
import { contains } from "@web/../tests/web_test_helpers";
import { setupEditor } from "../_helpers/editor";
import { expandToolbar } from "../_helpers/toolbar";
import { animationFrame, hover, press, queryOne, waitFor } from "@odoo/hoot-dom";

async function setupTableBorderDropdown(content, type) {
    const { el } = await setupEditor(content);

    await expandToolbar();
    await contains(`.btn[name='table_border_${type}']`).click();
    await waitFor(".o-dropdown-item .o-border-preview");

    return { el };
}

function getBorderPreviewItem(property, value) {
    return queryOne(
        `.o-dropdown-item:has(.o-border-preview[style*='border-${property}: ${value}'])`
    );
}

test("should apply border color", async () => {
    await setupEditor(
        `<table class="o_selected_table"><tbody><tr>
            <td class="o_selected_td">11[]</td>
        </tr></tbody></table>`
    );
    await expandToolbar();
    await contains(".btn:has([data-icon='edit'])").click();
    await contains("[data-color='#F7C6CE']").click();
    expect("td").toHaveStyle({ "border-color": "rgb(247, 198, 206)" }, { inline: true });
});

test("should apply border width", async () => {
    await setupEditor(`
        <table class="o_selected_table"><tbody><tr>
            <td class="o_selected_td">11[]</td>
        </tr></tbody></table>`);
    await expandToolbar();
    await contains(".btn[name='table_border_width']").click();
    await contains(".o-dropdown-item:has(.o-border-preview[style*='border-width: 3px'])").click();
    expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });
});

test("should apply border style", async () => {
    await setupEditor(`
        <table class="o_selected_table"><tbody><tr>
            <td class="o_selected_td">11[]</td>
        </tr></tbody></table>`);
    await expandToolbar();
    await contains(".btn[name='table_border_style']").click();
    await contains(
        ".o-dropdown-item:has(.o-border-preview[style*='border-style: dotted'])"
    ).click();
    expect("td").toHaveStyle({ "border-style": "dotted" }, { inline: true });
});

test("should remove only border color on color delete", async () => {
    await setupEditor(`
        <table class="o_selected_table"><tbody><tr>
            <td class="o_selected_td" style="border-color: #FF9C00; border-width: 1px; border-style: solid;">11[]</td>
        </tr></tbody></table>`);
    await expandToolbar();
    await contains(".btn:has([data-icon='edit'])").click();
    await contains(".o_font_color_selector [data-icon='delete']").click();
    expect("td").not.toHaveStyle("border-color", { inline: true });
    expect("td").toHaveStyle(
        {
            "border-width": "1px",
            "border-style": "solid",
        },
        { inline: true }
    );
});

describe("Table border width preview with mouse hover", () => {
    test.tags("desktop");
    test("should preview different border widths on hover", async () => {
        await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await hover(getBorderPreviewItem("width", "1px"));
        expect("td").toHaveStyle({ "border-width": "1px" }, { inline: true });

        await hover(getBorderPreviewItem("width", "3px"));
        expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });

        await hover(getBorderPreviewItem("width", "5px"));
        expect("td").toHaveStyle({ "border-width": "5px" }, { inline: true });
    });

    test.tags("desktop");
    test("should revert preview when mouse leaves without applying border width", async () => {
        const { el } = await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await hover(getBorderPreviewItem("width", "3px"));
        await animationFrame();
        expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });

        await hover(el);
        await animationFrame();
        expect("td").not.toHaveStyle("border-width", { inline: true });
    });
});

describe("Table border width preview with keyboard", () => {
    test.tags("desktop");
    test("should preview different border widths while navigating with keyboard", async () => {
        await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await press("ArrowDown");
        expect(getBorderPreviewItem("width", "1px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "1px" }, { inline: true });

        await press("ArrowDown");
        expect(getBorderPreviewItem("width", "2px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "2px" }, { inline: true });

        await press("ArrowDown");
        expect(getBorderPreviewItem("width", "3px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });
    });

    test.tags("desktop");
    test("should revert preview when Escape closes the dropdown", async () => {
        await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await press("ArrowDown");
        expect(getBorderPreviewItem("width", "1px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "1px" }, { inline: true });

        await press("Escape");
        await animationFrame();

        expect("td").not.toHaveStyle("border-width", { inline: true });
    });
});

describe("Table border width preview with mixed interactions", () => {
    test.tags("desktop");
    test("should update preview when switching from hover to keyboard navigation", async () => {
        await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await hover(getBorderPreviewItem("width", "3px"));
        expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });

        await press("ArrowDown");

        expect(getBorderPreviewItem("width", "4px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "4px" }, { inline: true });
    });

    test.tags("desktop");
    test("should revert preview when pressing Escape after switching from hover to keyboard navigation", async () => {
        await setupTableBorderDropdown(
            `<table class="o_selected_table"><tbody><tr>
                <td class="o_selected_td" style="border-width: 2px;">11[]</td>
            </tr></tbody></table>`,
            "width"
        );

        await hover(getBorderPreviewItem("width", "3px"));
        expect("td").toHaveStyle({ "border-width": "3px" }, { inline: true });

        await press("ArrowDown");

        expect(getBorderPreviewItem("width", "4px")).toBeFocused();
        expect("td").toHaveStyle({ "border-width": "4px" }, { inline: true });

        await press("Escape");
        await animationFrame();

        expect("td").toHaveStyle({ "border-width": "2px" }, { inline: true });
    });
});
