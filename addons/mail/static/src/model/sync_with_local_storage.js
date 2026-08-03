import { browser } from "@web/core/browser/browser";

import { LocalStorageEntry, parseRawValue } from "@mail/utils/common/local_storage";

/**
 * Declare a record field persisted to local storage and kept in sync across
 * tabs, in place of a field declaration (class field or setup() assignment):
 * `compact = syncWithLocalStorage(this, false);`
 * The returned marker identifies the field once the record is constructed
 * (its localId is part of the storage key): the persisted value is restored
 * over the default, later writes are persisted (a write back to the default
 * drops the entry) and a change from another tab is applied. Disposed with
 * the record.
 *
 * @template T
 * @param {import("@mail/model/record").Record} record
 * @param {T} [defaultValue]
 * @returns {T}
 */
export function syncWithLocalStorage(record, defaultValue) {
    const marker = { syncWithLocalStorage };
    let ls;
    let fieldName;
    let applyingStorageEvent = false;
    record.onChange(
        () => [], // one-shot at construction release: the localId is assigned
        () => {
            fieldName = [...record._.fieldsSignal].find(([, sig]) => sig() === marker)?.[0];
            if (!fieldName) {
                throw new Error("syncWithLocalStorage return value must be assigned to the field");
            }
            ls = new LocalStorageEntry(`${record.localId}:${fieldName}`);
            const stored = ls.get();
            if (stored === undefined || stored === defaultValue) {
                // an entry holding the default is dropped, like the write-back
                ls.remove();
                record[fieldName] = defaultValue;
            } else {
                record[fieldName] = stored;
            }
            const onStorage = (ev) => {
                if (ev.key !== ls.key) {
                    return;
                }
                applyingStorageEvent = true;
                try {
                    // from the event payload: the entry itself belongs to the
                    // other tab's storage in the cross-tab case
                    const parsed = ev.newValue === null ? undefined : parseRawValue(ev.newValue);
                    record[fieldName] = parsed ? parsed.value : defaultValue;
                } finally {
                    applyingStorageEvent = false;
                }
            };
            browser.addEventListener("storage", onStorage);
            return () => browser.removeEventListener("storage", onStorage);
        },
        { immediate: true }
    );
    record.onChange(
        () => [fieldName && record[fieldName]],
        (value) => {
            if (applyingStorageEvent || !ls) {
                return;
            }
            if (value === defaultValue) {
                ls.remove();
            } else {
                ls.set(value);
            }
        },
        // immediate: the write-back must run while applyingStorageEvent still
        // guards it (a batched effect would fire after the flag is reset and
        // write the applied value back)
        { immediate: true, initialRun: false }
    );
    return /** @type {T} */ (marker);
}
