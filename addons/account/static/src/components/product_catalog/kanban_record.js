import { useSubEnv } from "@web/owl2/utils";
import { ProductCatalogKanbanRecord } from "@product/product_catalog/kanban_record";
import { patch } from "@web/core/utils/patch";

patch(ProductCatalogKanbanRecord.prototype, {
    setup() {
        super.setup();

        useSubEnv({
            ...this.env,
            selectedSectionId: this.env.searchModel.selectedSection.sectionId,
        });
    },

    _getUpdateCatalogQuantityParams() {
        return {
            ...super._getUpdateCatalogQuantityParams(),
            section_id: this.env.selectedSectionId ?? this.env.searchModel.selectedSection.sectionId,
        };
    },


    updateQuantity(quantity) {
        const lineCountChange = (quantity > 0) - (this.productCatalogData.quantity > 0);
        if (lineCountChange !== 0) {
            this.notifyLineCountChange(lineCountChange);
        }

        super.updateQuantity(quantity);
    },

    notifyLineCountChange(lineCountChange) {
        this.env.searchModel.trigger('section-line-count-change', {
            sectionId: this.env.selectedSectionId,
            lineCountChange: lineCountChange,
        });
    },
})
