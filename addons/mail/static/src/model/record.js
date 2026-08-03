import {
    computed,
    effect,
    immediateEffect,
    markRaw,
    markup,
    shallowEqual,
    untrack,
} from "@odoo/owl";
import {
    OR_SYM,
    STORE_SYM,
    isCommandList,
    isMany,
    isOne,
    isRecord,
    isRelation,
    modelRegistry,
    untrackFunctions,
} from "./misc";
import { serializeDate, serializeDateTime } from "@web/core/l10n/dates";

/** @typedef {import("./misc").FieldDefinition} FieldDefinition */
/** @typedef {import("./record_list").RecordList} RecordList */
/**
 * @typedef {Object} Ongoing
 * @property {Object} storeData Store insert-able data grouped by model names
 * @property {Set<string>} seenRecords A set of localIDs to track visited records
 * @property {boolean} depth Whether to recursively fetch deep data for all related records
 * @property {string[]} fields An array of field names to fetch, using dot notation (e.g., `"persona.group_ids"`).
 */

const Markup = markup().constructor;

/**
 * Main class for all records in the store.
 *
 * Fields are declared as class fields (`name = fields.X()`) or in setup()
 * (the only way in patches: never add fields on the prototype). Both go
 * through the record proxy: the base constructor returns it, so the
 * class-field initializers and setup() run with `this` being the proxy and
 * their declarations are intercepted (@see RecordInternal.proxySet).
 *
 * setup() should be overridden in subclasses to add custom logic; it runs
 * after all the class-field initializers (@see Record.new, which drives the
 * whole record creation).
 *
 * Never define a constructor: the bootstrap arguments must reach the base
 * constructor through the implicit ones (@see makeStore), and a
 * constructor body would run between the field declarations and setup().
 *
 * Getters are cached with OWL computed: only reactive changes invalidate them.
 */
