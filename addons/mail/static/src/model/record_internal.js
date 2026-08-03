/** @typedef {import("./record_list").RecordList} RecordList */

import {
    IS_RECORD_SYM,
    STORE_SYM,
    fields,
    isFieldDefinition,
    isMany,
    isRelation,
    technicalKeysOnRecords,
    untrackFunctions,
} from "./misc";
import { RecordList } from "./record_list";
import { computed, markRaw, proxy, signal, untrack } from "@odoo/owl";
import { RecordUses } from "./record_uses";

export class RecordInternal {
    [IS_RECORD_SYM] = true;
    /**
     * All dispose functions for this record.
     * For the store, this stores the dispose functions of all records.
     * Useful to automatically call the dispose functions when the record is deleted or in-between each tests.
     *
     * @type {Set<Function>}
     */
    disposeFns = new Set();
    /**
     * Per-record memoized owl `computed()` reader for each auto-memoized model
     * getter, created lazily on first read (@see makeStore getter scan). The
     * computed resolves the current prototype getter at each recompute (so a
     * late patch() is honored) and makes a plain `get foo()` on a model a lazy,
     * reactive, memoized derived value.
     *
     * @type {Map<string, () => any>}
     */
    computedGetters = new Map();
    /**
     * True from construction start (an internal is created at that point)
     * until Record.new assigned the ids and registered the record; clearing
     * earlier would run the observing onChanges with undefined ids or have
     * them resolve the record's localId to nothing. While set, the record's
     * onChange registrations are held (@see Record.onChange). A signal: the
     * release re-runs the held registrations.
     *
     * @type {import("@odoo/owl").Signal<boolean>}
     */
    constructing = signal(true);
    // Note: state of fields in Maps rather than object is intentional for improved performance.
    /**
     * Names of fields that received a formal field definition (a
     * `fields.X()`), as opposed to being backed by a plain value write or a
     * read. A second formal definition for the same field is a redefinition
     * (@see proxySet).
     *
     * @type {Set<string>}
     */
    fieldsDeclared = new Set();
    uses = new RecordUses();
    /**
     * Per relation-field RecordList: the field's records live here (sole
     * storage), like fieldsSignal for the attrs. On the internal so both the
     * record and its proxy reach it.
     *
     * @type {Map<string, import("./record_list").RecordList>}
     */
    fieldsList = new Map();
    /**
     * Per attr-field signal: the field's value lives here (sole storage). Internal
     * code and the proxy get/set traps read/write it directly, so reactivity is per
     * field.
     *
     * @type {Map<string, import("@odoo/owl").Signal>}
     */
    fieldsSignal = new Map();
    /**
     * Reactive "record exists" flag, read by `exists()` (true until the record is
     * hard-deleted).
     *
     * @type {import("@odoo/owl").Signal<boolean>}
     */
    existsSignal = signal(true);
    /**
     * While true, the record's getters return their last value instead of running
     * again (@see proxyGet). Set when the record starts being deleted, before its
     * relations are removed, so a getter never runs on a record whose relations are
     * gone (which would crash). Separate from existsSignal, which only flips once
     * the record is fully gone, so relation-change callbacks receiving it as a
     * removed record and Model.get() still see it here.
     *
     * @type {import("@odoo/owl").Signal<boolean>}
     */
    deletingSignal = signal(false);
    /** @type {string} */
    localId;
    /**
     * Bound methods returned by proxyGet, memoized so a method read does not
     * allocate a new bound function each time. Keyed by name; rebound when the
     * resolved function changes (e.g. a late patch()).
     *
     * @type {Map<string|symbol, { fn: Function, bound: Function }>}
     */
    boundFns = new Map();
    /** @type {Map<string, import("@mail/model/field_version").SingleFieldVersion|import("@mail/model/field_version").ManyFieldVersion>} */
    fieldsVersion = new Map();

