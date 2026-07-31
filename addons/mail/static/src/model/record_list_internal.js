import { isRecord, untrackFunctions } from "./misc";

import { markRaw, proxy, signal } from "@odoo/owl";

/** @typedef {import("./record").Record} Record */
/** @typedef {import("./record_list").RecordList} RecordList */

/** @param {RecordList} reclist */
export function getInverse(reclist) {
    return reclist._.owner.Model._.fieldsInverse.get(reclist._.name);
}

/** @param {RecordList} reclist */
export function getTargetModel(reclist) {
    return reclist._.owner.Model._.fieldsTargetModel.get(reclist._.name);
}

/** @param {RecordList} reclist */
export function isOne(reclist) {
    return reclist._.owner.Model._.fieldsOne.get(reclist._.name);
}

export class RecordListInternal {
    /** @type {string} */
    name;
    /** @type {Record} */
    owner;
    /** @type {import("models").Store} set at setup; internal code reads it trap-free here */
    store;
    /**
     * Bound methods returned by proxyGet, memoized so a method read does not
     * allocate a new bound function each time. Keyed by name; rebound when the
     * resolved function changes.
     *
     * @type {Map<string|symbol, { fn: Function, bound: Function }>}
     */
    boundFns = new Map();
    /**
     * The localId list, this relation's sole storage. Exposed through the `data`
     * accessor below (the RecordList one forwards here); read raw via `dataSignal()`
     * only for non-reactive bookkeeping.
     *
     * @type {import("@odoo/owl").Signal<string[]>}
     */
    dataSignal = signal([]);
    /**
     * The localId list, as two deliberate reactive channels so each list operation
     * notifies observers exactly once:
     *  - reads and in-place mutations go through `proxy(dataSignal())`, owl's fine-grained
     *    per-key reactivity, so a `push`/`splice` notifies only the positions that changed;
     *  - whole-list replacement (`this.data = [...]`) goes through `dataSignal.set()`, the
     *    signal's single atom, so a reorder notifies once, not once per moved index.
     * Neither channel alone works: `signal.Array` is a single atom (an in-place push fires
     * it twice and over-notifies), while a coarse `signal` with `.set` for everything loses
     * the reorder's notify to immediateEffect re-entrancy (under-notifies). Both break the
     * "record list sort should be manually observable" test.
     *
     * @type {string[]}
     */
    get data() {
        return proxy(this.dataSignal());
    }
    set data(localIds) {
        this.dataSignal.set(localIds);
    }

    constructor() {
        markRaw(this);
    }

