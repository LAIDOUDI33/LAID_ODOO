import { prettifyMessageContent } from "../../src/utils/common/format";

import { describe, expect, test } from "@odoo/hoot";

describe.current.tags("headless");

function format(str, args) {
    return str.replace(/\{(\d+)\}/g, (_, index) => args[index]);
}

const partnerMentionType = {
    name: "partners",
    getLink: (record) =>
        `<a href="/odoo/res.partner/${record.id}" class="o_mail_redirect" data-oe-id="${record.id}" data-oe-model="res.partner" target="_blank" contenteditable="false">@${record.name}</a>`,
    getDisplayedText: (record) => "@" + record.name,
};

const threadMentionType = {
    name: "threads",
    getLink: (record) => {
        let className, text;
        if (record.parent_channel_id) {
            className = "o_channel_redirect o_channel_redirect_asThread";
            text = `#${record.parent_channel_id.displayName} &gt; ${record.displayName}`;
        } else {
            className = "o_channel_redirect";
            text = `#${record.displayName}`;
        }
        return `<a href="/odoo/discuss.channel/${record.id}" class="${className}" data-oe-id="${record.id}" data-oe-model="discuss.channel" target="_blank" contenteditable="false">${text}</a>`;
    },
    getDisplayedText: (record) =>
        record.parent_channel_id
            ? `#${record.parent_channel_id.displayName} > ${record.displayName}`
            : `#${record.displayName}`,
};

test("prettifyMessageContent properly replaces mentions with links", async () => {
    const partnerMessageTemplate = "{1} says hello to {0}";
    const threadMessageTemplate = "There may be answers here {1} or here {0}";
    const testCases = [
        {
            mentionType: partnerMentionType,
            cases: [
                {
                    messageTemplate: partnerMessageTemplate,
                    records: [
                        { id: 1, name: "Bernard" },
                        { id: 12, name: "Isabelle" },
                    ],
                },
                {
                    messageTemplate: partnerMessageTemplate,
                    records: [
                        { id: 1, name: "Bernard" },
                        { id: 2, name: "Bernard Junior" },
                    ],
                },
            ],
        },
        {
            mentionType: threadMentionType,
            cases: [
                {
                    messageTemplate: threadMessageTemplate,
                    records: [
                        { id: 1, displayName: "Best beer in Belgium" },
                        { id: 18, displayName: "Cutest cats" },
                    ],
                },
                {
                    messageTemplate: threadMessageTemplate,
                    records: [
                        { id: 1, displayName: "Best beer" },
                        { id: 2, displayName: "Best beer in Belgium" },
                    ],
                },
                {
                    messageTemplate: threadMessageTemplate,
                    records: [
                        { id: 1, displayName: "Best beer" },
                        {
                            id: 2,
                            displayName: "in Belgium",
                            parent_channel_id: { displayName: "Best beer" },
                        },
                    ],
                },
            ],
        },
    ];

    for (const caseType of testCases) {
        for (const testCase of caseType.cases) {
            const body = format(
                testCase.messageTemplate,
                testCase.records.map(caseType.mentionType.getDisplayedText)
            );
            const res = format(
                testCase.messageTemplate,
                testCase.records.map(caseType.mentionType.getLink)
            );
            const prettified = await prettifyMessageContent(body, {
                [caseType.mentionType.name]: testCase.records,
            });
            expect(prettified.toString()).toBe(res);
        }
    }
});
