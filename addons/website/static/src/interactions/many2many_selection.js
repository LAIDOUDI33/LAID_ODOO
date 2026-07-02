import { Interaction } from "@web/public/interaction";
import { registry } from "@web/core/registry";

export class Many2ManySelection extends Interaction {
    static selector = ".s_website_form_m2m_selection";
    dynamicContent = {
        ".dropdown-item[data-value]": { "t-on-click": this.onOptionClick },
        ".s_website_form_m2m_pill_remove": { "t-on-click.stop": this.onPillRemove },
        ".s_website_form_m2m_select_all": { "t-on-click": this.toggleSelectAll },
        ".s_website_form_m2m_remove_all": { "t-on-click.stop": this.deselectAll },
    };

    setup() {
        this.selectEl = this.el.querySelector("select.s_website_form_input");
        this.pillsContainer = this.el.querySelector(".s_website_form_m2m_pills_container");
        this.placeholderEl = this.pillsContainer.querySelector(".s_website_form_m2m_placeholder");
        this.removeAllEl = this.pillsContainer.querySelector(".s_website_form_m2m_remove_all");
        this.selectAllEl = this.el.querySelector(".s_website_form_m2m_select_all");
        const pillEls = new Map();
        for (const pillEl of this.pillsContainer.querySelectorAll(".s_website_form_m2m_pill")) {
            pillEls.set(pillEl.dataset.value, pillEl);
        }
        const itemEls = new Map();
        for (const itemEl of this.el.querySelectorAll(".dropdown-item[data-value]")) {
            itemEls.set(itemEl.dataset.value, itemEl);
        }
        this.elements = new Map();
        this.initialSelection = new Map();
        for (const optionEl of this.selectEl.options) {
            if (optionEl.classList.contains("s_website_form_empty_option")) {
                continue;
            }
            const value = optionEl.value;
            this.elements.set(value, {
                optionEl,
                pillEl: pillEls.get(value),
                itemEl: itemEls.get(value),
            });
            this.initialSelection.set(value, optionEl.hasAttribute("selected"));
        }
        this.registerCleanup(() => {
            const dropdown = window.Dropdown.getInstance(
                this.pillsContainer.querySelector("button[data-bs-toggle='dropdown']")
            );
            dropdown?.hide();
            dropdown?.dispose();
            this.restoreInitialSelection();
        });
    }

    start() {
        const formEl = this.el.closest("form");
        if (formEl) {
            this.addListener(formEl, "reset", () => this.restoreInitialSelection());
        }
    }

    restoreInitialSelection() {
        for (const [value, selected] of this.initialSelection) {
            this.setSelection(value, selected);
        }
        this.refreshControls();
    }

    /**
     * Applies the selection state for a single option value across its three
     * linked elements: the hidden `<select>` option, its pill, and its
     * dropdown-item's aria-checked state.
     *
     * @param {string} value option value to update.
     * @param {boolean} selected target selection state.
     */
    setSelection(value, selected) {
        const { optionEl, pillEl, itemEl } = this.elements.get(value);
        optionEl.selected = selected;
        pillEl?.classList.toggle("d-none", !selected);
        itemEl?.setAttribute("aria-checked", selected);
    }

    /**
     * @returns {boolean} whether at least one option is currently selected.
     */
    hasSelection() {
        return [...this.elements.values()].some(({ optionEl }) => optionEl.selected);
    }

    /**
     * @returns {boolean} whether every option is currently selected.
     */
    isAllSelected() {
        return (
            this.elements.size > 0 &&
            [...this.elements.values()].every(({ optionEl }) => optionEl.selected)
        );
    }

    /**
     * Recomputes the shared controls that depend on the overall selection
     */
    refreshControls() {
        const hasSelection = this.hasSelection();
        const allSelected = this.isAllSelected();
        this.placeholderEl.classList.toggle("d-none", hasSelection);
        this.removeAllEl?.classList.toggle("d-none", !hasSelection);
        this.selectAllEl?.setAttribute("aria-checked", allSelected ? "true" : "false");
    }

    commit() {
        this.refreshControls();
        this.selectEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    setAll(selected) {
        for (const value of this.elements.keys()) {
            this.setSelection(value, selected);
        }
        this.commit();
    }

    toggleSelectAll() {
        this.setAll(!this.isAllSelected());
    }

    deselectAll() {
        this.setAll(false);
    }

    onOptionClick(ev) {
        const value = ev.currentTarget.dataset.value;
        this.setSelection(value, !this.elements.get(value).optionEl.selected);
        this.commit();
    }

    onPillRemove(ev) {
        const pillEl = ev.currentTarget.closest(".s_website_form_m2m_pill");
        this.setSelection(pillEl.dataset.value, false);
        this.commit();
    }
}

registry.category("public.interactions").add("website.many2many_selection", Many2ManySelection);
