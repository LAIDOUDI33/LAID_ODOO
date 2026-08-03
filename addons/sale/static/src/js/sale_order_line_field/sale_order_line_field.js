import { useExternalListener, useSubEnv } from "@web/owl2/utils";
import {
    ProductLabelSectionAndNoteListRender,
    productLabelSectionAndNoteOne2Many,
    ProductLabelSectionAndNoteOne2Many,
} from '@account/components/product_label_section_and_note_field/product_label_section_and_note_field_o2m';
import {
    getSectionRecords,
    sectionAndNoteFieldOne2Many,
} from "@account/components/section_and_note_fields_backend/section_and_note_fields_backend";
import { registry } from '@web/core/registry';

const SECTION_QTY_COLUMN_NAMES = ["section_qty", "product_uom_qty"];
const SECTION_UOM_COLUMN_NAMES = ["section_uom_id", "product_uom_id"];

function getComboRecords(listRecords, record) {
    const comboRecords = [];

    if (record.data.product_type === 'combo') {
        // if currernt record is combo then we move forward util we find non combo line
        comboRecords.push(record);
        let index = listRecords.indexOf(record) + 1;

        while (index < listRecords.length) {
            const r = listRecords[index];
            if (
                !r.data.combo_item_id?.id
                || (
                    r.data.linked_line_id?.id !== record.resId
                    && r.data.linked_virtual_id !== record.data.virtual_id
                )
            ) {
                break;
            }
            comboRecords.push(r);
            index++;
        }

    } else if (record.data.combo_item_id?.id) {
        // if current record is combo item then we move backward util we find associated combo line
        // Here we assume that the record we get is the last item of the combo
        let index = listRecords.indexOf(record);
        while (index >= 0) {
            const r = listRecords[index];
            comboRecords.unshift(r);

            if (
                r.data.product_type === 'combo'
                && (
                    r.resId === record.data.linked_line_id?.id
                    || r.data.virtual_id === record.data.linked_virtual_id
                )
            ) {
                break;
            }
            index--;
        }
    }

    return comboRecords;
}

export class SaleOrderLineListRenderer extends ProductLabelSectionAndNoteListRender {
    static recordRowTemplate = 'sale.ListRenderer.RecordRow';

    setup() {
        super.setup();
        this.priceColumns.push('discount');
        this.state.hoveredSectionId = false;
        this.state.focusedSectionId = false;
        this.sectionQtyClicked = false;
        this.sectionUOMClicked = false;
        this._mouseButtonDown = false;

        useExternalListener(document, "pointerdown", () => { this._mouseButtonDown = true; });
        useExternalListener(document, "pointerup", () => { this._mouseButtonDown = false; });

        useSubEnv({
            shouldCollapse: this.shouldCollapse.bind(this),
            updateSectionLinesQty: this.updateSectionLinesQty.bind(this),
        });
    }

    /**
     * Little hack to make sure we get correct title field everytime
     * while accessing comboColumns
     */
    get comboColumns() {
        return [this.titleField, ...this.props.aggregatedFields, 'product_uom_qty', 'discount'];
    }

    getActiveColumns() {
        let activeColumns = super.getActiveColumns();
        const productTmplCol = activeColumns.find((col) => col.name === 'product_template_id');
        const productCol = activeColumns.find((col) => col.name === 'product_id');

        if (productCol && productTmplCol) {
            // Hide the template column if the variant one is enabled.
            activeColumns = activeColumns.filter((col) => col.name != 'product_template_id')
        }

        return activeColumns;
    }

    getRowClass(record) {
        let classNames = super.getRowClass(record);
        if (this.isCombo(record) || this.isComboItem(record)) {
            classNames = classNames.replace('o_row_draggable', '');
        }
        return `${classNames} ${this.isCombo(record) ? 'fw-bold' : ''}`;
    }

    getCellClass(column, record) {
        const classNames = super.getCellClass(column, record).split(" ");
        if (column.name == "name" && record.isFieldInvalid("product_template_id")) {
            classNames.push("o_invalid_cell o_required_modifier");
        }
        return classNames.join(" ");
    }

