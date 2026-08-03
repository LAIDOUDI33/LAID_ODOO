import { Interaction } from "@web/public/interaction";
import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";
import { redirect } from "@web/core/utils/urls";
import { markup } from "@odoo/owl";
import { setElementContent } from "@web/core/utils/html";

export function sendRequest(route, params) {
    function _addInput(form, name, value) {
        const param = document.createElement("input");
        param.setAttribute("type", "hidden");
        param.setAttribute("name", name);
        param.setAttribute("value", value);
        form.appendChild(param);
    }

    const form = document.createElement("form");
    form.setAttribute("action", route);
    form.setAttribute("method", params.method || "POST");
    // This is an exception for the 404 page create page button, in backend we
    // want to open the response in the top window not in the iframe.
    if (params.forceTopWindow) {
        form.setAttribute("target", "_top");
    }

    if (odoo.csrf_token) {
        _addInput(form, "csrf_token", odoo.csrf_token);
    }

    for (const key in params) {
        const value = params[key];
        if (Array.isArray(value) && value.length) {
            for (const val of value) {
                _addInput(form, key, val);
            }
        } else {
            _addInput(form, key, value);
        }
    }

    document.body.appendChild(form);
    form.submit();
}
export class PostLink extends Interaction {
    static selector = ".post_link";
    dynamicSelectors = {
        ...this.dynamicSelectors,
        // Distinguish _root according to node type.
        _select: () => this.el.matches("select") && this.el,
        _nonSelect: () => !this.el.matches("select") && this.el,
    };
    dynamicContent = {
        _root: {
            "t-att-class": () => ({
                o_post_link_js_loaded: true,
            }),
        },
        _nonSelect: {
            "t-on-click.prevent": this.onClickPost,
        },
        _select: {
            // In some browsers the click event is triggered when opening the select.
            "t-on-change.prevent": this.onClickPost,
        },
    };

    onClickPost() {
        const data = {};
        for (const [key, value] of Object.entries(this.el.dataset)) {
            if (key.startsWith("post_")) {
                data[key.slice(5)] = value;
            }
        }
        sendRequest(this.el.dataset.post || this.el.href || this.el.value, data);
    }
}

// ─── Async offcanvas filter ───────────────────────────────────────────────────
//
// Generic interaction for all mobile offcanvas filter panels across modules.
// Mirrors the shop PR's updateShopContent pattern exactly — fires on every
// input change, swaps content regions in place, keeps offcanvas open.
//
// Configured entirely via data attributes on the .o_async_filters element:
//
//   data-filter-url               base list page URL  (e.g. "/event", "/partners")
//   data-filter-clear-url         URL for Clear Filters button
//   data-filter-reload-route      JSON-RPC endpoint   (e.g. "/event/reload")
//   data-filter-root-selector     element for stop/startInteractions
//                                 MUST NOT include the offcanvas itself so
//                                 Bootstrap's show state is not disrupted
//   data-filter-loading-selector  element to dim with opacity-50 while loading
//   data-filter-replace-selectors comma-separated selectors to swap from response
//   data-filter-count-selector    the count badge inside the Apply button
//   data-filter-path-params       comma-separated param names to encode in URL
//                                 path instead of query string
//                                 (e.g. "grade,country" → /partners/grade/gold)

/**
 * Collects active filter values from all named inputs in the offcanvas body.
 *
 * Multiple checked checkboxes with the same name are comma-joined — this
 * handles event tags (name="tags"), slide tags (name="tags"), and any other
 * multi-select checkboxes.
 *
 * Radio inputs whose value encodes a "key=value" string (used in jobs filters
 * e.g. "department_id=3") are parsed and added as individual params.
 */
function collectFilterParams(offcanvasEl) {
    const params = {};
    const multiValues = {};

    for (const inputEl of offcanvasEl.querySelectorAll(".offcanvas-body input[name]")) {
        if (inputEl.disabled) {
            continue;
        }
        const isToggle = inputEl.type === "checkbox" || inputEl.type === "radio";
        if (isToggle && !inputEl.checked) {
            continue;
        }
        if (!inputEl.value) {
            continue;
        }
        // Radio with encoded "key=value" (jobs filters e.g. "department_id=3").
        if (inputEl.type === "radio" && inputEl.value.includes("=")) {
            const [[key, val]] = new URLSearchParams(inputEl.value).entries();
            if (key && val) {
                params[key] = val;
            }
            continue;
        }
        // Checkboxes and normal radios: use slug when available (tag filters),
        // fall back to value. Multiple values per name are comma-joined.
        const slug = inputEl.dataset.slug || inputEl.value;
        if (!multiValues[inputEl.name]) {
            multiValues[inputEl.name] = [];
        }
        multiValues[inputEl.name].push(slug);
    }

    for (const [name, values] of Object.entries(multiValues)) {
        // Radio groups should only ever have one checked value — take last.
        // Checkboxes accumulate — join all.
        params[name] = values.join(",");
    }

    return params;
}

