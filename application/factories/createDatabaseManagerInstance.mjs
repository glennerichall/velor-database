import {
    getEnvValue,
    getEnvValueIndirect,
    getNodeEnv,
    getProvider
} from "velor-services/injection/baseServices.mjs";
import {
    DATABASE_CONNECTION_STRING,
    DATABASE_SCHEMA,
    DATABASE_URL_VAR
} from "../services/databaseEnvKeys.mjs";
import {ENV_TEST} from "velor-utils/env.mjs";
import {DatabaseManager} from "../../database/DatabaseManager.mjs";
import {s_databaseStatements} from "../services/databaseServiceKeys.mjs";
import {PoolManager} from "../../database/PoolManager.mjs";

export function createDatabaseManagerInstance(services) {
    let schema = getEnvValue(services, DATABASE_SCHEMA);
    let connectionString = getEnvValue(services, DATABASE_CONNECTION_STRING) ??
        getEnvValueIndirect(services, DATABASE_URL_VAR);

    if (getNodeEnv(services) === ENV_TEST) {
        connectionString += "?sslmode=disable";
    }

    const pool = new PoolManager(connectionString);

    const statements = getProvider(services)[s_databaseStatements]();

    let manager = new DatabaseManager(schema, pool);
    return manager.bindStatements(statements);
}