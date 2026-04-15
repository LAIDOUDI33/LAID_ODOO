import { Component, signal } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { toolbarButtonProps } from "../toolbar/toolbar";
import { closestElement } from "@html_editor/utils/dom_traversal";
import {
    useDropdownAutoVisibility,
    useToolbarDropdownPreview,
    useToolbarDropdownFocus,
} from "@html_editor/toolbar_dropdown_hook";
import { useChildRef } from "@web/core/utils/hooks";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";

export class ListSelector extends Component {
    static template = "html_editor.ListSelector";
    static props = {
        ...toolbarButtonProps,
        getButtons: Function,
        getListMode: Function,
        key: Object,
        applyListResetPreview: Function,
        applyListPreview: Function,
        applyListCommit: Function,
        overlay: { type: Object, optional: true },
    };
    static components = { Dropdown, DropdownItem };

    listSelector = signal.ref();

    setup() {
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useToolbarDropdownFocus(this.dropdown, this.listSelector);
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            overlay: this.props.overlay,
            preview: (item) => this.props.applyListPreview(item),
            commit: (item) => this.props.applyListCommit(item),
            revert: () => this.props.applyListResetPreview(),
        });
    }
    getActiveMode() {
        const { editableSelection: selection } = this.props.getSelection();
        const closestLI = closestElement(selection.anchorNode, "LI");
        return closestLI && this.props.getListMode(closestLI.parentNode);
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
