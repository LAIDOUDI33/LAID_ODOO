import { BaseOptionComponent } from "@html_builder/core/base_option_component";
import { props, t } from "@odoo/owl";
import { ThemeEditOptionButton } from "./theme_edit_option_button";

export class ShadowOption extends BaseOptionComponent {
    static template = "html_builder.ShadowOption";
    props = props({
        setShadowClassAction: t.string().optional("setShadowClass"),
        setShadowModeAction: t.string().optional("setShadowMode"),
        setShadowStyleAction: t.string().optional("setShadowStyle"),
    });
    static components = { ThemeEditOptionButton };

    getOnClick(shadowClass) {
        return () => this.env.showThemeOption({ shadowSize: shadowClass });
    }
}
