import { useRef } from "@web/owl2/utils";
import { _t } from "@web/core/l10n/translation";
import { browser } from "@web/core/browser/browser";
import { AutoComplete } from "@web/core/autocomplete/autocomplete";
import { CheckBox } from "@web/core/checkbox/checkbox";
import { Dialog } from "@web/core/dialog/dialog";
import { BadgeTag } from "@web/core/tags_list/badge_tag";
import { TagsList } from "@web/core/tags_list/tags_list";
import { rpc } from "@web/core/network/rpc";
import { user } from "@web/core/user";
import { unique } from "@web/core/utils/arrays";
import { useService } from "@web/core/utils/hooks";
import { fuzzyLookup } from "@web/core/utils/search";
import { useSortable } from "@web/core/utils/sortable_owl";
import { useDebounced } from "@web/core/utils/timing";

import { Component, onMounted, onWillStart, onWillUnmount, proxy } from "@odoo/owl";

class ExportDataItem extends Component {
    static template = "web.ExportDataItem";
    static components = { ExportDataItem };
    static props = {
        exportList: { type: Object, optional: true },
        field: { type: Object, optional: true },
        filterSubfields: Function,
        isDebug: Boolean,
        isExpanded: Boolean,
        isFieldExpandable: Function,
        onAdd: Function,
        loadFields: Function,
    };

    setup() {
        this.state = proxy({
            subfields: [],
        });
        onWillStart(() => {
            if (this.props.isExpanded) {
                // automatically expand the item when subfields are already loaded
                // and display subfields that match the search string
                return this.toggleItem(this.props.field.id, false);
            }
        });
    }

    async toggleItem(id, isUserToggle) {
        if (this.props.isFieldExpandable(id)) {
            if (this.state.subfields.length) {
                this.state.subfields = [];
            } else {
                const subfields = await this.props.loadFields(id, !isUserToggle);
                if (subfields) {
                    this.state.subfields = isUserToggle
                        ? subfields
                        : this.props.filterSubfields(subfields);
                } else {
                    this.state.subfields = [];
                }
            }
        }
    }

    onDoubleClick(id) {
        if (!this.props.isFieldExpandable(id) && !this.isFieldSelected(id)) {
            this.props.onAdd(id);
        }
    }

    isFieldSelected(current) {
        return this.props.exportList.find(({ id }) => id === current);
    }
}

export class ExportDataDialog extends Component {
    static template = "web.ExportDataDialog";
    static components = { AutoComplete, BadgeTag, CheckBox, Dialog, ExportDataItem, TagsList };
    static props = {
        close: { type: Function },
        context: { type: Object, optional: true },
        defaultExportList: { type: Array },
        download: { type: Function },
        getExportedFields: { type: Function },
        root: { type: Object },
    };

    setup() {
        this.action = useService("action");
        this.notification = useService("notification");
        this.orm = useService("orm");
        this.draggableRef = useRef("draggable");
        this.exportListRef = useRef("exportList");
        this.searchRef = useRef("search");

        this.knownFields = {};
        this.expandedFields = {};
        this.availableFormats = [];
        this.templates = [];
        this.languagesInstalled = [];
        this.isCompatible = false;

        this.state = proxy({
            exportList: [],
            exportLanguages: [],
            isEditingTemplate: false,
            search: [],
            selectedFormat: 0,
            templateId: null,
            isSmall: this.env.isSmall,
            disabled: false,
        });

        this.newTemplateText = _t("New template");
        this.removeFieldText = _t("Remove field");

        this.debouncedOnResize = useDebounced(this.updateSize, 300);

        useSortable({
            // Params
            ref: this.draggableRef,
            elements: ".o_export_field",
            ignore: ".o_remove_field",
            enable: !this.state.isSmall,
            cursor: "grabbing",
            // Hooks
            onDrop: async ({ element, previous, next }) => {
                const indexes = [element, previous, next].map(
                    (e) =>
                        e &&
                        Object.values(this.state.exportList).findIndex(
                            ({ id }) => id === e.dataset.field_id
                        )
                );
                let target;
                if (indexes[0] < indexes[1]) {
                    target = previous ? indexes[1] : 0;
                } else {
                    target = next ? indexes[2] : this.state.exportList.length - 1;
                }
                this.onDraggingEnd(indexes[0], target);
            },
        });

        onWillStart(async () => {
            [this.availableFormats, this.templates, this.languagesInstalled] = await Promise.all([
                rpc("/web/export/formats"),
                this.orm.searchRead(
                    "ir.exports",
                    [["resource", "=", this.props.root.resModel]],
                    [],
                    {
                        context: this.props.context,
                    }
                ),
                this.orm.searchRead("res.lang", [], ["code", "name"], { order: "name" }),
            ]);
            await this.fetchFields();
        });

        onMounted(() => {
            browser.addEventListener("resize", this.debouncedOnResize);
            this.updateSize();
        });

        onWillUnmount(() => browser.removeEventListener("resize", this.debouncedOnResize));
    }