/**
 * Builds the pushState target URL from collected params.
 *
 * Params listed in data-filter-path-params are encoded into the URL path
 * (e.g. grade=1 → /partners/grade/gold) rather than the query string.
 * This preserves the existing path-based routing of the partners module.
 *
 * All other params go into the query string.
 */
function buildTargetUrl(offcanvasEl, params) {
    const base = offcanvasEl.dataset.filterUrl || window.location.pathname;
    const url = new URL(base, window.location.origin);

    const pathParams = (offcanvasEl.dataset.filterPathParams || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    for (const [key, value] of Object.entries(params)) {
        if (key === "prevent_redirect") {
            continue;
        }
        if (pathParams.includes(key) && value) {
            url.pathname = url.pathname.replace(/\/$/, "") + `/${key}/${value}`;
        } else {
            url.searchParams.set(key, value);
        }
    }

    return url.pathname + url.search;
}

/**
 * Calls the reload endpoint and swaps configured DOM regions in place.
 * Mirrors shop's updateShopContent:
 *   dim → rpc → stopInteractions → swap → pushState → startInteractions → undim
 *
 * The root selector MUST exclude the offcanvas element so Bootstrap's show
 * state is not disrupted by stop/startInteractions.
 *
 * Falls back to redirect() on RPC failure.
 */
async function updateFilteredContent(interaction, offcanvasEl, extraParams = {}) {
    const reloadRoute = offcanvasEl.dataset.filterReloadRoute;
    if (!reloadRoute) {
        return;
    }

    const params = { ...collectFilterParams(offcanvasEl), ...extraParams };
    const targetUrl = buildTargetUrl(offcanvasEl, params);

    const loadingEl = document.querySelector(offcanvasEl.dataset.filterLoadingSelector);
    loadingEl?.classList.add("opacity-50");

    try {
        const data = await interaction.waitFor(rpc(reloadRoute, params));

        const updatedPage = document.createElement("div");
        setElementContent(updatedPage, markup(data.html));

        // Root selector must be a region that excludes the offcanvas so
        // Bootstrap's offcanvas show state survives stop/startInteractions.
        const rootEl =
            document.querySelector(offcanvasEl.dataset.filterRootSelector) ||
            document.querySelector("#wrapwrap") ||
            document.body;

        interaction.services["public.interactions"].stopInteractions(rootEl);

        for (const selector of (offcanvasEl.dataset.filterReplaceSelectors || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)) {
            const newEl = updatedPage.querySelector(selector);
            const currentEl = document.querySelector(selector);
            if (newEl && currentEl) {
                setElementContent(currentEl, markup(newEl.innerHTML));
            }
        }

        // Update live result count on the Apply button.
        const countSelector = offcanvasEl.dataset.filterCountSelector;
        if (countSelector) {
            const countEl = document.querySelector(countSelector);
            if (countEl) {
                setElementContent(countEl, String(data.count ?? 0));
            }
        }

        history.pushState({}, "", targetUrl);
        loadingEl?.classList.remove("opacity-50");
        interaction.services["public.interactions"].startInteractions(rootEl);
    } catch {
        redirect(targetUrl);
    }
}

/**
 * Async mobile offcanvas filter interaction.
 *
 * Attaches to .o_async_filters (placed on the .o_website_offcanvas element).
 * On every input change fires the reload RPC — content swaps in place,
 * offcanvas stays open. Apply (data-bs-dismiss) just closes the panel.
 * Clear redirects to the configured clear URL.
 */
export class AsyncFilters extends Interaction {
    static selector = ".o_async_filters";

    dynamicContent = {
        ".offcanvas-body input": {
            "t-on-change": this.onFilterChange,
        },
        ".o_async_filters_clear": {
            "t-on-click.prevent": this.onClearFilters,
        },
    };

    onFilterChange() {
        updateFilteredContent(this, this.el);
    }

    onClearFilters() {
        redirect(
            this.el.dataset.filterClearUrl || this.el.dataset.filterUrl || window.location.pathname
        );
    }
}

registry.category("public.interactions").add("website.post_link", PostLink);
registry.category("public.interactions").add("website.async_filters", AsyncFilters);