    /**
     * Value of the auto-memoized prototype getter `name`, memoized in a
     * per-record owl computed() so it is a reactive, cached derived value
     * rather than re-running on every read. Called by the accessor installed
     * on the model prototype (@see ModelInternal.installGetterAccessors); the
     * computed tracks the fields the getter reads and recomputes only when one
     * of them changes.
     *
     * @param {Record} record
     * @param {string} name
     * @returns {any}
     */
    memoizedGetter(record, name) {
        let computedGetter = this.computedGetters.get(name);
        if (computedGetter) {
            return computedGetter();
        }
        const self = this;
        const Model = record.Model;
        const storeInternal = Model.store._;
        // below the accessor's own layer: resolving from the record would
        // re-enter it (@see ModelInternal.installGetterAccessors)
        const patchableProto = Object.getPrototypeOf(Model.prototype);
        let lastValue;
        computedGetter = computed(function computedGetterReader() {
            if (!self.existsSignal()) {
                return undefined;
            }
            if (self.deletingSignal()) {
                // Soft-delete: hold the last value instead of re-running
                // the getter, which would read the record's relations
                // while they are being torn down (the teardown crash).
                // The record may still be briefly rendered during the
                // transition, so it must keep returning a valid value
                // rather than undefined. Holding also drops the getter's
                // dependency on those relations, so the teardown writes
                // no longer wake it.
                return lastValue;
            }
            if (untrack(() => storeInternal.deletingRecords())) {
                // Same hold while OTHER records are being removed from
                // their relations: a re-run now would observe records
                // half-removed (e.g. an _inherits parent already
                // unlinked, its routed methods resolving undefined).
                // Subscribe only while held so the release re-runs it.
                void storeInternal.deletingRecords();
                return lastValue;
            }
            // Resolve the getter live so a late patch() of the model
            // prototype (e.g. a lazy-loaded bundle patching
            // Thread.prototype after the store was created) is seen on the
            // next (re)compute. Limitation: with no reactive dependency
            // changing, a value computed before the patch stays cached.
            lastValue = Reflect.get(patchableProto, name, record);
            return lastValue;
        });
        this.computedGetters.set(name, computedGetter);
        return computedGetter();
    }

    constructor() {
        markRaw(this);
    }

    /**
     * Technical construction of a record: everything past the API-level
     * decisions of the Record constructor, which delegates here right after
     * choosing this internal. Registers the internal state and returns the
     * record: the proxy that intercepts all field access.
     *
     * @param {Record} rawRecord
     * @returns {Record}
     */
    setupRecord(rawRecord) {
        const self = this;
        const Model = rawRecord.Model;
        const record = new Proxy(rawRecord, {
            get(...args) {
                return self.proxyGet(...args);
            },
            /**
             * Class-field initializers assign with [[DefineOwnProperty]], not
             * [[Set]]: route plain data descriptors through proxySet so the
             * `name = fields.X()` declarations are intercepted like setup()
             * assignments, and a later defineProperty (e.g. a test patching a
             * record) writes actual fields, consistent with the set trap.
             * Lying to the runtime (no own property is defined on the target
             * for attrs) is allowed for configurable descriptors, and
             * getOwnPropertyDescriptor virtualizes them.
             */
            defineProperty(target, name, descriptor) {
                if (descriptor.enumerable && descriptor.writable && "value" in descriptor) {
                    return self.proxySet(target, name, descriptor.value, record);
                }
                return Reflect.defineProperty(target, name, descriptor);
            },
            deleteProperty(target, name) {
                return self.proxyDeleteProperty(target, name, record);
            },
            /**
             * Using record.update(data) is preferable for performance to batch process
             * when updating multiple fields at the same time.
             */
            set(...args) {
                return self.proxySet(...args);
            },
        });
        markRaw(record); // record reactivity is done through field signals
        if (rawRecord[STORE_SYM]) {
            // env must be available during setup() so setup-time
            // registrations (e.g. onChange callbacks reaching
            // this.env.services) don't observe an undefined env
            rawRecord.env = Model.store.env;
            /** @type {Map<string, Record>} */
            rawRecord.recordByLocalId = Model.store.recordByLocalId;
            // the Models (and their map) as raw own properties (store.Thread
            // & co are read constantly: they must not go through the
            // dynamic-attr signals)
            rawRecord.Models = Model.store.Models;
            Object.assign(rawRecord, Model.store.Models);
        }
        return record;
    }

    /**
     * Get-or-create the RecordList containing the records of the relation
     * field `name` and return it. Idempotent.
     *
     * @param {Record} record
     * @param {string} name
     * @returns {RecordList}
     */
    ensureRecordList(record, name) {
        let recordList = this.fieldsList.get(name);
        if (!recordList) {
            recordList = new RecordList(0, record, name);
            this.fieldsList.set(name, recordList);
        }
        return recordList;
    }

