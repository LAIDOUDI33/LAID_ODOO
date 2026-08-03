import { PgSnapshot } from "@mail/model/field_version";
import { Record } from "./record";
import { STORE_SYM, untrackFunctions } from "./misc";

/** @typedef {import("./record_list").RecordList} RecordList */

export class Store extends Record {
    static singleton = true;
    /**
     * All the records of the store, by localId (raw own property of the store
     * record, @see RecordInternal.setupRecord).
     *
     * @type {Map<string, Record>}
     */
    recordByLocalId;
    /**
     * @param {string} localId
     * @returns {Record}
     */
    get(localId) {
        return this.recordByLocalId.get(localId);
    }

    handleError(err) {
        this._.ERRORS.push(err);
    }

    /** @param {() => any} fn */
    MAKE_UPDATE(fn) {
        this._.UPDATE++;
        let res;
        try {
            res = fn();
        } catch (err) {
            this.handleError(err);
        }
        this._.UPDATE--;
        const deletingRecordsByLocalId = new Map();
        if (this._.UPDATE === 0) {
            // pretend an increased update cycle so that nothing in queue creates many small update cycles
            this._.UPDATE++;
            while (this._.RD_QUEUE.size > 0) {
                const RD_QUEUE = new Map(this._.RD_QUEUE);
                this._.RD_QUEUE.clear();
                this._.deletingRecords.set(true);
                while (RD_QUEUE.size > 0) {
                    /** @type {Record} */
                    const record = RD_QUEUE.keys().next().value;
                    RD_QUEUE.delete(record);
                    // Dispose the record's effects first (onChange runners and
                    // their pending cleanups): they must not observe (nor write
                    // through) the relations being cleared below.
                    record._runDisposeFns();
                    // Set before removing the relations below: while true, the
                    // record's getters return their last value instead of running
                    // again on a record being deleted (running would read gone
                    // relations and crash).
                    record._.deletingSignal.set(true);
                    for (const [localId, names] of record._.uses.data.entries()) {
                        for (const [name2, count] of names.entries()) {
                            const usingRecord =
                                this.recordByLocalId.get(localId) ||
                                deletingRecordsByLocalId.get(localId);
                            if (!usingRecord) {
                                // record already deleted, clean inverses
                                record._.uses.data.delete(localId);
                                continue;
                            }
                            // straight from the containing RecordList: reading the
                            // field would yield the record itself on a One relation
                            const usingList = usingRecord._.fieldsList.get(name2);
                            for (let c = 0; c < count; c++) {
                                usingList.delete(record);
                            }
                        }
                    }
                    deletingRecordsByLocalId.set(record.localId, record);
                    // remove from records BEFORE flipping existence: an observer
                    // woken by the flip must never see a non-existing record in
                    // Model.records
                    this.recordByLocalId.delete(record.localId);
                    delete record.Model.records[record.localId];
                    record._.existsSignal.set(false);
                }
                // fully gone: unlinks in a later round (queued by relation
                // change callbacks during this one) no longer resolve this
                // round's records - their lists are unreachable and their
                // effects already disposed
                deletingRecordsByLocalId.clear();
                this._.deletingRecords.set(false);
            }
            this._.UPDATE--;
            if (this._.ERRORS.length) {
                if (this._.warnErrors) {
                    console.warn("Store data insert aborted due to following errors:");
                    for (const err of this._.ERRORS) {
                        console.warn(err);
                    }
                }
                const [error1] = this._.ERRORS;
                this._.ERRORS = [];
                throw error1;
            }
        }
        return res;
    }
    /**
     * @template T
     * @param {T & {__store_version__?: import("@mail/model/field_version").StoreVersion}} [dataByModelName={}]
     * @param {Object} [options={}]
     * @returns {{ [K in keyof T]: import("models").Models[K][] }}
     */
    insert(dataByModelName = {}, options = {}) {
        const store = this;
        // Only cleanup if we initiated the insert.
        const shouldCleanup = !this._.currentInsertVersion;
        if ("__store_version__" in dataByModelName) {
            const versionMeta = dataByModelName.__store_version__;
            delete dataByModelName.__store_version__;
            this._.currentInsertVersion = {
                ...versionMeta,
                snapshot: new PgSnapshot(versionMeta.snapshot),
            };
        }
        try {
            this.MAKE_UPDATE(function storeInsert() {
                const recordsDataToDelete = [];
                for (const [modelName, data] of Object.entries(dataByModelName)) {
                    if (!store[modelName]) {
                        console.warn(
                            `store.insert() received data for unknown model "${modelName}".`
                        );
                        continue;
                    }
                    const insertData = [];
                    for (const vals of Array.isArray(data) ? data : [data]) {
                        if (vals._DELETE) {
                            delete vals._DELETE;
                            recordsDataToDelete.push([modelName, vals]);
                        } else {
                            insertData.push(vals);
                        }
                    }
                    store[modelName].insert(insertData, options);
                }
                // Delete after all inserts to make sure a relation potentially registered before the
                // delete doesn't re-add the deleted record by mistake.
                for (const [modelName, vals] of recordsDataToDelete) {
                    store[modelName].get(vals)?.delete();
                }
            });
        } finally {
            if (shouldCleanup) {
                this._.currentInsertVersion = null;
            }
        }
    }
}
// on the prototype, not as a class field: the Record constructor checks it
// before the class fields initialize, and a class field would go through
// proxySet (@see Record constructor)
Store.prototype[STORE_SYM] = true;
untrackFunctions(Store.prototype, ["handleError", "insert", "onChange"]);
