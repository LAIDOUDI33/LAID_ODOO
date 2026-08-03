import { useDomState } from "@html_builder/core/utils";
import { registry } from "@web/core/registry";
import { BaseOptionComponent } from "@html_builder/core/base_option_component";
import { props, t } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";

export class ClickableElementOption extends BaseOptionComponent {
    static id = "clickable_element_option";
    static template = "website.ClickableElementOption";
    props = props({
        clickableElementType: t.string(),
    });

    setup() {
        super.setup();
        this.state = useDomState((editingElement) => ({
            hasHref: editingElement
                .querySelector(":scope > a.stretched-link, :scope > a.slide-link")
                ?.hasAttribute("href"),
        }));
    }

    get clickableElementName() {
        switch (this.props.clickableElementType) {
            case "card":
                return _t("card");
            case "slide":
                return _t("slide");
            default:
                return _t("element");
        }
    }

    get clickableTooltip() {
        return _t(
            "Make the entire %(elementName)s clickable. All inner links will not be accessible by the user.",
            { elementName: this.clickableElementName }
        );
    }
}

registry.category("builder-options").add(ClickableElementOption.id, ClickableElementOption);
