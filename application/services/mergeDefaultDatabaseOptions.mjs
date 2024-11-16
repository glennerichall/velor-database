import {databaseFactories} from "./databaseFactories.mjs";

export function mergeDefaultDatabaseOptions(options) {
    let {
        factories = {},
    } = options;

    return {
        ...options,

        factories: {
            ...databaseFactories,
            ...factories
        }
    };
}