    /**
     * Get-or-create the signal containing the value of the attr field `name`
     * (declared or dynamic), its sole storage, and return it. `definition`
     * is a field definition (a declaration write intercepted by proxySet,
     * carrying the per-record default) or a plain initial value. Idempotent;
     * a declaration's default
     * never overrides an updated value, and a default is not an update (the
     * signal is written directly, without the update machinery).
     *
     * @param {string} name
     * @param {any} [definition] field definition or plain initial value
     * @returns {import("@odoo/owl").Signal}
     */
    ensureFieldSignal(name, definition) {
        let sig = this.fieldsSignal.get(name);
        if (sig && definition === undefined) {
            return sig; // fast path: prepared attr, plain access
        }
        const defaultValue = isFieldDefinition(definition) ? definition.default : definition;
        if (!sig) {
            sig = signal(defaultValue);
            this.fieldsSignal.set(name, sig);
        } else if (isFieldDefinition(definition)) {
            if (sig() === undefined) {
                // declaration of an already-prepared field holding no value
                // (e.g. an observer's read created it before the declaring
                // line ran): apply the declared per-record default; a field
                // holding a value keeps it (a later default never overrides
                // a value)
                sig.set(defaultValue);
            }
        }
        return sig;
    }

    /**
     * @param {Record} rawRecord
     * @param {string} name
     * @param {Record} record forwarded by the constructor trap
     */
    proxyDeleteProperty(rawRecord, name, record) {
        const self = this;
        const Model = rawRecord.Model;
        const parentFieldName = Model._.resolveParentField(name);
        if (parentFieldName) {
            const parentRecord = record[parentFieldName];
            return Reflect.deleteProperty(parentRecord, name);
        }
        return Model.store.MAKE_UPDATE(function recordDeleteProperty() {
            if (isRelation(Model, name)) {
                self.ensureRecordList(record, name).clear();
                return true;
            }
            // Attr value lives in its signal: clear it there.
            self.ensureFieldSignal(name).set(undefined);
            return true;
        });
    }

    /**
     * @param {Record} rawRecord
     * @param {string} name
     * @param {Record} record the receiver: the record itself
     */
    proxyGet(rawRecord, name, record) {
        if (name === "_") {
            // the hottest technical read, served before anything else
            return this;
        }
        if (typeof name === "symbol") {
            // a symbol never concerns the field dispatch below: symbol-keyed
            // fields (written through insert data) only ever live in
            // fieldsSignal, and well-known symbol probes (e.g. toStringTag,
            // read by owl on every value it may proxify) must stay cheap
            const sig = this.fieldsSignal.get(name);
            if (sig) {
                return sig();
            }
            return Reflect.get(...arguments);
        }
        if (technicalKeysOnRecords.has(name)) {
            // raw own properties (env, Model, Models, recordByLocalId): a
            // Model class must come back unbound, and the undefined env of a
            // non-store record must not become a dynamic attr below
            return Reflect.get(...arguments);
        }
        // Prepared-field fast paths: the sole storage answers directly, the
        // dispatch below (parent routing, classification, get-or-create) only
        // decides what an unprepared name is. A parent-routed name never has
        // local storage, so these never bypass the routing.
        const sig = this.fieldsSignal.get(name);
        if (sig !== undefined) {
            const val = sig();
            // deep reactivity is opt-in
            if (rawRecord.Model._.fieldsReactiveContent.has(name)) {
                return proxy(val);
            }
            return val;
        }
        const recordList = this.fieldsList.get(name);
        if (recordList !== undefined) {
            if (rawRecord.Model._.fieldsMany.get(name)) {
                return recordList;
            }
            return recordList[0];
        }
        const Model = rawRecord.Model;
        if (Model._.fieldsGetter.has(name)) {
            // auto-memoized prototype getter: its value is returned as is,
            // the accessor installed on the model prototype does the work
            return this.memoizedGetter(record, name);
        }
        const parentFieldName = Model._.resolveParentField(name);
        if (parentFieldName) {
            const parentRecord = record[parentFieldName];
            if (!parentRecord) {
                const ParentModel = Model.store[Model._.fieldsTargetModel.get(parentFieldName)];
                if (isMany(ParentModel, name)) {
                    return [];
                }
                return;
            }
            return Reflect.get(parentRecord, name);
        }
        if (!Model._.fields.get(name)) {
            const res = Reflect.get(...arguments);
            if (typeof res === "function" && !res._) {
                // a Model on the store is a class (its `_` marks it, @see
                // makeStore): return it as is, binding would hide its statics.
                // Memoized bind: a method read must not allocate each time.
                const memo = this.boundFns.get(name);
                if (memo?.fn === res) {
                    return memo.bound;
                }
                const bound = res.bind(record);
                this.boundFns.set(name, { fn: res, bound });
                return bound;
            }
            return res;
        }
        if (isRelation(Model, name)) {
            const recordList = this.ensureRecordList(record, name);
            if (isMany(Model, name)) {
                return recordList;
            }
            return recordList[0];
        }
        // Attr field, first read (signal created on demand): its value comes
        // straight from the signal (the sole storage), which subscribes the
        // active computation. Deep reactivity is opt-in.
        const val = this.ensureFieldSignal(name)();
        if (Model._.fieldsReactiveContent.has(name)) {
            return proxy(val);
        }
        return val;
    }

