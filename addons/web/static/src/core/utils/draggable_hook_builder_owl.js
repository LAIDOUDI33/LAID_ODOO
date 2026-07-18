import { useExternalListener } from "@web/owl2/utils";
import { onMounted, onWillUnmount, proxy, signal, untrack, useEffect } from "@odoo/owl";
import { useThrottleForAnimation } from "./timing";
import { makeDraggableHook as nativeMakeDraggableHook } from "./draggable_hook_builder";

function setup(effect, computeDependencies = () => []) {
    const mounted = signal(false);
    onMounted(() => mounted.set(true));
    useEffect(() => {
        if (!mounted()) {
            return;
        }
        const dependencies = computeDependencies();
        return untrack(() => effect(...dependencies));
    });
}

/**
 * Set of default `makeDraggableHook` setup hooks that makes use of Owl lifecycle
 * and reactivity hooks to properly set up, update and tear down the elements and
 * listeners added by the draggable hook builder.
 *
 * @see {nativeMakeDraggableHook}
 * @type {typeof nativeMakeDraggableHook}
 */
export function makeDraggableHook(params) {
    return nativeMakeDraggableHook({
        ...params,
        setupHooks: {
            addListener: useExternalListener,
            setup,
            teardown: onWillUnmount,
            throttle: useThrottleForAnimation,
            wrapState: proxy,
        },
    });
}
