import { Component, proxy, signal } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { toolbarButtonProps } from "@html_editor/main/toolbar/toolbar";
import {
    useDropdownAutoVisibility,
    useToolbarDropdownPreview,
    useToolbarDropdownFocus,
} from "@html_editor/toolbar_dropdown_hook";
import { useChildRef } from "@web/core/utils/hooks";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";

export class AlignSelector extends Component {
    static template = "html_editor.AlignSelector";
    static props = {
        getItems: Function,
        getDisplay: Function,
        onSelected: Function,
        focusEditable: Function,
        ...toolbarButtonProps,
        applyAlignResetPreview: Function,
        applyAlignPreview: Function,
        applyAlignCommit: Function,
        overlay: { type: Object, optional: true },
    };
    static components = { Dropdown, DropdownItem };

    alignSelector = signal.ref();

    setup() {
        this.items = this.props.getItems();
        this.state = proxy(this.props.getDisplay());
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useToolbarDropdownFocus(this.dropdown, this.alignSelector);
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            overlay: this.props.overlay,
            preview: (item) => this.props.applyAlignPreview(item, this.props.onSelected),
            commit: (item) => {
                this.props.applyAlignCommit(item, this.props.onSelected);
                this.props.focusEditable();
            },
            revert: () => this.props.applyAlignResetPreview(),
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