    /**
     * @override
     */
    async onCellClicked(record, column, ev) {
        if (column && column.name === "section_qty") {
            this.sectionQtyClicked = true;
        } else if (column && column.name === "section_uom_id") {
            this.sectionUOMClicked = true;
        } else {
            this.sectionQtyClicked = false;
            this.sectionUOMClicked = false;
        }
        return super.onCellClicked(record, column, ev);
    }

    /**
     * @override
     */
    focusCell(column, ...args) {
        if (this.editedRecord() && this.isSection(this.editedRecord())) {
            if (this.sectionQtyClicked || (column && column.name === "section_qty")) {
                const originalCol = this.columns.find(c => c.name === "product_uom_qty");
                if (originalCol) {
                    this.sectionQtyClicked = false;
                    return super.focusCell(originalCol, ...args);
                }
            }
            if (this.sectionUOMClicked || (column && column.name === "section_uom_id")) {
                const originalCol = this.columns.find(c => c.name === "product_uom_id");
                if (originalCol) {
                    this.sectionUOMClicked = false;
                    return super.focusCell(originalCol, ...args);
                }
            }
        }
        return super.focusCell(column, ...args);
    }

    async updateSectionLinesQty(record, ratio) {
        if (!this.isSection(record) || ratio === 1) {
            return;
        }

        const proms = [];
        for (const line of getSectionRecords(this.props.list, record, this.isSubSection(record))) {
            if (line === record || (!this.isSection(line) && this.isSectionOrNote(line))) {
                continue;
            }
            const qtyField = this.isSection(line) ? "section_qty" : "product_uom_qty";
            proms.push(line._update({ [qtyField]: line.data[qtyField] * ratio }));
        }
        await Promise.all(proms);
    }

    async onSectionMouseEnter(record) {
        if (!this.isSection(record) || this._mouseButtonDown) return;
        this.state.hoveredSectionId = record.id;
    }

    async onSectionMouseLeave(record) {
        if (!this.isSection(record) || this._mouseButtonDown) return;
        this.state.hoveredSectionId = false;
    }

    onSectionFocusIn(record) {
        if (!this.isSection(record)) return;
        this.state.focusedSectionId = record.id;
    }

    onSectionFocusOut(record) {
        if (!this.isSection(record)) return;
        this.state.focusedSectionId = false;
    }

    get sectionColumns() {
        return [...super.sectionColumns, 'product_uom_qty', 'product_uom_id'];
    }

    changeFieldSection(columns) {
        return columns.map(col => {
            if (SECTION_QTY_COLUMN_NAMES.includes(col.name)) {
                const sectionCol = this.allColumns.find((c) => c.name === "section_qty");
                return sectionCol ? { ...sectionCol, id: col.id } : { ...col };
            }
            if (SECTION_UOM_COLUMN_NAMES.includes(col.name)) {
                const sectionCol = this.allColumns.find((c) => c.name === "section_uom_id");
                return sectionCol ? { ...sectionCol, id: col.id } : { ...col };
            }
            return { ...col };
        });
    }

    /**
     * @override
     */
    getSectionAndNoteColumns(columns, record) {
        let sectionCols = columns.filter(
            (col) =>
                col.widget === "handle"
                || col.name === this.titleField
                || (this.isSection(record) && this.sectionColumns.includes(col.name))
        );
        columns = this.changeFieldSection(columns);
        sectionCols = this.changeFieldSection(sectionCols);
        const showQtyUnit = this.state.hoveredSectionId === record.id || this.state.focusedSectionId === record.id;
        if (showQtyUnit) {
            const isSectionCol = (col) => sectionCols.some((s) => s.id === col.id);
            const titleIndex = columns.findIndex((col) => col.name === this.titleField);
            const colspanBonus = columns.slice(0, titleIndex).filter((col) => !isSectionCol(col)).length;
            return columns.flatMap((col, i) => {
                if (col.name === this.titleField) return [colspanBonus ? { ...col, colspan: colspanBonus + 1 } : col];
                if (i < titleIndex && !isSectionCol(col)) return []; // absorbed by colspan
                return [isSectionCol(col) ? col : { ...col, invisible: "1", readonly: "1" }];
            });
        }
        sectionCols = sectionCols.filter(
            (col) => ![...SECTION_QTY_COLUMN_NAMES, ...SECTION_UOM_COLUMN_NAMES].includes(col.name)
        );
        return sectionCols.map((col) => {
            if (col.name === this.titleField) {
                return { ...col, colspan: columns.length - sectionCols.length + 1 };
            } else {
                return { ...col };
            }
        });
    }

