import { describe, expect, test } from "@odoo/hoot";
import { queryAll, queryOne } from "@odoo/hoot-dom";
import { setupInteractionWhiteList, startInteractions } from "@web/../tests/public/helpers";
import { contains, onRpc } from "@web/../tests/web_test_helpers";

setupInteractionWhiteList(["website.many2many_selection", "website.form"]);

describe.current.tags("interaction_dev");

const many2manySelectionHTML = /* html */ `
    <section class="s_website_form">
        <form action="/website/form/" method="post" enctype="multipart/form-data" data-model_name="mail.mail">
            <div class="s_website_form_m2m_selection dropdown">
                <select multiple="multiple" class="s_website_form_input d-none" name="m2m_field">
                    <option value="1" selected="selected">One</option>
                    <option value="2">Two</option>
                </select>
                <div class="s_website_form_m2m_pills_container form-select d-flex flex-wrap align-items-center gap-1">
                    <button id="m2m_sel" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" data-bs-display="static" aria-haspopup="menu" aria-expanded="false" aria-label="Toggle options"></button>
                    <span class="s_website_form_m2m_placeholder d-none">Pick</span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary" data-value="1">One<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary d-none" data-value="2">Two<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <div class="dropdown-menu w-100">
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="true" data-value="1">One</button>
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="false" data-value="2">Two</button>
                    </div>
                </div>
            </div>
            <div class="s_website_form_submit" data-name="Submit Button">
                <span id="s_website_form_result"></span>
                <a href="#" role="button" class="btn btn-primary s_website_form_send">Submit</a>
            </div>
        </form>
    </section>
`;

const many2manySelectionControlsHTML = /* html */ `
    <section class="s_website_form">
        <form action="/website/form/" method="post" enctype="multipart/form-data" data-model_name="mail.mail">
            <div class="s_website_form_m2m_selection dropdown">
                <select multiple="multiple" class="s_website_form_input d-none" name="m2m_field">
                    <option value="1" selected="selected">One</option>
                    <option value="2">Two</option>
                </select>
                <div class="s_website_form_m2m_pills_container form-select d-flex flex-wrap align-items-center gap-1">
                    <button id="m2m_sel" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" data-bs-display="static" aria-haspopup="menu" aria-expanded="false" aria-label="Toggle options"></button>
                    <span class="s_website_form_m2m_placeholder d-none">Pick</span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary" data-value="1">One<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary d-none" data-value="2">Two<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <button type="button" class="s_website_form_m2m_remove_all" aria-label="Remove all"><i class="fa fa-times"></i></button>
                    <div class="dropdown-menu w-100" role="menu">
                        <button type="button" class="s_website_form_m2m_select_all dropdown-item" role="menuitemcheckbox" aria-checked="false">
                            <span class="s_website_form_m2m_select_all_label">Select all</span>
                            <span class="s_website_form_m2m_deselect_all_label">Deselect all</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="true" data-value="1">One</button>
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="false" data-value="2">Two</button>
                    </div>
                </div>
            </div>
            <div class="s_website_form_submit" data-name="Submit Button">
                <span id="s_website_form_result"></span>
                <a href="#" role="button" class="btn btn-primary s_website_form_send">Submit</a>
            </div>
        </form>
    </section>
`;

const many2manyEmptyOptionHTML = /* html */ `
    <section class="s_website_form">
        <form action="/website/form/" method="post" enctype="multipart/form-data" data-model_name="mail.mail">
            <div class="s_website_form_m2m_selection dropdown">
                <select multiple="multiple" class="s_website_form_input d-none" name="m2m_field" required="required">
                    <option class="s_website_form_empty_option" value="">Pick</option>
                    <option value="1">One</option>
                    <option value="2">Two</option>
                </select>
                <div class="s_website_form_m2m_pills_container form-select d-flex flex-wrap align-items-center gap-1">
                    <button id="m2m_sel" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" data-bs-display="static" aria-haspopup="menu" aria-expanded="false" aria-label="Toggle options"></button>
                    <span class="s_website_form_m2m_placeholder">Pick</span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary d-none" data-value="1">One<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <span class="s_website_form_m2m_pill badge rounded-pill text-bg-primary d-none" data-value="2">Two<button type="button" class="s_website_form_m2m_pill_remove" aria-label="Remove"><i class="fa fa-times"></i></button></span>
                    <button type="button" class="s_website_form_m2m_remove_all d-none" aria-label="Remove all"><i class="fa fa-times"></i></button>
                    <div class="dropdown-menu w-100" role="menu">
                        <button type="button" class="s_website_form_m2m_select_all dropdown-item" role="menuitemcheckbox" aria-checked="false">
                            <span class="s_website_form_m2m_select_all_label">Select all</span>
                            <span class="s_website_form_m2m_deselect_all_label">Deselect all</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="false" data-value="1">One</button>
                        <button type="button" class="dropdown-item" role="menuitemcheckbox" aria-checked="false" data-value="2">Two</button>
                    </div>
                </div>
            </div>
            <div class="s_website_form_submit" data-name="Submit Button">
                <span id="s_website_form_result"></span>
                <a href="#" role="button" class="btn btn-primary s_website_form_send">Submit</a>
            </div>
        </form>
    </section>
`;

