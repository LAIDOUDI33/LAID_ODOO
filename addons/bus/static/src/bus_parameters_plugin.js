import { registry } from "@web/core/registry";
import { Plugin, signal, usePlugin } from "@odoo/owl";
import { services } from "@web/core/services";

export class BusParametersPlugin extends Plugin {
    serverURL = signal(window.origin);
}

services.add(BusParametersPlugin);

/**
 * -----------------------------------------------------------------------------
 * @todo owl3 migration
 * temporary - to remove when all use of the bus_parameters service are removed
 * -----------------------------------------------------------------------------
 */
export const busParametersService = {
    start() {
        return usePlugin(BusParametersPlugin);
    },
};

registry.category("services").add("bus.parameters", busParametersService);
