import { registry } from "@web/core/registry";
import {
    changeOptionInPopover,
    clickOnSave,
    clickOnSnippet,
    insertSnippet,
    waitForEditMode,
} from "@website/js/tours/tour_utils";

registry.category("web_tour.tours").add("website_hr_recruitment_floating_snippets", {
    steps: () => [
        waitForEditMode,
        ...insertSnippet({
            id: "s_popup",
            name: "Popup",
            groupName: "Content",
        }),
        ...clickOnSnippet(".s_popup, .s_popup:not(:visible)"),
        ...changeOptionInPopover("Popup", "Show on", "All jobs"),
        ...clickOnSave(),
        {
            content: "Go to another job page.",
            trigger: ':iframe a.job_b_link:contains("Job B")',
            run: "click",
        },
        {
            content: "Check that we navigated to another page.",
            trigger: ':iframe h1:contains("Job B")',
        },
        {
            content: "Check that the popup is present on the other job page.",
            trigger: ":iframe .s_popup:not(:visible)",
        },
        {
            content: "Go to the homepage.",
            trigger: ':iframe a[href="/"]',
            run: "click",
        },
        {
            content: "Check that we navigated to the homepage.",
            trigger: ':iframe a[href="/"].active',
        },
        {
            content: "Check that the popup is not present on the homepage.",
            trigger: ":iframe:not(:has(.s_popup:not(:visible)))",
        },
    ],
});
