import { Component, proxy, signal } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { toolbarButtonProps } from "@html_editor/main/toolbar/toolbar";
import { useChildRef } from "@web/core/utils/hooks";
import {
    useDropdownAutoVisibility,
    useToolbarDropdownFocus,
    useToolbarDropdownPreview,
} from "@html_editor/toolbar_dropdown_hook";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";

export class ImageToolbarDropdown extends Component {
    static components = { Dropdown, DropdownItem };
    static props = {
        ...toolbarButtonProps,
        name: String,
        icon: { type: String, optional: true },
        focusEditable: Function,
        onSelected: Function,
        items: Array,
        getDisplay: { type: Function, optional: true },
        onPreview: Function,
        onPreviewReset: Function,
    };
    static template = "html_editor.ImageToolbarDropdown";

    imageToolbarBtn = signal.ref();

    setup() {
        this.items = this.props.items;
        if (this.props.getDisplay) {
            this.state = proxy(this.props.getDisplay());
        }
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useToolbarDropdownFocus(this.dropdown, this.imageToolbarBtn);
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            getItems: () => this.items,
            preview: (item) => this.props.onPreview(item),
            commit: (item) => {
                this.props.onSelected(item);
                this.props.focusEditable();
            },
            revert: () => this.props.onPreviewReset(),
        });
    }

    onSelected(item) {
        this.preview.commit(item);
    }

    onItemHoverOut() {
        this.preview.reset();
    }
}