export class Record {
    /** @type {import("./model_internal").ModelInternal} */
    static _;
    /** @type {import("./record_internal").RecordInternal} */
    _;
    static id = "id";
    /** @type {import("@web/env").OdooEnv} */
    env;
    /** @type {Object<string, typeof Record>} on the store record only (@see constructor) */
    Models;
    /** @type {Object<string, Record>} */
    static records;
    /** @type {import("models").Store} */
    static store;
    /** @type {string} */
    static _name;
    static get(data) {
        const Model = this;
        return this.records[Model.localId(data)];
    }
    /**
     * Gets a record by id, fetching it from the server if it doesn't exist in the store or if some
     * of the specified fields are missing.
     * Only works for models that are explicitly supported in /mail/store controller.
     *
     * @param {number} id
     * @param {string[]} field_names
     */
    static async getOrFetch(id, field_names = []) {
        let record = this.get(id);
        if (!record || field_names.some((fieldName) => record[fieldName] === undefined)) {
            await this.store.fetchStoreData(this.getName(), { id });
            record = this.get(id);
            if (!record) {
                return;
            }
        }
        return record;
    }
    static getName() {
        return this._name || this.name;
    }
    static register(localRegistry) {
        if (localRegistry) {
            // Record-specific tests use local registry as to not affect other tests
            localRegistry.add(this.getName(), this);
        } else {
            modelRegistry.add(this.getName(), this);
        }
    }
    static localId(data) {
        const Model = this;
        let idStr;
        if (Model.singleton) {
            return Model.getName();
        }
        if (typeof data === "object" && data !== null) {
            idStr = Model._localId(Model.id, data);
        } else {
            idStr = data; // non-object data => single id
        }
        return `${Model.getName()},${idStr}`;
    }
    static _localId(expr, data, { brackets = false } = {}) {
        const Model = this;
        if (!Array.isArray(expr)) {
            if (Model._.fields.get(expr)) {
                if (Model._.fieldsMany.get(expr)) {
                    throw new Error("Using a fields.Many() as id is not (yet) supported");
                }
                if (!isRelation(Model, expr)) {
                    return data[expr];
                }
                if (isCommandList(data[expr])) {
                    // Note: only fields.One is supported
                    const [cmd, data2] = data[expr].at(-1);
                    if (cmd === "DELETE") {
                        return undefined;
                    } else {
                        return `(${data2?.localId})`;
                    }
                }
                // relational field (note: optional when OR)
                if (isRecord(data[expr])) {
                    return `(${data[expr]?.localId})`;
                }
                const TargetModelName = Model._.fieldsTargetModel.get(expr);
                return `(${Model.store[TargetModelName].get(data[expr])?.localId})`;
            }
            return data[expr];
        }
        const vals = [];
        for (let i = 1; i < expr.length; i++) {
            vals.push(Model._localId(expr[i], data, { brackets: true }));
        }
        let res = vals.join(expr[0] === OR_SYM ? " OR " : " AND ");
        if (brackets) {
            res = `(${res})`;
        }
        return res;
    }
    static _retrieveIdFromData(data) {
        const Model = this;
        if (Model.singleton || Model.id === undefined) {
            return {};
        }
        function idValue(expr) {
            const val = data[expr];
            if (isCommandList(val)) {
                // Note: only fields.One() is supported
                const [cmd, data2] = val.at(-1);
                if (cmd === "DELETE") {
                    return undefined;
                }
                if (cmd === "DELETE.noinv") {
                    return [["DELETE.noinv", data2]];
                }
                if (cmd === "ADD.noinv") {
                    return [["ADD.noinv", data2]];
                }
                return data2;
            }
            return val;
        }
        if (typeof Model.id === "string") {
            if (typeof data !== "object" || data === null) {
                return { [Model.id]: data }; // non-object data => single id
            }
            return { [Model.id]: idValue(Model.id) };
        }
        const res = {};
        for (const expr of Model.id) {
            if (typeof expr === "symbol") {
                continue;
            }
            res[expr] = idValue(expr);
        }
        return res;
    }
    /**
     * Creates a record: bootstrap constructor, class-field and setup()
     * declarations, ids, store registrations, release of the held onChanges.
     *
     * @returns {Record}
     */
    static new(ids) {
        const Model = this;
        return Model.store.MAKE_UPDATE(function RecordNew() {
            const record = new Model();
            // setup()'s field declarations are intercepted by proxySet like
            // the class fields, so fields can also be declared dynamically on
            // a live record. Called here and not in a constructor: it must
            // run after ALL the class-field initializers, and only the
            // most-derived constructor body runs later than them.
            record.setup();
            // resolve the relational ids now: making this localId reads the
            // target records' localIds, and a relational id is only known to
            // be one once setup() registered the fields (deferred from
            // preinsert, which runs before this model's fields exist).
            if (!Model.singleton) {
                for (const name in ids) {
                    if (
                        ids[name] &&
                        !isRecord(ids[name]) &&
                        !isCommandList(ids[name]) &&
                        isRelation(Model, name)
                    ) {
                        ids[name] = Model.store[Model._.fieldsTargetModel.get(name)].preinsert(
                            ids[name]
                        );
                    }
                }
            }
            // localId is resolved now, after the ids' target records exist;
            // before the ids are applied, as adding a relation reads this
            // record's localId.
            const localId = Model.localId(ids);
            record._.localId = localId;
            Object.assign(record, { ...ids });
            Model.records[localId] = record;
            Model.store.recordByLocalId.set(localId, record);
            // releases the held onChange registrations (@see
            // RecordInternal.constructing): after the registrations above, so
            // what they read resolves the record
            record._.constructing.set(false);
            return record;
        });
    }
    /** @returns {Record|Record[]} */
    static insert(data, options = {}) {
        const Model = this;
        return Model.store.MAKE_UPDATE(function RecordInsert() {
            const isMulti = Array.isArray(data);
            if (!isMulti) {
                data = [data];
            }
            const res = data.map(function RecordInsertMap(d) {
                return Model._insert(d, options);
            });
            if (!isMulti) {
                return res[0];
            }
            return res;
        });
    }
    /** @returns {Record} */
    static _insert(data) {
        const Model = this;
        const record = Model.preinsert(data);
        record.update(data);
        return record;
    }
    /** @returns {Record} */
    static preinsert(data) {
        const Model = this;
        const ids = Model._retrieveIdFromData(data);
        if (!Model.singleton) {
            for (const name in ids) {
                if (
                    ids[name] &&
                    !isRecord(ids[name]) &&
                    !isCommandList(ids[name]) &&
                    isRelation(Model, name)
                ) {
                    ids[name] = Model.store[Model._.fieldsTargetModel.get(name)].preinsert(
                        ids[name]
                    );
                }
            }
        }
        return Model.get(ids) ?? Model.new(ids);
    }

