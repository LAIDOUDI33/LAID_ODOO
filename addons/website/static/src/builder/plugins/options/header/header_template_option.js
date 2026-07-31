import { BaseOptionComponent } from "@html_builder/core/base_option_component";
import { registry } from "@web/core/registry";
import { convertCSSColorToRgba } from "@web/core/utils/colors";
import { useDomState } from "@html_builder/core/utils";
import { getCSSVariableValue } from "@html_editor/utils/formatting";

export class HeaderTemplateOption extends BaseOptionComponent {
    static id = "header_template_option";
    static template = "website.HeaderTemplateOption";
    static dependencies = ["headerOption"];

    setup() {
        super.setup();
        this.headerTemplates = this.dependencies.headerOption.getHeaderTemplates();
        this.domState = useDomState((editingElement) => ({
            isBlurAvailable: isHeaderBgBlurAvailable(editingElement),
        }));
    }

    hasSomeOptions(opts) {
        return opts.some((opt) => this.isActiveItem(opt));
    }
}

registry.category("website-options").add(HeaderTemplateOption.id, HeaderTemplateOption);

export class HeaderTemplateChoice extends BaseOptionComponent {
    static template = "website.HeaderTemplateChoice";
    static props = {
        title: String,
        views: Array,
        varName: String,
        imgSrc: String,
        id: String,
        menuShadowClass: String,
        defaultAlignment: { type: Object, optional: true },
    };
}

/**
 * Checks whether the header background blur is available.
 *
 * A background blur is only visible when the header background is at least
 * partially transparent.
 *
 * @param {HTMLElement} editingElement
 * @returns {boolean}
 */
export function isHeaderBgBlurAvailable(editingElement) {
    const headerNavEl = editingElement.querySelector("nav");
    if (!headerNavEl) {
        return;
    }
    const navStyle = getComputedStyle(headerNavEl);
    // We can have color set directly as "menu-custom" or it can be coming from
    // the theme color, e.g. o_cc_1. We can't just rely on the background color
    // as when the header is "Over the content", interaction makes the header
    // transparent when it's not scrolled.
    const bgColor =
        getCSSVariableValue("menu-custom", navStyle) ||
        navStyle.getPropertyValue("background-color");
    let bgGradient =
        getCSSVariableValue("menu-gradient", navStyle) ||
        navStyle.getPropertyValue("background-image");
    bgGradient = bgGradient === "none" ? "" : bgGradient;
    // Should be available if no color is defined (fully transparent).
    if (!bgColor && !bgGradient) {
        return true;
    }

    const bgColorOpacity = convertCSSColorToRgba(bgColor).opacity;
    if (bgColorOpacity < 100 && !bgGradient) {
        return true;
    }
    const hasRgbaOpacity = /rgba/i.test(bgGradient);

    // Check if there is at least one hex color with opacity.
    const hasHexOpacity = !!bgGradient
        .match(/#[0-9a-f]{8}/gi)
        ?.some((hex) => hex.slice(-2).toLowerCase() !== "ff");
    return hasRgbaOpacity || hasHexOpacity;
}
