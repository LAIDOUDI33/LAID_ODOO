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
