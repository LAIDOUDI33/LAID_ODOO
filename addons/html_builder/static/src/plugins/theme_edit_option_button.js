import { Component, t, useProps } from "@odoo/owl";

export class ThemeEditOptionButton extends Component {
    static template = "html_builder.ThemeEditOptionButton";
    props = useProps({
        onClick: t.function().optional(() => {}),
        buttonClass: t.string().optional(),
        tabIndex: t.number().optional(),
    });
}