    isCellReadonly(column, record) {
        return super.isCellReadonly(column, record) || (
            this.isComboItem(record)
                && !['name', 'tax_ids', 'qty_delivered'].includes(column.name)
        );
    }

    async onDeleteRecord(record) {
        if (this.isCombo(record)) {
            await record.update({ selected_combo_items: "[]" });
        }
        await super.onDeleteRecord(record);
    }

    async moveCombo(record, direction) {
        const canProceed = await this.props.list.leaveEditMode({ canAbandon: false });
        if (!canProceed) return;

        const { movingRecords, targetRecords } = this.getComboSwapPairs(record, direction);
        return this.swapSections(movingRecords, targetRecords);
    }

    getComboSwapPairs(record, direction) {
        const comboRecords = getComboRecords(this.props.list.records, record);

        if (direction === 'up') {
            return {
                movingRecords: this.getPreviousRecords(record),
                targetRecords: comboRecords,
            };
        }
        if (direction === 'down') {
            return {
                movingRecords: comboRecords,
                targetRecords: this.getNextRecords(record),
            };
        }
        return { movingRecords: [], targetRecords: [] };
    }

    getPreviousRecords(record) {
        const { records } = this.props.list;
        const previousRecord = records[records.indexOf(record) - 1];

        if (previousRecord?.data.combo_item_id?.id){
            return getComboRecords(records, previousRecord);
        }
        return previousRecord ? [previousRecord] : false;
    }

    getNextRecords(record) {
        const { records } = this.props.list;
        const comboRecords = getComboRecords(records, record);

        const nextRecord = records[records.indexOf(record) + comboRecords.length];
        if (nextRecord?.data.product_type === 'combo'){
            return getComboRecords(records, nextRecord);
        }
        return nextRecord ? [nextRecord] : false;
    }

    canUseFormatter(column, record) {
        if (
            this.isCombo(record) &&
            this.props.aggregatedFields.includes(column.name)
        ) {
            return true;
        }
        return super.canUseFormatter(column, record);
    }

    // For totals on combo lines
    getFormattedValue(column, record) {
        if (this.isCombo(record) && this.props.aggregatedFields.includes(column.name)) {
            const total = getComboRecords(this.props.list.records, record)
                .reduce((total, record) => total + record.data[column.name], 0);

            const formatter = registry.category('formatters').get(column.fieldType, (val) => val);

            return formatter(total, {
                ...formatter.extractOptions?.(column),
                data: record.data,
                field: record.fields[column.name],
            });
        }
        return super.getFormattedValue(column, record);
    }

    isCombo(record) {
        return record.data.product_type === 'combo';
    }

    isComboItem(record) {
        return !!record.data.combo_item_id;
    }

    shouldDuplicateSectionItem(record) {
        return !this.isCombo(record) && !this.isComboItem(record);
    }

    displayDeleteIcon(record){
        return super.displayDeleteIcon(record) && !this.isComboItem(record);
    }
}

export class SaleOrderLineOne2Many extends ProductLabelSectionAndNoteOne2Many {
    static components = {
        ...ProductLabelSectionAndNoteOne2Many.components,
        ListRenderer: SaleOrderLineListRenderer,
    };
}
export const saleOrderLineOne2Many = {
    ...productLabelSectionAndNoteOne2Many,
    component: SaleOrderLineOne2Many,
    additionalClasses: sectionAndNoteFieldOne2Many.additionalClasses,
};

registry.category('fields').add('sol_o2m', saleOrderLineOne2Many);
