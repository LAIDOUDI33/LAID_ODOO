import { patch } from "@web/core/utils/patch";
import { MoOverview } from "@mrp/components/mo_overview/mrp_mo_overview";

patch(MoOverview.prototype, {
    async getManufacturingData() {
        await super.getManufacturingData();
        this.state.showOptions.subcontractorAvailabilities =
            !!this.state.data.summary.is_subcontract;
    },

    get showSubcontractorAvailabilities() {
        return this.state.showOptions.subcontractorAvailabilities;
    },

    get totalColspan() {
        let totalColspan = super.totalColspan;
        if (this.showAvailabilities && this.showSubcontractorAvailabilities) {
            totalColspan++;
        }
        return totalColspan;
    },
});
