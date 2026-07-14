import { ProductCatalogOrderLine } from "@product/product_catalog/order_line/order_line";

export class ProductCatalogPurchaseOrderLine extends ProductCatalogOrderLine {
    static props = {
        ...ProductCatalogPurchaseOrderLine.props,
        sellerUomFactor: { type: Number, optional: true },
    };
}
