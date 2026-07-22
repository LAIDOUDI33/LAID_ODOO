import { Component, onWillDestroy, proxy, signal, t, useProps } from "@odoo/owl";
import {
    querySelectorAll,
    useBuilderComponent,
    useClickableBuilderComponent,
    useDependencyDefinition,
    useActionInfo,
} from "../utils";
import { BuilderComponent } from "./builder_component";
import { _t } from "@web/core/l10n/translation";
import { useBus } from "@web/core/utils/hooks";
import { SelectMenu, useSelectMenuHandler } from "@web/core/select_menu/select_menu";

const CHOICES_SCHEMA = t
    .array(
        t.object({
            value: t.any().optional(),
            label: t.string(),
        })
    )
    .optional([]);

export class BuilderSearchSelect extends Component {
    static template = "html_builder.BuilderSearchSelect";
    props = useProps({
        // basicContainerBuilderComponentProps (converted inline)
        id: t.string().optional(),
        applyTo: t.string().optional(),
        preview: t.boolean().optional(),
        inheritedActions: t.array(t.string()).optional(),

        action: t.string().optional(),
        actionParam: t.any().optional(),
        actionValue: t
            .or([
                t.boolean(),
                t.string(),
                t.number(),
                t.literal(null),
                t.array(t.or([t.boolean(), t.string(), t.number()])),
            ])
            .optional(),

        // Shorthand actions.
        classAction: t.any().optional(),
        attributeAction: t.any().optional(),
        dataAttributeAction: t.any().optional(),
        styleAction: t.any().optional(),

        choices: CHOICES_SCHEMA,
        groups: t
            .array(
                t.object({
                    label: t.string().optional(),
                    choices: CHOICES_SCHEMA,
                    section: t.string().optional(),
                })
            )
            .optional([]),
        defaultMessage: t.string().optional(_t("Select an option...")),
    });
    static components = { BuilderComponent, SelectMenu };

    setup() {
        super.setup();
        useBuilderComponent();
        this.menuRef = signal.ref();
        const { removeListeners, onOpened, onClosed } = useSelectMenuHandler(this.menuRef, {
            onNavigatedAway: this.onNavigatedAway.bind(this),
            onNavigatedBack: this.onNavigatedBack.bind(this),
        });
        this.onOpened = onOpened.bind(this);
        this.onClosed = onClosed.bind(this);

        this.index = 0;
        this.state = proxy({});
        this.info = useActionInfo();
        this.info.action = this.info.actionId;
        delete this.info.actionId;

        this.getAction = this.env.editor.shared.builderActions.getAction;
        // Choices are built so that each item can act as a builder component
        // and manage its own actions and operations.
        this.defaultChoices = this.buildChoices(this.props.choices);
        this.defaultGroups = this.props.groups.map((group) => ({
            ...group,
            choices: this.buildChoices(group.choices),
        }));

        this.updateChoices();
        useBus(this.env.editorBus, "DOM_UPDATED", this.updateChoices);

        // Handle dependencies for select items.
        [...this.selectedChoices]
            .filter((opt) => opt.id)
            .map((opt) => {
                useDependencyDefinition(opt.id, {
                    isActive: () => opt.value === this.currentlySelected,
                });
            });
        onWillDestroy(() => removeListeners?.());
    }
    buildChoices(choices) {
        return choices.map((choice) => {
            // Action props set on the select are applied to all items.
            // This is done for compoenents using the shared `env.weContext`
            // added by `useBuilderComponent()`.
            choice.props = {
                // Remark: The select items actions always take precedence
                // over the parent one.
                ...Object.fromEntries(Object.entries(this.info).filter(([, value]) => value)),
                ...choice.props,
            };
            // Select items need to have an env to get the builder component
            // behaviour (see: `useBuilderComponent()`) which is by default
            // the one from the select.
            choice.env = this.env;
            choice.isSelectable = true;
            choice.cleanSelectedItem = this.cleanSelectedItem.bind(this);
            const clickableChoice = useClickableBuilderComponent(choice);
            return {
                ...choice,
                value: choice.value || `${this.index++}`,
                ...clickableChoice,
            };
        });
    }
    updateChoices() {
        const updateEditingElements = (choices) =>
            choices
                .map((choice) => {
                    // Update target elements to support `applyTo` for the
                    // select component items.
                    const oldEnv = this.env;
                    const applyTo = choice.props.applyTo;
                    if (!applyTo) {
                        // No item-level `applyTo`: use the same target as
                        // the select, even if it defines its own `applyTo`.
                        choice.env = oldEnv;
                        return choice;
                    }
                    const editingElements = applyTo
                        ? querySelectorAll(oldEnv.getEditingElements(), applyTo)
                        : oldEnv.getEditingElements();
                    choice.env = {
                        ...oldEnv,
                        getEditingElements: () => editingElements,
                        getEditingElement: () => editingElements[0],
                    };
                    return choice;
                })
                .filter((choice) => choice.env.getEditingElement());

        this.state.choices = updateEditingElements(this.defaultChoices);
        this.state.groups = this.defaultGroups.map((group) => ({
            ...group,
            choices: updateEditingElements(group.choices),
        }));
        this.selectedChoices = [
            ...this.state.choices,
            ...this.state.groups.flatMap((g) => g.choices || []),
        ];
        this.currentlySelected = this.getSelectedValue();
        this.state.selected = this.currentlySelected;
    }
    getSelection(value) {
        return this.selectedChoices.find((choice) => choice.value === value);
    }
    getSelectedValue() {
        return this.selectedChoices
            .filter((choice) => choice.isApplied())
            .sort((a, b) => b.priority - a.priority)[0]?.value;
    }
    async select(newSelected) {
        this.newSelected = newSelected;
        this.getSelection(newSelected).operation.commit();
    }
    preview(newSelected) {
        if (newSelected !== this.previewing) {
            this.previewing = newSelected;
            this.getSelection(newSelected).operation.preview();
        }
    }
    cleanSelectedItem(...args) {
        this.getSelection(this.currentlySelected)?.clean(...args);
        if (this.newSelected) {
            this.currentlySelected = this.newSelected;
            this.newSelected = undefined;
        }
    }
    revert() {
        this.getSelection(this.previewing)?.operation.revert();
        this.previewing = undefined;
    }
    onNavigated(choice) {
        if (this.previewing) {
            this.revert();
        }
        this.preview(choice.value);
        this.lastPreviewed = undefined;
    }
    onNavigatedAway() {
        this.lastPreviewed = this.previewing;
        this.revert();
    }
    onNavigatedBack() {
        if (this.lastPreviewed) {
            this.preview(this.lastPreviewed);
        }
    }
}