const VISIBLE_PILL = ".s_website_form_m2m_pill:not(.d-none)";

test("initial state reflects pre-selected options", async () => {
    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    const selectEl = queryOne("select.s_website_form_input");
    const item1El = queryOne(".dropdown-item[data-value='1']");
    const item2El = queryOne(".dropdown-item[data-value='2']");

    expect(selectEl.querySelector("option[value='1']").selected).toBe(true);
    expect(item1El).toHaveAttribute("aria-checked", "true");

    expect(selectEl.querySelector("option[value='2']").selected).toBe(false);
    expect(item2El).toHaveAttribute("aria-checked", "false");

    expect(queryAll(VISIBLE_PILL)).toHaveLength(1);
});

test("clicking a dropdown option toggles its selection and matching pill", async () => {
    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    await contains("button[data-bs-toggle='dropdown']").click();

    // Selecting an unselected option shows its pill.
    await contains(".dropdown-item[data-value='2']").click();
    expect(queryOne("select.s_website_form_input option[value='2']").selected).toBe(true);
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "true");
    expect(queryAll(VISIBLE_PILL)).toHaveLength(2);

    // Clicking a selected option deselects it and hides its pill.
    await contains(".dropdown-item[data-value='1']").click();
    expect(queryOne("select.s_website_form_input option[value='1']").selected).toBe(false);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "false");
    expect(queryAll(VISIBLE_PILL)).toHaveLength(1);
});

test("removing a pill deselects the option, hides the pill and shows the placeholder", async () => {
    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    const placeholderEl = queryOne(".s_website_form_m2m_placeholder");
    expect(placeholderEl).toHaveClass("d-none");

    await contains(".s_website_form_m2m_pill_remove").click();
    expect(queryOne("select.s_website_form_input option[value='1']").selected).toBe(false);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "false");
    expect(queryAll(VISIBLE_PILL)).toHaveLength(0);
    expect(placeholderEl).not.toHaveClass("d-none");
});

test("cleanup restores initial selected state", async () => {
    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    await contains("button[data-bs-toggle='dropdown']").click();
    await contains(".dropdown-item[data-value='2']").click();
    await contains(".dropdown-item[data-value='1']").click();

    const selectEl = queryOne("select.s_website_form_input");
    expect(selectEl.querySelector("option[value='1']").selected).toBe(false);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(true);

    core.stopInteractions();

    expect(selectEl.querySelector("option[value='1']").selected).toBe(true);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(false);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(1);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "true");
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "false");
});

test("form sends the selected pills values on submit", async () => {
    onRpc("/website/form/mail.mail", async (request) => {
        const formData = await request.formData();
        expect(formData.getAll("m2m_field")).toEqual(["1,2"]);
        expect.step("submitted");
    });

    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    await contains("button[data-bs-toggle='dropdown']").click();
    await contains(".dropdown-item[data-value='2']").click();
    await contains(".s_website_form_send").click();
    expect.verifySteps(["submitted"]);
});