    get fieldsAvailable() {
        if (this.searchRef.el && this.searchRef.el.value) {
            return this.state.search.length && Object.values(this.state.search);
        }
        return Object.values(this.knownFields);
    }

    get isDebug() {
        return Boolean(odoo.debug);
    }

    get languageChoices() {
        return this.languagesInstalled
            .filter(({ code }) => !this.state.exportLanguages.includes(code))
            .map(({ code, name }) => ({ value: code, label: name }));
    }

    get userLanguageName() {
        const userLanguage = user.lang.replace("-", "_");
        return (
            this.languagesInstalled.find(({ code }) => code === userLanguage)?.name || userLanguage
        );
    }

    get languageSources() {
        return [{ options: this.loadLanguageOptions.bind(this) }];
    }

    loadLanguageOptions(request) {
        const choices = request
            ? fuzzyLookup(request, this.languageChoices, (choice) => choice.label)
            : this.languageChoices;
        return choices.map(({ value, label }) => ({
            label,
            onSelect: () => this.onAddLanguage(value),
        }));
    }

    get languageTags() {
        const languageNames = Object.fromEntries(
            this.languagesInstalled.map(({ code, name }) => [code, name])
        );
        return this.state.exportLanguages.map((code) => ({
            id: code,
            text: languageNames[code],
            onDelete: () => {
                this.state.exportLanguages = this.state.exportLanguages.filter((c) => c !== code);
                this.enterTemplateEdition();
            },
        }));
    }

    get rootFields() {
        if (this.searchRef.el && this.searchRef.el.value) {
            const rootFromSearchResults = this.fieldsAvailable.map((f) => {
                if (f.parent) {
                    const parentEl = this.knownFields[f.parent.id];
                    return this.knownFields[parentEl.parent ? parentEl.parent.id : parentEl.id];
                }
                return this.knownFields[f.id];
            });
            return unique(rootFromSearchResults);
        }
        return this.fieldsAvailable.filter(({ parent }) => !parent);
    }

    filterSubfields(subfields) {
        let subfieldsFromSearchResults = [];
        let searchResults;
        if (this.searchRef.el && this.searchRef.el.value) {
            searchResults = this.lookup(this.searchRef.el.value);
        }
        const fieldsAvailable = Object.values(searchResults || this.knownFields);
        if (this.searchRef.el && this.searchRef.el.value) {
            subfieldsFromSearchResults = fieldsAvailable
                .filter((f) => f.parent && this.knownFields[f.parent.id].parent)
                .map((f) => f.parent);
        }
        const availableSubFields = unique([...fieldsAvailable, ...subfieldsFromSearchResults]);
        return subfields.filter((a) => availableSubFields.some((b) => a.id === b.id));
    }

    updateSize() {
        this.state.isSmall = this.env.isSmall;
    }

    /**
     * Load fields to display and (re)set the list of available fields.
     *
     * @param {boolean} [keepExportList=false] when true, the current export
     *  list is left untouched. This is used when only the available fields
     *  change (e.g. toggling the "Updatable fields only" switch), which must
     *  not affect the fields the user already chose to export.
     */
    async fetchFields(keepExportList = false) {
        this.knownFields = {};
        this.expandedFields = {};
        await this.loadFields();
        if (!keepExportList) {
            await this.setDefaultExportList();
        }
        this.state.search = [];
        if (this.searchRef.el) {
            this.searchRef.el.value = "";
        }
        if (this.state.templateId && !keepExportList) {
            this.loadExportList(this.state.templateId);
        }
    }

    enterTemplateEdition() {
        if (this.state.templateId && !this.state.isEditingTemplate) {
            this.state.isEditingTemplate = true;
        }
    }

    isFieldExpandable(id) {
        return this.knownFields[id].children && id.split("/").length < 3;
    }

    async loadExportList(value) {
        this.state.templateId = value === "new_template" ? value : Number(value);
        this.state.isEditingTemplate = value === "new_template";
        if (!value || value === "new_template") {
            return;
        }
        const { fields, export_languages } = await rpc("/web/export/namelist", {
            model: this.props.root.resModel,
            export_id: Number(value),
        });
        // Don't safe the result in this.knownFields because, the result is only partial
        this.state.exportList = fields;
        this.state.exportLanguages = export_languages;
    }

    async loadFields(id, preventLoad = false) {
        let parentField, parentParams;
        if (id) {
            if (this.expandedFields[id]) {
                // we don't make a new RPC if the value is already known
                return this.expandedFields[id].fields;
            }
            parentField = this.knownFields[id];
            parentParams = {
                ...parentField.params,
                parent_field_type: parentField.field_type,
                parent_field: parentField,
                parent_name: parentField.string,
                exclude: [parentField.relation_field],
            };
        }
        if (preventLoad) {
            return;
        }
        const fields = await this.props.getExportedFields(this.isCompatible, parentParams);
        for (const field of fields) {
            field.parent = parentField;
            if (!this.knownFields[field.id]) {
                this.knownFields[field.id] = field;
            }
        }
        if (id) {
            this.expandedFields[id] = { fields };
        }
        return fields;
    }

