import {
    getEnvValue,
    getEnvValueIndirect
} from "velor-services/application/services/baseServices.mjs";
import {
    DATABASE_CONNECTION_STRING,
    DATABASE_URL_VAR
} from "../services/envKeys.mjs";
import {PoolManager} from "../../database/PoolManager.mjs";

export function createPoolManagerInstance(services) {
    let connectionString = getEnvValue(services, DATABASE_CONNECTION_STRING) ??
        getEnvValueIndirect(services, DATABASE_URL_VAR);
    return new PoolManager(connectionString);
}