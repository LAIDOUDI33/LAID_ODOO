import { useSubEnv } from "@web/owl2/utils";
import { Component, props, proxy, signal, t } from "@odoo/owl";
import { OptionsContainer } from "@html_builder/sidebar/option_container";
import { useOptionsSubEnv } from "@html_builder/utils/utils";

export class ThemeTab extends Component {
    static template = "website.ThemeTab";
    static components = { OptionsContainer };
    props = props({
        // optionsContainers: t.array().optional([]),
        optionToShow: t.object().optional({}),
    });
    contentRef = signal(null);

    setup() {
        useOptionsSubEnv(() => [this.env.editor.document.body]);
        useSubEnv({ themeOptionToShow: this.props.optionToShow });
        this.state = proxy({
            fontsData: {},
        });
        this.optionsContainers = this.env.editor.resources["theme_options"];
    }
}
