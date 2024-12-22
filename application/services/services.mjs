import {getProvider} from "velor-services/application/services/baseServices.mjs";

import {
    s_clientProvider,
    s_database,
    s_poolManager,
} from "./serviceKeys.mjs";

export function getDatabase(services) {
    return getProvider(services)[s_database]();
}

export function getPoolManager(services) {
    return getProvider(services)[s_poolManager]();
}

export function getClientProvider(services) {
    return getProvider(services)[s_clientProvider]();
}