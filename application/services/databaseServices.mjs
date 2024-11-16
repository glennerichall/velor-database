import {getProvider} from "velor-services/injection/baseServices.mjs";

import {s_database,} from "./databaseServiceKeys.mjs";

export function getDatabase(services) {
    return getProvider(services)[s_database]();
}