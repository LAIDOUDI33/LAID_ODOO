import { ATTR_SYM, MANY_SYM, ONE_SYM, untrackFunctions } from "./misc";
import { Record } from "./record";
import { RecordInternal } from "./record_internal";

import { markRaw } from "@odoo/owl";

export class ModelInternal {
    /**
     * The class of the per-record internal, instantiated by the Record
     * constructor, which cannot import it (record_internal.js imports
     * record.js and the module loader rejects dependency cycles).
     */
    RecordInternal = RecordInternal;
    /**
     * The Model this internal belongs to, set at creation (@see makeStore).
     *
     * @type {typeof import("./record").Record}
     */
    Model;
    /** @type {Map<string, boolean>} */
    fields = new Map();
    /** @type {Map<string, boolean>} */
    fieldsAttr = new Map();
    /** @type {Map<string, boolean>} */
    fieldsOne = new Map();
    /** @type {Map<string, boolean>} */
    fieldsMany = new Map();
    /** @type {Map<string, boolean>} */
    fieldsHtml = new Map();
    /** @type {Map<string, string>} */
    fieldsTargetModel = new Map();
    /**
     * Names of the plain `get foo()` accessors of the model, auto-memoized as
     * per-record owl `computed()` by the accessor installed on the model
     * prototype (@see installGetterAccessors). Their value is returned as is:
     * unlike a method read, a getter returning a function must not be bound
     * (binding drops the own properties of e.g. a debounced function).
     *
     * @type {Set<string>}
     */
    fieldsGetter = new Set();
    /** @type {Map<string, string>} */
    fieldsInverse = new Map();
    /** @type {Map<string, string>} */
    fieldsType = new Map();
    /**
     * Attr fields opting into deep reactivity: their object/array value is
     * wrapped in an owl reactive proxy on read (@see RecordInternal.proxyGet)
     * so an in-place mutation of its content is observed. Off by default: a
     * plain attr only tracks whole-value replacement.
     *
     * @type {Set<string>}
     */
    fieldsReactiveContent = new Set();
    /**
     * Set of field names on the current model that are _inherits fields.
     *
     * @type {Set<string>}
     */
    inheritsFields = new Set();
    /**
     * Set of field names on the current model that are the inverse of _inherits fields.
     *
     * @type {Set<string>}
     */
    inheritsInverseFields = new Set();
    /**
     * Cache of resolved inherited-field routings: field name -> the relation
     * field it is read/written through on a parent (@see resolveParentField).
     * Populated on access (only positive results, a parent field once it
     * exists stays), cleared for a field this model later declares as its own.
     *
     * @type {Map<string, string>}
     * */
    parentFields = new Map();

    constructor() {
        markRaw(this);
    }

    registerField(fieldName, data) {
        this.fields.set(fieldName, true);
        if (data[ATTR_SYM]) {
            this.fieldsAttr.set(fieldName, true);
        }
        if (data[ONE_SYM]) {
            this.fieldsOne.set(fieldName, true);
        }
        if (data[MANY_SYM]) {
            this.fieldsMany.set(fieldName, true);
        }
        for (const key in data) {
            const value = data[key];
            if (!["default", "html", "reactiveContent", "type"].includes(key) && data[ATTR_SYM]) {
                throw new Error(
                    `Unsupported option "${key}" on Attr field "${fieldName}". Attr fields only support "html", "reactiveContent" and "type".`
                );
            }
            switch (key) {
                case "html": {
                    if (!value) {
                        break;
                    }
                    this.fieldsHtml.set(fieldName, value);
                    break;
                }
                case "targetModel": {
                    this.fieldsTargetModel.set(fieldName, value);
                    break;
                }
                case "inverse": {
                    this.fieldsInverse.set(fieldName, value);
                    break;
                }
                case "type": {
                    this.fieldsType.set(fieldName, value);
                    break;
                }
                case "reactiveContent": {
                    if (value) {
                        this.fieldsReactiveContent.add(fieldName);
                    }
                    break;
                }
            }
        }
        // this model now owns fieldName, so it is not routed to a parent: an
        // earlier read may have cached a parent routing for it (@see
        // resolveParentField), drop that.
        this.parentFields.delete(fieldName);
        const modelName = this.Model.getName();
        // Write a relation field's inverse onto its target model (the pair
        // is symmetric). The target model exists: it is created with its
        // module (a lazily loaded module registers it before its records or a
        // relation to it are used, and the store materializes it, @see
        // makeStore); a missing one is a field pointing at an unregistered model.
        if (this.fieldsOne.get(fieldName) || this.fieldsMany.get(fieldName)) {
            const targetModel = this.fieldsTargetModel.get(fieldName);
            const OtherModel = this.Model.store.Models[targetModel];
            if (targetModel && !OtherModel) {
                throw new Error(`No target model ${targetModel} exists`);
            }
            const inverse = this.fieldsInverse.get(fieldName);
            if (inverse) {
                const rel2TargetModel = OtherModel._.fieldsTargetModel.get(inverse);
                const rel2Inverse = OtherModel._.fieldsInverse.get(inverse);
                if (rel2TargetModel && rel2TargetModel !== modelName) {
                    throw new Error(
                        `Fields ${OtherModel.getName()}.${inverse} has wrong targetModel. Expected: "${modelName}" Actual: "${rel2TargetModel}"`
                    );
                }
                if (rel2Inverse && rel2Inverse !== fieldName) {
                    throw new Error(
                        `Fields ${OtherModel.getName()}.${inverse} has wrong inverse. Expected: "${fieldName}" Actual: "${rel2Inverse}"`
                    );
                }
                OtherModel._.fieldsTargetModel.set(inverse, modelName);
                OtherModel._.fieldsInverse.set(inverse, fieldName);
            }
        }
        // fieldName is a relation this model _inherits through: mark it and add
        // its inverse to the parent's inverse-fields set (needed to delete the
        // dependent records with the parent, @see Record.delete). Its inverse
        // is known from the field definition, unlike at makeStore where the
        // child's fields are not registered yet.
        if (Object.values(this.Model._inherits ?? {}).includes(fieldName)) {
            this.inheritsFields.add(fieldName);
            const inverse = this.fieldsInverse.get(fieldName);
            if (!inverse) {
                throw new Error(
                    `Missing inverse field of "${fieldName}" for _inherits in "${this.Model.getName()}"`
                );
            }
            const parentModelName = Object.keys(this.Model._inherits).find(
                (name) => this.Model._inherits[name] === fieldName
            );
            this.Model.store.Models[parentModelName]._.inheritsInverseFields.add(inverse);
        }
    }

