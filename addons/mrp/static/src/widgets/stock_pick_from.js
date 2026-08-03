import { patch } from "@web/core/utils/patch";
import { StockPickFrom } from "@stock/widgets/stock_pick_from";

patch(StockPickFrom.prototype, {
    _quant_display_name() {
        let result = super._quant_display_name();
        const data = this.props.record.data;
        if (!data.lot_id && data.visual_lot_name) {
            result += " - " + data.visual_lot_name;
        }
        return result;
    },
});
