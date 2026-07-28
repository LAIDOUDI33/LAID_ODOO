import { ProductCatalogKanbanRecord } from "@product/product_catalog/kanban_record";

export class ProductCatalogPurchaseSuggestKanbanRecord extends ProductCatalogKanbanRecord {

    get orderLineComponent() {
        if (this.env.orderResModel === "purchase.order") {
            return ProductCatalogPurchaseOrderLine;
        }
        return super.orderLineComponent;
    }

    /* Hides suggest line if suggest_qty == qty in PO */
    getCardClasses(...args) {
        const classes = super.getCardClasses(args) || "";
        const catalogData = this.productCatalogData || {};

        if (catalogData.suggested_qty && catalogData.suggested_qty == catalogData.quantity) {
            return classes + " o_hide_suggest_qty";
        }
        return classes;
    }

    /** Add suggested_qty or pricelist_min_qty (the greater one) if positive, otherwise add 1. */
    addProduct() {
        // FIXME VFE uom conversion mess
        // suggested_qty is in the product uom
        // minimumQuantity (if coming from seller) is in seller uom
        const { minimumQuantity = 1, suggested_qty = 0 } = this.productCatalogData;
        let quantity_to_add = Math.max(minimumQuantity, suggested_qty, 1);
        if (this.productCatalogData.sellerUomFactor) {
            quantity_to_add = Math.ceil(quantity_to_add / this.productCatalogData.sellerUomFactor);
        }
        super.addProduct(quantity_to_add);
    }
}
