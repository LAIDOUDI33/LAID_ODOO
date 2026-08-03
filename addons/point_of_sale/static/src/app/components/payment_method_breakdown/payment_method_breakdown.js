import { Component, props, t } from "@odoo/owl";
import { AccordionItem } from "@point_of_sale/app/components/accordion_item/accordion_item";

export class PaymentMethodBreakdown extends Component {
    static components = { AccordionItem, PaymentMethodBreakdown };
    static template = "point_of_sale.PaymentMethodBreakdown";

    props = props({
        title: t.string(),
        total_amount: t.number(),
        transactions: t
            .array(
                t.object({
                    id: t.number(),
                    name: t.string(),
                    amount: t.number(),
                    subTransactions: t.array().optional(),
                })
            )
            .optional([]),
    });
}
