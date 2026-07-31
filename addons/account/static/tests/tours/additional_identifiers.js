import { registry } from "@web/core/registry";

registry.category("web_tour.tours").add("account.additional_identifiers", {
    steps: () => [
        {
            content: "Open the 'Add identifier' dropdown",
            trigger: ".o_add_identifier_dropdown button",
            run: "click",
        },
        {
            content: "Add the CPF identifier",
            trigger: ".o_add_identifier_item[data-identifier-key='BR_CN']",
            run: "click",
        },
        {
            content: "The CPF input is revealed and can be filled",
            trigger: "#o_additional_identifier_BR_CN:visible",
            run: "edit 34586675",
        },
        {
            content: "Remove the CPF identifier",
            trigger: ".o_additional_identifier_field[data-identifier-key='BR_CN'] .o_remove_identifier",
            run: "click",
        },
        {
            content: "The CPF input is hidden again after removal",
            trigger: ".o_additional_identifiers_portal:not(:has(#o_additional_identifier_BR_CN:visible))",
        },
        {
            content: "Re-open the dropdown",
            trigger: ".o_add_identifier_dropdown button",
            run: "click",
        },
        {
            content: "The CPF identifier is offered again",
            trigger: ".o_add_identifier_item[data-identifier-key='BR_CN']:visible",
        },
    ],
});