    /**
     * The relation field `name` is read/written through to a parent, or
     * undefined when `name` is not inherited. Resolved on access (no up-front
     * parentFields build): `name` is inherited when this model does not own it
     * (no own field, nothing on its class prototype) and an _inherits parent
     * provides it, i.e. it is one of the parent's registered fields or a
     * getter/function on the parent's class prototype (a framework member on
     * Record.prototype is the record's own, not inherited). A positive result is
     * cached (a parent field, once it exists, stays); a negative is not (the
     * parent may register `name` later). Cleared for a field this model later
     * declares (@see registerField).
     *
     * @param {string} name
     * @returns {string|undefined}
     */
    resolveParentField(name) {
        const cached = this.parentFields.get(name);
        if (cached) {
            return cached;
        }
        const inherits = this.Model._inherits;
        if (!inherits || this.fields.has(name) || name in this.Model.prototype) {
            return undefined;
        }
        for (const parentModelName in inherits) {
            const ParentModel = this.Model.store.Models[parentModelName];
            let provides = ParentModel._.fields.has(name);
            for (
                let proto = ParentModel.prototype;
                !provides && proto && proto !== Record.prototype && proto !== Object.prototype;
                proto = Object.getPrototypeOf(proto)
            ) {
                const descriptor = Object.getOwnPropertyDescriptor(proto, name);
                if (descriptor) {
                    provides = Boolean(descriptor.get || typeof descriptor.value === "function");
                    break;
                }
            }
            if (provides) {
                const viaField = inherits[parentModelName];
                this.parentFields.set(name, viaField);
                return viaField;
            }
        }
        return undefined;
    }

    /**
     * Install an accessor on the model prototype for every plain `get foo()`
     * of the model, turning it into an auto-memoized per-record owl computed
     * (@see RecordInternal.memoizedGetter).
     *
     * The accessors go on the per-store subclass prototype (@see makeStore
     * addModel), one layer above the registry class a module patches: a late
     * patch() lands below them, so the accessor keeps serving the read and
     * keeps resolving the patched body live. Framework accessors
     * (Record.prototype, e.g. store or localId) are not memoizable, and a
     * getter paired with a setter is not one either. First descriptor up the
     * chain wins, as a plain read would.
     *
     * A patch INTRODUCING a getter while a store is live gets no accessor, so
     * that getter runs raw: correct, but neither memoized nor held during a
     * teardown. No bundle does that today (the one loaded lazily, the portal
     * chatter, carries the model layer itself, so its patches land before any
     * store exists); should one appear, calling this again installs it.
     */
    installGetterAccessors() {
        const Model = this.Model;
        const seen = new Set();
        for (
            let proto = Object.getPrototypeOf(Model.prototype);
            proto && proto !== Record.prototype && proto !== Object.prototype;
            proto = Object.getPrototypeOf(proto)
        ) {
            for (const [name, descriptor] of Object.entries(
                Object.getOwnPropertyDescriptors(proto)
            )) {
                if (seen.has(name)) {
                    continue;
                }
                seen.add(name);
                if (!descriptor.get || descriptor.set) {
                    continue;
                }
                this.fieldsGetter.add(name);
                Object.defineProperty(Model.prototype, name, {
                    configurable: true,
                    get() {
                        return this._.memoizedGetter(this, name);
                    },
                });
            }
        }
    }
}

untrackFunctions(ModelInternal.prototype, ["registerField"]);