test("'Select all' selects every option, then 'Deselect all' clears them", async () => {
    const { core } = await startInteractions(many2manySelectionControlsHTML);
    expect(core.interactions).toHaveLength(2);

    const selectEl = queryOne("select.s_website_form_input");
    const selectAllEl = queryOne(".s_website_form_m2m_select_all");
    const placeholderEl = queryOne(".s_website_form_m2m_placeholder");
    const removeAllEl = queryOne(".s_website_form_m2m_remove_all");

    await contains("button[data-bs-toggle='dropdown']").click();

    await contains(".s_website_form_m2m_select_all").click();
    expect(selectEl.querySelector("option[value='1']").selected).toBe(true);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(true);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(2);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "true");
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "true");
    expect(selectAllEl).toHaveAttribute("aria-checked", "true");
    expect(placeholderEl).toHaveClass("d-none");
    expect(removeAllEl).not.toHaveClass("d-none");

    await contains(".s_website_form_m2m_select_all").click();
    expect(selectEl.querySelector("option[value='1']").selected).toBe(false);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(false);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(0);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "false");
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "false");
    expect(selectAllEl).toHaveAttribute("aria-checked", "false");
    expect(placeholderEl).not.toHaveClass("d-none");
    expect(removeAllEl).toHaveClass("d-none");
});

test("'remove all' deselects every option and shows the placeholder", async () => {
    const { core } = await startInteractions(many2manySelectionControlsHTML);
    expect(core.interactions).toHaveLength(2);

    await contains("button[data-bs-toggle='dropdown']").click();
    await contains(".s_website_form_m2m_select_all").click();
    expect(queryAll(VISIBLE_PILL)).toHaveLength(2);

    await contains(".s_website_form_m2m_remove_all").click();
    const selectEl = queryOne("select.s_website_form_input");
    expect(selectEl.querySelector("option[value='1']").selected).toBe(false);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(false);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(0);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "false");
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "false");
    expect(queryOne(".s_website_form_m2m_placeholder")).not.toHaveClass("d-none");
    expect(queryOne(".s_website_form_m2m_remove_all")).toHaveClass("d-none");
});

test("'remove all' keeps the open dropdown open", async () => {
    const { core } = await startInteractions(many2manySelectionControlsHTML);
    expect(core.interactions).toHaveLength(2);

    const toggleEl = queryOne("button[data-bs-toggle='dropdown']");
    await contains("button[data-bs-toggle='dropdown']").click();
    expect(toggleEl).toHaveAttribute("aria-expanded", "true");

    await contains(".s_website_form_m2m_remove_all").click();
    expect(toggleEl).toHaveAttribute("aria-expanded", "true");
});

test("native form reset restores the initial selection", async () => {
    const { core } = await startInteractions(many2manySelectionHTML);
    expect(core.interactions).toHaveLength(2);

    await contains("button[data-bs-toggle='dropdown']").click();
    await contains(".dropdown-item[data-value='2']").click();
    await contains(".dropdown-item[data-value='1']").click();
    const selectEl = queryOne("select.s_website_form_input");
    expect(selectEl.querySelector("option[value='1']").selected).toBe(false);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(true);

    queryOne("form").reset();
    expect(selectEl.querySelector("option[value='1']").selected).toBe(true);
    expect(selectEl.querySelector("option[value='2']").selected).toBe(false);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(1);
    expect(queryOne(".dropdown-item[data-value='1']")).toHaveAttribute("aria-checked", "true");
    expect(queryOne(".dropdown-item[data-value='2']")).toHaveAttribute("aria-checked", "false");
    expect(queryOne(".s_website_form_m2m_placeholder")).toHaveClass("d-none");
});

test("deselecting every record after 'Select all' restores the empty state (allow empty)", async () => {
    const { core } = await startInteractions(many2manyEmptyOptionHTML);
    expect(core.interactions).toHaveLength(2);

    const selectEl = queryOne("select.s_website_form_input");
    const emptyOptionEl = selectEl.querySelector(".s_website_form_empty_option");
    const placeholderEl = queryOne(".s_website_form_m2m_placeholder");
    const removeAllEl = queryOne(".s_website_form_m2m_remove_all");

    await contains("button[data-bs-toggle='dropdown']").click();
    await contains(".s_website_form_m2m_select_all").click();

    await contains(".dropdown-item[data-value='1']").click();
    await contains(".dropdown-item[data-value='2']").click();

    expect(emptyOptionEl.selected).toBe(false);
    expect(queryAll(VISIBLE_PILL)).toHaveLength(0);
    expect(placeholderEl).not.toHaveClass("d-none");
    expect(removeAllEl).toHaveClass("d-none");
});
