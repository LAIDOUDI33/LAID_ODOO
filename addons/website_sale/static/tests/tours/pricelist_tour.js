import { registry } from "@web/core/registry";
import * as tourUtils from "@website_sale/js/tours/tour_utils";

registry.category("web_tour.tours").add("website_sale.pricelist_on_login", {
    steps: () => [
        {
            content: "Check can't select user pricelist as public user",
            trigger: `[name="currency_selector"]:not(:has(.dropdown-item[data-code="GBP"]))`,
        },
        {
            content: "Go to login page",
            trigger: "a:contains('Sign in')",
            run: "click",
            expectUnloadPage: true,
        },
        ...tourUtils.login({
            login: "toto",
            password: "long_enough_password",
            redirectUrl: "/shop",
        }),
        {
            content: "Check user pricelist is active by default once logged in",
            trigger: `[name="currency_selector"]:has(.dropdown-item.active[data-code="GBP"])`,
        },
    ],
});
