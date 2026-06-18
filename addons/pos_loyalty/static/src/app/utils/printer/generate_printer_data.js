import { GeneratePrinterData } from "@point_of_sale/app/utils/printer/generate_printer_data";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { roundPrecision } from "@web/core/utils/numbers";

patch(GeneratePrinterData.prototype, {
    generateReceiptData() {
        const data = super.generateReceiptData(...arguments);
        data.extra_data.loyalties = this._generateLoyaltyReceiptData();
        return data;
    },
    /**
     * Points summary printed on the receipt for each loyalty program that took part in the
     * order: points won and spent by this order, and the card's resulting balance.
     * @returns {object[]}
     */
    _generateLoyaltyReceiptData() {
        const order = this.order;
        const loyalties = [];
        for (const program of this.models["loyalty.program"].filter(
            (program) => program.program_type === "loyalty"
        )) {
            const won = program.getEarnedPoints(order);
            const spent = program.getSpentPoints(order);
            // Only programs this order actually touched get a line.
            if (won <= 0 && spent <= 0) {
                continue;
            }
            const name = program.portal_point_name;
            const round = (points) => roundPrecision(points, 0.01);
            if (won > 0) {
                loyalties.push({ name, type: _t("Won:"), points: round(won) });
            }
            if (spent > 0) {
                loyalties.push({ name, type: _t("Spent:"), points: round(spent) });
            }
            loyalties.push({
                name,
                type: _t("Balance:"),
                points: round(program.getAvailablePoints(order)),
            });
        }
        return loyalties;
    },
});
