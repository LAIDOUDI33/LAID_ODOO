import { BaseOptionComponent } from "@html_builder/core/base_option_component";
import { useGetItemValue } from "@html_builder/core/utils";
import { onWillStart, props, t } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { registry } from "@web/core/registry";

export class SearchbarOption extends BaseOptionComponent {
    static id = "searchbar_option";
    static template = "website.SearchbarOption";
    props = props({
        isMainSearch: t.boolean().optional(false),
    });

    setup() {
        super.setup();
        this.getItemValue = useGetItemValue();

        this.orderByItems = this.getResource("searchbar_option_order_by_items");
        this.searchScopes = [];
        onWillStart(async () => {
            const scopes = await rpc("/website/search_scopes", {}, { cache: true });
            this.searchScopes = this.props.isMainSearch
                ? scopes.filter((scope) => scope.allowMainSearch)
                : scopes;
        });
    }
}

registry.category("website-options").add(SearchbarOption.id, SearchbarOption);