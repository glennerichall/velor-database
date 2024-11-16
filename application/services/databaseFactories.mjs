import {createDatabaseManagerInstance} from "../factories/createDatabaseManagerInstance.mjs";
import {createDatabaseInstance} from "../factories/createDatabaseInstance.mjs";
import {
    s_database,
    s_databaseManager,
} from "./databaseServiceKeys.mjs";

export const databaseFactories = {
    [s_databaseManager]: createDatabaseManagerInstance,
    [s_database]: createDatabaseInstance,
};
