import { Component, proxy } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { toolbarButtonProps } from "@html_editor/main/toolbar/toolbar";
import {
    useDropdownAutoVisibility,
    useToolbarDropdownPreview,
} from "@html_editor/toolbar_dropdown_hook";
import { useChildRef } from "@web/core/utils/hooks";

export class TableBorderStyleSelector extends Component {
    static template = "html_editor.TableBorderStyleSelector";
    static props = {
        getItems: Function,
        getDisplay: Function,
        onSelected: Function,
        onPreview: Function,
        onPreviewReset: Function,
        ...toolbarButtonProps,
    };
    static components = { Dropdown, DropdownItem };

    setup() {
        this.items = this.props.getItems();
        this.state = proxy(this.props.getDisplay());
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            getItems: () => [{ value: "none" }, ...this.items],
            preview: (item) => this.props.onPreview(item),
            commit: (item) => this.props.onSelected(item),
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
