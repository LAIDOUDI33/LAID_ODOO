import { toolbarButtonProps } from "@html_editor/main/toolbar/toolbar";
import {
    useDropdownAutoVisibility,
    useToolbarDropdownFocus,
    useToolbarDropdownPreview,
} from "@html_editor/toolbar_dropdown_hook";
import { Component, proxy, signal } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { useChildRef } from "@web/core/utils/hooks";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";

export class ImageAlignSelector extends Component {
    static template = "html_editor.ImageAlignSelector";
    static components = { Dropdown, DropdownItem };
    static props = {
        items: Array,
        getDisplay: Function,
        focusEditable: Function,
        onSelected: Function,
        ...toolbarButtonProps,
    };

    imageAlignSelector = signal.ref();

    setup() {
        this.state = proxy(this.props.getDisplay());
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useToolbarDropdownFocus(this.dropdown, this.imageAlignSelector);
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            overlay: this.props.overlay,
            preview: (item) => this.props.applyPreview(item, this.props.onSelected),
            commit: (item) => {
                this.props.applyCommit(item, this.props.onSelected);
                this.props.focusEditable();
            },
            revert: () => this.props.applyResetPreview(),
        });
    }

    onSelected(item) {
        this.preview.commit(item);
    }

    onItemHover(ev, item) {
        this.preview.preview(ev, item);
    }

    onItemHoverOut() {
        this.preview.reset();
    }
}
