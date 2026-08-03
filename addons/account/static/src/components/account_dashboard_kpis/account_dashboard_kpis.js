import { Component, onWillStart, proxy } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

import { AccountDashboardKpiCard } from "./account_dashboard_kpi_card";

export class AccountDashboardKpis extends Component {
    static template = "account.AccountDashboardKpis";
    static components = {
        AccountDashboardKpiCard,
    };

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.state = proxy({
            cards: [],
            isVisible: true,
        });

        onWillStart(async () => {
            await this.loadCards();
        });
    }

    async loadCards() {
        this.state.cards = await this.orm.call(
            "account.journal",
            "get_account_dashboard_kpis",
            []
        );
    }

    onClickCard(card) {
        if (!card.action_id) {
            return;
        }

        if (card.is_invoice_layout_card) {
            this.action.doAction(card.action_id, {
                onClose: async () => {
                    await this.loadCards();
                },
            });
            return;
        }

        this.action.doAction(card.action_id);
    }

    hideKpis() {
        this.state.isVisible = false;
    }
}