    /**
     * Bootstraps the record and returns its proxy, which therefore becomes
     * `this` of every subclass field initializer and constructor body that
     * runs after it: class-field declarations (`name = fields.X()`) are
     * intercepted by proxySet exactly like setup() declarations. Model
     * classes must never define a constructor (@see class description).
     * Record.new constructs the per-store Model subclass (@see makeStore), so
     * `new.target` is the Model; without one (the bootstrap store constructs
     * the model class directly) the instance stays a plain object.
     */
    constructor() {
        const rawRecord = this;
        markRaw(rawRecord); // record reactivity is done through field signals
        const Model = new.target;
        if (!Model._) {
            // not a Model made by makeStore (its `_` marks it): the
            // bootstrap store constructs the model class directly
            return;
        }
        rawRecord.Model = Model;
        // the store record shares the bootstrap store's internal (they are the
        // same store, @see makeStore); every other record gets its own
        rawRecord._ = rawRecord[STORE_SYM] ? Model.store._ : new Model._.RecordInternal();
        return rawRecord._.setupRecord(rawRecord);
    }

    get store() {
        return this.Model.store;
    }
    /**
     * Technical attribute, contains the Model entry in the store.
     * This is almost the same as the class, except it's an object
     * (so it works with OWL reactivity), and it's the actual object
     * that store the records.
     *
     * Indeed, `this.constructor.records` is there to initiate `records`
     * on the store entry, but the class `static records` is not actually
     * used because it's non-reactive, and we don't want to persistently
     * store records on class, to make sure different tests do not share
     * records.
     *
     * @type {typeof Record}
     */
    Model;
    /** @type {string} */
    get localId() {
        return this._.localId;
    }
    setup() {}

    update(data) {
        const record = this;
        if (data === undefined) {
            // insert without data (e.g. a singleton): nothing to apply; the
            // single-id branch below would write a junk undefined id
            return;
        }
        const store = record.store;
        return store.MAKE_UPDATE(function recordUpdate() {
            if (typeof data === "object" && data !== null) {
                store._.updateFields(record, data);
            } else {
                if (Array.isArray(record.Model.id)) {
                    throw new Error(
                        `Cannot insert "${data}" on model "${record.Model.getName()}": this model doesn't support single-id data!`
                    );
                }
                // update on single-id data
                store._.updateFields(record, { [record.Model.id]: data });
            }
        });
    }

    delete() {
        const record = this;
        if (!record.exists()) {
            return;
        }
        const store = record.store;
        return store.MAKE_UPDATE(function recordDelete() {
            // delete records inheriting the current record before deleting the current record
            for (const fieldName of record.Model._.inheritsInverseFields) {
                if (record.Model._.fieldsMany.get(fieldName)) {
                    for (const dependentRecord of record[fieldName]) {
                        store._.RD_QUEUE.set(dependentRecord, true);
                    }
                } else {
                    const dependentRecord = record[fieldName];
                    if (dependentRecord) {
                        store._.RD_QUEUE.set(dependentRecord, true);
                    }
                }
            }
            store._.RD_QUEUE.set(record, true);
        });
    }

    exists() {
        return this._.existsSignal();
    }

    /** @param {Record} record */
    eq(record) {
        return this === record;
    }

    /** @param {Record} record */
    notEq(record) {
        return !this.eq(record);
    }

    /** @param {Record[]|RecordList} collection */
    in(collection) {
        if (!collection) {
            return false;
        }
        return collection.some((record) => record.eq(this));
    }

