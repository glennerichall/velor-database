import {
    getEnvValue,
    getProvider
} from "velor-services/injection/baseServices.mjs";
import {DATABASE_SCHEMA,} from "../services/databaseEnvKeys.mjs";
import {DatabaseManager} from "../../database/DatabaseManager.mjs";
import {s_databaseStatements} from "../services/databaseServiceKeys.mjs";
import {getPoolManager} from "../services/databaseServices.mjs";

export function createDatabaseManagerInstance(services) {
    let schema = getEnvValue(services, DATABASE_SCHEMA);
    const pool = getPoolManager(services);
    const statements = getProvider(services)[s_databaseStatements]();
    let manager = new DatabaseManager(schema, pool);
    return manager.bindStatements(statements);
}