    /**
     * Technical construction of a record list: everything past the Array
     * bootstrap of the RecordList constructor, which delegates here. Sets up
     * the internal state and returns the record list: the proxy that
     * intercepts all content access.
     *
     * @param {RecordList} rawRecordList
     * @param {Record} [owner] the record whose relation field this list contains
     * @param {string} [name] the relation field name
     * @returns {RecordList}
     */
    setupRecordList(rawRecordList, owner, name) {
        const self = this;
        markRaw(rawRecordList); // record list is reactive through data/dataSignal
        const recordList = new Proxy(rawRecordList, {
            get(...args) {
                return self.proxyGet(...args);
            },
            set(...args) {
                return self.proxySet(...args);
            },
        });
        markRaw(recordList); // record list is reactive through data/dataSignal
        if (owner) {
            this.name = name;
            this.owner = owner;
            this.store = owner.store;
        }
        return recordList;
    }
    /**
     * Version of add() that does not update the inverse.
     * This is internally called when inserting (with intent to add)
     * on relational field with inverse, to prevent infinite loops.
     *
     * @param {RecordList} recordList
     * @param {...Record}
     */
    addNoinv(recordList, ...records) {
        const self = this;
        if (isOne(recordList)) {
            const last = records.at(-1);
            if (isRecord(last) && last.in(recordList)) {
                return;
            }
            self.insert(
                recordList,
                last,
                function recordList_AddNoInvOneInsert(record) {
                    if (record.localId !== self.data[0]) {
                        const old = recordList.at(-1);
                        self.data.pop();
                        old?._.uses.delete(recordList);
                        self.data.push(record.localId);
                        record._.uses.add(recordList);
                    }
                },
                { inv: false }
            );
            return;
        }
        for (const val of records) {
            if (isRecord(val) && val.in(recordList)) {
                continue;
            }
            self.insert(
                recordList,
                val,
                function recordList_AddNoInvManyInsert(record) {
                    if (self.data.indexOf(record.localId) === -1) {
                        self.data.push(record.localId);
                        record._.uses.add(recordList);
                    }
                },
                { inv: false }
            );
        }
    }
    /** @param {R[]|any[]} data */
    assign(recordList, data) {
        const self = this;
        const store = this.store;
        return store.MAKE_UPDATE(function recordListAssign() {
            /** @type {Record[]|Set<Record>|RecordList<Record|any[]>} */
            const collection = isRecord(data) ? [data] : data;
            // data and collection could be same record list,
            // save before clear to not push mutated recordlist that is empty
            const vals = [...collection];
            // membership by localId set, not by scanning record arrays: a
            // REPLACE of a big list (e.g. a thread's messages on every fetch)
            // would otherwise pay a records scan per record. Copied: the raw
            // list mutates during the inserts (inverse commands write back).
            const oldLocalIds = new Set(self.dataSignal());
            const newRecords = vals.map((val) =>
                self.insert(recordList, val, function recordListAssignInsert(record) {
                    if (!oldLocalIds.has(record._.localId)) {
                        record._.uses.add(recordList);
                    }
                })
            );
            const newLocalIds = newRecords.map((newRecord) => newRecord._.localId);
            const newLocalIdSet = new Set(newLocalIds);
            const inverse = getInverse(recordList);
            for (const localId of oldLocalIds) {
                if (!newLocalIdSet.has(localId)) {
                    const oldRecord = store.recordByLocalId.get(localId);
                    oldRecord._.uses.delete(recordList);
                    if (inverse) {
                        store._.updateFields(oldRecord, {
                            [inverse]: [["DELETE", self.owner]],
                        });
                    }
                }
            }
            self.data = newLocalIds;
        });
    }
    /**
     * Version of delete() that does not update the inverse.
     * This is internally called when inserting (with intent to delete)
     * on relational field with inverse, to prevent infinite loops.
     *
     * @param {RecordList} recordList
     * @param {...Record}
     */
    deleteNoinv(recordList, ...records) {
        const self = this;
        for (const val of records) {
            self.insert(
                recordList,
                val,
                function recordList_DeleteNoInv_Insert(record) {
                    const index = self.data.indexOf(record.localId);
                    if (index !== -1) {
                        recordList.splice(index, 1);
                    }
                },
                { inv: false }
            );
        }
    }
    /**
     * @param {RecordList} recordList
     * @param {R|any} val
     * @param {(R) => void} [fn] function that is called in-between preinsert and
     *   insert. Preinsert only inserted what's needed to make record, while
     *   insert finalize with all remaining data.
     * @param {boolean} [inv=true] whether the inverse should be added or not.
     *   It is always added except when during an insert on a relational field,
     *   in order to avoid infinite loop.
     * @param {"ADD"|"DELETE} [mode="ADD"] the mode of insert on the relation.
     *   Important to match the inverse. Most of the time it's "ADD", that is when
     *   inserting the relation the inverse should be added. Exception when the insert
     *   comes from deletion, we want to "DELETE".
     */
    insert(recordList, val, fn, { inv = true, mode = "ADD" } = {}) {
        const inverse = getInverse(recordList);
        const targetModel = getTargetModel(recordList);
        if (typeof val !== "object") {
            if (Array.isArray(this.store[targetModel].id)) {
                throw new Error(
                    `Cannot insert "${val}" on relational field "${this.owner.Model.getName()}/${
                        this.name
                    }": target model "${targetModel}" doesn't support single-id data!`
                );
            }
            // single-id data
            val = { [this.store[targetModel].id]: val };
        }
        if (inverse && inv) {
            // special command to call addNoinv/deleteNoInv, to prevent infinite loop
            const target = val;
            target[inverse] = [[mode === "ADD" ? "ADD.noinv" : "DELETE.noinv", this.owner]];
        }
        /** @type {R} */
        let newRecord;
        if (!isRecord(val)) {
            newRecord = this.store[targetModel].preinsert(val);
        } else {
            newRecord = val;
        }
        fn?.(newRecord);
        if (!isRecord(val)) {
            // was preinserted, fully insert now
            this.store[targetModel].insert(val);
        }
        return newRecord;
    }
    proxyGet(rawRecordList, name, recordList) {
        // internal plumbing first: reading it must not go through the
        // index/method resolution below
        if (name === "_") {
            return this;
        }
        if (name === "_store") {
            return this.store;
        }
        if (name === "length") {
            // before the own-property dispatch below: the raw array's own
            // length is meaningless (the content lives in data)
            return this.data.length;
        }
        if (
            typeof name === "symbol" ||
            Object.prototype.hasOwnProperty.call(rawRecordList, name) ||
            Object.prototype.hasOwnProperty.call(rawRecordList.constructor.prototype, name)
        ) {
            const res = Reflect.get(...arguments);
            if (typeof res === "function") {
                // memoized bind: a method read must not allocate each time
                const memo = this.boundFns.get(name);
                if (memo?.fn === res) {
                    return memo.bound;
                }
                const bound = res.bind(recordList);
                this.boundFns.set(name, { fn: res, bound });
                return bound;
            }
            return res;
        }
        if (!window.isNaN(parseInt(name))) {
            // support for "array[index]" syntax (symbols cannot reach here:
            // they all matched the own/prototype dispatch above)
            const index = parseInt(name);
            return this.store.recordByLocalId.get(this.data[index]);
        }
        if (name === "reverse" || name === "fill" || name === "copyWithin") {
            // the in-place Array mutators RecordList does not redefine: run
            // over the record array below they would mutate a throwaway copy,
            // silently leaving the relation untouched; make the misuse explicit
            throw new Error(
                `"${name}" is not supported on record lists: copy first (e.g. slice())`
            );
        }
        // Any other Array.prototype member (the long tail: lastIndexOf, join,
        // flat, findLast, ...): run it on a real array of the records. It must
        // be a materialized array, not this proxy: methods that probe element
        // existence (lastIndexOf's `k in O`) read the raw array, whose slots
        // are empty (the content lives in the data signal, @see the index
        // branch above).
        const array = [...rawRecordList[Symbol.iterator].call(recordList)];
        return array[name]?.bind(array);
    }
    proxySet(rawRecordList, name, val, recordList) {
        const self = this;
        const store = this.store;
        return store.MAKE_UPDATE(function recordListSet() {
            if (typeof name !== "symbol" && !window.isNaN(parseInt(name))) {
                // support for "array[index] = r3" syntax
                const index = parseInt(name);
                self.insert(recordList, val, function recordListSet_Insert(newRecord) {
                    const oldRecord = store.recordByLocalId.get(self.data[index]);
                    self.data[index] = newRecord?.localId;
                    if (oldRecord && oldRecord.notEq(newRecord)) {
                        oldRecord._.uses.delete(recordList);
                    }
                    const inverse = getInverse(recordList);
                    if (inverse) {
                        store._.updateFields(oldRecord, {
                            [inverse]: [["DELETE", self.owner]],
                        });
                    }
                    if (newRecord) {
                        newRecord._.uses.add(recordList);
                        if (inverse) {
                            store._.updateFields(newRecord, {
                                [inverse]: [["ADD", self.owner]],
                            });
                        }
                    }
                });
            } else if (name === "length") {
                const newLength = parseInt(val);
                if (newLength !== self.dataSignal().length) {
                    if (newLength < self.dataSignal().length) {
                        recordList.splice(newLength, self.dataSignal().length - newLength);
                    }
                    self.data.length = newLength;
                }
            } else {
                return Reflect.set(rawRecordList, name, val, recordList);
            }
            return true;
        });
    }
    /**
     * Applies `func` as the order of the record list, in place.
     *
     * @param {RecordList} recordList
     * @param {(a: R, b: R) => number} func
     */
    sortRecordList(recordList, func) {
        // sort on copy of list so that reactive observers not triggered while sorting
        const records = this.data.map((localId) => this.store.recordByLocalId.get(localId));
        records.sort(func);
        const data = records.map((record) => record.localId);
        const hasChanged = this.data.some((localId, i) => localId !== data[i]);
        if (hasChanged) {
            // through the record list: the write must keep the update-cycle
            // and untracked-write semantics of the set trap
            recordList.data = data;
        }
    }
}

untrackFunctions(RecordListInternal.prototype, ["assign", "proxySet"]);
