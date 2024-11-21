import {createDatabaseManagerInstance} from "../factories/createDatabaseManagerInstance.mjs";
import {createDatabaseInstance} from "../factories/createDatabaseInstance.mjs";
import {
    s_database,
    s_databaseManager,
    s_poolManager,
} from "./databaseServiceKeys.mjs";
import {createPoolManagerInstance} from "../factories/createPoolManagerInstance.mjs";

export const databaseFactories = {
    [s_databaseManager]: createDatabaseManagerInstance,
    [s_database]: createDatabaseInstance,
    [s_poolManager]: createPoolManagerInstance,
};
