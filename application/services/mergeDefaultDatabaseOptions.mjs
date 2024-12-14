import {factories as defaultFactories} from "./factories.mjs";
import {mergeDefaultServicesOptions} from "velor-services/application/services/mergeDefaultServicesOptions.mjs";

export function mergeDefaultDatabaseOptions(options = {}) {
    let {
        factories = {},
    } = options;

    return mergeDefaultServicesOptions({
        ...options,

        factories: {
            ...defaultFactories,
            ...factories
        }
    });
}