import { Interaction } from "@web/public/interaction";
import { registry } from "@web/core/registry";
import { Multirange } from "@website/../lib/multirange/multirange_custom";
import wSaleUtils from "@website_sale/js/website_sale_utils";

export class RangeFilter extends Interaction {
    static selector = ".o_attr_range[multiple]";
    dynamicContent = {
        _root: {
            "t-on-newRangeValue": this.onRangeChange,
        },
    };

    setup() {
        const input = this.el;
        try {
            this.values = JSON.parse(input.dataset.values || "[]");
            this.valueIds = JSON.parse(input.dataset.valueIds || "[]");
        } catch {
            this.values = [];
            this.valueIds = [];
        }

        if (!this.values.length) {
            return;
        }

        const instance = new Multirange(input);

        // Override to show attribute names instead of numbers
        instance.counterInputUpdate = () => {
            const minIdx = Math.round(instance.input.valueLow);
            const maxIdx = Math.round(instance.input.valueHigh);
            instance.leftCounter.innerText = this.values[minIdx] ?? "";
            instance.rightCounter.innerText = this.values[maxIdx] ?? "";
            if (instance.rangeWithInput) {
                instance.leftInput.value = this.values[minIdx] ?? "";
                instance.rightInput.value = this.values[maxIdx] ?? "";
            }
        };

        instance.update();
    }

    async onRangeChange(ev) {
        const range = ev.currentTarget;
        const min = Math.round(range.valueLow);
        const max = Math.round(range.valueHigh);
        const attributeId = range.dataset.attributeId;
        const url = new URL(window.location.href);
        const { searchParams } = url;
        const ranges = (url.searchParams.get("attribute_range") || "")
            .split(",")
            .filter(Boolean)
            .filter((r) => !r.startsWith(`${attributeId}-`));

        if (!(min === 0 && max === Number(range.max))) {
            ranges.push(`${attributeId}-${this.valueIds[min]}<${this.valueIds[max]}`);
        }

        if (ranges.length) {
            searchParams.set("attribute_range", ranges.join(","));
        } else {
            searchParams.delete("attribute_range");
        }

        await wSaleUtils.updateShopContent(this, {
            url,
            searchParams,
        });
    }
}

registry.category("public.interactions").add("website_sale.range_filter", RangeFilter);
