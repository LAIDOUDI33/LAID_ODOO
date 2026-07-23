import { useProps } from "@odoo/owl";
import { BuilderInputBase, textInputBasePassthroughProps } from "./builder_input_base";

export class BuilderTextInputBase extends BuilderInputBase {
    static template = "html_builder.BuilderTextInputBase";

    props = useProps(textInputBasePassthroughProps);
}