    onDraggingEnd(item, target) {
        this.state.exportList.splice(target, 0, this.state.exportList.splice(item, 1)[0]);
    }

    onAddItemExportList(fieldId) {
        this.state.exportList.push(this.knownFields[fieldId]);
        this.enterTemplateEdition();
    }

    onRemoveItemExportList(fieldId) {
        const item = this.state.exportList.findIndex(({ id }) => id === fieldId);
        this.state.exportList.splice(item, 1);
        this.enterTemplateEdition();
    }

    async onChangeExportList(ev) {
        this.loadExportList(ev.target.value);
    }

    async onSaveExportTemplate() {
        const name = this.exportListRef.el.value;
        if (!name) {
            return this.notification.add(_t("Please enter save field list name"), {
                type: "danger",
            });
        }
        const exportLanguageIds = this.languagesInstalled
            .filter(({ code }) => this.state.exportLanguages.includes(code))
            .map(({ id }) => id);
        const [id] = await this.orm.create(
            "ir.exports",
            [
                {
                    name,
                    export_fields: this.state.exportList.map((field) => [
                        0,
                        0,
                        {
                            name: field.id,
                        },
                    ]),
                    export_language_ids: [[6, false, exportLanguageIds]],
                    resource: this.props.root.resModel,
                },
            ],
            { context: this.props.context }
        );
        this.state.isEditingTemplate = false;
        this.state.templateId = id;
        this.templates.push({ id, name });
    }

    onCancelExportTemplate() {
        this.state.isEditingTemplate = false;
        if (this.state.templateId === "new_template") {
            this.state.templateId = null;
            return;
        }
        this.loadExportList(this.state.templateId);
    }

    async onClickExportButton() {
        if (!this.state.exportList.length) {
            return this.notification.add(_t("Please select fields to save export list..."), {
                type: "danger",
            });
        }
        this.state.disabled = true;
        await this.props.download(
            this.getFieldsToExport(),
            this.isCompatible,
            this.availableFormats[this.state.selectedFormat].tag
        );
        this.state.disabled = false;
    }

    /**
     * Return the fields to export: each translatable field of the export list
     * is replaced by one column per selected export language, using the same
     * `@lang` suffix convention as the import (e.g. `name@fr_FR`) on both the
     * technical name and the label, so the columns stay import-compatible.
     * The unsuffixed column (in the active language) is dropped to avoid
     * exporting the same column twice under different headers.
     */
    getFieldsToExport() {
        if (!this.state.exportLanguages.length) {
            return this.state.exportList;
        }
        return this.state.exportList.flatMap((field) => {
            if (!field.translate) {
                return [field];
            }
            return this.state.exportLanguages.map((code) => ({
                ...field,
                id: `${field.id}@${code}`,
                string: `${field.string}@${code}`,
            }));
        });
    }

    onAddLanguage(code) {
        this.state.exportLanguages.push(code);
        this.enterTemplateEdition();
    }

    onEditExportTemplate() {
        const resId = Number(this.state.templateId);
        this.action.doAction({
            type: "ir.actions.act_window",
            name: _t("Export Templates"),
            res_model: "ir.exports",
            res_id: resId,
            target: "new",
            views: [[false, "form"]],
        });
    }

    onSearch(ev) {
        this.state.search = this.lookup(ev.target.value);
    }

    lookup(value) {
        let lookupResult = fuzzyLookup(
            value,
            Object.values(this.knownFields),
            // because fuzzyLookup gives an higher score if the string starts with the pattern,
            // reversing the string makes the search more reliable in this context
            (field) => field.string.split("/").reverse().join("/")
        );
        if (this.isDebug) {
            lookupResult = unique([
                ...lookupResult,
                ...Object.values(this.knownFields).filter((f) => f.id.includes(value)),
            ]);
        }
        return lookupResult;
    }

    onToggleCompatibleExport(value) {
        this.isCompatible = value;
        this.fetchFields(true);
    }

    async setDefaultExportList() {
        const defaultExportList = this.props.defaultExportList
            .map((defaultField) => this.knownFields[defaultField.name])
            .filter((field) => field);

        const defaultExportfields = Object.values(this.knownFields).filter(
            (field) => field.default_export
        );

        this.state.exportList = unique([...defaultExportList, ...defaultExportfields]);
    }

    setFormat(ev) {
        this.state.selectedFormat = this.availableFormats.findIndex(
            ({ tag }) => tag === ev.target.value
        );
    }
}
