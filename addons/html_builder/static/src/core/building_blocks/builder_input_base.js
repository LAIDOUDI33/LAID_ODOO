import { Component, proxy, signal, t, useEffect, useProps } from "@odoo/owl";
import { useActionInfo } from "../utils";

// Props given to the builder input components that are then passed to the
// BuilderInputBase.
export const textInputBasePassthroughProps = {
    placeholder: t.string().optional(),
    title: t.string().optional(),
    style: t.string().optional(),
    tooltip: t.string().optional(),
    classes: t.string().optional(),
    inputClasses: t.string().optional(),
    prefix: t.string().optional(),
    prefixIcon: t.string().optional(),
    selectTextOnFocus: t.boolean().optional(),
    disabled: t.boolean().optional(),

    commit: t.function().optional(),
    // FIXME: 'preview' conflicts with its homonymous props in 'basicContainerBuilderComponentProps'
    // which is a boolean, and is meant to be a function here. It currently works
    // by accident, as apparently there is no instance of a boolean/function given
    // where the other type is expected, but this should be fixed at some point:
    // either by using a different property names or a whole different 'props' object.
    preview: t.or([t.function(), t.boolean()]).optional(),
    onFocus: t.function().optional(),
    onInput: t.function().optional(),
    onChange: t.function().optional(),
    onKeydown: t.function().optional(),
    onBeforeInput: t.function().optional(),
    value: t.or([t.string(), t.literal(null)]).optional(),

    inputRef: t.signal(t.ref(HTMLInputElement)).optional(),
    slots: t.object().optional(),
};

/**
 * @abstract
 */
export class BuilderInputBase extends Component {
    static template;

    // Ref on the input element, either owned by the parent (`inputRef` prop) or local.
    inputRef = useProps.static(
        "inputRef",
        t.signal(t.ref()).optional(() => signal.ref())
    );

    setup() {
        this.isEditing = false;
        this.info = useActionInfo(this.props);
        this.state = proxy({ value: this.props.value });
        useEffect(() => {
            const value = this.props.value;
            this.state.value = this.isEditing ? this.inputRef().value : value;
        });
    }

    onChange(ev) {
        this.isEditing = false;
        if (this.props.commit) {
            const normalizedDisplayValue = this.props.commit(ev.target.value);
            ev.target.value = normalizedDisplayValue;
            this.state.value = normalizedDisplayValue;
        }
        this.props.onChange?.(ev);
    }

    onInput(ev) {
        this.isEditing = true;
        this.state.value = ev.target.value;
        /** 'preview' can be a boolean; @see {textInputBasePassthroughProps.preview} */
        if (typeof this.props.preview === "function") {
            this.props.preview(ev.target.value);
        }
        this.props.onInput?.(ev);
    }

    onFocus(ev) {
        if (this.props.selectTextOnFocus) {
            this.inputRef().select();
        }
        this.props.onFocus?.(ev);
    }

    onKeydown(ev) {
        this.props.onKeydown?.(ev);
    }

    onBeforeInput(ev) {
        this.props.onBeforeInput?.(ev);
    }
}
