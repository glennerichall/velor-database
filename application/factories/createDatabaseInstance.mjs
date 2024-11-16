import {getProvider} from "velor-services/injection/baseServices.mjs";

import {s_databaseManager} from "../services/databaseServiceKeys.mjs";

export function createDatabaseInstance(services) {
    const provider = getProvider(services);
    return provider[s_databaseManager]().getDatabase();
}