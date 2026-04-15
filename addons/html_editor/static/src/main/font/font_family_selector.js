import { Component, signal } from "@odoo/owl";
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

export class FontFamilySelector extends Component {
    static template = "html_editor.FontFamilySelector";
    static props = {
        document: { optional: true },
        fontFamilyItems: Object,
        currentFontFamily: Object,
        onSelected: Function,
        focusEditable: Function,
        ...toolbarButtonProps,
        applyFontFamilyResetPreview: Function,
        applyFontFamilyPreview: Function,
        applyFontFamilyCommit: Function,
        overlay: { type: Object, optional: true },
    };
    static components = { Dropdown, DropdownItem };

    fontFamilySelector = signal.ref();

    setup() {
        this.menuRef = useChildRef();
        this.dropdown = useDropdownState();
        useToolbarDropdownFocus(this.dropdown, this.fontFamilySelector);
        useDropdownAutoVisibility(this.env.overlayState, this.menuRef);
        this.preview = useToolbarDropdownPreview({
            dropdown: this.dropdown,
            overlay: this.props.overlay,
            preview: (item) => this.props.applyFontFamilyPreview(item, this.props.onSelected),
            commit: (item) => {
                this.props.applyFontFamilyCommit(item, this.props.onSelected);
                this.props.focusEditable();
            },
            revert: () => this.props.applyFontFamilyResetPreview(),
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
