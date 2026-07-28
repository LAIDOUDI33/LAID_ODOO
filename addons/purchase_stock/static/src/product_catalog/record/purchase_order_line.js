import { ProductCatalogPurchaseOrderLine } from "@purchase/product_catalog/purchase_order_line/purchase_order_line";

patch(ProductCatalogPurchaseOrderLine, {
    props: {
        ...ProductCatalogPurchaseOrderLine.props,
        suggested_qty: { type: Number, optional: true },
    },
})
