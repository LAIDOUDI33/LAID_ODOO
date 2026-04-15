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

export class FontTypeSelector extends Component {
    static template = "html_editor.FontTypeSelector";
    static props = {
        ...toolbarButtonProps,
        getItems: Function,
        getDisplay: Function,
        onSelected: Function,
        applyFontTypeResetPreview: Function,
        applyFontTypePreview: Function,
        applyFontTypeCommit: Function,
        overlay: { type: Object, optional: true },
    };
    static components = { Dropdown, DropdownItem };

    fontTypeSelector = signal.ref();

    setup() {
        this.items = this.props.getItems();
        this.state = proxy(this.props.getDisplay());
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        useToolbarDropdownFocus(this.dropdown, this.fontTypeSelector);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            overlay: this.props.overlay,
            preview: (item) => this.props.applyFontTypePreview(item, this.props.onSelected),
            commit: (item) => this.props.applyFontTypeCommit(item, this.props.onSelected),
            revert: () => this.props.applyFontTypeResetPreview(),
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
