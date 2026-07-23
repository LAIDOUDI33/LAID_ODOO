import { useExternalListener } from "@web/owl2/utils";
import { onMounted, onPatched, onWillUnmount, proxy } from "@odoo/owl";
import { useThrottleForAnimation } from "./timing";
import { makeDraggableHook as nativeMakeDraggableHook } from "./draggable_hook_builder";

function setup(effect, computeDependencies = () => []) {
    let cleanup;
    let dependencies;
    onMounted(() => {
        dependencies = computeDependencies();
        cleanup = effect(...dependencies);
    });
    onPatched(() => {
        const newDependencies = computeDependencies();
        if (newDependencies.some((dep, i) => dep !== dependencies[i])) {
            dependencies = newDependencies;
            cleanup?.();
            cleanup = effect(...dependencies);
        }
    });
    onWillUnmount(() => cleanup?.());
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
