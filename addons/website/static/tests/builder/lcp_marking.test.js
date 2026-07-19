import { expect, test } from "@odoo/hoot";
import { queryOne } from "@odoo/hoot-dom";
import { contains, onRpc } from "@web/../tests/web_test_helpers";
import { defineWebsiteModels, setupWebsiteBuilder } from "./website_helpers";
import { dummyBase64Img } from "@html_builder/../tests/helpers";
import { insertText } from "@html_editor/../tests/_helpers/user_actions";
import { setSelection } from "@html_editor/../tests/_helpers/selection";

defineWebsiteModels();

async function dirtyAndSave(getEditor) {
    const paragraphEl = queryOne(":iframe .edit-me");
    setSelection({ anchorNode: paragraphEl.firstChild, anchorOffset: 1 });
    await insertText(getEditor(), "x");
    await contains(".o-snippets-top-actions button:contains(Save)").click();
}

test("largest visible image is marked LCP for both devices", async () => {
    onRpc("ir.ui.view", "save", ({ args }) => {
        const doc = new DOMParser().parseFromString(args[1], "text/html");
        const target = doc.querySelector(".target");
        expect(target.getAttribute("data-lcp-desktop")).not.toBe(null);
        expect(target.getAttribute("data-lcp-mobile")).not.toBe(null);
        expect(doc.querySelector(".small").getAttribute("data-lcp-desktop")).toBe(null);
        expect.step("save");
        return true;
    });
    const { getEditor } = await setupWebsiteBuilder(`
        <section>
            <img class="target" style="width: 800px; height: 400px;" src='${dummyBase64Img}'/>
            <img class="small" style="width: 60px; height: 60px;" src='${dummyBase64Img}'/>
            <p class="edit-me">edit</p>
        </section>
    `);
    await dirtyAndSave(getEditor);
    expect.verifySteps(["save"]);
});

test("desktop-only image is not chosen as the mobile LCP", async () => {
    onRpc("ir.ui.view", "save", ({ args }) => {
        const doc = new DOMParser().parseFromString(args[1], "text/html");
        const desktopOnly = doc.querySelector(".desktop-only");
        const shared = doc.querySelector(".shared");
        expect(desktopOnly.getAttribute("data-lcp-desktop")).not.toBe(null);
        expect(desktopOnly.getAttribute("data-lcp-mobile")).toBe(null);
        expect(shared.getAttribute("data-lcp-mobile")).not.toBe(null);
        expect.step("save");
        return true;
    });
    const { getEditor } = await setupWebsiteBuilder(`
        <section>
            <img class="desktop-only o_snippet_mobile_invisible" style="width: 900px; height: 500px;" src='${dummyBase64Img}'/>
            <img class="shared" style="width: 300px; height: 200px;" src='${dummyBase64Img}'/>
            <p class="edit-me">edit</p>
        </section>
    `);
    await dirtyAndSave(getEditor);
    expect.verifySteps(["save"]);
});

test("image with an existing loading attribute is not marked", async () => {
    onRpc("ir.ui.view", "save", ({ args }) => {
        const doc = new DOMParser().parseFromString(args[1], "text/html");
        expect(doc.querySelector(".target").getAttribute("data-lcp-desktop")).toBe(null);
        expect.step("save");
        return true;
    });
    const { getEditor } = await setupWebsiteBuilder(`
        <section>
            <img class="target" loading="eager" style="width: 800px; height: 400px;" src='${dummyBase64Img}'/>
            <p class="edit-me">edit</p>
        </section>
    `);
    await dirtyAndSave(getEditor);
    expect.verifySteps(["save"]);
});
