import { BorderConfigurator } from "@html_builder/plugins/border_configurator_option";
import { registry } from "@web/core/registry";
import { ThemeEditOptionButton } from "@html_builder/plugins/theme_edit_option_button";

const BORDER_RADIUS_OPTIONS = [
    { label: "Small", class: "rounded-1", variable: "border-radius-sm" },
    { label: "Normal", class: "rounded-2", variable: "border-radius" },
    { label: "Large", class: "rounded-3", variable: "border-radius-lg" },
];

export class WebsiteBorderConfigurator extends BorderConfigurator {
    static id = "website_border_configurator";
    static template = "website.WebsiteBorderConfiguratorOption";
    static components = { ThemeEditOptionButton };
    static dependencies = [...super.dependencies, "customizeWebsite"];

    setup() {
        super.setup();
        this.borderRadiusOptions = BORDER_RADIUS_OPTIONS;
    }

    get radiusActionParam() {
        return {
            mainParam: super.getStyleActionParam("radius"),
            extraClass: this.props.withBSClass ? "rounded" : undefined,
        };
    }
    // We only show the theme border-radius suggestions for a limited number of cases.
    get showRoundnessSuggestions() {
        if (this.props.action !== "styleAction") {
            return false;
        }
        return ["--box-border-radius", "border-radius"].includes(this.radiusActionParam.mainParam);
    }

    getOnEditButtonClick(variable) {
        return () => this.env.showThemeOption({ borderRadius: variable });
    }
}
registry.category("website-options").add(WebsiteBorderConfigurator.id, WebsiteBorderConfigurator);
