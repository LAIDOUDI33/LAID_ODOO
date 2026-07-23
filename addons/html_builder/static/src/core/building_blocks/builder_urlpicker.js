import { BuilderComponent } from "@html_builder/core/building_blocks/builder_component";
import { BuilderTextInputBase } from "@html_builder/core/building_blocks/builder_text_input_base";
import {
    basicContainerBuilderComponentProps,
    useBuilderComponent,
    useInputBuilderComponent,
} from "@html_builder/core/utils";
import { Component, signal, t, useProps } from "@odoo/owl";
import { pick } from "@web/core/utils/objects";
import { textInputBasePassthroughProps } from "./builder_input_base";

export class BuilderUrlPicker extends Component {
    static components = {
        BuilderComponent,
        BuilderTextInputBase,
    };
    static template = "html_builder.BuilderUrlPicker";

    props = useProps({
        ...basicContainerBuilderComponentProps,
        ...textInputBasePassthroughProps,
        default: t.string().optional(),
    });

    inputRef = signal.ref(HTMLInputElement);

    setup() {
        useBuilderComponent(this.props);
        const { state, commit, preview } = useInputBuilderComponent(this.props, {
            defaultValue: this.props.default,
        });
        this.commit = commit;
        this.preview = preview;
        this.state = state;
    }

    get textInputBaseProps() {
        return pick(this.props, ...Object.keys(textInputBasePassthroughProps));
    }

    openPreviewUrl() {
        if (this.inputRef().value) {
            window.open(this.inputRef().value, "_blank");
        }
    }
}
