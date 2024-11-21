import {getProvider} from "velor-services/injection/baseServices.mjs";

import {
    s_database,
    s_poolManager,
} from "./databaseServiceKeys.mjs";

export function getDatabase(services) {
    return getProvider(services)[s_database]();
}

export function getPoolManager(services) {
    return getProvider(services)[s_poolManager]();
}