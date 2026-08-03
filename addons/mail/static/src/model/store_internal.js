/** @typedef {import("./record").Record} Record */
/** @typedef {import("./record_list").RecordList} RecordList */

import { ManyFieldVersion, SingleFieldVersion, SKIP_REVISION } from "@mail/model/field_version";
import {
    isCommandList,
    isMany,
    normalizeManyCommands,
    technicalKeysOnRecords,
    untrackFunctions,
} from "@mail/model/misc";
import { RecordInternal } from "@mail/model/record_internal";

import { htmlEscape, markup, signal } from "@odoo/owl";

import { deserializeDate, deserializeDateTime } from "@web/core/l10n/dates";

const Markup = markup().constructor;

export class StoreInternal extends RecordInternal {
    /** @type {Map<Record, true>} */
    RD_QUEUE = new Map(); // record-deletes
    ERRORS = [];
    UPDATE = 0;
    /**
     * Current version context used in the current store insert operation.
     *
     * The version data is provided by the server. If no version is provided,
     * each field falls back to its last known version.
     *
     * @type {{
     *    written_fields_by_record: import("@mail/model/field_version").WrittenFieldsByRecord,
     *    snapshot: import("@mail/model/field_version").PgSnapshot
     * }}
     */
    currentInsertVersion = null;
    warnErrors = true;

    /**
     * Reactive flag: the update cycle is removing deleted records from their
     * relations. Memoized getters hold while it is set (@see
     * RecordInternal.proxyGet): re-running mid-removal would observe
     * half-removed records, e.g. an _inherits parent already unlinked with
     * its routed methods resolving undefined.
     */
    deletingRecords = signal(false);

    /**
     * @param {Record} record
     * @param {string} fieldName
     * @param {any} value
     */
    updateAttr(record, fieldName, value) {
        const internal = record._;
        const Model = record.Model;
        const fieldType = Model._.fieldsType.get(fieldName);
        const fieldHtml = Model._.fieldsHtml.get(fieldName);
        // The signal is the field's sole storage (created lazily for dynamic attrs):
        // read the current value from it and write the new value to it.
        const sig = internal.fieldsSignal.get(fieldName) ?? internal.ensureFieldSignal(fieldName);
        const current = sig();
        // signal.set skips an Object.is-equal write on its own; the datetime/date/html
        // branches below compare by value (a fresh-but-equal DateTime/Markup is a new
        // reference), so they guard the write explicitly to avoid an unnecessary notify.
        let shouldChange = current !== value;
        if (fieldType === "datetime" && value) {
            if (!(value instanceof luxon.DateTime)) {
                value = deserializeDateTime(value);
            }
            shouldChange = !current || !value.equals(current);
        }
        if (fieldType === "date" && value) {
            if (!(value instanceof luxon.DateTime)) {
                value = deserializeDate(value);
            }
            shouldChange = !current || !value.equals(current);
        }
        let newValue = value;
        if (fieldHtml) {
            newValue =
                Array.isArray(value) && value[0] === "markup"
                    ? value[1]
                        ? markup(value[1])
                        : ""
                    : value
                    ? htmlEscape(value)
                    : "";
            shouldChange =
                current?.toString() !== newValue?.toString() ||
                current instanceof Markup != newValue instanceof Markup;
        }
        if (shouldChange) {
            sig.set(newValue);
        }
    }
    /**
     * @param {Record} record
     * @param {Object} vals
     */
    updateFields(record, vals) {
        const internal = record._;
        const Model = record.Model;
        let fieldNames = Object.keys(vals);
        const symbols = Object.getOwnPropertySymbols(vals);
        if (symbols.length) {
            fieldNames = fieldNames.concat(symbols);
        }
        for (const fieldName of fieldNames) {
            const value = vals[fieldName];
            if (typeof fieldName === "string" && Model._.resolveParentField(fieldName)) {
                // Inherited field: its value lives on the parent record. Write it
                // through the record, whose set trap forwards inherited fields to
                // the parent (the get trap reads them back from there).
                record[fieldName] = value;
                continue;
            }
            if (
                typeof fieldName === "string" &&
                !Model._.fields.get(fieldName) &&
                !technicalKeysOnRecords.has(fieldName)
            ) {
                console.warn(
                    `Dropping unknown field "${fieldName}" inserted on "${Model.getName()}": records only hold declared fields.`
                );
                continue;
            }
            let version = internal.fieldsVersion.get(fieldName);
            if (!version) {
                version = isMany(Model, fieldName)
                    ? new ManyFieldVersion(Model)
                    : new SingleFieldVersion();
                internal.fieldsVersion.set(fieldName, version);
            }
            // Always use the server version if provided, the last known version for the
            // field otherwise.
            const revision = this.currentInsertVersion
                ? {
                      snapshot: this.currentInsertVersion.snapshot,
                      isWrite:
                          this.currentInsertVersion.written_fields_by_record?.[Model.getName()]?.[
                              record.id
                          ]?.includes(fieldName),
                  }
                : version.lastRevision;
            const toApply = version.resolveApply(
                isMany(Model, fieldName) ? normalizeManyCommands(value) : value,
                revision
            );
            if (toApply === SKIP_REVISION) {
                continue;
            }
            if (!Model._.fields.get(fieldName) || Model._.fieldsAttr.get(fieldName)) {
                this.updateAttr(record, fieldName, toApply);
            } else {
                this.updateRelation(record, fieldName, toApply);
            }
        }
    }
    /**
     * @param {Record} record
     * @param {string} fieldName
     * @param {any} value
     */
    updateRelation(record, fieldName, value) {
        /** @type {RecordList<Record>} */
        const recordList = record._.fieldsList.get(fieldName);
        if (isMany(record.Model, fieldName)) {
            this.updateRelationMany(recordList, value);
        } else {
            this.updateRelationOne(recordList, value);
        }
    }
    /**
     * @param {RecordList} recordList
     * @param {any} value
     */
    updateRelationMany(recordList, value) {
        for (const [cmd, cmdData] of value) {
            if (cmd === "REPLACE") {
                recordList._.assign(recordList, cmdData);
                continue;
            }
            for (const item of cmdData) {
                switch (cmd) {
                    case "ADD":
                        recordList.add(item);
                        break;
                    case "ADD.noinv":
                        recordList._.addNoinv(recordList, item);
                        break;
                    case "DELETE":
                        recordList.delete(item);
                        break;
                    case "DELETE.noinv":
                        recordList._.deleteNoinv(recordList, item);
                        break;
                }
            }
        }
    }
    /**
     * @param {RecordList} recordList
     * @param {any} value
     * @returns {boolean} whether the value has changed
     */
    updateRelationOne(recordList, value) {
        if (isCommandList(value)) {
            const [cmd, cmdData] = value.at(-1);
            if (["ADD", "REPLACE"].includes(cmd)) {
                recordList.add(cmdData);
            } else if (cmd === "ADD.noinv") {
                recordList._.addNoinv(recordList, cmdData);
            } else if (cmd === "DELETE.noinv") {
                recordList._.deleteNoinv(recordList, cmdData);
            } else {
                recordList.delete(cmdData);
            }
        } else if ([null, false, undefined].includes(value)) {
            recordList.clear();
        } else {
            recordList.add(value);
        }
    }
}

untrackFunctions(StoreInternal.prototype, [
    "updateAttr",
    "updateFields",
    "updateRelation",
    "updateRelationMany",
    "updateRelationOne",
]);
