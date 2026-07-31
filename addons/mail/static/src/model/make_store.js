import { Store } from "./store";
import { modelRegistry } from "./misc";
import { StoreInternal } from "./store_internal";
import { ModelInternal } from "./model_internal";

import { proxy } from "@odoo/owl";

/** @returns {import("models").Store} */
export function makeStore(env, { localRegistry } = {}) {
    // fake store for now, until it becomes a model
    /** @type {import("models").Store} */
    const store = new Store();
    store.env = env;
    store.Model = Store;
    store._ = new StoreInternal();
    store.recordByLocalId = proxy(new Map());
    /** @type {Object<string, typeof import("./record").Record>} */
    const Models = {};
    const chosenModelRegistry = localRegistry ?? modelRegistry;

    /**
     * Attach a store subclass of the registry class `OgClass` to `hostStore`
     * (the bootstrap object during boot, the true store record afterwards, which
     * share the internal, @see Record constructor). The Model carries the
     * per-store state (records, _, the store references) so the registry class,
     * shared across stores (another store on the page, the next test), stays
     * stateless; and it is what Record.new constructs, so the Record constructor
     * recognizes a record instantiation from `new.target`.
     *
     * @param {typeof import("./record").Record} OgClass
     * @param {import("models").Store} hostStore
     */
    function addModel(OgClass, hostStore) {
        const name = OgClass.getName();
        if (Models[name]) {
            throw new Error(`There must be no duplicated Model Names (duplicate found: ${name})`);
        }
        /** @type {typeof import("./record").Record} */
        const Model = { [name]: class extends OgClass {} }[name];
        Model._ = new ModelInternal();
        Object.assign(Model, { records: proxy({}), store: hostStore });
        Model._.Model = Model;
        Model._.installGetterAccessors();
        Models[name] = Model;
        // A non-writable data descriptor lands straight on the store record: its
        // proxy routes only WRITABLE data writes to the field machinery (@see
        // RecordInternal defineProperty trap), and store.<ModelName> is read
        // constantly, it must stay a plain own property, not a field signal.
        Object.defineProperty(hostStore, name, {
            value: Model,
            configurable: true,
            enumerable: true,
        });
    }

    for (const [, OgClass] of chosenModelRegistry.getEntries()) {
        addModel(OgClass, store);
    }
    // before any field registers: registerField reaches the other models
    // through store.Models to write inverses onto their target model (@see
    // ModelInternal.registerField).
    store.Models = Models;
    // Make true store (as a model). One update cycle around the insert and
    // the reference swaps, so anything reacting to the insert runs on a
    // complete store record.
    return store.MAKE_UPDATE(function makeTrueStore() {
        const trueStore = store.Store.insert();
        for (const Model of Object.values(Models)) {
            Model.store = trueStore;
        }
        // A model registered after the store was created (a lazily loaded
        // bundle) is added on the fly, so its fields and inverses link
        // like the eager ones: registerField writes inverses onto their target
        // model incrementally as each side registers, so a relation to this
        // model, declared earlier, links once its own side registers. The
        // store lives for the whole session; the listener is dropped when the
        // store is disposed.
        function onModelRegistered({ detail }) {
            if (detail.operation === "add" && !Models[detail.key]) {
                addModel(detail.value, trueStore);
            }
        }
        chosenModelRegistry.addEventListener("UPDATE", onModelRegistered);
        trueStore._registerDisposeFn(() =>
            chosenModelRegistry.removeEventListener("UPDATE", onModelRegistered)
        );
        return trueStore;
    });
}