    /**
     * @param {Record} rawRecord
     * @param {string} name
     * @param {any} val
     * @param {Record} record the receiver, or forwarded by the defineProperty
     *   constructor trap (which has no native receiver)
     */
    proxySet(rawRecord, name, val, record) {
        const Model = rawRecord.Model;
        const store = rawRecord.store;
        if (isFieldDefinition(val)) {
            // field declaration (a class field, from setup(), or dynamically
            // on a live record): register the field on the model when
            // unknown, then prepare it and apply its per-record default. A
            // declaration is not an update: no update machinery runs.
            // Checked before parent routing below: a definition always defines
            // the field on THIS model (it owns it, even when a parent has one),
            // and registerField drops any inherited routing a parent set for it
            // before this model declared it (@see ModelInternal.registerField).
            if (this.fieldsDeclared.has(name)) {
                // The field already received a formal definition; a second one
                // would silently change its default/options. A plain value
                // assignment is a normal write (handled below), and a field
                // backed by a read never received a formal definition, so this
                // only fires for an actual redefinition.
                console.warn(
                    `Field "${name}" on model "${Model.getName()}" is already defined; the redefinition is ignored.`
                );
                return true;
            }
            this.fieldsDeclared.add(name);
            if (!Model._.fields.get(name)) {
                Model._.registerField(name, val);
            }
            if (isRelation(Model, name)) {
                this.ensureRecordList(record, name);
            } else {
                this.ensureFieldSignal(name, val);
            }
            return true;
        }
        if (!this.constructing()) {
            // route to the parent only after construction: while constructing,
            // the inherits mechanism has not linked the parent yet and every
            // write is an own class-field/setup declaration (a field the child
            // owns, even one a parent also has, e.g. the im_status mixin on
            // both res.users and res.partner), handled by the branches below.
            const parentFieldName = Model._.resolveParentField(name);
            if (parentFieldName) {
                const parentRecord = record[parentFieldName];
                return Reflect.set(parentRecord, name, val);
            }
        }
        if (
            this.constructing() &&
            typeof name === "string" &&
            !Model._.fields.get(name) &&
            !technicalKeysOnRecords.has(name)
        ) {
            // a plain class-field or setup() value: it defines an Attr field
            // on the model (the field detection relies on this, @see
            // makeStore) holding this initial value
            Model._.registerField(name, fields.Attr(val));
            this.ensureFieldSignal(name, val);
            return true;
        }
        if (Model._.fields.get(name) && !isRelation(Model, name) && !this.fieldsSignal.has(name)) {
            // first write to a declared-but-unprepared attr (a plain
            // setup-time assignment): it is the field's per-record initial
            // value, not an update
            this.ensureFieldSignal(name, val);
            return true;
        }
        if (
            typeof name === "string" &&
            !Model._.fields.get(name) &&
            !technicalKeysOnRecords.has(name)
        ) {
            // a prototype accessor with a setter handles the write itself
            // (e.g. `set volume()` on rtc sessions)
            for (
                let proto = Object.getPrototypeOf(rawRecord);
                proto && proto !== Object.prototype;
                proto = Object.getPrototypeOf(proto)
            ) {
                const descriptor = Object.getOwnPropertyDescriptor(proto, name);
                if (descriptor) {
                    if (descriptor.set) {
                        return Reflect.set(proto, name, val, record);
                    }
                    break;
                }
            }
            console.warn(
                `Dropping unknown field "${name}" written on "${Model.getName()}": records only hold declared fields.`
            );
            return true;
        }
        if (isRelation(Model, name)) {
            // the update machinery needs the RecordList in place; attrs need
            // nothing here, updateAttr get-or-creates their signal itself
            this.ensureRecordList(record, name);
        }
        return store.MAKE_UPDATE(function recordSet() {
            store._.updateFields(record, { [name]: val });
            return true;
        });
    }
}

untrackFunctions(RecordInternal.prototype, [
    "ensureFieldSignal",
    "ensureRecordList",
    "proxyDeleteProperty",
    "proxySet",
]);
