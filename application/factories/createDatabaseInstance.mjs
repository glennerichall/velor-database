import {getProvider} from "velor-services/application/services/baseServices.mjs";

import {s_databaseManager} from "../services/serviceKeys.mjs";

export function createDatabaseInstance(services) {
    const provider = getProvider(services);
    return provider[s_databaseManager]().getDatabase();
}