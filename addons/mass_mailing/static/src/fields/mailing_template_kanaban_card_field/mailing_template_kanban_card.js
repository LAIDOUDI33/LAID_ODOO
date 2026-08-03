import { Component, markup, onMounted, signal, status } from "@odoo/owl";
import { localization } from "@web/core/l10n/localization";
import { registry } from "@web/core/registry";
import { renderToFragment } from "@web/core/utils/render";

/**
 * A widget to display the mailing template's HTML content
 * inside an isolated shadowRoot, with its own stylesheets.
 */
export class MailingTemplateKanbanCard extends Component {
    static template = "mass_mailing.MailingTemplateKanbanCard";

    shadowRootRef = signal(null);
    rootWrapperRef = signal(null);

    setup() {
        this.isRTL = localization.direction === "rtl";
        this.styleSheets = [];
        onMounted(() => {
            this.env.styleSheetsPromise.then((styleSheets) => {
                if (status(this) === "destroyed") {
                    return;
                }
                this.styleSheets = styleSheets;
                this.setupShadowRoot();
            });
        });
    }

    /**
     * Set the background color of the card to be the same as the mailing's background color.
     *
     * @param {HTMLElement} root the root element, in which the mailing body is rendered
     * @param {HTMLElement} wrapperEl the root's wrapper element
     */
    setupBackgroundColor(root, wrapperEl) {
        const layoutNode = root.querySelector(".o_layout");
        const computedBgColor = getComputedStyle(layoutNode).backgroundColor;
        const mailingBgColor = layoutNode?.style.backgroundColor || computedBgColor;
        if (mailingBgColor) {
            wrapperEl.style.backgroundColor = mailingBgColor;
        }
    }

    setupShadowRoot() {
        const root = this.shadowRootRef().attachShadow({ mode: "open" });
        const win = this.shadowRootRef().ownerDocument.defaultView;
        this.customStyleSheet = new win.CSSStyleSheet();
        this.customStyleSheet.replaceSync(`
            :host {
                display: block;
            }
            .o_mailing_template_preview {
                width: 580px;
                box-sizing: border-box;
            }`);
        root.adoptedStyleSheets = [
            ...root.adoptedStyleSheets,
            ...this.styleSheets,
            this.customStyleSheet,
        ];
        root.replaceChildren(this.renderBodyContent());
        this.setupBackgroundColor(root, this.rootWrapperRef());
    }

    getTemplate(props = this.props) {
        return {
            bodyArch: markup(props.record.data.body_arch),
            id: props.record.id,
            modelId: props.record.data.mailing_model_id.id,
            modelName: props.record.data.mailing_model_id.display_name,
            name: `template_${props.record.id}`,
            nowrap: true,
            subject: props.record.data.subject,
            userId: props.record.data.user_id.id,
            userName: props.record.data.user_id.display_name,
        };
    }

    renderBodyContent() {
        return renderToFragment("mass_mailing.TemplateKanbanCardPreviewBody", {
            ...this.getTemplate(),
            isRTL: this.isRTL,
        });
    }
}

export const mailingTemplateKanban = {
    component: MailingTemplateKanbanCard,
};

registry.category("fields").add("mailing_template_kanban_card", mailingTemplateKanban);