    /** @param {Record[]|RecordList} collection */
    notIn(collection) {
        return !this.in(collection);
    }

    /**
     * Observe changes: dependencies function + callback receiving the dep
     * values, auto-disposed when the record starts being deleted (@see
     * _disposeOnChanges: a runner must not observe or write half-removed
     * state while the relations are cleared). Both functions are bound to the
     * record proxy. Tracking is exactly what `dependencies` reads while it
     * runs: read `.length`/iterate in it if list content matters. Its values
     * are compared with `shallowEqual`, so the callback only runs when one of
     * them changes, even a derived one. The callback may return a cleanup
     * function, invoked before the next callback and on dispose.
     *
     * @template {any[]} T
     * @param {(this: this) => T} dependencies
     * @param {(this: this, ...deps: T) => (() => void)|void} callback
     * @param {Object} [options]
     * @param {boolean} [options.immediate=false] use owl's synchronous
     *  `immediateEffect` instead of the default batched `effect`
     * @param {boolean} [options.initialRun=true] pass false to skip the first run
     */
    onChange(dependencies, callback, { immediate = false, initialRun = true } = {}) {
        const record = this;
        const deps = computed(dependencies.bind(record), { equals: shallowEqual });
        const boundCallback = callback.bind(record);
        let firstRun = true;
        let cleanup;
        record._registerDisposeFn(
            immediateEffect(function onChangeAfterConstructing() {
                if (untrack(() => record._.constructing())) {
                    // hold a registration made while the record is being
                    // created: the deps and the initial run must observe the
                    // complete record (ids assigned, inherits applied).
                    // Subscribe only while held: the release run reads
                    // nothing, dropping the subscription.
                    void record._.constructing();
                    return;
                }
                const effectFn = immediate ? immediateEffect : effect;
                const disposeFn = untrack(() =>
                    effectFn(function runOnChange() {
                        const values = deps() ?? [];
                        if (firstRun) {
                            firstRun = false;
                            if (!initialRun) {
                                return;
                            }
                        }
                        untrack(() => {
                            cleanup?.();
                            const result = boundCallback(...values);
                            cleanup = typeof result === "function" ? result : undefined;
                            // a callback writing its own dependency leaves the
                            // memo on the value it read: re-read it, so putting
                            // that value back later still counts as a change
                            deps();
                        });
                    })
                );
                record._registerDisposeFn(() => {
                    disposeFn();
                    untrack(() => cleanup?.());
                    cleanup = undefined;
                });
            })
        );
    }

    /**
     * Keep the field assigned from `compute` (an immediate onChange writing the
     * computed value). Prefer a plain getter for a derived value: it is lazy
     * and memoized. Assigning is only for a value that must be STORED: it is
     * also written by other flows, or the field carries an inverse to maintain.
     *
     * @param {string} fieldName
     * @param {(this: this) => any} compute returns the value to assign; for a
     *  Many relation, the records array (compared element-wise)
     */
    assignComputed(fieldName, compute) {
        const record = this;
        const many = isMany(this.Model, fieldName);
        // memoized with a shallow equals: the assignment must not repeat when
        // the computed value is unchanged (a Many compute returns a fresh
        // array each run)
        const value = computed(() => compute.call(record), {
            equals: many ? shallowEqual : undefined,
        });
        this.onChange(
            function assignDependencies() {
                return [value()];
            },
            function assignValue(val) {
                this[fieldName] = val;
            },
            { immediate: true }
        );
    }

    /**
     * Observe a relation's membership: the callback receives the records
     * added to and removed from it since the previous run (on the initial
     * run every current record is `added`; it is not called when nothing
     * changed). The dependency returns the relation (One or Many); the diff
     * is kept here so callers do not re-implement it.
     *
     * @param {(this: this) => import("./record_list").RecordList|Record|undefined} dependency
     * @param {(this: this, changes: { added: Record[], removed: Record[] }) => void} callback
     */
    onRelationChange(dependency, callback) {
        const record = this;
        function relationMembers() {
            const value = dependency.call(record);
            const records = isRecord(value) ? [value] : [...(value ?? [])];
            return records.filter(Boolean);
        }
        let previous = [];
        this.onChange(
            relationMembers,
            function relationDiff(...records) {
                const added = records.filter((r) => !previous.includes(r));
                const removed = previous.filter((r) => !records.includes(r));
                previous = records;
                if (!added.length && !removed.length) {
                    return;
                }
                callback.call(record, { added, removed });
                // the callback may alter the relation itself, without the
                // effect firing again (it is already running): re-read so the
                // next diff compares against the actual membership
                previous = untrack(relationMembers);
            },
            { immediate: true }
        );
    }

