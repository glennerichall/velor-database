import {DATABASE_SCHEMA,} from "../services/envKeys.mjs";
import {DatabaseManager} from "../../database/DatabaseManager.mjs";
import {s_databaseStatements} from "../services/serviceKeys.mjs";
import {getEnvValue} from "velor-services/application/services/baseServices.mjs";
import {getProvider} from "velor-services/injection/ServicesContext.mjs";

export function createDatabaseManagerInstance(services) {
    let schema = getEnvValue(services, DATABASE_SCHEMA);
    const statements = getProvider(services)[s_databaseStatements]();
    let manager = new DatabaseManager(schema);
    return manager.bindStatements(statements);
}