    /**
     * Converts the current record and its related data into Store insert-able data.
     * @param {Array<string> | { depth: boolean }} options Configuration options or an array of field names.
     * @returns {Object} A data object grouped by model names.
     */
    toData(options = { depth: false }) {
        const prefix = this.Model.getName();
        const ongoing = {
            seenRecords: new Set(),
            storeData: {},
            depth: options.depth,
            fields: undefined,
        };
        if (Array.isArray(options)) {
            ongoing.fields = options.map((field) => `${prefix}.${field}`);
        }
        this._toData(ongoing, prefix);
        return ongoing.storeData;
    }

    /** @param {Function} disposeFn */
    _registerDisposeFn(disposeFn) {
        this._.disposeFns.add(disposeFn);
        if (!this[STORE_SYM]) {
            this.store._.disposeFns.add(disposeFn);
        }
    }

    /** @param {Function} f */
    _runDisposeFn(f) {
        f();
        this._.disposeFns.delete(f);
        if (!this[STORE_SYM]) {
            this.store._.disposeFns.delete(f);
        }
    }

    _runDisposeFns() {
        for (const f of this._.disposeFns) {
            this._runDisposeFn(f);
        }
    }

    /**
     * @param {Ongoing} ongoing The ongoing data conversion state.
     * @param {string} [prefix] The prefix for the current field (used for nested fields).
     */
    _toData(ongoing, prefix = undefined) {
        if (ongoing.depth && ongoing.seenRecords.has(this.localId)) {
            return;
        }
        ongoing.seenRecords.add(this.localId);

        const record = this;
        const Model = record.Model;
        const data = {};
        for (const name of Model._.fields.keys()) {
            const fullFieldName = prefix ? `${prefix}.${name}` : name;
            if (isMany(Model, name)) {
                data[name] = record[name].map((otherRecord) =>
                    otherRecord._toDataRelationalRecord(ongoing, fullFieldName)
                );
            } else if (isOne(Model, name)) {
                const otherRecord = record[name];
                data[name] = otherRecord?._toDataRelationalRecord(ongoing, fullFieldName);
            } else {
                // fields.Attr()
                const value = record[name];
                if (Model._.fieldsType.get(name) === "datetime" && value) {
                    data[name] = serializeDateTime(value);
                } else if (Model._.fieldsType.get(name) === "date" && value) {
                    data[name] = serializeDate(value);
                } else if (Model._.fieldsHtml.get(name) && value instanceof Markup) {
                    data[name] = ["markup", value.toString()];
                } else {
                    data[name] = value;
                }
            }
        }

        const modelName = Model.getName();
        ongoing.storeData[modelName] ||= [];
        ongoing.storeData[modelName].push(data);
    }

    /**
     * @param {Ongoing} ongoing The ongoing data conversion state.
     * @param {string} prefix The prefix for the current field (used for nested fields).
     * @returns {Object} A data object grouped by model names.
     */
    _toDataRelationalRecord(ongoing, prefix = undefined) {
        const data = this.Model._retrieveIdFromData(this);
        if (ongoing.depth || ongoing.fields?.some((field) => field.startsWith(prefix))) {
            this._toData(ongoing, prefix);
        }
        for (const [name, val] of Object.entries(data)) {
            if (isRecord(val)) {
                data[name] = val._toDataRelationalRecord(ongoing, prefix);
            }
        }
        return data;
    }
}
untrackFunctions(Record, ["insert", "new"]);
untrackFunctions(Record.prototype, ["delete", "update"]);
